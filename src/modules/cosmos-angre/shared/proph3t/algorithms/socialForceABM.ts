// ═══ AGENT-BASED MODEL — Social Force simplifié pour simulation flux piétons ═══
// Helbing 1995 simplifié : f = f_drive + f_repulsion_obstacles + f_repulsion_others
// Suffisant pour générer des heatmaps réalistes sans GPU.

export interface Agent {
  id: string
  x: number; y: number          // position (m)
  vx: number; vy: number        // vitesse (m/s)
  destX: number; destY: number  // destination
  desiredSpeed: number          // m/s (1.2 typique)
  reachedDest: boolean
}

export interface Obstacle {
  /** Polygone fermé représentant un mur ou obstacle. */
  polygon: [number, number][]
}

export interface ABMConfig {
  /** Nb d'agents max simultanés. */
  population: number
  /** Pas de temps en secondes. */
  dt: number
  /** Durée totale de simulation en secondes. */
  durationS: number
  /** Bornes monde (m). */
  bounds: { width: number; height: number }
  /** Sources d'apparition (entrées). */
  sources: Array<{ x: number; y: number }>
  /** Destinations possibles (POIs, sorties). */
  destinations: Array<{ x: number; y: number; weight?: number }>
  obstacles?: Obstacle[]
}

export interface ABMResult {
  /** Heatmap densité par cellule (taille bounds.width × bounds.height). */
  heatmap: Float32Array
  cols: number
  rows: number
  cellSizeM: number
  /** Trajectoires (échantillonnées). */
  trajectories: Array<Array<{ x: number; y: number }>>
  /** Métriques globales. */
  metrics: {
    totalAgents: number
    arrived: number
    avgTravelTimeS: number
    maxDensity: number
    bottlenecks: Array<{ x: number; y: number; intensity: number }>
  }
}

export function simulateABM(cfg: ABMConfig): ABMResult {
  const cellSize = 1 // 1m
  const cols = Math.ceil(cfg.bounds.width / cellSize)
  const rows = Math.ceil(cfg.bounds.height / cellSize)
  const heatmap = new Float32Array(cols * rows)
  const agents: Agent[] = []
  const trajectories: Array<Array<{ x: number; y: number }>> = []
  const arrivalTimes: number[] = []

  const pickDest = () => {
    if (cfg.destinations.length === 0) return { x: cfg.bounds.width / 2, y: cfg.bounds.height / 2 }
    const totalW = cfg.destinations.reduce((s, d) => s + (d.weight ?? 1), 0)
    let r = Math.random() * totalW
    for (const d of cfg.destinations) {
      r -= d.weight ?? 1
      if (r <= 0) return d
    }
    return cfg.destinations[0]
  }

  const spawn = (now: number) => {
    if (agents.length >= cfg.population || cfg.sources.length === 0) return
    const src = cfg.sources[Math.floor(Math.random() * cfg.sources.length)]
    const dest = pickDest()
    const a: Agent = {
      id: `a-${agents.length}-${now.toFixed(1)}`,
      x: src.x, y: src.y, vx: 0, vy: 0,
      destX: dest.x, destY: dest.y,
      desiredSpeed: 1.0 + Math.random() * 0.6,
      reachedDest: false,
    }
    agents.push(a)
    trajectories.push([{ x: a.x, y: a.y }])
  }

  const steps = Math.ceil(cfg.durationS / cfg.dt)
  const spawnInterval = Math.max(1, Math.floor(steps / cfg.population))

  for (let step = 0; step < steps; step++) {
    if (step % spawnInterval === 0) spawn(step * cfg.dt)

    for (let i = 0; i < agents.length; i++) {
      const a = agents[i]
      if (a.reachedDest) continue
      // Drive force (vers destination)
      const dx = a.destX - a.x
      const dy = a.destY - a.y
      const dist = Math.hypot(dx, dy)
      if (dist < 1.5) {
        a.reachedDest = true
        arrivalTimes.push(step * cfg.dt)
        continue
      }
      const driveX = (dx / dist) * a.desiredSpeed
      const driveY = (dy / dist) * a.desiredSpeed
      let fX = (driveX - a.vx) / 0.5  // tau = 0.5s
      let fY = (driveY - a.vy) / 0.5

      // Répulsion entre agents (échantillonnage : 5 voisins max)
      let neighborCount = 0
      for (let j = 0; j < agents.length; j++) {
        if (j === i || agents[j].reachedDest) continue
        const ddx = a.x - agents[j].x
        const ddy = a.y - agents[j].y
        const d = Math.hypot(ddx, ddy)
        if (d > 2.5 || d < 0.01) continue
        const force = 5 * Math.exp(-d / 0.3)
        fX += (ddx / d) * force
        fY += (ddy / d) * force
        neighborCount++
        if (neighborCount > 5) break
      }

      // Intégration
      a.vx += fX * cfg.dt
      a.vy += fY * cfg.dt
      const speed = Math.hypot(a.vx, a.vy)
      const maxSpeed = a.desiredSpeed * 1.5
      if (speed > maxSpeed) {
        a.vx = (a.vx / speed) * maxSpeed
        a.vy = (a.vy / speed) * maxSpeed
      }
      a.x += a.vx * cfg.dt
      a.y += a.vy * cfg.dt
      a.x = Math.max(0, Math.min(cfg.bounds.width, a.x))
      a.y = Math.max(0, Math.min(cfg.bounds.height, a.y))

      // Heatmap
      const c = Math.floor(a.x / cellSize)
      const r = Math.floor(a.y / cellSize)
      if (c >= 0 && c < cols && r >= 0 && r < rows) heatmap[r * cols + c]++

      // Trajectoire (1 sample / 5 steps)
      if (step % 5 === 0 && trajectories[i].length < 200) {
        trajectories[i].push({ x: a.x, y: a.y })
      }
    }
  }

  // Bottlenecks : top 5% cellules les plus denses
  const sorted: Array<{ x: number; y: number; v: number }> = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = heatmap[r * cols + c]
      if (v > 0) sorted.push({ x: c * cellSize + 0.5, y: r * cellSize + 0.5, v })
    }
  }
  sorted.sort((a, b) => b.v - a.v)
  const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)))
  const maxDensity = sorted[0]?.v ?? 0

  return {
    heatmap, cols, rows, cellSizeM: cellSize, trajectories,
    metrics: {
      totalAgents: agents.length,
      arrived: arrivalTimes.length,
      avgTravelTimeS: arrivalTimes.length > 0 ? arrivalTimes.reduce((s, t) => s + t, 0) / arrivalTimes.length : 0,
      maxDensity,
      bottlenecks: top.map(b => ({ x: b.x, y: b.y, intensity: b.v / maxDensity })),
    },
  }
}
