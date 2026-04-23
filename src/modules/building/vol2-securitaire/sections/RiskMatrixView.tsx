import { useState, useMemo } from 'react'
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { THREAT_SCENARIOS, calculateRiskMatrix } from '../../shared/proph3t/riskMatrix'
import RiskHeatmap from '../../shared/components/RiskHeatmap'

type SortKey = 'risk_score' | 'residual_risk' | 'probability' | 'name'

export default function RiskMatrixView() {
  const [sortKey, setSortKey] = useState<SortKey>('risk_score')
  const [sortAsc, setSortAsc] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const result = useMemo(() => calculateRiskMatrix(THREAT_SCENARIOS, [], [], []), [])

  const sorted = useMemo(() => {
    const arr = [...result.scenarios]
    arr.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = (a[sortKey] as number) - (b[sortKey] as number)
      return sortAsc ? cmp : -cmp
    })
    return arr
  }, [result.scenarios, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const riskColor = (score: number) =>
    score >= 10 ? '#ef4444' : score >= 7 ? '#f59e0b' : score >= 4 ? '#38bdf8' : '#22c55e'

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Matrice des Risques</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          15 scenarios de menace evalues selon probabilite x impact — niveau global : <span style={{ color: result.overall_risk_level === 'critique' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{result.overall_risk_level}</span>
        </p>
      </div>

      {/* Heatmap */}
      <div className="flex justify-center">
        <RiskHeatmap
          matrix={result.matrix}
          scenarios={result.scenarios.map(s => ({ name: s.name, probability: s.probability, impact: s.impact }))}
          size={340}
        />
      </div>

      {/* Scenario List */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-medium" style={{ color: '#6b7280', borderBottom: '1px solid #1e2a3a' }}>
          <button className="col-span-5 flex items-center gap-1 text-left" onClick={() => toggleSort('name')}>
            Scenario <ArrowUpDown size={10} />
          </button>
          <span className="col-span-1 text-center">Cat.</span>
          <button className="col-span-1 flex items-center gap-1 justify-center" onClick={() => toggleSort('probability')}>
            P <ArrowUpDown size={10} />
          </button>
          <span className="col-span-1 text-center">I</span>
          <button className="col-span-2 flex items-center gap-1 justify-center" onClick={() => toggleSort('risk_score')}>
            Score <ArrowUpDown size={10} />
          </button>
          <button className="col-span-2 flex items-center gap-1 justify-center" onClick={() => toggleSort('residual_risk')}>
            Resid. <ArrowUpDown size={10} />
          </button>
        </div>

        {/* Rows */}
        {sorted.map(s => (
          <div key={s.id}>
            <div
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="grid grid-cols-12 gap-2 px-4 py-3 cursor-pointer hover:bg-white/[0.02] items-center"
              style={{ borderBottom: '1px solid #1e2a3a10' }}
            >
              <div className="col-span-5 flex items-center gap-2">
                {expanded === s.id ? <ChevronUp size={12} style={{ color: '#6b7280' }} /> : <ChevronDown size={12} style={{ color: '#6b7280' }} />}
                <span className="text-[12px] text-white">{s.name}</span>
              </div>
              <span className="col-span-1 text-[10px] text-center" style={{ color: '#6b7280' }}>{s.category}</span>
              <span className="col-span-1 text-[12px] text-center text-white">{s.probability}</span>
              <span className="col-span-1 text-[12px] text-center text-white">{s.impact}</span>
              <div className="col-span-2 flex justify-center">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${riskColor(s.risk_score)}15`, color: riskColor(s.risk_score) }}>
                  {s.risk_score}
                </span>
              </div>
              <div className="col-span-2 flex justify-center">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${riskColor(s.residual_risk)}15`, color: riskColor(s.residual_risk) }}>
                  {s.residual_risk}
                </span>
              </div>
            </div>

            {expanded === s.id && (
              <div className="px-8 py-3 space-y-2" style={{ background: '#0f1729', borderBottom: '1px solid #1e2a3a' }}>
                <div>
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>Controles actuels</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.current_controls.map(c => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>Controles recommandes</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.recommended_controls.map(c => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>Zones affectees</span>
                  <p className="text-[11px] text-white mt-1">{s.affected_zones.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
