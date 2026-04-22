// ═══ PROPH3T ORCHESTRATOR TYPES — Sorties JSON structurées universelles ═══
// Toutes les skills PROPH3T retournent un objet conforme à ces types.
// L'UI peut alors afficher actions cliquables, scores, overlays, alertes.

export type Severity = 'info' | 'warning' | 'critical'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface SourceCitation {
  id: string
  kind: 'erp-rule' | 'benchmark' | 'project-data' | 'algorithm' | 'rag' | 'llm'
  label: string
  reference?: string
}

export interface Confidence {
  score: number             // 0-1
  level: ConfidenceLevel
  rationale: string
}

export interface Proph3tAction {
  id: string
  verb: 'reclassify-zone' | 'exclude-layer' | 'place-camera' | 'add-exit'
      | 'reposition-tenant' | 'renew-lease' | 'send-notice' | 'adjust-rent'
      | 'add-signage' | 'fix-compliance' | 'merge-zones' | 'split-zone'
      | 'flag-anomaly' | 'note'
      | 'schedule-maintenance' | 'score-tenant' | 'deploy-agents'
      | 'close-zone' | 'escalate-feedback' | 'investigate-feedback'
      | 'acknowledge-feedback'
  targetId?: string
  label: string
  rationale: string
  payload?: Record<string, unknown>
  estimatedImpact?: {
    metric: string
    before?: number | string
    after?: number | string
    unit?: string
  }
  severity: Severity
  confidence: Confidence
  sources: SourceCitation[]
  estimatedCostFcfa?: number
  estimatedDelayDays?: number
}

export interface Proph3tFinding {
  id: string
  severity: Severity
  title: string
  description: string
  affectedIds: string[]
  metric?: { name: string; value: number; unit: string }
  sources: SourceCitation[]
  confidence: Confidence
}

export interface Proph3tOverlay {
  kind: 'heatmap' | 'highlight' | 'arrow' | 'badge'
  targetId?: string
  coords?: [number, number]
  color?: string
  intensity?: number
  label?: string
}

export interface Proph3tResult<TPayload = Record<string, unknown>> {
  skill: string
  timestamp: string
  qualityScore?: number
  executiveSummary: string
  findings: Proph3tFinding[]
  actions: Proph3tAction[]
  overlays?: Proph3tOverlay[]
  payload: TPayload
  source: 'ollama' | 'claude' | 'algo'
  confidence: Confidence
  elapsedMs: number
}

export interface Proph3tCorrection {
  actionId: string
  skill: string
  decision: 'accepted' | 'rejected' | 'modified'
  modifiedPayload?: Record<string, unknown>
  reason?: string
  correctedAt: string
  correctedBy?: string
}

// ─── Helpers de construction ──────────────────────────────

export function confidence(score: number, rationale: string): Confidence {
  const s = Math.max(0, Math.min(1, score))
  const level: ConfidenceLevel = s >= 0.75 ? 'high' : s >= 0.5 ? 'medium' : 'low'
  return { score: s, level, rationale }
}

export function citeAlgo(name: string, label: string): SourceCitation {
  return { id: `algo-${name}`, kind: 'algorithm', label }
}

export function citeBenchmark(metric: string, label: string, ref?: string): SourceCitation {
  return { id: `bench-${metric}`, kind: 'benchmark', label, reference: ref }
}

export function citeErp(ruleId: string, label: string, ref?: string): SourceCitation {
  return { id: `erp-${ruleId}`, kind: 'erp-rule', label, reference: ref }
}

export function citeRag(chunkId: string, label: string): SourceCitation {
  return { id: chunkId, kind: 'rag', label }
}
