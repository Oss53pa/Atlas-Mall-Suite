// ═══ SPATIAL OPS — PostGIS-like spatial primitives (M13) ═══
// Équivalent client-side de ST_Contains / ST_Intersects / ST_Distance / ST_Area /
// ST_Buffer / ST_Centroid / ST_Within pour opérer sur des polygones 2D sans serveur.
//
// Pas une dépendance à turf (évite +200KB bundle). Implémentation minimale mais correcte.

export type Point = [number, number]
export type Polygon = Point[]
export type Ring = Point[]

// ─── ST_Area ──────────────────────────────────────────────

/** Aire polygone par shoelace (orienté CCW positif). */
export function stArea(poly: Polygon): number {
  if (poly.length < 3) return 0
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
  }
  return Math.abs(a) / 2
}

// ─── ST_Centroid ──────────────────────────────────────────

export function stCentroid(poly: Polygon): Point {
  if (poly.length === 0) return [0, 0]
  let cx = 0, cy = 0, signedArea = 0
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    const cross = x0 * y1 - x1 * y0
    signedArea += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  signedArea /= 2
  if (Math.abs(signedArea) < 1e-10) {
    // Fallback : moyenne des vertices
    const mx = poly.reduce((s, p) => s + p[0], 0) / poly.length
    const my = poly.reduce((s, p) => s + p[1], 0) / poly.length
    return [mx, my]
  }
  return [cx / (6 * signedArea), cy / (6 * signedArea)]
}

// ─── ST_Bounds / Envelope ─────────────────────────────────

export interface Envelope {
  minX: number; minY: number; maxX: number; maxY: number
  width: number; height: number
}

export function stEnvelope(poly: Polygon): Envelope {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

// ─── ST_Contains (point in polygon) ───────────────────────

export function stContains(poly: Polygon, p: Point): boolean {
  const [px, py] = p
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

// ─── ST_Distance (point to point, point to polygon) ───────

export function stDistancePoints(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Distance min d'un point à un segment. */
function pointSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return stDistancePoints(p, a)
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return stDistancePoints(p, [a[0] + t * dx, a[1] + t * dy])
}

/** Distance min point → polygone (0 si à l'intérieur). */
export function stDistancePointPoly(p: Point, poly: Polygon): number {
  if (stContains(poly, p)) return 0
  let minD = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = pointSegmentDistance(p, poly[i], poly[(i + 1) % poly.length])
    if (d < minD) minD = d
  }
  return minD
}

// ─── ST_Intersects (bbox-based quick check) ───────────────

export function stEnvelopeIntersects(a: Envelope, b: Envelope): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
}

/** Segments intersection — algorithme CCW. */
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const ccw = (a: Point, b: Point, c: Point) =>
    (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4)
}

export function stIntersects(a: Polygon, b: Polygon): boolean {
  // Quick bbox rejection
  if (!stEnvelopeIntersects(stEnvelope(a), stEnvelope(b))) return false
  // Full check : any vertex contained OR any edge crossing
  if (stContains(a, b[0]) || stContains(b, a[0])) return true
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i], a2 = a[(i + 1) % a.length]
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j], b2 = b[(j + 1) % b.length]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

// ─── ST_Buffer (approximation dilatation isotropique) ─────

/** Buffer simple : décale chaque vertex vers l'extérieur le long de la bissectrice. */
export function stBuffer(poly: Polygon, distance: number): Polygon {
  if (poly.length < 3 || distance === 0) return [...poly]
  const out: Polygon = []
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length]
    const curr = poly[i]
    const next = poly[(i + 1) % poly.length]
    // Normales unitaires des deux arêtes adjacentes
    const e1x = curr[0] - prev[0], e1y = curr[1] - prev[1]
    const e2x = next[0] - curr[0], e2y = next[1] - curr[1]
    const n1x = -e1y, n1y = e1x
    const n2x = -e2y, n2y = e2x
    const l1 = Math.hypot(n1x, n1y) || 1
    const l2 = Math.hypot(n2x, n2y) || 1
    const bx = n1x / l1 + n2x / l2
    const by = n1y / l1 + n2y / l2
    const bl = Math.hypot(bx, by) || 1
    out.push([curr[0] + (bx / bl) * distance, curr[1] + (by / bl) * distance])
  }
  return out
}

// ─── ST_Within ────────────────────────────────────────────

/** poly1 entièrement dans poly2 (approx : tous les vertices + centroïde). */
export function stWithin(poly1: Polygon, poly2: Polygon): boolean {
  if (!stContains(poly2, stCentroid(poly1))) return false
  for (const p of poly1) {
    if (!stContains(poly2, p)) return false
  }
  return true
}

// ─── Spatial index léger (grid bucket) ────────────────────

export class SpatialIndex<T> {
  private buckets = new Map<string, Array<{ bounds: Envelope; value: T }>>()
  constructor(private cellSize: number) {}

  private _key(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`
  }

  add(bounds: Envelope, value: T): void {
    for (let cx = Math.floor(bounds.minX / this.cellSize); cx <= Math.floor(bounds.maxX / this.cellSize); cx++) {
      for (let cy = Math.floor(bounds.minY / this.cellSize); cy <= Math.floor(bounds.maxY / this.cellSize); cy++) {
        const k = `${cx},${cy}`
        const arr = this.buckets.get(k) ?? []
        arr.push({ bounds, value })
        this.buckets.set(k, arr)
      }
    }
  }

  query(bounds: Envelope): T[] {
    const seen = new Set<T>()
    const out: T[] = []
    for (let cx = Math.floor(bounds.minX / this.cellSize); cx <= Math.floor(bounds.maxX / this.cellSize); cx++) {
      for (let cy = Math.floor(bounds.minY / this.cellSize); cy <= Math.floor(bounds.maxY / this.cellSize); cy++) {
        const arr = this.buckets.get(`${cx},${cy}`)
        if (!arr) continue
        for (const item of arr) {
          if (seen.has(item.value)) continue
          if (stEnvelopeIntersects(item.bounds, bounds)) {
            seen.add(item.value)
            out.push(item.value)
          }
        }
      }
    }
    return out
  }
}
