// ═══ SKELETON ENGINE — squelettisation des zones de circulation ═══
//
// Pipeline complet (spec PROPH3T Vol.3) :
//   1. Rasterisation des polygones de circulation → grille binaire (N px/m)
//   2. Fermeture morphologique (dilatation 2px + érosion) pour combler trous
//   3. Zhang-Suen thinning (2 passes alternées jusqu'à convergence)
//   4. Extraction des pixels de squelette → waypoints monde
//   5. Détection des nœuds : pixels avec degré ≥ 3 = intersection / bifurcation
//
// Toutes les opérations sont pures, sans état global. Pensé pour être
// appelé en Web Worker si besoin (taille typique grille < 500×500 px).

// ─── Types ────────────────────────────────────────────────

export interface SkeletonInput {
  /** Polygones franchissables en mètres (circulations + entrées/sorties). */
  walkablePolygons: Array<Array<[number, number]>>
  /** Résolution en pixels par mètre (défaut 10 = 10 cm/px). */
  pixelsPerMeter?: number
  /** Nombre d'itérations de dilatation avant érosion (fermeture). Défaut 2. */
  closingRadius?: number
}

export interface SkeletonNode {
  id: string
  /** Position monde (mètres). */
  x: number
  y: number
  /** Degré dans le squelette : nombre de branches issues de ce pixel. */
  degree: number
  /** Type déduit du degré. */
  kind: 'endpoint' | 'path' | 'junction'
}

export interface SkeletonEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  /** Waypoints intermédiaires (sans inclure from/to), en mètres. */
  waypoints: Array<{ x: number; y: number }>
  /** Longueur en mètres. */
  lengthM: number
}

export interface SkeletonResult {
  nodes: SkeletonNode[]
  edges: SkeletonEdge[]
  /** Image du squelette (debug / overlay). Binary array row-major. */
  skeletonBitmap?: {
    width: number
    height: number
    originX: number
    originY: number
    cellSize: number
    data: Uint8Array
  }
  stats: {
    gridWidth: number
    gridHeight: number
    walkablePixels: number
    skeletonPixels: number
    nodeCount: number
    junctionCount: number
    edgeCount: number
  }
}

// ─── Étape 1 : rasterisation ──────────────────────────────

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

function rasterize(
  polys: Array<[number, number][]>,
  pxPerM: number,
): { width: number; height: number; originX: number; originY: number; cellSize: number; data: Uint8Array } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of polys) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  if (!isFinite(minX)) {
    return { width: 0, height: 0, originX: 0, originY: 0, cellSize: 1 / pxPerM, data: new Uint8Array(0) }
  }

  const cellSize = 1 / pxPerM
  const pad = cellSize * 4
  const originX = minX - pad
  const originY = minY - pad
  const width = Math.ceil((maxX - minX + pad * 2) / cellSize)
  const height = Math.ceil((maxY - minY + pad * 2) / cellSize)

  const data = new Uint8Array(width * height)
  for (let j = 0; j < height; j++) {
    const y = originY + (j + 0.5) * cellSize
    for (let i = 0; i < width; i++) {
      const x = originX + (i + 0.5) * cellSize
      for (const poly of polys) {
        if (pointInPolygon(x, y, poly)) { data[j * width + i] = 1; break }
      }
    }
  }
  return { width, height, originX, originY, cellSize, data }
}

// ─── Étape 2 : fermeture morphologique (dilatation puis érosion) ──

function dilate(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(src.length)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (src[j * w + i]) { out[j * w + i] = 1; continue }
      // Voisinage 8-connexe
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (di === 0 && dj === 0) continue
          const ni = i + di, nj = j + dj
          if (ni < 0 || ni >= w || nj < 0 || nj >= h) continue
          if (src[nj * w + ni]) { out[j * w + i] = 1; break }
        }
        if (out[j * w + i]) break
      }
    }
  }
  return out
}

function erode(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(src.length)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!src[j * w + i]) continue
      let allSet = true
      for (let dj = -1; dj <= 1 && allSet; dj++) {
        for (let di = -1; di <= 1 && allSet; di++) {
          if (di === 0 && dj === 0) continue
          const ni = i + di, nj = j + dj
          if (ni < 0 || ni >= w || nj < 0 || nj >= h) { allSet = false; break }
          if (!src[nj * w + ni]) { allSet = false; break }
        }
      }
      if (allSet) out[j * w + i] = 1
    }
  }
  return out
}

// ─── Étape 3 : Zhang-Suen thinning ────────────────────────

/**
 * Zhang-Suen thinning — 2 sous-itérations alternées.
 * Référence : T.Y. Zhang and C.Y. Suen, "A fast parallel algorithm for thinning
 * digital patterns" (1984). Voisinage 8-connexe P1..P8 dans l'ordre :
 *   P9 P2 P3
 *   P8 P1 P4
 *   P7 P6 P5
 */
function zhangSuenThinning(src: Uint8Array, w: number, h: number, maxIter = 500): Uint8Array {
  const buf = new Uint8Array(src)

  const idx = (i: number, j: number) => j * w + i
  const inBounds = (i: number, j: number) => i > 0 && i < w - 1 && j > 0 && j < h - 1

  // Retourne [P2..P9] pour pixel (i,j)
  const neighbors = (i: number, j: number): number[] => [
    buf[idx(i, j - 1)],     // P2 nord
    buf[idx(i + 1, j - 1)], // P3 nord-est
    buf[idx(i + 1, j)],     // P4 est
    buf[idx(i + 1, j + 1)], // P5 sud-est
    buf[idx(i, j + 1)],     // P6 sud
    buf[idx(i - 1, j + 1)], // P7 sud-ouest
    buf[idx(i - 1, j)],     // P8 ouest
    buf[idx(i - 1, j - 1)], // P9 nord-ouest
  ]

  const countTransitions = (p: number[]): number => {
    let c = 0
    for (let k = 0; k < 8; k++) {
      if (p[k] === 0 && p[(k + 1) % 8] === 1) c++
    }
    return c
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false
    const toRemove: number[] = []

    // Sous-itération 1
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        if (!buf[idx(i, j)]) continue
        const p = neighbors(i, j)
        const B = p.reduce((s, v) => s + v, 0)
        if (B < 2 || B > 6) continue
        if (countTransitions(p) !== 1) continue
        // P2*P4*P6 = 0
        if (p[0] * p[2] * p[4] !== 0) continue
        // P4*P6*P8 = 0
        if (p[2] * p[4] * p[6] !== 0) continue
        toRemove.push(idx(i, j))
      }
    }
    if (toRemove.length) changed = true
    for (const k of toRemove) buf[k] = 0
    toRemove.length = 0

    // Sous-itération 2
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        if (!buf[idx(i, j)]) continue
        const p = neighbors(i, j)
        const B = p.reduce((s, v) => s + v, 0)
        if (B < 2 || B > 6) continue
        if (countTransitions(p) !== 1) continue
        // P2*P4*P8 = 0
        if (p[0] * p[2] * p[6] !== 0) continue
        // P2*P6*P8 = 0
        if (p[0] * p[4] * p[6] !== 0) continue
        toRemove.push(idx(i, j))
      }
    }
    if (toRemove.length) changed = true
    for (const k of toRemove) buf[k] = 0

    if (!changed) break
  }
  return buf
}

// ─── Étape 4 : extraction nœuds + arêtes du squelette ─────

interface Pixel { i: number; j: number }

function countSkeletonNeighbors(data: Uint8Array, w: number, h: number, i: number, j: number): number {
  let c = 0
  for (let dj = -1; dj <= 1; dj++) {
    for (let di = -1; di <= 1; di++) {
      if (di === 0 && dj === 0) continue
      const ni = i + di, nj = j + dj
      if (ni < 0 || ni >= w || nj < 0 || nj >= h) continue
      if (data[nj * w + ni]) c++
    }
  }
  return c
}

function pixelToWorld(i: number, j: number, raster: { originX: number; originY: number; cellSize: number }): { x: number; y: number } {
  return {
    x: raster.originX + (i + 0.5) * raster.cellSize,
    y: raster.originY + (j + 0.5) * raster.cellSize,
  }
}

function extractGraph(
  skeleton: Uint8Array,
  w: number,
  h: number,
  raster: { originX: number; originY: number; cellSize: number },
): { nodes: SkeletonNode[]; edges: SkeletonEdge[] } {
  // 1. Marquer les nœuds (pixels avec degré ≠ 2)
  const isNode = new Uint8Array(skeleton.length)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      if (!skeleton[k]) continue
      const deg = countSkeletonNeighbors(skeleton, w, h, i, j)
      if (deg !== 2) isNode[k] = 1 // endpoint (1) ou junction (≥3)
    }
  }

  // 2. Créer les nœuds
  const nodeByPixel = new Map<number, SkeletonNode>()
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      if (!isNode[k]) continue
      const deg = countSkeletonNeighbors(skeleton, w, h, i, j)
      const world = pixelToWorld(i, j, raster)
      const kind: SkeletonNode['kind'] = deg === 1 ? 'endpoint' : deg >= 3 ? 'junction' : 'path'
      nodeByPixel.set(k, {
        id: `n-${i}-${j}`,
        x: world.x, y: world.y,
        degree: deg,
        kind,
      })
    }
  }

  // 3. Parcourir chaque nœud et tracer les arêtes sortantes
  const edges: SkeletonEdge[] = []
  const visitedEdges = new Set<string>()

  for (const [startK, startNode] of nodeByPixel) {
    const j0 = Math.floor(startK / w), i0 = startK - j0 * w
    // Pour chaque voisin du squelette, suivre la branche jusqu'au prochain nœud
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (di === 0 && dj === 0) continue
        const ni = i0 + di, nj = j0 + dj
        if (ni < 0 || ni >= w || nj < 0 || nj >= h) continue
        const nk = nj * w + ni
        if (!skeleton[nk]) continue

        const waypoints: Array<{ x: number; y: number }> = []
        let prevI = i0, prevJ = j0
        let curI = ni, curJ = nj
        let lengthM = 0
        const edgeKey = `${Math.min(i0, ni)}-${Math.min(j0, nj)}-${Math.max(i0, ni)}-${Math.max(j0, nj)}`
        // Pour éviter de doublonner une arête directe entre 2 nœuds adjacents
        // on utilise la clé du couple.

        while (!isNode[curJ * w + curI]) {
          const wp = pixelToWorld(curI, curJ, raster)
          waypoints.push(wp)
          lengthM += Math.hypot(curI - prevI, curJ - prevJ) * raster.cellSize

          // Chercher le prochain voisin
          let found = false
          for (let ddj = -1; ddj <= 1 && !found; ddj++) {
            for (let ddi = -1; ddi <= 1 && !found; ddi++) {
              if (ddi === 0 && ddj === 0) continue
              const nni = curI + ddi, nnj = curJ + ddj
              if (nni < 0 || nni >= w || nnj < 0 || nnj >= h) continue
              if (nni === prevI && nnj === prevJ) continue
              if (!skeleton[nnj * w + nni]) continue
              prevI = curI; prevJ = curJ
              curI = nni; curJ = nnj
              found = true
            }
          }
          if (!found) break
        }

        const endNode = nodeByPixel.get(curJ * w + curI)
        if (!endNode) continue
        if (endNode.id === startNode.id) continue

        const fullKey = [startNode.id, endNode.id].sort().join('|')
        if (visitedEdges.has(fullKey)) continue
        visitedEdges.add(fullKey)

        lengthM += Math.hypot(curI - prevI, curJ - prevJ) * raster.cellSize

        edges.push({
          id: `e-${edges.length}`,
          fromNodeId: startNode.id,
          toNodeId: endNode.id,
          waypoints,
          lengthM,
        })
      }
    }
  }

  return { nodes: Array.from(nodeByPixel.values()), edges }
}

// ─── Pipeline principal ──────────────────────────────────

export function computeSkeleton(input: SkeletonInput): SkeletonResult {
  const pxPerM = input.pixelsPerMeter ?? 10
  const closingR = input.closingRadius ?? 2

  // 1. Rasterisation
  const raster = rasterize(input.walkablePolygons, pxPerM)
  if (raster.width === 0 || raster.height === 0) {
    return {
      nodes: [], edges: [],
      stats: { gridWidth: 0, gridHeight: 0, walkablePixels: 0, skeletonPixels: 0, nodeCount: 0, junctionCount: 0, edgeCount: 0 },
    }
  }

  // 2. Fermeture morphologique (dilate x N puis erode x N)
  let bmp = raster.data
  for (let i = 0; i < closingR; i++) bmp = dilate(bmp, raster.width, raster.height)
  for (let i = 0; i < closingR; i++) bmp = erode(bmp, raster.width, raster.height)

  const walkablePixels = bmp.reduce((s, v) => s + v, 0)

  // 3. Zhang-Suen
  const skeleton = zhangSuenThinning(bmp, raster.width, raster.height)
  const skeletonPixels = skeleton.reduce((s, v) => s + v, 0)

  // 4 + 5. Extraction graphe
  const { nodes, edges } = extractGraph(skeleton, raster.width, raster.height, raster)
  const junctionCount = nodes.filter(n => n.kind === 'junction').length

  return {
    nodes,
    edges,
    skeletonBitmap: {
      width: raster.width,
      height: raster.height,
      originX: raster.originX,
      originY: raster.originY,
      cellSize: raster.cellSize,
      data: skeleton,
    },
    stats: {
      gridWidth: raster.width,
      gridHeight: raster.height,
      walkablePixels,
      skeletonPixels,
      nodeCount: nodes.length,
      junctionCount,
      edgeCount: edges.length,
    },
  }
}
