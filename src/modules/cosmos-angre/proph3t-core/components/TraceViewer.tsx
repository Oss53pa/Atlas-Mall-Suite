// ═══ Trace Viewer ═══
//
// Visualise un ExecutionTrace PROPH3T (CDC §6.2 auditabilité) :
//   - Timeline volumes (Vol.1 → Vol.2 → Vol.3 → Vol.4) avec statut
//   - Liste de décisions par volume (filtres kind/source/conf)
//   - Drill-down sur une décision : explainDecision() + alternatives
//   - Stats agrégées (durée, count, conf moyenne)

import { useMemo, useState } from 'react'
import {
  CheckCircle2, XCircle, Loader2, Clock, Brain, Filter,
  ChevronRight, Cpu, BookOpen, User, Lightbulb, Award,
} from 'lucide-react'
import type {
  ExecutionTrace, DecisionTrace, DecisionKind, DecisionSource, VolumeId,
} from '../types'
import { explainDecision } from '../executionTrace'

interface Props {
  trace: ExecutionTrace
  onClose?: () => void
}

const VOLUME_META: Record<VolumeId, { label: string; color: string }> = {
  'vol1-commercial':  { label: 'Vol.1 Commercial',  color: '#10b981' },
  'vol2-securitaire': { label: 'Vol.2 Sécuritaire', color: '#ef4444' },
  'vol3-parcours':    { label: 'Vol.3 Parcours',    color: '#f59e0b' },
  'vol4-wayfinder':   { label: 'Vol.4 Wayfinder',   color: '#0ea5e9' },
}

const STATUS_ICON = {
  pending:  Clock,
  running:  Loader2,
  success:  CheckCircle2,
  failed:   XCircle,
  skipped:  ChevronRight,
} as const

const STATUS_COLOR = {
  pending:  '#64748b',
  running:  '#0ea5e9',
  success:  '#10b981',
  failed:   '#ef4444',
  skipped:  '#94a3b8',
} as const

const SOURCE_ICON: Record<DecisionSource['kind'], React.ComponentType<any>> = {
  'pattern-memory':  Brain,
  'rule':            BookOpen,
  'model':           Cpu,
  'heuristic':       Lightbulb,
  'user-validated':  User,
}

export function TraceViewer({ trace, onClose }: Props) {
  const [selectedVolume, setSelectedVolume] = useState<VolumeId | 'all'>('all')
  const [selectedKind, setSelectedKind] = useState<DecisionKind | 'all'>('all')
  const [selectedDecision, setSelectedDecision] = useState<DecisionTrace | null>(null)

  const allDecisions = useMemo(
    () => trace.steps.flatMap(s => s.decisions),
    [trace],
  )

  const filtered = useMemo(() => {
    return allDecisions.filter(d => {
      if (selectedVolume !== 'all' && d.volume !== selectedVolume) return false
      if (selectedKind !== 'all' && d.kind !== selectedKind) return false
      return true
    })
  }, [allDecisions, selectedVolume, selectedKind])

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="text-purple-400" size={16} />
          <div>
            <h2 className="text-sm font-bold text-white">Trace d'exécution PROPH3T</h2>
            <code className="text-[10px] text-slate-500">{trace.id}</code>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>
            <strong className="text-white">{trace.stats?.decisionsCount ?? allDecisions.length}</strong> décisions
          </span>
          <span>
            Conf moy : <strong className="text-emerald-400">
              {((trace.stats?.avgConfidence ?? 0) * 100).toFixed(0)}%
            </strong>
          </span>
          <span>
            Durée : <strong className="text-white">
              {((trace.stats?.totalDurationMs ?? 0) / 1000).toFixed(1)}s
            </strong>
          </span>
          {onClose && (
            <button onClick={onClose} className="ml-2 px-2 py-1 rounded hover:bg-white/10 text-slate-400">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Timeline volumes */}
      <div className="px-5 py-4 border-b border-white/5 bg-slate-900/40">
        <div className="flex items-center gap-2">
          {trace.steps.map((step, idx) => {
            const meta = VOLUME_META[step.volume]
            const Icon = STATUS_ICON[step.status]
            const color = STATUS_COLOR[step.status]
            return (
              <div key={step.volume} className="flex items-center flex-1">
                <button
                  onClick={() => setSelectedVolume(step.volume)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-left transition ${
                    selectedVolume === step.volume ? 'ring-2 ring-purple-500' : ''
                  }`}
                  style={{
                    borderColor: `${meta.color}40`,
                    background: `${meta.color}10`,
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-bold tracking-wider" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <Icon
                      size={12}
                      style={{ color }}
                      className={step.status === 'running' ? 'animate-spin' : ''}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {step.decisions.length} déc. · {step.durationMs ? `${(step.durationMs / 1000).toFixed(1)}s` : '—'}
                  </div>
                  {step.error && (
                    <div className="text-[9px] text-red-400 mt-1 truncate" title={step.error}>
                      ✕ {step.error}
                    </div>
                  )}
                </button>
                {idx < trace.steps.length - 1 && (
                  <ChevronRight size={14} className="text-slate-600 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Filtres */}
      <div className="px-5 py-2 border-b border-white/5 flex items-center gap-3 bg-slate-900/20">
        <Filter size={12} className="text-slate-500" />
        <select
          value={selectedVolume}
          onChange={e => setSelectedVolume(e.target.value as VolumeId | 'all')}
          className="bg-slate-900 border border-white/10 text-[11px] text-slate-300 px-2 py-1 rounded"
        >
          <option value="all">Tous volumes</option>
          {trace.volumes.map(v => (
            <option key={v} value={v}>{VOLUME_META[v].label}</option>
          ))}
        </select>
        <select
          value={selectedKind}
          onChange={e => setSelectedKind(e.target.value as DecisionKind | 'all')}
          className="bg-slate-900 border border-white/10 text-[11px] text-slate-300 px-2 py-1 rounded"
        >
          <option value="all">Tous types</option>
          {(['classification', 'prediction', 'optimization', 'placement',
             'route', 'audit', 'simulation', 'recommendation'] as DecisionKind[]).map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <span className="text-[10px] text-slate-500 ml-auto">
          {filtered.length} décision(s)
        </span>
      </div>

      {/* Liste + détail */}
      <div className="flex-1 flex min-h-0">
        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              Aucune décision avec ces filtres.
            </div>
          )}
          {filtered.map(d => {
            const meta = VOLUME_META[d.volume]
            const SourceIcon = SOURCE_ICON[d.source.kind]
            const isSelected = selectedDecision?.id === d.id
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDecision(d)}
                className={`w-full text-left p-2.5 rounded border transition ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-700'
                    : 'bg-slate-900/50 border-white/5 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-start gap-2">
                  <SourceIcon size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: `${meta.color}25`, color: meta.color }}
                      >
                        {d.kind}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(d.timestampMs).toLocaleTimeString('fr-FR')}
                      </span>
                      <span className="text-[9px] text-emerald-400 ml-auto tabular-nums">
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 m-0 truncate">{d.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Détail */}
        {selectedDecision && (
          <div className="w-[360px] border-l border-white/10 overflow-y-auto p-4 bg-slate-900/40">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Détail décision</h3>
              <button
                onClick={() => setSelectedDecision(null)}
                className="text-slate-500 hover:text-white text-sm"
              >✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Description</div>
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  {selectedDecision.description}
                </p>
              </div>

              <div>
                <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Source</div>
                <p className="text-[11px] text-slate-300">
                  {selectedDecision.source.kind}
                  {selectedDecision.source.reference && (
                    <code className="text-[10px] text-blue-400 ml-2">
                      {selectedDecision.source.reference}
                    </code>
                  )}
                  {selectedDecision.source.modelVersion && (
                    <span className="text-[10px] text-slate-500 ml-2">
                      v{selectedDecision.source.modelVersion}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Confiance</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selectedDecision.confidence * 100}%`,
                        background: selectedDecision.confidence > 0.75
                          ? '#10b981'
                          : selectedDecision.confidence > 0.5 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className="text-[11px] tabular-nums text-white font-bold">
                    {(selectedDecision.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {selectedDecision.alternatives && selectedDecision.alternatives.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">
                    Alternatives écartées
                  </div>
                  <ul className="space-y-1">
                    {selectedDecision.alternatives.map((a, i) => (
                      <li key={i} className="text-[10px] text-slate-400 flex items-baseline gap-2">
                        <span>•</span>
                        <span>
                          <strong className="text-slate-300">{a.option}</strong>
                          <span className="text-slate-600 ml-1">({a.score.toFixed(2)})</span>
                          {a.rejected_because && (
                            <span className="text-slate-500 ml-1">— {a.rejected_because}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedDecision.output !== undefined && (
                <div>
                  <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">Output</div>
                  <pre className="text-[10px] text-slate-400 bg-slate-950 rounded p-2 overflow-auto max-h-40 m-0">
{JSON.stringify(selectedDecision.output, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <div className="text-[9px] uppercase text-slate-500 tracking-wider mb-1">
                  Explication humaine
                </div>
                <p className="text-[11px] text-amber-200/90 italic leading-relaxed bg-amber-950/20 border border-amber-900/30 rounded p-2">
                  {explainDecision(selectedDecision)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
