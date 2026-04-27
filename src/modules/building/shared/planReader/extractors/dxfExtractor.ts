// ═══ DXF / DWG EXTRACTOR — 100% exact geometry ═══

import type {
  FloorPlanExtractor, NormalizedFloorPlan, NormalizedRoom, NormalizedWall,
  NormalizedOpening, Point, Edge,
} from './types'
import { computePolygonArea, pointDistance, generateId, normalizeZoneType } from './types'
import { parseDxfRich } from '../dxfRichParser'

// ── Layer patterns ───────────────────────────────────────────

const WALL_LAYERS = [
  /^A[-_]?WALL/i, /^MURS?$/i, /^CLOISONS?/i,
  /^GROS.?OEUVRE/i, /^GO$/i, /^STRUCT/i,
  /^PARTITION/i, /^WALLS?$/i, /^BATI/i,
]

const ROOM_LAYERS = [
  /^A[-_]?ROOM/i, /^A[-_]?AREA/i, /^LOCAUX/i,
  /^CELLULES?/i, /^ESPACES?/i, /^ZONES?/i,
  /^ROOMS?$/i, /^SPACES?$/i,
]

const IGNORE_LAYERS = [
  /^[A-Z][-_]?ANNO/i, /^[A-Z][-_]?TEXT/i, /^COTES?/i,
  /^DIM/i, /^ELEC/i, /^PLOMB/i, /^CVC/i,
  /^HVAC/i, /^HATCH/i, /^HACHURAGE/i,
  /^AXES?$/i, /^GRILLE/i, /^MOBILIER/i,
  /^EQUIPEMENT/i, /^FURNITURE/i, /^DEFPOINTS/i,
  /^RESEAU/i, /^FLUIDE/i, /^DATA/i,
]

// ── Extractor ────────────────────────────────────────────────

export class DXFFloorPlanExtractor implements FloorPlanExtractor {

  async extract(file: File): Promise<NormalizedFloorPlan> {
    const { default: DxfParser } = await import('dxf-parser')
    const parser = new DxfParser()
    const text = await file.text()
    const dxf = parser.parseSync(text)

    if (!dxf) throw new Error('Impossible de parser le fichier DXF')

    const entities = dxf.entities ?? []

    // ═══ Sprint 10 — Rich extraction parallèle (toutes entités, blocks expansés) ═══
    // Lance en parallèle un parsing complet via dxfRichParser. Pas bloquant
    // pour rooms/walls/openings : si rich échoue, on garde l'extraction normale.
    let rawEntities: unknown[] = []
    try {
      const rich = await parseDxfRich(text)
      rawEntities = rich.entities
      // eslint-disable-next-line no-console
      console.info(`[dxfExtractor] Rich extraction : ${rich.entities.length} entités`, rich.stats)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[dxfExtractor] parseDxfRich a échoué, on continue sans :', err)
    }

    // Step 1: Detect scale
    const scale = this.extractScale(dxf, entities)

    // Step 2: Filter entities by layer
    const wallEntities = this.filterByLayer(entities, WALL_LAYERS, IGNORE_LAYERS)
    const roomEntities = this.filterByLayer(entities, ROOM_LAYERS, IGNORE_LAYERS)

    // Step 3: Extract room polygons
    // Method A: direct closed polylines from ROOM layers
    let rooms = this.extractClosedPolylines(roomEntities, scale)

    // Method B: if not enough rooms, try closed polylines from ALL non-ignored layers
    if (rooms.length < 3) {
      const allNonIgnored = entities.filter((e: DxfEntity) => {
        const layer = (e.layer ?? '').toUpperCase()
        return !IGNORE_LAYERS.some(p => p.test(layer))
      })
      const closedPolys = this.extractClosedPolylines(allNonIgnored, scale)
      if (closedPolys.length > rooms.length) rooms = closedPolys
    }

    // Method C: if still not enough, reconstruct rooms from wall segments
    if (rooms.length < 3) {
      const wallRooms = this.reconstructRoomsFromWalls(wallEntities, scale)
      if (wallRooms.length > rooms.length) rooms = wallRooms
    }

    // Step 4: Label rooms from TEXT/MTEXT entities
    this.labelRoomsFromTexts(rooms, entities, scale)

    // Step 5: Extract walls
    const walls = this.extractWalls(wallEntities, scale)

    // Step 6: Extract openings (INSERT blocks named *DOOR*, *PORTE*, *WINDOW*)
    const openings = this.extractOpenings(entities, scale)

    // Step 7: Detect floor level
    const floor_level = this.detectFloorLevel(entities)

    return {
      rooms,
      walls,
      openings,
      scale: 1.0, // already converted to metres
      confidence: rooms.length > 0 ? 0.95 : 0.5,
      floor_level,
      rawEntities, // Sprint 10 : entités brutes pour MallMap2D underlay
    }
  }

  // ── Scale detection ──────────────────────────────────────

  private extractScale(dxf: DxfFile, entities: DxfEntity[]): number {
    // Method 1: HEADER $INSUNITS
    const insunits = dxf.header?.$INSUNITS
    const UNIT_SCALE: Record<number, number> = {
      1: 0.0254,  // inches
      2: 0.3048,  // feet
      4: 0.001,   // mm
      5: 0.01,    // cm
      6: 1.0,     // metres
    }
    if (insunits && UNIT_SCALE[insunits]) return UNIT_SCALE[insunits]

    // Method 2: Scale text annotation
    const texts = entities.filter((e: DxfEntity) => e.type === 'TEXT' || e.type === 'MTEXT')
    for (const t of texts) {
      const txt = (t as DxfTextEntity).text ?? ''
      const match = txt.match(/1\s*[:/]\s*(\d+)/)
      if (match) return 1 / parseInt(match[1], 10)
    }

    // Method 3: Heuristic from bounding box size
    const bounds = this.getBounds(entities)
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
    if (span > 100_000) return 0.001  // mm
    if (span > 1_000) return 0.01     // cm
    return 1.0                         // metres
  }

  // ── Entity filtering ─────────────────────────────────────

  private filterByLayer(entities: DxfEntity[], include: RegExp[], exclude: RegExp[]): DxfEntity[] {
    return entities.filter(e => {
      const layer = (e.layer ?? '').toUpperCase()
      if (exclude.some(p => p.test(layer))) return false
      if (include.length === 0) return true
      return include.some(p => p.test(layer))
    })
  }

  // ── Closed polyline extraction ───────────────────────────

  private extractClosedPolylines(entities: DxfEntity[], scale: number): NormalizedRoom[] {
    const rooms: NormalizedRoom[] = []

    for (const e of entities) {
      if (e.type !== 'LWPOLYLINE' && e.type !== 'POLYLINE') continue
      const verts = (e as DxfPolyEntity).vertices ?? []
      if (verts.length < 3) continue

      // Check if closed
      const isClosed = (e as DxfPolyEntity).shape ??
        (pointDistance(verts[0], verts[verts.length - 1]) < 1)

      if (!isClosed) continue

      const polygon = verts.map(v => ({ x: v.x * scale, y: v.y * scale }))
      const area = computePolygonArea(polygon)

      // Filter: min 2m², max 50000m²
      if (area < 2 || area > 50_000) continue

      rooms.push({
        id: generateId(),
        polygon_m: polygon,
        area_sqm: area,
        semantic_confidence: 0,
      })
    }

    return rooms
  }

  // ── Room reconstruction from wall segments ───────────────

  private reconstructRoomsFromWalls(wallEntities: DxfEntity[], scale: number): NormalizedRoom[] {
    // Extract all edges from LINE and LWPOLYLINE entities
    const edges: Edge[] = []

    for (const e of wallEntities) {
      if (e.type === 'LINE') {
        const line = e as DxfLineEntity
        if (line.vertices && line.vertices.length >= 2) {
          edges.push({
            start: { x: line.vertices[0].x * scale, y: line.vertices[0].y * scale },
            end: { x: line.vertices[1].x * scale, y: line.vertices[1].y * scale },
          })
        }
      }
      if (e.type === 'LWPOLYLINE' || e.type === 'POLYLINE') {
        const poly = e as DxfPolyEntity
        const verts = poly.vertices ?? []
        for (let i = 0; i < verts.length - 1; i++) {
          edges.push({
            start: { x: verts[i].x * scale, y: verts[i].y * scale },
            end: { x: verts[i + 1].x * scale, y: verts[i + 1].y * scale },
          })
        }
        if (poly.shape && verts.length > 2) {
          edges.push({
            start: { x: verts[verts.length - 1].x * scale, y: verts[verts.length - 1].y * scale },
            end: { x: verts[0].x * scale, y: verts[0].y * scale },
          })
        }
      }
    }

    if (edges.length < 4) return []

    // Build planar graph: snap vertices within tolerance
    const TOLERANCE = 0.05 * scale // 5cm
    const vertices: Point[] = []
    const adjacency = new Map<number, Set<number>>()

    const snapVertex = (p: Point): number => {
      for (let i = 0; i < vertices.length; i++) {
        if (pointDistance(vertices[i], p) < TOLERANCE) return i
      }
      vertices.push(p)
      return vertices.length - 1
    }

    for (const edge of edges) {
      const si = snapVertex(edge.start)
      const ei = snapVertex(edge.end)
      if (si === ei) continue
      if (!adjacency.has(si)) adjacency.set(si, new Set())
      if (!adjacency.has(ei)) adjacency.set(ei, new Set())
      adjacency.get(si)!.add(ei)
      adjacency.get(ei)!.add(si)
    }

    // Detect minimal cycles (rooms) using face tracing
    const rooms: NormalizedRoom[] = []
    const visitedEdges = new Set<string>()

    for (const [startIdx, neighbors] of adjacency.entries()) {
      for (const nextIdx of neighbors) {
        const key = `${startIdx}-${nextIdx}`
        if (visitedEdges.has(key)) continue

        const face = this.traceFace(vertices, adjacency, startIdx, nextIdx, visitedEdges)
        if (face.length >= 3 && face.length <= 50) {
          const polygon = face.map(i => vertices[i])
          const area = computePolygonArea(polygon)
          // Keep rooms 2m² - 50000m²
          if (area > 2 && area < 50_000) {
            rooms.push({
              id: generateId(),
              polygon_m: polygon,
              area_sqm: area,
              semantic_confidence: 0,
            })
          }
        }
      }
    }

    return rooms
  }

  private traceFace(
    vertices: Point[],
    adjacency: Map<number, Set<number>>,
    start: number,
    next: number,
    visited: Set<string>
  ): number[] {
    const face: number[] = [start]
    let current = start
    let n = next
    let iter = 0
    const MAX_ITER = 200

    while (iter++ < MAX_ITER) {
      visited.add(`${current}-${n}`)
      face.push(n)

      if (n === start && face.length > 3) return face

      const neighbors = Array.from(adjacency.get(n) ?? []).filter(v => v !== current)
      if (neighbors.length === 0) return []

      // Choose next vertex by turning right (clockwise)
      const prev = vertices[current]
      const curr = vertices[n]
      const inAngle = Math.atan2(prev.y - curr.y, prev.x - curr.x)

      let bestIdx = neighbors[0]
      let bestAngle = Infinity

      for (const cand of neighbors) {
        const candP = vertices[cand]
        let angle = Math.atan2(candP.y - curr.y, candP.x - curr.x) - inAngle
        if (angle < 0) angle += 2 * Math.PI
        if (angle < bestAngle) {
          bestAngle = angle
          bestIdx = cand
        }
      }

      current = n
      n = bestIdx
    }

    return []
  }

  // ── Label rooms from TEXT entities ────────────────────────

  private labelRoomsFromTexts(rooms: NormalizedRoom[], entities: DxfEntity[], scale: number): void {
    const texts = entities
      .filter((e: DxfEntity) => e.type === 'TEXT' || e.type === 'MTEXT')
      .map((e: DxfEntity) => {
        const te = e as DxfTextEntity
        const pos = te.startPoint ?? te.position ?? { x: 0, y: 0 }
        return { text: (te.text ?? '').trim(), x: pos.x * scale, y: pos.y * scale }
      })
      .filter(t => t.text.length > 0 && t.text.length < 60)

    for (const room of rooms) {
      // Find text closest to centroid of room
      const cx = room.polygon_m.reduce((s, p) => s + p.x, 0) / room.polygon_m.length
      const cy = room.polygon_m.reduce((s, p) => s + p.y, 0) / room.polygon_m.length

      // Check texts inside room bounding box
      const minX = Math.min(...room.polygon_m.map(p => p.x))
      const maxX = Math.max(...room.polygon_m.map(p => p.x))
      const minY = Math.min(...room.polygon_m.map(p => p.y))
      const maxY = Math.max(...room.polygon_m.map(p => p.y))

      const insideTexts = texts.filter(t =>
        t.x >= minX - 1 && t.x <= maxX + 1 && t.y >= minY - 1 && t.y <= maxY + 1
      )

      if (insideTexts.length > 0) {
        // Pick the one closest to centroid
        insideTexts.sort((a, b) => {
          const da = (a.x - cx) ** 2 + (a.y - cy) ** 2
          const db = (b.x - cx) ** 2 + (b.y - cy) ** 2
          return da - db
        })
        room.label = insideTexts[0].text
        room.zone_type = normalizeZoneType(insideTexts[0].text)
        room.semantic_confidence = room.zone_type ? 0.9 : 0.5
      }
    }
  }

  // ── Wall extraction ──────────────────────────────────────

  private extractWalls(wallEntities: DxfEntity[], scale: number): NormalizedWall[] {
    const walls: NormalizedWall[] = []

    for (const e of wallEntities) {
      if (e.type === 'LINE') {
        const line = e as DxfLineEntity
        if (line.vertices && line.vertices.length >= 2) {
          walls.push({
            start: { x: line.vertices[0].x * scale, y: line.vertices[0].y * scale },
            end: { x: line.vertices[1].x * scale, y: line.vertices[1].y * scale },
          })
        }
      }
    }

    return walls.slice(0, 500)
  }

  // ── Opening extraction ───────────────────────────────────

  private extractOpenings(entities: DxfEntity[], scale: number): NormalizedOpening[] {
    const openings: NormalizedOpening[] = []
    const doorPatterns = /DOOR|PORTE|FENETRE|WINDOW|VITRINE/i

    for (const e of entities) {
      if (e.type === 'INSERT') {
        const insert = e as DxfInsertEntity
        if (doorPatterns.test(insert.name ?? '')) {
          const pos = insert.position ?? { x: 0, y: 0 }
          const isDoor = /DOOR|PORTE/i.test(insert.name ?? '')
          openings.push({
            type: isDoor ? 'door' : 'window',
            position: { x: pos.x * scale, y: pos.y * scale },
            width_m: (insert.xScale ?? 1) * scale,
          })
        }
      }
    }

    return openings
  }

  // ── Floor level detection ────────────────────────────────

  private detectFloorLevel(entities: DxfEntity[]): string | undefined {
    const levels = ['B2', 'B1', 'RDC', 'R+1', 'R+2', 'R+3', 'SOUS-SOL', 'REZ-DE-CHAUSSEE', 'TERRASSE']
    for (const e of entities) {
      if (e.type !== 'TEXT' && e.type !== 'MTEXT') continue
      const text = ((e as DxfTextEntity).text ?? '').toUpperCase()
      for (const level of levels) {
        if (text.includes(level)) return level.includes('REZ') ? 'RDC' : level
      }
    }
    return undefined
  }

  // ── Bounding box ─────────────────────────────────────────

  private getBounds(entities: DxfEntity[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const e of entities) {
      const verts = (e as DxfPolyEntity).vertices ?? []
      for (const v of verts) {
        if (v.x < minX) minX = v.x
        if (v.y < minY) minY = v.y
        if (v.x > maxX) maxX = v.x
        if (v.y > maxY) maxY = v.y
      }
    }
    return { minX: isFinite(minX) ? minX : 0, minY: isFinite(minY) ? minY : 0, maxX: isFinite(maxX) ? maxX : 1000, maxY: isFinite(maxY) ? maxY : 1000 }
  }
}

// ── DXF entity types (minimal for dxf-parser) ───────────────

interface DxfFile { header?: Record<string, number>; entities?: DxfEntity[] }
interface DxfEntity { type: string; layer?: string }
interface DxfPolyEntity extends DxfEntity { vertices?: Point[]; shape?: boolean }
interface DxfLineEntity extends DxfEntity { vertices?: Point[] }
interface DxfTextEntity extends DxfEntity { text?: string; startPoint?: Point; position?: Point }
interface DxfInsertEntity extends DxfEntity { name?: string; position?: Point; xScale?: number }
