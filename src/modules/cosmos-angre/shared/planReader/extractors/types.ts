// ═══ PLAN READER V2 — Normalized types for all extractors ═══

export interface Point {
  x: number
  y: number
}

export interface Edge {
  start: Point
  end: Point
}

export interface NormalizedRoom {
  id: string
  polygon_m: Point[]            // polygon in metres (or normalized 0-1 if no scale)
  area_sqm: number
  label?: string
  zone_type?: ZoneType
  semantic_confidence: number   // 0-1, how sure we are about the label/type
  needs_placement?: boolean     // true if no coordinates (Excel without X/Y)
}

export interface NormalizedWall {
  start: Point
  end: Point
  thickness_m?: number
}

export interface NormalizedOpening {
  type: 'door' | 'window' | 'vitrine'
  position: Point
  width_m: number
  orientation?: number          // degrees
}

export interface NormalizedFloorPlan {
  rooms: NormalizedRoom[]
  walls: NormalizedWall[]
  openings: NormalizedOpening[]
  scale: number                 // multiplier to get metres (1.0 if already in metres)
  confidence: number            // 0-1 overall
  floor_level?: string          // RDC, B1, R+1...
  needs_manual_review?: boolean
  needs_manual_placement?: number  // count of rooms needing manual placement
  validation_required?: boolean
  validation_message?: string
}

export type ZoneType =
  | 'anchor' | 'boutique' | 'restauration' | 'service'
  | 'circulation' | 'parking' | 'technique' | 'commun'
  | 'exterieur' | 'bureaux' | 'loisirs' | 'backoffice'

export type ExtractorFormat =
  | 'dxf' | 'dwg' | 'ifc' | 'svg'
  | 'pdf_vector' | 'pdf_raster'
  | 'xlsx' | 'csv' | 'shp'
  | 'image'

export interface FloorPlanExtractor {
  extract(file: File, additionalFiles?: File[]): Promise<NormalizedFloorPlan>
}

// ── Format detection ─────────────────────────────────────────

export function detectExtractorFormat(file: File): ExtractorFormat {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type.toLowerCase()

  if (ext === 'dxf') return 'dxf'
  if (ext === 'dwg') return 'dwg'
  if (ext === 'ifc') return 'ifc'
  if (ext === 'svg') return 'svg'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  if (ext === 'csv') return 'csv'
  if (ext === 'shp') return 'shp'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf_vector' // will be reclassified after parsing
  if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'].includes(ext)) return 'image'
  if (mime.startsWith('image/')) return 'image'

  return 'image' // fallback
}

// ── Geometry utilities ───────────────────────────────────────

export function computePolygonArea(points: Point[]): number {
  // Shoelace formula
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area) / 2
}

export function pointDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function generateId(): string {
  return `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Zone type normalization ──────────────────────────────────

const TYPE_ALIASES: Record<string, ZoneType> = {
  'retail': 'boutique', 'shop': 'boutique', 'commerce': 'boutique', 'cellule': 'boutique', 'local': 'boutique',
  'restaurant': 'restauration', 'food': 'restauration', 'cafe': 'restauration', 'cafeteria': 'restauration',
  'office': 'bureaux', 'bureau': 'bureaux', 'admin': 'bureaux', 'direction': 'bureaux',
  'corridor': 'circulation', 'couloir': 'circulation', 'hall': 'circulation', 'allee': 'circulation',
  'lobby': 'commun', 'commun': 'commun', 'sanitaire': 'commun', 'wc': 'commun',
  'park': 'parking', 'garage': 'parking', 'stationnement': 'parking',
  'technical': 'technique', 'mecanique': 'technique', 'gaine': 'technique', 'chaufferie': 'technique', 'storage': 'technique',
  'anchor': 'anchor', 'grande surface': 'anchor', 'hypermarche': 'anchor',
  'loisir': 'loisirs', 'cinema': 'loisirs', 'jeux': 'loisirs', 'sport': 'loisirs',
  'exterieur': 'exterieur', 'terrasse': 'exterieur',
  'reserve': 'backoffice', 'stock': 'backoffice', 'back': 'backoffice',
}

export function normalizeZoneType(raw: string | undefined): ZoneType | undefined {
  if (!raw) return undefined
  const lower = raw.toLowerCase().trim()
  if (Object.values(TYPE_ALIASES).includes(lower as ZoneType)) return lower as ZoneType
  for (const [alias, type] of Object.entries(TYPE_ALIASES)) {
    if (lower.includes(alias)) return type
  }
  return undefined
}
