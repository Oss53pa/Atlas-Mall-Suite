// ═══ PROPH3T Core — types orchestration et API ═══
//
// Référence CDC PROPH3T v1.0 §3.7 (PROPH3T-ORCH) + §4.4 (API interne typée).

import type { ParsedPlan } from '../shared/planReader/planEngineTypes'

// ─── Volumes ──────────────────────────────────────

export type VolumeId = 'vol1-commercial' | 'vol2-securitaire' | 'vol3-parcours' | 'vol4-wayfinder'

export const VOLUMES_ORDER: VolumeId[] = [
  'vol1-commercial',
  'vol2-securitaire',
  'vol3-parcours',
  'vol4-wayfinder',
]

export type VolumeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

// ─── Trace d'exécution (ORC-02) ────────────────

export type DecisionKind =
  | 'classification' | 'prediction' | 'optimization' | 'placement'
  | 'route' | 'audit' | 'simulation' | 'recommendation'

export interface DecisionSource {
  kind: 'pattern-memory' | 'rule' | 'model' | 'heuristic' | 'user-validated'
  reference?: string             // id du pattern, nom de la règle, version du modèle…
  modelVersion?: string
}

export interface DecisionTrace {
  id: string
  timestampMs: number
  volume: VolumeId
  kind: DecisionKind
  /** Description courte (lisible humain). */
  description: string
  /** Source de la décision (CDC §6.2 auditabilité). */
  source: DecisionSource
  /** Niveau de confiance 0..1. */
  confidence: number
  /** Données d'entrée (échantillon). */
  inputs?: Record<string, unknown>
  /** Sortie produite. */
  output?: unknown
  /** Alternatives écartées (pour explicabilité §6.3). */
  alternatives?: Array<{ option: string; score: number; rejected_because?: string }>
}

export interface ExecutionTrace {
  id: string
  projetId: string
  startedAt: string
  endedAt?: string
  status: VolumeStatus
  /** Volumes inclus dans la run (ORC-01). */
  volumes: VolumeId[]
  /** État par volume. */
  steps: Array<{
    volume: VolumeId
    status: VolumeStatus
    startedAt: string
    endedAt?: string
    durationMs?: number
    error?: string
    /** Décisions prises dans ce step. */
    decisions: DecisionTrace[]
    /** Output sérialisable du volume. */
    output?: Record<string, unknown>
  }>
  /** Checkpoint pour reprise (ORC-03). */
  lastCheckpoint?: {
    volume: VolumeId
    snapshotId: string
  }
  /** Statistiques agrégées. */
  stats?: {
    totalDurationMs: number
    decisionsCount: number
    avgConfidence: number
  }
}

// ─── Orchestration (ORC-01..05) ────────────────

export interface OrchestrateInput {
  projetId: string
  parsedPlan: ParsedPlan
  /** Sélection des volumes à enchaîner. */
  volumes?: VolumeId[]
  /** Reprise depuis un checkpoint existant. */
  resumeFromTraceId?: string
  /** Forcer recalcul même si cache disponible. */
  force?: boolean
  /** Callback progression (ORC-04). */
  onProgress?: (event: ProgressEvent) => void
  /** Run en Web Worker (ORC-05). */
  useWorker?: boolean
}

export interface ProgressEvent {
  volume: VolumeId
  status: VolumeStatus
  pct: number              // 0..100 sur l'ensemble de la run
  message?: string
  decisionAdded?: DecisionTrace
}

// ─── Façade API §4.4 ───────────────────────────

import type { SpaceTypeKey } from '../shared/proph3t/libraries/spaceTypeLibrary'
import type { Prediction } from '../vol1-commercial/engines/revenueForestEngine'

export interface AnalyzeResult {
  classifications: Array<{
    spaceId: string
    type: SpaceTypeKey
    confidence: number
    suggestion?: SpaceTypeKey
  }>
  topology: {
    issues: Array<{
      spaceId?: string
      /** Liste alignée sur TopologyIssueKind du topologyAuditEngine. */
      kind: 'orphan' | 'zero-area' | 'unclosed' | 'self-intersect' | 'overlap'
        | 'isolated' | 'duplicate' | 'unlabeled' | 'tiny-perimeter' | 'huge-area'
      severity: 'low' | 'medium' | 'high'
      description: string
      autoFix?: () => void
    }>
    overallScore: number   // 0..100
  }
  trace: ExecutionTrace
}

export type PredictDomain = 'commercial-revenue' | 'footfall' | 'intervention-time'

export interface OptimizeProblem {
  kind: 'mix-enseignes' | 'camera-placement' | 'agent-assignment' | 'signage-placement'
  context: Record<string, unknown>
}

export interface OptimizeSolution {
  rank: number              // 1 = meilleur
  score: number
  config: unknown
  rationale: string
}

/**
 * Façade unifiée PROPH3T (CDC §4.4).
 * Toutes les interactions des volumes avec l'IA passent par cette API.
 */
export interface Proph3tApi {
  analyze(plan: ParsedPlan, opts?: { projetId?: string }): Promise<AnalyzeResult>
  orchestrate(input: OrchestrateInput): Promise<ExecutionTrace>
  predict<T = Prediction>(context: Record<string, unknown>, type: PredictDomain): Promise<T>
  optimize(problem: OptimizeProblem, constraints?: Record<string, unknown>): Promise<OptimizeSolution[]>
  learn(pattern: PatternEntry, context: Record<string, unknown>): Promise<void>
  feedback(qrCode: string, data: FeedbackEntry): Promise<void>
}

export interface PatternEntry {
  type: 'label-correction' | 'category-correction' | 'panel-placement' | 'layer-classification' | 'exclusion'
  triggerKey: string
  appliedValue: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface FeedbackEntry {
  panelRef: string
  status: 'ok' | 'illisible' | 'absent' | 'mal-oriente' | 'degrade' | 'obsolete' | 'autre'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  note?: string
  agentName?: string
}
