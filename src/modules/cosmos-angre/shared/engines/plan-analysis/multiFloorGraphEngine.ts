// ═══ MULTI-FLOOR GRAPH ENGINE ═══
//
// Fusionne N graphes de navigation (un par étage) en un méga-graphe unique
// où les transitions verticales (escalators, ascenseurs, rampes, escaliers)
// deviennent des arêtes inter-étages avec temps de transition.
//
// Temps de transition (spec PROPH3T Vol.3) :
//   - Escalator  : 45 s / étage (montée automatique)
//   - Ascenseur  : 60 s / étage (attente + trajet)
//   - Rampe      : 90 s / étage (marche + pente)
//   - Escalier   : 30 s / étage (descente/montée à pied)
//
// Détection des ruptures de guidage :
//   Si un nœud transit au niveau N a une arête vers le niveau N+1 mais qu'il
//   n'y a aucun panneau directionnel à la sortie → rupture.

import type { NavGraph, NavNode, NavEdge } from './navGraphEngine'

// ─── Types ─────────────────────────────────────────────

export type VerticalTransitKind = 'escalator' | 'elevator' | 'ramp' | 'stair'

export const TRANSIT_TIME_S: Record<VerticalTransitKind, number> = {
  escalator: 45,
  elevator:  60,
  ramp:      90,
  stair:     30,
}

export const TRANSIT_PMR_COMPLIANT: Record<VerticalTransitKind, boolean> = {
  escalator: false,
  elevator:  true,  // ascenseur = accessible PMR par défaut
  ramp:      true,  // rampe conforme = PMR
  stair:     false, // escalier jamais PMR
}

export interface FloorInfo {
  id: string
  /** Libellé (ex: RDC, R+1, B1). */
  label: string
  /** Niveau numérique (0 = RDC, 1 = R+1, -1 = B1). */
  level: number
  /** Hauteur du plancher (mètres depuis référence). */
  heightM?: number
}

export interface VerticalTransition {
  id: string
  kind: VerticalTransitKind
  /** Libellé du transit. */
  label: string
  /** Étages reliés (ids). */
  fromFloorId: string
  toFloorId: string
  /** Position (x,y) du transit sur chaque étage (souvent identique). */
  x: number
  y: number
  /** PMR ? (false = escalator ou escalier, true = ascenseur ou rampe conforme). */
  pmrCompliant: boolean
  /** Durée en secondes. */
  durationS: number
}

export interface MultiFloorInput {
  /** Map étageId → NavGraph de cet étage. */
  graphsByFloor: Map<string, NavGraph>
  floors: FloorInfo[]
  /** Transitions verticales détectées ou fournies. */
  transitions: VerticalTransition[]
}

export interface MultiFloorGraph {
  /** Graphe unifié (tous les nœuds préfixés par leur étage). */
  nodes: (NavNode & { floorId: string; floorLevel: number })[]
  /** Arêtes inter-étages. */
  verticalEdges: Array<NavEdge & {
    transitionId: string
    kind: VerticalTransitKind
    durationS: number
    pmrCompliant: boolean
  }>
  /** Arêtes internes (par étage). */
  internalEdges: Array<NavEdge & { floorId: string }>
  /** Index global id → index. */
  nodeIndex: Map<string, number>
  /** Adjacence globale : id → voisins. */
  adj: Map<string, Array<{ edgeId: string; to: string; weight: number; isVertical: boolean }>>
}

// ─── Construction ──────────────────────────────────────

export function buildMultiFloorGraph(input: MultiFloorInput): MultiFloorGraph {
  const allNodes: MultiFloorGraph['nodes'] = []
  const internalEdges: MultiFloorGraph['internalEdges'] = []

  // 1. Préfixer les ids par l'étage pour éviter les collisions
  const remap = new Map<string, string>() // oldId → newId

  for (const [floorId, graph] of input.graphsByFloor) {
    const floor = input.floors.find(f => f.id === floorId)
    if (!floor) continue
    for (const n of graph.nodes) {
      const newId = `${floorId}:${n.id}`
      remap.set(`${floorId}:${n.id}-src`, n.id) // helper
      allNodes.push({
        ...n,
        id: newId,
        floorId: floor.id,
        floorLevel: floor.level,
      })
    }
    for (const e of graph.edges) {
      internalEdges.push({
        ...e,
        id: `${floorId}:${e.id}`,
        fromId: `${floorId}:${e.fromId}`,
        toId: `${floorId}:${e.toId}`,
        floorId: floor.id,
      })
    }
  }

  // 2. Créer les arêtes verticales
  const verticalEdges: MultiFloorGraph['verticalEdges'] = []
  for (const t of input.transitions) {
    // Trouver le nœud transit sur chaque étage (le plus proche du (x,y))
    const findNodeOnFloor = (floorId: string): string | null => {
      const candidates = allNodes.filter(n => n.floorId === floorId && n.kind === 'transit')
      let best: string | null = null
      let bestD = Infinity
      for (const c of candidates) {
        const d = Math.hypot(c.x - t.x, c.y - t.y)
        if (d < bestD && d < 5) { bestD = d; best = c.id }
      }
      // Fallback : n'importe quel nœud le plus proche
      if (!best) {
        for (const c of allNodes.filter(n => n.floorId === floorId)) {
          const d = Math.hypot(c.x - t.x, c.y - t.y)
          if (d < bestD) { bestD = d; best = c.id }
        }
      }
      return best
    }

    const fromId = findNodeOnFloor(t.fromFloorId)
    const toId = findNodeOnFloor(t.toFloorId)
    if (!fromId || !toId) continue

    // Poids = durée en secondes convertie en mètres équivalents (1.3 m/s)
    const equivalentM = t.durationS * 1.3
    verticalEdges.push({
      id: `v-${t.id}`,
      fromId,
      toId,
      waypoints: [],
      lengthM: equivalentM,
      congestion: 1.0,
      attractiveness: 1.0,
      weight: equivalentM,
      transitionId: t.id,
      kind: t.kind,
      durationS: t.durationS,
      pmrCompliant: t.pmrCompliant,
    })
  }

  // 3. Index global
  const nodeIndex = new Map<string, number>()
  allNodes.forEach((n, i) => nodeIndex.set(n.id, i))

  const adj = new Map<string, Array<{ edgeId: string; to: string; weight: number; isVertical: boolean }>>()
  for (const n of allNodes) adj.set(n.id, [])
  for (const e of internalEdges) {
    adj.get(e.fromId)?.push({ edgeId: e.id, to: e.toId, weight: e.weight, isVertical: false })
    adj.get(e.toId)?.push({ edgeId: e.id, to: e.fromId, weight: e.weight, isVertical: false })
  }
  for (const e of verticalEdges) {
    adj.get(e.fromId)?.push({ edgeId: e.id, to: e.toId, weight: e.weight, isVertical: true })
    adj.get(e.toId)?.push({ edgeId: e.id, to: e.fromId, weight: e.weight, isVertical: true })
  }

  return { nodes: allNodes, verticalEdges, internalEdges, nodeIndex, adj }
}

// ─── Détection de rupture de guidage ──────────────────

export interface GuidanceRupture {
  transitionId: string
  kind: VerticalTransitKind
  /** Étage où la signalétique est manquante. */
  floorId: string
  floorLabel: string
  x: number
  y: number
  severity: 'critical' | 'high' | 'medium'
  message: string
  recommendation: string
}

export interface GuidanceRuptureInput {
  transitions: VerticalTransition[]
  floors: FloorInfo[]
  /** Panneaux placés, avec position + étage. */
  signagePositions: Array<{ floorId: string; x: number; y: number }>
  /** Rayon de détection d'un panneau à proximité d'une transition (défaut 6m). */
  proximityRadiusM?: number
}

export function detectGuidanceRuptures(input: GuidanceRuptureInput): GuidanceRupture[] {
  const ruptures: GuidanceRupture[] = []
  const r = input.proximityRadiusM ?? 6

  for (const t of input.transitions) {
    // Sortie de transition = chaque étage relié
    for (const floorId of [t.fromFloorId, t.toFloorId]) {
      const floor = input.floors.find(f => f.id === floorId)
      if (!floor) continue
      // Un panneau directionnel est-il à moins de r mètres de (t.x, t.y) sur cet étage ?
      const hasNearbyPanel = input.signagePositions.some(s =>
        s.floorId === floorId &&
        Math.hypot(s.x - t.x, s.y - t.y) <= r,
      )
      if (!hasNearbyPanel) {
        ruptures.push({
          transitionId: t.id,
          kind: t.kind,
          floorId,
          floorLabel: floor.label,
          x: t.x,
          y: t.y,
          severity: t.kind === 'escalator' || t.kind === 'elevator' ? 'high' : 'medium',
          message: `Aucun panneau directionnel à la sortie ${t.kind} « ${t.label} » niveau ${floor.label}.`,
          recommendation: `Placer un panneau directionnel dans les ${r}m autour de ce transit — orienter vers zones principales.`,
        })
      }
    }
  }

  return ruptures
}

// ─── Détection automatique des transitions depuis spaces ──

export function detectVerticalTransitionsFromSpaces(
  spaces: Array<{ id: string; label: string; type?: string; polygon: [number, number][]; floorId?: string; areaSqm: number }>,
  floors: FloorInfo[],
): VerticalTransition[] {
  const transitions: VerticalTransition[] = []
  if (floors.length < 2) return transitions

  const sortedFloors = [...floors].sort((a, b) => a.level - b.level)

  // Classifier chaque space qui est un transit
  interface TransitSpace {
    space: typeof spaces[0]
    kind: VerticalTransitKind
    x: number
    y: number
  }
  const transitSpaces: TransitSpace[] = []

  for (const s of spaces) {
    const hay = ((s.label ?? '') + ' ' + (s.type ?? '')).toLowerCase()
    let kind: VerticalTransitKind | null = null
    if (/escalat/.test(hay)) kind = 'escalator'
    else if (/asc(?:enseur)?|lift|elevator/.test(hay)) kind = 'elevator'
    else if (/ramp/.test(hay)) kind = 'ramp'
    else if (/escal(?:ier)|stair/.test(hay)) kind = 'stair'
    if (!kind) continue
    // Centroïde
    let cx = 0, cy = 0
    for (const [x, y] of s.polygon) { cx += x; cy += y }
    cx /= s.polygon.length; cy /= s.polygon.length
    transitSpaces.push({ space: s, kind, x: cx, y: cy })
  }

  // Pour chaque transit, créer une arête vers l'étage suivant le plus proche
  // (en supposant que le même transit apparaît sur plusieurs étages approximativement
  // au même (x,y), on cluster par proximité).
  const clusters = new Map<string, TransitSpace[]>() // key = "kind-x0-y0"
  for (const ts of transitSpaces) {
    let found = false
    for (const [key, list] of clusters) {
      const [keyKind] = key.split('-')
      if (keyKind !== ts.kind) continue
      const ref = list[0]
      if (Math.hypot(ref.x - ts.x, ref.y - ts.y) < 8) {
        list.push(ts); found = true; break
      }
    }
    if (!found) {
      clusters.set(`${ts.kind}-${Math.round(ts.x)}-${Math.round(ts.y)}`, [ts])
    }
  }

  let idx = 0
  for (const [, members] of clusters) {
    // Trier par étage et créer les transitions entre étages consécutifs
    const byFloor = new Map<string, TransitSpace>()
    for (const ts of members) {
      if (ts.space.floorId) byFloor.set(ts.space.floorId, ts)
    }
    const levelsPresent = Array.from(byFloor.keys())
      .map(fid => ({ fid, level: sortedFloors.find(f => f.id === fid)?.level ?? 0 }))
      .sort((a, b) => a.level - b.level)

    for (let i = 0; i < levelsPresent.length - 1; i++) {
      const a = levelsPresent[i]
      const b = levelsPresent[i + 1]
      const tsa = byFloor.get(a.fid)!
      const pmr = TRANSIT_PMR_COMPLIANT[tsa.kind]
      const durationPerFloor = TRANSIT_TIME_S[tsa.kind]
      transitions.push({
        id: `vt-${idx++}`,
        kind: tsa.kind,
        label: tsa.space.label || `${tsa.kind} ${idx}`,
        fromFloorId: a.fid,
        toFloorId: b.fid,
        x: tsa.x,
        y: tsa.y,
        pmrCompliant: pmr,
        durationS: durationPerFloor * Math.abs(b.level - a.level),
      })
    }
  }

  return transitions
}
