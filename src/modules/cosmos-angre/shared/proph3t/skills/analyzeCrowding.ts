// ═══ SKILL — Prédiction surpopulation & risque piétinement ═══

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import {
  forecastCrowdingBatch,
  type ZoneCapacity,
  type FootfallSample,
  type CrowdingForecast,
} from '../../engines/crowdingPredictor'

export interface CrowdingInput {
  zones: ZoneCapacity[]
  history: FootfallSample[]
  horizonHours?: number
}

export interface CrowdingPayload {
  forecasts: CrowdingForecast[]
  criticalZones: number
  overcrowdedZones: number
}

export async function analyzeCrowding(
  input: CrowdingInput,
): Promise<Proph3tResult<CrowdingPayload>> {
  const t0 = performance.now()
  const forecasts = forecastCrowdingBatch(input.zones, input.history, input.horizonHours ?? 6)

  const critical = forecasts.filter(f => f.peak.level === 'critical')
  const overcrowded = forecasts.filter(f => f.peak.level === 'overcrowded')

  const findings: Proph3tFinding[] = [...critical, ...overcrowded].slice(0, 10).map((f, i) => ({
    id: `crowd-${i}`,
    severity: f.peak.level === 'critical' ? 'critical' : 'warning',
    title: `Surpopulation ${f.peak.level} prévue : ${f.zoneLabel}`,
    description: `Pic à ${new Date(f.peak.timestamp).toLocaleString('fr-FR')} — ${f.peak.expectedPax} pax (${f.peak.densityPaxPerSqm.toFixed(2)} pax/m²).`,
    affectedIds: [f.zoneId],
    sources: [citeAlgo('holt-winters-seasonal', 'Lissage saisonnier + tendance')],
    confidence: confidence(0.7, 'Historique + pattern hebdo'),
    metric: { name: 'densité', value: f.peak.densityPaxPerSqm, unit: 'pax/m²' },
  }))

  const actions: Proph3tAction[] = []
  for (const f of critical) {
    actions.push({
      id: `crowd-close-${f.zoneId}`,
      verb: 'close-zone' as const,
      targetId: f.zoneId,
      label: `Fermeture partielle ${f.zoneLabel} avant ${new Date(f.peak.timestamp).toLocaleString('fr-FR')}`,
      rationale: f.recommendations.join(' • '),
      payload: { zoneId: f.zoneId, peak: f.peak },
      severity: 'critical',
      confidence: confidence(0.75, 'Densité > 3.5 pax/m² = risque piétinement'),
      sources: [citeAlgo('density-threshold', 'ISO 20382 + retour terrain')],
      estimatedDelayDays: 0,
    })
  }
  for (const f of overcrowded.slice(0, 5)) {
    actions.push({
      id: `crowd-deploy-${f.zoneId}`,
      verb: 'deploy-agents' as const,
      targetId: f.zoneId,
      label: `Déployer agents de régulation ${f.zoneLabel}`,
      rationale: f.recommendations.join(' • '),
      payload: { zoneId: f.zoneId, peak: f.peak },
      severity: 'warning',
      confidence: confidence(0.7, 'Forecast densité'),
      sources: [citeAlgo('holt-winters', 'Forecast saisonnier')],
      estimatedCostFcfa: 150_000, // coût agents × shift
      estimatedDelayDays: 0,
    })
  }

  const summary = `${critical.length} zone(s) critique(s) + ${overcrowded.length} surpeuplée(s) prévue(s) sur ${forecasts.length}.`

  return {
    skill: 'analyzeCrowding',
    timestamp: new Date().toISOString(),
    qualityScore: Math.max(0, 100 - critical.length * 25 - overcrowded.length * 10),
    executiveSummary: summary,
    findings,
    actions,
    overlays: [...critical, ...overcrowded].slice(0, 10).map(f => ({
      kind: 'heatmap' as const,
      targetId: f.zoneId,
      color: f.peak.level === 'critical' ? '#ef4444' : '#f59e0b',
      intensity: Math.min(1, f.peak.densityPaxPerSqm / 3.5),
      label: `${f.peak.expectedPax} pax`,
    })),
    payload: {
      forecasts,
      criticalZones: critical.length,
      overcrowdedZones: overcrowded.length,
    },
    source: 'algo',
    confidence: confidence(0.75, 'Forecast Holt-Winters + seuils ISO'),
    elapsedMs: performance.now() - t0,
  }
}
