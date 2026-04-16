// ═══ PROPH3T RESULT PANEL — Affiche un résultat avec actions cliquables et RLHF ═══

import React, { useState } from 'react'
import { Sparkles, AlertTriangle, AlertCircle, Info, Check, X, Edit3, Cpu, Cloud, Database } from 'lucide-react'
import type { Proph3tResult, Proph3tAction, Proph3tFinding, Severity } from '../orchestrator.types'
import { applyCorrection } from '../orchestrator'

interface Props {
  result: Proph3tResult<unknown>
  /** Callback quand une action est acceptée (l'app doit l'appliquer). */
  onApplyAction?: (action: Proph3tAction) => Promise<void> | void
  className?: string
  /** Compact : panneau réduit (header + 3 actions max). */
  compact?: boolean
}

const SEV_COLOR: Record<Severity, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  critical: '#ef4444',
}
const SEV_ICON: Record<Severity, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  warning: AlertCircle,
  critical: AlertTriangle,
}

export function Proph3tResultPanel({ result, onApplyAction, className = '', compact = false }: Props) {
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set())
  const [rejectedActions, setRejectedActions] = useState<Set<string>>(new Set())
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState('')
  const [expandedFindings, setExpandedFindings] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const handleAccept = async (action: Proph3tAction) => {
    if (busyAction) return
    setBusyAction(action.id)
    try {
      await onApplyAction?.(action)
      setAppliedActions(p => new Set(p).add(action.id))
      applyCorrection({
        actionId: action.id,
        skill: result.skill,
        decision: 'accepted',
        correctedAt: new Date().toISOString(),
      })
    } finally {
      setBusyAction(null)
    }
  }

  const handleReject = (action: Proph3tAction) => {
    setRejectedActions(p => new Set(p).add(action.id))
    applyCorrection({
      actionId: action.id,
      skill: result.skill,
      decision: 'rejected',
      reason: editReason || undefined,
      correctedAt: new Date().toISOString(),
    })
    setEditingActionId(null)
    setEditReason('')
  }

  const sourceIcon = result.source === 'ollama' ? Cpu : result.source === 'claude' ? Cloud : Database
  const SourceIcon = sourceIcon
  const sourceLabel = result.source === 'ollama' ? 'PROPH3T local' : result.source === 'claude' ? 'PROPH3T (fallback)' : 'PROPH3T algo'

  const visibleActions = compact ? result.actions.slice(0, 3) : result.actions

  return (
    <div className={`rounded-xl border border-purple-500/30 bg-gradient-to-br from-slate-950 to-purple-950/30 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-purple-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold text-white">PROPH3T</h3>
              <span className="text-[9px] uppercase tracking-wider text-purple-300/80 font-mono">{result.skill}</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/50 border border-white/[0.06]">
                <SourceIcon size={9} className="text-slate-400" />
                <span className="text-[9px] text-slate-400">{sourceLabel}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{result.executiveSummary}</p>
          </div>
        </div>
        {result.qualityScore !== undefined && (
          <div className="flex flex-col items-center gap-0.5 ml-3">
            <div className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center ${
              result.qualityScore >= 75 ? 'border-emerald-500/60 bg-emerald-900/20' :
              result.qualityScore >= 50 ? 'border-amber-500/60 bg-amber-900/20' :
              'border-red-500/60 bg-red-900/20'
            }`}>
              <span className={`text-[18px] font-bold tabular-nums ${
                result.qualityScore >= 75 ? 'text-emerald-300' :
                result.qualityScore >= 50 ? 'text-amber-300' :
                'text-red-300'
              }`}>{result.qualityScore}</span>
            </div>
            <span className="text-[8px] uppercase text-slate-500 tracking-widest">/100</span>
          </div>
        )}
      </div>

      {/* Findings */}
      {result.findings.length > 0 && (
        <div className="border-b border-white/[0.06] px-4 py-2">
          <button onClick={() => setExpandedFindings(v => !v)}
            className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-white">
            {expandedFindings ? '▾' : '▸'} Diagnostic ({result.findings.length})
          </button>
          {expandedFindings && (
            <div className="mt-2 space-y-1.5">
              {result.findings.map(f => {
                const Icon = SEV_ICON[f.severity]
                return (
                  <div key={f.id} className="flex items-start gap-2 p-2 rounded bg-slate-900/50">
                    <Icon size={12} style={{ color: SEV_COLOR[f.severity] }} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-[11px] text-white font-medium">{f.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{f.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {visibleActions.length > 0 && (
        <div className="p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">
            Actions recommandées ({result.actions.length})
          </div>
          {visibleActions.map(action => {
            const Icon = SEV_ICON[action.severity]
            const applied = appliedActions.has(action.id)
            const rejected = rejectedActions.has(action.id)
            const isEditing = editingActionId === action.id

            return (
              <div key={action.id} className={`rounded-lg border p-2.5 transition-all ${
                applied ? 'border-emerald-500/40 bg-emerald-900/10' :
                rejected ? 'border-red-500/30 bg-red-900/10 opacity-60' :
                'border-white/[0.05] bg-slate-900/30 hover:border-white/[0.12]'
              }`}>
                <div className="flex items-start gap-2">
                  <Icon size={12} style={{ color: SEV_COLOR[action.severity] }} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-white">{action.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        action.confidence.level === 'high' ? 'bg-emerald-900/40 text-emerald-300' :
                        action.confidence.level === 'medium' ? 'bg-amber-900/40 text-amber-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        conf. {(action.confidence.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{action.rationale}</p>
                    {action.estimatedImpact && (
                      <div className="text-[10px] text-cyan-400 mt-1">
                        Impact : {action.estimatedImpact.metric}
                        {action.estimatedImpact.before !== undefined && ` ${action.estimatedImpact.before}`}
                        {action.estimatedImpact.after !== undefined && ` → ${action.estimatedImpact.after}`}
                        {action.estimatedImpact.unit && ` ${action.estimatedImpact.unit}`}
                      </div>
                    )}
                    {action.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {action.sources.map(s => (
                          <span key={s.id} title={s.reference} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-white/[0.04]">
                            {s.kind} · {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {isEditing && (
                      <div className="mt-2 space-y-1">
                        <input
                          autoFocus
                          value={editReason}
                          onChange={e => setEditReason(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleReject(action); if (e.key === 'Escape') setEditingActionId(null) }}
                          placeholder="Motif du refus (pour calibrer PROPH3T)…"
                          className="w-full text-[10px] px-2 py-1 rounded bg-slate-800 border border-white/[0.06] text-white outline-none focus:border-purple-500/50"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => handleReject(action)} className="text-[10px] px-2 py-1 rounded bg-red-600/30 text-red-200">Refuser avec motif</button>
                          <button onClick={() => { setEditingActionId(null); setEditReason('') }} className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400">Annuler</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {!applied && !rejected && !isEditing && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => handleAccept(action)}
                        disabled={busyAction === action.id}
                        className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 disabled:opacity-50"
                        title="Accepter">
                        <Check size={12} />
                      </button>
                      <button onClick={() => setEditingActionId(action.id)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                        title="Refuser avec motif">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {applied && <span className="text-[10px] text-emerald-400 flex-shrink-0">✓ appliqué</span>}
                  {rejected && <span className="text-[10px] text-red-400 flex-shrink-0">✕ refusé</span>}
                </div>
              </div>
            )
          })}
          {compact && result.actions.length > 3 && (
            <div className="text-center text-[10px] text-slate-500 pt-1">
              + {result.actions.length - 3} autre(s) action(s)
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-slate-500">
        <span>Confiance globale : <strong className="text-slate-300">{(result.confidence.score * 100).toFixed(0)}%</strong> · {result.confidence.rationale}</span>
        <span>{result.elapsedMs.toFixed(0)} ms</span>
      </div>
    </div>
  )
}
