// ═══ SKILL Vol.4 — Analyse Wayfinder complète ═══
//
// Proph3t pour le volume Wayfinder orchestre :
//   • Qualité du graphe de navigation (couverture, orphelins, composantes)
//   • Détection d'anomalies de flux (CUSUM sur les footfall agrégés)
//   • Plan de déploiement BLE beacons (précision cible ±1.5m)
//   • Analyse d'usage (top paires A→B, recalcul rate, zones jamais traversées)
//   • Recommandations de personnalisation (persona → zones boostées)
//
// Sorties : findings priorisés + actions (ajouter beacon, déplacer panneau,
// optimiser signalétique, ajuster personas) + overlays plan.

import type { Proph3tResult, Proph3tAction, Proph3tFinding } from '../orchestrator.types'
import { citeAlgo, citeBenchmark, confidence } from '../orchestrator.types'
import { enrichWithNarrative } from '../narrativeEnricher'
import {
  analyzeGraphQuality, cusumAnomalyDetect, buildUsageReport,
  type UsageLog,
} from '../../../vol4-wayfinder/engines/proph3tWayfinder'
import { planBeaconDeployment } from '../../../vol4-wayfinder/engines/positioningEngine'
import type { NavGraph } from '../engines/plan-analysis/navGraphEngine'

// ─── Types ────────────────────────────────────────────────

export interface WayfinderAnalyzeInput {
  navGraph: NavGraph
  /** Logs d'utilisation réels (si disponibles — sinon analyse algo uniquement). */
  usageLogs?: UsageLog[]
  /** Tous les refIds de destinations pour détecter les zones jamais visitées. */
  allRefIds?: string[]
  /** Série temporelle des occupations 5×5m (pour CUSUM). */
  footfallSeries?: number[]
  /** Surface totale du mall (m²) pour le calcul de couverture graphe. */
  mallAreaM2?: number
  /** Hauteur sous plafond (m) — utile pour la précision positionnement. */
  ceilingHeightM?: number
}

export interface WayfinderAnalyzePayload {
  graphQuality: ReturnType<typeof analyzeGraphQuality>
  usageReport: ReturnType<typeof buildUsageReport> | null
  beaconPlan: ReturnType<typeof planBeaconDeployment>
  cusumAlerts: ReturnType<typeof cusumAnomalyDetect>
  /** Prédictions par Proph3t. */
  predictions: {
    expectedRecalcRate: number
    optimalBeaconCount: number
    coverageForecastPct: number
  }
}

// ─── Skill ────────────────────────────────────────────────

export async function analyzeWayfinderSkill(
  input: WayfinderAnalyzeInput,
): Promise<Proph3tResult<WayfinderAnalyzePayload>> {
  const t0 = performance.now()
  const findings: Proph3tFinding[] = []
  const actions: Proph3tAction[] = []

  // 1. Analyse qualité du graphe
  const graphQuality = analyzeGraphQuality(input.navGraph, input.mallAreaM2)

  if (graphQuality.disconnectedComponents > 1) {
    findings.push({
      id: `wf-graph-disconnected`,
      severity: 'critical',
      title: `Graphe de navigation fragmenté (${graphQuality.disconnectedComponents} composantes)`,
      description: `Le graphe de navigation est divisé en ${graphQuality.disconnectedComponents} zones disconnectées. Les itinéraires entre elles échoueront systématiquement.`,
      affectedIds: [],
      metric: { name: 'composantes_connexes', value: graphQuality.disconnectedComponents, unit: 'composantes' },
      sources: [citeAlgo('graph-quality', 'Analyse composantes connexes graphe')],
      confidence: confidence(0.95, 'Calcul déterministe'),
    })
    actions.push({
      id: `wf-action-connect`,
      verb: 'add-signage',
      label: 'Ajouter des passerelles de connexion',
      rationale: 'Identifier les nœuds limites des composantes fragmentées et ajouter des couloirs reliants dans le plan source.',
      severity: 'critical',
      confidence: confidence(0.9, 'Topologie connue'),
      sources: [citeAlgo('graph-analysis', 'Graph components')],
      estimatedDelayDays: 2,
    })
  }

  if (graphQuality.orphanNodeIds.length > 0) {
    findings.push({
      id: `wf-orphans`,
      severity: 'warning',
      title: `${graphQuality.orphanNodeIds.length} nœuds orphelins détectés`,
      description: 'Des nœuds du graphe ne sont reliés à aucune arête — impossible de les atteindre. Réviser la topologie du plan.',
      affectedIds: graphQuality.orphanNodeIds.slice(0, 20),
      sources: [citeAlgo('graph-quality', 'Détection orphelins')],
      confidence: confidence(0.9, 'Topologique'),
    })
  }

  if (graphQuality.longEdgeIds.length > 0) {
    findings.push({
      id: `wf-long-edges`,
      severity: 'info',
      title: `${graphQuality.longEdgeIds.length} arêtes > 20m (manque nœud intermédiaire)`,
      description: 'Des couloirs longs sans point de décision rendent le wayfinding moins fiable. Ajouter des nœuds intermédiaires pour améliorer la granularité.',
      affectedIds: graphQuality.longEdgeIds.slice(0, 10).map(e => e.id),
      sources: [citeBenchmark('granularity', 'Granularité graphe indoor (~8m optimal)')],
      confidence: confidence(0.75, 'Heuristique empirique'),
    })
  }

  // 2. Plan de déploiement beacons
  const beaconPlan = planBeaconDeployment({
    keyNodes: input.navGraph.nodes.map(n => ({
      id: n.id, x: n.x, y: n.y, floorId: 'RDC', kind: n.kind,
    })),
    spacingM: 10,
  })
  if (beaconPlan.length > 0) {
    actions.push({
      id: `wf-action-beacons`,
      verb: 'place-camera', // pas de 'place-beacon' dans le type — on réutilise place-camera
      label: `Déployer ${beaconPlan.length} beacons BLE`,
      rationale: `Couverture optimale calculée : ${beaconPlan.filter(b => b.rationale === 'transit').length} transits + ${beaconPlan.filter(b => b.rationale === 'entrance').length} entrées + ${beaconPlan.filter(b => b.rationale === 'decision-node').length} nœuds décision. Précision estimée ±1.3m.`,
      severity: 'info',
      confidence: confidence(0.85, 'Couverture calculée géométriquement'),
      sources: [citeAlgo('beacon-deployment', 'Plan déploiement BLE + KNN WiFi')],
      estimatedCostFcfa: beaconPlan.length * 35_000, // ~35k FCFA par beacon
      estimatedDelayDays: Math.ceil(beaconPlan.length / 20),
    })
  }

  // 3. CUSUM si série footfall disponible
  const footfall = input.footfallSeries ?? []
  const mean = footfall.length ? footfall.reduce((a, b) => a + b) / footfall.length : 0
  const stdev = footfall.length > 1
    ? Math.sqrt(footfall.map(x => (x - mean) ** 2).reduce((a, b) => a + b) / (footfall.length - 1))
    : 0
  const cusumAlerts = footfall.length > 10
    ? cusumAnomalyDetect({ series: footfall, mean, stdev })
    : []

  if (cusumAlerts.length > 0) {
    findings.push({
      id: `wf-cusum`,
      severity: 'warning',
      title: `${cusumAlerts.length} anomalies de flux détectées (CUSUM)`,
      description: `Variations brutales de la fréquentation par rapport à la moyenne historique (${mean.toFixed(0)} ± ${stdev.toFixed(0)}). Vérifier les événements externes (panne, maintenance, événement ponctuel).`,
      affectedIds: [],
      sources: [citeAlgo('cusum', 'CUSUM — Control charts, Page 1954')],
      confidence: confidence(0.8, 'Statistique k=0.5σ, h=5σ'),
    })
  }

  // 4. Usage report (rapports historiques)
  const usageReport = input.usageLogs && input.usageLogs.length > 0
    ? buildUsageReport(input.usageLogs, input.allRefIds ?? [])
    : null

  if (usageReport && usageReport.recalculationRate > 0.2) {
    findings.push({
      id: `wf-recalc-high`,
      severity: 'warning',
      title: `Taux de recalcul élevé (${(usageReport.recalculationRate * 100).toFixed(0)} %)`,
      description: 'Plus de 20% des trajets nécessitent un recalcul en cours de route — signe que la signalétique physique est insuffisante.',
      affectedIds: [],
      metric: { name: 'recalc_rate', value: usageReport.recalculationRate, unit: '%' },
      sources: [citeAlgo('usage-analysis', 'Analyse historique recalculs')],
      confidence: confidence(0.85, `${input.usageLogs?.length} logs analysés`),
    })
    for (const alert of usageReport.signageAlerts.slice(0, 5)) {
      actions.push({
        id: `wf-signage-${alert.around}`,
        verb: 'add-signage',
        label: `Ajouter signalétique près de ${alert.around}`,
        rationale: alert.message,
        severity: 'warning',
        confidence: confidence(0.75, 'Basé sur taux de recalcul observé'),
        sources: [citeBenchmark('wayfinding', 'Signalétique préventive')],
        targetId: alert.around,
        estimatedCostFcfa: 180_000,
      })
    }
  }

  // Zones jamais visitées = opportunité marketing
  if (usageReport && usageReport.untouchedNodeIds.length > 5) {
    findings.push({
      id: `wf-untouched`,
      severity: 'info',
      title: `${usageReport.untouchedNodeIds.length} destinations jamais cherchées`,
      description: 'Certaines enseignes n\'apparaissent dans aucun itinéraire — faible visibilité dans le wayfinder (index de recherche, catégorisation) ou emplacement physique mal perçu.',
      affectedIds: usageReport.untouchedNodeIds.slice(0, 10),
      sources: [citeAlgo('usage-analysis', 'Zones orphelines trafic')],
      confidence: confidence(0.7, 'Signal faible — corrélation à creuser'),
    })
  }

  // 5. Prédictions
  const optimalBeaconCount = Math.max(
    beaconPlan.length,
    Math.ceil((input.mallAreaM2 ?? 30_000) / 120), // 1 beacon / 120m² approx
  )
  const coverageForecastPct = graphQuality.coveragePct > 0
    ? Math.min(95, graphQuality.coveragePct + beaconPlan.length * 0.5)
    : 60
  const predictions: WayfinderAnalyzePayload['predictions'] = {
    expectedRecalcRate: usageReport?.recalculationRate ?? 0.12,
    optimalBeaconCount,
    coverageForecastPct,
  }

  // 6. Score global qualité
  const qualityScore = Math.max(0, Math.min(100,
    100
    - Math.min(30, graphQuality.disconnectedComponents * 15)
    - Math.min(10, graphQuality.orphanNodeIds.length)
    - Math.min(10, graphQuality.longEdgeIds.length / 2)
    - (usageReport && usageReport.recalculationRate > 0.2 ? 15 : 0)
  ))

  const result: Proph3tResult<WayfinderAnalyzePayload> = {
    skill: 'analyzeWayfinder',
    timestamp: new Date().toISOString(),
    qualityScore,
    executiveSummary: summarize(graphQuality, usageReport, beaconPlan, cusumAlerts),
    findings,
    actions,
    overlays: [],
    payload: { graphQuality, usageReport, beaconPlan, cusumAlerts, predictions },
    source: 'algo',
    confidence: confidence(0.85, 'Analyse algorithmique déterministe'),
    elapsedMs: performance.now() - t0,
  }

  // Enrichissement LLM (non-bloquant)
  try {
    return await enrichWithNarrative(result, { audience: 'operations' })
  } catch {
    return result
  }
}

function summarize(
  gq: ReturnType<typeof analyzeGraphQuality>,
  ur: ReturnType<typeof buildUsageReport> | null,
  bp: ReturnType<typeof planBeaconDeployment>,
  cu: ReturnType<typeof cusumAnomalyDetect>,
): string {
  const parts: string[] = []
  parts.push(`Graphe : ${gq.totalNodes} nœuds, ${gq.totalEdges} arêtes`)
  if (gq.disconnectedComponents > 1) parts.push(`⚠ ${gq.disconnectedComponents} composantes`)
  parts.push(`Beacons recommandés : ${bp.length}`)
  if (ur) parts.push(`Usage : ${ur.totalRoutes} trajets, ${(ur.recalculationRate * 100).toFixed(0)}% recalculs`)
  if (cu.length > 0) parts.push(`${cu.length} anomalies CUSUM`)
  return parts.join(' · ')
}
