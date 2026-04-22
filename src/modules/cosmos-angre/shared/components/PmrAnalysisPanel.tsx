// ═══ PMR ANALYSIS PANEL ═══
// Panneau latéral listant les segments non conformes PMR avec :
//   - Score de conformité global
//   - Liste des recommandations priorisées
//   - Détail des segments (largeur, pente, norme, correction)
//   - Toggle pour surligner les segments non conformes sur la scène

import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Accessibility, Ruler, ArrowUpDown, AlertTriangle,
  CheckCircle, Eye, EyeOff,
} from 'lucide-react'
import type { FlowAnalysisResult } from '../engines/plan-analysis/flowPathEngine'
import type { PmrIssueKind } from '../engines/plan-analysis/pmrConstraintEngine'

interface Props {
  flowResult: FlowAnalysisResult
  highlightNonCompliant: boolean
  onToggleHighlight: (v: boolean) => void
  onClose: () => void
}

const ISSUE_META: Record<PmrIssueKind, { label: string; color: string; icon: string }> = {
  'narrow-passage':   { label: 'Passage étroit',      color: '#dc2626', icon: '↔' },
  'steep-slope':      { label: 'Pente trop forte',    color: '#ea580c', icon: '⬈' },
  'unramped-step':    { label: 'Marche sans rampe',   color: '#dc2626', icon: '▲' },
  'missing-elevator': { label: 'Ascenseur manquant',  color: '#dc2626', icon: '↕' },
  'obstacle-on-path': { label: 'Obstacle sur parcours', color: '#ea580c', icon: '⊘' },
}

const SEVERITY_COLOR = {
  critical: 'bg-red-600 text-white',
  high:     'bg-amber-600 text-white',
  medium:   'bg-blue-600 text-white',
}

export function PmrAnalysisPanel({
  flowResult, highlightNonCompliant, onToggleHighlight, onClose,
}: Props) {
  const pmr = flowResult.pmr
  const [expandedEdgeId, setExpandedEdgeId] = useState<string | null>(null)

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-end bg-surface-0/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[520px] max-w-[95vw] h-full bg-surface-1 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Accessibilité PMR</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!pmr && (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-[12px] text-slate-500">
              Analyse PMR non disponible. Calculer d'abord les flux (« Tracer flux & panneaux »).
            </p>
          </div>
        )}

        {pmr && (
          <>
            {/* Score + toggle surbrillance */}
            <div className="px-5 py-4 border-b border-white/5 bg-surface-0/40">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                    Conformité globale
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className="text-3xl font-bold tabular-nums"
                      style={{
                        color: pmr.complianceScore >= 90 ? '#10b981'
                              : pmr.complianceScore >= 70 ? '#f59e0b'
                              : '#ef4444',
                      }}
                    >
                      {pmr.complianceScore}
                    </span>
                    <span className="text-sm text-slate-500">/100</span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold ${
                  pmr.compliant ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40'
                                : 'bg-red-900/40 text-red-300 border border-red-700/40'
                }`}>
                  {pmr.compliant
                    ? <><CheckCircle className="w-3 h-3" /> Conforme</>
                    : <><AlertTriangle className="w-3 h-3" /> Non conforme</>
                  }
                </div>
              </div>

              <button
                onClick={() => onToggleHighlight(!highlightNonCompliant)}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-[11px] font-medium transition-colors ${
                  highlightNonCompliant
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {highlightNonCompliant ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {highlightNonCompliant ? 'Masquer' : 'Surligner'} les segments non conformes
              </button>
            </div>

            {/* Stats */}
            <div className="px-5 py-3 border-b border-white/5 grid grid-cols-4 gap-2 text-[10px]">
              <StatCell label="Total arêtes" value={pmr.stats.totalEdges} color="text-white" />
              <StatCell label="Non conformes" value={pmr.stats.nonCompliantEdges} color="text-red-400" />
              <StatCell label="Étroits" value={pmr.stats.narrowPassages} color="text-amber-400" />
              <StatCell label="Pentes" value={pmr.stats.steepSlopes} color="text-orange-400" />
            </div>

            {/* Recommandations */}
            {pmr.recommendations.length > 0 && (
              <div className="px-5 py-3 border-b border-white/5">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Recommandations
                </h3>
                <ul className="space-y-2">
                  {pmr.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px]">
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${SEVERITY_COLOR[r.priority]}`}>
                        {r.priority.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-slate-300 m-0 leading-snug">{r.message}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {r.edgeIds.length} segment{r.edgeIds.length > 1 ? 's' : ''} concerné{r.edgeIds.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Liste détaillée segments non conformes */}
            <div className="flex-1 overflow-y-auto p-3">
              {pmr.nonCompliantEdges.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-[12px] text-emerald-400 text-center">
                    ✓ Tous les segments sont conformes PMR
                  </p>
                </div>
              )}
              {pmr.nonCompliantEdges.map(edge => {
                const expanded = expandedEdgeId === edge.edgeId
                const worstSeverity = edge.issues.reduce((w, i) =>
                  i.severity === 'critical' ? 'critical'
                  : (w !== 'critical' && i.severity === 'high') ? 'high'
                  : w, 'medium' as 'critical' | 'high' | 'medium')
                return (
                  <div
                    key={edge.edgeId}
                    className="mb-2 rounded-md bg-surface-0/60 border border-red-900/40 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEdgeId(expanded ? null : edge.edgeId)}
                      className="w-full px-3 py-2 text-left hover:bg-surface-1 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${SEVERITY_COLOR[worstSeverity]}`}>
                            {worstSeverity.toUpperCase()}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 truncate">
                            {edge.edgeId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] tabular-nums">
                          <span className="text-slate-500">
                            <Ruler className="w-3 h-3 inline" /> {edge.widthM.toFixed(2)}m
                          </span>
                          {edge.slopePct > 0 && (
                            <span className="text-slate-500">
                              <ArrowUpDown className="w-3 h-3 inline" /> {edge.slopePct.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-slate-500">{edge.lengthM.toFixed(0)}m</span>
                        </div>
                      </div>
                    </button>
                    {expanded && (
                      <div className="px-3 py-2 border-t border-white/5 space-y-2">
                        {edge.issues.map((issue, i) => {
                          const meta = ISSUE_META[issue.kind]
                          return (
                            <div key={i} className="text-[11px]">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span
                                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{ backgroundColor: meta.color }}
                                >
                                  {meta.icon}
                                </span>
                                <span className="text-slate-200 font-semibold">{meta.label}</span>
                              </div>
                              <p className="text-slate-400 m-0 leading-snug">{issue.message}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                <span className="text-amber-400/80">⚖ {issue.standardRef}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1 italic">
                                ↪ {issue.recommendation}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Transitions verticales + ruptures guidage */}
            {flowResult.verticalTransitions && flowResult.verticalTransitions.length > 0 && (
              <div className="px-5 py-3 border-t border-white/5 bg-surface-0/40">
                <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Transitions verticales ({flowResult.verticalTransitions.length})
                </h3>
                <ul className="space-y-1 mb-3">
                  {flowResult.verticalTransitions.slice(0, 5).map(t => (
                    <li key={t.id} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300">
                        {t.kind === 'elevator' ? '⬆' : t.kind === 'escalator' ? '↗' : t.kind === 'stair' ? '◇' : '⬈'}
                        {' '}{t.label}
                      </span>
                      <span className="text-slate-500 tabular-nums">
                        {t.durationS}s · {t.pmrCompliant ? '♿ PMR' : 'non-PMR'}
                      </span>
                    </li>
                  ))}
                </ul>
                {flowResult.guidanceRuptures && flowResult.guidanceRuptures.length > 0 && (
                  <>
                    <h4 className="text-[11px] text-amber-400 font-semibold mb-1">
                      ⚠ {flowResult.guidanceRuptures.length} rupture{flowResult.guidanceRuptures.length > 1 ? 's' : ''} de guidage
                    </h4>
                    <ul className="space-y-1">
                      {flowResult.guidanceRuptures.slice(0, 3).map(r => (
                        <li key={`${r.transitionId}-${r.floorId}`} className="text-[10px] text-amber-200/80">
                          {r.message}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-slate-600 uppercase text-[8px] tracking-wider">{label}</div>
      <div className={`font-bold text-base tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
