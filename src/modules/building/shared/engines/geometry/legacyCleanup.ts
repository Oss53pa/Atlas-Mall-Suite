// ═══ LEGACY POLYGON CLEANUP ═══
//
// Redresse les polygones existants (`EditableSpace.polygon`) saisis en
// rc.0 sans contraintes : angles 89.3°, micro-arêtes < 2 cm, coins qui ne
// se touchent pas, etc.
//
// Pipeline (en mm entiers) :
//   1. snap grille (défaut 100 mm — 10 cm : préserve l'essentiel de la forme)
//   2. dédoublonnage des sommets consécutifs identiques
//   3. élimination des arêtes dégénérées (< MIN_EDGE_MM)
//   4. redressement orthogonal AGRESSIF : si 2 sommets sont quasi-alignés
//      (|dx| ≤ ORTHO_ALIGN_MM ou |dy| ≤ ORTHO_ALIGN_MM), on force l'égalité
//      sur l'axe le plus proche.
//
// Le processus est IDEMPOTENT : un polygone déjà propre n'est pas modifié.
// Il est aussi CONSERVATEUR sur l'aire : aucun sommet n'est déplacé de
// plus de `maxDriftMm` (défaut 250 mm = 25 cm).
//
// Usage typique :
//   const { cleaned, changed, beforeScore, afterScore } = cleanupPolygon(poly)
//   if (changed && afterScore > beforeScore - 0.05) apply(cleaned)

import type { PolygonMm } from './constraints'
import { snapToGrid } from './constraints'
import { scorePolygonQuality } from './qualityScore'
import { hasSelfIntersection } from './overlapDetection'

export interface CleanupOptions {
  /** Pas de grille en mm (défaut 100 = 10 cm). */
  readonly gridMm?: number
  /** Longueur minimale d'arête en mm (défaut 20 = 2 cm). */
  readonly minEdgeMm?: number
  /** Tolérance d'alignement orthogonal en mm (défaut 50 = 5 cm). */
  readonly orthoAlignMm?: number
  /** Déplacement max autorisé par sommet en mm (défaut 250 = 25 cm). */
  readonly maxDriftMm?: number
}

export interface CleanupResult {
  readonly cleaned: PolygonMm
  readonly changed: boolean
  readonly beforeScore: number
  readonly afterScore: number
  /** Raison du refus si `changed=false` malgré des modifs candidates. */
  readonly rejectedReason?: 'self-intersection' | 'quality-drop' | 'too-few-vertices'
  readonly verticesRemoved: number
  readonly maxDriftAppliedMm: number
}

const DEFAULTS: Required<CleanupOptions> = {
  gridMm: 100,
  minEdgeMm: 20,
  orthoAlignMm: 50,
  maxDriftMm: 250,
}

export function cleanupPolygon(
  input: PolygonMm,
  opts: CleanupOptions = {},
): CleanupResult {
  const o = { ...DEFAULTS, ...opts }
  const beforeScore = scorePolygonQuality(input).score

  if (input.length < 3) {
    return {
      cleaned: input,
      changed: false,
      beforeScore,
      afterScore: beforeScore,
      rejectedReason: 'too-few-vertices',
      verticesRemoved: 0,
      maxDriftAppliedMm: 0,
    }
  }

  // 1. Snap grille
  let work: PolygonMm = input.map(p => snapToGrid(p, o.gridMm))

  // 2. Dédoublonnage des sommets consécutifs
  work = dedupeConsecutive(work)

  // 3. Elimination des arêtes dégénérées
  work = removeShortEdges(work, o.minEdgeMm)

  // 4. Redressement orthogonal (propagation sur plusieurs passes pour
  //    stabiliser — 3 passes suffisent en pratique pour un polygone < 100
  //    sommets).
  for (let pass = 0; pass < 3; pass++) {
    work = alignOrthogonal(work, o.orthoAlignMm)
  }

  // Contraintes de sortie
  if (work.length < 3) {
    return {
      cleaned: input,
      changed: false,
      beforeScore,
      afterScore: beforeScore,
      rejectedReason: 'too-few-vertices',
      verticesRemoved: input.length,
      maxDriftAppliedMm: 0,
    }
  }
  if (hasSelfIntersection(work)) {
    return {
      cleaned: input,
      changed: false,
      beforeScore,
      afterScore: beforeScore,
      rejectedReason: 'self-intersection',
      verticesRemoved: 0,
      maxDriftAppliedMm: 0,
    }
  }

  // Calcul du drift max (par sommet, sur les sommets conservés dans l'ordre)
  const maxDrift = computeMaxDrift(input, work)
  if (maxDrift > o.maxDriftMm) {
    // Drift trop important → on garde l'original (évite de déformer un
    // polygone complexe qu'on n'aurait pas dû toucher)
    return {
      cleaned: input,
      changed: false,
      beforeScore,
      afterScore: beforeScore,
      rejectedReason: 'quality-drop',
      verticesRemoved: 0,
      maxDriftAppliedMm: maxDrift,
    }
  }

  const afterScore = scorePolygonQuality(work).score

  // Dernier filet : si la qualité chute franchement on refuse
  if (afterScore < beforeScore - 0.05) {
    return {
      cleaned: input,
      changed: false,
      beforeScore,
      afterScore,
      rejectedReason: 'quality-drop',
      verticesRemoved: 0,
      maxDriftAppliedMm: maxDrift,
    }
  }

  const changed = afterScore > beforeScore + 1e-6 || work.length !== input.length
  return {
    cleaned: changed ? work : input,
    changed,
    beforeScore,
    afterScore,
    verticesRemoved: input.length - work.length,
    maxDriftAppliedMm: maxDrift,
  }
}

// ─── Passes individuelles ─────────────────────────────────

function dedupeConsecutive(poly: PolygonMm): PolygonMm {
  const out: [number, number][] = []
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i]
    const prev = out[out.length - 1]
    if (!prev || prev[0] !== curr[0] || prev[1] !== curr[1]) {
      out.push([curr[0], curr[1]])
    }
  }
  // Retirer la clôture si premier = dernier
  if (out.length > 1) {
    const f = out[0]
    const l = out[out.length - 1]
    if (f[0] === l[0] && f[1] === l[1]) out.pop()
  }
  return out
}

function removeShortEdges(poly: PolygonMm, minEdgeMm: number): PolygonMm {
  if (poly.length < 4) return poly
  const out: [number, number][] = poly.map(p => [p[0], p[1]])
  let changed = true
  let guard = 0
  while (changed && out.length >= 4 && guard++ < 50) {
    changed = false
    for (let i = 0; i < out.length; i++) {
      const a = out[i]
      const b = out[(i + 1) % out.length]
      const len = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (len < minEdgeMm) {
        // Fusionne b dans a (milieu)
        const midX = Math.round((a[0] + b[0]) / 2)
        const midY = Math.round((a[1] + b[1]) / 2)
        out[i] = [midX, midY]
        out.splice((i + 1) % out.length, 1)
        changed = true
        break
      }
    }
  }
  return out
}

function alignOrthogonal(poly: PolygonMm, tolMm: number): PolygonMm {
  const n = poly.length
  if (n < 3) return poly
  const out: [number, number][] = poly.map(p => [p[0], p[1]])
  for (let i = 0; i < n; i++) {
    const a = out[i]
    const b = out[(i + 1) % n]
    const dx = Math.abs(b[0] - a[0])
    const dy = Math.abs(b[1] - a[1])
    if (dx > 0 && dx <= tolMm && dy > tolMm) {
      // Quasi-vertical → force vertical. Déplace B sur l'axe de A.
      out[(i + 1) % n] = [a[0], b[1]]
    } else if (dy > 0 && dy <= tolMm && dx > tolMm) {
      // Quasi-horizontal → force horizontal
      out[(i + 1) % n] = [b[0], a[1]]
    }
  }
  return out
}

function computeMaxDrift(before: PolygonMm, after: PolygonMm): number {
  // before et after n'ont pas forcément la même longueur (vertices supprimés).
  // Pour chaque sommet de `before`, on prend la distance au sommet le plus
  // proche de `after` — borne conservative (≤ déplacement réel).
  let max = 0
  for (const b of before) {
    let bestSq = Infinity
    for (const a of after) {
      const d = (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])
      if (d < bestSq) bestSq = d
    }
    const d = Math.sqrt(bestSq)
    if (d > max) max = d
  }
  return max
}

// ─── Batch API ────────────────────────────────────────────

export interface BatchCleanupReport {
  readonly total: number
  readonly cleaned: number
  readonly unchanged: number
  readonly rejected: number
  readonly byReason: Record<string, number>
  readonly averageScoreBefore: number
  readonly averageScoreAfter: number
  readonly details: ReadonlyArray<{
    readonly index: number
    readonly result: CleanupResult
  }>
}

export function cleanupBatch(
  polygons: readonly PolygonMm[],
  opts: CleanupOptions = {},
): BatchCleanupReport {
  let sumBefore = 0, sumAfter = 0
  let cleaned = 0, unchanged = 0, rejected = 0
  const byReason: Record<string, number> = {}
  const details = polygons.map((poly, index) => {
    const result = cleanupPolygon(poly, opts)
    sumBefore += result.beforeScore
    sumAfter += result.afterScore
    if (result.changed) cleaned++
    else if (result.rejectedReason) { rejected++; byReason[result.rejectedReason] = (byReason[result.rejectedReason] ?? 0) + 1 }
    else unchanged++
    return { index, result }
  })
  const n = polygons.length || 1
  return {
    total: polygons.length,
    cleaned,
    unchanged,
    rejected,
    byReason,
    averageScoreBefore: sumBefore / n,
    averageScoreAfter: sumAfter / n,
    details,
  }
}
