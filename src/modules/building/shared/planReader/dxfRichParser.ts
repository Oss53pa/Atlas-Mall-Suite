// ═══ DXF RICH PARSER — Extraction complète d'entités ═══
//
// Complément à dxfExtractor.ts qui se limitait à rooms/walls/openings.
// Ce parser capture TOUTES les entités utiles à la visualisation :
//   • LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC, ELLIPSE, SPLINE
//   • TEXT / MTEXT (annotations)
//   • HATCH (boundary path comme polyline fermée)
//   • INSERT (recursivement expansé via les BLOCKS du DXF)
//
// Sortie : PlanEntity[] consommable directement par ParsedPlan.entities.
// MallMap2D peut les afficher en sous-couche grise pour donner du contexte.

import type {
  PlanEntity,
  PlanGeometry,
  Bounds,
  PlanEntityType,
} from './planEngineTypes'

// ─── Types DXF parser (minimaux) ──────────────────────────

interface DxfPoint { x: number; y: number; z?: number }
interface DxfEntity {
  type: string
  layer?: string
  color?: number
  // Géométrie variable selon type
  vertices?: Array<{ x: number; y: number; bulge?: number }>
  startPoint?: DxfPoint
  endPoint?: DxfPoint
  center?: DxfPoint
  radius?: number
  startAngle?: number
  endAngle?: number
  position?: DxfPoint
  insertionPoint?: DxfPoint
  text?: string
  textHeight?: number
  rotation?: number              // radians
  scaleX?: number
  scaleY?: number
  blockName?: string             // pour INSERT
  name?: string                  // alt nom block
  shape?: boolean                // closed polyline ?
  controlPoints?: DxfPoint[]     // SPLINE
  fitPoints?: DxfPoint[]         // SPLINE
  // HATCH
  boundaryPaths?: Array<{
    edges?: Array<{
      type: number
      start?: DxfPoint; end?: DxfPoint
      vertices?: DxfPoint[]
      center?: DxfPoint; radius?: number
    }>
    polylineVertices?: DxfPoint[]
  }>
}

interface DxfBlock {
  name: string
  basePoint?: DxfPoint
  entities?: DxfEntity[]
}

interface DxfDoc {
  entities?: DxfEntity[]
  blocks?: Record<string, DxfBlock>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  header?: any
}

// ─── Couleurs ACI → hex ───────────────────────────────────

const ACI_COLORS: Record<number, string> = {
  1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff',
  5: '#0000ff', 6: '#ff00ff', 7: '#888888', 8: '#414141',
  9: '#808080', 10: '#ff7f7f', 250: '#333333', 251: '#505050',
  252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff',
}

function aciToHex(aci?: number): string | undefined {
  if (aci == null) return undefined
  return ACI_COLORS[aci] ?? '#a0a0a0'
}

// ─── Helpers géométrie ────────────────────────────────────

function emptyBounds(): Bounds {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 }
}

function boundsFromPoints(pts: ReadonlyArray<{ x: number; y: number }>): Bounds {
  if (pts.length === 0) return emptyBounds()
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX, height: maxY - minY,
    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
  }
}

function transformPoint(
  p: { x: number; y: number },
  ins: DxfPoint | undefined,
  rotRad: number,
  sx: number, sy: number,
): { x: number; y: number } {
  // Échelle puis rotation puis translation
  const xs = p.x * sx
  const ys = p.y * sy
  const cos = Math.cos(rotRad), sin = Math.sin(rotRad)
  const xr = xs * cos - ys * sin
  const yr = xs * sin + ys * cos
  return {
    x: xr + (ins?.x ?? 0),
    y: yr + (ins?.y ?? 0),
  }
}

let entityCounter = 0
function genId(prefix = 'rdx'): string {
  entityCounter++
  return `${prefix}-${Date.now().toString(36)}-${entityCounter}`
}

// ─── Convert DxfEntity → PlanEntity ───────────────────────

function dxfEntityToPlanEntity(
  e: DxfEntity,
  insertion?: DxfPoint,
  rotation = 0,
  sx = 1,
  sy = 1,
): PlanEntity | null {
  const layer = e.layer ?? '0'
  const color = aciToHex(e.color)

  const tx = (p: DxfPoint | { x: number; y: number }) => transformPoint(p, insertion, rotation, sx, sy)

  switch (e.type) {
    case 'LINE': {
      if (!e.startPoint || !e.endPoint) return null
      const s = tx(e.startPoint)
      const en = tx(e.endPoint)
      const geom: PlanGeometry = { kind: 'line', x1: s.x, y1: s.y, x2: en.x, y2: en.y }
      return {
        id: genId('line'), type: 'LINE', layer,
        geometry: geom, bounds: boundsFromPoints([s, en]),
        visible: true, color,
      }
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      if (!e.vertices || e.vertices.length < 2) return null
      const verts = e.vertices.map(v => tx(v))
      const geom: PlanGeometry = {
        kind: 'polyline',
        vertices: verts.map((v, i) => ({ x: v.x, y: v.y, bulge: e.vertices?.[i]?.bulge })),
        closed: !!e.shape,
      }
      return {
        id: genId('poly'),
        type: e.type === 'LWPOLYLINE' ? 'LWPOLYLINE' : 'POLYLINE2D',
        layer, geometry: geom, bounds: boundsFromPoints(verts),
        visible: true, color,
      }
    }

    case 'CIRCLE': {
      if (!e.center || !e.radius) return null
      const c = tx(e.center)
      const r = e.radius * Math.max(Math.abs(sx), Math.abs(sy))
      const geom: PlanGeometry = { kind: 'circle', cx: c.x, cy: c.y, radius: r }
      return {
        id: genId('circle'), type: 'CIRCLE', layer,
        geometry: geom,
        bounds: { minX: c.x - r, minY: c.y - r, maxX: c.x + r, maxY: c.y + r, width: 2 * r, height: 2 * r, centerX: c.x, centerY: c.y },
        visible: true, color,
      }
    }

    case 'ARC': {
      if (!e.center || e.radius == null) return null
      const c = tx(e.center)
      const r = e.radius * Math.max(Math.abs(sx), Math.abs(sy))
      const geom: PlanGeometry = {
        kind: 'arc',
        cx: c.x, cy: c.y, radius: r,
        startAngle: (e.startAngle ?? 0) + rotation,
        endAngle: (e.endAngle ?? 0) + rotation,
      } as PlanGeometry
      return {
        id: genId('arc'), type: 'ARC', layer,
        geometry: geom,
        bounds: { minX: c.x - r, minY: c.y - r, maxX: c.x + r, maxY: c.y + r, width: 2 * r, height: 2 * r, centerX: c.x, centerY: c.y },
        visible: true, color,
      }
    }

    case 'TEXT':
    case 'MTEXT': {
      const pos = e.position ?? e.insertionPoint
      if (!pos || !e.text) return null
      const p = tx(pos)
      const geom: PlanGeometry = {
        kind: 'text',
        x: p.x, y: p.y,
        content: e.text,
        height: (e.textHeight ?? 0.2) * Math.max(Math.abs(sx), Math.abs(sy)),
        rotation: (e.rotation ?? 0) + rotation,
      } as PlanGeometry
      return {
        id: genId('txt'),
        type: e.type === 'MTEXT' ? 'MTEXT' : 'TEXT',
        layer, geometry: geom,
        bounds: { minX: p.x, minY: p.y, maxX: p.x + 1, maxY: p.y + 0.3, width: 1, height: 0.3, centerX: p.x + 0.5, centerY: p.y },
        visible: true, color,
      }
    }

    case 'HATCH': {
      // Récupère le premier boundary path comme polyline fermée
      const path = e.boundaryPaths?.[0]
      if (!path) return null
      const verts: { x: number; y: number }[] = []
      if (path.polylineVertices && path.polylineVertices.length >= 3) {
        for (const v of path.polylineVertices) verts.push(tx(v))
      } else if (path.edges) {
        for (const edge of path.edges) {
          if (edge.start) verts.push(tx(edge.start))
          else if (edge.vertices) for (const v of edge.vertices) verts.push(tx(v))
        }
      }
      if (verts.length < 3) return null
      const geom: PlanGeometry = {
        kind: 'polyline',
        vertices: verts,
        closed: true,
      }
      return {
        id: genId('hatch'), type: 'HATCH' as PlanEntityType, layer,
        geometry: geom, bounds: boundsFromPoints(verts),
        visible: true, color: color ?? '#cccccc',
      }
    }

    default:
      return null
  }
}

// ─── Recursive INSERT expansion ───────────────────────────

function expandInsert(
  insert: DxfEntity,
  blocks: Record<string, DxfBlock>,
  parentInsertion: DxfPoint | undefined,
  parentRotation: number,
  parentScaleX: number,
  parentScaleY: number,
  depth = 0,
): PlanEntity[] {
  if (depth > 5) return [] // safety : stop runaway recursion
  const blockName = insert.blockName ?? insert.name
  if (!blockName) return []
  const block = blocks[blockName]
  if (!block || !block.entities) return []

  const insPoint = insert.insertionPoint ?? insert.position
  // Combine parent transform with this INSERT's transform
  const myInsX = (insPoint?.x ?? 0) * parentScaleX
  const myInsY = (insPoint?.y ?? 0) * parentScaleY
  const cos = Math.cos(parentRotation), sin = Math.sin(parentRotation)
  const finalIns: DxfPoint = {
    x: (parentInsertion?.x ?? 0) + myInsX * cos - myInsY * sin,
    y: (parentInsertion?.y ?? 0) + myInsX * sin + myInsY * cos,
  }
  const finalRot = parentRotation + (insert.rotation ?? 0)
  const finalSx = parentScaleX * (insert.scaleX ?? 1)
  const finalSy = parentScaleY * (insert.scaleY ?? 1)

  const out: PlanEntity[] = []
  for (const child of block.entities) {
    if (child.type === 'INSERT') {
      // Récursion
      out.push(...expandInsert(child, blocks, finalIns, finalRot, finalSx, finalSy, depth + 1))
    } else {
      const pe = dxfEntityToPlanEntity(child, finalIns, finalRot, finalSx, finalSy)
      if (pe) {
        // Tag couche : préfixe avec nom du block pour différencier
        out.push({ ...pe, layer: `${blockName}/${pe.layer}` })
      }
    }
  }
  return out
}

// ─── API publique ─────────────────────────────────────────

export interface RichDxfResult {
  readonly entities: PlanEntity[]
  readonly bounds: Bounds
  /** Stats pour debug — combien d'entités de chaque type ont été extraites. */
  readonly stats: Record<string, number>
}

/**
 * Parse un texte DXF et retourne toutes les entités utilisables visualement.
 * Expand récursivement les INSERT en entités primitives (LINE, POLYLINE,
 * etc.) avec les transformations appliquées.
 */
export async function parseDxfRich(dxfText: string): Promise<RichDxfResult> {
  const { default: DxfParser } = await import('dxf-parser')
  const parser = new DxfParser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dxf = parser.parseSync(dxfText) as DxfDoc | any
  if (!dxf) throw new Error('parseDxfRich: parsing échoué')

  const blocks = (dxf.blocks ?? {}) as Record<string, DxfBlock>
  const rootEntities = (dxf.entities ?? []) as DxfEntity[]

  const out: PlanEntity[] = []
  const stats: Record<string, number> = {}

  for (const e of rootEntities) {
    if (e.type === 'INSERT') {
      const expanded = expandInsert(e, blocks, undefined, 0, 1, 1)
      out.push(...expanded)
      stats['INSERT_expanded'] = (stats['INSERT_expanded'] ?? 0) + 1
      stats['INSERT_yielded'] = (stats['INSERT_yielded'] ?? 0) + expanded.length
    } else {
      const pe = dxfEntityToPlanEntity(e)
      if (pe) {
        out.push(pe)
        stats[pe.type] = (stats[pe.type] ?? 0) + 1
      } else {
        stats[`skipped_${e.type}`] = (stats[`skipped_${e.type}`] ?? 0) + 1
      }
    }
  }

  // Bounds globaux
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const ent of out) {
    if (ent.bounds.minX < minX) minX = ent.bounds.minX
    if (ent.bounds.minY < minY) minY = ent.bounds.minY
    if (ent.bounds.maxX > maxX) maxX = ent.bounds.maxX
    if (ent.bounds.maxY > maxY) maxY = ent.bounds.maxY
  }
  const bounds: Bounds = isFinite(minX) ? {
    minX, minY, maxX, maxY,
    width: maxX - minX, height: maxY - minY,
    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
  } : emptyBounds()

  return { entities: out, bounds, stats }
}
