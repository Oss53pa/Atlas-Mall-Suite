// ═══ ABM SOCIAL FORCE ENGINE ═══
// Simulation Agent-Based Modeling avec Social Force Model (Helbing 1995).
//
// Paramètres (spec PROPH3T Vol.3) :
//   - Vitesse nominale   : 1.2 m/s
//   - Rayon interaction  : 2 m
//   - Densité critique   : 4 pers/m²
//   - Pas de temps       : 0.1 s
//
// Modèle de forces (Helbing) :
//   F_total = F_attract + F_repulse_agents + F_repulse_walls
//   F_attract    = m × (v_desired - v) / τ      (τ = 0.5 s, relaxation)
//   F_repulse    = A × exp(-d/B) × n           (A = 2000 N, B = 0.08 m)
//   F_repulse_wall = A_w × exp(-d/B_w) × n      (A_w = 1000 N, B_w = 0.2 m)
//
// Les agents partent d'entrées et se dirigent vers des sorties via les chemins
// A* déjà calculés. La heatmap résulte de l'accumulation des positions des
// agents sur une grille spatiale.

import type { FlowPath } from './flowPathEngine'

// ─── Paramètres ─────────────────────────────────────

export const ABM_PARAMS = {
  /** Vitesse de marche désirée (m/s). */
  desiredSpeed: 1.2,
  /** Rayon d'interaction entre agents (m). */
  interactionRadius: 2.0,
  /** Densité critique au-delà de laquelle le flux s'effondre (pers/m²). */
  criticalDensity: 4.0,
  /** Pas de temps (s). */
  dt: 0.1,
  /** Masse moyenne d'un agent (kg). */
  mass: 70,
  /** Temps de relaxation τ (s) — temps pour atteindre v_desired. */
  tau: 0.5,
  /** Force répulsive max entre agents (N). */
  agentRepulsionA: 2000,
  /** Portée répulsion entre agents (m). */
  agentRepulsionB: 0.08,
  /** Force répulsive max vis-à-vis d'un mur (N). */
  wallRepulsionA: 1000,
  /** Portée répulsion mur (m). */
  wallRepulsionB: 0.2,
  /** Rayon physique d'un agent (m). */
  agentRadius: 0.3,
}

// ─── Types ─────────────────────────────────────────

export type TimeSlot = 'opening' | 'midday' | 'closing'

export const TIME_SLOT_META: Record<TimeSlot, { label: string; hour: string; flowBias: string }> = {
  opening: { label: 'Ouverture', hour: '10h-11h', flowBias: 'Afflux entrées → intérieur' },
  midday:  { label: 'Mi-journée', hour: '12h30-14h', flowBias: 'Pic restauration + circulation dense' },
  closing: { label: 'Fermeture', hour: '21h-22h', flowBias: 'Reflux intérieur → sorties' },
}

/** Coefficients qui modulent le nombre d'agents injectés par tranche. */
export const TIME_SLOT_INJECTION: Record<TimeSlot, {
  fromEntrance: number // probabilité d'injection aux entrées (0..1)
  fromShops: number    // probabilité d'injection depuis les commerces (0..1)
  durationSec: number  // durée simulée
  targetMix: 'exit-bias' | 'balanced' | 'exit-strong' // où les agents veulent aller
}> = {
  opening: { fromEntrance: 0.9, fromShops: 0.1, durationSec: 600, targetMix: 'balanced' },
  midday:  { fromEntrance: 0.6, fromShops: 0.4, durationSec: 900, targetMix: 'balanced' },
  closing: { fromEntrance: 0.1, fromShops: 0.8, durationSec: 600, targetMix: 'exit-strong' },
}

export interface AbmAgent {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  /** Ordre des waypoints à suivre (suit un FlowPath). */
  pathId: string
  waypointIndex: number
  /** true si arrivé à destination. */
  arrived: boolean
}

export interface AbmObstacle {
  x1: number; y1: number
  x2: number; y2: number
}

export interface AbmInput {
  paths: FlowPath[]
  /** Murs + contours de boutiques. */
  obstacles: AbmObstacle[]
  /** Nombre total d'agents à simuler (défaut 200). */
  nAgents?: number
  /** Tranche horaire simulée. */
  timeSlot: TimeSlot
  /** Cellule heatmap en mètres (défaut 2). */
  heatmapCellM?: number
  /** Borne temporelle (secondes) — si absente, utilise le param de la tranche. */
  simulationDurationS?: number
  /** Graine pseudo-aléatoire pour reproductibilité. */
  seed?: number
}

export interface HeatmapGrid {
  width: number
  height: number
  cellM: number
  originX: number
  originY: number
  /** Densité (pers/m²) moyenne par cellule sur la durée simulée. */
  density: Float32Array
  /** Densité instantanée maximale observée. */
  peakDensity: Float32Array
}

export interface AbmResult {
  timeSlot: TimeSlot
  heatmap: HeatmapGrid
  stats: {
    agentsSimulated: number
    arrived: number
    durationS: number
    maxDensity: number
    averageDensity: number
    congestionSpots: Array<{ x: number; y: number; peakDensity: number }>
  }
}

// ─── PRNG simple (Mulberry32) pour reproductibilité ────

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Helpers géométriques ─────────────────────────

function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  return dx * dx + dy * dy
}

function closestPointOnSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return { x: x1, y: y1 }
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  return { x: x1 + t * dx, y: y1 + t * dy }
}

// ─── Spatial hash pour accélérer les interactions ──

class SpatialHash {
  cellSize: number
  cells: Map<number, AbmAgent[]> = new Map()
  constructor(cellSize: number) { this.cellSize = cellSize }

  private key(x: number, y: number): number {
    const i = Math.floor(x / this.cellSize)
    const j = Math.floor(y / this.cellSize)
    return (i * 10000 + j) | 0
  }

  clear() { this.cells.clear() }

  insert(a: AbmAgent) {
    const k = this.key(a.x, a.y)
    if (!this.cells.has(k)) this.cells.set(k, [])
    this.cells.get(k)!.push(a)
  }

  neighbors(x: number, y: number): AbmAgent[] {
    const result: AbmAgent[] = []
    const ci = Math.floor(x / this.cellSize)
    const cj = Math.floor(y / this.cellSize)
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const k = ((ci + di) * 10000 + (cj + dj)) | 0
        const arr = this.cells.get(k)
        if (arr) for (const a of arr) result.push(a)
      }
    }
    return result
  }
}

// ─── Pipeline principal ───────────────────────────

export function runAbmSimulation(input: AbmInput): AbmResult {
  const nAgents = input.nAgents ?? 200
  const cellM = input.heatmapCellM ?? 2
  const rng = mulberry32(input.seed ?? 42)
  const slotMeta = TIME_SLOT_INJECTION[input.timeSlot]
  const simDuration = input.simulationDurationS ?? slotMeta.durationSec
  const dt = ABM_PARAMS.dt
  const steps = Math.ceil(simDuration / dt)

  // Grille heatmap
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of input.paths) {
    for (const w of p.waypoints) {
      if (w.x < minX) minX = w.x; if (w.x > maxX) maxX = w.x
      if (w.y < minY) minY = w.y; if (w.y > maxY) maxY = w.y
    }
  }
  if (!isFinite(minX)) {
    return {
      timeSlot: input.timeSlot,
      heatmap: {
        width: 0, height: 0, cellM, originX: 0, originY: 0,
        density: new Float32Array(), peakDensity: new Float32Array(),
      },
      stats: { agentsSimulated: 0, arrived: 0, durationS: 0, maxDensity: 0, averageDensity: 0, congestionSpots: [] },
    }
  }
  const pad = cellM * 3
  const originX = minX - pad
  const originY = minY - pad
  const width = Math.ceil((maxX - minX + pad * 2) / cellM)
  const height = Math.ceil((maxY - minY + pad * 2) / cellM)
  const density = new Float32Array(width * height)
  const peakDensity = new Float32Array(width * height)
  const cellArea = cellM * cellM

  // Initialisation des agents
  const agents: AbmAgent[] = []
  for (let i = 0; i < nAgents; i++) {
    // Choisir un chemin au hasard (pondéré par son poids = trafic estimé)
    const totalWeight = input.paths.reduce((s, p) => s + (p.weight || 1), 0)
    let r = rng() * totalWeight
    let path: FlowPath | null = null
    for (const p of input.paths) {
      r -= (p.weight || 1)
      if (r <= 0) { path = p; break }
    }
    if (!path) path = input.paths[0]
    if (!path || path.waypoints.length < 2) continue

    const start = path.waypoints[0]
    agents.push({
      id: i,
      x: start.x + (rng() - 0.5) * 1.5,
      y: start.y + (rng() - 0.5) * 1.5,
      vx: 0,
      vy: 0,
      pathId: path.id,
      waypointIndex: 1,
      arrived: false,
    })
  }

  const hash = new SpatialHash(ABM_PARAMS.interactionRadius)
  const paths = new Map(input.paths.map(p => [p.id, p]))

  // Boucle simulation
  const sampleInterval = Math.max(1, Math.floor(steps / 60)) // 60 samples heatmap
  let samples = 0

  for (let step = 0; step < steps; step++) {
    // Spatial hash
    hash.clear()
    for (const a of agents) if (!a.arrived) hash.insert(a)

    // Calcul des forces + intégration Euler
    for (const a of agents) {
      if (a.arrived) continue
      const path = paths.get(a.pathId)
      if (!path) continue
      const wp = path.waypoints[a.waypointIndex]
      if (!wp) { a.arrived = true; continue }

      // 1. Force attractive vers waypoint
      const dx = wp.x - a.x, dy = wp.y - a.y
      const d = Math.hypot(dx, dy)
      if (d < 1.0) {
        // Atteint le waypoint → passer au suivant
        a.waypointIndex++
        if (a.waypointIndex >= path.waypoints.length) { a.arrived = true; continue }
      }
      const desiredVx = (dx / Math.max(0.01, d)) * ABM_PARAMS.desiredSpeed
      const desiredVy = (dy / Math.max(0.01, d)) * ABM_PARAMS.desiredSpeed
      const fAttractX = ABM_PARAMS.mass * (desiredVx - a.vx) / ABM_PARAMS.tau
      const fAttractY = ABM_PARAMS.mass * (desiredVy - a.vy) / ABM_PARAMS.tau

      // 2. Répulsion agents (voisins proches)
      let fRepAX = 0, fRepAY = 0
      for (const b of hash.neighbors(a.x, a.y)) {
        if (b.id === a.id || b.arrived) continue
        const dxb = a.x - b.x, dyb = a.y - b.y
        const db = Math.hypot(dxb, dyb)
        if (db < 0.01 || db > ABM_PARAMS.interactionRadius) continue
        const overlap = 2 * ABM_PARAMS.agentRadius - db
        const magnitude = ABM_PARAMS.agentRepulsionA * Math.exp(overlap / ABM_PARAMS.agentRepulsionB)
        fRepAX += (dxb / db) * magnitude
        fRepAY += (dyb / db) * magnitude
      }

      // 3. Répulsion murs (les plus proches uniquement pour perf)
      let fRepWX = 0, fRepWY = 0
      // On évalue la répulsion uniquement sur les obstacles dans un rayon de 3m
      for (const o of input.obstacles) {
        // Test rapide bbox
        const midX = (o.x1 + o.x2) / 2
        const midY = (o.y1 + o.y2) / 2
        if (distSq(a.x, a.y, midX, midY) > 16) continue // > 4m → skip
        const cp = closestPointOnSegment(a.x, a.y, o.x1, o.y1, o.x2, o.y2)
        const dxw = a.x - cp.x, dyw = a.y - cp.y
        const dw = Math.hypot(dxw, dyw)
        if (dw < 0.01 || dw > 3.0) continue
        const overlap = ABM_PARAMS.agentRadius - dw
        const magnitude = ABM_PARAMS.wallRepulsionA * Math.exp(overlap / ABM_PARAMS.wallRepulsionB)
        fRepWX += (dxw / dw) * magnitude
        fRepWY += (dyw / dw) * magnitude
      }

      // F-ABM : cap de la force totale pour éviter l'instabilité numérique
      // quand exp(overlap/B) explose en cluster d'agents (ex: 3.6 MN).
      // Cap à 5×m×v_desired/τ ≈ 840 N (Helbing 1995 reste très en-dessous).
      const MAX_FORCE = 5 * ABM_PARAMS.mass * ABM_PARAMS.desiredSpeed / ABM_PARAMS.tau
      let fxTot = fAttractX + fRepAX + fRepWX
      let fyTot = fAttractY + fRepAY + fRepWY
      const fMag = Math.hypot(fxTot, fyTot)
      if (fMag > MAX_FORCE) {
        fxTot = (fxTot / fMag) * MAX_FORCE
        fyTot = (fyTot / fMag) * MAX_FORCE
      }
      // Intégration Euler semi-implicite
      const ax = fxTot / ABM_PARAMS.mass
      const ay = fyTot / ABM_PARAMS.mass
      a.vx += ax * dt
      a.vy += ay * dt
      // Cap vitesse à 1.3 × v_desired
      const vMag = Math.hypot(a.vx, a.vy)
      const vMax = ABM_PARAMS.desiredSpeed * 1.3
      if (vMag > vMax) {
        a.vx = (a.vx / vMag) * vMax
        a.vy = (a.vy / vMag) * vMax
      }
      a.x += a.vx * dt
      a.y += a.vy * dt
    }

    // Échantillonnage heatmap
    if (step % sampleInterval === 0) {
      samples++
      for (const a of agents) {
        if (a.arrived) continue
        const i = Math.floor((a.x - originX) / cellM)
        const j = Math.floor((a.y - originY) / cellM)
        if (i < 0 || i >= width || j < 0 || j >= height) continue
        density[j * width + i] += 1
      }
    }
  }

  // Normalisation : density moyen [pers/m²]
  let maxD = 0, totalD = 0
  const nonZero = []
  for (let k = 0; k < density.length; k++) {
    const avg = samples > 0 ? density[k] / samples / cellArea : 0
    density[k] = avg
    peakDensity[k] = avg // approximatif — pas de suivi inst. ici pour perf
    if (avg > maxD) maxD = avg
    if (avg > 0) {
      totalD += avg
      nonZero.push({ k, d: avg })
    }
  }
  const avgDensity = nonZero.length > 0 ? totalD / nonZero.length : 0

  // Top 5 spots de congestion
  nonZero.sort((a, b) => b.d - a.d)
  const congestionSpots = nonZero.slice(0, 5).map(n => {
    const i = n.k % width
    const j = Math.floor(n.k / width)
    return {
      x: originX + (i + 0.5) * cellM,
      y: originY + (j + 0.5) * cellM,
      peakDensity: n.d,
    }
  })

  return {
    timeSlot: input.timeSlot,
    heatmap: {
      width, height, cellM, originX, originY,
      density, peakDensity,
    },
    stats: {
      agentsSimulated: agents.length,
      arrived: agents.filter(a => a.arrived).length,
      durationS: simDuration,
      maxDensity: maxD,
      averageDensity: avgDensity,
      congestionSpots,
    },
  }
}

// ─── Facteur de congestion pour navGraph (alimente les poids) ──

/** Renvoie facteur 1..3 pour chaque position — à utiliser comme `congestion` dans NavEdge. */
export function densityAt(heatmap: HeatmapGrid, x: number, y: number): number {
  const i = Math.floor((x - heatmap.originX) / heatmap.cellM)
  const j = Math.floor((y - heatmap.originY) / heatmap.cellM)
  if (i < 0 || i >= heatmap.width || j < 0 || j >= heatmap.height) return 0
  return heatmap.density[j * heatmap.width + i]
}
