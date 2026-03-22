// ═══ SIGNALETICS OPTIMIZER WORKER — Optimal signage placement per floor ═══

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
  lux?: number
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

type SignageType =
  | 'totem_3m' | 'totem_5m' | 'panneau_dir_suspendu' | 'panneau_dir_mural'
  | 'banniere_suspend' | 'marquage_sol' | 'borne_interactive'
  | 'enseigne_facade' | 'plaque_porte' | 'numero_cellule'
  | 'pictogramme_pmr' | 'panneau_toilettes' | 'sortie_secours_led'
  | 'bloc_autonome' | 'plan_evacuation' | 'interdiction_fumee'

interface SignageItem {
  id: string
  floorId: string
  type: SignageType
  x: number
  y: number
  orientationDeg: number
  poseHeightM: number
  textHeightMm: number
  maxReadingDistanceM: number
  visibilityScore: number
  isLuminous: boolean
  requiresBAES: boolean
  content?: string
  ref: string
  capexFcfa: number
  normRef: string
  proph3tNote?: string
  autoPlaced?: boolean
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

interface SignaleticsGap {
  id: string
  floorId: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  distanceM: number
  maxAllowedM: number
  severity: 'critique' | 'elevee' | 'normale'
}

interface OptimizerInput {
  floor: Floor
  graph: NavigationGraph
  existingSignage: SignageItem[]
  zones: Zone[]
}

interface OptimizerOutput {
  newSignage: SignageItem[]
  gaps: SignaleticsGap[]
}

// ═══ SIGNAGE CATALOG ═══

const SIGNAGE_CATALOG: Record<SignageType, {
  name: string
  defaultHeightMm: number
  priceFcfa: number
  norm: string
  luminous: boolean
}> = {
  totem_3m:             { name: 'Totem pylone 3m',              defaultHeightMm: 1200, priceFcfa: 1_800_000, norm: 'NF X 08-003', luminous: false },
  totem_5m:             { name: 'Totem pylone 5m',              defaultHeightMm: 2000, priceFcfa: 3_200_000, norm: 'NF X 08-003', luminous: false },
  panneau_dir_suspendu: { name: 'Panneau directionnel suspendu', defaultHeightMm: 200,  priceFcfa: 180_000,   norm: 'ISO 7010',     luminous: false },
  panneau_dir_mural:    { name: 'Panneau directionnel mural',   defaultHeightMm: 300,  priceFcfa: 120_000,   norm: 'ISO 7010',     luminous: false },
  banniere_suspend:     { name: 'Bandeau suspendu',             defaultHeightMm: 200,  priceFcfa: 95_000,    norm: 'NF X 08-003', luminous: false },
  marquage_sol:         { name: 'Fleche directionnelle sol',    defaultHeightMm: 0,    priceFcfa: 45_000,    norm: 'ISO 23601',   luminous: false },
  borne_interactive:    { name: 'Borne numerique tactile 55"',  defaultHeightMm: 0,    priceFcfa: 4_500_000, norm: 'EN 301 549',  luminous: true },
  enseigne_facade:      { name: 'Enseigne lumineuse LED',       defaultHeightMm: 600,  priceFcfa: 850_000,   norm: 'NF C 15-100', luminous: true },
  plaque_porte:         { name: 'Plaque de porte gravee',       defaultHeightMm: 80,   priceFcfa: 35_000,    norm: 'NF X 08-003', luminous: false },
  numero_cellule:       { name: 'Numero cellule commerciale',   defaultHeightMm: 150,  priceFcfa: 25_000,    norm: '',             luminous: false },
  pictogramme_pmr:      { name: 'Symbole acces PMR',            defaultHeightMm: 200,  priceFcfa: 18_000,    norm: 'ISO 7001',    luminous: false },
  panneau_toilettes:    { name: 'Toilettes H/F/PMR',            defaultHeightMm: 200,  priceFcfa: 45_000,    norm: 'ISO 7010',    luminous: false },
  sortie_secours_led:   { name: 'Panneau sortie secours LED',   defaultHeightMm: 150,  priceFcfa: 85_000,    norm: 'NF EN 60598-2-22', luminous: true },
  bloc_autonome:        { name: 'BAES eclairage secours',       defaultHeightMm: 100,  priceFcfa: 120_000,   norm: 'NF C 71-800', luminous: true },
  plan_evacuation:      { name: "Plan d'evacuation encadre",    defaultHeightMm: 300,  priceFcfa: 65_000,    norm: 'NF X 08-070', luminous: false },
  interdiction_fumee:   { name: 'Panneau interdiction',         defaultHeightMm: 200,  priceFcfa: 12_000,    norm: 'ISO 7010',    luminous: false },
}

// ═══ SIGNAGE SPEC CALCULATION ═══

interface SignaleticsSpec {
  recommendedType: SignageType
  poseHeightM: number
  textHeightMm: number
  maxReadingDistanceM: number
  isLuminousRequired: boolean
  isBAESRequired: boolean
  spacingM: number
  orientationDeg: number
  capexFcfa: number
  normRef: string
  justification: string
}

function calculateSpec(
  zone: Zone,
  corridorWidthM: number,
  ceilingHeightM: number,
  flowAngleDeg: number,
  edgeLengthM: number
): SignaleticsSpec {
  const maxReadingDistanceM = Math.min(edgeLengthM, corridorWidthM * 3)
  const textHeightMm = Math.ceil((maxReadingDistanceM * 1000) / 200)

  // Pose height: H_regard (1.60m) + D_max * tan(15deg)
  const rawPoseHeight = 1.60 + maxReadingDistanceM * 0.268
  const poseHeightM = Math.max(2.20, Math.min(rawPoseHeight, ceilingHeightM - 0.3))

  // Recommended type
  let recommendedType: SignageType
  if (ceilingHeightM >= 4.5) {
    recommendedType = edgeLengthM > 20 ? 'totem_5m' : 'totem_3m'
  } else if (corridorWidthM >= 4) {
    recommendedType = 'panneau_dir_suspendu'
  } else {
    recommendedType = 'panneau_dir_mural'
  }

  const zoneLux = zone.lux ?? 300
  const isLuminousRequired = zoneLux < 200
  const isBAESRequired = zoneLux < 50

  // Spacing: H_panneau(mm) x 100 / 1000 -> meters
  const signageHeightMm = SIGNAGE_CATALOG[recommendedType].defaultHeightMm
  const spacingM = (signageHeightMm * 100) / 1000

  const catalog = SIGNAGE_CATALOG[recommendedType]

  const justificationParts: string[] = [
    `Distance lecture ${maxReadingDistanceM.toFixed(1)}m -> texte ${textHeightMm}mm min.`,
    `Pose a ${poseHeightM.toFixed(2)}m (plafond ${ceilingHeightM}m).`,
  ]
  if (isLuminousRequired) justificationParts.push('Panneau lumineux requis (lux < 200).')
  if (isBAESRequired) justificationParts.push('BAES obligatoire (lux < 50).')

  return {
    recommendedType,
    poseHeightM: Math.round(poseHeightM * 100) / 100,
    textHeightMm,
    maxReadingDistanceM: Math.round(maxReadingDistanceM * 10) / 10,
    isLuminousRequired,
    isBAESRequired,
    spacingM,
    orientationDeg: flowAngleDeg,
    capexFcfa: catalog.priceFcfa,
    normRef: catalog.norm,
    justification: justificationParts.join(' '),
  }
}

// ═══ DECISION NODE CHECK ═══

function isDecisionNode(nodeId: string, graph: NavigationGraph): boolean {
  const connectedEdges = graph.edges.filter(e => e.from === nodeId || e.to === nodeId)
  return connectedEdges.length >= 3
}

// ═══ DISTANCE HELPER ═══

function calcDistance(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

// ═══ OPTIMIZER ═══

function optimize(input: OptimizerInput): OptimizerOutput {
  const { floor, graph, existingSignage, zones } = input
  const floorZones = zones.filter(z => z.floorId === floor.id)
  const floorEdges = graph.edges.filter(e => e.floorId === floor.id)
  const newSignage: SignageItem[] = []
  const gaps: SignaleticsGap[] = []

  let signIndex = existingSignage.filter(s => s.floorId === floor.id).length + 1
  let gapIndex = 0
  const totalEdges = floorEdges.length

  for (let ei = 0; ei < totalEdges; ei++) {
    const edge = floorEdges[ei]

    if (ei % 20 === 0) {
      self.postMessage({ type: 'progress', percent: Math.round((ei / totalEdges) * 70) })
    }

    const fromNode = graph.nodes.find(n => n.id === edge.from)
    const toNode = graph.nodes.find(n => n.id === edge.to)
    if (!fromNode || !toNode) continue

    const edgeLengthM = edge.distanceM
    if (edgeLengthM < 5) continue

    // Find closest zone to edge midpoint
    const midX = (fromNode.x + toNode.x) / 2
    const midY = (fromNode.y + toNode.y) / 2

    const zone = floorZones.find(z =>
      midX >= z.x && midX <= z.x + z.w &&
      midY >= z.y && midY <= z.y + z.h
    ) ?? floorZones[0]

    if (!zone) continue

    // Flow angle
    const flowAngle = Math.atan2(
      (toNode.y - fromNode.y) * floor.heightM,
      (toNode.x - fromNode.x) * floor.widthM
    ) * (180 / Math.PI)

    const corridorWidthM = Math.min(zone.w * floor.widthM, zone.h * floor.heightM)
    const ceilingHeightM = zone.type === 'parking' ? 2.8 : 3.5

    const spec = calculateSpec(zone, corridorWidthM, ceilingHeightM, flowAngle, edgeLengthM)

    // Number of panels: ceil(length / spacingM) + 1
    const numPanels = Math.ceil(edgeLengthM / spec.spacingM) + 1

    for (let i = 0; i < numPanels; i++) {
      const t = numPanels === 1 ? 0.5 : i / (numPanels - 1)
      const px = fromNode.x + t * (toNode.x - fromNode.x)
      const py = fromNode.y + t * (toNode.y - fromNode.y)

      // Check if existing signage nearby (within 3m)
      const hasExisting = existingSignage.some(s => {
        if (s.floorId !== floor.id) return false
        return calcDistance(s.x, s.y, px, py, floor.widthM, floor.heightM) < 3
      })

      // Also check already-placed new signage
      const hasNew = newSignage.some(s =>
        calcDistance(s.x, s.y, px, py, floor.widthM, floor.heightM) < 3
      )

      if (hasExisting || hasNew) continue

      // Determine if luminous version needed
      const isLuminous = spec.isLuminousRequired || (zone.lux !== undefined && zone.lux < 200)

      newSignage.push({
        id: `sig-opt-${floor.id}-${signIndex++}`,
        floorId: floor.id,
        type: spec.recommendedType,
        x: px,
        y: py,
        orientationDeg: spec.orientationDeg,
        poseHeightM: spec.poseHeightM,
        textHeightMm: spec.textHeightMm,
        maxReadingDistanceM: spec.maxReadingDistanceM,
        visibilityScore: 75,
        isLuminous,
        requiresBAES: spec.isBAESRequired,
        ref: `${spec.recommendedType.toUpperCase()}-AUTO`,
        capexFcfa: spec.capexFcfa,
        normRef: spec.normRef,
        proph3tNote: spec.justification,
        autoPlaced: true,
      })
    }

    // Decision node: mandatory panel at nodes with >= 3 edges
    if (isDecisionNode(toNode.id, graph)) {
      const hasConfirmation = [...existingSignage, ...newSignage].some(s => {
        if (s.floorId !== floor.id) return false
        return calcDistance(s.x, s.y, toNode.x, toNode.y, floor.widthM, floor.heightM) < 2
      })

      if (!hasConfirmation) {
        newSignage.push({
          id: `sig-decision-${floor.id}-${signIndex++}`,
          floorId: floor.id,
          type: 'panneau_dir_suspendu',
          x: toNode.x,
          y: toNode.y,
          orientationDeg: flowAngle,
          poseHeightM: 2.85,
          textHeightMm: 40,
          maxReadingDistanceM: 8,
          visibilityScore: 80,
          isLuminous: false,
          requiresBAES: false,
          content: 'Confirmation direction',
          ref: 'PANNEAU-DIR-DECISION',
          capexFcfa: 180_000,
          normRef: 'ISO 7010',
          proph3tNote: 'Panneau de confirmation obligatoire a noeud de decision (>= 3 aretes).',
          autoPlaced: true,
        })
      }
    }

    // BAES placement for dark zones (lux < 50)
    if (zone.lux !== undefined && zone.lux < 50) {
      const baesSpacingM = 15
      const numBaes = Math.ceil(edgeLengthM / baesSpacingM)

      for (let i = 0; i < numBaes; i++) {
        const t = numBaes === 1 ? 0.5 : i / (numBaes - 1)
        const bx = fromNode.x + t * (toNode.x - fromNode.x)
        const by = fromNode.y + t * (toNode.y - fromNode.y)

        const hasNearby = [...existingSignage, ...newSignage].some(s => {
          if (s.floorId !== floor.id || s.type !== 'bloc_autonome') return false
          return calcDistance(s.x, s.y, bx, by, floor.widthM, floor.heightM) < 10
        })

        if (!hasNearby) {
          newSignage.push({
            id: `baes-opt-${floor.id}-${signIndex++}`,
            floorId: floor.id,
            type: 'bloc_autonome',
            x: bx,
            y: by,
            orientationDeg: 0,
            poseHeightM: 2.50,
            textHeightMm: 0,
            maxReadingDistanceM: 15,
            visibilityScore: 90,
            isLuminous: true,
            requiresBAES: true,
            ref: 'BAES-AUTO',
            capexFcfa: 120_000,
            normRef: 'NF C 71-800',
            proph3tNote: `BAES obligatoire tous les 15m — zone "${zone.label}" < 50 lux.`,
            autoPlaced: true,
          })
        }
      }
    }
  }

  self.postMessage({ type: 'progress', percent: 80 })

  // ═══ GAP DETECTION ═══
  // Check for visual continuity breaks between all signage on this floor
  const allFloorSignage = [
    ...existingSignage.filter(s => s.floorId === floor.id),
    ...newSignage,
  ].sort((a, b) => a.x - b.x || a.y - b.y)

  for (let i = 0; i < allFloorSignage.length - 1; i++) {
    const a = allFloorSignage[i]
    const b = allFloorSignage[i + 1]
    const dist = calcDistance(a.x, a.y, b.x, b.y, floor.widthM, floor.heightM)

    const heightMm = SIGNAGE_CATALOG[a.type]?.defaultHeightMm ?? 300
    const maxAllowed = (heightMm * 100) / 1000

    if (dist > maxAllowed) {
      let severity: SignaleticsGap['severity'] = 'normale'
      if (dist > maxAllowed * 2) severity = 'critique'
      else if (dist > maxAllowed * 1.5) severity = 'elevee'

      gaps.push({
        id: `gap-${floor.id}-${gapIndex++}`,
        floorId: floor.id,
        fromX: a.x,
        fromY: a.y,
        toX: b.x,
        toY: b.y,
        distanceM: Math.round(dist * 10) / 10,
        maxAllowedM: maxAllowed,
        severity,
      })
    }
  }

  self.postMessage({ type: 'progress', percent: 95 })

  return { newSignage, gaps }
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<OptimizerInput>) => {
  try {
    const result = optimize(e.data)
    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in signaleticsOptimizer worker',
    })
  }
}
