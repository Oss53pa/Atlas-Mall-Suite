// ═══ Camera Placement Engine — SEC-01 ═══
//
// CDC §3.3 :
//   SEC-01 — Placer automatiquement les caméras pour maximiser la couverture
//            et minimiser les angles morts
//
// Algorithme : couverture par ensemble glouton (set cover, NP-hard mais
// l'approximation gloutonne donne (1-1/e) ≈ 63 % de l'optimal théorique).
//
// Contraintes métier :
//   - Distance utile caméra : 12 m (FOV 60°, résolution 4K = identification visage)
//   - Angles morts à couvrir : entrées, sorties, caisses, escalators, sanitaires couloirs
//   - Maximum N caméras (budget)
//   - Conformité APSAD R82 + EN 62676-4

import type { OptimizeSolution } from '../../proph3t-core/types'

// ─── Types ────────────────────────────────────

export type CameraType = 'dome-fixed' | 'dome-ptz' | 'bullet' | 'fisheye-360'

export const CAMERA_SPECS: Record<CameraType, {
  rangeM: number; fovDeg: number; mountHeightM: number; priceFcfa: number; standard: string
}> = {
  'dome-fixed':  { rangeM: 12, fovDeg: 90,  mountHeightM: 3.0, priceFcfa: 350_000,  standard: 'EN 62676-4' },
  'dome-ptz':    { rangeM: 25, fovDeg: 360, mountHeightM: 3.5, priceFcfa: 950_000,  standard: 'APSAD R82' },
  'bullet':      { rangeM: 18, fovDeg: 75,  mountHeightM: 3.0, priceFcfa: 420_000,  standard: 'EN 62676-4' },
  'fisheye-360': { rangeM: 8,  fovDeg: 360, mountHeightM: 3.0, priceFcfa: 750_000,  standard: 'EN 62676-4' },
}

export interface CoveragePoint {
  id: string
  x: number
  y: number
  /** Importance 0..1 (entrée principale = 1, recoin = 0.3). */
  weight: number
  /** Type de zone (descriptif). */
  zoneType: 'entrance' | 'exit' | 'corridor' | 'commercial' | 'service' | 'parking'
}

export interface CandidatePosition {
  id: string
  x: number
  y: number
  cameraType: CameraType
  /** Heading en degrés si caméra fixe (0-360). */
  headingDeg?: number
}

export interface PlacementInput {
  coveragePoints: CoveragePoint[]
  candidates: CandidatePosition[]
  /** Obstacles segments (murs). */
  obstacles?: Array<{ x1: number; y1: number; x2: number; y2: number }>
  /** Budget max en nombre de caméras. */
  maxCameras: number
  /** Couverture cible (0..1). Stoppe quand atteinte. */
  targetCoverage?: number
}

export interface PlacementResult {
  selected: Array<{
    candidate: CandidatePosition
    coveredPoints: string[]
    weightedCoverage: number
  }>
  totalWeightedCoverage: number
  uncoveredPoints: CoveragePoint[]
  budgetFcfa: number
  norms: string[]
  solutions: OptimizeSolution[]
}

// ─── Géométrie ────────────────────────────────

function isCovered(camera: CandidatePosition, point: CoveragePoint, obstacles: Array<{ x1: number; y1: number; x2: number; y2: number }> = []): boolean {
  const spec = CAMERA_SPECS[camera.cameraType]
  const dx = point.x - camera.x
  const dy = point.y - camera.y
  const dist = Math.hypot(dx, dy)
  if (dist > spec.rangeM) return false

  // FOV
  if (spec.fovDeg < 360 && camera.headingDeg !== undefined) {
    const angleToPoint = Math.atan2(dy, dx) * 180 / Math.PI
    let diff = Math.abs(angleToPoint - camera.headingDeg) % 360
    if (diff > 180) diff = 360 - diff
    if (diff > spec.fovDeg / 2) return false
  }

  // Occlusion par murs
  for (const o of obstacles) {
    if (segmentsIntersect(camera.x, camera.y, point.x, point.y, o.x1, o.y1, o.x2, o.y2)) {
      return false
    }
  }
  return true
}

function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (Math.abs(denom) < 1e-9) return false
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6
}

// ─── Set cover greedy ─────────────────────────

export function placeCamerasGreedy(input: PlacementInput): PlacementResult {
  const obstacles = input.obstacles ?? []
  const remaining = new Set(input.coveragePoints.map(p => p.id))
  const totalWeight = input.coveragePoints.reduce((s, p) => s + p.weight, 0)
  const target = input.targetCoverage ?? 0.95
  let coveredWeight = 0
  const selected: PlacementResult['selected'] = []

  // Précompute coverage par candidat
  const coverageByCandidate = new Map<string, Set<string>>()
  for (const cand of input.candidates) {
    const set = new Set<string>()
    for (const p of input.coveragePoints) {
      if (isCovered(cand, p, obstacles)) set.add(p.id)
    }
    coverageByCandidate.set(cand.id, set)
  }

  while (selected.length < input.maxCameras && remaining.size > 0) {
    // Choisir le candidat qui couvre le plus de poids restant
    let bestCand: CandidatePosition | null = null
    let bestGain = 0
    let bestCovered: string[] = []
    for (const cand of input.candidates) {
      if (selected.find(s => s.candidate.id === cand.id)) continue
      const cov = coverageByCandidate.get(cand.id)!
      let gain = 0
      const newlyCovered: string[] = []
      for (const pid of cov) {
        if (remaining.has(pid)) {
          const p = input.coveragePoints.find(p => p.id === pid)!
          gain += p.weight
          newlyCovered.push(pid)
        }
      }
      if (gain > bestGain) {
        bestGain = gain
        bestCand = cand
        bestCovered = newlyCovered
      }
    }
    if (!bestCand || bestGain === 0) break
    selected.push({
      candidate: bestCand,
      coveredPoints: bestCovered,
      weightedCoverage: bestGain,
    })
    coveredWeight += bestGain
    for (const pid of bestCovered) remaining.delete(pid)
    if (coveredWeight / totalWeight >= target) break
  }

  const uncovered = input.coveragePoints.filter(p => remaining.has(p.id))
  const budget = selected.reduce((s, x) => s + CAMERA_SPECS[x.candidate.cameraType].priceFcfa, 0)
  const norms = Array.from(new Set(selected.map(x => CAMERA_SPECS[x.candidate.cameraType].standard)))

  // Format OptimizeSolution[]
  const solutions: OptimizeSolution[] = [{
    rank: 1,
    score: coveredWeight / Math.max(1, totalWeight),
    config: {
      placements: selected.map(s => ({
        cameraId: s.candidate.id,
        type: s.candidate.cameraType,
        x: s.candidate.x, y: s.candidate.y,
        heading: s.candidate.headingDeg,
        coveredCount: s.coveredPoints.length,
      })),
      budgetFcfa: budget,
      coveragePct: (coveredWeight / totalWeight) * 100,
      uncovered: uncovered.length,
    },
    rationale: `Algorithme glouton (set cover, garantie (1-1/e) ≈ 63 % optimal). ` +
      `${selected.length} caméras placées couvrant ${((coveredWeight / totalWeight) * 100).toFixed(1)} % ` +
      `de la zone à surveiller pour ${(budget / 1_000_000).toFixed(1)} M FCFA. ` +
      `Normes : ${norms.join(', ')}.`,
  }]

  return {
    selected, totalWeightedCoverage: coveredWeight, uncoveredPoints: uncovered,
    budgetFcfa: budget, norms, solutions,
  }
}

// ─── Génération automatique de candidats ─────

/** Génère des candidats sur une grille régulière. */
export function generateCandidateGrid(
  bounds: { width: number; height: number },
  step = 8,
  cameraType: CameraType = 'dome-fixed',
  headings = [0, 90, 180, 270],
): CandidatePosition[] {
  const out: CandidatePosition[] = []
  let i = 0
  for (let x = step / 2; x < bounds.width; x += step) {
    for (let y = step / 2; y < bounds.height; y += step) {
      if (cameraType === 'fisheye-360' || cameraType === 'dome-ptz') {
        out.push({ id: `c-${i++}`, x, y, cameraType })
      } else {
        for (const h of headings) {
          out.push({ id: `c-${i++}`, x, y, cameraType, headingDeg: h })
        }
      }
    }
  }
  return out
}

/** Génère des points de couverture depuis les spaces du plan. */
export function buildCoveragePointsFromPlan(spaces: Array<{
  id: string
  type: string
  polygon: [number, number][]
}>): CoveragePoint[] {
  const out: CoveragePoint[] = []
  for (const s of spaces) {
    let cx = 0, cy = 0
    for (const [x, y] of s.polygon) { cx += x; cy += y }
    cx /= s.polygon.length; cy /= s.polygon.length
    let weight = 0.4
    let zoneType: CoveragePoint['zoneType'] = 'commercial'
    if (s.type.includes('entree')) { weight = 1.0; zoneType = 'entrance' }
    else if (s.type === 'sortie_secours') { weight = 0.95; zoneType = 'exit' }
    else if (s.type === 'promenade' || s.type === 'hall_distribution') { weight = 0.7; zoneType = 'corridor' }
    else if (s.type === 'sanitaires') { weight = 0.5; zoneType = 'service' }
    else if (s.type === 'parking_vehicule') { weight = 0.6; zoneType = 'parking' }
    out.push({ id: `cov-${s.id}`, x: cx, y: cy, weight, zoneType })
  }
  return out
}
