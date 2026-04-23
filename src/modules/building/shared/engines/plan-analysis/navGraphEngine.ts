// ═══ NAV GRAPH ENGINE — graphe de navigation pondéré + Dijkstra ═══
//
// À partir du squelette (skeletonEngine) et des spaces détectés, construit un
// graphe de navigation réutilisable :
//   - Nœuds = intersections + endpoints du squelette + ancres entrées/sorties
//   - Arêtes = segments de couloir du squelette
//   - Poids = longueur × facteur_congestion × facteur_attractivité
//   - Facteur attractivité : arête proche d'un commerce attractif → bonus
//     (le parcours préférera passer devant les boutiques)
//   - Facteur congestion : pour l'instant constant 1.0 (sera alimenté par ABM)
//
// Algorithme : Dijkstra avec heap binaire simple.
// Export JSON complet pour réutilisation par une app mobile wayfinding.

import type { SkeletonResult, SkeletonNode, SkeletonEdge } from './skeletonEngine'

// ─── Types ─────────────────────────────────────────────────

export interface NavNode {
  id: string
  x: number
  y: number
  /** Type fonctionnel du nœud. */
  kind: 'junction' | 'endpoint' | 'entrance' | 'exit' | 'transit' | 'path'
  /** Référence métier associée (ex: spaceId de l'entrée). */
  refId?: string
  /** Libellé humain. */
  label?: string
}

export interface NavEdge {
  id: string
  fromId: string
  toId: string
  /** Waypoints intermédiaires en monde (mètres). */
  waypoints: Array<{ x: number; y: number }>
  /** Longueur géométrique. */
  lengthM: number
  /** Facteur de congestion (≥ 1 ; pénalise l'arête). Défaut 1. */
  congestion: number
  /** Facteur d'attractivité (0..2 ; plus petit = plus attractif, bonus distance). Défaut 1. */
  attractiveness: number
  /** Poids final utilisé par Dijkstra. */
  weight: number
}

export interface NavGraph {
  nodes: NavNode[]
  edges: NavEdge[]
  /** Index node.id → index dans nodes[] */
  _nodeIndex: Map<string, number>
  /** Index node.id → adjacency list [{ edgeId, otherNodeId, weight }]. */
  _adj: Map<string, Array<{ edgeId: string; to: string; weight: number }>>
}

export interface GraphBuildInput {
  skeleton: SkeletonResult
  /** Points d'ancrage à raccrocher au nœud squelette le plus proche. */
  anchors: Array<{
    id: string
    x: number
    y: number
    label: string
    kind: 'entrance' | 'exit' | 'transit'
    refId?: string
  }>
  /** Spaces commerciaux attractifs (avec poids d'attractivité 0..1). */
  attractiveSpaces?: Array<{
    polygon: [number, number][]
    attractivityScore: number
  }>
}

// ─── Construction du graphe ───────────────────────────────

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y
  return dx * dx + dy * dy
}

function nearestNodeId(nodes: SkeletonNode[], x: number, y: number): string | null {
  if (nodes.length === 0) return null
  let bestId: string | null = null
  let bestD = Infinity
  for (const n of nodes) {
    const d = dist2(n, { x, y })
    if (d < bestD) { bestD = d; bestId = n.id }
  }
  return bestId
}

function centroidOfEdge(edge: SkeletonEdge, nodes: SkeletonNode[]): { x: number; y: number } {
  const from = nodes.find(n => n.id === edge.fromNodeId)
  const to = nodes.find(n => n.id === edge.toNodeId)
  if (!from || !to) return { x: 0, y: 0 }
  const all = [from, ...edge.waypoints, to]
  let x = 0, y = 0
  for (const p of all) { x += p.x; y += p.y }
  return { x: x / all.length, y: y / all.length }
}

function pointToPolygonDistance(px: number, py: number, poly: [number, number][]): number {
  // Distance minimale au polygone (côté le plus proche)
  let minD = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[i][0], y1 = poly[i][1]
    const x2 = poly[j][0], y2 = poly[j][1]
    const dx = x2 - x1, dy = y2 - y1
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)))
    const qx = x1 + dx * t, qy = y1 + dy * t
    const d = Math.hypot(px - qx, py - qy)
    if (d < minD) minD = d
  }
  return minD
}

/** Calcule le facteur d'attractivité d'une arête : plus il y a de commerces attractifs
 *  à proximité (≤ 8m), plus le poids est réduit (bonus ≤ 30%). */
function computeAttractiveness(
  edge: SkeletonEdge,
  skeletonNodes: SkeletonNode[],
  attractiveSpaces?: GraphBuildInput['attractiveSpaces'],
): number {
  if (!attractiveSpaces || attractiveSpaces.length === 0) return 1.0
  const c = centroidOfEdge(edge, skeletonNodes)
  let bonus = 0
  for (const s of attractiveSpaces) {
    const d = pointToPolygonDistance(c.x, c.y, s.polygon)
    if (d < 8) {
      bonus += s.attractivityScore * (1 - d / 8)
    }
  }
  // Plafonnée : poids = 1 - 0.3 × clamp(bonus, 0..1)
  const factor = 1 - 0.3 * Math.min(1, bonus)
  return Math.max(0.7, factor)
}

export function buildNavGraph(input: GraphBuildInput): NavGraph {
  const sk = input.skeleton

  // 1. Copier nœuds squelette en NavNode
  const nodes: NavNode[] = sk.nodes.map(n => ({
    id: n.id,
    x: n.x, y: n.y,
    kind: n.kind === 'junction' ? 'junction' : n.kind === 'endpoint' ? 'endpoint' : 'path',
  }))

  // 2. Créer nœuds d'ancrage + arête synthétique vers le nœud squelette le plus proche
  const edges: NavEdge[] = []
  let edgeCounter = 0

  for (const a of input.anchors) {
    const nearId = nearestNodeId(sk.nodes, a.x, a.y)
    const anchorNode: NavNode = {
      id: `anchor-${a.id}`,
      x: a.x, y: a.y,
      kind: a.kind,
      label: a.label,
      refId: a.refId,
    }
    nodes.push(anchorNode)

    if (nearId) {
      const nearNode = sk.nodes.find(n => n.id === nearId)!
      const len = Math.hypot(a.x - nearNode.x, a.y - nearNode.y)
      edges.push({
        id: `e-anchor-${edgeCounter++}`,
        fromId: anchorNode.id,
        toId: nearNode.id,
        waypoints: [],
        lengthM: len,
        congestion: 1.0,
        attractiveness: 1.0,
        weight: len, // ancrage neutre
      })
    }
  }

  // 3. Copier les arêtes squelette avec calcul d'attractivité
  for (const e of sk.edges) {
    const att = computeAttractiveness(e, sk.nodes, input.attractiveSpaces)
    const congestion = 1.0 // placeholder — sera alimenté par ABM dans un futur chantier
    const weight = e.lengthM * congestion * att
    edges.push({
      id: e.id,
      fromId: e.fromNodeId,
      toId: e.toNodeId,
      waypoints: e.waypoints,
      lengthM: e.lengthM,
      congestion,
      attractiveness: att,
      weight,
    })
  }

  // 4. Index
  const _nodeIndex = new Map<string, number>()
  nodes.forEach((n, i) => _nodeIndex.set(n.id, i))
  const _adj = new Map<string, Array<{ edgeId: string; to: string; weight: number }>>()
  for (const n of nodes) _adj.set(n.id, [])
  for (const e of edges) {
    _adj.get(e.fromId)!.push({ edgeId: e.id, to: e.toId, weight: e.weight })
    _adj.get(e.toId)!.push({ edgeId: e.id, to: e.fromId, weight: e.weight })
  }

  return { nodes, edges, _nodeIndex, _adj }
}

// ─── Dijkstra ────────────────────────────────────────────

/** Heap binaire minimaliste (clé numérique). */
class MinHeap<T> {
  private items: Array<{ key: number; value: T }> = []
  push(key: number, value: T) {
    this.items.push({ key, value })
    this.bubbleUp(this.items.length - 1)
  }
  pop(): { key: number; value: T } | undefined {
    if (this.items.length === 0) return undefined
    const root = this.items[0]
    const last = this.items.pop()!
    if (this.items.length) {
      this.items[0] = last
      this.sinkDown(0)
    }
    return root
  }
  get size() { return this.items.length }
  private bubbleUp(i: number) {
    const it = this.items[i]
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.items[parent].key <= it.key) break
      this.items[i] = this.items[parent]
      i = parent
    }
    this.items[i] = it
  }
  private sinkDown(i: number) {
    const n = this.items.length
    const it = this.items[i]
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2
      let smallest = i
      if (l < n && this.items[l].key < this.items[smallest].key) smallest = l
      if (r < n && this.items[r].key < this.items[smallest].key) smallest = r
      if (smallest === i) break
      this.items[i] = this.items[smallest]
      i = smallest
    }
    this.items[i] = it
  }
}

export interface NavPath {
  /** Suite de nœuds traversés (incluant from et to). */
  nodeIds: string[]
  /** Polyligne complète en monde (mètres). */
  waypoints: Array<{ x: number; y: number }>
  /** Longueur géométrique totale. */
  lengthM: number
  /** Coût total Dijkstra (somme des poids). */
  totalWeight: number
}

/** Plus court chemin pondéré entre 2 nœuds. */
export function shortestPath(graph: NavGraph, fromId: string, toId: string): NavPath | null {
  if (!graph._adj.has(fromId) || !graph._adj.has(toId)) return null
  const dist = new Map<string, number>()
  const prev = new Map<string, { nodeId: string; edgeId: string }>()
  const heap = new MinHeap<string>()

  dist.set(fromId, 0)
  heap.push(0, fromId)

  while (heap.size) {
    const top = heap.pop()!
    const u = top.value
    const du = top.key
    if (u === toId) break
    if (du > (dist.get(u) ?? Infinity)) continue

    for (const { edgeId, to, weight } of graph._adj.get(u)!) {
      const alt = du + weight
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt)
        prev.set(to, { nodeId: u, edgeId })
        heap.push(alt, to)
      }
    }
  }

  if (!dist.has(toId)) return null

  // Reconstruction
  const nodeIds: string[] = [toId]
  let cur = toId
  while (prev.has(cur)) {
    const p = prev.get(cur)!
    nodeIds.push(p.nodeId)
    cur = p.nodeId
  }
  nodeIds.reverse()
  if (nodeIds[0] !== fromId) return null

  // Waypoints complets + longueur
  const waypoints: Array<{ x: number; y: number }> = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const node = graph.nodes[graph._nodeIndex.get(nodeIds[i])!]
    if (i === 0) {
      waypoints.push({ x: node.x, y: node.y })
    } else {
      const prevNode = graph.nodes[graph._nodeIndex.get(nodeIds[i - 1])!]
      // Trouver l'arête correspondante
      const edge = graph.edges.find(e =>
        (e.fromId === prevNode.id && e.toId === node.id) ||
        (e.fromId === node.id && e.toId === prevNode.id),
      )
      if (edge) {
        const wps = edge.fromId === prevNode.id ? edge.waypoints : [...edge.waypoints].reverse()
        for (const wp of wps) waypoints.push(wp)
        lengthM += edge.lengthM
      }
      waypoints.push({ x: node.x, y: node.y })
    }
  }

  return {
    nodeIds,
    waypoints,
    lengthM,
    totalWeight: dist.get(toId)!,
  }
}

// ─── Export JSON wayfinding ──────────────────────────────

export interface WayfindingExport {
  version: '1.0.0'
  generatedAt: string
  metrics: {
    nodeCount: number
    edgeCount: number
    junctionCount: number
    entranceCount: number
    exitCount: number
    transitCount: number
    totalLengthM: number
  }
  nodes: Array<Pick<NavNode, 'id' | 'x' | 'y' | 'kind' | 'label' | 'refId'>>
  edges: Array<Pick<NavEdge, 'id' | 'fromId' | 'toId' | 'lengthM' | 'waypoints'>>
}

/** Sérialise le graphe pour intégration app mobile wayfinding. */
export function exportWayfindingJSON(graph: NavGraph): WayfindingExport {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    metrics: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      junctionCount: graph.nodes.filter(n => n.kind === 'junction').length,
      entranceCount: graph.nodes.filter(n => n.kind === 'entrance').length,
      exitCount: graph.nodes.filter(n => n.kind === 'exit').length,
      transitCount: graph.nodes.filter(n => n.kind === 'transit').length,
      totalLengthM: graph.edges.reduce((s, e) => s + e.lengthM, 0),
    },
    nodes: graph.nodes.map(n => ({
      id: n.id, x: n.x, y: n.y, kind: n.kind, label: n.label, refId: n.refId,
    })),
    edges: graph.edges.map(e => ({
      id: e.id, fromId: e.fromId, toId: e.toId, lengthM: e.lengthM, waypoints: e.waypoints,
    })),
  }
}
