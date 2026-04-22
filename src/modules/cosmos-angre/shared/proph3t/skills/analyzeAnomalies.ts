// ═══ SKILL — Détection anomalies temps réel (CUSUM + σ + EWMA) ═══
// Scanne N séries temporelles hétérogènes et produit findings + actions.

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import {
  detectAnomalies,
  type AnomalyDetectionInput,
  type AnomalyDetectionResult,
  type AnomalyDetected,
} from '../../engines/anomalyDetectionEngine'

export interface AnomaliesInput {
  streams: AnomalyDetectionInput[]
}

export interface AnomaliesPayload {
  streams: AnomalyDetectionResult[]
  total: number
  critical: number
  worstGlobalScore: number
}

function severityToOrchestrator(s: AnomalyDetected['severity']): 'info' | 'warning' | 'critical' {
  if (s === 'critical') return 'critical'
  if (s === 'high' || s === 'medium') return 'warning'
  return 'info'
}

export async function analyzeAnomalies(
  input: AnomaliesInput,
): Promise<Proph3tResult<AnomaliesPayload>> {
  const t0 = performance.now()
  const streams = input.streams.map(s => detectAnomalies(s))
  const allAnoms: AnomalyDetected[] = streams.flatMap(s => s.anomalies)
  const critical = allAnoms.filter(a => a.severity === 'critical').length
  const worst = Math.max(0, ...streams.map(s => 100 - s.globalScore))

  const findings: Proph3tFinding[] = allAnoms.slice(0, 10).map(a => ({
    id: a.id,
    severity: severityToOrchestrator(a.severity),
    title: `${a.detector} sur ${a.source}${a.tag ? ` (${a.tag})` : ''}`,
    description: a.message,
    affectedIds: a.tag ? [a.tag] : [],
    sources: [citeAlgo(a.detector, 'CUSUM / σ-threshold / EWMA drift')],
    confidence: confidence(Math.min(0.95, 0.5 + Math.abs(a.deviation) / 10), 'Détection statistique'),
    metric: { name: 'σ-deviation', value: Math.round(a.deviation * 10) / 10, unit: 'σ' },
  }))

  const actions: Proph3tAction[] = allAnoms
    .filter(a => a.severity === 'critical' || a.severity === 'high')
    .slice(0, 5)
    .map((a, i) => ({
      id: `anom-act-${i}`,
      verb: 'flag-anomaly' as const,
      targetId: a.tag,
      label: `Investiguer ${a.source}${a.tag ? ' ' + a.tag : ''} (écart ${a.deviation.toFixed(1)}σ ${a.direction})`,
      rationale: a.message,
      payload: { source: a.source, tag: a.tag, at: a.timestamp, detector: a.detector },
      severity: severityToOrchestrator(a.severity),
      confidence: confidence(0.8, 'Détection multi-méthodes'),
      sources: [citeAlgo('cusum', 'CUSUM bidirectionnel')],
      estimatedDelayDays: a.severity === 'critical' ? 1 : 3,
    }))

  const summary = allAnoms.length === 0
    ? `Aucune anomalie détectée sur ${streams.length} flux surveillé(s).`
    : `${allAnoms.length} anomalie(s) dont ${critical} critique(s) sur ${streams.length} flux.`

  return {
    skill: 'analyzeAnomalies',
    timestamp: new Date().toISOString(),
    qualityScore: Math.max(0, 100 - critical * 15 - (allAnoms.length - critical) * 4),
    executiveSummary: summary,
    findings,
    actions,
    payload: {
      streams,
      total: allAnoms.length,
      critical,
      worstGlobalScore: worst,
    },
    source: 'algo',
    confidence: confidence(0.85, 'CUSUM + σ-threshold + EWMA multi-flux'),
    elapsedMs: performance.now() - t0,
  }
}
