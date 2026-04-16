// ═══ K-MEANS — Segmentation de personas / clustering vectoriel ═══

export interface KMeansResult<T> {
  centroids: number[][]
  assignments: number[]
  inertia: number
  iterations: number
  /** Items regroupés par cluster. */
  clusters: Array<{ centroid: number[]; items: T[] }>
}

export function kmeans<T>(
  items: T[],
  vectorize: (item: T) => number[],
  k: number,
  opts: { maxIter?: number; seed?: number; tol?: number } = {},
): KMeansResult<T> {
  const maxIter = opts.maxIter ?? 100
  const tol = opts.tol ?? 1e-4
  const vectors = items.map(vectorize)
  const dim = vectors[0]?.length ?? 0
  if (vectors.length === 0 || dim === 0 || k <= 0) {
    return { centroids: [], assignments: [], inertia: 0, iterations: 0, clusters: [] }
  }
  if (vectors.length <= k) {
    return {
      centroids: vectors.map(v => [...v]),
      assignments: vectors.map((_, i) => i),
      inertia: 0,
      iterations: 0,
      clusters: vectors.map((v, i) => ({ centroid: v, items: [items[i]] })),
    }
  }

  // K-Means++ init
  let seed = opts.seed ?? 42
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 2 ** 32; return seed / 2 ** 32 }
  const centroids: number[][] = []
  centroids.push([...vectors[Math.floor(rand() * vectors.length)]])
  while (centroids.length < k) {
    const dists = vectors.map(v => Math.min(...centroids.map(c => sqDist(v, c))))
    const total = dists.reduce((s, d) => s + d, 0)
    let r = rand() * total, idx = 0
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i]
      if (r <= 0) { idx = i; break }
    }
    centroids.push([...vectors[idx]])
  }

  const assignments = new Array<number>(vectors.length).fill(0)
  let inertia = Infinity
  let iter = 0
  for (; iter < maxIter; iter++) {
    // Assign step
    let newInertia = 0
    for (let i = 0; i < vectors.length; i++) {
      let bestK = 0, bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = sqDist(vectors[i], centroids[c])
        if (d < bestD) { bestD = d; bestK = c }
      }
      assignments[i] = bestK
      newInertia += bestD
    }
    // Update step
    const sums = Array.from({ length: k }, () => new Array<number>(dim).fill(0))
    const counts = new Array<number>(k).fill(0)
    for (let i = 0; i < vectors.length; i++) {
      const c = assignments[i]
      counts[c]++
      for (let d = 0; d < dim; d++) sums[c][d] += vectors[i][d]
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue
      for (let d = 0; d < dim; d++) centroids[c][d] = sums[c][d] / counts[c]
    }
    if (Math.abs(inertia - newInertia) < tol) { inertia = newInertia; break }
    inertia = newInertia
  }

  const clusters = centroids.map((centroid, c) => ({
    centroid,
    items: items.filter((_, i) => assignments[i] === c),
  }))
  return { centroids, assignments, inertia, iterations: iter, clusters }
}

function sqDist(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return s
}
