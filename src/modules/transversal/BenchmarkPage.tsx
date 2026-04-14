// ═══ BENCHMARK — Comparaison centres commerciaux Afrique ═══

import React, { useState } from 'react'
import { BarChart2, Globe2, TrendingUp, Filter } from 'lucide-react'

interface Mall { name: string; city: string; country: string; region: string; isOurs: boolean; metrics: Record<string, number> }

const METRICS = [
  { key: 'cameras', label: 'Caméras', unit: '' },
  { key: 'coverage', label: 'Couverture', unit: '%' },
  { key: 'nps', label: 'NPS', unit: '' },
  { key: 'dwell', label: 'Temps visite', unit: 'min' },
  { key: 'revenueM2', label: 'CA/m²', unit: 'kFCFA' },
  { key: 'securityScore', label: 'Score sécurité', unit: '/100' },
  { key: 'digitalTouchpoints', label: 'Points digitaux', unit: '' },
  { key: 'signageDensity', label: 'Signalétique', unit: '/1000m²' },
]

const MALLS: Mall[] = [
  { name: 'Cosmos Angré', city: 'Abidjan', country: 'CI', region: 'Afrique de l\'Ouest', isOurs: true,
    metrics: { cameras: 120, coverage: 85, nps: 72, dwell: 95, revenueM2: 280, securityScore: 78, digitalTouchpoints: 24, signageDensity: 4.2 } },
  { name: 'Playce Marcory', city: 'Abidjan', country: 'CI', region: 'Afrique de l\'Ouest', isOurs: false,
    metrics: { cameras: 80, coverage: 72, nps: 65, dwell: 70, revenueM2: 220, securityScore: 65, digitalTouchpoints: 12, signageDensity: 3.1 } },
  { name: 'Two Rivers Mall', city: 'Nairobi', country: 'KE', region: 'Afrique de l\'Est', isOurs: false,
    metrics: { cameras: 200, coverage: 92, nps: 78, dwell: 110, revenueM2: 350, securityScore: 88, digitalTouchpoints: 40, signageDensity: 5.5 } },
  { name: 'Ikeja City Mall', city: 'Lagos', country: 'NG', region: 'Afrique de l\'Ouest', isOurs: false,
    metrics: { cameras: 150, coverage: 80, nps: 62, dwell: 85, revenueM2: 310, securityScore: 70, digitalTouchpoints: 18, signageDensity: 3.8 } },
  { name: 'Mall of Africa', city: 'Johannesburg', country: 'ZA', region: 'Afrique du Sud', isOurs: false,
    metrics: { cameras: 350, coverage: 96, nps: 82, dwell: 130, revenueM2: 480, securityScore: 94, digitalTouchpoints: 65, signageDensity: 7.2 } },
  { name: 'Morocco Mall', city: 'Casablanca', country: 'MA', region: 'Maghreb', isOurs: false,
    metrics: { cameras: 280, coverage: 94, nps: 80, dwell: 140, revenueM2: 420, securityScore: 90, digitalTouchpoints: 52, signageDensity: 6.0 } },
]

const REGIONS = ['Toutes', 'Afrique de l\'Ouest', 'Afrique de l\'Est', 'Afrique du Sud', 'Maghreb']

export default function BenchmarkPage() {
  const [region, setRegion] = useState('Toutes')
  const [sortKey, setSortKey] = useState('nps')

  const filtered = MALLS
    .filter(m => region === 'Toutes' || m.region === region)
    .sort((a, b) => (b.metrics[sortKey] ?? 0) - (a.metrics[sortKey] ?? 0))

  const cosmos = MALLS.find(m => m.isOurs)!
  const topMetrics = ['nps', 'coverage', 'revenueM2']

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: '#060a13', color: '#e2e8f0' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart2 size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Benchmark</h1>
              <p className="text-sm text-gray-500">Comparaison avec les centres commerciaux africains de référence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-gray-500" />
            <div className="flex gap-1 bg-[#0e1629] rounded-lg p-0.5 border border-white/[0.06]">
              {REGIONS.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                    region === r ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI bars */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {topMetrics.map(key => {
            const meta = METRICS.find(m => m.key === key)!
            const maxVal = Math.max(...MALLS.map(m => m.metrics[key] ?? 0))
            return (
              <div key={key} className="rounded-xl p-5 border border-white/[0.06]" style={{ background: '#0e1629' }}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">{meta.label}</p>
                <div className="space-y-2">
                  {MALLS.slice().sort((a, b) => (b.metrics[key] ?? 0) - (a.metrics[key] ?? 0)).slice(0, 4).map(m => {
                    const v = m.metrics[key] ?? 0
                    const pct = maxVal ? (v / maxVal * 100) : 0
                    return (
                      <div key={m.name}>
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className={m.isOurs ? 'text-indigo-400 font-semibold' : 'text-gray-400'}>{m.name}</span>
                          <span className="text-white font-medium">{v}{meta.unit && ` ${meta.unit}`}</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${pct}%`,
                            background: m.isOurs ? '#818cf8' : 'rgba(255,255,255,0.15)',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: '#0e1629' }}>
          <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Tableau comparatif</h3>
            <p className="text-[10px] text-gray-500">Cliquez sur un en-tête pour trier</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Centre</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-gray-500 uppercase font-medium">Ville</th>
                  {METRICS.map(m => (
                    <th key={m.key} onClick={() => setSortKey(m.key)}
                      className={`text-center px-3 py-2.5 text-[10px] uppercase font-medium cursor-pointer transition-colors ${
                        sortKey === m.key ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}>
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(mall => (
                  <tr key={mall.name} className={`border-b border-white/[0.03] ${mall.isOurs ? 'bg-indigo-500/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${mall.isOurs ? 'text-indigo-400' : 'text-white'}`}>{mall.name}</span>
                      {mall.isOurs && <span className="ml-2 text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">NOTRE PROJET</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-[11px]">{mall.city}, {mall.country}</td>
                    {METRICS.map(met => {
                      const v = mall.metrics[met.key] ?? 0
                      const cv = cosmos.metrics[met.key] ?? 0
                      const better = v > cv
                      return (
                        <td key={met.key} className="px-3 py-3 text-center">
                          <span className={`text-[12px] font-medium ${
                            mall.isOurs ? 'text-indigo-300' : better ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {v}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
