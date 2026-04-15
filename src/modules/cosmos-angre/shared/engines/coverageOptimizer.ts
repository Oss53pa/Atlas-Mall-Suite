// ═══ COVERAGE OPTIMIZER — Greedy camera placement for max coverage (M09) ═══
// Étant donné un plan et des contraintes (budget caméras, FOV/range fixes),
// propose un placement de caméras qui maximise la couverture de zones prioritaires.
//
// Approche : greedy submodular — à chaque itération, choisit le point de grille
// qui apporte le plus de nouvelle couverture. Sous-optimal mais garanti ≥ 63%
// de l'optimal (borne Nemhauser pour fonctions submodulaires monotones).

import type { Camera, Space } from './cameraCoverageEngine'

export interface OptimizerInput {
  /** Dimensions du plan en mètres. */
  planWidth: number
  planHeight: number
  /** Espaces à couvrir (polygones en mètres, origin top-left). */
  spaces: Space[]
  /** Budget max de caméras à placer. */
  budget: number
  /** Caméras déjà existantes (elles comptent dans la couverture mais ne sont pas déplaçables). */
  existing?: Camera[]
  /** Rayon FOV défaut en mètres. */
  defaultRangeM?: number
  /** Angle FOV défaut en degrés. */
  defaultFovDeg?: number
  /** Résolution de la grille d'échantillonnage en mètres (0.5 = grille fine). */
  gridStepM?: number
  /** Poids prioritaire par type de zone (défaut 1). */
  priorityByType?: Record<string, number>
}

export interface ProposedCamera {
  x: number
  y: number
  angle: number    // radians — direction centrale du cône
  fov: number      // radians
  rangeM: number
  /** Gain en surface (m²) apporté par cette caméra. */
  gainSqm: number
  /** Score normalisé (0-1). */
  score: number
}

export interface OptimizerResult {
  proposed: ProposedCamera[]
  totalCoveredSqm: number
  totalSpacesSqm: number
  finalCoveragePct: number
  iterations: number
  elapsedMs: number
}

// ─── Geometry helpers ──────────────────────────────────────

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

function inCamera(px: number, py: number, cam: { x: number; y: number; angle: number; fov: number; rangeM: number }): boolean {
  const dx = px - cam.x, dy = py - cam.y
  const dist = Math.hypot(dx, dy)
  if (dist > cam.rangeM || dist < 0.01) return false
  const bearing = Math.atan2(dy, dx)
  let diff = bearing - cam.angle
  while (diff > Math.PI) diff -= 2 * Math.PI
  while (diff < -Math.PI) diff += 2 * Math.PI
  return Math.abs(diff) <= cam.fov / 2
}

// ─── Greedy optimizer ──────────────────────────────────────

export function optimizeCoverage(input: OptimizerInput): OptimizerResult {
  const t0 = performance.now()
  const rangeM = input.defaultRangeM ?? 12
  const fovDeg = input.defaultFovDeg ?? 90
  const fovRad = (fovDeg * Math.PI) / 180
  const step = input.gridStepM ?? 1.0
  const budget = Math.max(0, Math.floor(input.budget))
  const priorities = input.priorityByType ?? {}

  // 1. Rasterize space coverage targets (cell = 1 unit of weighted area)
  const cols = Math.max(1, Math.ceil(input.planWidth / step))
  const rows = Math.max(1, Math.ceil(input.planHeight / step))
  const weights = new Float32Array(cols * rows) // poids cible par cellule
  const covered = new Uint8Array(cols * rows)   // 1 si déjà couverte

  let totalWeight = 0
  for (const sp of input.spaces) {
    const w = priorities[sp.type ?? ''] ?? 1
    if (w <= 0) continue
    for (let r = 0; r < rows; r++) {
      const cy = (r + 0.5) * step
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * step
        if (pointInPolygon(cx, cy, sp.polygon)) {
          const idx = r * cols + c
          if (weights[idx] < w) {
            totalWeight += (w - weights[idx])
            weights[idx] = w
          }
        }
      }
    }
  }

  // 2. Mark cells already covered by existing cameras
  for (const cam of input.existing ?? []) {
    const angle = cam.angle ?? 0
    const fov = cam.fov ?? fovRad
    const range = cam.rangeM ?? rangeM
    for (let r = 0; r < rows; r++) {
      const cy = (r + 0.5) * step
      for (let c = 0; c < cols; c++) {
        const cx = (c + 0.5) * step
        const idx = r * cols + c
        if (weights[idx] > 0 && !covered[idx]) {
          if (inCamera(cx, cy, { x: cam.x, y: cam.y, angle, fov, rangeM: range })) {
            covered[idx] = 1
          }
        }
      }
    }
  }

  // 3. Candidate placement grid (same as coverage grid)
  // 4. For each iteration, find best (candidate, angle) pair
  const proposed: ProposedCamera[] = []
  // 8 angles cardinaux testés
  const angleCount = 8
  const angles = Array.from({ length: angleCount }, (_, i) => (i / angleCount) * 2 * Math.PI)

  for (let iter = 0; iter < budget; iter++) {
    let bestGain = 0
    let bestPlacement: ProposedCamera | null = null

    // Échantillonne les candidats (1 sur 3 pour performance)
    const candidateStep = 3
    for (let rc = 0; rc < rows; rc += candidateStep) {
      const camY = (rc + 0.5) * step
      for (let cc = 0; cc < cols; cc += candidateStep) {
        const camX = (cc + 0.5) * step

        // Skip si le candidat n'est pas dans une zone (évite placement en dehors du plan)
        const candIdx = rc * cols + cc
        if (weights[candIdx] === 0) continue

        for (const ang of angles) {
          // Évalue la couverture additionnelle de cette caméra
          let gain = 0
          // Parcours rapide : seulement les cellules dans un carré englobant le cône
          const maxR = rangeM
          const minR = Math.max(0, rc - Math.ceil(maxR / step))
          const maxRow = Math.min(rows - 1, rc + Math.ceil(maxR / step))
          const minC = Math.max(0, cc - Math.ceil(maxR / step))
          const maxCol = Math.min(cols - 1, cc + Math.ceil(maxR / step))
          for (let r2 = minR; r2 <= maxRow; r2++) {
            const py = (r2 + 0.5) * step
            for (let c2 = minC; c2 <= maxCol; c2++) {
              const idx = r2 * cols + c2
              if (covered[idx] || weights[idx] === 0) continue
              const px = (c2 + 0.5) * step
              if (inCamera(px, py, { x: camX, y: camY, angle: ang, fov: fovRad, rangeM })) {
                gain += weights[idx]
              }
            }
          }
          if (gain > bestGain) {
            bestGain = gain
            bestPlacement = {
              x: camX, y: camY, angle: ang, fov: fovRad, rangeM,
              gainSqm: gain * step * step,
              score: 0, // rempli après
            }
          }
        }
      }
    }

    if (!bestPlacement || bestGain === 0) break

    // Applique la couverture
    const { x: camX, y: camY, angle: ang } = bestPlacement
    for (let r2 = 0; r2 < rows; r2++) {
      const py = (r2 + 0.5) * step
      for (let c2 = 0; c2 < cols; c2++) {
        const idx = r2 * cols + c2
        if (covered[idx] || weights[idx] === 0) continue
        const px = (c2 + 0.5) * step
        if (inCamera(px, py, { x: camX, y: camY, angle: ang, fov: fovRad, rangeM })) {
          covered[idx] = 1
        }
      }
    }

    proposed.push(bestPlacement)
  }

  // Normalisation des scores
  const maxGain = Math.max(1, ...proposed.map(p => p.gainSqm))
  for (const p of proposed) p.score = p.gainSqm / maxGain

  // Totaux
  let coveredWeight = 0
  for (let i = 0; i < weights.length; i++) {
    if (covered[i] && weights[i] > 0) coveredWeight += weights[i]
  }
  const totalCoveredSqm = coveredWeight * step * step
  const totalSpacesSqm = totalWeight * step * step

  return {
    proposed,
    totalCoveredSqm,
    totalSpacesSqm,
    finalCoveragePct: totalSpacesSqm > 0 ? (totalCoveredSqm / totalSpacesSqm) * 100 : 0,
    iterations: proposed.length,
    elapsedMs: performance.now() - t0,
  }
}
