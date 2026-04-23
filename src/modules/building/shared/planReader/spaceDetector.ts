// ═══ SPACE DETECTOR — Polygon-based detection from DWG entities ═══
// Detects closed spaces from LWPOLYLINE, HATCH boundaries, and text labels.
// Uses shoelace formula for area, ray-casting for point-in-polygon.

import type { SpaceType } from '../proph3t/types'
import type {
  PlanEntity, DetectedSpace, Bounds,
  PolylineGeometry, HatchGeometry, TextGeometry,
  WallSegment,
} from './planEngineTypes'
import { computeBoundsFromPoints } from './coordinateEngine'

let _uid = 0
function uid(): string {
  return `space-${++_uid}-${Date.now().toString(36)}`
}

// ─── MAIN DETECTION ──────────────────────────────────────

export function detectSpaces(
  entities: PlanEntity[],
  _bounds: Bounds,
): DetectedSpace[] {
  _uid = 0
  const spaces: DetectedSpace[] = []

  // ── METHOD 1: Closed LWPOLYLINE / POLYLINE2D ──
  const polyEntities = entities.filter(
    e => (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE2D') && e.geometry.kind === 'polyline'
  )

  for (const entity of polyEntities) {
    const geom = entity.geometry as PolylineGeometry
    if (!geom.closed && !isSnapClosed(geom.vertices)) continue
    if (geom.vertices.length < 3) continue

    const polygon = geom.vertices.map(v => [v.x, v.y] as [number, number])
    const area = shoelaceArea(polygon)

    // Filter: 2 m² to 50,000 m² (reasonable room/space sizes)
    if (area < 2 || area > 50000) continue

    const label = findTextInsidePolygon(entities, polygon) ?? `Local ${spaces.length + 1}`
    const polyBounds = computePolygonBounds(polygon)

    spaces.push({
      id: uid(),
      polygon,
      areaSqm: Math.round(area * 10) / 10,
      label,
      layer: entity.layer,
      type: classifySpaceType(entity.layer, label),
      bounds: polyBounds,
      color: null,
      metadata: {},
    })
  }

  // ── METHOD 2: HATCH boundaries ──
  const hatches = entities.filter(e => e.type === 'HATCH' && e.geometry.kind === 'hatch')

  for (const hatch of hatches) {
    const geom = hatch.geometry as HatchGeometry
    for (const boundary of geom.boundaries) {
      if (boundary.vertices.length < 3) continue

      const polygon = boundary.vertices.map(v => [v.x, v.y] as [number, number])
      const area = shoelaceArea(polygon)
      if (area < 2 || area > 50000) continue

      // Deduplicate with already-detected polyline spaces
      if (isAlreadyDetected(polygon, spaces)) continue

      const label = findTextInsidePolygon(entities, polygon) ?? `Zone ${spaces.length + 1}`
      const polyBounds = computePolygonBounds(polygon)

      spaces.push({
        id: uid(),
        polygon,
        areaSqm: Math.round(area * 10) / 10,
        label,
        layer: hatch.layer,
        type: classifySpaceType(hatch.layer, label),
        bounds: polyBounds,
        color: null,
        metadata: {},
      })
    }
  }

  return spaces
}

// ─── SHOELACE AREA ────────────────────────────────────────

export function shoelaceArea(polygon: [number, number][]): number {
  let area = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

// ─── POINT IN POLYGON (Ray Casting) ──────────────────────

export function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if (((yi > py) !== (yj > py)) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// ─── TEXT INSIDE POLYGON ─────────────────────────────────

function findTextInsidePolygon(entities: PlanEntity[], polygon: [number, number][]): string | null {
  const texts = entities.filter(
    e => (e.type === 'TEXT' || e.type === 'MTEXT') && e.geometry.kind === 'text'
  )

  for (const textEntity of texts) {
    const geom = textEntity.geometry as TextGeometry
    if (pointInPolygon(geom.x, geom.y, polygon)) {
      const cleaned = geom.text.trim()
      // Skip pure dimension numbers
      if (/^\d+[.,]?\d*\s*(mm|cm|m)?$/.test(cleaned)) continue
      if (cleaned.length >= 2) return cleaned
    }
  }
  return null
}

// ─── DEDUPLICATION ────────────────────────────────────────

function isAlreadyDetected(polygon: [number, number][], existing: DetectedSpace[]): boolean {
  const newBounds = computePolygonBounds(polygon)
  const newArea = newBounds.width * newBounds.height

  for (const space of existing) {
    const overlapX = Math.max(0,
      Math.min(newBounds.maxX, space.bounds.maxX) -
      Math.max(newBounds.minX, space.bounds.minX)
    )
    const overlapY = Math.max(0,
      Math.min(newBounds.maxY, space.bounds.maxY) -
      Math.max(newBounds.minY, space.bounds.minY)
    )
    const overlapArea = overlapX * overlapY
    const smallerArea = Math.min(newArea, space.bounds.width * space.bounds.height)
    if (smallerArea > 0 && overlapArea / smallerArea > 0.7) return true
  }
  return false
}

// ─── SNAP-CLOSE DETECTION ─────────────────────────────────

function isSnapClosed(vertices: Array<{ x: number; y: number }>): boolean {
  if (vertices.length < 3) return false
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  const dx = Math.abs(first.x - last.x)
  const dy = Math.abs(first.y - last.y)

  // Compute diagonal of the polyline bounding box
  const xs = vertices.map(v => v.x)
  const ys = vertices.map(v => v.y)
  const diag = Math.sqrt(
    (Math.max(...xs) - Math.min(...xs)) ** 2 +
    (Math.max(...ys) - Math.min(...ys)) ** 2
  )
  const tolerance = Math.max(0.05, diag * 0.02) // 2% of diagonal
  return dx < tolerance && dy < tolerance
}

// ─── POLYGON BOUNDS ──────────────────────────────────────

export function computePolygonBounds(polygon: [number, number][]): Bounds {
  return computeBoundsFromPoints(polygon)
}

// ─── SPACE CLASSIFICATION ─────────────────────────────────

export function classifySpaceType(layer: string, label: string): SpaceType {
  const s = (layer + ' ' + label).toUpperCase()

  if (/LOCAL\s*TECH|TGBT|TRANSFO|ELECTRI|CVC|CLIM|VENTIL|PLOMB|POMPE|SPRINKL|ONDULEUR|SERVEUR|COMPT|MACHIN|MAINTENANCE|DÉCHET|STOCK|RÉSERVE|LIVRAISON|QUAI|MONTE.?CHARGE/i.test(s))
    return 'technique'
  if (/PARK|GARAGE|SOUS.?SOL|STATIONNEMENT/i.test(s))
    return 'parking'
  if (/RESTAURANT|FOOD|CUISINE|CAFÉ|BRASSERIE|SNACK|CANTINE|TRAITEUR|GLACIER|BAR\b|PIZZ|SUSHI|GRILL/i.test(s))
    return 'restauration'
  if (/BOUTIQUE|MAGASIN|SHOP|CELL|LOCAL|UNIT|STORE|COMMERCE/i.test(s))
    return 'commerce'
  if (/COUL|HALL|GALER|CIRC|CORRIDOR|ALLÉE|PASSAGE|ATRIUM|ESCALIER|ASCENS|ESCALAT|RAMPE|ENTRÉE|FOYER|PALIER|SAS/i.test(s))
    return 'circulation'
  if (/SÉCURIT|SURVEILLANCE|CONTRÔLE|VIGIL|COFFRE|TRÉSOR|FINANC|CAISS/i.test(s))
    return 'financier'
  if (/SECOURS|SORTIE|ÉVACUATION|ISSUE|URGENCE|POMPIER/i.test(s))
    return 'sortie_secours'
  if (/WC|TOILETTE|SANITAIRE|INFIRM|ACCUEIL|BANQUE|COIFFEUR|SPA|PHARMACIE/i.test(s))
    return 'services'
  if (/CINÉMA|BOWLING|ARCADE|JEU|GAME|FITNESS|GYM|PISCINE|SPECTACLE/i.test(s))
    return 'loisirs'
  if (/BUREAU|OFFICE|BACK.?OFF|ADMIN|DIRECTION|RÉUNION|CONFÉRENCE/i.test(s))
    return 'backoffice'
  if (/HÔTEL|CHAMBRE|SUITE|LOBBY|HÉBERG/i.test(s))
    return 'hotel'
  if (/EXTÉRIEUR|TERRASS|JARDIN|PARVIS|TOITURE/i.test(s))
    return 'exterieur'

  return 'commerce' // fallback
}

// ─── COLOR FOR SPACE TYPE ─────────────────────────────────

export function spaceTypeColor(type: SpaceType): string {
  const colors: Record<string, string> = {
    parking: '#64748b',
    restauration: '#f59e0b',
    commerce: '#3b82f6',
    services: '#14b8a6',
    loisirs: '#06b6d4',
    technique: '#ef4444',
    backoffice: '#a77d4c',
    financier: '#dc2626',
    sortie_secours: '#22c55e',
    circulation: '#e5e7eb',
    hotel: '#b38a5a',
    exterieur: '#84cc16',
    bureaux: '#a77d4c',
  }
  return colors[type] ?? '#3b82f6'
}

export function statusColor(status?: string): string {
  switch (status) {
    case 'vacant': return '#22c55e'
    case 'occupied': return '#3b82f6'
    case 'reserved': return '#f59e0b'
    case 'works': return '#ef4444'
    default: return '#64748b'
  }
}

// ─── WALL SEGMENT EXTRACTION ─────────────────────────────

export function extractWallSegments(entities: PlanEntity[]): WallSegment[] {
  const segments: WallSegment[] = []

  for (const entity of entities) {
    const g = entity.geometry
    if (g.kind === 'line') {
      segments.push({
        x1: g.x1, y1: g.y1,
        x2: g.x2, y2: g.y2,
        layer: entity.layer,
      })
    }
    if (g.kind === 'polyline') {
      for (let i = 0; i < g.vertices.length - 1; i++) {
        segments.push({
          x1: g.vertices[i].x, y1: g.vertices[i].y,
          x2: g.vertices[i + 1].x, y2: g.vertices[i + 1].y,
          layer: entity.layer,
        })
      }
      if (g.closed && g.vertices.length >= 3) {
        const first = g.vertices[0]
        const last = g.vertices[g.vertices.length - 1]
        segments.push({
          x1: last.x, y1: last.y,
          x2: first.x, y2: first.y,
          layer: entity.layer,
        })
      }
    }
  }

  return segments
}
