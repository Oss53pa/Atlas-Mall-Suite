// ═══ Execution Trace — auditabilité (CDC §6.2) ═══
//
// Chaque décision automatisée DOIT être justifiée et traçable :
//   - Source (pattern mémoire / règle / modèle)
//   - Confiance
//   - Inputs ayant conduit à la décision
//   - Alternatives considérées
//   - Horodatage + version modèle
//
// Persistance : table Supabase `proph3t_execution_traces` (migration 013).

import { supabase, isOfflineMode } from '../../../lib/supabase'
import type {
  ExecutionTrace, DecisionTrace, VolumeId, VolumeStatus,
} from './types'

// ─── Builder ───────────────────────────────────────

export class TraceBuilder {
  private trace: ExecutionTrace

  constructor(projetId: string, volumes: VolumeId[]) {
    this.trace = {
      id: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projetId,
      startedAt: new Date().toISOString(),
      status: 'running',
      volumes,
      steps: volumes.map(v => ({
        volume: v,
        status: 'pending',
        startedAt: '',
        decisions: [],
      })),
    }
  }

  startStep(volume: VolumeId): void {
    const step = this.trace.steps.find(s => s.volume === volume)
    if (step) {
      step.status = 'running'
      step.startedAt = new Date().toISOString()
    }
  }

  endStep(volume: VolumeId, status: VolumeStatus, output?: Record<string, unknown>, error?: string): void {
    const step = this.trace.steps.find(s => s.volume === volume)
    if (step) {
      step.status = status
      step.endedAt = new Date().toISOString()
      step.durationMs = new Date(step.endedAt).getTime() - new Date(step.startedAt).getTime()
      if (output) step.output = output
      if (error) step.error = error
    }
  }

  recordDecision(volume: VolumeId, decision: Omit<DecisionTrace, 'id' | 'timestampMs' | 'volume'>): DecisionTrace {
    const fullDecision: DecisionTrace = {
      ...decision,
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestampMs: Date.now(),
      volume,
    }
    const step = this.trace.steps.find(s => s.volume === volume)
    if (step) step.decisions.push(fullDecision)
    return fullDecision
  }

  setCheckpoint(volume: VolumeId, snapshotId: string): void {
    this.trace.lastCheckpoint = { volume, snapshotId }
  }

  finalize(globalStatus: VolumeStatus): ExecutionTrace {
    this.trace.endedAt = new Date().toISOString()
    this.trace.status = globalStatus
    const allDecisions = this.trace.steps.flatMap(s => s.decisions)
    this.trace.stats = {
      totalDurationMs: new Date(this.trace.endedAt).getTime() - new Date(this.trace.startedAt).getTime(),
      decisionsCount: allDecisions.length,
      avgConfidence: allDecisions.length
        ? allDecisions.reduce((s, d) => s + d.confidence, 0) / allDecisions.length
        : 0,
    }
    return this.trace
  }

  current(): ExecutionTrace {
    return this.trace
  }
}

// ─── Persistance Supabase ─────────────────────

export async function persistTrace(trace: ExecutionTrace): Promise<{ success: boolean; error?: string }> {
  if (isOfflineMode) {
    const key = 'atlas-proph3t-traces'
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]')
    existing.unshift(trace)
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)))
    return { success: true }
  }
  const { error } = await supabase.from('proph3t_execution_traces').insert({
    id: trace.id,
    projet_id: trace.projetId,
    started_at: trace.startedAt,
    ended_at: trace.endedAt,
    status: trace.status,
    volumes: trace.volumes,
    steps: trace.steps,
    last_checkpoint: trace.lastCheckpoint ?? null,
    stats: trace.stats ?? null,
  })
  return { success: !error, error: error?.message }
}

export async function loadTrace(traceId: string): Promise<ExecutionTrace | null> {
  if (isOfflineMode) {
    const all: ExecutionTrace[] = JSON.parse(localStorage.getItem('atlas-proph3t-traces') ?? '[]')
    return all.find(t => t.id === traceId) ?? null
  }
  const { data } = await supabase
    .from('proph3t_execution_traces')
    .select('*')
    .eq('id', traceId)
    .single()
  if (!data) return null
  return {
    id: data.id,
    projetId: data.projet_id,
    startedAt: data.started_at,
    endedAt: data.ended_at,
    status: data.status,
    volumes: data.volumes,
    steps: data.steps,
    lastCheckpoint: data.last_checkpoint,
    stats: data.stats,
  }
}

export async function listTraces(projetId: string, limit = 20): Promise<ExecutionTrace[]> {
  if (isOfflineMode) {
    const all: ExecutionTrace[] = JSON.parse(localStorage.getItem('atlas-proph3t-traces') ?? '[]')
    return all.filter(t => t.projetId === projetId).slice(0, limit)
  }
  const { data } = await supabase
    .from('proph3t_execution_traces')
    .select('*')
    .eq('projet_id', projetId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map(d => ({
    id: d.id, projetId: d.projet_id,
    startedAt: d.started_at, endedAt: d.ended_at,
    status: d.status, volumes: d.volumes, steps: d.steps,
    lastCheckpoint: d.last_checkpoint, stats: d.stats,
  }))
}

// ─── Explicabilité (§6.3) ─────────────────────

/** Produit un texte humain lisible expliquant une décision. */
export function explainDecision(d: DecisionTrace): string {
  const conf = `${(d.confidence * 100).toFixed(0)}% de confiance`
  const sourceTxt = d.source.kind === 'pattern-memory'
    ? `pattern mémoire ${d.source.reference ?? ''}`
    : d.source.kind === 'rule'
    ? `règle métier ${d.source.reference ?? ''}`
    : d.source.kind === 'model'
    ? `modèle ${d.source.modelVersion ?? d.source.reference ?? ''}`
    : d.source.kind === 'heuristic'
    ? 'heuristique'
    : 'décision validée par utilisateur'
  let txt = `${d.description} — ${conf}, source : ${sourceTxt}.`
  if (d.alternatives && d.alternatives.length > 0) {
    txt += ` Alternatives écartées : ${d.alternatives.slice(0, 2).map(a =>
      `${a.option} (${a.score.toFixed(2)}, ${a.rejected_because ?? 'score inférieur'})`
    ).join(' ; ')}.`
  }
  return txt
}
