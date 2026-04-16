// ═══ FLOOR CLUSTERING — Robust 2D spatial clustering for multi-floor DXF plans ═══
// Remplace le clustering 1-axe par un DBSCAN léger 2D qui gère :
//  - Plans diagonaux (3 étages posés en diagonale dans le DXF)
//  - Formes L/T (plans non-rectangulaires)
//  - Plans monolithiques (1 seul cluster → 1 seul étage)
//
// Algorithme :
//  1. Échantillonne les centroïdes d'entités (jusqu'à 5k points)
//  2. Calcule une distance "voisinage" adaptative depuis la diagonale totale
//  3. DBSCAN (eps = diag/15, minPts = 20) sur une grille hachée
//  4. Retourne les bounding boxes par cluster, triés par position verticale

export interface ClusterPoint {
  x: number
  y: number
  weight?: number // nombre d'entités représentées (pour échantillonnage)
}

export interface ClusterBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
  pointCount: number
}

export interface ClusteringResult {
  clusters: ClusterBounds[]
  /** Distance utilisée (pour debug/ajustement UI). */
  eps: number
  /** Points considérés comme bruit (hors cluster). */
  noise: number
}

// ─── Hash grid pour recherche O(1) des voisins ──────────────
// Backing : Int32Array dense (origin + cols/rows), ~10× plus rapide qu'un Map<string>

class HashGrid {
  private buckets: Int32Array[]
  private cols: number
  private rows: number
  constructor(
    private cellSize: number,
    private originX: number, private originY: number,
    width: number, height: number,
  ) {
    this.cols = Math.max(1, Math.ceil(width / cellSize) + 2)
    this.rows = Math.max(1, Math.ceil(height / cellSize) + 2)
    this.buckets = new Array(this.cols * this.rows)
  }
  private cellIdx(x: number, y: number): number {
    const cx = Math.floor((x - this.originX) / this.cellSize)
    const cy = Math.floor((y - this.originY) / this.cellSize)
    return cy * this.cols + cx
  }
  add(idx: number, x: number, y: number): void {
    const k = this.cellIdx(x, y)
    if (k < 0 || k >= this.buckets.length) return
    const cur = this.buckets[k]
    if (!cur) {
      this.buckets[k] = Int32Array.of(idx)
    } else {
      const next = new Int32Array(cur.length + 1)
      next.set(cur)
      next[cur.length] = idx
      this.buckets[k] = next
    }
  }
  neighbors(x: number, y: number, out: number[]): void {
    out.length = 0
    const cx = Math.floor((x - this.originX) / this.cellSize)
    const cy = Math.floor((y - this.originY) / this.cellSize)
    for (let dy = -1; dy <= 1; dy++) {
      const ry = cy + dy
      if (ry < 0 || ry >= this.rows) continue
      for (let dx = -1; dx <= 1; dx++) {
        const rx = cx + dx
        if (rx < 0 || rx >= this.cols) continue
        const arr = this.buckets[ry * this.cols + rx]
        if (!arr) continue
        for (let i = 0; i < arr.length; i++) out.push(arr[i])
      }
    }
  }
}

// ─── DBSCAN 2D ──────────────────────────────────────────────

export function clusterFloors(
  points: ClusterPoint[],
  opts: { epsFactor?: number; minPts?: number; maxSample?: number; timeBudgetMs?: number } = {},
): ClusteringResult {
  if (points.length === 0) {
    return { clusters: [], eps: 0, noise: 0 }
  }
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now())
  const timeBudget = opts.timeBudgetMs ?? 1500 // garde-fou : abandonne après 1.5s

  // Échantillonnage si trop de points (cap dur à 2000 pour temps borné)
  const maxSample = Math.min(opts.maxSample ?? 2000, 2000)
  const sampled = points.length > maxSample
    ? points.filter((_, i) => i % Math.ceil(points.length / maxSample) === 0)
    : points

  // Bounding box global
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of sampled) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const w = maxX - minX || 1
  const h = maxY - minY || 1
  const diag = Math.hypot(w, h)
  const epsFactor = opts.epsFactor ?? 1 / 15  // voisinage = 1/15e de la diagonale
  const eps = diag * epsFactor
  const eps2 = eps * eps
  const minPts = opts.minPts ?? 20

  // Pré-allocation tableaux denses (Float64Array : x,y plats pour cache locality)
  const xs = new Float64Array(sampled.length)
  const ys = new Float64Array(sampled.length)
  for (let i = 0; i < sampled.length; i++) {
    xs[i] = sampled[i].x
    ys[i] = sampled[i].y
  }

  // Hash grid avec backing dense
  const grid = new HashGrid(eps, minX, minY, w, h)
  for (let i = 0; i < sampled.length; i++) grid.add(i, xs[i], ys[i])

  // DBSCAN avec arrêt temps + queue circulaire
  const UNVISITED = -1
  const NOISE = -2
  const labels = new Int32Array(sampled.length).fill(UNVISITED)
  let clusterId = 0
  const candidates: number[] = []
  const queue: number[] = []

  const regionQueryInto = (idx: number, out: number[]) => {
    out.length = 0
    grid.neighbors(xs[idx], ys[idx], candidates)
    const px = xs[idx], py = ys[idx]
    for (let k = 0; k < candidates.length; k++) {
      const j = candidates[k]
      const dx = px - xs[j], dy = py - ys[j]
      if (dx * dx + dy * dy <= eps2) out.push(j)
    }
  }

  const checkBudget = () => {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now())
    return now - t0 < timeBudget
  }

  for (let i = 0; i < sampled.length; i++) {
    if (!checkBudget()) break
    if (labels[i] !== UNVISITED) continue
    const seedNeighbors: number[] = []
    regionQueryInto(i, seedNeighbors)
    if (seedNeighbors.length < minPts) {
      labels[i] = NOISE
      continue
    }
    const id = clusterId++
    labels[i] = id
    // Réinit queue (réutilise array)
    queue.length = 0
    for (let k = 0; k < seedNeighbors.length; k++) queue.push(seedNeighbors[k])
    let qHead = 0
    while (qHead < queue.length) {
      if (!checkBudget()) break
      const j = queue[qHead++]
      if (labels[j] === NOISE) labels[j] = id
      if (labels[j] !== UNVISITED) continue
      labels[j] = id
      const nb2: number[] = []
      regionQueryInto(j, nb2)
      if (nb2.length >= minPts) {
        for (let k = 0; k < nb2.length; k++) queue.push(nb2[k])
      }
    }
  }

  // Agrège en ClusterBounds
  const byCluster = new Map<number, ClusterBounds>()
  let noise = 0
  for (let i = 0; i < sampled.length; i++) {
    const label = labels[i]
    if (label === NOISE) { noise++; continue }
    const p = sampled[i]
    const w = p.weight ?? 1
    let cb = byCluster.get(label)
    if (!cb) {
      cb = {
        minX: p.x, minY: p.y, maxX: p.x, maxY: p.y,
        width: 0, height: 0, centerX: 0, centerY: 0,
        pointCount: 0,
      }
      byCluster.set(label, cb)
    }
    if (p.x < cb.minX) cb.minX = p.x
    if (p.y < cb.minY) cb.minY = p.y
    if (p.x > cb.maxX) cb.maxX = p.x
    if (p.y > cb.maxY) cb.maxY = p.y
    cb.pointCount += w
  }
  const clusters: ClusterBounds[] = []
  for (const cb of byCluster.values()) {
    cb.width = cb.maxX - cb.minX
    cb.height = cb.maxY - cb.minY
    cb.centerX = (cb.minX + cb.maxX) / 2
    cb.centerY = (cb.minY + cb.maxY) / 2
    clusters.push(cb)
  }

  // Filtrer les clusters trop petits (< 5% de la diagonale)
  const minClusterSize = diag * 0.05
  const filtered = clusters.filter(c => Math.max(c.width, c.height) > minClusterSize)

  // Tri logique : si les clusters sont alignés verticalement, tri par Y desc (haut d'abord = étage haut)
  // sinon tri par X asc.
  const yRange = Math.max(...filtered.map(c => c.centerY)) - Math.min(...filtered.map(c => c.centerY))
  const xRange = Math.max(...filtered.map(c => c.centerX)) - Math.min(...filtered.map(c => c.centerX))
  if (yRange > xRange) {
    filtered.sort((a, b) => b.centerY - a.centerY)
  } else {
    filtered.sort((a, b) => a.centerX - b.centerX)
  }

  return { clusters: filtered, eps, noise }
}

// ─── Label heuristique ──────────────────────────────────────

/** Attribue des labels canoniques (B1, RDC, R+1...) en fonction du nombre et de l'ordre. */
export function labelClusters(clusters: ClusterBounds[]): Array<ClusterBounds & { id: string; label: string; stackOrder: number }> {
  const n = clusters.length
  if (n === 0) return []
  if (n === 1) {
    return [{ ...clusters[0], id: 'RDC', label: 'Rez-de-chaussée', stackOrder: 0 }]
  }
  if (n === 2) {
    return [
      { ...clusters[0], id: 'RDC', label: 'Rez-de-chaussée', stackOrder: 0 },
      { ...clusters[1], id: 'R+1', label: '1er étage', stackOrder: 1 },
    ]
  }
  if (n === 3) {
    return [
      { ...clusters[0], id: 'B1', label: 'Sous-sol / Parking', stackOrder: -1 },
      { ...clusters[1], id: 'RDC', label: 'Rez-de-chaussée', stackOrder: 0 },
      { ...clusters[2], id: 'R+1', label: '1er étage', stackOrder: 1 },
    ]
  }
  // n ≥ 4 : B1, RDC, R+1, R+2...
  const out: Array<ClusterBounds & { id: string; label: string; stackOrder: number }> = []
  for (let i = 0; i < n; i++) {
    const order = i - 1  // B1 = -1, RDC = 0, R+1 = 1...
    let id: string, label: string
    if (order === -1) { id = 'B1'; label = 'Sous-sol / Parking' }
    else if (order === 0) { id = 'RDC'; label = 'Rez-de-chaussée' }
    else { id = `R+${order}`; label = `${order}${order === 1 ? 'er' : 'e'} étage` }
    out.push({ ...clusters[i], id, label, stackOrder: order })
  }
  return out
}
