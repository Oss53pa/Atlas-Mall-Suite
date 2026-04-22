// ═══ DXF PARSER WORKER — Parse DXF files and extract zones ═══

import DxfParser from 'dxf-parser'

// Minimal types for worker context
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

interface DxfParserInput {
  fileContent: string
  floorId: string
  widthM: number
  heightM: number
}

interface DxfParserOutput {
  entities: DXFEntity[]
  layers: string[]
  bounds: DXFBounds
  zones: Zone[]
  doorCandidates: DoorCandidate[]
  svgContent: string
  layerClassification: LayerClassificationResult[]
}

interface LayerClassificationResult {
  layerName: string
  type: SpaceType
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  entityCount: number
  confidence: 'high' | 'medium' | 'low'
}

// ═══ ENHANCED LAYER CLASSIFICATION ═══

interface LayerPattern {
  pattern: RegExp
  type: SpaceType
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  confidence: 'high' | 'medium' | 'low'
}

const LAYER_PATTERNS: LayerPattern[] = [
  // High confidence: very specific patterns
  { pattern: /\bpark(ing|)\b/i,                                 type: 'parking',        niveau: 3, color: '#64748b', confidence: 'high' },
  { pattern: /\b(commerce|shop|retail|boutique|magasin|cell)\b/i, type: 'commerce',     niveau: 2, color: '#3b82f6', confidence: 'high' },
  { pattern: /\b(restau|food|cuisine|cafe|cantine|snack)\b/i,   type: 'restauration',   niveau: 2, color: '#f59e0b', confidence: 'high' },
  { pattern: /\b(circul|corridor|couloir|hall|galerie|passage|deambul|atrium)\b/i, type: 'circulation', niveau: 1, color: '#e5e7eb', confidence: 'high' },
  { pattern: /\b(tech|elec|cvc|plomb|meca|clim|ventil|chauff|transfo|tgbt|onduleur)\b/i, type: 'technique', niveau: 4, color: '#ef4444', confidence: 'high' },
  { pattern: /\b(back.?off|admin|bureau.*admin|gestion|direction)\b/i, type: 'backoffice', niveau: 4, color: '#a77d4c', confidence: 'high' },
  { pattern: /\b(financ|compt|caiss|banqu|tresor|coffr|valeur)\b/i, type: 'financier', niveau: 5, color: '#dc2626', confidence: 'high' },
  { pattern: /\b(secours|urgence|evacu|issue|desserte)\b/i,     type: 'sortie_secours', niveau: 3, color: '#22c55e', confidence: 'high' },
  { pattern: /\b(loisir|cinema|jeu|entertain|detente|aire.?jeu)\b/i, type: 'loisirs', niveau: 2, color: '#06b6d4', confidence: 'high' },
  { pattern: /\b(service|info|client|accueil|reception)\b/i,    type: 'services',       niveau: 2, color: '#14b8a6', confidence: 'high' },
  { pattern: /\b(hotel|heberge|chambre|suite|lobby)\b/i,        type: 'hotel',          niveau: 3, color: '#b38a5a', confidence: 'high' },
  { pattern: /\b(bureau|office|open.?space|salle.?reunion)\b/i, type: 'bureaux',        niveau: 3, color: '#b38a5a', confidence: 'high' },
  { pattern: /\b(ext|jardin|terrass|facade|parvis|esplanade)\b/i, type: 'exterieur',   niveau: 1, color: '#84cc16', confidence: 'high' },

  // Medium confidence: less specific or ambiguous
  { pattern: /\b(exit|sortie)\b/i,                              type: 'sortie_secours', niveau: 3, color: '#22c55e', confidence: 'medium' },
  { pattern: /\b(stock|reserve|depot|entrepot|livraison|quai)\b/i, type: 'technique',  niveau: 4, color: '#ef4444', confidence: 'medium' },
  { pattern: /\b(toilet|wc|sanitaire|vestiaire|douche)\b/i,     type: 'services',       niveau: 2, color: '#14b8a6', confidence: 'medium' },
  { pattern: /\b(ascens|escalat|escalier|rampe|monte.?charge)\b/i, type: 'circulation', niveau: 1, color: '#e5e7eb', confidence: 'medium' },
  { pattern: /\b(sas|anti.?chambre)\b/i,                        type: 'circulation',    niveau: 2, color: '#e5e7eb', confidence: 'medium' },
  { pattern: /\b(super|hyper|aliment|marche|epicerie)\b/i,      type: 'commerce',       niveau: 2, color: '#3b82f6', confidence: 'medium' },
  { pattern: /\b(pharma|optic|sante|medic)\b/i,                 type: 'services',       niveau: 2, color: '#14b8a6', confidence: 'medium' },

  // Low confidence: generic patterns
  { pattern: /\b(zone|espace|local|piece|salle)\b/i,            type: 'circulation',    niveau: 1, color: '#e5e7eb', confidence: 'low' },
  { pattern: /\b(mur|wall|cloison|partition)\b/i,               type: 'circulation',    niveau: 1, color: '#e5e7eb', confidence: 'low' },
]

// Door detection patterns
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

// ═══ ENTITY EXTRACTION ═══

interface RawDxfEntity {
  type?: string
  layer?: string
  vertices?: { x: number; y: number }[]
  position?: { x: number; y: number }
  insertionPoint?: { x: number; y: number }
  name?: string
  width?: number
  height?: number
  text?: string
  textString?: string
  radius?: number
  startAngle?: number
  endAngle?: number
}

function extractEntities(dxfContent: string): { entities: DXFEntity[]; layers: string[]; bounds: DXFBounds } {
  const parser = new DxfParser()
  const dxf = parser.parseSync(dxfContent)

  if (!dxf || !dxf.entities) {
    return {
      entities: [],
      layers: [],
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    }
  }

  const entities: DXFEntity[] = []
  const layerSet = new Set<string>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const raw of dxf.entities as RawDxfEntity[]) {
    const entity: DXFEntity = {
      type: raw.type ?? 'UNKNOWN',
      layer: raw.layer ?? '0',
    }

    layerSet.add(entity.layer)

    // Extract vertices
    if (raw.vertices && Array.isArray(raw.vertices)) {
      entity.vertices = raw.vertices.map((v: { x: number; y: number }) => ({
        x: v.x,
        y: v.y,
      }))

      for (const v of entity.vertices) {
        if (v.x < minX) minX = v.x
        if (v.y < minY) minY = v.y
        if (v.x > maxX) maxX = v.x
        if (v.y > maxY) maxY = v.y
      }
    }

    // Extract position for point entities
    if (raw.position) {
      entity.position = { x: raw.position.x, y: raw.position.y }
      if (raw.position.x < minX) minX = raw.position.x
      if (raw.position.y < minY) minY = raw.position.y
      if (raw.position.x > maxX) maxX = raw.position.x
      if (raw.position.y > maxY) maxY = raw.position.y
    }

    // Extract insertion point for INSERT entities
    if (raw.insertionPoint) {
      entity.insertionPoint = { x: raw.insertionPoint.x, y: raw.insertionPoint.y }
      if (raw.insertionPoint.x < minX) minX = raw.insertionPoint.x
      if (raw.insertionPoint.y < minY) minY = raw.insertionPoint.y
      if (raw.insertionPoint.x > maxX) maxX = raw.insertionPoint.x
      if (raw.insertionPoint.y > maxY) maxY = raw.insertionPoint.y
    }

    if (raw.name) entity.name = raw.name
    if (raw.width !== undefined) entity.width = raw.width
    if (raw.height !== undefined) entity.height = raw.height
    if (raw.text || raw.textString) entity.text = raw.text ?? raw.textString
    if (raw.radius !== undefined) entity.radius = raw.radius
    if (raw.startAngle !== undefined) entity.startAngle = raw.startAngle
    if (raw.endAngle !== undefined) entity.endAngle = raw.endAngle

    entities.push(entity)
  }

  // Extract layer table if available
  if (dxf.tables?.layer?.layers) {
    for (const layerName of Object.keys(dxf.tables.layer.layers)) {
      layerSet.add(layerName)
    }
  }

  // Fallback bounds
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1; maxY = 1
  }

  return {
    entities,
    layers: Array.from(layerSet).sort(),
    bounds: { minX, minY, maxX, maxY },
  }
}

// ═══ ZONE EXTRACTION ═══

function extractZones(
  entities: DXFEntity[],
  _layers: string[],
  bounds: DXFBounds,
  floorId: string,
  widthM: number,
  heightM: number
): Zone[] {
  const zones: Zone[] = []
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return zones

  // Group entities by layer
  const layerEntities = new Map<string, DXFEntity[]>()
  for (const entity of entities) {
    const list = layerEntities.get(entity.layer) ?? []
    list.push(entity)
    layerEntities.set(entity.layer, list)
  }

  let zoneIndex = 0

  for (const [layerName, layerEnts] of layerEntities) {
    // Skip door layers for zone extraction
    if (isDoorLayer(layerName)) continue

    const classification = classifyLayer(layerName)

    // Find closed polygons
    const closedPolygons = layerEnts.filter(
      e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') &&
        e.vertices && e.vertices.length >= 3
    )

    for (const poly of closedPolygons) {
      if (!poly.vertices || poly.vertices.length < 3) continue

      const xs = poly.vertices.map(v => v.x)
      const ys = poly.vertices.map(v => v.y)
      const pMinX = Math.min(...xs)
      const pMaxX = Math.max(...xs)
      const pMinY = Math.min(...ys)
      const pMaxY = Math.max(...ys)

      // Normalize to 0-1
      const nx = (pMinX - bounds.minX) / dxfWidth
      const ny = (pMinY - bounds.minY) / dxfHeight
      const nw = (pMaxX - pMinX) / dxfWidth
      const nh = (pMaxY - pMinY) / dxfHeight

      const surfaceM2 = nw * widthM * nh * heightM

      if (surfaceM2 < 2) continue

      // Try to find a text label nearby
      const label = findNearbyLabel(layerEnts, (pMinX + pMaxX) / 2, (pMinY + pMaxY) / 2)

      zones.push({
        id: `zone-dxf-${floorId}-${zoneIndex++}`,
        floorId,
        label: label ?? `${layerName} ${zoneIndex}`,
        type: classification.type,
        x: nx,
        y: ny,
        w: nw,
        h: nh,
        niveau: classification.niveau,
        color: classification.color,
        surfaceM2: Math.round(surfaceM2),
        description: `Zone importee depuis calque DXF "${layerName}"`,
      })
    }

    // Also handle CIRCLE entities (rotunda, columns, etc.)
    const circles = layerEnts.filter(e => e.type === 'CIRCLE' && e.position && e.radius)
    for (const circle of circles) {
      if (!circle.position || !circle.radius) continue
      const r = circle.radius
      const cx = circle.position.x
      const cy = circle.position.y

      const nx = (cx - r - bounds.minX) / dxfWidth
      const ny = (cy - r - bounds.minY) / dxfHeight
      const nw = (2 * r) / dxfWidth
      const nh = (2 * r) / dxfHeight

      const surfaceM2 = Math.PI * ((r / dxfWidth) * widthM) * ((r / dxfHeight) * heightM)
      if (surfaceM2 < 2) continue

      zones.push({
        id: `zone-dxf-${floorId}-${zoneIndex++}`,
        floorId,
        label: `${layerName} (rond) ${zoneIndex}`,
        type: classification.type,
        x: nx,
        y: ny,
        w: nw,
        h: nh,
        niveau: classification.niveau,
        color: classification.color,
        surfaceM2: Math.round(surfaceM2),
        description: `Zone circulaire importee depuis calque DXF "${layerName}"`,
      })
    }

    // If no polygons but entities exist, create bounding zone
    if (closedPolygons.length === 0 && circles.length === 0 && layerEnts.length > 0) {
      const allPoints: { x: number; y: number }[] = []
      for (const e of layerEnts) {
        if (e.vertices) allPoints.push(...e.vertices)
        if (e.position) allPoints.push(e.position)
        if (e.insertionPoint) allPoints.push(e.insertionPoint)
      }

      if (allPoints.length >= 2) {
        const xs = allPoints.map(p => p.x)
        const ys = allPoints.map(p => p.y)
        const pMinX = Math.min(...xs)
        const pMaxX = Math.max(...xs)
        const pMinY = Math.min(...ys)
        const pMaxY = Math.max(...ys)

        const nx = (pMinX - bounds.minX) / dxfWidth
        const ny = (pMinY - bounds.minY) / dxfHeight
        const nw = Math.max(0.01, (pMaxX - pMinX) / dxfWidth)
        const nh = Math.max(0.01, (pMaxY - pMinY) / dxfHeight)

        const surfaceM2 = nw * widthM * nh * heightM
        if (surfaceM2 >= 2) {
          zones.push({
            id: `zone-dxf-${floorId}-${zoneIndex++}`,
            floorId,
            label: layerName,
            type: classification.type,
            x: nx,
            y: ny,
            w: nw,
            h: nh,
            niveau: classification.niveau,
            color: classification.color,
            surfaceM2: Math.round(surfaceM2),
            description: `Zone englobante calque "${layerName}"`,
          })
        }
      }
    }
  }

  return zones
}

// ═══ TEXT LABEL FINDER ═══

function findNearbyLabel(entities: DXFEntity[], cx: number, cy: number): string | undefined {
  let bestLabel: string | undefined
  let bestDist = 50 // max search radius in DXF units

  for (const e of entities) {
    if (!e.text) continue
    const pos = e.position ?? e.insertionPoint
    if (!pos) continue

    const dx = pos.x - cx
    const dy = pos.y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < bestDist) {
      bestDist = dist
      bestLabel = e.text
    }
  }

  return bestLabel
}

// ═══ DOOR CANDIDATE EXTRACTION ═══

function extractDoorCandidates(
  entities: DXFEntity[],
  bounds: DXFBounds,
  floorId: string,
  widthM: number,
  heightM: number
): DoorCandidate[] {
  const doors: DoorCandidate[] = []
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return doors

  let doorIndex = 0

  // Group by layer
  const layerEntities = new Map<string, DXFEntity[]>()
  for (const entity of entities) {
    const list = layerEntities.get(entity.layer) ?? []
    list.push(entity)
    layerEntities.set(entity.layer, list)
  }

  for (const [layerName, layerEnts] of layerEntities) {
    if (!isDoorLayer(layerName)) continue

    const isExit = isExitLayer(layerName)

    for (const ent of layerEnts) {
      let x = 0
      let y = 0
      let doorWidth = 0.90 // default

      if (ent.insertionPoint) {
        x = (ent.insertionPoint.x - bounds.minX) / dxfWidth
        y = (ent.insertionPoint.y - bounds.minY) / dxfHeight
      } else if (ent.position) {
        x = (ent.position.x - bounds.minX) / dxfWidth
        y = (ent.position.y - bounds.minY) / dxfHeight
      } else if (ent.vertices && ent.vertices.length >= 2) {
        // Use midpoint of first two vertices
        const v0 = ent.vertices[0]
        const v1 = ent.vertices[1]
        x = ((v0.x + v1.x) / 2 - bounds.minX) / dxfWidth
        y = ((v0.y + v1.y) / 2 - bounds.minY) / dxfHeight

        // Estimate width from vertex distance
        const dx = (v1.x - v0.x) / dxfWidth * widthM
        const dy = (v1.y - v0.y) / dxfHeight * heightM
        doorWidth = Math.sqrt(dx * dx + dy * dy)
        if (doorWidth < 0.5) doorWidth = 0.90
        if (doorWidth > 5.0) doorWidth = 2.40
      } else {
        continue
      }

      doors.push({
        id: `door-dxf-${floorId}-${doorIndex++}`,
        floorId,
        label: ent.name ?? ent.text ?? `${layerName} ${doorIndex}`,
        x,
        y,
        widthM: Math.round(doorWidth * 100) / 100,
        isExit,
        layerName,
      })
    }
  }

  return doors
}

// ═══ LAYER CLASSIFICATION REPORT ═══

function buildLayerClassification(
  entities: DXFEntity[],
  layers: string[]
): LayerClassificationResult[] {
  const results: LayerClassificationResult[] = []

  for (const layerName of layers) {
    const layerEnts = entities.filter(e => e.layer === layerName)
    const classification = classifyLayer(layerName)

    results.push({
      layerName,
      type: classification.type,
      niveau: classification.niveau,
      color: classification.color,
      entityCount: layerEnts.length,
      confidence: classification.confidence,
    })
  }

  return results.sort((a, b) => {
    const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (confidenceOrder[a.confidence] ?? 3) - (confidenceOrder[b.confidence] ?? 3)
  })
}

// ═══ SVG GENERATION ═══

function generateSVG(
  entities: DXFEntity[],
  bounds: DXFBounds,
  svgWidth: number = 1200,
  svgHeight: number = 800
): string {
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY

  if (dxfWidth <= 0 || dxfHeight <= 0) return '<svg></svg>'

  const scale = Math.min(svgWidth / dxfWidth, svgHeight / dxfHeight)
  const paths: string[] = []

  for (const entity of entities) {
    if (entity.type === 'CIRCLE' && entity.position && entity.radius) {
      const cx = (entity.position.x - bounds.minX) * scale
      const cy = svgHeight - (entity.position.y - bounds.minY) * scale
      const r = entity.radius * scale
      const classification = classifyLayer(entity.layer)
      paths.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${classification.color}20" stroke="${classification.color}" stroke-width="0.5"/>`
      )
      continue
    }

    if (!entity.vertices || entity.vertices.length < 2) continue

    const points = entity.vertices.map(v => {
      const x = (v.x - bounds.minX) * scale
      const y = svgHeight - (v.y - bounds.minY) * scale // Flip Y
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const d = `M ${points.join(' L ')} Z`
    const classification = classifyLayer(entity.layer)
    paths.push(
      `<path d="${d}" fill="${classification.color}20" stroke="${classification.color}" stroke-width="0.5"/>`
    )
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}">${paths.join('')}</svg>`
}

// ═══ MAIN PARSE ═══

function parseDxf(input: DxfParserInput): DxfParserOutput {
  const { fileContent, floorId, widthM, heightM } = input

  self.postMessage({ type: 'progress', percent: 10 })

  // Parse DXF
  const { entities, layers, bounds } = extractEntities(fileContent)

  self.postMessage({ type: 'progress', percent: 30 })

  // Build layer classification report
  const layerClassification = buildLayerClassification(entities, layers)

  self.postMessage({ type: 'progress', percent: 40 })

  // Extract zones
  const zones = extractZones(entities, layers, bounds, floorId, widthM, heightM)

  self.postMessage({ type: 'progress', percent: 60 })

  // Extract door candidates
  const doorCandidates = extractDoorCandidates(entities, bounds, floorId, widthM, heightM)

  self.postMessage({ type: 'progress', percent: 75 })

  // Generate SVG
  const svgContent = generateSVG(entities, bounds)

  self.postMessage({ type: 'progress', percent: 95 })

  return {
    entities,
    layers,
    bounds,
    zones,
    doorCandidates,
    svgContent,
    layerClassification,
  }
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<DxfParserInput>) => {
  try {
    const result = parseDxf(e.data)
    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in dxfParser worker',
    })
  }
}
