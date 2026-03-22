// ═══ GRAPH BUILDER WORKER — Navigation graph construction from floor data ═══
// Builds navigation graphs from zone/POI/transition data.
// Can be used independently or to feed data into the astar worker.

// Minimal types for worker context
interface Floor {
  id: string
  level: string
  order: number
  widthM: number
  heightM: number
  zones: Zone[]
  transitions: TransitionNode[]
}

interface Zone {
  id: string
  floorId: string
  label: string
  type: string
  x: number
  y: number
  w: number
  h: number
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  surfaceM2?: number
}

interface POI {
  id: string
  floorId: string
  label: string
  type: string
  x: number
  y: number
  pmr: boolean
  color: string
  icon: string
}

interface TransitionNode {
  id: string
  type: string
  fromFloor: string
  toFloor: string
  x: number
  y: number
  pmr: boolean
  capacityPerMin: number
  label: string
}

interface NavigationNode {
  id: string
  x: number
  y: number
  floorId: string
  poiId?: string
  label?: string
  isTransition: boolean
  zoneId?: string
}

interface NavigationEdge {
  id: string
  from: string
  to: string
  distanceM: number
  pmr: boolean
  floorId: string
}

interface InterFloorEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  transitionId: string
  timeSec: number
  pmr: boolean
}

interface NavigationGraph {
  nodes: NavigationNode[]
  edges: NavigationEdge[]
  floorId: string
  interFloorEdges: InterFloorEdge[]
}

interface GraphStats {
  totalNodes: number
  totalEdges: number
  totalInterFloorEdges: number
  nodesPerFloor: Record<string, number>
  avgEdgeDistanceM: number
  pmrEdgePercent: number
  connectedComponents: number
}

// ═══ MESSAGE TYPES ═══

interface BuildSingleFloorInput {
  action: 'buildSingleFloor'
  floor: Floor
  zones: Zone[]
  pois: POI[]
  gridResolution?: number
}

interface BuildMultiFloorInput {
  action: 'buildMultiFloor'
  floors: Floor[]
  zones: Zone[]
  pois: POI[]
  transitions: TransitionNode[]
  gridResolution?: number
}

interface AnalyzeGraphInput {
  action: 'analyzeGraph'
  graph: NavigationGraph
}

type WorkerInput = BuildSingleFloorInput | BuildMultiFloorInput | AnalyzeGraphInput

interface ProgressMessage {
  type: 'progress'
  percent: number
}

interface SingleFloorResult {
  type: 'result'
  action: 'buildSingleFloor'
  data: NavigationGraph
}

interface MultiFloorResult {
  type: 'result'
  action: 'buildMultiFloor'
  data: NavigationGraph
}

interface AnalyzeResult {
  type: 'result'
  action: 'analyzeGraph'
  data: GraphStats
}

interface ErrorMessage {
  type: 'error'
  message: string
}

type OutMessage = ProgressMessage | SingleFloorResult | MultiFloorResult | AnalyzeResult | ErrorMessage

function postOut(msg: OutMessage): void {
  self.postMessage(msg)
}

// ═══ CONSTANTS ═══

const NON_WALKABLE_TYPES = new Set([
  'technique', 'backoffice', 'financier',
])

const STAIR_TRANSITION_TYPES = new Set([
  'escalier_fixe', 'escalier_secours',
])

// ═══ GEOMETRY ═══

function distanceM(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

// ═══ SINGLE FLOOR GRAPH BUILDER ═══

function buildSingleFloorGraph(
  floor: Floor,
  zones: Zone[],
  pois: POI[],
  gridRes: number
): { nodes: NavigationNode[]; edges: NavigationEdge[] } {
  const nodes: NavigationNode[] = []
  const edges: NavigationEdge[] = []
  let edgeIndex = 0

  const floorZones = zones.filter(z => z.floorId === floor.id)
  const gridNodeMap = new Map<string, string>()
  const floorGridNodes: NavigationNode[] = []

  // 1. Create grid nodes inside walkable zones
  for (let gx = 0; gx < gridRes; gx++) {
    for (let gy = 0; gy < gridRes; gy++) {
      const px = (gx + 0.5) / gridRes
      const py = (gy + 0.5) / gridRes

      const containingZone = floorZones.find(z =>
        px >= z.x && px <= z.x + z.w &&
        py >= z.y && py <= z.y + z.h
      )

      if (!containingZone) continue
      if (NON_WALKABLE_TYPES.has(containingZone.type)) continue

      const nodeId = `nav-${floor.id}-${gx}-${gy}`
      const node: NavigationNode = {
        id: nodeId,
        x: px,
        y: py,
        floorId: floor.id,
        isTransition: false,
        zoneId: containingZone.id,
      }
      floorGridNodes.push(node)
      gridNodeMap.set(`${gx}-${gy}`, nodeId)
    }
  }

  nodes.push(...floorGridNodes)

  // 2. Create edges (8-connected grid)
  const directions: [number, number][] = [
    [1, 0], [0, 1], [-1, 0], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]

  for (let gx = 0; gx < gridRes; gx++) {
    for (let gy = 0; gy < gridRes; gy++) {
      const fromKey = `${gx}-${gy}`
      const fromId = gridNodeMap.get(fromKey)
      if (!fromId) continue

      for (const [ddx, ddy] of directions) {
        const nx = gx + ddx
        const ny = gy + ddy
        if (nx < 0 || nx >= gridRes || ny < 0 || ny >= gridRes) continue

        const toKey = `${nx}-${ny}`
        const toId = gridNodeMap.get(toKey)
        if (!toId) continue

        if (fromId >= toId) continue

        const fromNode = floorGridNodes.find(n => n.id === fromId)
        const toNode = floorGridNodes.find(n => n.id === toId)
        if (!fromNode || !toNode) continue

        const dist = distanceM(
          fromNode.x, fromNode.y, toNode.x, toNode.y,
          floor.widthM, floor.heightM
        )

        edges.push({
          id: `edge-${floor.id}-${edgeIndex++}`,
          from: fromId,
          to: toId,
          distanceM: Math.round(dist * 100) / 100,
          pmr: true,
          floorId: floor.id,
        })
      }
    }
  }

  // 3. Add POI nodes
  const floorPois = pois.filter(p => p.floorId === floor.id)
  for (const poi of floorPois) {
    const poiNodeId = `poi-${poi.id}`
    nodes.push({
      id: poiNodeId,
      x: poi.x,
      y: poi.y,
      floorId: floor.id,
      poiId: poi.id,
      label: poi.label,
      isTransition: false,
    })

    // Connect to nearest grid node
    let nearestId: string | undefined
    let nearestDist = Infinity
    for (const gNode of floorGridNodes) {
      const d = distanceM(poi.x, poi.y, gNode.x, gNode.y, floor.widthM, floor.heightM)
      if (d < nearestDist) {
        nearestDist = d
        nearestId = gNode.id
      }
    }

    if (nearestId) {
      edges.push({
        id: `edge-poi-${floor.id}-${edgeIndex++}`,
        from: poiNodeId,
        to: nearestId,
        distanceM: Math.round(nearestDist * 100) / 100,
        pmr: poi.pmr,
        floorId: floor.id,
      })
    }
  }

  // 4. Add transition nodes from floor.transitions
  for (const trans of floor.transitions) {
    const transNodeId = `trans-${trans.id}-${floor.id}`
    if (!nodes.some(n => n.id === transNodeId)) {
      nodes.push({
        id: transNodeId,
        x: trans.x,
        y: trans.y,
        floorId: floor.id,
        label: trans.label,
        isTransition: true,
      })
    }

    let nearestId: string | undefined
    let nearestDist = Infinity
    for (const gNode of floorGridNodes) {
      const d = distanceM(trans.x, trans.y, gNode.x, gNode.y, floor.widthM, floor.heightM)
      if (d < nearestDist) {
        nearestDist = d
        nearestId = gNode.id
      }
    }

    if (nearestId) {
      const isPmr = trans.pmr
      edges.push({
        id: `edge-trans-${floor.id}-${edgeIndex++}`,
        from: transNodeId,
        to: nearestId,
        distanceM: Math.round(nearestDist * 100) / 100,
        pmr: isPmr,
        floorId: floor.id,
      })
    }
  }

  return { nodes, edges }
}

// ═══ MULTI-FLOOR GRAPH BUILDER ═══

function buildMultiFloorGraph(input: BuildMultiFloorInput): NavigationGraph {
  const { floors, zones, pois, transitions, gridResolution: gridRes = 50 } = input
  const allNodes: NavigationNode[] = []
  const allEdges: NavigationEdge[] = []
  const interFloorEdges: InterFloorEdge[] = []

  for (let fi = 0; fi < floors.length; fi++) {
    const floor = floors[fi]
    postOut({ type: 'progress', percent: Math.round((fi / floors.length) * 60) })

    const { nodes, edges } = buildSingleFloorGraph(floor, zones, pois, gridRes)
    allNodes.push(...nodes)
    allEdges.push(...edges)
  }

  postOut({ type: 'progress', percent: 70 })

  // Build inter-floor edges from transitions
  for (const trans of transitions) {
    const fromFloor = floors.find(f => f.level === trans.fromFloor)
    const toFloor = floors.find(f => f.level === trans.toFloor)
    if (!fromFloor || !toFloor) continue

    const fromNodeId = `trans-${trans.id}-${fromFloor.id}`
    const toNodeId = `trans-${trans.id}-${toFloor.id}`

    const fromExists = allNodes.some(n => n.id === fromNodeId)
    const toExists = allNodes.some(n => n.id === toNodeId)

    // If transition node doesn't exist on a floor, create it
    if (!fromExists) {
      allNodes.push({
        id: fromNodeId,
        x: trans.x,
        y: trans.y,
        floorId: fromFloor.id,
        label: trans.label,
        isTransition: true,
      })
    }
    if (!toExists) {
      allNodes.push({
        id: toNodeId,
        x: trans.x,
        y: trans.y,
        floorId: toFloor.id,
        label: trans.label,
        isTransition: true,
      })
    }

    let timeSec = 30
    if (trans.type === 'ascenseur') timeSec = 45
    else if (trans.type === 'escalator_montant' || trans.type === 'escalator_descendant') timeSec = 20
    else if (trans.type === 'rampe_pmr') timeSec = 60
    else if (trans.type === 'monte_charge') timeSec = 90

    interFloorEdges.push({
      id: `ifl-${trans.id}`,
      fromNodeId,
      toNodeId,
      transitionId: trans.id,
      timeSec,
      pmr: trans.pmr,
    })
  }

  postOut({ type: 'progress', percent: 90 })

  return {
    nodes: allNodes,
    edges: allEdges,
    floorId: 'multi-floor',
    interFloorEdges,
  }
}

// ═══ GRAPH ANALYSIS ═══

function analyzeGraph(graph: NavigationGraph): GraphStats {
  const nodesPerFloor: Record<string, number> = {}
  for (const node of graph.nodes) {
    nodesPerFloor[node.floorId] = (nodesPerFloor[node.floorId] ?? 0) + 1
  }

  let totalEdgeDist = 0
  let pmrEdgeCount = 0
  for (const edge of graph.edges) {
    totalEdgeDist += edge.distanceM
    if (edge.pmr) pmrEdgeCount++
  }

  const avgEdgeDistanceM = graph.edges.length > 0
    ? Math.round((totalEdgeDist / graph.edges.length) * 100) / 100
    : 0

  const pmrEdgePercent = graph.edges.length > 0
    ? Math.round((pmrEdgeCount / graph.edges.length) * 1000) / 10
    : 0

  // Connected components via BFS
  const connectedComponents = countConnectedComponents(graph)

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    totalInterFloorEdges: graph.interFloorEdges.length,
    nodesPerFloor,
    avgEdgeDistanceM,
    pmrEdgePercent,
    connectedComponents,
  }
}

function countConnectedComponents(graph: NavigationGraph): number {
  const visited = new Set<string>()
  const adjacency = new Map<string, string[]>()

  for (const node of graph.nodes) {
    adjacency.set(node.id, [])
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to)
    adjacency.get(edge.to)?.push(edge.from)
  }
  for (const ife of graph.interFloorEdges) {
    adjacency.get(ife.fromNodeId)?.push(ife.toNodeId)
    adjacency.get(ife.toNodeId)?.push(ife.fromNodeId)
  }

  let components = 0

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue
    components++

    // BFS
    const queue: string[] = [node.id]
    visited.add(node.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = adjacency.get(current) ?? []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }
  }

  return components
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  try {
    const input = e.data

    if (input.action === 'buildSingleFloor') {
      const gridRes = input.gridResolution ?? 50
      const { nodes, edges } = buildSingleFloorGraph(input.floor, input.zones, input.pois, gridRes)
      const graph: NavigationGraph = {
        nodes,
        edges,
        floorId: input.floor.id,
        interFloorEdges: [],
      }
      postOut({ type: 'progress', percent: 100 })
      postOut({ type: 'result', action: 'buildSingleFloor', data: graph })
    } else if (input.action === 'buildMultiFloor') {
      const graph = buildMultiFloorGraph(input)
      postOut({ type: 'progress', percent: 100 })
      postOut({ type: 'result', action: 'buildMultiFloor', data: graph })
    } else if (input.action === 'analyzeGraph') {
      const stats = analyzeGraph(input.graph)
      postOut({ type: 'progress', percent: 100 })
      postOut({ type: 'result', action: 'analyzeGraph', data: stats })
    }
  } catch (err) {
    postOut({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in graphBuilder worker',
    })
  }
}
