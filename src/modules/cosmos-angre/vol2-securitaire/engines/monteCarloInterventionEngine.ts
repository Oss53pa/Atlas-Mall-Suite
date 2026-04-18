// ═══ VOL.2 · Monte-Carlo Temps d'intervention ═══
//
// Simule N scénarios d'intervention suite à une alerte pour estimer la
// distribution du temps de réponse et identifier les percentiles critiques
// (P50, P90, P95, P99).
//
// Modèle :
//   - Un incident se déclenche à une position i dans le centre
//   - Un agent part d'une position fixe (poste garde) vers i
//   - Délais aléatoires (loi log-normale) pour :
//       · détection humaine (opérateur vidéo)    : μ=15s, σ=8s
//       · mobilisation (l'agent se lève)         : μ=10s, σ=5s
//       · temps de trajet (distance / vitesse)   : fonction distance
//       · réaction sur site (prise en charge)    : μ=20s, σ=10s
//
// Sorties :
//   - Histogramme des temps totaux
//   - Statistiques (mean, median, P90, P95, P99)
//   - Heatmap "temps d'intervention" par zone (grille 5m)
//
// Paramètres calibrables : vitesse de marche agent, nombre d'agents,
// position(s) des postes, distribution temporelle de l'incident.
//
// Référence : Boyle 1977 "Options: A Monte Carlo approach".

// ─── Types ─────────────────────────────────────────

export interface AgentPost {
  id: string
  label: string
  x: number
  y: number
  floorId?: string
  /** Nombre d'agents présents à ce poste. */
  agentsCount: number
}

export interface InterventionConfig {
  /** Postes d'agents de sécurité. */
  posts: AgentPost[]
  /** Vitesse de marche rapide (m/s). Défaut 2.5 (course modérée). */
  walkSpeedMps?: number
  /** Paramètres de distribution log-normale par étape (μ, σ en sec). */
  detectMu?: number
  detectSigma?: number
  mobilizeMu?: number
  mobilizeSigma?: number
  reactMu?: number
  reactSigma?: number
  /** Nombre d'itérations Monte-Carlo. Défaut 1000. */
  iterations?: number
  /** Fonction de distance entre (agent_x, agent_y) et (incident_x, incident_y).
      Si absent, utilise distance euclidienne (non réaliste si obstacles). */
  distanceFn?: (ax: number, ay: number, bx: number, by: number) => number
  /** F-009 : graine pour reproductibilité. Si absent, utilise Date.now(). */
  seed?: number
}

export interface InterventionSimulation {
  incidentX: number
  incidentY: number
  iterations: number
  /** Temps total (détection + mobilisation + trajet + réaction) par simulation. */
  responseTimesSec: number[]
  /** Stats. */
  stats: InterventionStats
}

export interface InterventionStats {
  mean: number
  median: number
  p90: number
  p95: number
  p99: number
  min: number
  max: number
  stddev: number
  /** Taux de dépassement d'un seuil de 90s (objectif ERP typique). */
  pctExceed90: number
}

// ─── Random sampling (F-009 : PRNG seedé pour determinisme) ─────────

import { mulberry32 } from '../../shared/utils/prng'

/** Random gaussien (Box-Muller) à partir d'un PRNG uniforme. */
function randn(rng: () => number): number {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Log-normal : exp(μ' + σ' × Z) où μ', σ' dérivés de μ et σ linéaires. */
function sampleLogNormal(mu: number, sigma: number, rng: () => number): number {
  const m2 = mu * mu
  const sigmaPrime = Math.sqrt(Math.log(1 + (sigma * sigma) / m2))
  const muPrime = Math.log(mu) - (sigmaPrime * sigmaPrime) / 2
  return Math.exp(muPrime + sigmaPrime * randn(rng))
}

// ─── Stats ─────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p / 100)))
  return sorted[idx]
}

function computeStats(values: number[]): InterventionStats {
  if (values.length === 0) {
    return { mean: 0, median: 0, p90: 0, p95: 0, p99: 0, min: 0, max: 0, stddev: 0, pctExceed90: 0 }
  }
  const sorted = values.slice().sort((a, b) => a - b)
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  const exceed90 = values.filter(v => v > 90).length / values.length
  return {
    mean,
    median: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stddev: Math.sqrt(variance),
    pctExceed90: exceed90,
  }
}

// ─── Pipeline principal ──────────────────────────

export function simulateIntervention(
  incidentX: number, incidentY: number,
  config: InterventionConfig,
): InterventionSimulation {
  const N = config.iterations ?? 1000
  const speed = config.walkSpeedMps ?? 2.5
  const detectMu = config.detectMu ?? 15
  const detectSig = config.detectSigma ?? 8
  const mobMu = config.mobilizeMu ?? 10
  const mobSig = config.mobilizeSigma ?? 5
  const reactMu = config.reactMu ?? 20
  const reactSig = config.reactSigma ?? 10
  const dist = config.distanceFn ?? ((ax, ay, bx, by) => Math.hypot(bx - ax, by - ay))
  const rng = mulberry32(config.seed ?? Date.now())

  const responseTimes: number[] = []

  for (let i = 0; i < N; i++) {
    // 1. Détection (opérateur vidéo)
    const tDetect = sampleLogNormal(detectMu, detectSig, rng)
    // 2. Mobilisation
    const tMob = sampleLogNormal(mobMu, mobSig, rng)
    // 3. Choisir le poste disponible le plus proche (agents dispo > 0)
    let bestTravel = Infinity
    for (const post of config.posts) {
      if (post.agentsCount <= 0) continue
      const d = dist(post.x, post.y, incidentX, incidentY)
      const travel = d / speed
      if (travel < bestTravel) bestTravel = travel
    }
    if (!isFinite(bestTravel)) {
      responseTimes.push(Infinity)
      continue
    }
    // 4. Réaction sur place
    const tReact = sampleLogNormal(reactMu, reactSig, rng)

    responseTimes.push(tDetect + tMob + bestTravel + tReact)
  }

  return {
    incidentX, incidentY,
    iterations: N,
    responseTimesSec: responseTimes,
    stats: computeStats(responseTimes),
  }
}

// ─── Heatmap temps d'intervention par zone ───────

export interface InterventionHeatmap {
  gridSizeM: number
  originX: number
  originY: number
  cols: number
  rows: number
  /** P95 par cellule (en sec). */
  p95Grid: Float32Array
  /** Mean par cellule. */
  meanGrid: Float32Array
}

/**
 * Génère la heatmap de temps d'intervention P95 sur une grille couvrant le plan.
 * Pour chaque cellule, simule N scénarios pour un incident placé au centre.
 */
export function generateInterventionHeatmap(
  planBounds: { width: number; height: number; offsetX?: number; offsetY?: number },
  config: InterventionConfig & { gridSizeM?: number; iterationsPerCell?: number },
): InterventionHeatmap {
  const gridSize = config.gridSizeM ?? 5
  const itersPerCell = config.iterationsPerCell ?? 200
  const ox = planBounds.offsetX ?? 0
  const oy = planBounds.offsetY ?? 0
  const cols = Math.ceil(planBounds.width / gridSize)
  const rows = Math.ceil(planBounds.height / gridSize)
  const p95Grid = new Float32Array(cols * rows)
  const meanGrid = new Float32Array(cols * rows)

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = ox + (i + 0.5) * gridSize
      const cy = oy + (j + 0.5) * gridSize
      const sim = simulateIntervention(cx, cy, { ...config, iterations: itersPerCell })
      p95Grid[j * cols + i] = sim.stats.p95
      meanGrid[j * cols + i] = sim.stats.mean
    }
  }

  return { gridSizeM: gridSize, originX: ox, originY: oy, cols, rows, p95Grid, meanGrid }
}

// ─── Interprétation ───────────────────────────

export function interpretInterventionStats(stats: InterventionStats): string[] {
  const out: string[] = []
  out.push(`Temps moyen d'intervention : ${stats.mean.toFixed(1)} s (médiane ${stats.median.toFixed(1)} s).`)
  out.push(`P90 : ${stats.p90.toFixed(1)} s · P95 : ${stats.p95.toFixed(1)} s · P99 : ${stats.p99.toFixed(1)} s.`)
  if (stats.p95 < 60) {
    out.push(`✓ Excellent : 95 % des interventions < 60 s — bon maillage.`)
  } else if (stats.p95 < 90) {
    out.push(`✓ Conforme : 95 % des interventions < 90 s (objectif ERP typique).`)
  } else if (stats.p95 < 120) {
    out.push(`⚠ Limite : 95 % des interventions < 120 s — envisager renfort d'agents.`)
  } else {
    out.push(`✗ Critique : P95 > 120 s — augmenter le nombre d'agents ou leurs postes.`)
  }
  if (stats.pctExceed90 > 0.2) {
    out.push(`${(stats.pctExceed90 * 100).toFixed(1)} % des interventions dépassent 90 s.`)
  }
  return out
}
