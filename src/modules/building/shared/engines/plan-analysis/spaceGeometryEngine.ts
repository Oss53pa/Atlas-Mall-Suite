// ═══ SPACE GEOMETRY ENGINE ═══
//
// Opérations géométriques 2D pour l'éditeur d'espaces Vol.3 :
//   - union de polygones (fusion)
//   - split polygone par ligne (découpe)
//   - insertion / suppression / déplacement de vertex
//   - smoothing Catmull-Rom (curve mode)
//   - snap to grid + snap 45°/90°
//   - duplication
//
// Pur (pas de React, pas de DOM). Algos :
//   - Union : rasterisation bitmap + morphologique + marching squares vectorisation
//     (robuste, plus simple qu'un vrai SLSN pour polygones éditeur).
//   - Split : détection de 2 intersections segment/polygon → scission topologique.

// ─── Types ─────────────────────────────────────────

export type Point = { x: number; y: number }
export type Polygon = Point[]

// ─── Helpers primitifs ────────────────────────────

export function pointInPolygon(px: number, py: number, poly: Polygon): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

export function bbox(poly: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

export function polyArea(poly: Polygon): number {
  let a = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y)
  }
  return Math.abs(a / 2)
}

/** Distance signée d'un point à un segment. */
export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  const qx = a.x + t * dx, qy = a.y + t * dy
  return Math.hypot(p.x - qx, p.y - qy)
}

/** Projection d'un point sur un segment (retourne le point projeté + t ∈ [0,1]). */
export function projectPointOnSegment(p: Point, a: Point, b: Point): { point: Point; t: number } {
  const dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return { point: a, t: 0 }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return { point: { x: a.x + t * dx, y: a.y + t * dy }, t }
}

/** Intersection segment-segment. */
export function segmentIntersect(
  a1: Point, a2: Point, b1: Point, b2: Point,
): Point | null {
  const d = (a2.x - a1.x) * (b2.y - b1.y) - (a2.y - a1.y) * (b2.x - b1.x)
  if (Math.abs(d) < 1e-9) return null
  const t = ((b1.x - a1.x) * (b2.y - b1.y) - (b1.y - a1.y) * (b2.x - b1.x)) / d
  const u = ((b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x)) / d
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: a1.x + t * (a2.x - a1.x), y: a1.y + t * (a2.y - a1.y) }
}

// ─── Opérations vertex ─────────────────────────────

export function insertVertex(poly: Polygon, edgeIdx: number, point: Point): Polygon {
  const out = poly.slice()
  out.splice(edgeIdx + 1, 0, { ...point })
  return out
}

export function removeVertex(poly: Polygon, vertexIdx: number): Polygon {
  if (poly.length <= 3) return poly // garde au minimum 3 vertex
  return poly.filter((_, i) => i !== vertexIdx)
}

export function moveVertex(poly: Polygon, vertexIdx: number, newPos: Point): Polygon {
  return poly.map((p, i) => (i === vertexIdx ? { ...newPos } : p))
}

// ─── Trouvailles hit-test ──────────────────────────

export function findClosestVertex(poly: Polygon, p: Point, tolPx: number): number | null {
  let bestIdx = -1, bestD = Infinity
  for (let i = 0; i < poly.length; i++) {
    const d = Math.hypot(poly[i].x - p.x, poly[i].y - p.y)
    if (d < tolPx && d < bestD) { bestD = d; bestIdx = i }
  }
  return bestIdx >= 0 ? bestIdx : null
}

export function findClosestEdge(poly: Polygon, p: Point, tolPx: number): { edgeIdx: number; point: Point; t: number } | null {
  let bestIdx = -1, bestD = Infinity, bestPoint: Point | null = null, bestT = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const proj = projectPointOnSegment(p, a, b)
    const d = Math.hypot(p.x - proj.point.x, p.y - proj.point.y)
    if (d < tolPx && d < bestD) { bestD = d; bestIdx = i; bestPoint = proj.point; bestT = proj.t }
  }
  return bestIdx >= 0 && bestPoint ? { edgeIdx: bestIdx, point: bestPoint, t: bestT } : null
}

// ─── Snap grid + angles ───────────────────────────

export function snapToGrid(p: Point, gridStep: number): Point {
  return {
    x: Math.round(p.x / gridStep) * gridStep,
    y: Math.round(p.y / gridStep) * gridStep,
  }
}

/** Snap angle à multiples de 45° par rapport au point de départ. */
export function snapAngle(from: Point, to: Point, stepDeg = 45): Point {
  const dx = to.x - from.x, dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return to
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  const snapped = Math.round(angle / stepDeg) * stepDeg
  const rad = snapped * Math.PI / 180
  return { x: from.x + Math.cos(rad) * len, y: from.y + Math.sin(rad) * len }
}

// ─── Smoothing Catmull-Rom ───────────────────────

/** Produit une polyligne lissée à partir de points de contrôle (CR open). */
export function catmullRomSmooth(control: Point[], samplesPerSeg = 8, tension = 0.5): Point[] {
  if (control.length < 3) return control
  const out: Point[] = []
  const n = control.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = control[i - 1] ?? control[i]
    const p1 = control[i]
    const p2 = control[i + 1]
    const p3 = control[i + 2] ?? p2
    for (let j = 0; j < samplesPerSeg; j++) {
      const t = j / samplesPerSeg
      const t2 = t * t
      const t3 = t2 * t
      const c1 = -tension * t3 + 2 * tension * t2 - tension * t
      const c2 = (2 - tension) * t3 + (tension - 3) * t2 + 1
      const c3 = (tension - 2) * t3 + (3 - 2 * tension) * t2 + tension * t
      const c4 = tension * t3 - tension * t2
      out.push({
        x: c1 * p0.x + c2 * p1.x + c3 * p2.x + c4 * p3.x,
        y: c1 * p0.y + c2 * p1.y + c3 * p2.y + c4 * p3.y,
      })
    }
  }
  out.push(control[n - 1])
  return out
}

// ─── Wall tracé → polygone épais ──────────────────

/** Transforme un segment (a, b) en polygone rectangulaire d'épaisseur `thickness`. */
export function wallSegmentToPoly(a: Point, b: Point, thicknessM: number): Polygon {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 0.001) return [a, a, a, a]
  const nx = -dy / len, ny = dx / len
  const h = thicknessM / 2
  return [
    { x: a.x + nx * h, y: a.y + ny * h },
    { x: b.x + nx * h, y: b.y + ny * h },
    { x: b.x - nx * h, y: b.y - ny * h },
    { x: a.x - nx * h, y: a.y - ny * h },
  ]
}

// ─── Split polygone par ligne ─────────────────────

/**
 * Découpe un polygone par une ligne (segment). Si la ligne traverse exactement
 * 2 arêtes du polygone, renvoie les 2 polygones résultants. Sinon renvoie null.
 */
export function splitPolygonByLine(poly: Polygon, lineA: Point, lineB: Point): [Polygon, Polygon] | null {
  if (poly.length < 3) return null

  // 1. Trouver les 2 intersections avec les arêtes
  type Hit = { edgeIdx: number; point: Point; t: number }
  const hits: Hit[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const hit = segmentIntersect(lineA, lineB, a, b)
    if (hit) {
      const dx = b.x - a.x, dy = b.y - a.y
      const l2 = dx * dx + dy * dy
      const t = l2 ? ((hit.x - a.x) * dx + (hit.y - a.y) * dy) / l2 : 0
      hits.push({ edgeIdx: i, point: hit, t })
    }
  }
  if (hits.length !== 2) return null

  const [h1, h2] = hits[0].edgeIdx < hits[1].edgeIdx ? [hits[0], hits[1]] : [hits[1], hits[0]]

  // 2. Construction des 2 polygones : parcourir les vertex entre h1 et h2
  const leftPoly: Polygon = []
  const rightPoly: Polygon = []

  // Polygone gauche : h1.point → vertex[h1.edgeIdx+1..h2.edgeIdx] → h2.point
  leftPoly.push(h1.point)
  for (let i = h1.edgeIdx + 1; i <= h2.edgeIdx; i++) {
    leftPoly.push(poly[i])
  }
  leftPoly.push(h2.point)

  // Polygone droit : h2.point → vertex[h2.edgeIdx+1..N] → vertex[0..h1.edgeIdx] → h1.point
  rightPoly.push(h2.point)
  const n = poly.length
  for (let i = h2.edgeIdx + 1; i !== h1.edgeIdx + 1; i = (i + 1) % n) {
    rightPoly.push(poly[i])
    if (i === n - 1 && h1.edgeIdx < h2.edgeIdx) continue
  }
  rightPoly.push(h1.point)

  // Filtre doublons consécutifs
  return [dedupPoly(leftPoly), dedupPoly(rightPoly)]
}

function dedupPoly(poly: Polygon, eps = 1e-4): Polygon {
  const out: Polygon = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const last = out[out.length - 1]
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > eps) out.push(p)
  }
  return out
}

// ─── Union de polygones via bitmap ────────────────

/**
 * Union géométrique de plusieurs polygones via rasterisation.
 * Produit un polygone approchant (plus le pas est fin, plus l'union est
 * précise). Adapté à l'éditeur d'espaces où on fusionne des formes que
 * l'utilisateur vient de dessiner.
 */
export function unionPolygons(polys: Polygon[], pixelsPerMeter = 10): Polygon[] {
  if (polys.length === 0) return []
  if (polys.length === 1) return [polys[0].slice()]

  // 1. BBox commune
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of polys) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
    }
  }
  const cellSize = 1 / pixelsPerMeter
  const pad = cellSize * 3
  const originX = minX - pad
  const originY = minY - pad
  const w = Math.ceil((maxX - minX + pad * 2) / cellSize)
  const h = Math.ceil((maxY - minY + pad * 2) / cellSize)

  // 2. Rasterisation (OR)
  const data = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) {
    const y = originY + (j + 0.5) * cellSize
    for (let i = 0; i < w; i++) {
      const x = originX + (i + 0.5) * cellSize
      for (const poly of polys) {
        if (pointInPolygonArray(x, y, poly)) { data[j * w + i] = 1; break }
      }
    }
  }

  // 3. Vectorisation via marching-squares simple
  return marchingSquaresContours(data, w, h, cellSize, originX, originY)
}

function pointInPolygonArray(px: number, py: number, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y
    const xj = poly[j].x, yj = poly[j].y
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

/** Extrait les contours (polygones fermés) d'un bitmap via flood-fill + border tracing. */
function marchingSquaresContours(
  data: Uint8Array, w: number, h: number,
  cellSize: number, originX: number, originY: number,
): Polygon[] {
  const visited = new Uint8Array(data.length)
  const contours: Polygon[] = []

  const pixToWorld = (i: number, j: number): Point => ({
    x: originX + (i + 0.5) * cellSize,
    y: originY + (j + 0.5) * cellSize,
  })

  const getPx = (i: number, j: number): number =>
    (i < 0 || j < 0 || i >= w || j >= h) ? 0 : data[j * w + i]

  // Chaque composante connexe → un contour
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      if (!data[k] || visited[k]) continue

      // BFS pour marquer la composante connexe comme visitée
      const stack = [[i, j]]
      const compCells: Array<[number, number]> = []
      while (stack.length) {
        const [ci, cj] = stack.pop()!
        const kk = cj * w + ci
        if (visited[kk] || !data[kk]) continue
        visited[kk] = 1
        compCells.push([ci, cj])
        for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const ni = ci + di, nj = cj + dj
          if (ni < 0 || ni >= w || nj < 0 || nj >= h) continue
          if (data[nj * w + ni] && !visited[nj * w + ni]) stack.push([ni, nj])
        }
      }

      // Trouver un pixel de bord (voisin 4-conn = 0)
      let start: [number, number] | null = null
      for (const [ci, cj] of compCells) {
        const neigh = getPx(ci - 1, cj) + getPx(ci + 1, cj) + getPx(ci, cj - 1) + getPx(ci, cj + 1)
        if (neigh < 4) { start = [ci, cj]; break }
      }
      if (!start) continue

      // Traçage du bord par Moore neighborhood
      const contour: Polygon = []
      const dirs: Array<[number, number]> = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]
      let cur: [number, number] = start
      let lastDir = 0
      const startK = cur[1] * w + cur[0]
      let steps = 0
      const maxSteps = compCells.length * 8 + 10

      do {
        contour.push(pixToWorld(cur[0], cur[1]))
        let found = false
        for (let t = 0; t < 8; t++) {
          const d = dirs[(lastDir + 6 + t) % 8]
          const ni = cur[0] + d[0], nj = cur[1] + d[1]
          if (getPx(ni, nj)) {
            cur = [ni, nj]
            lastDir = (lastDir + 6 + t) % 8
            found = true
            break
          }
        }
        if (!found) break
        steps++
      } while ((cur[1] * w + cur[0]) !== startK && steps < maxSteps)

      if (contour.length >= 3) {
        contours.push(simplifyContour(contour, cellSize * 0.8))
      }
    }
  }
  return contours
}

/** Simplification Douglas-Peucker basique. */
function simplifyContour(poly: Polygon, tol: number): Polygon {
  if (poly.length <= 3) return poly
  const keep = new Array(poly.length).fill(false)
  keep[0] = true
  keep[poly.length - 1] = true

  const stack: Array<[number, number]> = [[0, poly.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    let maxD = 0, maxI = -1
    for (let i = s + 1; i < e; i++) {
      const d = distancePointToSegment(poly[i], poly[s], poly[e])
      if (d > maxD) { maxD = d; maxI = i }
    }
    if (maxI >= 0 && maxD > tol) {
      keep[maxI] = true
      stack.push([s, maxI])
      stack.push([maxI, e])
    }
  }
  return poly.filter((_, i) => keep[i])
}

// ─── Duplication ────────────────────────────────

export function duplicatePolygon(poly: Polygon, offsetX = 2, offsetY = 2): Polygon {
  return poly.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }))
}

/** Centroïde simple (moyenne des sommets). */
export function polyCentroid(poly: Polygon): Point {
  if (poly.length === 0) return { x: 0, y: 0 }
  const sum = poly.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / poly.length, y: sum.y / poly.length }
}

/** Rotation d'un polygone autour d'un pivot (centroïde par défaut).
 *  `angleDeg` en degrés (positif = sens horaire écran, car Y inversé). */
export function rotatePolygon(poly: Polygon, angleDeg: number, pivot?: Point): Polygon {
  const p = pivot ?? polyCentroid(poly)
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad), sin = Math.sin(rad)
  return poly.map(v => {
    const dx = v.x - p.x
    const dy = v.y - p.y
    return {
      x: p.x + dx * cos - dy * sin,
      y: p.y + dx * sin + dy * cos,
    }
  })
}

/** Mirroir horizontal (flip X) autour du centroïde. Utile pour inverser
 *  la direction d'ouverture d'une porte (gauche ↔ droite). */
export function flipPolygonH(poly: Polygon, pivot?: Point): Polygon {
  const p = pivot ?? polyCentroid(poly)
  return poly.map(v => ({ x: 2 * p.x - v.x, y: v.y }))
}

/** Mirroir vertical (flip Y) autour du centroïde. */
export function flipPolygonV(poly: Polygon, pivot?: Point): Polygon {
  const p = pivot ?? polyCentroid(poly)
  return poly.map(v => ({ x: v.x, y: 2 * p.y - v.y }))
}

/** Mesure la taille d'un polygone rectangulaire le long de son axe
 *  principal (côté long) et perpendiculaire (côté court).
 *  Utile pour les portes et objets axis-aligned même après rotation. */
export function rectDimensions(poly: Polygon): { long: number; short: number; angleRad: number } {
  if (poly.length < 2) return { long: 0, short: 0, angleRad: 0 }
  // Trouver le côté le plus long — définit l'axe principal
  let maxLen = 0, bestI = 0
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    const d = Math.hypot(poly[j].x - poly[i].x, poly[j].y - poly[i].y)
    if (d > maxLen) { maxLen = d; bestI = i }
  }
  const p1 = poly[bestI], p2 = poly[(bestI + 1) % poly.length]
  const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  // Calcul du côté perpendiculaire (le plus court adjacent)
  const prev = poly[(bestI - 1 + poly.length) % poly.length]
  const shortSide = Math.hypot(p1.x - prev.x, p1.y - prev.y)
  return { long: maxLen, short: shortSide, angleRad }
}

/** Vérifie si un polygone est "proche d'un rectangle" : 4 sommets avec
 *  angles intérieurs tous ≈ 90° (tolérance 10°). Utile pour afficher
 *  des poignées d'arêtes au lieu de poignées de sommets. */
export function isRectangular(poly: Polygon, tolDeg = 10): boolean {
  if (poly.length !== 4) return false
  const tol = (tolDeg * Math.PI) / 180
  for (let i = 0; i < 4; i++) {
    const prev = poly[(i + 3) % 4]
    const curr = poly[i]
    const next = poly[(i + 1) % 4]
    const v1x = prev.x - curr.x, v1y = prev.y - curr.y
    const v2x = next.x - curr.x, v2y = next.y - curr.y
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y)
    if (l1 === 0 || l2 === 0) return false
    const dot = (v1x * v2x + v1y * v2y) / (l1 * l2)
    const ang = Math.acos(Math.max(-1, Math.min(1, dot)))
    if (Math.abs(ang - Math.PI / 2) > tol) return false
  }
  return true
}

/** Déplace l'arête `edgeIdx` (entre poly[edgeIdx] et poly[edgeIdx+1]) le
 *  long de sa normale intérieure/extérieure d'une distance `distM`. Les
 *  2 sommets de l'arête opposée restent fixes → rectangle redimensionné
 *  sur un seul côté, orientation conservée.
 *  Suppose un rectangle (4 sommets, arêtes opposées parallèles). */
export function moveRectEdge(poly: Polygon, edgeIdx: number, newPos: Point): Polygon {
  if (poly.length !== 4) return poly
  const i1 = edgeIdx % 4
  const i2 = (edgeIdx + 1) % 4
  // Sommets opposés (arête fixe) = i3 et i4
  const i3 = (edgeIdx + 2) % 4  // opposé de i2
  const i4 = (edgeIdx + 3) % 4  // opposé de i1
  const a = poly[i1], b = poly[i2]
  const oppA = poly[i4], oppB = poly[i3]
  // Direction de l'arête mobile
  const ex = b.x - a.x, ey = b.y - a.y
  const L = Math.hypot(ex, ey)
  if (L === 0) return poly
  const ux = ex / L, uy = ey / L
  // Normale (perpendiculaire)
  const nx = -uy, ny = ux
  // Centre de l'arête mobile
  const midAx = (a.x + b.x) / 2, midAy = (a.y + b.y) / 2
  // Distance signée du new pos le long de la normale (depuis le milieu actuel)
  const dNormal = (newPos.x - midAx) * nx + (newPos.y - midAy) * ny
  // Déplace les 2 sommets de l'arête mobile le long de la normale ;
  // l'arête opposée reste inchangée.
  const out: Polygon = poly.slice()
  out[i1] = { x: a.x + nx * dNormal, y: a.y + ny * dNormal }
  out[i2] = { x: b.x + nx * dNormal, y: b.y + ny * dNormal }
  out[i3] = { ...oppB }
  out[i4] = { ...oppA }
  // Garde-fou : ne pas retourner le rectangle si on dépasse l'arête opposée
  const newWidth = Math.hypot(
    ((out[i1].x + out[i2].x) / 2) - ((oppA.x + oppB.x) / 2),
    ((out[i1].y + out[i2].y) / 2) - ((oppA.y + oppB.y) / 2),
  )
  if (newWidth < 0.02) return poly // < 2 cm → ignore
  return out
}

/** Redimensionne un polygone rectangulaire tout en conservant son
 *  centroïde et son orientation. `newLong` = nouveau grand côté (passage
 *  utile pour une porte), `newShort` = nouveau petit côté (épaisseur).
 *  Si le polygone n'a pas 4 sommets, on fait un fallback bounding box. */
export function resizeRectPolygon(poly: Polygon, newLong: number, newShort: number): Polygon {
  const center = polyCentroid(poly)
  const dims = rectDimensions(poly)
  const cos = Math.cos(dims.angleRad), sin = Math.sin(dims.angleRad)
  const hl = newLong / 2, hs = newShort / 2
  // 4 coins en coord locales (u,v) puis rotation vers monde
  const corners: Array<[number, number]> = [
    [-hl, -hs], [ hl, -hs], [ hl,  hs], [-hl,  hs],
  ]
  return corners.map(([u, v]) => ({
    x: center.x + u * cos - v * sin,
    y: center.y + u * sin + v * cos,
  }))
}

// ─── Normalisation (orientation + dédoublonnage) ──

export function normalizePolygon(poly: Polygon): Polygon {
  const dedup = dedupPoly(poly)
  if (dedup.length < 3) return dedup
  // Assurer orientation CCW
  let signed = 0
  for (let i = 0, j = dedup.length - 1; i < dedup.length; j = i++) {
    signed += (dedup[i].x - dedup[j].x) * (dedup[i].y + dedup[j].y)
  }
  return signed > 0 ? dedup.slice().reverse() : dedup
}
