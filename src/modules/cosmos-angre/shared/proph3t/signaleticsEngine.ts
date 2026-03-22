import type { Zone, SignageType, SignageItem, NavigationGraph, Floor, NavigationNode } from './types'

// ═══ CATALOGUE SIGNALÉTIQUE ═══

export const SIGNAGE_CATALOG: Record<SignageType, {
  name: string; formatMm: string; defaultHeightMm: number
  priceFcfa: number; norm: string; luminous: boolean
}> = {
  totem_3m:              { name: 'Totem pylône 3m',              formatMm: '400×1200', defaultHeightMm: 1200, priceFcfa: 1_800_000, norm: 'NF X 08-003', luminous: false },
  totem_5m:              { name: 'Totem pylône 5m',              formatMm: '600×2000', defaultHeightMm: 2000, priceFcfa: 3_200_000, norm: 'NF X 08-003', luminous: false },
  panneau_dir_suspendu:  { name: 'Panneau directionnel suspendu', formatMm: '200×600',  defaultHeightMm: 200,  priceFcfa: 180_000,   norm: 'ISO 7010',     luminous: false },
  panneau_dir_mural:     { name: 'Panneau directionnel mural',   formatMm: '300×900',  defaultHeightMm: 300,  priceFcfa: 120_000,   norm: 'ISO 7010',     luminous: false },
  banniere_suspend:      { name: 'Bandeau suspendu',             formatMm: '600×200',  defaultHeightMm: 200,  priceFcfa: 95_000,    norm: 'NF X 08-003', luminous: false },
  marquage_sol:          { name: 'Flèche directionnelle sol',    formatMm: '300×600',  defaultHeightMm: 0,    priceFcfa: 45_000,    norm: 'ISO 23601',   luminous: false },
  borne_interactive:     { name: 'Borne numérique tactile 55"',  formatMm: '550×1700', defaultHeightMm: 0,    priceFcfa: 4_500_000, norm: 'EN 301 549',  luminous: true },
  enseigne_facade:       { name: 'Enseigne lumineuse LED',        formatMm: 'Variable', defaultHeightMm: 600,  priceFcfa: 850_000,   norm: 'NF C 15-100', luminous: true },
  plaque_porte:          { name: 'Plaque de porte gravée',        formatMm: '200×80',   defaultHeightMm: 80,   priceFcfa: 35_000,    norm: 'NF X 08-003', luminous: false },
  numero_cellule:        { name: 'Numéro cellule commerciale',    formatMm: '150×150',  defaultHeightMm: 150,  priceFcfa: 25_000,    norm: '',             luminous: false },
  pictogramme_pmr:       { name: 'Symbole accès PMR',             formatMm: '200×200',  defaultHeightMm: 200,  priceFcfa: 18_000,    norm: 'ISO 7001',    luminous: false },
  panneau_toilettes:     { name: 'Toilettes H/F/PMR',             formatMm: '200×600',  defaultHeightMm: 200,  priceFcfa: 45_000,    norm: 'ISO 7010',    luminous: false },
  sortie_secours_led:    { name: 'Panneau sortie secours LED',    formatMm: '300×150',  defaultHeightMm: 150,  priceFcfa: 85_000,    norm: 'NF EN 60598-2-22', luminous: true },
  bloc_autonome:         { name: 'BAES éclairage secours',        formatMm: '200×100',  defaultHeightMm: 100,  priceFcfa: 120_000,   norm: 'NF C 71-800', luminous: true },
  plan_evacuation:       { name: "Plan d'évacuation encadré",     formatMm: '400×300',  defaultHeightMm: 300,  priceFcfa: 65_000,    norm: 'NF X 08-070', luminous: false },
  interdiction_fumee:    { name: 'Panneau interdiction',          formatMm: '200×200',  defaultHeightMm: 200,  priceFcfa: 12_000,    norm: 'ISO 7010',    luminous: false },
}

// ═══ INTERFACES ═══

export interface SignaleticsSpec {
  recommendedType: SignageType
  poseHeightM: number
  textHeightMm: number
  maxReadingDistanceM: number
  isLuminousRequired: boolean
  isBAESRequired: boolean
  spacingM: number
  orientationDeg: number
  ref: string
  capexFcfa: number
  normRef: string
  justification: string
}

// ═══ CALCUL SPECS SIGNALÉTIQUE (ISO 7010 + NF X 08-003) ═══

export function calculateSignaleticsSpec(
  position: { x: number; y: number },
  zone: Zone,
  corridorWidthM: number,
  ceilingHeightM: number,
  dominantFlowAngle: number,
  distanceToNextNode: number
): SignaleticsSpec {
  // Distance de lecture max
  const maxReadingDistanceM = Math.min(distanceToNextNode, corridorWidthM * 3)

  // Taille texte : distance_lecture_max / 200 → mm (NF X 08-003)
  // D(m) × 1000 / 200 = D × 5 mm
  const textHeightMm = Math.ceil((maxReadingDistanceM * 1000) / 200)

  // Hauteur de pose : H_regard (1.60m) + D_max × tan(15°)
  const rawPoseHeight = 1.60 + maxReadingDistanceM * 0.268
  const poseHeightM = Math.max(2.20, Math.min(rawPoseHeight, ceilingHeightM - 0.3))

  // Type recommandé
  let recommendedType: SignageType
  if (ceilingHeightM >= 4.5) {
    recommendedType = distanceToNextNode > 20 ? 'totem_5m' : 'totem_3m'
  } else if (corridorWidthM >= 4) {
    recommendedType = 'panneau_dir_suspendu'
  } else {
    recommendedType = 'panneau_dir_mural'
  }

  // Éclairage : panneau lumineux si lux < 200
  const zoneLux = zone.lux ?? 300
  const isLuminousRequired = zoneLux < 200
  const isBAESRequired = zoneLux < 50

  // Distance inter-panneaux : H_panneau(mm) × 100 / 1000 → mètres
  const signageHeightMm = SIGNAGE_CATALOG[recommendedType]?.defaultHeightMm ?? 300
  const spacingM = (signageHeightMm * 100) / 1000

  const catalog = SIGNAGE_CATALOG[recommendedType]

  const justificationParts = [
    `Distance lecture ${maxReadingDistanceM.toFixed(1)}m → texte ${textHeightMm}mm min.`,
    `Pose à ${poseHeightM.toFixed(2)}m (plafond ${ceilingHeightM}m).`,
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
    orientationDeg: dominantFlowAngle,
    ref: `${recommendedType.toUpperCase()}-AUTO`,
    capexFcfa: catalog?.priceFcfa ?? 120_000,
    normRef: catalog?.norm ?? 'ISO 7010',
    justification: justificationParts.join(' '),
  }
}

// ═══ DÉTECTION RUPTURES DE CONTINUITÉ VISUELLE ═══

export function detectVisualBreaks(
  signageItems: SignageItem[],
  floorId: string,
  widthM: number,
  heightM: number
): { from: SignageItem; to: SignageItem; distanceM: number; maxAllowedM: number }[] {
  const floorItems = signageItems
    .filter(s => s.floorId === floorId)
    .sort((a, b) => a.x - b.x || a.y - b.y)

  const breaks: { from: SignageItem; to: SignageItem; distanceM: number; maxAllowedM: number }[] = []

  for (let i = 0; i < floorItems.length - 1; i++) {
    const a = floorItems[i]
    const b = floorItems[i + 1]
    const dx = (b.x - a.x) * widthM
    const dy = (b.y - a.y) * heightM
    const dist = Math.sqrt(dx * dx + dy * dy)

    const heightMm = SIGNAGE_CATALOG[a.type]?.defaultHeightMm ?? 300
    const maxAllowed = (heightMm * 100) / 1000

    if (dist > maxAllowed) {
      breaks.push({ from: a, to: b, distanceM: Math.round(dist * 10) / 10, maxAllowedM: maxAllowed })
    }
  }

  return breaks
}

// ═══ PLACEMENT OPTIMAL SIGNALÉTIQUE ═══

export function optimizeSignaleticsPlacement(
  floor: Floor,
  graph: NavigationGraph,
  existingSignage: SignageItem[]
): SignageItem[] {
  const newItems: SignageItem[] = []
  let index = existingSignage.filter(s => s.floorId === floor.id).length + 1

  // Pour chaque arête du graphe
  for (const edge of graph.edges) {
    if (edge.floorId !== floor.id) continue

    const fromNode = graph.nodes.find(n => n.id === edge.from)
    const toNode = graph.nodes.find(n => n.id === edge.to)
    if (!fromNode || !toNode) continue

    const edgeLengthM = edge.distanceM
    if (edgeLengthM < 5) continue // Skip très courtes arêtes

    // Zone la plus proche du milieu de l'arête
    const midX = (fromNode.x + toNode.x) / 2
    const midY = (fromNode.y + toNode.y) / 2
    const zone = floor.zones.find(z =>
      midX >= z.x && midX <= z.x + z.w &&
      midY >= z.y && midY <= z.y + z.h
    ) ?? floor.zones[0]

    if (!zone) continue

    // Angle du flux dominant
    const flowAngle = Math.atan2(
      (toNode.y - fromNode.y) * floor.heightM,
      (toNode.x - fromNode.x) * floor.widthM
    ) * (180 / Math.PI)

    const corridorWidthM = Math.min(zone.w * floor.widthM, zone.h * floor.heightM)
    const ceilingHeightM = zone.type === 'parking' ? 2.8 : 3.5

    const spec = calculateSignaleticsSpec(
      { x: midX, y: midY },
      zone,
      corridorWidthM,
      ceilingHeightM,
      flowAngle,
      edgeLengthM
    )

    // Nombre de panneaux nécessaires
    const numPanels = Math.max(1, Math.ceil(edgeLengthM / spec.spacingM))

    for (let i = 0; i < numPanels; i++) {
      const t = numPanels === 1 ? 0.5 : i / (numPanels - 1)
      const px = fromNode.x + t * (toNode.x - fromNode.x)
      const py = fromNode.y + t * (toNode.y - fromNode.y)

      // Vérifier qu'il n'existe pas déjà un panneau proche
      const hasExisting = existingSignage.some(s => {
        const dx = (s.x - px) * floor.widthM
        const dy = (s.y - py) * floor.heightM
        return Math.sqrt(dx * dx + dy * dy) < 3 // 3m minimum
      })

      if (hasExisting) continue

      newItems.push({
        id: `sig-auto-${floor.id}-${index++}`,
        floorId: floor.id,
        type: spec.recommendedType,
        x: px,
        y: py,
        orientationDeg: spec.orientationDeg,
        poseHeightM: spec.poseHeightM,
        textHeightMm: spec.textHeightMm,
        maxReadingDistanceM: spec.maxReadingDistanceM,
        visibilityScore: 75,
        isLuminous: spec.isLuminousRequired,
        requiresBAES: spec.isBAESRequired,
        ref: spec.ref,
        capexFcfa: spec.capexFcfa,
        normRef: spec.normRef,
        proph3tNote: spec.justification,
        autoPlaced: true,
      })
    }

    // Panneau de confirmation au nœud de décision (intersection)
    if (isDecisionNode(toNode, graph)) {
      const hasConfirmation = existingSignage.some(s => {
        const dx = (s.x - toNode.x) * floor.widthM
        const dy = (s.y - toNode.y) * floor.heightM
        return Math.sqrt(dx * dx + dy * dy) < 2
      })

      if (!hasConfirmation) {
        newItems.push({
          id: `sig-confirm-${floor.id}-${index++}`,
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
          ref: 'PANNEAU-DIR-A-CONFIRM',
          capexFcfa: 180_000,
          normRef: 'ISO 7010',
          proph3tNote: 'Panneau de confirmation à nœud de décision',
          autoPlaced: true,
        })
      }
    }
  }

  return newItems
}

function isDecisionNode(node: NavigationNode, graph: NavigationGraph): boolean {
  const connectedEdges = graph.edges.filter(e => e.from === node.id || e.to === node.id)
  return connectedEdges.length >= 3
}

// ═══ CALCUL LUMINANCE ═══

export function checkLuminanceRequirements(zone: Zone): {
  requiresLuminous: boolean
  requiresBAES: boolean
  baesSpacingM: number
  note: string
} {
  const lux = zone.lux ?? 300

  if (lux < 50) {
    return {
      requiresLuminous: true,
      requiresBAES: true,
      baesSpacingM: 15,
      note: `Zone ${zone.label} : éclairage < 50 lux → BAES obligatoire tous les 15m (NF C 71-800)`,
    }
  }
  if (lux < 200) {
    return {
      requiresLuminous: true,
      requiresBAES: false,
      baesSpacingM: 0,
      note: `Zone ${zone.label} : éclairage < 200 lux → panneau lumineux obligatoire (NF EN 1838)`,
    }
  }
  return {
    requiresLuminous: false,
    requiresBAES: false,
    baesSpacingM: 0,
    note: '',
  }
}
