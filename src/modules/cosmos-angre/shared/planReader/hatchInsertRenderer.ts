// ═══ HATCH / INSERT RENDERER — Rendu des hachures et blocs DXF (M15) ═══
// dxf-parser expose HATCH (avec boundaries) et INSERT (blocks référencés).
// On les convertit en entités plannings rendables (polygones remplis + instances).

import type { HatchGeometry, InsertGeometry, PlanEntity, HatchBoundary } from './planEngineTypes'

export interface DxfBlockDefinition {
  name: string
  entities: PlanEntity[]
  /** Base point pour l'insertion. */
  basePoint?: [number, number]
}

export interface HatchRenderHint {
  /** Catégorie déduite depuis le pattern name. */
  category: 'concrete' | 'brick' | 'wood' | 'grass' | 'water' | 'hatch-solid' | 'hatch-lines' | 'unknown'
  /** Couleur de remplissage recommandée. */
  fillColor: string
  /** Opacité (0-1). */
  opacity: number
  /** Polygones outer + holes (dans l'ordre pair-impair). */
  rings: Array<{ vertices: [number, number][]; isHole: boolean }>
}

// ─── Pattern name → catégorie/couleur ─────────────────────

const PATTERN_CATEGORIES: Array<{ re: RegExp; category: HatchRenderHint['category']; color: string; opacity: number }> = [
  { re: /solid/i, category: 'hatch-solid', color: '#94a3b8', opacity: 0.4 },
  { re: /ar-conc|concrete|beton/i, category: 'concrete', color: '#78716c', opacity: 0.35 },
  { re: /ar-brick|brick|brique/i, category: 'brick', color: '#b45309', opacity: 0.4 },
  { re: /ar-wood|wood|bois/i, category: 'wood', color: '#92400e', opacity: 0.35 },
  { re: /ar-hbone|grass|vegeta|herbe/i, category: 'grass', color: '#16a34a', opacity: 0.25 },
  { re: /water|eau/i, category: 'water', color: '#0284c7', opacity: 0.4 },
  { re: /ansi3[12]|steel|metal|acier/i, category: 'hatch-lines', color: '#64748b', opacity: 0.3 },
]

// ─── Hatch processing ─────────────────────────────────────

export function processHatch(
  geometry: HatchGeometry,
  _unitScale = 1,
): HatchRenderHint {
  const hint = PATTERN_CATEGORIES.find(p => p.re.test(geometry.patternName ?? ''))
  const defaults = { category: 'unknown' as const, color: '#94a3b8', opacity: 0.3 }
  const cfg = hint ?? defaults

  // Les boundaries DXF alternent outer/inner par règle pair-impair
  const rings = geometry.boundaries.map((b: HatchBoundary, i: number) => ({
    vertices: b.vertices.map(v => [v.x, v.y] as [number, number]),
    isHole: i % 2 === 1 && geometry.boundaries.length > 1,
  }))

  return {
    category: cfg.category,
    fillColor: cfg.color,
    opacity: cfg.opacity,
    rings,
  }
}

/** Convertit un HatchRenderHint en chemin SVG prêt à rendre. */
export function hatchToSvgPath(hint: HatchRenderHint): string {
  const parts: string[] = []
  for (const ring of hint.rings) {
    if (ring.vertices.length < 3) continue
    const [x0, y0] = ring.vertices[0]
    parts.push(`M ${x0} ${y0}`)
    for (let i = 1; i < ring.vertices.length; i++) {
      const [x, y] = ring.vertices[i]
      parts.push(`L ${x} ${y}`)
    }
    parts.push('Z')
  }
  return parts.join(' ')
}

// ─── Insert (block instance) processing ───────────────────

export interface ResolvedInsert {
  blockName: string
  /** Entités du bloc transformées par la matrice d'insertion. */
  entities: PlanEntity[]
  originX: number
  originY: number
}

/** Applique la transformation d'un INSERT (translation + échelle + rotation)
 *  aux entités définies dans le bloc référencé. */
export function resolveInsert(
  insert: InsertGeometry,
  blocks: Map<string, DxfBlockDefinition>,
): ResolvedInsert | null {
  const block = blocks.get(insert.blockName)
  if (!block) return null

  const cosR = Math.cos(insert.rotation)
  const sinR = Math.sin(insert.rotation)
  const bx = block.basePoint?.[0] ?? 0
  const by = block.basePoint?.[1] ?? 0

  const transformPoint = (x: number, y: number): [number, number] => {
    // Translate → scale → rotate → insert origin
    const lx = (x - bx) * insert.scaleX
    const ly = (y - by) * insert.scaleY
    return [
      insert.x + lx * cosR - ly * sinR,
      insert.y + lx * sinR + ly * cosR,
    ]
  }

  const transformed: PlanEntity[] = block.entities.map(e => {
    const geom = e.geometry
    let newGeom = geom
    switch (geom.kind) {
      case 'line': {
        const [x1, y1] = transformPoint(geom.x1, geom.y1)
        const [x2, y2] = transformPoint(geom.x2, geom.y2)
        newGeom = { ...geom, x1, y1, x2, y2 }
        break
      }
      case 'polyline': {
        newGeom = {
          ...geom,
          vertices: geom.vertices.map(v => {
            const [nx, ny] = transformPoint(v.x, v.y)
            return { ...v, x: nx, y: ny }
          }),
        }
        break
      }
      case 'circle': {
        const [cx, cy] = transformPoint(geom.cx, geom.cy)
        newGeom = { ...geom, cx, cy, radius: geom.radius * Math.abs(insert.scaleX) }
        break
      }
      case 'arc': {
        const [cx, cy] = transformPoint(geom.cx, geom.cy)
        const rot = (insert.rotation * 180) / Math.PI
        newGeom = {
          ...geom, cx, cy,
          radius: geom.radius * Math.abs(insert.scaleX),
          startAngle: geom.startAngle + rot,
          endAngle: geom.endAngle + rot,
        }
        break
      }
      case 'text': {
        const [nx, ny] = transformPoint(geom.x, geom.y)
        newGeom = { ...geom, x: nx, y: ny, rotation: (geom.rotation ?? 0) + (insert.rotation * 180) / Math.PI }
        break
      }
      default:
        break
    }
    // Recalcule bounds approximatif
    return { ...e, geometry: newGeom }
  })

  return {
    blockName: insert.blockName,
    entities: transformed,
    originX: insert.x,
    originY: insert.y,
  }
}

/** Parcourt un AST dxf-parser brut pour extraire les définitions de blocks. */
export function extractBlockDefinitions(dxf: any): Map<string, DxfBlockDefinition> {
  const blocks = new Map<string, DxfBlockDefinition>()
  if (!dxf?.blocks) return blocks
  for (const name of Object.keys(dxf.blocks)) {
    const b = dxf.blocks[name]
    if (!b || !Array.isArray(b.entities)) continue
    blocks.set(name, {
      name,
      entities: [], // les entités DXF brutes ne sont pas converties ici — laissé à un post-processor
      basePoint: b.position ? [b.position.x ?? 0, b.position.y ?? 0] : [0, 0],
    })
  }
  return blocks
}
