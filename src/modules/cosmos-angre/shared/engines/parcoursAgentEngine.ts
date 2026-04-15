// ═══ PARCOURS AGENT ENGINE — A* pathfinding client simulation (M18) ═══
// Simule un parcours client type : entrée → ancre → zone secondaire → sortie.
// Utilise A* sur grille déduite des zones de circulation.

export interface PathNode {
  x: number
  y: number
}

export interface JourneyStep {
  label: string
  x: number
  y: number
  /** Durée estimée de shopping à ce point en minutes. */
  dwellMinutes: number
}

export interface SimulatedJourney {
  /** Étapes logiques (POIs visités). */
  steps: JourneyStep[]
  /** Waypoints du chemin complet (A* expansé). */
  path: PathNode[]
  /** Longueur totale du chemin en mètres. */
  totalLengthM: number
  /** Durée totale estimée (déplacement + dwell). */
  totalMinutes: number
  /** Vitesse moyenne de marche utilisée (m/s). */
  walkingSpeedMps: number
}

export interface SimulationInput {
  /** Zones franchissables (circulations + halls). */
  walkable: Array<{ id: string; polygon: [number, number][] }>
  /** Point d'entrée. */
  entrance: PathNode
  /** Point de sortie. */
  exit: PathNode
  /** POIs à visiter dans l'ordre (si vide, simulation libre). */
  waypoints?: JourneyStep[]
  /** Taille grille en mètres (défaut 1.0). */
  gridStepM?: number
  /** Vitesse de marche (défaut 1.2 m/s). */
  walkingSpeedMps?: number
}

// ─── Grid ────────────────────────────────────────────────

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

interface Grid {
  cols: number
  rows: number
  step: number
  offsetX: number
  offsetY: number
  walkable: Uint8Array
}

function buildGrid(input: SimulationInput): Grid {
  const step = input.gridStepM ?? 1.0
  // Bbox des zones walkable + extension pour entrée/sortie
  let minX = Math.min(input.entrance.x, input.exit.x)
  let maxX = Math.max(input.entrance.x, input.exit.x)
  let minY = Math.min(input.entrance.y, input.exit.y)
  let maxY = Math.max(input.entrance.y, input.exit.y)
  for (const w of input.walkable) {
    for (const [x, y] of w.polygon) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const margin = 5
  minX -= margin; minY -= margin; maxX += margin; maxY += margin
  const cols = Math.ceil((maxX - minX) / step)
  const rows = Math.ceil((maxY - minY) / step)
  const walkable = new Uint8Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    const cy = minY + (r + 0.5) * step
    for (let c = 0; c < cols; c++) {
      const cx = minX + (c + 0.5) * step
      const inside = input.walkable.some(w => pointInPolygon(cx, cy, w.polygon))
      if (inside) walkable[r * cols + c] = 1
    }
  }
  // Force walkable pour entrée/sortie/waypoints (même si hors polygone)
  const markCell = (p: PathNode) => {
    const c = Math.floor((p.x - minX) / step)
    const r = Math.floor((p.y - minY) / step)
    if (r >= 0 && r < rows && c >= 0 && c < cols) walkable[r * cols + c] = 1
  }
  markCell(input.entrance); markCell(input.exit)
  for (const w of input.waypoints ?? []) markCell(w)
  return { cols, rows, step, offsetX: minX, offsetY: minY, walkable }
}

function worldToCell(grid: Grid, p: PathNode): [number, number] {
  return [
    Math.floor((p.x - grid.offsetX) / grid.step),
    Math.floor((p.y - grid.offsetY) / grid.step),
  ]
}

function cellToWorld(grid: Grid, c: number, r: number): PathNode {
  return {
    x: grid.offsetX + (c + 0.5) * grid.step,
    y: grid.offsetY + (r + 0.5) * grid.step,
  }
}

// ─── A* ──────────────────────────────────────────────────

function aStar(grid: Grid, start: PathNode, goal: PathNode): PathNode[] | null {
  const [sc, sr] = worldToCell(grid, start)
  const [gc, gr] = worldToCell(grid, goal)
  const idx = (c: number, r: number) => r * grid.cols + c

  const openList: Array<{ c: number; r: number; g: number; f: number }> = []
  const visited = new Uint8Array(grid.cols * grid.rows)
  const parent = new Int32Array(grid.cols * grid.rows).fill(-1)
  const gScore = new Float32Array(grid.cols * grid.rows).fill(Infinity)

  const heuristic = (c: number, r: number) => Math.hypot(c - gc, r - gr) * grid.step

  gScore[idx(sc, sr)] = 0
  openList.push({ c: sc, r: sr, g: 0, f: heuristic(sc, sr) })

  while (openList.length > 0) {
    // Pop min-f (linear — suffisant pour grilles < 10k)
    let bestI = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestI].f) bestI = i
    }
    const curr = openList.splice(bestI, 1)[0]
    const ci = idx(curr.c, curr.r)
    if (visited[ci]) continue
    visited[ci] = 1

    if (curr.c === gc && curr.r === gr) {
      // Reconstruct path
      const out: PathNode[] = []
      let c = curr.c, r = curr.r
      while (c >= 0) {
        out.push(cellToWorld(grid, c, r))
        const p = parent[idx(c, r)]
        if (p < 0) break
        r = Math.floor(p / grid.cols)
        c = p % grid.cols
      }
      return out.reverse()
    }

    // 8-connectivity
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue
        const nc = curr.c + dc, nr = curr.r + dr
        if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) continue
        const ni = idx(nc, nr)
        if (visited[ni]) continue
        if (!grid.walkable[ni]) continue
        const moveCost = (dc === 0 || dr === 0) ? grid.step : grid.step * Math.SQRT2
        const tg = curr.g + moveCost
        if (tg < gScore[ni]) {
          gScore[ni] = tg
          parent[ni] = idx(curr.c, curr.r)
          openList.push({ c: nc, r: nr, g: tg, f: tg + heuristic(nc, nr) })
        }
      }
    }
  }
  return null
}

// ─── Simulation ──────────────────────────────────────────

export function simulateJourney(input: SimulationInput): SimulatedJourney | null {
  const grid = buildGrid(input)
  const speed = input.walkingSpeedMps ?? 1.2
  const waypoints = input.waypoints ?? []

  const stops: PathNode[] = [input.entrance, ...waypoints, input.exit]
  const fullPath: PathNode[] = []
  let totalLen = 0

  for (let i = 0; i < stops.length - 1; i++) {
    const segment = aStar(grid, stops[i], stops[i + 1])
    if (!segment) return null
    if (i > 0) segment.shift() // évite doublon au point de raccord
    fullPath.push(...segment)
    // Longueur
    for (let j = 1; j < segment.length; j++) {
      totalLen += Math.hypot(segment[j].x - segment[j - 1].x, segment[j].y - segment[j - 1].y)
    }
  }

  const dwell = waypoints.reduce((s, w) => s + (w.dwellMinutes ?? 0), 0)
  const walkMinutes = (totalLen / speed) / 60

  const steps: JourneyStep[] = [
    { label: 'Entrée', x: input.entrance.x, y: input.entrance.y, dwellMinutes: 0 },
    ...waypoints,
    { label: 'Sortie', x: input.exit.x, y: input.exit.y, dwellMinutes: 0 },
  ]

  return {
    steps,
    path: fullPath,
    totalLengthM: totalLen,
    totalMinutes: walkMinutes + dwell,
    walkingSpeedMps: speed,
  }
}
