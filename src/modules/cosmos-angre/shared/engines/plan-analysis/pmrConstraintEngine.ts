// ═══ PMR CONSTRAINT ENGINE — accessibilité personnes à mobilité réduite ═══
//
// Contraintes (spec PROPH3T Vol.3 + référentiel CI/UEMOA & FR) :
//   - Pente ≤ 5 % (≤ 8 % tolérés sur 2m max en cheminement extérieur)
//   - Largeur de passage ≥ 1,40 m (1,20 m localement sur 1m max)
//   - Dénivellation uniquement via ascenseur ou rampe conforme
//   - Aucun obstacle ponctuel à hauteur genou/caddie (0–1,10 m)
//
// Références :
//   - Arrêté du 8 décembre 2014 (FR, cheminement extérieur/intérieur ERP)
//   - Loi CI n°98-594 (personnes handicapées)
//   - ISO 21542 (accessibilité des bâtiments)
//   - NF P 98-350 (cheminement piétonnier)
//
// Ce moteur :
//   1. Analyse le navGraph pour détecter les segments non conformes
//   2. Retourne la liste des arêtes à surligner (UI) + recommandations
//   3. Produit un A* contraint PMR (filtre arêtes conformes uniquement)

import type { NavGraph, NavNode, NavEdge } from './navGraphEngine'

// ─── Types ─────────────────────────────────────────────

export interface PmrEdgeAnalysis {
  edgeId: string
  fromId: string
  toId: string
  lengthM: number
  /** Largeur estimée en mètres (depuis spaces parents ou heuristique). */
  widthM: number
  /** Pente estimée en % (entre 2 nœuds sur différents étages). */
  slopePct: number
  /** Issue non conforme ? */
  compliant: boolean
  /** Causes de non-conformité. */
  issues: PmrIssue[]
  /** Score de conformité 0..1 (1 = parfait). */
  score: number
}

export type PmrIssueKind =
  | 'narrow-passage'      // largeur < 1.40m
  | 'steep-slope'         // pente > 5%
  | 'unramped-step'       // marche sans rampe
  | 'missing-elevator'    // transit sans ascenseur PMR
  | 'obstacle-on-path'    // obstacle à hauteur critique

export interface PmrIssue {
  kind: PmrIssueKind
  severity: 'critical' | 'high' | 'medium'
  message: string
  standardRef: string
  /** Action corrective suggérée. */
  recommendation: string
}

export interface PmrInput {
  graph: NavGraph
  /** Spaces utilisés pour estimer la largeur locale des circulations. */
  spaces: Array<{ polygon: [number, number][]; label: string; type?: string; areaSqm: number }>
  /** Transitions inter-étages : liste des ids de nœuds `transit` conformes (ascenseur PMR). */
  pmrCompliantTransitIds?: Set<string>
  /** Largeur minimale PMR en mètres (défaut 1.40). */
  minWidthM?: number
  /** Pente max PMR en % (défaut 5). */
  maxSlopePct?: number
}

export interface PmrResult {
  /** Analyse par arête (toutes). */
  edgeAnalyses: PmrEdgeAnalysis[]
  /** Arêtes non conformes (pour surbrillance UI). */
  nonCompliantEdges: PmrEdgeAnalysis[]
  /** Conforme global ? */
  compliant: boolean
  /** Score global 0..100. */
  complianceScore: number
  /** Recommandations groupées. */
  recommendations: Array<{
    priority: 'critical' | 'high' | 'medium'
    edgeIds: string[]
    message: string
  }>
  stats: {
    totalEdges: number
    nonCompliantEdges: number
    narrowPassages: number
    steepSlopes: number
    unrampedSteps: number
  }
}

// ─── Helpers géométriques ─────────────────────────────

function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const l2 = dx * dx + dy * dy
  if (l2 === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  const qx = x1 + t * dx
  const qy = y1 + t * dy
  return Math.hypot(px - qx, py - qy)
}

/** Distance minimale du centre d'une arête au polygone le plus proche (mur = obstacle). */
function minDistanceToObstacles(
  midX: number, midY: number,
  spaces: PmrInput['spaces'],
  excludeWalkable = true,
): number {
  let minD = Infinity
  for (const s of spaces) {
    // On ne compte que les espaces "non franchissables" (boutiques, locaux)
    if (excludeWalkable) {
      const hay = ((s.label ?? '') + ' ' + (s.type ?? '')).toLowerCase()
      if (/mail|hall|couloir|circul|atrium|galerie|parvis|passage|lobby/.test(hay)) continue
    }
    for (let i = 0, j = s.polygon.length - 1; i < s.polygon.length; j = i++) {
      const [x1, y1] = s.polygon[j]
      const [x2, y2] = s.polygon[i]
      const d = pointToSegmentDistance(midX, midY, x1, y1, x2, y2)
      if (d < minD) minD = d
    }
  }
  return minD === Infinity ? 10 : minD // 10m par défaut si aucun obstacle
}

/** Estime la largeur locale d'une arête = 2 × distance_aux_murs. */
function estimateEdgeWidth(edge: NavEdge, graph: NavGraph, spaces: PmrInput['spaces']): number {
  const from = graph.nodes[graph._nodeIndex.get(edge.fromId)!]
  const to = graph.nodes[graph._nodeIndex.get(edge.toId)!]
  if (!from || !to) return 1.5

  // On échantillonne plusieurs points le long de l'arête
  const samples = Math.min(5, Math.max(2, Math.floor(edge.lengthM / 5)))
  const widths: number[] = []
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1 || 1)
    const x = from.x + (to.x - from.x) * t
    const y = from.y + (to.y - from.y) * t
    const clearance = minDistanceToObstacles(x, y, spaces)
    widths.push(clearance * 2)
  }
  // On prend le 25e percentile = pire portion
  widths.sort((a, b) => a - b)
  return widths[Math.floor(widths.length * 0.25)]
}

// ─── Analyse PMR d'une arête ──────────────────────────

function analyzeEdge(
  edge: NavEdge,
  graph: NavGraph,
  input: PmrInput,
): PmrEdgeAnalysis {
  const minWidth = input.minWidthM ?? 1.40
  const maxSlope = input.maxSlopePct ?? 5.0

  const widthM = estimateEdgeWidth(edge, graph, input.spaces)
  // Pente : pour l'instant 0 (même étage). Sera enrichie avec multi-étages.
  const slopePct = 0

  const issues: PmrIssue[] = []

  if (widthM < minWidth) {
    const severity: PmrIssue['severity'] = widthM < 1.0 ? 'critical' : widthM < 1.2 ? 'high' : 'medium'
    issues.push({
      kind: 'narrow-passage',
      severity,
      message: `Passage étroit : ${widthM.toFixed(2)}m (< ${minWidth}m requis).`,
      standardRef: 'Arrêté 8 déc. 2014 art. 4 / ISO 21542 §8.3',
      recommendation: widthM < 1.0
        ? 'Élargissement obligatoire — cheminement non franchissable en fauteuil.'
        : 'Élargir à 1,40m minimum ou désigner un itinéraire alternatif conforme.',
    })
  }

  if (slopePct > maxSlope) {
    issues.push({
      kind: 'steep-slope',
      severity: slopePct > 8 ? 'critical' : 'high',
      message: `Pente ${slopePct.toFixed(1)}% (> ${maxSlope}% admis).`,
      standardRef: 'Arrêté 8 déc. 2014 art. 7',
      recommendation: 'Installer une rampe conforme (pente ≤ 5%, palier /10m, main-courante).',
    })
  }

  // Score : largeur normalisée + pente normalisée
  const widthScore = Math.min(1, widthM / minWidth)
  const slopeScore = slopePct <= maxSlope ? 1 : Math.max(0, 1 - (slopePct - maxSlope) / 5)
  const score = (widthScore + slopeScore) / 2

  return {
    edgeId: edge.id,
    fromId: edge.fromId,
    toId: edge.toId,
    lengthM: edge.lengthM,
    widthM,
    slopePct,
    compliant: issues.length === 0,
    issues,
    score,
  }
}

// ─── Pipeline principal ──────────────────────────────

export function analyzePmr(input: PmrInput): PmrResult {
  const edgeAnalyses = input.graph.edges.map(e => analyzeEdge(e, input.graph, input))
  const nonCompliantEdges = edgeAnalyses.filter(a => !a.compliant)

  const avgScore = edgeAnalyses.length > 0
    ? edgeAnalyses.reduce((s, a) => s + a.score, 0) / edgeAnalyses.length
    : 1

  // Agrégation des recommandations
  const recMap = new Map<string, { priority: PmrIssue['severity']; edgeIds: string[]; message: string }>()
  for (const a of nonCompliantEdges) {
    for (const issue of a.issues) {
      const key = `${issue.kind}-${issue.severity}`
      if (!recMap.has(key)) {
        recMap.set(key, {
          priority: issue.severity,
          edgeIds: [],
          message: `${issue.message.split(':')[0]} — ${issue.recommendation}`,
        })
      }
      recMap.get(key)!.edgeIds.push(a.edgeId)
    }
  }

  const narrowPassages = nonCompliantEdges.filter(e =>
    e.issues.some(i => i.kind === 'narrow-passage')).length
  const steepSlopes = nonCompliantEdges.filter(e =>
    e.issues.some(i => i.kind === 'steep-slope')).length
  const unrampedSteps = nonCompliantEdges.filter(e =>
    e.issues.some(i => i.kind === 'unramped-step')).length

  return {
    edgeAnalyses,
    nonCompliantEdges,
    compliant: nonCompliantEdges.length === 0,
    complianceScore: Math.round(avgScore * 100),
    recommendations: Array.from(recMap.values()).sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 }
      return order[a.priority] - order[b.priority]
    }),
    stats: {
      totalEdges: edgeAnalyses.length,
      nonCompliantEdges: nonCompliantEdges.length,
      narrowPassages,
      steepSlopes,
      unrampedSteps,
    },
  }
}

// ─── A* contraint PMR ─────────────────────────────────
// Construit un sous-graphe ne contenant que les arêtes conformes puis Dijkstra.

export interface PmrPath {
  nodeIds: string[]
  waypoints: Array<{ x: number; y: number }>
  lengthM: number
  /** true si l'itinéraire existe en respectant toutes les contraintes PMR. */
  compliant: boolean
  /** Issues rencontrées (si non conforme mais on a dû accepter). */
  toleratedIssues: PmrIssue[]
}

export function computePmrPath(
  graph: NavGraph,
  analyses: PmrEdgeAnalysis[],
  fromId: string,
  toId: string,
  /** Si true, Dijkstra contraint — refuse les arêtes non conformes. Sinon, pénalise seulement. */
  strict = true,
): PmrPath | null {
  const analysisById = new Map(analyses.map(a => [a.edgeId, a]))

  // Construction adjacence filtrée
  const filteredAdj = new Map<string, Array<{ edgeId: string; to: string; weight: number }>>()
  for (const n of graph.nodes) filteredAdj.set(n.id, [])
  for (const e of graph.edges) {
    const a = analysisById.get(e.id)
    if (!a) continue
    if (strict && !a.compliant) continue
    // Poids = longueur × (1 + malus selon score)
    const malus = strict ? 1 : 1 + 2 * (1 - a.score)
    const weight = e.lengthM * malus
    filteredAdj.get(e.fromId)!.push({ edgeId: e.id, to: e.toId, weight })
    filteredAdj.get(e.toId)!.push({ edgeId: e.id, to: e.fromId, weight })
  }

  // Dijkstra
  const dist = new Map<string, number>()
  const prev = new Map<string, { nodeId: string; edgeId: string }>()
  const visited = new Set<string>()
  dist.set(fromId, 0)

  // Priority queue simple (O(n²) suffit pour graphes modestes)
  while (visited.size < graph.nodes.length) {
    let u: string | null = null
    let du = Infinity
    for (const [id, d] of dist) {
      if (visited.has(id)) continue
      if (d < du) { du = d; u = id }
    }
    if (!u) break
    if (u === toId) break
    visited.add(u)

    for (const { edgeId, to, weight } of (filteredAdj.get(u) ?? [])) {
      if (visited.has(to)) continue
      const alt = du + weight
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt)
        prev.set(to, { nodeId: u, edgeId })
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

  // Waypoints & tolerated issues
  const waypoints: Array<{ x: number; y: number }> = []
  const toleratedIssues: PmrIssue[] = []
  let lengthM = 0
  for (let i = 0; i < nodeIds.length; i++) {
    const node = graph.nodes[graph._nodeIndex.get(nodeIds[i])!]
    if (i === 0) {
      waypoints.push({ x: node.x, y: node.y })
    } else {
      const prevNode = graph.nodes[graph._nodeIndex.get(nodeIds[i - 1])!]
      const edge = graph.edges.find(e =>
        (e.fromId === prevNode.id && e.toId === node.id) ||
        (e.fromId === node.id && e.toId === prevNode.id))
      if (edge) {
        const wps = edge.fromId === prevNode.id ? edge.waypoints : [...edge.waypoints].reverse()
        for (const wp of wps) waypoints.push(wp)
        lengthM += edge.lengthM
        const a = analysisById.get(edge.id)
        if (a && !a.compliant) {
          for (const iss of a.issues) toleratedIssues.push(iss)
        }
      }
      waypoints.push({ x: node.x, y: node.y })
    }
  }

  return {
    nodeIds,
    waypoints,
    lengthM,
    compliant: toleratedIssues.length === 0,
    toleratedIssues,
  }
}
