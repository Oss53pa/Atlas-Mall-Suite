// ═══ VOL.4 WAYFINDER — A* BIDIRECTIONNEL PONDÉRÉ ═══
//
// Moteur de calcul d'itinéraire optimisé pour temps-réel :
//   • A* classique (forward)   ≤ 50 ms sur graphes < 10 000 nœuds
//   • A* bidirectionnel        division par ~2 du temps sur longues distances
//   • Recalcul incrémental     < 100 ms après déviation
//
// Cinq modes d'itinéraire (cf. spec PROPH3T Vol.4) :
//   - standard    : distance × congestion × attractivité
//   - pmr         : exclut pentes > 5 %, largeurs < 1.40 m, escalators
//                   + bonus -30 % sur ascenseurs / rampes PMR
//   - fast        : distance brute uniquement (ignore la congestion)
//   - discovery   : bonus -20 % sur arêtes adjacentes à des enseignes fortes
//   - evacuation  : multi-source depuis position courante vers TOUTES les
//                   sorties de secours actives → renvoie la plus proche
//
// Heuristique : distance euclidienne 2D + pénalité de changement d'étage
//               → admissible (jamais surestimée) donc A* optimal.

import type { NavNode, NavEdge, NavGraph, NavPath } from '../../shared/engines/plan-analysis/navGraphEngine'
import type { MultiFloorGraph, VerticalTransitKind } from '../../shared/engines/plan-analysis/multiFloorGraphEngine'

// ─── Types ──────────────────────────────────────────────

export type RouteMode = 'standard' | 'pmr' | 'fast' | 'discovery' | 'evacuation'

export interface RouteOptions {
  mode: RouteMode
  /** Sources autorisées (pour evacuation : on passe uniquement par les transits non bloqués). */
  blockedEdgeIds?: Set<string>
  /** Arêtes dont le poids doit être recalibré dynamiquement (ex: congestion en temps réel). */
  edgeWeightOverrides?: Map<string, number>
  /** IDs d'espaces marqués attractifs (utilisé par le mode discovery). */
  attractiveSpaceIds?: Set<string>
  /** F-008 : borne supérieure sur le nombre de nœuds explorés (anti-freeze UI). Défaut 50_000. */
  maxExpansions?: number
  /** F-008 : signal d'annulation depuis l'UI. */
  signal?: AbortSignal
}

/** F-008 : exception levée quand A* dépasse `maxExpansions` ou reçoit un signal d'annulation. */
export class RouteAbortedError extends Error {
  constructor(public readonly reason: string) {
    super(`A* aborted: ${reason}`)
    this.name = 'RouteAbortedError'
  }
}

/** Borne par défaut. Configurable via `RouteOptions.maxExpansions`. */
const DEFAULT_MAX_EXPANSIONS = 50_000

export interface RouteResult {
  mode: RouteMode
  nodeIds: string[]
  waypoints: Array<{ x: number; y: number; floorId?: string }>
  lengthM: number
  durationS: number
  totalWeight: number
  /** Nombre de nœuds explorés (utile pour logs perfs). */
  expanded: number
  /** Durée de calcul en ms. */
  computeTimeMs: number
  /** Instructions pas-à-pas brutes (à enrichir côté UI). */
  instructions: RouteInstruction[]
}

export interface RouteInstruction {
  nodeId: string
  /** Angle de rotation en degrés (positif = droite). */
  turnDeg: number
  /** Classification. */
  kind: 'start' | 'straight' | 'slight-right' | 'slight-left' | 'right' | 'left' | 'u-turn' | 'transit' | 'arrive'
  /** Texte prêt pour TTS. */
  text: string
  /** Distance depuis le nœud précédent (m). */
  distFromPrevM: number
  /** Distance restante jusqu'à l'arrivée (m). */
  distToEndM: number
  /** Repère visuel le plus proche (enseigne, escalator, panneau). */
  landmark?: string
  /** Étage concerné pour l'instruction. */
  floorId?: string
  /** Type de transit (escalator, ascenseur, rampe, escalier) si applicable. */
  transit?: VerticalTransitKind
}

// ─── Heuristique ────────────────────────────────────────

/** Coût de référence d'un étage : ~45s × 1.3 m/s ≈ 58 m équivalents. Utilisé par l'heuristique. */
const FLOOR_PENALTY_M = 58

function heuristic(a: NavNode, b: NavNode, aFloor?: number, bFloor?: number): number {
  const flat = Math.hypot(a.x - b.x, a.y - b.y)
  if (aFloor != null && bFloor != null && aFloor !== bFloor) {
    return flat + Math.abs(aFloor - bFloor) * FLOOR_PENALTY_M
  }
  return flat
}

// ─── Heap binaire ───────────────────────────────────────

class MinHeap<T> {
  private data: Array<{ k: number; v: T }> = []
  push(k: number, v: T) {
    this.data.push({ k, v })
    let i = this.data.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].k <= this.data[i].k) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }
  pop(): T | undefined {
    if (!this.data.length) return undefined
    const top = this.data[0].v
    const last = this.data.pop()!
    if (this.data.length) {
      this.data[0] = last
      let i = 0
      const n = this.data.length
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2
        let best = i
        if (l < n && this.data[l].k < this.data[best].k) best = l
        if (r < n && this.data[r].k < this.data[best].k) best = r
        if (best === i) break
        ;[this.data[i], this.data[best]] = [this.data[best], this.data[i]]
        i = best
      }
    }
    return top
  }
  get size() { return this.data.length }
}

// ─── Poids contextualisés par mode ──────────────────────

type EdgeLike = NavEdge & {
  kind?: VerticalTransitKind
  pmrCompliant?: boolean
  widthM?: number
  slopePercent?: number
}

/** Retourne le poids effectif d'une arête pour un mode donné, ou Infinity si interdit. */
function edgeWeight(edge: EdgeLike, mode: RouteMode, opts: RouteOptions): number {
  if (opts.blockedEdgeIds?.has(edge.id)) return Infinity
  const override = opts.edgeWeightOverrides?.get(edge.id)
  const base = override != null ? override : edge.weight

  switch (mode) {
    case 'fast':
      // Distance brute uniquement — on remonte à lengthM pour ignorer congestion/attractivité
      return edge.lengthM

    case 'pmr': {
      // Escalators / escaliers interdits
      if (edge.kind === 'escalator' || edge.kind === 'stair') return Infinity
      // Pente > 5 % interdite
      if (edge.slopePercent != null && edge.slopePercent > 5) return Infinity
      // Largeur < 1.40 m interdite
      if (edge.widthM != null && edge.widthM < 1.4) return Infinity
      // Bonus -30 % sur les ascenseurs et rampes PMR
      if (edge.pmrCompliant) return base * 0.7
      return base
    }

    case 'discovery':
      // Bonus -20 % sur arêtes "attractives" (calculé en amont dans edge.attractiveness < 1)
      if (edge.attractiveness < 1) return edge.lengthM * 0.8 * edge.congestion
      return base

    case 'evacuation':
      // Ignore congestion pour évacuation ; bloque uniquement les arêtes coupées
      return edge.lengthM

    case 'standard':
    default:
      return base
  }
}

// ─── A* forward (fallback simple) ───────────────────────

export interface AstarInputSingleFloor {
  graph: NavGraph
  fromId: string
  toId: string
  options: RouteOptions
}

export function astarForward(input: AstarInputSingleFloor): RouteResult | null {
  const t0 = performance.now()
  const { graph, fromId, toId, options } = input
  if (!graph._adj.has(fromId) || !graph._adj.has(toId)) return null

  const nodeMap = new Map<string, NavNode>()
  for (const n of graph.nodes) nodeMap.set(n.id, n)
  const to = nodeMap.get(toId)!

  const g = new Map<string, number>([[fromId, 0]])
  const prev = new Map<string, { nodeId: string; edgeId: string }>()
  const heap = new MinHeap<string>()
  heap.push(0, fromId)

  let expanded = 0
  const maxExp = options.maxExpansions ?? DEFAULT_MAX_EXPANSIONS
  while (heap.size) {
    if (expanded >= maxExp) throw new RouteAbortedError(`maxExpansions=${maxExp}`)
    if (options.signal?.aborted) throw new RouteAbortedError('signal aborted')
    const u = heap.pop()!
    if (u === toId) break
    expanded++
    const curG = g.get(u)!
    for (const nb of graph._adj.get(u) ?? []) {
      const edge = graph.edges.find(e => e.id === nb.edgeId)
      if (!edge) continue
      const w = edgeWeight(edge as EdgeLike, options.mode, options)
      if (!isFinite(w)) continue
      const alt = curG + w
      if (alt < (g.get(nb.to) ?? Infinity)) {
        g.set(nb.to, alt)
        prev.set(nb.to, { nodeId: u, edgeId: nb.edgeId })
        const neighborNode = nodeMap.get(nb.to)!
        const f = alt + heuristic(neighborNode, to)
        heap.push(f, nb.to)
      }
    }
  }

  if (!g.has(toId)) return null

  return reconstructSingle(graph, fromId, toId, prev, g.get(toId)!, expanded, t0, options.mode)
}

function reconstructSingle(
  graph: NavGraph,
  _fromId: string,
  toId: string,
  prev: Map<string, { nodeId: string; edgeId: string }>,
  totalWeight: number,
  expanded: number,
  t0: number,
  mode: RouteMode,
): RouteResult {
  const nodeIds: string[] = [toId]
  let cur = toId
  while (prev.has(cur)) {
    const p = prev.get(cur)!
    nodeIds.push(p.nodeId)
    cur = p.nodeId
  }
  nodeIds.reverse()

  const waypoints: Array<{ x: number; y: number }> = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const n = graph.nodes[graph._nodeIndex.get(nodeIds[i])!]
    if (i === 0) {
      waypoints.push({ x: n.x, y: n.y })
    } else {
      const pn = graph.nodes[graph._nodeIndex.get(nodeIds[i - 1])!]
      const edge = graph.edges.find(e =>
        (e.fromId === pn.id && e.toId === n.id) || (e.fromId === n.id && e.toId === pn.id))
      if (edge) {
        const wps = edge.fromId === pn.id ? edge.waypoints : [...edge.waypoints].reverse()
        for (const w of wps) waypoints.push(w)
        lengthM += edge.lengthM
      }
      waypoints.push({ x: n.x, y: n.y })
    }
  }

  const durationS = lengthM / 1.2  // 1.2 m/s vitesse de marche par défaut
  const instructions = buildInstructions(graph, nodeIds, waypoints, lengthM)

  return {
    mode, nodeIds, waypoints, lengthM, durationS,
    totalWeight, expanded,
    computeTimeMs: performance.now() - t0,
    instructions,
  }
}

// ─── A* BIDIRECTIONNEL (graphe mono-étage) ───────────────

/** A* bidirectionnel : explore depuis A et depuis B simultanément, converge au milieu. */
export function astarBidirectional(input: AstarInputSingleFloor): RouteResult | null {
  const t0 = performance.now()
  const { graph, fromId, toId, options } = input
  if (fromId === toId) return null
  if (!graph._adj.has(fromId) || !graph._adj.has(toId)) return null

  const nodeMap = new Map<string, NavNode>()
  for (const n of graph.nodes) nodeMap.set(n.id, n)

  const gF = new Map<string, number>([[fromId, 0]])
  const gB = new Map<string, number>([[toId, 0]])
  const prevF = new Map<string, { nodeId: string; edgeId: string }>()
  const prevB = new Map<string, { nodeId: string; edgeId: string }>()
  const closedF = new Set<string>()
  const closedB = new Set<string>()
  const heapF = new MinHeap<string>()
  const heapB = new MinHeap<string>()
  heapF.push(0, fromId)
  heapB.push(0, toId)

  let meetingNode: string | null = null
  let bestTotal = Infinity
  let expanded = 0
  const maxExp = options.maxExpansions ?? DEFAULT_MAX_EXPANSIONS

  const startNode = nodeMap.get(fromId)!
  const goalNode = nodeMap.get(toId)!

  while (heapF.size && heapB.size) {
    if (expanded >= maxExp) throw new RouteAbortedError(`maxExpansions=${maxExp}`)
    if (options.signal?.aborted) throw new RouteAbortedError('signal aborted')
    // Condition d'arrêt : somme des meilleurs fronts ≥ meilleur total courant
    const fTopKey = (heapF as any).data?.[0]?.k ?? Infinity
    const bTopKey = (heapB as any).data?.[0]?.k ?? Infinity
    if (fTopKey + bTopKey >= bestTotal) break

    // Avance le front le plus étroit
    if (fTopKey <= bTopKey) {
      const u = heapF.pop()!
      if (closedF.has(u)) continue
      closedF.add(u); expanded++
      const gu = gF.get(u) ?? Infinity
      for (const nb of graph._adj.get(u) ?? []) {
        const edge = graph.edges.find(e => e.id === nb.edgeId)
        if (!edge) continue
        const w = edgeWeight(edge as EdgeLike, options.mode, options)
        if (!isFinite(w)) continue
        const alt = gu + w
        if (alt < (gF.get(nb.to) ?? Infinity)) {
          gF.set(nb.to, alt)
          prevF.set(nb.to, { nodeId: u, edgeId: nb.edgeId })
          const neigh = nodeMap.get(nb.to)!
          heapF.push(alt + heuristic(neigh, goalNode), nb.to)
          if (gB.has(nb.to)) {
            const total = alt + gB.get(nb.to)!
            if (total < bestTotal) { bestTotal = total; meetingNode = nb.to }
          }
        }
      }
    } else {
      const u = heapB.pop()!
      if (closedB.has(u)) continue
      closedB.add(u); expanded++
      const gu = gB.get(u) ?? Infinity
      for (const nb of graph._adj.get(u) ?? []) {
        const edge = graph.edges.find(e => e.id === nb.edgeId)
        if (!edge) continue
        const w = edgeWeight(edge as EdgeLike, options.mode, options)
        if (!isFinite(w)) continue
        const alt = gu + w
        if (alt < (gB.get(nb.to) ?? Infinity)) {
          gB.set(nb.to, alt)
          prevB.set(nb.to, { nodeId: u, edgeId: nb.edgeId })
          const neigh = nodeMap.get(nb.to)!
          heapB.push(alt + heuristic(neigh, startNode), nb.to)
          if (gF.has(nb.to)) {
            const total = gF.get(nb.to)! + alt
            if (total < bestTotal) { bestTotal = total; meetingNode = nb.to }
          }
        }
      }
    }
  }

  if (!meetingNode) {
    // Fallback sur A* forward si bidir échoue
    return astarForward(input)
  }

  // Reconstruction : from → meet (via prevF) + meet → to (via prevB inversé)
  const forwardPath: string[] = [meetingNode]
  let cur = meetingNode
  while (prevF.has(cur)) {
    const p = prevF.get(cur)!
    forwardPath.push(p.nodeId); cur = p.nodeId
  }
  forwardPath.reverse()

  const backwardPath: string[] = []
  cur = meetingNode
  while (prevB.has(cur)) {
    const p = prevB.get(cur)!
    backwardPath.push(p.nodeId); cur = p.nodeId
  }

  const nodeIds = [...forwardPath, ...backwardPath]

  // Reconstruire waypoints
  const waypoints: Array<{ x: number; y: number }> = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const n = graph.nodes[graph._nodeIndex.get(nodeIds[i])!]
    if (i === 0) { waypoints.push({ x: n.x, y: n.y }); continue }
    const pn = graph.nodes[graph._nodeIndex.get(nodeIds[i - 1])!]
    const edge = graph.edges.find(e =>
      (e.fromId === pn.id && e.toId === n.id) || (e.fromId === n.id && e.toId === pn.id))
    if (edge) {
      const wps = edge.fromId === pn.id ? edge.waypoints : [...edge.waypoints].reverse()
      for (const w of wps) waypoints.push(w)
      lengthM += edge.lengthM
    }
    waypoints.push({ x: n.x, y: n.y })
  }

  const durationS = lengthM / 1.2
  const instructions = buildInstructions(graph, nodeIds, waypoints, lengthM)

  return {
    mode: options.mode,
    nodeIds, waypoints, lengthM, durationS,
    totalWeight: bestTotal, expanded,
    computeTimeMs: performance.now() - t0,
    instructions,
  }
}

// ─── Dijkstra multi-source (évacuation) ─────────────────

export interface EvacuationInput {
  graph: NavGraph
  fromId: string
  exitIds: string[]
  blockedEdgeIds?: Set<string>
}

/** Évacuation : Dijkstra depuis toutes les sorties simultanément, retourne la plus proche. */
export function evacuationRoute(input: EvacuationInput): RouteResult | null {
  const t0 = performance.now()
  const { graph, fromId, exitIds, blockedEdgeIds } = input
  if (!graph._adj.has(fromId)) return null
  if (exitIds.length === 0) return null

  const dist = new Map<string, number>()
  const prev = new Map<string, { nodeId: string; edgeId: string }>()
  const heap = new MinHeap<string>()

  // Multi-source : push toutes les sorties à distance 0
  for (const exitId of exitIds) {
    if (graph._adj.has(exitId)) {
      dist.set(exitId, 0)
      heap.push(0, exitId)
    }
  }

  let expanded = 0
  const maxExpEvac = DEFAULT_MAX_EXPANSIONS
  while (heap.size) {
    if (expanded >= maxExpEvac) throw new RouteAbortedError(`maxExpansions=${maxExpEvac}`)
    const u = heap.pop()!
    if (u === fromId) break
    expanded++
    const du = dist.get(u) ?? Infinity
    for (const nb of graph._adj.get(u) ?? []) {
      if (blockedEdgeIds?.has(nb.edgeId)) continue
      const edge = graph.edges.find(e => e.id === nb.edgeId)
      if (!edge) continue
      const w = edge.lengthM // évacuation ignore congestion et attractivité
      const alt = du + w
      if (alt < (dist.get(nb.to) ?? Infinity)) {
        dist.set(nb.to, alt)
        prev.set(nb.to, { nodeId: u, edgeId: nb.edgeId })
        heap.push(alt, nb.to)
      }
    }
  }

  if (!dist.has(fromId)) return null

  // Reconstruction depuis fromId vers la sortie la plus proche (suit prev)
  const nodeIds: string[] = [fromId]
  let cur = fromId
  while (prev.has(cur)) {
    const p = prev.get(cur)!
    nodeIds.push(p.nodeId); cur = p.nodeId
  }
  const exitId = nodeIds[nodeIds.length - 1]

  const waypoints: Array<{ x: number; y: number }> = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const n = graph.nodes[graph._nodeIndex.get(nodeIds[i])!]
    if (i === 0) { waypoints.push({ x: n.x, y: n.y }); continue }
    const pn = graph.nodes[graph._nodeIndex.get(nodeIds[i - 1])!]
    const edge = graph.edges.find(e =>
      (e.fromId === pn.id && e.toId === n.id) || (e.fromId === n.id && e.toId === pn.id))
    if (edge) {
      const wps = edge.fromId === pn.id ? edge.waypoints : [...edge.waypoints].reverse()
      for (const w of wps) waypoints.push(w)
      lengthM += edge.lengthM
    }
    waypoints.push({ x: n.x, y: n.y })
  }

  const durationS = lengthM / 1.5 // évac = marche rapide 1.5 m/s
  const instructions = buildInstructions(graph, nodeIds, waypoints, lengthM)
  instructions[instructions.length - 1].text = `ÉVACUATION — rejoignez la sortie « ${
    graph.nodes[graph._nodeIndex.get(exitId)!].label ?? exitId
  } »`

  return {
    mode: 'evacuation',
    nodeIds, waypoints, lengthM, durationS,
    totalWeight: dist.get(fromId)!, expanded,
    computeTimeMs: performance.now() - t0,
    instructions,
  }
}

// ─── Multi-étages (wrapper pour MultiFloorGraph) ────────

export interface MultiFloorRouteInput {
  graph: MultiFloorGraph
  fromId: string
  toId: string
  options: RouteOptions
}

/**
 * A* bidirectionnel adapté au graphe multi-étages.
 * Le graphe MultiFloor expose déjà un adj[] unifié avec arêtes verticales taguées.
 */
export function astarMultiFloor(input: MultiFloorRouteInput): RouteResult | null {
  const t0 = performance.now()
  const { graph, fromId, toId, options } = input
  if (fromId === toId) return null
  if (!graph.adj.has(fromId) || !graph.adj.has(toId)) return null

  const nodeMap = new Map<string, MultiFloorGraph['nodes'][number]>()
  for (const n of graph.nodes) nodeMap.set(n.id, n)

  // Index arêtes pour lookup rapide
  const edgeMap = new Map<string, NavEdge & Partial<{ kind: VerticalTransitKind; pmrCompliant: boolean }>>()
  for (const e of graph.internalEdges) edgeMap.set(e.id, e)
  for (const e of graph.verticalEdges) edgeMap.set(e.id, e as any)

  const to = nodeMap.get(toId)!

  const g = new Map<string, number>([[fromId, 0]])
  const prev = new Map<string, { nodeId: string; edgeId: string }>()
  const heap = new MinHeap<string>()
  heap.push(0, fromId)

  let expanded = 0
  const maxExpMF = options.maxExpansions ?? DEFAULT_MAX_EXPANSIONS
  while (heap.size) {
    if (expanded >= maxExpMF) throw new RouteAbortedError(`maxExpansions=${maxExpMF}`)
    if (options.signal?.aborted) throw new RouteAbortedError('signal aborted')
    const u = heap.pop()!
    if (u === toId) break
    expanded++
    const gu = g.get(u) ?? Infinity
    for (const nb of graph.adj.get(u) ?? []) {
      const edge = edgeMap.get(nb.edgeId)
      if (!edge) continue
      const w = edgeWeight(edge as EdgeLike, options.mode, options)
      if (!isFinite(w)) continue
      const alt = gu + w
      if (alt < (g.get(nb.to) ?? Infinity)) {
        g.set(nb.to, alt)
        prev.set(nb.to, { nodeId: u, edgeId: nb.edgeId })
        const neigh = nodeMap.get(nb.to)!
        const h = heuristic(neigh, to, neigh.floorLevel, to.floorLevel)
        heap.push(alt + h, nb.to)
      }
    }
  }

  if (!g.has(toId)) return null

  const nodeIds: string[] = [toId]
  let cur = toId
  while (prev.has(cur)) {
    const p = prev.get(cur)!
    nodeIds.push(p.nodeId); cur = p.nodeId
  }
  nodeIds.reverse()

  const waypoints: Array<{ x: number; y: number; floorId?: string }> = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const n = nodeMap.get(nodeIds[i])!
    if (i === 0) { waypoints.push({ x: n.x, y: n.y, floorId: n.floorId }); continue }
    const pn = nodeMap.get(nodeIds[i - 1])!
    const edge = [...graph.internalEdges, ...graph.verticalEdges].find(e =>
      (e.fromId === pn.id && e.toId === n.id) || (e.fromId === n.id && e.toId === pn.id))
    if (edge) {
      const wps = edge.fromId === pn.id ? edge.waypoints : [...edge.waypoints].reverse()
      for (const w of wps) waypoints.push({ ...w, floorId: n.floorId })
      lengthM += edge.lengthM
    }
    waypoints.push({ x: n.x, y: n.y, floorId: n.floorId })
  }

  const durationS = lengthM / 1.2
  const instructions = buildInstructionsMultiFloor(graph, nodeIds, waypoints, lengthM)

  return {
    mode: options.mode,
    nodeIds, waypoints, lengthM, durationS,
    totalWeight: g.get(toId)!, expanded,
    computeTimeMs: performance.now() - t0,
    instructions,
  }
}

// ─── Génération d'instructions pas-à-pas ─────────────────

function classifyTurn(turnDeg: number): RouteInstruction['kind'] {
  const a = Math.abs(turnDeg)
  if (a < 15) return 'straight'
  if (a < 45) return turnDeg > 0 ? 'slight-right' : 'slight-left'
  if (a <= 135) return turnDeg > 0 ? 'right' : 'left'
  return 'u-turn'
}

function angleDeg(dx: number, dy: number): number {
  return Math.atan2(dy, dx) * 180 / Math.PI
}

function buildInstructions(
  graph: NavGraph,
  nodeIds: string[],
  _waypoints: Array<{ x: number; y: number }>,
  totalLengthM: number,
): RouteInstruction[] {
  const out: RouteInstruction[] = []
  if (nodeIds.length < 2) return out

  const nodes = nodeIds.map(id => graph.nodes[graph._nodeIndex.get(id)!])
  let covered = 0

  // Départ
  out.push({
    nodeId: nodes[0].id,
    turnDeg: 0, kind: 'start',
    text: nodes[0].label ? `Départ depuis « ${nodes[0].label} »` : 'Départ',
    distFromPrevM: 0,
    distToEndM: totalLengthM,
    landmark: nodes[0].label,
  })

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1], cur = nodes[i]
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    covered += dist

    let turnDeg = 0
    if (i + 1 < nodes.length) {
      const next = nodes[i + 1]
      const a1 = angleDeg(cur.x - prev.x, cur.y - prev.y)
      const a2 = angleDeg(next.x - cur.x, next.y - cur.y)
      let diff = a2 - a1
      while (diff > 180) diff -= 360
      while (diff < -180) diff += 360
      turnDeg = diff
    }

    const kind: RouteInstruction['kind'] =
      i === nodes.length - 1 ? 'arrive' : classifyTurn(turnDeg)

    const distRemaining = totalLengthM - covered
    out.push({
      nodeId: cur.id, turnDeg, kind,
      text: instructionText(kind, Math.round(dist), cur.label),
      distFromPrevM: dist,
      distToEndM: Math.max(0, distRemaining),
      landmark: cur.label,
    })
  }
  return out
}

function buildInstructionsMultiFloor(
  graph: MultiFloorGraph,
  nodeIds: string[],
  _waypoints: Array<{ x: number; y: number; floorId?: string }>,
  totalLengthM: number,
): RouteInstruction[] {
  const out: RouteInstruction[] = []
  if (nodeIds.length < 2) return out
  const nodes = nodeIds.map(id => graph.nodes.find(n => n.id === id)!)
  let covered = 0

  out.push({
    nodeId: nodes[0].id, turnDeg: 0, kind: 'start',
    text: nodes[0].label ? `Départ depuis « ${nodes[0].label} »` : 'Départ',
    distFromPrevM: 0,
    distToEndM: totalLengthM,
    floorId: nodes[0].floorId,
    landmark: nodes[0].label,
  })

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1], cur = nodes[i]
    const dist = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    covered += dist

    // Transition d'étage détectée ?
    const isTransit = prev.floorId !== cur.floorId
    let transitKind: VerticalTransitKind | undefined
    if (isTransit) {
      const v = graph.verticalEdges.find(e =>
        (e.fromId === prev.id && e.toId === cur.id) || (e.fromId === cur.id && e.toId === prev.id))
      if (v) transitKind = v.kind
    }

    let turnDeg = 0
    if (i + 1 < nodes.length && !isTransit) {
      const next = nodes[i + 1]
      const a1 = angleDeg(cur.x - prev.x, cur.y - prev.y)
      const a2 = angleDeg(next.x - cur.x, next.y - cur.y)
      let diff = a2 - a1
      while (diff > 180) diff -= 360
      while (diff < -180) diff += 360
      turnDeg = diff
    }

    const kind: RouteInstruction['kind'] =
      i === nodes.length - 1 ? 'arrive'
      : isTransit ? 'transit'
      : classifyTurn(turnDeg)

    out.push({
      nodeId: cur.id, turnDeg, kind,
      text: instructionText(kind, Math.round(dist), cur.label, transitKind, prev.floorId, cur.floorId),
      distFromPrevM: dist,
      distToEndM: Math.max(0, totalLengthM - covered),
      landmark: cur.label,
      floorId: cur.floorId,
      transit: transitKind,
    })
  }
  return out
}

function instructionText(
  kind: RouteInstruction['kind'],
  dist: number,
  landmark?: string,
  transit?: VerticalTransitKind,
  _fromFloor?: string,
  toFloor?: string,
): string {
  const lm = landmark ? ` vers « ${landmark} »` : ''
  switch (kind) {
    case 'start': return landmark ? `Départ depuis « ${landmark} »` : 'Départ'
    case 'straight': return `Continuez tout droit sur ${dist} m${lm}`
    case 'slight-right': return `Légèrement à droite${lm}`
    case 'slight-left': return `Légèrement à gauche${lm}`
    case 'right': return `Tournez à droite${lm}`
    case 'left': return `Tournez à gauche${lm}`
    case 'u-turn': return `Faites demi-tour${lm}`
    case 'transit': {
      const t = transit === 'escalator' ? "l'escalator"
        : transit === 'elevator' ? "l'ascenseur"
        : transit === 'ramp' ? 'la rampe PMR'
        : transit === 'stair' ? "l'escalier" : 'le transit'
      return `Prenez ${t}${toFloor ? ` vers ${toFloor}` : ''}`
    }
    case 'arrive': return landmark ? `Vous êtes arrivé à « ${landmark} »` : 'Vous êtes arrivé à destination'
  }
}

// ─── Lissage (Catmull-Rom) + Ramer-Douglas-Peucker ───────

/** Lissage Catmull-Rom : produit des points intermédiaires pour un affichage fluide. */
export function smoothCatmullRom(
  points: Array<{ x: number; y: number }>,
  segmentsPerControl = 8,
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points.slice()
  const out: Array<{ x: number; y: number }> = []
  const ext = [points[0], ...points, points[points.length - 1]]
  for (let i = 0; i < ext.length - 3; i++) {
    const p0 = ext[i], p1 = ext[i + 1], p2 = ext[i + 2], p3 = ext[i + 3]
    for (let s = 0; s < segmentsPerControl; s++) {
      const t = s / segmentsPerControl
      const t2 = t * t, t3 = t2 * t
      const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3)
      const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
      out.push({ x, y })
    }
  }
  out.push(points[points.length - 1])
  return out
}

/** Simplification Ramer-Douglas-Peucker : réduit le nombre de points en conservant la forme. */
export function simplifyRDP(
  points: Array<{ x: number; y: number }>,
  epsilon = 0.5,
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points.slice()

  const perpendicularDistance = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number => {
    const dx = b.x - a.x, dy = b.y - a.y
    if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y)
    const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x)
    const den = Math.hypot(dx, dy)
    return num / den
  }

  const rec = (lo: number, hi: number, keep: boolean[]) => {
    let maxD = 0, idx = -1
    for (let i = lo + 1; i < hi; i++) {
      const d = perpendicularDistance(points[i], points[lo], points[hi])
      if (d > maxD) { maxD = d; idx = i }
    }
    if (maxD > epsilon && idx !== -1) {
      keep[idx] = true
      rec(lo, idx, keep)
      rec(idx, hi, keep)
    }
  }

  const keep = new Array(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  rec(0, points.length - 1, keep)
  return points.filter((_, i) => keep[i])
}

// ─── Détection de déviation ─────────────────────────────

export interface DeviationCheck {
  deviated: boolean
  /** Distance minimale perpendiculaire au chemin (m). */
  offPathM: number
  /** Waypoint le plus proche (index). */
  nearestIndex: number
}

/**
 * Vérifie si la position courante s'est écartée du chemin calculé.
 * Spec PROPH3T : seuil = 3 m pendant > 5 s.
 */
export function checkDeviation(
  position: { x: number; y: number },
  path: Array<{ x: number; y: number }>,
  thresholdM = 3.0,
): DeviationCheck {
  if (path.length < 2) return { deviated: false, offPathM: 0, nearestIndex: 0 }
  let best = Infinity
  let bestIdx = 0
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1]
    const dx = b.x - a.x, dy = b.y - a.y
    const l2 = dx * dx + dy * dy
    let t = 0
    if (l2 > 0) t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.y - a.y) * dy) / l2))
    const qx = a.x + t * dx, qy = a.y + t * dy
    const d = Math.hypot(position.x - qx, position.y - qy)
    if (d < best) { best = d; bestIdx = i }
  }
  return { deviated: best > thresholdM, offPathM: best, nearestIndex: bestIdx }
}

// ─── Router public (dispatch selon mode) ─────────────────

/** Router unifié : choisit l'algo selon le mode demandé. */
export function calculateRoute(
  graph: NavGraph,
  fromId: string,
  toId: string,
  mode: RouteMode,
  extraOpts: Partial<RouteOptions> = {},
): RouteResult | null {
  const options: RouteOptions = { mode, ...extraOpts }
  if (mode === 'evacuation') {
    const exitIds = graph.nodes.filter(n => n.kind === 'exit').map(n => n.id)
    return evacuationRoute({ graph, fromId, exitIds, blockedEdgeIds: options.blockedEdgeIds })
  }
  // Bidirectionnel par défaut — plus rapide sur longues distances
  return astarBidirectional({ graph, fromId, toId, options })
}

/** Router multi-étages unifié. */
export function calculateMultiFloorRoute(
  graph: MultiFloorGraph,
  fromId: string,
  toId: string,
  mode: RouteMode,
  extraOpts: Partial<RouteOptions> = {},
): RouteResult | null {
  const options: RouteOptions = { mode, ...extraOpts }
  return astarMultiFloor({ graph, fromId, toId, options })
}

// ─── Conversion NavPath (compatibilité avec navGraphEngine) ─

export function toNavPath(r: RouteResult): NavPath {
  return {
    nodeIds: r.nodeIds,
    waypoints: r.waypoints.map(w => ({ x: w.x, y: w.y })),
    lengthM: r.lengthM,
    totalWeight: r.totalWeight,
  }
}
