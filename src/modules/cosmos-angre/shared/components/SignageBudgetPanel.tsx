// ═══ SIGNAGE BUDGET PANEL ═══
// Panneau latéral : règle le budget de panneaux optionnels, affiche le score
// de cohérence (formule spec PROPH3T Vol.3) et la liste des panneaux placés
// triés par priorité.

import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Signpost, ShieldAlert, Eye, Accessibility, Award, Info,
} from 'lucide-react'
import type { FlowAnalysisResult } from '../engines/plan-analysis/flowPathEngine'
import type { PlacedPanel } from '../engines/plan-analysis/signagePlacementEngine'

interface Props {
  flowResult: FlowAnalysisResult
  signageBudget: number
  onBudgetChange: (n: number) => void
  onRecompute: () => void
  onClose: () => void
}

const KIND_META: Record<PlacedPanel['kind'], { label: string; color: string; icon: string }> = {
  welcome:            { label: 'Accueil',              color: '#10b981', icon: 'ⓘ' },
  directional:        { label: 'Directionnel',         color: '#f59e0b', icon: '↗' },
  'you-are-here':     { label: 'Vous êtes ici',        color: '#6366f1', icon: '◉' },
  information:        { label: 'Information',          color: '#8b5cf6', icon: 'i' },
  exit:               { label: 'Sortie',               color: '#ef4444', icon: '⎋' },
  'emergency-plan':   { label: 'Plan évacuation ERP',  color: '#059669', icon: '🗺' },
  'emergency-exit':   { label: 'Sortie secours ISO',   color: '#dc2626', icon: '🏃' },
  'exit-direction':   { label: 'Direction sortie',     color: '#b91c1c', icon: '→' },
  'pmr-direction':    { label: 'Direction PMR',        color: '#2563eb', icon: '♿' },
}

const PRIO_COLOR: Record<PlacedPanel['priority'], string> = {
  mandatory: 'bg-red-600 text-white',
  critical:  'bg-red-700 text-white',
  high:      'bg-amber-600 text-white',
  medium:    'bg-blue-600 text-white',
  low:       'bg-slate-700 text-slate-200',
}

const PRIO_LABEL: Record<PlacedPanel['priority'], string> = {
  mandatory: 'Obligatoire',
  critical:  'Critique',
  high:      'Élevée',
  medium:    'Moyenne',
  low:       'Faible',
}

export function SignageBudgetPanel({
  flowResult, signageBudget, onBudgetChange, onRecompute, onClose,
}: Props) {
  const placement = flowResult.placement

  const panelsByPrio = useMemo(() => {
    if (!placement) return []
    const order: PlacedPanel['priority'][] = ['mandatory', 'critical', 'high', 'medium', 'low']
    return order.map(pr => ({
      priority: pr,
      panels: placement.panels.filter(p => p.priority === pr),
    })).filter(g => g.panels.length > 0)
  }, [placement])

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-end bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-[520px] max-w-[95vw] h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Signpost className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Signalétique — budget & score</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Budget slider */}
        <div className="p-5 border-b border-white/5 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              Budget panneaux optionnels
            </label>
            <span className="text-lg font-bold text-white tabular-nums">
              {signageBudget}
            </span>
          </div>
          <input
            type="range"
            min={10} max={200} step={5}
            value={signageBudget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>10</span><span>50</span><span>100</span><span>200</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Les panneaux ERP (sortie secours /30m) sont prioritaires et non comptés dans le budget.
          </p>
          <button
            onClick={onRecompute}
            className="mt-3 w-full py-2 rounded-md text-[11px] font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90"
          >
            Recalculer avec ce budget
          </button>
        </div>

        {/* Score de cohérence */}
        {placement && (
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                <Award className="w-3 h-3" />
                Score de cohérence
              </h3>
              <ScoreRing value={placement.coherence.total} />
            </div>

            <div className="space-y-2">
              <CoherenceBar
                label="Couverture nœuds de décision"
                value={placement.coherence.breakdown.decisionCoverage}
                weight={40}
                color="#34d399"
                icon={<Info className="w-3 h-3" />}
              />
              <CoherenceBar
                label="Continuité de guidage (ERP)"
                value={placement.coherence.breakdown.guidanceContinuity}
                weight={30}
                color="#f59e0b"
                icon={<ShieldAlert className="w-3 h-3" />}
              />
              <CoherenceBar
                label="Lisibilité panneaux"
                value={placement.coherence.breakdown.readability}
                weight={20}
                color="#60a5fa"
                icon={<Eye className="w-3 h-3" />}
              />
              <CoherenceBar
                label="Accessibilité PMR"
                value={placement.coherence.breakdown.pmrAccessibility}
                weight={10}
                color="#a78bfa"
                icon={<Accessibility className="w-3 h-3" />}
              />
            </div>

            <ul className="mt-3 space-y-1 text-[11px] text-slate-400">
              {placement.coherence.justifications.map((j, i) => (
                <li key={i} className="leading-snug">{j}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary panneaux */}
        {placement && (
          <div className="px-5 py-3 border-b border-white/5 bg-slate-950/20 grid grid-cols-4 gap-2 text-[10px]">
            <Kpi label="Total" value={placement.summary.totalPanels} color="text-white" />
            <Kpi label="ERP" value={placement.summary.mandatoryPanels} color="text-red-400" />
            <Kpi label="Optionnels" value={`${placement.summary.optionalPanels}/${placement.summary.budgetMax}`} color="text-amber-400" />
            <Kpi label="Nœuds couverts" value={`${placement.summary.decisionNodesCovered}/${placement.summary.decisionNodesTotal}`} color="text-emerald-400" />
          </div>
        )}

        {/* Liste panneaux */}
        <div className="flex-1 overflow-y-auto p-3">
          {panelsByPrio.length === 0 && (
            <p className="text-[11px] italic text-slate-500 text-center py-6">
              Aucun panneau placé. Relancez « Tracer flux & panneaux » en chargeant un plan avec des murs.
            </p>
          )}
          {panelsByPrio.map(group => (
            <div key={group.priority} className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${PRIO_COLOR[group.priority]}`}>
                  {PRIO_LABEL[group.priority].toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-500">{group.panels.length} panneau{group.panels.length > 1 ? 'x' : ''}</span>
              </div>
              <ul className="space-y-1">
                {group.panels.map(p => {
                  const meta = KIND_META[p.kind]
                  return (
                    <li key={p.id} className="px-2.5 py-2 rounded-md bg-slate-950/60 border border-white/5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                            style={{ backgroundColor: meta.color }}
                          >
                            {meta.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-slate-200 truncate">
                              {meta.label}
                              <span className="ml-1.5 text-[9px] text-slate-600 font-normal">
                                {p.mount}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                              {p.reason}
                            </div>
                            {p.standard && (
                              <div className="text-[9px] text-amber-400/80 mt-0.5 font-mono">
                                ⚖ {p.standard}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-[9px] text-slate-500 font-mono tabular-nums">
                            ({p.x.toFixed(0)}, {p.y.toFixed(0)})
                          </div>
                          {p.avgVisibilityScore > 0 && (
                            <div className="text-[9px] text-emerald-400 tabular-nums">
                              {(p.avgVisibilityScore * 100).toFixed(0)}% vis.
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

// ─── Sous-composants ──────────────────────────────

function ScoreRing({ value }: { value: number }) {
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'
  const r = 22
  const c = 2 * Math.PI * r
  const fill = c * (value / 100)
  return (
    <svg width={60} height={60} viewBox="0 0 60 60">
      <circle cx={30} cy={30} r={r} fill="none" stroke="#1e293b" strokeWidth={4} />
      <circle
        cx={30} cy={30} r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${fill} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
      />
      <text x={30} y={34} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#fff">
        {Math.round(value)}
      </text>
    </svg>
  )
}

function CoherenceBar({
  label, value, weight, color, icon,
}: {
  label: string; value: number; weight: number; color: string; icon: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
        <span className="flex items-center gap-1">
          {icon}
          {label}
          <span className="text-slate-600">× {weight}%</span>
        </span>
        <span className="tabular-nums font-semibold" style={{ color }}>
          {Math.round(value)}/100
        </span>
      </div>
      <div className="h-1.5 rounded bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div>
      <div className="text-slate-600 uppercase text-[8px] tracking-wider">{label}</div>
      <div className={`font-bold text-base tabular-nums ${color}`}>{value}</div>
    </div>
  )
}
