// ═══ POLYGON OPS — opérations d'édition polygonale ═══
//
// Helpers purs pour l'édition géométrique des espaces :
//   - splitPolygon : coupe un polygone par une ligne (2 points)
//   - mergePolygons : union de polygones adjacents (hull convexe robuste)
//   - insertVertexOnSegment : ajoute un sommet au milieu d'une arête
//   - removeVertex : retire un sommet (garde >= 3)
//   - moveVertex : déplace un sommet
//   - translatePolygon : déplace tous les sommets
//   - polygonArea, polygonPerimeter, polygonCentroid : métriques
//   - pointInPolygon : test d'inclusion (ray casting)
//   - distanceToSegment : distance point → segment (pour snap vertex add)

export type Pt = [number, number]

// ─── Métriques ───────────────────────────────────────

export function polygonArea(poly: Pt[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a) / 2
}

export function polygonPerimeter(poly: Pt[]): number {
  let p = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    p += Math.hypot(a[0] - b[0], a[1] - b[1])
  }
  return p
}

export function polygonCentroid(poly: Pt[]): Pt {
  let cx = 0, cy = 0, a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    const cross = x1 * y2 - x2 * y1
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
    a += cross
  }
  if (Math.abs(a) < 1e-9) {
    // Fallback : centre de masse simple
    const n = poly.length
    return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n]
  }
  a /= 2
  return [cx / (6 * a), cy / (6 * a)]
}

// ─── Tests géométriques ──────────────────────────────

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi)) {
      inside = !inside
    }
  }
  return inside
}

export function distanceToSegment(p: Pt, a: Pt, b: Pt): { dist: number; t: number; proj: Pt } {
  const [px, py] = p
  const [ax, ay] = a
  const [bx, by] = b
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return { dist: Math.hypot(px - ax, py - ay), t: 0, proj: [ax, ay] }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const projX = ax + t * dx
  const projY = ay + t * dy
  return { dist: Math.hypot(px - projX, py - projY), t, proj: [projX, projY] }
}

/** Trouve l'arête la plus proche d'un point (pour insertion de sommet). */
export function nearestEdge(
  poly: Pt[], pt: Pt,
): { index: number; dist: number; t: number; proj: Pt } {
  let best = { index: 0, dist: Infinity, t: 0, proj: [0, 0] as Pt }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const r = distanceToSegment(pt, a, b)
    if (r.dist < best.dist) best = { index: i, ...r }
  }
  return best
}

// ─── Opérations d'édition ────────────────────────────

export function moveVertex(poly: Pt[], vertexIdx: number, to: Pt): Pt[] {
  return poly.map((p, i) => (i === vertexIdx ? to : p))
}

export function translatePolygon(poly: Pt[], dx: number, dy: number): Pt[] {
  return poly.map(([x, y]) => [x + dx, y + dy] as Pt)
}

/** Insère un sommet après l'index `edgeIdx` (donc sur l'arête edgeIdx → edgeIdx+1). */
export function insertVertexOnSegment(poly: Pt[], edgeIdx: number, pt: Pt): Pt[] {
  const next = [...poly]
  next.splice(edgeIdx + 1, 0, pt)
  return next
}

export function removeVertex(poly: Pt[], vertexIdx: number): Pt[] {
  if (poly.length <= 3) return poly  // garde au moins un triangle
  return poly.filter((_, i) => i !== vertexIdx)
}

// ─── Split d'un polygone par une ligne ───────────────
//
// Algorithme : on parcourt les arêtes du polygone. Pour chacune, on teste
// l'intersection avec la ligne de coupe. On construit 2 sous-polygones en
// basculant à chaque intersection entre "côté A" et "côté B".
// Limites : assume que la ligne traverse le polygone en exactement 2 points.
// Si plus d'intersections, on prend les 2 premières.

function lineIntersect(
  a1: Pt, a2: Pt, b1: Pt, b2: Pt,
): { pt: Pt; t: number; u: number } | null {
  const x1 = a1[0], y1 = a1[1], x2 = a2[0], y2 = a2[1]
  const x3 = b1[0], y3 = b1[1], x4 = b2[0], y4 = b2[1]
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return null
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  return {
    pt: [x1 + t * (x2 - x1), y1 + t * (y2 - y1)],
    t, u,
  }
}

/** Découpe un polygone par une ligne (infinie), retourne [polygoneGauche, polygoneDroite] ou null si la ligne ne traverse pas. */
export function splitPolygonByLine(poly: Pt[], lineA: Pt, lineB: Pt): [Pt[], Pt[]] | null {
  if (poly.length < 3) return null

  interface Event {
    index: number     // arête où l'intersection a lieu
    pt: Pt
    t: number         // position sur l'arête (0..1)
  }
  const intersections: Event[] = []

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const r = lineIntersect(a, b, lineA, lineB)
    if (r && r.t >= -1e-6 && r.t <= 1 + 1e-6) {
      // t dans [0,1] → le segment du polygone est effectivement coupé
      intersections.push({ index: i, pt: r.pt, t: Math.max(0, Math.min(1, r.t)) })
    }
  }
  if (intersections.length < 2) return null

  // Prendre les 2 intersections les plus éloignées (cas polygone convexe standard)
  let maxDist = 0
  let pair: [Event, Event] = [intersections[0], intersections[1]]
  for (let i = 0; i < intersections.length; i++) {
    for (let j = i + 1; j < intersections.length; j++) {
      const d = Math.hypot(
        intersections[i].pt[0] - intersections[j].pt[0],
        intersections[i].pt[1] - intersections[j].pt[1],
      )
      if (d > maxDist) { maxDist = d; pair = [intersections[i], intersections[j]] }
    }
  }
  let [e1, e2] = pair
  if (e1.index > e2.index) [e1, e2] = [e2, e1]

  // Côté A : sommets de [e1.index+1 .. e2.index] + point e2 + point e1
  // Côté B : sommets de [e2.index+1 .. e1.index] (wrap) + point e1 + point e2
  const sideA: Pt[] = [e1.pt]
  for (let i = e1.index + 1; i <= e2.index; i++) {
    sideA.push(poly[i])
  }
  sideA.push(e2.pt)

  const sideB: Pt[] = [e2.pt]
  for (let i = e2.index + 1; i < poly.length + e1.index + 1; i++) {
    sideB.push(poly[i % poly.length])
  }
  sideB.push(e1.pt)

  // Nettoyage doublons
  const clean = (p: Pt[]): Pt[] => {
    const out: Pt[] = []
    for (const pt of p) {
      const last = out[out.length - 1]
      if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 1e-6) {
        out.push(pt)
      }
    }
    return out
  }

  const sa = clean(sideA)
  const sb = clean(sideB)
  if (sa.length < 3 || sb.length < 3) return null
  return [sa, sb]
}

// ─── Merge (union simple) ────────────────────────────
//
// Approche pragmatique : enveloppe convexe des points combinés.
// Fidèle quand les polygones sont adjacents/intersectés. Pour une union
// topologique exacte avec polygones non-convexes, il faudrait une lib
// comme martinez-polygon-clipping. Ici on reste en dépendance zéro.

export function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points.slice()
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }
  upper.pop(); lower.pop()
  return lower.concat(upper)
}

/** Merge approximatif : hull convexe des sommets. Exact si polygones convexes adjacents. */
export function mergePolygonsConvexHull(polys: Pt[][]): Pt[] {
  const all = polys.flat()
  return convexHull(all)
}

// ─── Utilitaires ─────────────────────────────────────

export function polygonBounds(poly: Pt[]): {
  minX: number; minY: number; maxX: number; maxY: number
  width: number; height: number
} {
  const xs = poly.map(p => p[0])
  const ys = poly.map(p => p[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
