// ═══ Multi-Scenario Cards ═══
//
// Affiche les ≥3 scénarios alternatifs produits par
// generateMultipleScenarios() (CDC §3.2 COM-05/06).
// Chaque carte montre :
//   - Titre + emphasis (Performance / Équilibré / Charte / Flagship)
//   - Score décomposé
//   - CA total + diversité Shannon + violations contraintes
//   - Allocation par catégorie (mini-bars)
//   - Justification narrative + bouton "Adopter ce scénario"

import { useState } from 'react'
import {
  Trophy, BarChart3, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle, X, TrendingUp,
} from 'lucide-react'
import type { OptimizeSolution } from '../types'

interface Props {
  scenarios: OptimizeSolution[]
  onAdopt?: (scenario: OptimizeSolution) => void
  onClose?: () => void
}

const EMPHASIS_META: Record<string, { label: string; color: string; icon: string }> = {
  revenue:   { label: 'Performance commerciale max', color: '#10b981', icon: '💰' },
  diversity: { label: 'Mix équilibré',                color: '#3b82f6', icon: '⚖' },
  charter:   { label: 'Conformité charte stricte',    color: '#a855f7', icon: '📋' },
  flagship:  { label: 'Stratégie flagship',           color: '#f59e0b', icon: '⭐' },
}

const CATEGORY_COLORS: Record<string, string> = {
  mode: '#ec4899', restauration: '#f59e0b', services: '#06b6d4',
  loisirs: '#a855f7', alimentaire: '#10b981', beaute: '#f43f5e',
  enfants: '#f97316', autre: '#94a3b8',
}

export function MultiScenarioCards({ scenarios, onAdopt, onClose }: Props) {
  const [expandedRank, setExpandedRank] = useState<number | null>(1) // top scenario ouvert

  if (scenarios.length === 0) {
    return (
      <div className="bg-slate-950 border border-white/10 rounded-lg p-8 text-center">
        <BarChart3 className="mx-auto text-slate-600" size={32} />
        <p className="text-sm text-slate-500 mt-2">Aucun scénario disponible.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 border border-white/10 rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-400" size={16} />
          <h3 className="text-sm font-bold text-white">
            {scenarios.length} scénarios mix enseignes (classés par score)
          </h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </header>

      <div className="p-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(scenarios.length, 2)}, 1fr)` }}>
        {scenarios.map(scen => (
          <ScenarioCard
            key={scen.rank}
            scen={scen}
            isExpanded={expandedRank === scen.rank}
            onToggle={() => setExpandedRank(expandedRank === scen.rank ? null : scen.rank)}
            onAdopt={onAdopt ? () => onAdopt(scen) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Carte d'un scénario ──────────────────

function ScenarioCard({
  scen, isExpanded, onToggle, onAdopt,
}: {
  scen: OptimizeSolution
  isExpanded: boolean
  onToggle: () => void
  onAdopt?: () => void
}) {
  const cfg = scen.config as any
  const emphasis = cfg.emphasis as string | undefined
  const meta = emphasis ? EMPHASIS_META[emphasis] : undefined
  const isTop = scen.rank === 1
  const allocation = (cfg.allocation ?? {}) as Record<string, { count: number; totalSurface: number; ratio: number }>
  const totalRev = (cfg.bestTotalRevenueFcfa as number) ?? 0
  const diversity = (cfg.bestDiversity as number) ?? 0
  const violations = (cfg.constraintViolations as number) ?? 0
  const changes = (cfg.changes as Array<{ before: string | null; after: string }>) ?? []

  return (
    <div className={`rounded-lg border-2 transition-all ${
      isTop
        ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/20 to-slate-900'
        : 'border-white/10 bg-slate-900/40'
    }`}>
      {/* Header carte */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
              isTop ? 'bg-amber-500' : 'bg-slate-700'
            }`}>
              #{scen.rank}
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-white">{cfg.variantTitle ?? `Scénario ${scen.rank}`}</h4>
              {meta && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: meta.color }}>
                  {meta.icon} {meta.label}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">Score</div>
            <div className="text-xl font-bold text-white tabular-nums">{scen.score.toFixed(2)}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Kpi label="CA total" value={formatFcfa(totalRev)} icon={TrendingUp} color="text-emerald-400" />
          <Kpi label="Diversité" value={`${(diversity * 100).toFixed(0)} %`} icon={BarChart3} color="text-blue-400" />
          <Kpi label="Violations" value={violations.toFixed(1)} icon={AlertCircle}
               color={violations > 5 ? 'text-red-400' : 'text-emerald-400'} />
        </div>

        {/* Allocation par catégorie */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Mix par catégorie</div>
          <div className="space-y-1">
            {Object.entries(allocation)
              .filter(([, v]) => v.count > 0)
              .sort((a, b) => b[1].ratio - a[1].ratio)
              .slice(0, 5)
              .map(([cat, v]) => {
                const color = CATEGORY_COLORS[cat] ?? '#64748b'
                return (
                  <div key={cat} className="flex items-center gap-2 text-[10px]">
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-slate-300">{cat}</span>
                        <span className="text-slate-500 tabular-nums">
                          {(v.ratio * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1 bg-slate-800 rounded overflow-hidden mt-0.5">
                        <div
                          className="h-full transition-all"
                          style={{ width: `${v.ratio * 100}%`, background: color }}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-600 tabular-nums w-8 text-right">
                      {v.count}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onToggle}
            className="flex-1 px-3 py-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center gap-1 border border-white/5"
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {isExpanded ? 'Masquer détails' : 'Voir détails'}
          </button>
          {onAdopt && (
            <button
              onClick={onAdopt}
              className={`flex-1 px-3 py-1.5 rounded text-[11px] font-bold flex items-center justify-center gap-1 ${
                isTop
                  ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              <CheckCircle size={12} />
              Adopter
            </button>
          )}
        </div>
      </div>

      {/* Détails dépliables */}
      {isExpanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
          {/* Justification */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Justification PROPH3T</div>
            <p className="text-[11px] text-slate-300 m-0 whitespace-pre-line leading-relaxed">
              {scen.rationale}
            </p>
          </div>

          {/* Changements détaillés */}
          {changes.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Changements proposés · {changes.length}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {changes.slice(0, 20).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-0.5 rounded bg-slate-950">
                    <code className="text-slate-500 line-through">{c.before ?? 'libre'}</code>
                    <span className="text-slate-600">→</span>
                    <code className="text-emerald-400">{c.after}</code>
                  </div>
                ))}
                {changes.length > 20 && (
                  <p className="text-[9px] italic text-slate-600 px-2">
                    + {changes.length - 20} autres changements
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Performance algo */}
          <div className="text-[10px] text-slate-500 grid grid-cols-2 gap-2">
            <div>Itérations GA : <span className="text-slate-400 tabular-nums">{cfg.gaIterations ?? '—'}</span></div>
            <div>Temps calcul : <span className="text-slate-400 tabular-nums">{cfg.computeMs?.toFixed(0) ?? '—'} ms</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ComponentType<any>; color: string
}) {
  return (
    <div className="rounded bg-slate-950 border border-white/5 p-2">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon size={10} className="text-slate-500" />
        <span className="text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      <div className={`text-[12px] font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

function formatFcfa(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Mds`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} K`
  return n.toFixed(0)
}
