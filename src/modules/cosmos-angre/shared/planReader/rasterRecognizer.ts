// ═══ PROPH3T VISION LOCAL — Reconnaissance de plans scannés / images ═══
// Algorithme 100% client-side : Canvas → Grayscale → Canny Edge → Contour Detection → Zone Extraction
// Aucune API externe requise.

import type { RasterRecognitionResult, RecognizedZone, RecognizedWall, RecognizedDoor, BoundingBox } from './planReaderTypes'
import type { SpaceType } from '../proph3t/types'

// ═══ POINT D'ENTRÉE ═══

export async function recognizeRasterPlan(imageFile: File): Promise<RasterRecognitionResult> {
  const img = await loadImage(imageFile)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const W = canvas.width, H = canvas.height

  const notes: string[] = []
  notes.push(`Image ${W}x${H} px analysee par Proph3t Vision local`)

  // ── 1. Grayscale ──
  const gray = toGrayscale(imageData)

  // ── 2. Gaussian blur (σ=1.4) pour réduire le bruit ──
  const blurred = gaussianBlur(gray, W, H, 1.4)

  // ── 3. Canny edge detection ──
  const edges = cannyEdgeDetection(blurred, W, H, 30, 90)

  // ── 4. Morphological closing pour connecter les bords fragmentés ──
  const closed = morphClose(edges, W, H, 3)

  // ── 5. Détection de composantes connexes (flood fill) ──
  const { regions, labels } = findConnectedRegions(closed, W, H)

  // ── 6. Filtrage des régions par taille → zones candidates ──
  const minArea = W * H * 0.002  // min 0.2% de l'image
  const maxArea = W * H * 0.4    // max 40%
  const validRegions = regions.filter(r => r.area >= minArea && r.area <= maxArea)

  notes.push(`${regions.length} regions detectees, ${validRegions.length} valides apres filtrage`)

  // ── 7. Construction des zones ──
  const zones: RecognizedZone[] = validRegions
    .sort((a, b) => b.area - a.area)
    .slice(0, 30)  // max 30 zones
    .map((region, idx): RecognizedZone => {
      const bb: BoundingBox = {
        x: region.minX / W,
        y: region.minY / H,
        w: (region.maxX - region.minX) / W,
        h: (region.maxY - region.minY) / H,
      }
      const aspectRatio = bb.w / Math.max(bb.h, 0.001)
      const relativeSize = region.area / (W * H)

      return {
        id: `proph3t-zone-${idx}`,
        label: guessZoneLabel(bb, aspectRatio, relativeSize, idx),
        estimatedType: guessZoneType(bb, aspectRatio, relativeSize),
        boundingBox: bb,
        confidence: computeConfidence(region, W, H),
      }
    })

  // ── 8. Détection de murs (lignes longues dans les edges) ──
  const walls = detectWalls(edges, W, H)
  notes.push(`${walls.length} segments de murs detectes`)

  // ── 9. Détection de portes (petites ouvertures dans les murs) ──
  const doors = detectDoors(edges, walls, W, H)
  notes.push(`${doors.length} ouvertures potentielles detectees`)

  // ── 10. Tentative de détection d'échelle (texte OCR basique non dispo, heuristique) ──
  const scale = estimateScaleFromGeometry(walls, W, H)

  return {
    zones,
    walls,
    doors,
    dimensions: [],
    scale: scale ?? undefined,
    floorLevel: undefined,
    confidence: zones.length > 0 ? Math.min(0.85, 0.3 + zones.length * 0.05) : 0.1,
    proph3tNotes: notes,
    rawClaudeResponse: '',
  }
}

// ═══ IMAGE LOADING ═══

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ═══ GRAYSCALE ═══

function toGrayscale(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData
  const gray = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const j = i * 4
    // Luminance ITU-R BT.709
    gray[i] = Math.round(data[j] * 0.2126 + data[j + 1] * 0.7152 + data[j + 2] * 0.0722)
  }
  return gray
}

// ═══ GAUSSIAN BLUR ═══

function gaussianBlur(src: Uint8Array, W: number, H: number, sigma: number): Uint8Array {
  const radius = Math.ceil(sigma * 3)
  const size = radius * 2 + 1
  // Build 1D kernel
  const kernel = new Float32Array(size)
  let sum = 0
  for (let i = 0; i < size; i++) {
    const x = i - radius
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma))
    sum += kernel[i]
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum

  // Separable: horizontal then vertical
  const temp = new Uint8Array(W * H)
  const dst = new Uint8Array(W * H)

  // Horizontal pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val = 0
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(W - 1, Math.max(0, x + k))
        val += src[y * W + sx] * kernel[k + radius]
      }
      temp[y * W + x] = Math.round(val)
    }
  }

  // Vertical pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let val = 0
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(H - 1, Math.max(0, y + k))
        val += temp[sy * W + x] * kernel[k + radius]
      }
      dst[y * W + x] = Math.round(val)
    }
  }
  return dst
}

// ═══ CANNY EDGE DETECTION ═══

function cannyEdgeDetection(
  src: Uint8Array, W: number, H: number,
  lowThreshold: number, highThreshold: number
): Uint8Array {
  // Sobel gradients
  const gx = new Float32Array(W * H)
  const gy = new Float32Array(W * H)
  const mag = new Float32Array(W * H)
  const dir = new Float32Array(W * H)

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      // Sobel X
      gx[i] = (
        -src[(y - 1) * W + (x - 1)] - 2 * src[y * W + (x - 1)] - src[(y + 1) * W + (x - 1)]
        + src[(y - 1) * W + (x + 1)] + 2 * src[y * W + (x + 1)] + src[(y + 1) * W + (x + 1)]
      )
      // Sobel Y
      gy[i] = (
        -src[(y - 1) * W + (x - 1)] - 2 * src[(y - 1) * W + x] - src[(y - 1) * W + (x + 1)]
        + src[(y + 1) * W + (x - 1)] + 2 * src[(y + 1) * W + x] + src[(y + 1) * W + (x + 1)]
      )
      mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i])
      dir[i] = Math.atan2(gy[i], gx[i])
    }
  }

  // Non-maximum suppression
  const nms = new Float32Array(W * H)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      const angle = ((dir[i] * 180 / Math.PI) + 180) % 180
      let m1 = 0, m2 = 0

      if (angle < 22.5 || angle >= 157.5) { m1 = mag[i - 1]; m2 = mag[i + 1] }
      else if (angle < 67.5) { m1 = mag[(y - 1) * W + x + 1]; m2 = mag[(y + 1) * W + x - 1] }
      else if (angle < 112.5) { m1 = mag[(y - 1) * W + x]; m2 = mag[(y + 1) * W + x] }
      else { m1 = mag[(y - 1) * W + x - 1]; m2 = mag[(y + 1) * W + x + 1] }

      nms[i] = (mag[i] >= m1 && mag[i] >= m2) ? mag[i] : 0
    }
  }

  // Double threshold + hysteresis
  const edges = new Uint8Array(W * H)
  const STRONG = 255, WEAK = 128

  for (let i = 0; i < nms.length; i++) {
    if (nms[i] >= highThreshold) edges[i] = STRONG
    else if (nms[i] >= lowThreshold) edges[i] = WEAK
  }

  // Hysteresis: weak pixels connected to strong become strong
  let changed = true
  while (changed) {
    changed = false
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x
        if (edges[i] !== WEAK) continue
        // Check 8-connected neighbors for strong edge
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (edges[(y + dy) * W + (x + dx)] === STRONG) {
              edges[i] = STRONG
              changed = true
            }
          }
        }
      }
    }
  }

  // Remove remaining weak edges
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] !== STRONG) edges[i] = 0
  }

  return edges
}

// ═══ MORPHOLOGICAL CLOSING (dilate then erode) ═══

function morphClose(src: Uint8Array, W: number, H: number, radius: number): Uint8Array {
  return erode(dilate(src, W, H, radius), W, H, radius)
}

function dilate(src: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const dst = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let max = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
            max = Math.max(max, src[ny * W + nx])
          }
        }
      }
      dst[y * W + x] = max
    }
  }
  return dst
}

function erode(src: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const dst = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let min = 255
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const ny = y + dy, nx = x + dx
          if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
            min = Math.min(min, src[ny * W + nx])
          }
        }
      }
      dst[y * W + x] = min
    }
  }
  return dst
}

// ═══ CONNECTED COMPONENT LABELING (flood fill) ═══

interface Region {
  label: number
  area: number
  minX: number; minY: number; maxX: number; maxY: number
  pixels: number
  edgePixels: number  // pixels touching the image border
}

function findConnectedRegions(edges: Uint8Array, W: number, H: number): { regions: Region[]; labels: Int32Array } {
  // Invert: we want the ENCLOSED areas (white = walls/edges, black = rooms)
  const inverted = new Uint8Array(W * H)
  for (let i = 0; i < edges.length; i++) {
    inverted[i] = edges[i] > 0 ? 0 : 255
  }

  const labelMap = new Int32Array(W * H)
  let currentLabel = 0
  const regionMap = new Map<number, Region>()

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (inverted[i] === 0 || labelMap[i] !== 0) continue

      currentLabel++
      const region: Region = {
        label: currentLabel, area: 0,
        minX: x, minY: y, maxX: x, maxY: y,
        pixels: 0, edgePixels: 0,
      }

      // BFS flood fill
      const queue: number[] = [i]
      labelMap[i] = currentLabel

      while (queue.length > 0) {
        const idx = queue.pop()!
        const px = idx % W, py = Math.floor(idx / W)

        region.area++
        region.pixels++
        region.minX = Math.min(region.minX, px)
        region.minY = Math.min(region.minY, py)
        region.maxX = Math.max(region.maxX, px)
        region.maxY = Math.max(region.maxY, py)

        if (px === 0 || px === W - 1 || py === 0 || py === H - 1) region.edgePixels++

        // 4-connected neighbors
        const neighbors = [
          py > 0 ? idx - W : -1,
          py < H - 1 ? idx + W : -1,
          px > 0 ? idx - 1 : -1,
          px < W - 1 ? idx + 1 : -1,
        ]
        for (const ni of neighbors) {
          if (ni >= 0 && inverted[ni] > 0 && labelMap[ni] === 0) {
            labelMap[ni] = currentLabel
            queue.push(ni)
          }
        }
      }

      // Reject regions that are mostly border-touching (background)
      const borderRatio = region.edgePixels / Math.max(1, region.pixels)
      if (borderRatio < 0.3) {
        regionMap.set(currentLabel, region)
      }
    }
  }

  return { regions: Array.from(regionMap.values()), labels: labelMap }
}

// ═══ WALL DETECTION (Hough-like line detection on edges) ═══

function detectWalls(edges: Uint8Array, W: number, H: number): RecognizedWall[] {
  const walls: RecognizedWall[] = []
  const minLineLength = Math.min(W, H) * 0.05  // min 5% of smallest dimension

  // Scan horizontal runs
  for (let y = 0; y < H; y += 3) {  // sample every 3 rows for speed
    let runStart = -1
    for (let x = 0; x < W; x++) {
      if (edges[y * W + x] > 0) {
        if (runStart < 0) runStart = x
      } else {
        if (runStart >= 0 && (x - runStart) >= minLineLength) {
          walls.push({
            id: `wall-h-${walls.length}`,
            x1: runStart / W, y1: y / H,
            x2: x / W, y2: y / H,
            confidence: 0.7,
          })
        }
        runStart = -1
      }
    }
  }

  // Scan vertical runs
  for (let x = 0; x < W; x += 3) {
    let runStart = -1
    for (let y = 0; y < H; y++) {
      if (edges[y * W + x] > 0) {
        if (runStart < 0) runStart = y
      } else {
        if (runStart >= 0 && (y - runStart) >= minLineLength) {
          walls.push({
            id: `wall-v-${walls.length}`,
            x1: x / W, y1: runStart / H,
            x2: x / W, y2: y / H,
            confidence: 0.7,
          })
        }
        runStart = -1
      }
    }
  }

  return walls.slice(0, 100)  // cap at 100 walls
}

// ═══ DOOR DETECTION (gaps in walls) ═══

function detectDoors(edges: Uint8Array, walls: RecognizedWall[], W: number, H: number): RecognizedDoor[] {
  const doors: RecognizedDoor[] = []
  // Find short gaps between collinear wall segments
  const hWalls = walls.filter(w => Math.abs(w.y1 - w.y2) < 0.01).sort((a, b) => a.x1 - b.x1)

  for (let i = 0; i < hWalls.length - 1; i++) {
    const a = hWalls[i], b = hWalls[i + 1]
    if (Math.abs(a.y1 - b.y1) > 0.02) continue  // not same row
    const gap = b.x1 - a.x2
    if (gap > 0.005 && gap < 0.05) {  // gap between 0.5% and 5% of width
      doors.push({
        id: `door-${doors.length}`,
        x: (a.x2 + b.x1) / 2,
        y: a.y1,
        widthEstimated: gap,
        confidence: 0.5,
      })
    }
  }

  return doors.slice(0, 30)
}

// ═══ SCALE ESTIMATION (from geometry) ═══

function estimateScaleFromGeometry(
  walls: RecognizedWall[], W: number, H: number
): { ratio: string; value: number; confidence: number } | null {
  if (walls.length < 4) return null

  // Heuristic: if the image is roughly A1/A0 architectural plan size
  // Standard mall corridor = 3-5m, standard cell = 4-8m wide
  // Use the median wall length as reference
  const lengths = walls.map(w => {
    const dx = (w.x2 - w.x1) * W
    const dy = (w.y2 - w.y1) * H
    return Math.sqrt(dx * dx + dy * dy)
  }).sort((a, b) => a - b)

  const medianPx = lengths[Math.floor(lengths.length / 2)]

  // Assume median wall ≈ 8m (typical retail cell width)
  // → 1 pixel = 8m / medianPx
  if (medianPx > 10) {
    const pxPerMeter = medianPx / 8
    const scaleValue = Math.round(W / pxPerMeter)  // approximate 1:N
    return {
      ratio: `~1:${scaleValue}`,
      value: scaleValue,
      confidence: 0.3,  // low confidence — heuristic only
    }
  }
  return null
}

// ═══ ZONE CLASSIFICATION HEURISTICS ═══

function guessZoneType(bb: BoundingBox, aspectRatio: number, relativeSize: number): SpaceType {
  // Large zone (> 10% of plan) → likely parking or hypermarket
  if (relativeSize > 0.10) return 'parking'
  // Medium-large (5-10%) → food court or anchor
  if (relativeSize > 0.05) return 'restauration'
  // Long corridor-like (aspect ratio > 4) → circulation
  if (aspectRatio > 4 || aspectRatio < 0.25) return 'circulation'
  // Small (< 0.5%) → technical or backoffice
  if (relativeSize < 0.005) return 'technique'
  // Default → commerce
  return 'commerce'
}

function guessZoneLabel(bb: BoundingBox, aspectRatio: number, relativeSize: number, idx: number): string {
  const type = guessZoneType(bb, aspectRatio, relativeSize)
  const labels: Record<string, string> = {
    parking: 'Parking', restauration: 'Food Court / Grande surface',
    circulation: 'Circulation', technique: 'Local technique',
    commerce: `Cellule commerciale ${idx + 1}`,
  }
  return labels[type] ?? `Zone ${idx + 1}`
}

function computeConfidence(region: Region, W: number, H: number): number {
  const area = region.area
  const totalArea = W * H
  const relSize = area / totalArea
  const bbArea = (region.maxX - region.minX) * (region.maxY - region.minY)
  const fillRatio = bbArea > 0 ? area / bbArea : 0

  // Higher confidence if:
  // - Region fills its bounding box well (not too fragmented)
  // - Size is in expected range (0.5% - 15% of total)
  let conf = 0.5
  if (fillRatio > 0.6) conf += 0.15
  if (fillRatio > 0.8) conf += 0.1
  if (relSize > 0.005 && relSize < 0.15) conf += 0.1
  if (relSize > 0.01 && relSize < 0.08) conf += 0.05

  return Math.min(0.9, conf)
}

// ═══ CONVERSION RÉSULTAT → ZONES ATLAS ═══

export function convertVisionToAtlasZones(
  result: RasterRecognitionResult,
  floorId: string
): import('../proph3t/types').Zone[] {
  return result.zones.map((rz, idx) => ({
    id: `proph3t-zone-${idx}`,
    floorId,
    label: rz.label,
    type: rz.estimatedType,
    x: rz.boundingBox.x,
    y: rz.boundingBox.y,
    w: rz.boundingBox.w,
    h: rz.boundingBox.h,
    niveau: inferNiveauFromType(rz.estimatedType),
    color: getDefaultColor(rz.estimatedType),
    description: `Detecte par Proph3t Vision local (confiance ${Math.round(rz.confidence * 100)}%)`,
  } as import('../proph3t/types').Zone))
}

function inferNiveauFromType(type: SpaceType): 1 | 2 | 3 | 4 | 5 {
  const map: Partial<Record<SpaceType, 1 | 2 | 3 | 4 | 5>> = {
    parking: 1, circulation: 1, exterieur: 1,
    commerce: 2, restauration: 2, loisirs: 2, services: 2, hotel: 2,
    bureaux: 3, technique: 4, backoffice: 4, financier: 5, sortie_secours: 1,
  }
  return map[type] ?? 2
}

function getDefaultColor(type: SpaceType): string {
  const colors: Partial<Record<SpaceType, string>> = {
    parking: '#1e3a5f', circulation: '#0a1a0a', commerce: '#0a2a15',
    restauration: '#2a0f00', technique: '#1a0a2e', backoffice: '#1a0a1a',
    financier: '#2a0a0a', sortie_secours: '#1a0a0a', loisirs: '#0a1a2a',
    services: '#1a1a0a', hotel: '#0a0a2a', bureaux: '#1a1a1a', exterieur: '#0a2a0a',
  }
  return colors[type] ?? '#1a1a1a'
}
