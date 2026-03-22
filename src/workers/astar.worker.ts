// ═══ A* PATHFINDING WORKER — Navigation graph builder + pathfinder ═══

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

interface PathResult {
  path: NavigationNode[]
  totalDistanceM: number
  totalTimeSec: number
  floorsTraversed: string[]
  pmrCompliant: boolean
  instructions: string[]
}

// ═══ MESSAGE TYPES ═══

interface BuildGraphInput {
  action: 'buildGraph'
  floors: Floor[]
  zones: Zone[]
  pois: POI[]
  transitions: TransitionNode[]
  gridResolution?: number  // default 50
}

interface FindPathInput {
  action: 'findPath'
  graph: NavigationGraph
  fromId: string
  toId: string
  pmrOnly: boolean
  floorDimensions?: Record<string, { widthM: number; heightM: number }>
}

type WorkerInput = BuildGraphInput | FindPathInput

interface ProgressMessage {
  type: 'progress'
  percent: number
}

interface BuildGraphResult {
  type: 'result'
  action: 'buildGraph'
  data: NavigationGraph
}

interface FindPathResult {
  type: 'result'
  action: 'findPath'
  data: PathResult
}

interface ErrorMessage {
  type: 'error'
  message: string
}

type OutMessage = ProgressMessage | BuildGraphResult | FindPathResult | ErrorMessage

function postOut(msg: OutMessage): void {
  self.postMessage(msg)
}

// ═══ GEOMETRY ═══

const NON_CIRCULATION_TYPES = new Set([
  'technique', 'backoffice', 'financier',
])

function distanceM(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

function euclideanHeuristic(
  a: NavigationNode, b: NavigationNode,
  widthM: number, heightM: number
): number {
  return distanceM(a.x, a.y, b.x, b.y, widthM, heightM)
}

// ═══ GRAPH BUILDER ═══

function buildGraph(input: BuildGraphInput): NavigationGraph {
  const { floors, zones, pois, transitions, gridResolution: gridRes = 50 } = input
  const nodes: NavigationNode[] = []
  const edges: NavigationEdge[] = []
  const interFloorEdges: InterFloorEdge[] = []

  let edgeIndex = 0

  // Map from (floorId, gridX, gridY) to node id for connectivity
  const gridNodeMap = new Map<string, string>()

  for (let fi = 0; fi < floors.length; fi++) {
    const floor = floors[fi]
    const floorZones = zones.filter(z => z.floorId === floor.id)

    postOut({ type: 'progress', percent: Math.round((fi / floors.length) * 40) })

    // Create grid nodes at walkable positions (inside zones, excluding non-circulation)
    const floorGridNodes: NavigationNode[] = []
    // Track which grid cells are accessible
    const accessibleGrid = new Set<string>()

    for (let gx = 0; gx < gridRes; gx++) {
      for (let gy = 0; gy < gridRes; gy++) {
        const px = (gx + 0.5) / gridRes
        const py = (gy + 0.5) / gridRes

        // Check if point is inside any zone
        const containingZone = floorZones.find(z =>
          px >= z.x && px <= z.x + z.w &&
          py >= z.y && py <= z.y + z.h
        )

        if (!containingZone) continue

        // Mark inaccessible cells (non-circulation zones)
        if (NON_CIRCULATION_TYPES.has(containingZone.type)) continue

        const nodeId = `nav-${floor.id}-${gx}-${gy}`
        const node: NavigationNode = {
          id: nodeId,
          x: px,
          y: py,
          floorId: floor.id,
          isTransition: false,
        }
        floorGridNodes.push(node)
        gridNodeMap.set(`${floor.id}-${gx}-${gy}`, nodeId)
        accessibleGrid.add(`${gx}-${gy}`)
      }
    }

    nodes.push(...floorGridNodes)

    // Create edges between adjacent grid nodes (4-connected + 4-diagonal)
    const directions: [number, number][] = [
      [1, 0], [0, 1], [-1, 0], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]

    for (let gx = 0; gx < gridRes; gx++) {
      for (let gy = 0; gy < gridRes; gy++) {
        const fromKey = `${floor.id}-${gx}-${gy}`
        const fromId = gridNodeMap.get(fromKey)
        if (!fromId) continue

        for (const [ddx, ddy] of directions) {
          const nx = gx + ddx
          const ny = gy + ddy
          if (nx < 0 || nx >= gridRes || ny < 0 || ny >= gridRes) continue

          const toKey = `${floor.id}-${nx}-${ny}`
          const toId = gridNodeMap.get(toKey)
          if (!toId) continue

          // Only create one direction per pair (from < to lexically)
          if (fromId >= toId) continue

          const fromNode = floorGridNodes.find(n => n.id === fromId)
          const toNode = floorGridNodes.find(n => n.id === toId)
          if (!fromNode || !toNode) continue

          const dist = distanceM(
            fromNode.x, fromNode.y, toNode.x, toNode.y,
            floor.widthM, floor.heightM
          )

          edges.push({
            id: `edge-${edgeIndex++}`,
            from: fromId,
            to: toId,
            distanceM: Math.round(dist * 100) / 100,
            pmr: true, // Grid edges default to PMR accessible
            floorId: floor.id,
          })
        }
      }
    }

    // Add POI nodes and connect to nearest grid node
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
          id: `edge-poi-${edgeIndex++}`,
          from: poiNodeId,
          to: nearestId,
          distanceM: Math.round(nearestDist * 100) / 100,
          pmr: poi.pmr,
          floorId: floor.id,
        })
      }
    }

    // Add transition nodes
    const floorTransitions = transitions.filter(
      t => t.fromFloor === floor.level || t.toFloor === floor.level
    )
    for (const trans of floorTransitions) {
      const transNodeId = `trans-${trans.id}-${floor.id}`
      const existingNode = nodes.find(n => n.id === transNodeId)
      if (!existingNode) {
        nodes.push({
          id: transNodeId,
          x: trans.x,
          y: trans.y,
          floorId: floor.id,
          label: trans.label,
          isTransition: true,
        })
      }

      // Connect to nearest grid node
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
        // Mark stair edges as pmr: false
        const isPmr = trans.pmr
        edges.push({
          id: `edge-trans-${edgeIndex++}`,
          from: transNodeId,
          to: nearestId,
          distanceM: Math.round(nearestDist * 100) / 100,
          pmr: isPmr,
          floorId: floor.id,
        })
      }
    }
  }

  postOut({ type: 'progress', percent: 60 })

  // Simplify graph: remove redundant nodes on straight lines
  simplifyGraph(nodes, edges)

  postOut({ type: 'progress', percent: 75 })

  // Build inter-floor edges
  for (const trans of transitions) {
    const fromFloor = floors.find(f => f.level === trans.fromFloor)
    const toFloor = floors.find(f => f.level === trans.toFloor)
    if (!fromFloor || !toFloor) continue

    const fromNodeId = `trans-${trans.id}-${fromFloor.id}`
    const toNodeId = `trans-${trans.id}-${toFloor.id}`

    const fromExists = nodes.some(n => n.id === fromNodeId)
    const toExists = nodes.some(n => n.id === toNodeId)
    if (!fromExists || !toExists) continue

    // Time estimate based on transition type
    let timeSec = 30
    if (trans.type === 'ascenseur') timeSec = 45
    else if (trans.type === 'escalator_montant' || trans.type === 'escalator_descendant') timeSec = 20
    else if (trans.type === 'rampe_pmr') timeSec = 60

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
    nodes,
    edges,
    floorId: 'multi-floor',
    interFloorEdges,
  }
}

// ═══ GRAPH SIMPLIFICATION ═══

function simplifyGraph(nodes: NavigationNode[], edges: NavigationEdge[]): void {
  // Remove nodes that have exactly 2 edges (straight pass-through)
  // and merge the two edges into one
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, [])
    adjacency.get(edge.from)!.push(edge.id)
    adjacency.get(edge.to)!.push(edge.id)
  }

  const removedNodeIds = new Set<string>()
  const removedEdgeIds = new Set<string>()

  for (const node of nodes) {
    // Only simplify grid nodes (no POI, no transitions, no labels)
    if (node.poiId || node.label || node.isTransition) continue

    const nodeEdgeIds = adjacency.get(node.id)
    if (!nodeEdgeIds || nodeEdgeIds.length !== 2) continue

    const edgeA = edges.find(e => e.id === nodeEdgeIds[0])
    const edgeB = edges.find(e => e.id === nodeEdgeIds[1])
    if (!edgeA || !edgeB) continue
    if (edgeA.floorId !== edgeB.floorId) continue
    if (removedEdgeIds.has(edgeA.id) || removedEdgeIds.has(edgeB.id)) continue

    // Check collinearity: both edges go roughly in the same direction
    const otherA = edgeA.from === node.id ? edgeA.to : edgeA.from
    const otherB = edgeB.from === node.id ? edgeB.to : edgeB.from
    if (otherA === otherB) continue

    const nodeObj = node
    const nodeA = nodes.find(n => n.id === otherA)
    const nodeB = nodes.find(n => n.id === otherB)
    if (!nodeA || !nodeB) continue

    // Check if roughly collinear (angle deviation < 15 degrees)
    const dx1 = nodeA.x - nodeObj.x
    const dy1 = nodeA.y - nodeObj.y
    const dx2 = nodeB.x - nodeObj.x
    const dy2 = nodeB.y - nodeObj.y

    const dot = dx1 * dx2 + dy1 * dy2
    const mag1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const mag2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

    if (mag1 === 0 || mag2 === 0) continue

    const cosAngle = dot / (mag1 * mag2)
    // cos(165 degrees) = -0.966; if angle is close to 180, nodes are collinear
    if (cosAngle > -0.96) continue

    // Merge: remove node and both edges, create one edge from otherA to otherB
    const newDist = edgeA.distanceM + edgeB.distanceM
    const pmr = edgeA.pmr && edgeB.pmr

    removedNodeIds.add(node.id)
    removedEdgeIds.add(edgeA.id)
    removedEdgeIds.add(edgeB.id)

    edges.push({
      id: `edge-simplified-${otherA}-${otherB}`,
      from: otherA,
      to: otherB,
      distanceM: Math.round(newDist * 100) / 100,
      pmr,
      floorId: edgeA.floorId,
    })

    // Update adjacency for further simplification
    const adjA = adjacency.get(otherA)
    if (adjA) {
      const idx = adjA.indexOf(edgeA.id)
      if (idx >= 0) adjA[idx] = `edge-simplified-${otherA}-${otherB}`
    }
    const adjB = adjacency.get(otherB)
    if (adjB) {
      const idx = adjB.indexOf(edgeB.id)
      if (idx >= 0) adjB[idx] = `edge-simplified-${otherA}-${otherB}`
    }
  }

  // Remove marked nodes and edges in place
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (removedNodeIds.has(nodes[i].id)) nodes.splice(i, 1)
  }
  for (let i = edges.length - 1; i >= 0; i--) {
    if (removedEdgeIds.has(edges[i].id)) edges.splice(i, 1)
  }
}

// ═══ A* PATHFINDING ═══

interface AStarNode {
  id: string
  g: number
  f: number
  parent: string | null
}

// Walk speed: 3.6 km/h = 1.0 m/s
const WALK_SPEED_MS = 1.0
const PMR_WALK_SPEED_MS = 0.5

function findPath(input: FindPathInput): PathResult {
  const { graph, fromId, toId, pmrOnly, floorDimensions } = input

  const startNode = graph.nodes.find(n => n.id === fromId)
  const endNode = graph.nodes.find(n => n.id === toId)

  if (!startNode || !endNode) {
    return {
      path: [],
      totalDistanceM: 0,
      totalTimeSec: 0,
      floorsTraversed: [],
      pmrCompliant: true,
      instructions: ['Point de depart ou d\'arrivee introuvable.'],
    }
  }

  // Floor dimensions lookup
  const defaultWidthM = 200
  const defaultHeightM = 150
  const getFloorDims = (floorId: string): { widthM: number; heightM: number } => {
    if (floorDimensions && floorDimensions[floorId]) {
      return floorDimensions[floorId]
    }
    return { widthM: defaultWidthM, heightM: defaultHeightM }
  }

  // Build adjacency list
  const adjacency = new Map<string, { nodeId: string; cost: number; pmr: boolean; isInterFloor: boolean; transitionId?: string }[]>()

  for (const node of graph.nodes) {
    adjacency.set(node.id, [])
  }

  for (const edge of graph.edges) {
    const weight = pmrOnly && !edge.pmr ? Infinity : edge.distanceM
    adjacency.get(edge.from)?.push({ nodeId: edge.to, cost: weight, pmr: edge.pmr, isInterFloor: false })
    adjacency.get(edge.to)?.push({ nodeId: edge.from, cost: weight, pmr: edge.pmr, isInterFloor: false })
  }

  for (const ife of graph.interFloorEdges) {
    const weight = pmrOnly && !ife.pmr ? Infinity : ife.timeSec * 1.3
    adjacency.get(ife.fromNodeId)?.push({ nodeId: ife.toNodeId, cost: weight, pmr: ife.pmr, isInterFloor: true, transitionId: ife.transitionId })
    adjacency.get(ife.toNodeId)?.push({ nodeId: ife.fromNodeId, cost: weight, pmr: ife.pmr, isInterFloor: true, transitionId: ife.transitionId })
  }

  const endDims = getFloorDims(endNode.floorId)

  // A* algorithm
  const openSet = new Map<string, AStarNode>()
  const closedSet = new Set<string>()
  const allNodes = new Map<string, AStarNode>()

  const startAstar: AStarNode = {
    id: fromId,
    g: 0,
    f: euclideanHeuristic(startNode, endNode, endDims.widthM, endDims.heightM),
    parent: null,
  }

  openSet.set(fromId, startAstar)
  allNodes.set(fromId, startAstar)

  let iterations = 0
  const maxIterations = graph.nodes.length * 3

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++

    if (iterations % 1000 === 0) {
      postOut({ type: 'progress', percent: Math.min(90, Math.round((iterations / maxIterations) * 90)) })
    }

    // Find node in open set with lowest f
    let currentId = ''
    let lowestF = Infinity
    for (const [id, node] of openSet) {
      if (node.f < lowestF) {
        lowestF = node.f
        currentId = id
      }
    }

    if (currentId === toId) break

    const current = openSet.get(currentId)
    if (!current) break

    openSet.delete(currentId)
    closedSet.add(currentId)

    const neighbors = adjacency.get(currentId) ?? []
    for (const neighbor of neighbors) {
      if (closedSet.has(neighbor.nodeId)) continue
      if (!Number.isFinite(neighbor.cost)) continue

      const tentativeG = current.g + neighbor.cost

      const existing = allNodes.get(neighbor.nodeId)
      if (existing && tentativeG >= existing.g) continue

      const neighborNavNode = graph.nodes.find(n => n.id === neighbor.nodeId)
      if (!neighborNavNode) continue

      const h = euclideanHeuristic(neighborNavNode, endNode, endDims.widthM, endDims.heightM)
      const astarNode: AStarNode = {
        id: neighbor.nodeId,
        g: tentativeG,
        f: tentativeG + h,
        parent: currentId,
      }

      allNodes.set(neighbor.nodeId, astarNode)
      openSet.set(neighbor.nodeId, astarNode)
    }
  }

  // Reconstruct path
  const pathNodeIds: string[] = []
  let current = allNodes.get(toId)

  if (!current || (current.parent === null && current.id !== fromId)) {
    return {
      path: [],
      totalDistanceM: 0,
      totalTimeSec: 0,
      floorsTraversed: [],
      pmrCompliant: pmrOnly,
      instructions: ['Aucun chemin trouve entre les deux points.'],
    }
  }

  while (current) {
    pathNodeIds.unshift(current.id)
    current = current.parent ? allNodes.get(current.parent) : undefined
  }

  // Post-process: smooth path (remove unnecessary zigzags)
  const smoothedIds = smoothPath(pathNodeIds, graph, getFloorDims)

  // Build result
  const pathNodes: NavigationNode[] = []
  let totalDistanceM = 0
  let isPmrCompliant = true
  const floorsSet = new Set<string>()
  const instructions: string[] = []

  // Track segments for instruction generation
  let segmentDistM = 0
  let lastTurnAngle: number | null = null

  for (let i = 0; i < smoothedIds.length; i++) {
    const node = graph.nodes.find(n => n.id === smoothedIds[i])
    if (!node) continue

    pathNodes.push(node)
    floorsSet.add(node.floorId)

    if (i > 0) {
      const prev = graph.nodes.find(n => n.id === smoothedIds[i - 1])
      if (prev) {
        const dims = getFloorDims(node.floorId)
        const d = distanceM(prev.x, prev.y, node.x, node.y, dims.widthM, dims.heightM)
        totalDistanceM += d
        segmentDistM += d

        // Check PMR compliance
        const edge = graph.edges.find(e =>
          (e.from === prev.id && e.to === node.id) ||
          (e.from === node.id && e.to === prev.id)
        )
        if (edge && !edge.pmr) isPmrCompliant = false

        // Detect floor changes
        if (prev.floorId !== node.floorId) {
          const ife = graph.interFloorEdges.find(e =>
            (e.fromNodeId === prev.id && e.toNodeId === node.id) ||
            (e.fromNodeId === node.id && e.toNodeId === prev.id)
          )
          if (ife && !ife.pmr) isPmrCompliant = false

          if (segmentDistM > 0) {
            instructions.push(`Continuez ${Math.round(segmentDistM)}m`)
          }
          instructions.push(`Changez d'etage via ${node.label ?? 'transition'} (${prev.floorId} -> ${node.floorId})`)
          segmentDistM = 0
          lastTurnAngle = null
        } else if (i < smoothedIds.length - 1) {
          // Detect direction changes for turn instructions
          const next = graph.nodes.find(n => n.id === smoothedIds[i + 1])
          if (next && next.floorId === node.floorId) {
            const angle1 = Math.atan2(
              (node.y - prev.y) * dims.heightM,
              (node.x - prev.x) * dims.widthM
            )
            const angle2 = Math.atan2(
              (next.y - node.y) * dims.heightM,
              (next.x - node.x) * dims.widthM
            )
            let turnAngle = (angle2 - angle1) * (180 / Math.PI)
            // Normalize to -180..180
            turnAngle = ((turnAngle + 540) % 360) - 180

            if (Math.abs(turnAngle) > 30) {
              if (segmentDistM > 1) {
                instructions.push(`Continuez ${Math.round(segmentDistM)}m`)
                segmentDistM = 0
              }
              if (turnAngle > 30 && turnAngle < 150) {
                instructions.push('Tournez a droite')
              } else if (turnAngle < -30 && turnAngle > -150) {
                instructions.push('Tournez a gauche')
              } else if (Math.abs(turnAngle) >= 150) {
                instructions.push('Faites demi-tour')
              }
              lastTurnAngle = turnAngle
            }
          }
        }
      }
    }

    if (node.label && node.poiId) {
      if (segmentDistM > 1) {
        instructions.push(`Continuez ${Math.round(segmentDistM)}m`)
        segmentDistM = 0
      }
      instructions.push(`Passez devant ${node.label}`)
    }
  }

  // Final segment
  if (segmentDistM > 1) {
    instructions.push(`Continuez ${Math.round(segmentDistM)}m`)
  }

  // Add arrival instruction
  const lastNode = pathNodes[pathNodes.length - 1]
  if (lastNode?.label) {
    instructions.push(`Vous etes arrive a ${lastNode.label}`)
  } else {
    instructions.push('Vous etes arrive a destination')
  }

  if (instructions.length === 0) {
    instructions.push('Suivez le chemin direct.')
  }

  const walkSpeed = pmrOnly ? PMR_WALK_SPEED_MS : WALK_SPEED_MS
  const totalTimeSec = Math.round(totalDistanceM / walkSpeed)

  return {
    path: pathNodes,
    totalDistanceM: Math.round(totalDistanceM * 10) / 10,
    totalTimeSec,
    floorsTraversed: Array.from(floorsSet),
    pmrCompliant: isPmrCompliant,
    instructions,
  }
}

// ═══ PATH SMOOTHING ═══

function smoothPath(
  pathNodeIds: string[],
  graph: NavigationGraph,
  getFloorDims: (floorId: string) => { widthM: number; heightM: number }
): string[] {
  if (pathNodeIds.length <= 2) return pathNodeIds

  const result: string[] = [pathNodeIds[0]]

  let i = 0
  while (i < pathNodeIds.length - 1) {
    const currentNode = graph.nodes.find(n => n.id === pathNodeIds[i])
    if (!currentNode) {
      i++
      continue
    }

    // Try to skip intermediate nodes by checking if we can go directly
    // to a further node while staying roughly on the path
    let farthest = i + 1
    for (let j = i + 2; j < pathNodeIds.length; j++) {
      const targetNode = graph.nodes.find(n => n.id === pathNodeIds[j])
      if (!targetNode) break
      // Don't skip across floor changes
      if (targetNode.floorId !== currentNode.floorId) break
      // Don't skip POI or transition nodes
      const intermediateNode = graph.nodes.find(n => n.id === pathNodeIds[j - 1])
      if (intermediateNode && (intermediateNode.poiId || intermediateNode.isTransition || intermediateNode.label)) break

      // Check if direct line is roughly the same distance as going through intermediates
      const dims = getFloorDims(currentNode.floorId)
      const directDist = distanceM(
        currentNode.x, currentNode.y, targetNode.x, targetNode.y,
        dims.widthM, dims.heightM
      )
      let pathDist = 0
      let valid = true
      for (let k = i; k < j; k++) {
        const a = graph.nodes.find(n => n.id === pathNodeIds[k])
        const b = graph.nodes.find(n => n.id === pathNodeIds[k + 1])
        if (!a || !b) { valid = false; break }
        pathDist += distanceM(a.x, a.y, b.x, b.y, dims.widthM, dims.heightM)
      }

      if (!valid) break
      // Accept smoothing if direct is within 10% of path distance
      if (directDist <= pathDist * 1.1) {
        farthest = j
      } else {
        break
      }
    }

    i = farthest
    result.push(pathNodeIds[i])
  }

  return result
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  try {
    const input = e.data

    if (input.action === 'buildGraph') {
      const graph = buildGraph(input)
      postOut({ type: 'progress', percent: 100 })
      postOut({ type: 'result', action: 'buildGraph', data: graph })
    } else if (input.action === 'findPath') {
      const result = findPath(input)
      postOut({ type: 'progress', percent: 100 })
      postOut({ type: 'result', action: 'findPath', data: result })
    }
  } catch (err) {
    postOut({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in astar worker',
    })
  }
}
