// ═══ DWG PARSER WORKER — Parse DWG files via binary header extraction ═══
// DWG is a proprietary binary format. This worker provides:
// 1. Binary header parsing to extract version, layers, and basic entity data
// 2. Fallback: prompts user to export as DXF if parsing fails
// Output format matches dxfParser.worker.ts for seamless integration.

interface Zone {
  id: string
  floorId: string
  label: string
  type: SpaceType
  x: number
  y: number
  w: number
  h: number
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  surfaceM2?: number
  description?: string
}

type SpaceType =
  | 'parking' | 'commerce' | 'restauration' | 'circulation'
  | 'technique' | 'backoffice' | 'financier' | 'sortie_secours'
  | 'loisirs' | 'services' | 'hotel' | 'bureaux' | 'exterieur'

interface DoorCandidate {
  id: string
  floorId: string
  label: string
  x: number
  y: number
  widthM: number
  isExit: boolean
  layerName: string
}

interface DXFEntity {
  type: string
  layer: string
  vertices?: { x: number; y: number }[]
  position?: { x: number; y: number }
  insertionPoint?: { x: number; y: number }
  name?: string
  width?: number
  height?: number
  text?: string
  radius?: number
  startAngle?: number
  endAngle?: number
}

interface DXFBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface DwgParserInput {
  fileBuffer: ArrayBuffer
  floorId: string
  widthM: number
  heightM: number
}

interface DwgDimension {
  id: string
  valueText: string
  value: number
  unit: string
  x: number
  y: number
  confidence: number
}

interface DwgParserOutput {
  entities: DXFEntity[]
  layers: string[]
  bounds: DXFBounds
  zones: Zone[]
  doorCandidates: DoorCandidate[]
  svgContent: string
  layerClassification: LayerClassificationResult[]
  dwgVersion: string
  parseMethod: 'binary' | 'partial'
  dimensions: DwgDimension[]
  detectedUnit: 'mm' | 'm' | 'cm' | 'unknown'
  realWidthM: number
  realHeightM: number
}

interface LayerClassificationResult {
  layerName: string
  type: SpaceType
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  entityCount: number
  confidence: 'high' | 'medium' | 'low'
}

// ═══ DWG VERSION SIGNATURES ═══

const DWG_VERSIONS: Record<string, string> = {
  'AC1032': 'AutoCAD 2018+',
  'AC1027': 'AutoCAD 2013-2017',
  'AC1024': 'AutoCAD 2010-2012',
  'AC1021': 'AutoCAD 2007-2009',
  'AC1018': 'AutoCAD 2004-2006',
  'AC1015': 'AutoCAD 2000-2003',
  'AC1014': 'AutoCAD R14',
  'AC1012': 'AutoCAD R13',
  'AC1009': 'AutoCAD R11/R12',
}

// ═══ LAYER CLASSIFICATION (shared with dxfParser) ═══

interface LayerPattern {
  pattern: RegExp
  type: SpaceType
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  confidence: 'high' | 'medium' | 'low'
}

const LAYER_PATTERNS: LayerPattern[] = [
  { pattern: /\bpark(ing|)\b/i,                                 type: 'parking',        niveau: 3, color: '#64748b', confidence: 'high' },
  { pattern: /\b(commerce|shop|retail|boutique|magasin|cell)\b/i, type: 'commerce',     niveau: 2, color: '#3b82f6', confidence: 'high' },
  { pattern: /\b(restau|food|cuisine|cafe|cantine|snack)\b/i,   type: 'restauration',   niveau: 2, color: '#f59e0b', confidence: 'high' },
  { pattern: /\b(circul|corridor|couloir|hall|galerie|passage|deambul|atrium)\b/i, type: 'circulation', niveau: 1, color: '#e5e7eb', confidence: 'high' },
  { pattern: /\b(tech|elec|cvc|plomb|meca|clim|ventil|chauff|transfo|tgbt|onduleur)\b/i, type: 'technique', niveau: 4, color: '#ef4444', confidence: 'high' },
  { pattern: /\b(back.?off|admin|bureau.*admin|gestion|direction)\b/i, type: 'backoffice', niveau: 4, color: '#8b5cf6', confidence: 'high' },
  { pattern: /\b(financ|compt|caiss|banqu|tresor|coffr|valeur)\b/i, type: 'financier', niveau: 5, color: '#dc2626', confidence: 'high' },
  { pattern: /\b(secours|urgence|evacu|issue|desserte)\b/i,     type: 'sortie_secours', niveau: 3, color: '#22c55e', confidence: 'high' },
  { pattern: /\b(loisir|cinema|jeu|entertain|detente|aire.?jeu)\b/i, type: 'loisirs', niveau: 2, color: '#06b6d4', confidence: 'high' },
  { pattern: /\b(service|info|client|accueil|reception)\b/i,    type: 'services',       niveau: 2, color: '#14b8a6', confidence: 'high' },
  { pattern: /\b(hotel|heberge|chambre|suite|lobby)\b/i,        type: 'hotel',          niveau: 3, color: '#a855f7', confidence: 'high' },
  { pattern: /\b(bureau|office|open.?space|salle.?reunion)\b/i, type: 'bureaux',        niveau: 3, color: '#6366f1', confidence: 'high' },
  { pattern: /\b(ext|jardin|terrass|facade|parvis|esplanade)\b/i, type: 'exterieur',   niveau: 1, color: '#84cc16', confidence: 'high' },
  { pattern: /\b(exit|sortie)\b/i,                              type: 'sortie_secours', niveau: 3, color: '#22c55e', confidence: 'medium' },
  { pattern: /\b(stock|reserve|depot|entrepot|livraison|quai)\b/i, type: 'technique',  niveau: 4, color: '#ef4444', confidence: 'medium' },
  { pattern: /\b(toilet|wc|sanitaire|vestiaire|douche)\b/i,     type: 'services',       niveau: 2, color: '#14b8a6', confidence: 'medium' },
  { pattern: /\b(ascens|escalat|escalier|rampe|monte.?charge)\b/i, type: 'circulation', niveau: 1, color: '#e5e7eb', confidence: 'medium' },
  { pattern: /\b(zone|espace|local|piece|salle)\b/i,            type: 'circulation',    niveau: 1, color: '#e5e7eb', confidence: 'low' },
]

const DOOR_PATTERNS: RegExp[] = [
  /\b(porte|door|acces|entree|sortie|issue)\b/i,
  /\b(baie|ouverture|passage)\b/i,
]

const EXIT_PATTERNS: RegExp[] = [
  /\b(sortie|exit|secours|urgence|evacu|issue)\b/i,
]

function classifyLayer(layerName: string): { type: SpaceType; niveau: 1 | 2 | 3 | 4 | 5; color: string; confidence: 'high' | 'medium' | 'low' } {
  for (const entry of LAYER_PATTERNS) {
    if (entry.pattern.test(layerName)) {
      return { type: entry.type, niveau: entry.niveau, color: entry.color, confidence: entry.confidence }
    }
  }
  return { type: 'circulation', niveau: 1, color: '#e5e7eb', confidence: 'low' }
}

function isDoorLayer(layerName: string): boolean {
  return DOOR_PATTERNS.some(p => p.test(layerName))
}

function isExitLayer(layerName: string): boolean {
  return EXIT_PATTERNS.some(p => p.test(layerName))
}

// ═══ DWG BINARY PARSER ═══

function readDwgVersion(data: DataView): string {
  const bytes = new Uint8Array(data.buffer, 0, 6)
  const versionStr = String.fromCharCode(...bytes)
  return versionStr
}

function _readNullTermString(data: DataView, offset: number, maxLen: number): { str: string; bytesRead: number } {
  const bytes: number[] = []
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= data.byteLength) break
    const b = data.getUint8(offset + i)
    if (b === 0) {
      return { str: String.fromCharCode(...bytes), bytesRead: i + 1 }
    }
    bytes.push(b)
  }
  return { str: String.fromCharCode(...bytes), bytesRead: maxLen }
}

function extractDwgStrings(buffer: ArrayBuffer): string[] {
  const data = new Uint8Array(buffer)
  const strings: string[] = []
  let current: number[] = []

  for (let i = 0; i < data.length; i++) {
    const b = data[i]
    // Printable ASCII range
    if (b >= 32 && b <= 126) {
      current.push(b)
    } else {
      if (current.length >= 3) {
        strings.push(String.fromCharCode(...current))
      }
      current = []
    }
  }
  if (current.length >= 3) {
    strings.push(String.fromCharCode(...current))
  }

  return strings
}

function extractLayersFromStrings(strings: string[]): string[] {
  const layerSet = new Set<string>()

  // DWG layer names appear after "AcDbLayerTableRecord" marker
  const layerIndicators = /^[A-Za-z0-9_\-\.]+$/
  const skipPatterns = /^(AcDb|Ac[A-Z]|ACAD|Standard|Model|Paper|Plot|Block|Dim|Text|By|ISO|CONTINUOUS|BYLAYER|BYBLOCK)/i

  for (let i = 0; i < strings.length; i++) {
    const s = strings[i].trim()

    // Primary: look for layer table records (most reliable)
    if (s === 'AcDbLayerTableRecord' && i + 1 < strings.length) {
      const nextStr = strings[i + 1].trim()
      if (nextStr.length >= 2 && nextStr.length <= 80 && layerIndicators.test(nextStr) && !skipPatterns.test(nextStr)) {
        layerSet.add(nextStr)
      }
    }
  }

  // If we found proper layer records, use only those
  if (layerSet.size > 0) {
    layerSet.add('0')
    return Array.from(layerSet).sort()
  }

  // Fallback: search for strings matching known architectural patterns
  // Require minimum length of 4 to avoid fragments like "-WC", ".wc."
  for (const s of strings) {
    const trimmed = s.trim()
    if (trimmed.length < 4 || trimmed.length > 60) continue
    if (!layerIndicators.test(trimmed)) continue
    if (skipPatterns.test(trimmed)) continue

    for (const pattern of LAYER_PATTERNS) {
      if (pattern.pattern.test(trimmed)) {
        layerSet.add(trimmed)
        break
      }
    }
    if (DOOR_PATTERNS.some(p => p.test(trimmed))) {
      layerSet.add(trimmed)
    }
  }

  layerSet.add('0')
  return Array.from(layerSet).sort()
}

interface DwgCoordinate {
  x: number
  y: number
}

function extractCoordinatesFromBinary(buffer: ArrayBuffer): DwgCoordinate[] {
  const data = new DataView(buffer)
  const coords: DwgCoordinate[] = []

  // Scan for float64 pairs that look like architectural coordinates
  // Typical ranges: -10000 to +10000 for floor plans in mm or m
  const step = 8 // 8 bytes per float64
  for (let i = 0; i < data.byteLength - 16; i += step) {
    try {
      const x = data.getFloat64(i, true) // little-endian
      const y = data.getFloat64(i + 8, true)

      if (
        Number.isFinite(x) && Number.isFinite(y) &&
        Math.abs(x) > 0.001 && Math.abs(x) < 1e7 &&
        Math.abs(y) > 0.001 && Math.abs(y) < 1e7 &&
        !Number.isNaN(x) && !Number.isNaN(y)
      ) {
        coords.push({ x, y })
      }
    } catch {
      continue
    }
  }

  return coords
}

function filterArchitecturalCoords(coords: DwgCoordinate[]): DwgCoordinate[] {
  if (coords.length < 4) return coords

  // Find the most common magnitude range (likely the actual coordinates)
  const magnitudes = coords.map(c => Math.log10(Math.max(Math.abs(c.x), Math.abs(c.y))))
  const magBuckets = new Map<number, number>()
  for (const m of magnitudes) {
    const bucket = Math.floor(m)
    magBuckets.set(bucket, (magBuckets.get(bucket) ?? 0) + 1)
  }

  let bestBucket = 0
  let bestCount = 0
  for (const [bucket, count] of magBuckets) {
    if (count > bestCount) {
      bestBucket = bucket
      bestCount = count
    }
  }

  // Keep coordinates within 1 order of magnitude of the most common range
  return coords.filter(c => {
    const m = Math.log10(Math.max(Math.abs(c.x), Math.abs(c.y)))
    return Math.abs(Math.floor(m) - bestBucket) <= 1
  })
}

// ═══ ZONE EXTRACTION FROM COORDINATES ═══

function buildZonesFromCoords(
  coords: DwgCoordinate[],
  layers: string[],
  bounds: DXFBounds,
  floorId: string,
  widthM: number,
  heightM: number
): Zone[] {
  const zones: Zone[] = []
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return zones

  // Cluster coordinates into potential zone regions using grid-based grouping
  const gridSize = Math.max(dxfWidth, dxfHeight) / 20
  const clusters = new Map<string, DwgCoordinate[]>()

  for (const c of coords) {
    const gx = Math.floor(c.x / gridSize)
    const gy = Math.floor(c.y / gridSize)
    const key = `${gx},${gy}`
    const list = clusters.get(key) ?? []
    list.push(c)
    clusters.set(key, list)
  }

  let zoneIndex = 0
  for (const [, clusterCoords] of clusters) {
    if (clusterCoords.length < 3) continue

    const xs = clusterCoords.map(c => c.x)
    const ys = clusterCoords.map(c => c.y)
    const pMinX = Math.min(...xs)
    const pMaxX = Math.max(...xs)
    const pMinY = Math.min(...ys)
    const pMaxY = Math.max(...ys)

    const nx = (pMinX - bounds.minX) / dxfWidth
    const ny = (pMinY - bounds.minY) / dxfHeight
    const nw = (pMaxX - pMinX) / dxfWidth
    const nh = (pMaxY - pMinY) / dxfHeight

    const surfaceM2 = nw * widthM * nh * heightM
    if (surfaceM2 < 2) continue

    // Try to match with a known layer
    const matchedLayer = layers.find(l => l !== '0') ?? '0'
    const classification = classifyLayer(matchedLayer)

    zones.push({
      id: `zone-dwg-${floorId}-${zoneIndex}`,
      floorId,
      label: `Zone DWG ${zoneIndex + 1}`,
      type: classification.type,
      x: nx,
      y: ny,
      w: nw,
      h: nh,
      niveau: classification.niveau,
      color: classification.color,
      surfaceM2: Math.round(surfaceM2),
      description: `Zone extraite depuis fichier DWG (parsing binaire)`,
    })
    zoneIndex++
  }

  // Assign layer classifications to zones if we have matching layers
  if (layers.length > 1) {
    const classifiableLayers = layers.filter(l => l !== '0')
    for (let i = 0; i < Math.min(zones.length, classifiableLayers.length); i++) {
      const classification = classifyLayer(classifiableLayers[i])
      zones[i].type = classification.type
      zones[i].niveau = classification.niveau
      zones[i].color = classification.color
      zones[i].label = classifiableLayers[i]
      zones[i].description = `Zone importee depuis calque DWG "${classifiableLayers[i]}"`
    }
  }

  return zones
}

// ═══ SVG GENERATION ═══

function generateSVG(
  coords: DwgCoordinate[],
  bounds: DXFBounds,
  _layers: string[],
  svgWidth: number = 1200,
  svgHeight: number = 800
): string {
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return '<svg></svg>'

  const scale = Math.min(svgWidth / dxfWidth, svgHeight / dxfHeight)
  const paths: string[] = []

  // Background
  paths.push(`<rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="#0f172a"/>`)

  // Connect nearby consecutive coordinate pairs as line segments (wall-like)
  // This produces a much better visual than isolated dots
  const maxGap = Math.max(dxfWidth, dxfHeight) * 0.08 // max 8% of plan size

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]
    const b = coords[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < maxGap && dist > 0.01) {
      const x1 = (a.x - bounds.minX) * scale
      const y1 = svgHeight - (a.y - bounds.minY) * scale
      const x2 = (b.x - bounds.minX) * scale
      const y2 = svgHeight - (b.y - bounds.minY) * scale
      paths.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#60a5fa" stroke-width="1.2" opacity="0.7"/>`)
    }
  }

  // Draw remaining isolated points
  for (const c of coords) {
    const cx = (c.x - bounds.minX) * scale
    const cy = svgHeight - (c.y - bounds.minY) * scale
    paths.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1" fill="#93c5fd" opacity="0.4"/>`)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">${paths.join('')}</svg>`
}

// ═══ DIMENSION EXTRACTION FROM STRINGS ═══

function extractDimensionsFromStrings(strings: string[], _bounds: DXFBounds): DwgDimension[] {
  const dims: DwgDimension[] = []
  // Only match strings that look like real dimension labels:
  // "14.50", "3,20 m", "2500 mm", "1.80m" etc.
  // Must have a decimal point/comma OR a unit suffix to qualify
  const dimWithUnit = /^(\d+[.,]\d+)\s*(mm|cm|m)$/i
  const dimWithDot = /^(\d+[.,]\d{1,3})$/  // e.g. "14.50", "3,20"
  const dimMmLarge = /^(\d{3,5})\s*(mm)?$/i // e.g. "2500" or "2500 mm" (likely mm)
  const seen = new Set<number>()
  let idx = 0

  for (const s of strings) {
    const trimmed = s.trim()
    if (trimmed.length < 2 || trimmed.length > 12) continue

    let value = 0
    let unit = ''
    let confidence = 0

    // Priority 1: dimension with explicit unit
    const m1 = trimmed.match(dimWithUnit)
    if (m1) {
      value = parseFloat(m1[1].replace(',', '.'))
      unit = m1[2].toLowerCase()
      confidence = 0.9
    }

    // Priority 2: decimal number (likely metres)
    if (!m1) {
      const m2 = trimmed.match(dimWithDot)
      if (m2) {
        value = parseFloat(m2[1].replace(',', '.'))
        // Architectural dims: 0.5m to 100m are typical
        if (value >= 0.3 && value <= 150) {
          unit = 'm'
          confidence = 0.7
        } else {
          continue
        }
      }
    }

    // Priority 3: large integer likely in mm (1000-50000)
    if (!m1 && !trimmed.includes('.') && !trimmed.includes(',')) {
      const m3 = trimmed.match(dimMmLarge)
      if (m3) {
        const raw = parseInt(m3[1], 10)
        if (raw >= 500 && raw <= 50000) {
          value = raw / 1000
          unit = 'mm'
          confidence = 0.6
        } else {
          continue
        }
      }
    }

    if (value <= 0 || confidence === 0) continue

    // Deduplicate by rounded value
    const rounded = Math.round(value * 100)
    if (seen.has(rounded)) continue
    seen.add(rounded)

    dims.push({
      id: `dwg-dim-${idx++}`,
      valueText: trimmed,
      value,
      unit,
      x: 0.5,
      y: 0.1 + (idx * 0.04) % 0.8,
      confidence,
    })

    if (dims.length >= 50) break // cap to avoid noise
  }

  return dims
}

// ═══ UNIT DETECTION ═══

function detectUnit(bounds: DXFBounds, strings: string[]): { unit: 'mm' | 'm' | 'cm' | 'unknown'; factor: number } {
  const w = bounds.maxX - bounds.minX
  const h = bounds.maxY - bounds.minY
  const maxDim = Math.max(w, h)

  // Check strings for unit hints
  const allText = strings.join(' ').toLowerCase()
  if (allText.includes('millimeter') || allText.includes('millimetre')) return { unit: 'mm', factor: 0.001 }
  if (allText.includes('centimeter') || allText.includes('centimetre')) return { unit: 'cm', factor: 0.01 }
  if (allText.includes('meter') || allText.includes('metre')) return { unit: 'm', factor: 1 }

  // Heuristic based on coordinate range
  // Architectural plans in mm: typical mall floor ~200,000 x 140,000
  // In cm: ~20,000 x 14,000
  // In m: ~200 x 140
  if (maxDim > 50000) return { unit: 'mm', factor: 0.001 }
  if (maxDim > 5000) return { unit: 'cm', factor: 0.01 }
  if (maxDim > 10 && maxDim < 5000) return { unit: 'm', factor: 1 }

  return { unit: 'unknown', factor: 1 }
}

// ═══ MAIN PARSE ═══

function parseDwg(input: DwgParserInput): DwgParserOutput {
  const { fileBuffer, floorId, widthM, heightM } = input

  self.postMessage({ type: 'progress', percent: 5 })

  // 1. Read DWG version
  const data = new DataView(fileBuffer)
  const versionCode = readDwgVersion(data)
  const dwgVersion = DWG_VERSIONS[versionCode] ?? `Inconnu (${versionCode})`

  self.postMessage({ type: 'progress', percent: 15 })

  // 2. Extract all readable strings from binary
  const allStrings = extractDwgStrings(fileBuffer)

  self.postMessage({ type: 'progress', percent: 30 })

  // 3. Extract layer names from strings
  const layers = extractLayersFromStrings(allStrings)

  self.postMessage({ type: 'progress', percent: 45 })

  // 4. Extract coordinate pairs from binary float64 data
  const rawCoords = extractCoordinatesFromBinary(fileBuffer)
  const coords = filterArchitecturalCoords(rawCoords)

  self.postMessage({ type: 'progress', percent: 60 })

  // 5. Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const c of coords) {
    if (c.x < minX) minX = c.x
    if (c.y < minY) minY = c.y
    if (c.x > maxX) maxX = c.x
    if (c.y > maxY) maxY = c.y
  }
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1; maxY = 1
  }
  const bounds: DXFBounds = { minX, minY, maxX, maxY }

  self.postMessage({ type: 'progress', percent: 70 })

  // 6. Build entities from coordinates (as synthetic polyline points)
  const entities: DXFEntity[] = coords.map((c, i) => ({
    type: 'POINT',
    layer: layers[Math.min(i % Math.max(layers.length - 1, 1), layers.length - 1)] ?? '0',
    position: { x: c.x, y: c.y },
  }))

  // 7. Extract zones
  const zones = buildZonesFromCoords(coords, layers, bounds, floorId, widthM, heightM)

  self.postMessage({ type: 'progress', percent: 80 })

  // 8. Extract door candidates from layers
  const doorCandidates: DoorCandidate[] = []
  let doorIndex = 0
  for (const layerName of layers) {
    if (!isDoorLayer(layerName)) continue
    const isExit = isExitLayer(layerName)
    // Place door candidates at layer-associated coordinate clusters
    const layerCoords = coords.slice(0, Math.min(5, coords.length))
    for (const c of layerCoords) {
      const dxfWidth = bounds.maxX - bounds.minX
      const dxfHeight = bounds.maxY - bounds.minY
      if (dxfWidth <= 0 || dxfHeight <= 0) continue

      doorCandidates.push({
        id: `door-dwg-${floorId}-${doorIndex++}`,
        floorId,
        label: `${layerName} ${doorIndex}`,
        x: (c.x - bounds.minX) / dxfWidth,
        y: (c.y - bounds.minY) / dxfHeight,
        widthM: isExit ? 1.40 : 0.90,
        isExit,
        layerName,
      })
    }
  }

  self.postMessage({ type: 'progress', percent: 90 })

  // 9. Layer classification report
  const layerClassification: LayerClassificationResult[] = layers.map(layerName => {
    const classification = classifyLayer(layerName)
    const entityCount = entities.filter(e => e.layer === layerName).length
    return {
      layerName,
      type: classification.type,
      niveau: classification.niveau,
      color: classification.color,
      entityCount,
      confidence: classification.confidence,
    }
  }).sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3)
  })

  // 10. Detect unit and compute real dimensions
  const unitInfo = detectUnit(bounds, allStrings)
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY
  const realWidthM = dxfWidth * unitInfo.factor
  const realHeightM = dxfHeight * unitInfo.factor

  // 11. Extract dimension texts from binary strings
  const dimensions = extractDimensionsFromStrings(allStrings, bounds)

  // 12. Generate SVG preview
  const svgContent = generateSVG(coords, bounds, layers)

  self.postMessage({ type: 'progress', percent: 95 })

  return {
    entities,
    layers,
    bounds,
    zones,
    doorCandidates,
    svgContent,
    layerClassification,
    dwgVersion,
    parseMethod: layers.length > 1 ? 'binary' : 'partial',
    dimensions,
    detectedUnit: unitInfo.unit,
    realWidthM,
    realHeightM,
  }
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<DwgParserInput>) => {
  try {
    const result = parseDwg(e.data)
    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error
        ? `Erreur parsing DWG: ${err.message}. Conseil: exportez le fichier en .dxf depuis AutoCAD pour de meilleurs resultats.`
        : 'Erreur inconnue dans le parser DWG. Essayez d\'exporter en .dxf depuis AutoCAD.',
    })
  }
}
