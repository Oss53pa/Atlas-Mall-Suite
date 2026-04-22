// ═══ PMR Audit Panel ═══
//
// Affiche le résultat de pmrConstraintEngine.analyzePmr() :
//   - Score compliance global (anneau coloré)
//   - Stats par type d'anomalie
//   - Liste recommandations priorisées
//   - Liste détaillée des arêtes non conformes (pour drill-down)
//
// Référence CDC §3.4 PC-04 + Loi 2005-102 + Arrêté 8 décembre 2014.

import { useMemo, useState } from 'react'
import {
  Accessibility, AlertTriangle, CheckCircle, ChevronDown, ChevronRight,
  Ruler, Mountain, ArrowUpFromLine, X,
} from 'lucide-react'
import type { PmrResult } from '../../shared/engines/plan-analysis/pmrConstraintEngine'

interface Props {
  pmr: PmrResult
  onClose?: () => void
  /** Callback quand l'utilisateur clique sur une recommandation pour highlight le plan. */
  onFocusEdge?: (edgeId: string) => void
}

const PRIORITY_META = {
  critical: { label: 'Critique', color: '#dc2626', bg: 'bg-red-950/40', border: 'border-red-900/50' },
  high:     { label: 'Élevée',   color: '#f59e0b', bg: 'bg-amber-950/40', border: 'border-amber-900/50' },
  medium:   { label: 'Moyenne',  color: '#3b82f6', bg: 'bg-blue-950/40', border: 'border-blue-900/50' },
}

export function PmrAuditPanel({ pmr, onClose, onFocusEdge }: Props) {
  const [expandedRec, setExpandedRec] = useState<number | null>(null)

  const scoreColor = pmr.complianceScore >= 90 ? '#10b981'
    : pmr.complianceScore >= 70 ? '#f59e0b' : '#ef4444'

  const sortedRecs = useMemo(() => {
    return [...pmr.recommendations].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 }
      return order[a.priority] - order[b.priority]
    })
  }, [pmr.recommendations])

  return (
    <div className="bg-surface-0 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-surface-1">
        <div className="flex items-center gap-2">
          <Accessibility className="text-blue-400" size={16} />
          <h3 className="text-sm font-bold text-white">Audit PMR (Loi 2005-102)</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
            pmr.compliant ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'
          }`}>
            {pmr.compliant ? '✓ Conforme' : `✗ ${pmr.stats.nonCompliantEdges} non-conformités`}
          </span>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="p-5 grid grid-cols-3 gap-5">
        {/* Score global */}
        <div className="flex flex-col items-center justify-center">
          <ScoreRing score={pmr.complianceScore} color={scoreColor} />
          <div className="mt-3 text-center">
            <div className="text-[11px] text-slate-500 uppercase tracking-wider">Score conformité</div>
            <div className="text-[10px] text-slate-600 mt-1">Loi 2005-102 / Arrêté 8 déc. 2014</div>
          </div>
        </div>

        {/* Stats détaillées */}
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <StatCard
            icon={Ruler}
            label="Passages étroits"
            value={pmr.stats.narrowPassages}
            sub="< 1,40 m (cible PMR)"
            warning={pmr.stats.narrowPassages > 0}
          />
          <StatCard
            icon={Mountain}
            label="Pentes > 5 %"
            value={pmr.stats.steepSlopes}
            sub="Limite Loi 2005-102"
            warning={pmr.stats.steepSlopes > 0}
          />
          <StatCard
            icon={ArrowUpFromLine}
            label="Marches sans rampe"
            value={pmr.stats.unrampedSteps}
            sub="Inaccessible PMR"
            warning={pmr.stats.unrampedSteps > 0}
          />
          <StatCard
            icon={CheckCircle}
            label="Arêtes analysées"
            value={pmr.stats.totalEdges}
            sub={`${pmr.stats.totalEdges - pmr.stats.nonCompliantEdges} conformes`}
          />
        </div>
      </div>

      {/* Recommandations */}
      {sortedRecs.length > 0 && (
        <div className="border-t border-white/5 p-5">
          <h4 className="text-[12px] font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={13} />
            Recommandations priorisées · {sortedRecs.length}
          </h4>
          <ul className="space-y-2">
            {sortedRecs.map((rec, i) => {
              const meta = PRIORITY_META[rec.priority]
              const isOpen = expandedRec === i
              return (
                <li key={i} className={`rounded border ${meta.border} ${meta.bg}`}>
                  <button
                    onClick={() => setExpandedRec(isOpen ? null : i)}
                    className="w-full flex items-start gap-3 p-3 text-left"
                  >
                    {isOpen
                      ? <ChevronDown size={14} className="mt-0.5 flex-shrink-0" style={{ color: meta.color }} />
                      : <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: meta.color }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {rec.edgeIds.length} segment{rec.edgeIds.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-200 m-0">{rec.message}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-white/5 pt-2 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                        Arêtes concernées (clic = afficher sur le plan)
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rec.edgeIds.slice(0, 30).map(eid => (
                          <button
                            key={eid}
                            onClick={() => onFocusEdge?.(eid)}
                            className="px-2 py-0.5 rounded bg-surface-1 hover:bg-slate-800 text-[10px] font-mono text-slate-400 hover:text-white"
                          >
                            {eid.slice(0, 14)}
                          </button>
                        ))}
                        {rec.edgeIds.length > 30 && (
                          <span className="px-2 py-0.5 text-[10px] text-slate-500 italic">
                            + {rec.edgeIds.length - 30} autres
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Note méthodologie */}
      <div className="bg-surface-1/50 border-t border-white/5 px-5 py-3">
        <p className="text-[10px] text-slate-500 m-0 leading-relaxed">
          <strong className="text-slate-400">Méthodologie</strong> — analyse par arête du graphe de navigation.
          Largeur estimée par distance aux obstacles (percentile 25 sur 5 échantillons).
          Pente calculée entre nœuds d'étages différents.
          Référentiel : Loi 2005-102 (FR) · Arrêté 8 décembre 2014 · ISO 21542.
        </p>
      </div>
    </div>
  )
}

// ─── Sous-composants ─────────────────────

function ScoreRing({ score, color }: { score: number; color: string }) {
  const circumference = 2 * Math.PI * 38
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#3a3d44" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="38" fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</div>
        <div className="text-[9px] text-slate-500">/100</div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, sub, warning,
}: {
  icon: React.ComponentType<any>; label: string; value: number; sub: string; warning?: boolean
}) {
  return (
    <div className={`rounded border p-3 ${
      warning ? 'border-amber-900/50 bg-amber-950/20' : 'border-white/10 bg-surface-1/30'
    }`}>
      <div className="flex items-center gap-2">
        <Icon size={13} className={warning ? 'text-amber-400' : 'text-slate-400'} />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums mt-1 ${warning ? 'text-amber-300' : 'text-slate-200'}`}>
        {value}
      </div>
      <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>
    </div>
  )
}
