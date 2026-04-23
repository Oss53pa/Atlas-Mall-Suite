// ═══ FLOOR SYNTHESIS PANEL — Per-floor multi-volume scores + top priorities ═══
// Consumes GlobalAnalysis from floorAnalysisEngine and renders a compact
// dashboard suitable for embedding in any volume or the dashboard page.

import type { GlobalAnalysis, PerFloorVolumeScore } from '../engines/floorAnalysisEngine'

interface Props {
  analysis: GlobalAnalysis
  compact?: boolean
  className?: string
}

function scoreColor(score: number): string {
  if (score >= 75) return '#10b981' // emerald
  if (score >= 55) return '#f59e0b' // amber
  return '#ef4444' // red
}

function Pill({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="flex-1 rounded-lg bg-slate-800/50 border border-white/[0.06] p-2">
      <div className="text-[8px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-[16px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[8px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

function FloorCard({ floor }: { floor: PerFloorVolumeScore }) {
  const secColor = scoreColor(floor.securitaire.score)
  const comColor = scoreColor(floor.commercial.score)
  const parColor = scoreColor(floor.parcours.score)
  const globColor = scoreColor(floor.globalScore)

  return (
    <div className="rounded-lg bg-surface-1/80 border border-white/[0.06] p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[13px] font-bold text-white"
            style={{ background: globColor }}>
            {floor.globalScore}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">{floor.floorLabel}</div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">Score global</div>
          </div>
        </div>
      </div>

      {/* Three volumes */}
      <div className="grid grid-cols-3 gap-2">
        {/* Vol.2 Sécuritaire */}
        <div className="rounded bg-blue-950/30 border border-blue-800/30 p-2">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[9px] text-blue-300 uppercase">Securite</span>
          </div>
          <div className="text-[18px] font-bold" style={{ color: secColor }}>{floor.securitaire.score}</div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            {floor.securitaire.coveragePct.toFixed(0)}% · {floor.securitaire.camerasCount}cam · {floor.securitaire.exitsCount}ex
          </div>
          <Bar pct={floor.securitaire.coveragePct} color={secColor} />
          {floor.securitaire.criticalIssues > 0 && (
            <div className="mt-1 text-[8px] text-red-400 font-semibold">
              ● {floor.securitaire.criticalIssues} critique(s)
            </div>
          )}
        </div>

        {/* Vol.1 Commercial */}
        <div className="rounded bg-amber-950/30 border border-amber-800/30 p-2">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[9px] text-amber-300 uppercase">Commercial</span>
          </div>
          <div className="text-[18px] font-bold" style={{ color: comColor }}>{floor.commercial.score}</div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            {floor.commercial.gla.toFixed(0)}m² · {floor.commercial.occupancyPct.toFixed(0)}%
          </div>
          <Bar pct={floor.commercial.occupancyPct} color={comColor} />
          {floor.commercial.vacantCount > 0 && (
            <div className="mt-1 text-[8px] text-amber-400">
              {floor.commercial.vacantCount} vacants · {floor.commercial.anchorCount} ancres
            </div>
          )}
        </div>

        {/* Vol.3 Parcours */}
        <div className="rounded bg-emerald-950/30 border border-emerald-800/30 p-2">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-emerald-300 uppercase">Parcours</span>
          </div>
          <div className="text-[18px] font-bold" style={{ color: parColor }}>{floor.parcours.score}</div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            {floor.parcours.poisCount}POI · {floor.parcours.signageCount}sig · {floor.parcours.momentsCount}mom
          </div>
          <Bar pct={floor.parcours.wayfindingScore} color={parColor} />
          <div className="mt-1 text-[8px] text-slate-500">
            Wayfinding {floor.parcours.wayfindingScore}% · PMR {floor.parcours.accessibilityPct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Priorities */}
      {floor.priorities.length > 0 && (
        <div className="pt-2 border-t border-white/[0.05] space-y-1">
          <div className="text-[8px] uppercase tracking-wider text-slate-500">Priorites ({floor.priorities.length})</div>
          {floor.priorities.slice(0, 3).map((p, i) => {
            const vc = p.volume === 'sec' ? '#3b82f6' : p.volume === 'com' ? '#f59e0b' : '#10b981'
            const sc = p.severity === 'critical' ? '#ef4444' : '#f59e0b'
            return (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: sc }} />
                <span className="text-[8px] uppercase font-bold" style={{ color: vc }}>
                  {p.volume === 'sec' ? 'SEC' : p.volume === 'com' ? 'COM' : 'PAR'}
                </span>
                <span className="text-slate-300 truncate flex-1">{p.title}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function FloorSynthesisPanel({ analysis, compact, className = '' }: Props) {
  const { overall, floors, topPriorities } = analysis

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Overall scores row */}
      <div className="flex gap-2">
        <Pill label="Global" value={String(overall.global)} color={scoreColor(overall.global)} />
        <Pill label="Securite" value={String(overall.securitaire)} color="#3b82f6" />
        <Pill label="Commercial" value={String(overall.commercial)} color="#f59e0b" />
        <Pill label="Parcours" value={String(overall.parcours)} color="#10b981" />
      </div>

      {/* Floor cards */}
      {!compact && (
        <div className="space-y-2">
          {floors.map(fl => (
            <FloorCard key={fl.floorId} floor={fl} />
          ))}
        </div>
      )}

      {/* Top priorities across all floors */}
      {topPriorities.length > 0 && (
        <div className="rounded-lg bg-surface-1/80 border border-white/[0.06] p-3">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Top priorites (tous etages)</div>
          <div className="space-y-1.5">
            {topPriorities.slice(0, 8).map((p, i) => {
              const vc = p.volume === 'sec' ? '#3b82f6' : p.volume === 'com' ? '#f59e0b' : '#10b981'
              const sc = p.severity === 'critical' ? '#ef4444' : '#f59e0b'
              return (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc }} />
                  <span className="text-[8px] uppercase font-bold" style={{ color: vc }}>
                    {p.volume === 'sec' ? 'SEC' : p.volume === 'com' ? 'COM' : 'PAR'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{p.floorId}</span>
                  <span className="text-slate-300 truncate flex-1">{p.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="text-[9px] text-slate-600 text-right">
        Analyse generee: {new Date(analysis.timestamp).toLocaleString('fr-FR')}
      </div>
    </div>
  )
}
