// ═══ GEOMETRY CONSTRAINTS ═══
//
// Contraintes appliquées PENDANT le tracé/édition d'un polygone.
// Objectif : produire des géométries propres (orthogonales, alignées, sans
// micro-décalages) pour remplacer la saisie libre qui a généré les plans
// bancals constatés en rc.1.
//
// Convention d'unités DU MODULE : MILLIMÈTRES ENTIERS.
// Un entier int32 couvre ±2 147 km largement suffisant.
//
// ⚠️  Le reste de l'app (EditableSpace, SpaceEditorCanvas, planReader…)
// travaille toujours en MÈTRES FLOAT. Les appelants du module geometry
// doivent convertir aux frontières :
//    mmPoint = [Math.round(xMeters * 1000), Math.round(yMeters * 1000)]
// Cette règle évite une migration invasive (EditableSpace persistés en
// float m dans Dexie sous la clé `cosmos-angre-lots-v1`).
// La conversion mm entiers → base Supabase se fait dans l'adapter Step 6.

export type PointMm = readonly [number, number]
export type PolygonMm = readonly PointMm[]

// ─── Snap to grid ─────────────────────────────────────────

/**
 * Aligne un point sur la grille la plus proche.
 * @param gridMm  pas de grille (ex. 100 = 10 cm, 500 = 50 cm)
 */
export function snapToGrid(p: PointMm, gridMm: number): PointMm {
  if (gridMm <= 0) return [Math.round(p[0]), Math.round(p[1])]
  const g = gridMm
  return [Math.round(p[0] / g) * g, Math.round(p[1] / g) * g]
}

// ─── Contrainte orthogonale ───────────────────────────────

/**
 * Force le segment (prev → current) à être horizontal ou vertical : on
 * conserve l'axe dominant (le plus grand delta) et on zéro-l'autre.
 * Utilisé quand la touche Shift est maintenue, ou quand le mode
 * orthogonal est activé par défaut.
 */
export function enforceOrthogonal(prev: PointMm, current: PointMm): PointMm {
  const dx = current[0] - prev[0]
  const dy = current[1] - prev[1]
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [current[0], prev[1]] // horizontal
  }
  return [prev[0], current[1]] // vertical
}

// ─── Snap sur voisins ─────────────────────────────────────

export interface NeighborSnapHit {
  readonly snapped: PointMm
  readonly sourcePolygonIndex: number
  readonly sourceVertexIndex: number
  readonly distanceMm: number
  readonly kind: 'vertex' | 'edge'
}

/**
 * Cherche dans les polygones voisins un sommet (priorité) ou un point
 * sur une arête à moins de `tolMm` du point courant. Retourne le plus
 * proche, ou `null`. Le snap sur sommet est prioritaire à distance
 * égale : préserve la co-incidence des coins (évite les T-joints).
 */
export function findNeighborSnap(
  p: PointMm,
  neighbors: readonly PolygonMm[],
  tolMm: number,
): NeighborSnapHit | null {
  let best: NeighborSnapHit | null = null

  // Passe 1 — sommets
  for (let pi = 0; pi < neighbors.length; pi++) {
    const poly = neighbors[pi]
    for (let vi = 0; vi < poly.length; vi++) {
      const v = poly[vi]
      const d = Math.hypot(p[0] - v[0], p[1] - v[1])
      if (d <= tolMm && (!best || d < best.distanceMm)) {
        best = {
          snapped: [v[0], v[1]],
          sourcePolygonIndex: pi,
          sourceVertexIndex: vi,
          distanceMm: d,
          kind: 'vertex',
        }
      }
    }
  }
  if (best) return best

  // Passe 2 — arêtes (seulement si aucun sommet trouvé)
  for (let pi = 0; pi < neighbors.length; pi++) {
    const poly = neighbors[pi]
    for (let vi = 0; vi < poly.length; vi++) {
      const a = poly[vi]
      const b = poly[(vi + 1) % poly.length]
      const proj = projectOnSegment(p, a, b)
      const d = Math.hypot(p[0] - proj[0], p[1] - proj[1])
      if (d <= tolMm && (!best || d < best.distanceMm)) {
        best = {
          snapped: proj,
          sourcePolygonIndex: pi,
          sourceVertexIndex: vi,
          distanceMm: d,
          kind: 'edge',
        }
      }
    }
  }
  return best
}

/** Projette p sur le segment [a, b]. Retourne des coords entières (mm). */
function projectOnSegment(p: PointMm, a: PointMm, b: PointMm): PointMm {
  const ax = a[0], ay = a[1]
  const bx = b[0], by = b[1]
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return [ax, ay]
  let t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2
  if (t < 0) t = 0
  else if (t > 1) t = 1
  return [Math.round(ax + t * dx), Math.round(ay + t * dy)]
}

// ─── Pipeline combiné ─────────────────────────────────────

export interface ConstraintOptions {
  readonly gridMm?: number
  readonly orthogonalPrev?: PointMm
  readonly neighbors?: readonly PolygonMm[]
  readonly neighborTolMm?: number
}

export interface ConstraintResult {
  readonly point: PointMm
  readonly appliedSnap: 'none' | 'grid' | 'ortho' | 'neighbor-vertex' | 'neighbor-edge'
}

/**
 * Applique, dans l'ordre, les contraintes activées :
 *   1. Snap voisin (si tolérance fournie) — PRIORITAIRE pour coller les coins
 *   2. Ortho (si prev fourni)
 *   3. Grille (si pas > 0)
 *
 * Le snap voisin gagne : s'il tombe, on ne ré-applique pas la grille
 * par-dessus (sinon on casse l'alignement avec le voisin).
 */
export function applyConstraints(
  raw: PointMm,
  opts: ConstraintOptions,
): ConstraintResult {
  // 1. Snap voisin
  if (opts.neighbors && opts.neighbors.length > 0 && opts.neighborTolMm && opts.neighborTolMm > 0) {
    const hit = findNeighborSnap(raw, opts.neighbors, opts.neighborTolMm)
    if (hit) {
      return {
        point: hit.snapped,
        appliedSnap: hit.kind === 'vertex' ? 'neighbor-vertex' : 'neighbor-edge',
      }
    }
  }

  // 2. Ortho
  let p: PointMm = [Math.round(raw[0]), Math.round(raw[1])]
  let applied: ConstraintResult['appliedSnap'] = 'none'
  if (opts.orthogonalPrev) {
    p = enforceOrthogonal(opts.orthogonalPrev, p)
    applied = 'ortho'
  }

  // 3. Grille
  if (opts.gridMm && opts.gridMm > 0) {
    p = snapToGrid(p, opts.gridMm)
    applied = applied === 'none' ? 'grid' : applied
  }

  return { point: p, appliedSnap: applied }
}
