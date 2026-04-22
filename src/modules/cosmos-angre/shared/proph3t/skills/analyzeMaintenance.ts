// ═══ SKILL — Maintenance prédictive (Weibull MTBF) ═══
// Prédit fenêtres optimales d'intervention sur un parc d'équipements.

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import {
  forecastMaintenanceBatch,
  type Equipment,
  type MaintenanceForecast,
} from '../../engines/predictiveMaintenanceEngine'

export interface MaintenanceInput {
  equipments: Equipment[]
}

export interface MaintenancePayload {
  total: number
  actNowCount: number
  forecasts: MaintenanceForecast[]
  totalExpectedSavingsFcfa: number
  totalPreventiveBudgetFcfa: number
}

export async function analyzeMaintenance(
  input: MaintenanceInput,
): Promise<Proph3tResult<MaintenancePayload>> {
  const t0 = performance.now()
  const batch = forecastMaintenanceBatch(input.equipments)

  const urgent = batch.forecasts.filter(
    f => f.recommendation === 'act-now' || f.recommendation === 'schedule-soon',
  )

  const findings: Proph3tFinding[] = urgent.slice(0, 10).map((f, i) => ({
    id: `maint-${i}`,
    severity: f.recommendation === 'act-now' ? 'critical' : 'warning',
    title: `${f.label} : intervention ${f.recommendation === 'act-now' ? 'URGENTE' : 'à planifier'}`,
    description: f.rationale,
    affectedIds: [f.equipmentId],
    sources: [citeAlgo('weibull-mtbf', 'Weibull CDF + quantile MTBF')],
    confidence: confidence(0.8, 'Paramètres Weibull benchmark industrie'),
    metric: { name: 'P(panne 90j)', value: Math.round(f.failureProb90d * 100), unit: '%' },
  }))

  const actions: Proph3tAction[] = urgent.slice(0, 8).map((f, i) => ({
    id: `maint-act-${i}`,
    verb: 'schedule-maintenance' as const,
    targetId: f.equipmentId,
    label: `Planifier maintenance ${f.label} (${f.recommendation})`,
    rationale: f.rationale,
    payload: { equipmentId: f.equipmentId, kind: f.kind, p50: f.p50FailureDate },
    severity: f.recommendation === 'act-now' ? 'critical' : 'warning',
    confidence: confidence(0.8, 'Weibull MTBF'),
    sources: [citeAlgo('weibull', 'Distribution Weibull')],
    estimatedCostFcfa: f.preventiveCostFcfa,
    estimatedDelayDays: f.recommendation === 'act-now' ? 7 : 45,
    estimatedImpact: {
      metric: 'Coût évité',
      before: f.unplannedFailureCostFcfa,
      after: f.preventiveCostFcfa,
      unit: 'FCFA',
    },
  }))

  const summary = `${batch.actNowCount} urgent(s) / ${batch.forecasts.length}. Budget préventif ${(batch.totalPreventiveBudget / 1_000_000).toFixed(1)} M · économies attendues ${(batch.totalExpectedSavings / 1_000_000).toFixed(1)} M FCFA.`

  return {
    skill: 'analyzeMaintenance',
    timestamp: new Date().toISOString(),
    qualityScore: Math.max(0, 100 - batch.actNowCount * 10 - (urgent.length - batch.actNowCount) * 4),
    executiveSummary: summary,
    findings,
    actions,
    payload: {
      total: batch.forecasts.length,
      actNowCount: batch.actNowCount,
      forecasts: batch.forecasts,
      totalExpectedSavingsFcfa: batch.totalExpectedSavings,
      totalPreventiveBudgetFcfa: batch.totalPreventiveBudget,
    },
    source: 'algo',
    confidence: confidence(0.8, 'Weibull benchmark équipements retail'),
    elapsedMs: performance.now() - t0,
  }
}
