import { useState } from 'react'
import { Zap, ArrowRight, Play, RotateCcw } from 'lucide-react'
import { useWhatIf } from '../../shared/hooks/useWhatIf'
import { useVol2Store } from '../store/vol2Store'
import type { WhatIfResult } from '../../shared/proph3t/whatIfEngine'

export default function WhatIfSecurite() {
  const cameras = useVol2Store(s => s.cameras)
  const zones = useVol2Store(s => s.zones)
  const doors = useVol2Store(s => s.doors)

  const { scenarios, results, loading, simulate, clear } = useWhatIf(cameras, zones, doors, [])
  const [selectedResult, setSelectedResult] = useState<WhatIfResult | null>(null)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Scenarios What-If</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Simulez des scenarios de crise pour evaluer la resilience du dispositif securitaire.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {scenarios.map(s => {
          const hasResult = results.find(r => r.scenario.id === s.id)
          return (
            <div
              key={s.id}
              className="rounded-xl p-4"
              style={{ background: '#141e2e', border: `1px solid ${hasResult ? '#38bdf840' : '#1e2a3a'}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} style={{ color: '#f59e0b' }} />
                <span className="text-[10px] font-mono" style={{ color: '#6b7280' }}>{s.id.toUpperCase()}</span>
              </div>
              <h3 className="text-[13px] font-medium text-white mb-1">{s.label}</h3>
              <p className="text-[11px] mb-3" style={{ color: '#6b7280' }}>{s.description}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => simulate(s)}
                  disabled={loading}
                  className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}
                >
                  <Play size={12} /> Simuler
                </button>
                {hasResult && (
                  <button
                    onClick={() => setSelectedResult(hasResult)}
                    className="text-[11px] px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(167,125,76,0.1)', color: '#b38a5a' }}
                  >
                    Resultats
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {results.length > 0 && (
        <div className="flex justify-end">
          <button onClick={clear} className="flex items-center gap-1 text-[11px]" style={{ color: '#6b7280' }}>
            <RotateCcw size={12} /> Reinitialiser
          </button>
        </div>
      )}

      {/* Before/After Split View */}
      {(selectedResult ?? results[0]) && (() => {
        const r = selectedResult ?? results[0]
        return (
          <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <h2 className="text-sm font-semibold text-white mb-4">{r.scenario.label} — Resultats</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Before */}
              <div className="rounded-lg p-4" style={{ background: '#0f1729', border: '1px solid #1e2a3a' }}>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#22c55e' }}>AVANT</span>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Couverture', value: `${r.before.coveragePercent}%` },
                    { label: 'Cameras actives', value: r.before.activeCamera },
                    { label: 'Portes securisees', value: r.before.secureDoors },
                    { label: 'Niveau de risque', value: r.before.riskLevel },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: '#6b7280' }}>{item.label}</span>
                      <span className="text-[13px] font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* After */}
              <div className="rounded-lg p-4" style={{ background: '#0f1729', border: '1px solid #ef444430' }}>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: '#ef4444' }}>APRES</span>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Couverture', value: `${r.after.coveragePercent}%`, delta: r.delta.coverageDelta },
                    { label: 'Cameras actives', value: r.after.activeCamera, delta: r.delta.activeCameraDelta },
                    { label: 'Portes securisees', value: r.after.secureDoors, delta: r.delta.secureDoorDelta },
                    { label: 'Niveau de risque', value: r.after.riskLevel, delta: 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: '#6b7280' }}>{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white">{item.value}</span>
                        {typeof item.delta === 'number' && item.delta !== 0 && (
                          <span className="text-[10px]" style={{ color: item.delta < 0 ? '#ef4444' : '#22c55e' }}>
                            {item.delta > 0 ? '+' : ''}{item.delta}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Impact summary */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-[12px] font-medium" style={{ color: '#f59e0b' }}>{r.impactSummary}</p>
            </div>

            {/* Recommendations */}
            <div className="mt-3">
              <span className="text-[10px] font-bold tracking-wider" style={{ color: '#b38a5a' }}>RECOMMANDATIONS</span>
              <ul className="mt-2 space-y-1">
                {r.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#94a3b8' }}>
                    <ArrowRight size={10} style={{ color: '#b38a5a', marginTop: 3, flexShrink: 0 }} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
