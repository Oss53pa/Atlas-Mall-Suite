// ═══ DIJKSTRA MULTI-SOURCE — Temps d'évacuation depuis chaque point vers la sortie la plus proche ═══

export interface GraphNode {
  id: string
  /** Position 2D pour calcul de distance euclidienne. */
  x: number
  y: number
  /** Capacité de la jonction (personnes/min) — pour bottlenecks. */
  capacityPerMin?: number
}

export interface GraphEdge {
  from: string
  to: string
  /** Distance en mètres. */
  distM: number
  /** Vitesse spécifique (m/s) — défaut 1.2 m/s. */
  speedMps?: number
}

export interface MultiSourceResult {
  /** Map nodeId → distance min (m) vers une source. */
  distances: Map<string, number>
  /** Map nodeId → temps min (s). */
  evacuationTimes: Map<string, number>
  /** Map nodeId → source la plus proche. */
  nearestSource: Map<string, string>
  /** Nœud le plus éloigné. */
  worstNode: { id: string; distance: number; time: number } | null
}

/**
 * Calcule la distance/temps de chaque nœud vers la source la plus proche.
 * Sources = sorties de secours. Algo Dijkstra avec priorité min-heap.
 */
export function dijkstraMultiSource(
  nodes: GraphNode[],
  edges: GraphEdge[],
  sourceIds: string[],
): MultiSourceResult {
  const adj = new Map<string, Array<{ to: string; cost: number; timeS: number }>>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const speed = e.speedMps ?? 1.2
    adj.get(e.from)?.push({ to: e.to, cost: e.distM, timeS: e.distM / speed })
    adj.get(e.to)?.push({ to: e.from, cost: e.distM, timeS: e.distM / speed })
  }

  const distances = new Map<string, number>()
  const evacuationTimes = new Map<string, number>()
  const nearestSource = new Map<string, string>()
  for (const n of nodes) {
    distances.set(n.id, Infinity)
    evacuationTimes.set(n.id, Infinity)
  }

  // Min-heap simple (priority queue via tableau trié — OK pour graphes < 10k nœuds)
  type HeapNode = { id: string; dist: number; time: number; source: string }
  const heap: HeapNode[] = []
  const push = (h: HeapNode) => {
    let lo = 0, hi = heap.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      if (heap[mid].dist > h.dist) hi = mid
      else lo = mid + 1
    }
    heap.splice(lo, 0, h)
  }

  for (const sid of sourceIds) {
    if (!adj.has(sid)) continue
    distances.set(sid, 0)
    evacuationTimes.set(sid, 0)
    nearestSource.set(sid, sid)
    push({ id: sid, dist: 0, time: 0, source: sid })
  }

  while (heap.length > 0) {
    const cur = heap.shift()!
    if (cur.dist > (distances.get(cur.id) ?? Infinity)) continue
    for (const e of adj.get(cur.id) ?? []) {
      const newDist = cur.dist + e.cost
      const newTime = cur.time + e.timeS
      if (newDist < (distances.get(e.to) ?? Infinity)) {
        distances.set(e.to, newDist)
        evacuationTimes.set(e.to, newTime)
        nearestSource.set(e.to, cur.source)
        push({ id: e.to, dist: newDist, time: newTime, source: cur.source })
      }
    }
  }

  // Worst node
  let worstNode: MultiSourceResult['worstNode'] = null
  for (const [id, d] of distances) {
    if (!Number.isFinite(d)) continue
    if (!worstNode || d > worstNode.distance) {
      worstNode = { id, distance: d, time: evacuationTimes.get(id) ?? 0 }
    }
  }

  return { distances, evacuationTimes, nearestSource, worstNode }
}
