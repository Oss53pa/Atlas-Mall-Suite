// ═══ SIGNAGE PLACEMENT ENGINE ═══
// Algorithme glouton sous double contrainte :
//   1. ERP → prioritaire et non négociable (panneaux sortie secours /30m)
//   2. Budget utilisateur N panneaux max (après ERP)
//   3. Optimisation couverture nœuds de décision (via ray-casting)
//
// Score de cohérence final (spec PROPH3T Vol.3) :
//   Score = 40% × couverture nœuds de décision
//         + 30% × absence rupture de guidage
//         + 20% × lisibilité panneaux (distance + angle)
//         + 10% × accessibilité PMR

import {
  computeVisibilityMatrix,
  buildObstaclesFromSpaces,
  type Observer,
  type PanelCandidate,
  type Obstacle,
  MOUNT_RANGE_M,
} from './signageVisibilityEngine'
import { computeErpPanels, type ErpResult, type MandatoryPanel } from './erpConstraintEngine'
import type { FlowPath, FlowEntryExit, SignageRecommendation } from './flowPathEngine'
import type { NavGraph } from './navGraphEngine'

// ─── Types ─────────────────────────────────────────────

export interface PlacementInput {
  paths: FlowPath[]
  entrances: FlowEntryExit[]
  exits: FlowEntryExit[]
  /** Graphe de navigation (facultatif — si fourni, fournit les nœuds de décision). */
  navGraph?: NavGraph
  /** Spaces pour construction obstacles ray-casting. */
  spaces: Array<{ polygon: [number, number][] }>
  /** Segments de mur du plan. */
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>
  /** Budget maximum de panneaux optionnels (hors ERP). Défaut 50. */
  maxPanels?: number
  /** Distance ERP max entre panneaux sortie secours (défaut 30m). */
  erpMaxSpacingM?: number
  /** Inclure panneaux PMR (accessibilité). Défaut true. */
  includePmr?: boolean
  /** Score PMR 0..100 (fourni par pmrConstraintEngine). Défaut 80 si includePmr=true. */
  pmrComplianceScore?: number
}

export interface PlacedPanel {
  id: string
  x: number
  y: number
  kind: 'welcome' | 'directional' | 'you-are-here' | 'information' | 'exit'
        | 'emergency-exit' | 'exit-direction' | 'emergency-plan' | 'pmr-direction'
  mount: 'ceiling' | 'wall' | 'floor'
  priority: 'mandatory' | 'critical' | 'high' | 'medium' | 'low'
  standard?: string
  reason: string
  orientationDeg?: number
  content: string
  /** Observateurs (nœuds décision) que ce panneau rend visibles. */
  covers: string[]
  /** Chemins concernés. */
  pathIds: string[]
  /** Score de visibilité moyen (0..1). */
  avgVisibilityScore: number
}

export interface CoherenceScore {
  /** Score 0..100 (spec PROPH3T Vol.3). */
  total: number
  breakdown: {
    decisionCoverage: number   // 40% pondération
    guidanceContinuity: number // 30% pondération
    readability: number        // 20% pondération
    pmrAccessibility: number   // 10% pondération
  }
  /** Justifications humaines par composante. */
  justifications: string[]
}

export interface PlacementResult {
  panels: PlacedPanel[]
  erp: ErpResult
  coherence: CoherenceScore
  summary: {
    totalPanels: number
    mandatoryPanels: number
    optionalPanels: number
    budgetUsed: number
    budgetMax: number
    decisionNodesCovered: number
    decisionNodesTotal: number
    avgVisibilityScore: number
  }
}

// ─── Pipeline principal ───────────────────────────────

export function computeSignagePlacement(input: PlacementInput): PlacementResult {
  const maxPanels = input.maxPanels ?? 50
  const erpMaxSpacing = input.erpMaxSpacingM ?? 30

  // ─── 1. Panneaux ERP (prioritaires, non négociables) ────
  const erp = computeErpPanels({
    paths: input.paths,
    entrances: input.entrances,
    exits: input.exits,
    maxSpacingM: erpMaxSpacing,
    emergencyPlanAtEntrances: true,
  })

  // ─── 2. Observateurs = nœuds de décision du navGraph ────
  const decisionNodes: Observer[] = input.navGraph
    ? input.navGraph.nodes
        .filter(n => n.kind === 'junction')
        .map(n => ({ id: n.id, x: n.x, y: n.y }))
    : []

  // Fallback : si pas de navGraph, utilise les coudes > 60° des chemins
  if (decisionNodes.length === 0) {
    let counter = 0
    for (const p of input.paths) {
      for (let i = 1; i < p.waypoints.length - 1; i++) {
        const a = p.waypoints[i - 1], b = p.waypoints[i], c = p.waypoints[i + 1]
        const dx1 = b.x - a.x, dy1 = b.y - a.y
        const dx2 = c.x - b.x, dy2 = c.y - b.y
        const n1 = Math.hypot(dx1, dy1), n2 = Math.hypot(dx2, dy2)
        if (n1 < 0.1 || n2 < 0.1) continue
        const cos = (dx1 * dx2 + dy1 * dy2) / (n1 * n2)
        const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
        if (angle > 30) {
          decisionNodes.push({ id: `dec-${counter++}`, x: b.x, y: b.y })
        }
      }
    }
  }

  // ─── 3. Candidats panneaux optionnels ──────────────────
  // Pool = nœuds de décision (pose plafond) + points intermédiaires sur les chemins (mural)
  const candidates: PanelCandidate[] = []
  for (const d of decisionNodes) {
    candidates.push({
      id: `cand-ceiling-${d.id}`,
      x: d.x, y: d.y,
      mount: 'ceiling',
      letterHeightMm: 120,
    })
    candidates.push({
      id: `cand-wall-${d.id}`,
      x: d.x, y: d.y,
      mount: 'wall',
      letterHeightMm: 80,
    })
  }

  // Ajouter "Vous êtes ici" tous les 40m sur les chemins longs
  let yahCount = 0
  for (const p of input.paths) {
    if (p.distanceM < 60) continue
    let acc = 40
    while (acc < p.distanceM - 20) {
      // Trouver position à la distance acc
      let travelled = 0
      for (let i = 1; i < p.waypoints.length; i++) {
        const a = p.waypoints[i - 1], b = p.waypoints[i]
        const seg = Math.hypot(b.x - a.x, b.y - a.y)
        if (travelled + seg >= acc) {
          const t = (acc - travelled) / seg
          candidates.push({
            id: `cand-yah-${p.id}-${yahCount++}`,
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            mount: 'wall',
            letterHeightMm: 60,
          })
          break
        }
        travelled += seg
      }
      acc += 40
    }
  }

  // ─── 4. Ray-casting : matrice visibilité ──────────────
  const obstacles = buildObstaclesFromSpaces(input.spaces, input.walls)
  const matrix = computeVisibilityMatrix(candidates, decisionNodes, obstacles)

  // ─── 5. Algorithme glouton : maximiser couverture dans le budget ──
  const optionalPanels: PlacedPanel[] = []
  const coveredObservers = new Set<string>()
  const totalObservers = decisionNodes.length

  // ERP panels déjà consomment du "budget" ? Non : ils sont obligatoires
  // mais ils couvrent quand même certains observateurs → on en tient compte.
  const erpPanelsAsCandidates: PanelCandidate[] = erp.panels.map(ep => ({
    id: `erp-${ep.id}`,
    x: ep.x,
    y: ep.y,
    mount: ep.kind === 'emergency-plan' ? 'wall' : 'ceiling',
    letterHeightMm: ep.kind === 'emergency-plan' ? 60 : 100,
    orientationDeg: ep.orientationDeg,
  }))
  const erpMatrix = computeVisibilityMatrix(erpPanelsAsCandidates, decisionNodes, obstacles)
  for (const [, list] of erpMatrix.panelToObservers) {
    for (const entry of list) coveredObservers.add(entry.observerId)
  }

  // Boucle glouton
  const remainingCandidates = new Map<string, PanelCandidate>()
  for (const c of candidates) remainingCandidates.set(c.id, c)

  let budgetUsed = 0
  while (budgetUsed < maxPanels && remainingCandidates.size > 0) {
    // Sélectionner le candidat qui couvre le plus de nouveaux observateurs
    let bestId: string | null = null
    let bestGain = 0
    let bestResultList: Array<{ observerId: string; result: import('./signageVisibilityEngine').VisibilityResult }> = []

    for (const [cid] of remainingCandidates) {
      const list = matrix.panelToObservers.get(cid) ?? []
      const newCovers = list.filter(x => !coveredObservers.has(x.observerId))
      const gain = newCovers.reduce((s, x) => s + x.result.score, 0)
      if (gain > bestGain) {
        bestGain = gain
        bestId = cid
        bestResultList = newCovers
      }
    }

    if (!bestId || bestGain === 0) break

    const cand = remainingCandidates.get(bestId)!
    remainingCandidates.delete(bestId)
    const avgScore = bestResultList.length
      ? bestResultList.reduce((s, x) => s + x.result.score, 0) / bestResultList.length
      : 0

    const newCoveredIds = bestResultList.map(x => x.observerId)
    for (const id of newCoveredIds) coveredObservers.add(id)

    // Détermine le kind fonctionnel du panneau
    const isDecision = newCoveredIds.length >= 2
    const kind: PlacedPanel['kind'] = isDecision ? 'directional'
      : cand.id.includes('yah') ? 'you-are-here'
      : 'information'

    optionalPanels.push({
      id: `opt-${optionalPanels.length}`,
      x: cand.x, y: cand.y,
      kind,
      mount: cand.mount,
      priority: bestResultList.length >= 3 ? 'critical'
              : bestResultList.length >= 2 ? 'high'
              : 'medium',
      reason: `Couvre ${newCoveredIds.length} nœud${newCoveredIds.length > 1 ? 's' : ''} de décision — portée ${MOUNT_RANGE_M[cand.mount]}m (${cand.mount}).`,
      content: kind === 'directional'
        ? 'Flèches directionnelles vers les destinations principales'
        : kind === 'you-are-here'
        ? 'Plan local avec « Vous êtes ici »'
        : 'Information générale',
      covers: newCoveredIds,
      pathIds: [],
      avgVisibilityScore: avgScore,
    })
    budgetUsed++
  }

  // ─── 6. Panneaux ERP convertis en PlacedPanel ───────────
  const mandatoryPanels: PlacedPanel[] = erp.panels.map(ep => {
    const coverList = erpMatrix.panelToObservers.get(`erp-${ep.id}`) ?? []
    const mount: PlacedPanel['mount'] =
      ep.kind === 'emergency-plan' ? 'wall' :
      ep.kind === 'exit-direction' ? 'ceiling' :
      'ceiling'
    return {
      id: ep.id,
      x: ep.x, y: ep.y,
      kind: ep.kind,
      mount,
      priority: 'mandatory',
      standard: ep.standard,
      reason: ep.reason,
      orientationDeg: ep.orientationDeg,
      content: ep.content,
      covers: coverList.map(c => c.observerId),
      pathIds: ep.pathIds,
      avgVisibilityScore: coverList.length
        ? coverList.reduce((s, c) => s + c.result.score, 0) / coverList.length
        : 0,
    }
  })

  // ─── 7. Score de cohérence (formule spec PROPH3T Vol.3) ─
  const allPanels = [...mandatoryPanels, ...optionalPanels]

  const decisionCoverage = totalObservers > 0
    ? (coveredObservers.size / totalObservers) * 100
    : 100

  const guidanceContinuity = erp.compliant
    ? 100
    : Math.max(0, 100 - (erp.nonCompliantPathIds.length * 15))

  const readability = allPanels.length > 0
    ? (allPanels.reduce((s, p) => s + p.avgVisibilityScore, 0) / allPanels.length) * 100
    : 0

  // PMR : alimenté par l'analyse PMR réelle si fournie (score 0..100).
  // Si includePmr = false, on neutralise (100 = composante ignorée).
  const pmrAccessibility = input.includePmr === false
    ? 100
    : (input.pmrComplianceScore !== undefined ? input.pmrComplianceScore : 80)

  const total =
    0.4 * decisionCoverage +
    0.3 * guidanceContinuity +
    0.2 * readability +
    0.1 * pmrAccessibility

  const justifications: string[] = []
  if (decisionCoverage < 80) {
    justifications.push(`Couverture nœuds de décision : ${coveredObservers.size}/${totalObservers} (${decisionCoverage.toFixed(0)}%). Augmenter le budget ou nettoyer le plan pour exposer plus d'intersections.`)
  } else {
    justifications.push(`✓ Couverture nœuds de décision satisfaisante (${decisionCoverage.toFixed(0)}%).`)
  }
  if (!erp.compliant) {
    justifications.push(`⚠ ${erp.nonCompliantPathIds.length} chemin${erp.nonCompliantPathIds.length > 1 ? 's' : ''} non conforme${erp.nonCompliantPathIds.length > 1 ? 's' : ''} ERP (écart > 30m sans panneau sortie).`)
  } else {
    justifications.push(`✓ Conformité ERP validée (cascade sortie toutes les ${erpMaxSpacing}m).`)
  }
  if (readability < 70) {
    justifications.push(`Lisibilité moyenne des panneaux : ${readability.toFixed(0)}/100. Revoir les hauteurs de pose (plafond > mural > sol).`)
  } else {
    justifications.push(`✓ Lisibilité des panneaux correcte (${readability.toFixed(0)}/100).`)
  }

  return {
    panels: allPanels,
    erp,
    coherence: {
      total: Math.round(total),
      breakdown: {
        decisionCoverage: Math.round(decisionCoverage),
        guidanceContinuity: Math.round(guidanceContinuity),
        readability: Math.round(readability),
        pmrAccessibility: Math.round(pmrAccessibility),
      },
      justifications,
    },
    summary: {
      totalPanels: allPanels.length,
      mandatoryPanels: mandatoryPanels.length,
      optionalPanels: optionalPanels.length,
      budgetUsed,
      budgetMax: maxPanels,
      decisionNodesCovered: coveredObservers.size,
      decisionNodesTotal: totalObservers,
      avgVisibilityScore: allPanels.length
        ? allPanels.reduce((s, p) => s + p.avgVisibilityScore, 0) / allPanels.length
        : 0,
    },
  }
}

// Helper pour mapper vers SignageRecommendation (API rétro-compat)
export function toSignageRecommendations(panels: PlacedPanel[]): SignageRecommendation[] {
  return panels.map(p => {
    const type: SignageRecommendation['type'] =
      p.kind === 'emergency-plan' ? 'welcome' :
      p.kind === 'emergency-exit' || p.kind === 'exit-direction' ? 'exit' :
      p.kind === 'directional' || p.kind === 'pmr-direction' ? 'directional' :
      p.kind === 'you-are-here' ? 'you-are-here' :
      p.kind === 'information' ? 'information' :
      p.kind === 'welcome' ? 'welcome' :
      p.kind === 'exit' ? 'exit' :
      'information'

    const priority: SignageRecommendation['priority'] =
      p.priority === 'mandatory' ? 'critical' :
      p.priority === 'critical' ? 'critical' :
      p.priority === 'high' ? 'high' :
      p.priority === 'medium' ? 'medium' : 'low'

    return {
      id: p.id,
      type,
      x: p.x,
      y: p.y,
      reason: p.reason,
      priority,
      pathIds: p.pathIds,
      directionsCount: p.covers.length || 1,
      suggestedContent: [p.content],
    }
  })
}
