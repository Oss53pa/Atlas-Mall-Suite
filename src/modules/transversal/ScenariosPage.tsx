// ═══ SCÉNARIOS — Comparaison A/B/C/D ═══

import { useState } from 'react'
import { Layers, ArrowUpRight, ArrowDownRight, Minus, Plus, Copy, Download } from 'lucide-react'

interface Scenario {
  id: string; name: string; description: string; color: string
  status: 'brouillon' | 'validé' | 'rejeté'
  metrics: Record<string, number>
}

const METRIC_LABELS: Record<string, { label: string; unit: string; higherIsBetter: boolean }> = {
  occupancy: { label: 'Taux d\'occupancy', unit: '%', higherIsBetter: true },
  revenue: { label: 'CA prévisionnel', unit: 'FCFA', higherIsBetter: true },
  securityScore: { label: 'Score sécurité', unit: '/100', higherIsBetter: true },
  cameraCoverage: { label: 'Couverture caméra', unit: '%', higherIsBetter: true },
  capex: { label: 'CAPEX total', unit: 'FCFA', higherIsBetter: false },
  nps: { label: 'NPS estimé', unit: '', higherIsBetter: true },
  dwell: { label: 'Temps moyen visite', unit: 'min', higherIsBetter: true },
  signage: { label: 'Densité signalétique', unit: '/1000m²', higherIsBetter: true },
}

const SCENARIOS: Scenario[] = [
  {
    id: 'A', name: 'Scénario A — Baseline', description: 'Configuration actuelle validée. 120 caméras, mix enseigne standard, signalétique ISO 7010.',
    color: '#38bdf8', status: 'validé',
    metrics: { occupancy: 92, revenue: 4200000000, securityScore: 78, cameraCoverage: 85, capex: 147000000, nps: 72, dwell: 95, signage: 4.2 },
  },
  {
    id: 'B', name: 'Scénario B — Sécurité+', description: 'Renforcement sécuritaire. 160 caméras, IA vidéo, SAS renforcés, budget +35%.',
    color: '#f59e0b', status: 'brouillon',
    metrics: { occupancy: 92, revenue: 4200000000, securityScore: 94, cameraCoverage: 97, capex: 198000000, nps: 74, dwell: 90, signage: 4.2 },
  },
  {
    id: 'C', name: 'Scénario C — Expérience+', description: 'Focus parcours client. Signalétique premium, digital touchpoints, food court étendu.',
    color: '#34d399', status: 'brouillon',
    metrics: { occupancy: 95, revenue: 4800000000, securityScore: 78, cameraCoverage: 85, capex: 165000000, nps: 86, dwell: 120, signage: 6.8 },
  },
  {
    id: 'D', name: 'Scénario D — Optimal', description: 'Combinaison Sécurité+ et Expérience+. Budget maximum mais ROI optimisé.',
    color: '#b38a5a', status: 'brouillon',
    metrics: { occupancy: 96, revenue: 5100000000, securityScore: 92, cameraCoverage: 96, capex: 235000000, nps: 88, dwell: 115, signage: 6.5 },
  },
]

const fmt = (v: number, unit: string) => {
  if (unit === 'FCFA') return `${(v / 1000000).toFixed(0)} M`
  if (unit === '%' || unit === '/100') return v.toString()
  return v.toString()
}

export default function ScenariosPage() {
  const [compareIds, setCompareIds] = useState<[string, string]>(['A', 'C'])

  const toggle = (id: string) => {
    if (compareIds.includes(id)) {
      if (compareIds[0] === id) setCompareIds([compareIds[1], compareIds[1]])
      else setCompareIds([compareIds[0], compareIds[0]])
    } else {
      setCompareIds([compareIds[0], id])
    }
  }

  const scA = SCENARIOS.find(s => s.id === compareIds[0])!
  const scB = SCENARIOS.find(s => s.id === compareIds[1])!

  return (
    <div className="h-full overflow-y-auto p-6" style={{ background: '#1a1d23', color: '#e2e8f0' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Layers size={20} className="text-atlas-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Scénarios</h1>
            <p className="text-sm text-gray-500">Comparez les configurations A/B/C/D de votre centre commercial</p>
          </div>
        </div>

        {/* Scenario cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {SCENARIOS.map(sc => {
            const selected = compareIds.includes(sc.id)
            return (
              <button key={sc.id} onClick={() => toggle(sc.id)}
                className={`text-left rounded-xl p-4 border transition-all ${selected ? 'ring-1' : 'hover:-translate-y-0.5'}`}
                style={{
                  background: selected ? `${sc.color}08` : '#262a31',
                  borderColor: selected ? `${sc.color}40` : 'rgba(255,255,255,0.06)',
                  ...(selected ? { ringColor: `${sc.color}30` } : {}),
                }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold" style={{ color: sc.color }}>{sc.id}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    sc.status === 'validé' ? 'bg-emerald-500/15 text-emerald-400' :
                    sc.status === 'rejeté' ? 'bg-red-500/15 text-red-400' : 'bg-gray-500/15 text-gray-400'}`}>
                    {sc.status === 'validé' ? 'Validé' : sc.status === 'rejeté' ? 'Rejeté' : 'Brouillon'}
                  </span>
                </div>
                <p className="text-[12px] font-medium text-white mb-1">{sc.name}</p>
                <p className="text-[11px] text-gray-500 leading-relaxed">{sc.description}</p>
                {selected && <div className="mt-2 text-[10px] font-medium" style={{ color: sc.color }}>Sélectionné pour comparaison</div>}
              </button>
            )
          })}
        </div>

        {/* Comparison table */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden mb-6" style={{ background: '#262a31' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white">Comparaison détaillée</h3>
            <button className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition-colors">
              <Download size={12} /> Exporter
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]" style={{ background: '#141e2e' }}>
                <th className="text-left px-5 py-2.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium w-1/3">Métrique</th>
                <th className="text-center px-5 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: scA.color }}>
                  {scA.name.split('—')[0]}</th>
                <th className="text-center px-5 py-2.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: scB.color }}>
                  {scB.name.split('—')[0]}</th>
                <th className="text-center px-5 py-2.5 text-[10px] text-gray-500 uppercase tracking-wider font-medium">Delta</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(METRIC_LABELS).map(([key, meta]) => {
                const vA = scA.metrics[key] ?? 0
                const vB = scB.metrics[key] ?? 0
                const delta = vB - vA
                const pct = vA !== 0 ? ((delta / vA) * 100) : 0
                const isPositive = meta.higherIsBetter ? delta > 0 : delta < 0
                const isNeutral = delta === 0
                return (
                  <tr key={key} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-gray-300">{meta.label}</td>
                    <td className="px-5 py-3 text-center text-white font-medium">{fmt(vA, meta.unit)} {meta.unit !== 'FCFA' && meta.unit}</td>
                    <td className="px-5 py-3 text-center text-white font-medium">{fmt(vB, meta.unit)} {meta.unit !== 'FCFA' && meta.unit}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                        isNeutral ? 'text-gray-500' : isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isNeutral ? <Minus size={12} /> : isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {isNeutral ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-atlas-500 hover:bg-atlas-500 text-white text-sm font-medium transition-colors">
            <Plus size={14} /> Nouveau scénario
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-300 hover:text-white text-sm transition-colors">
            <Copy size={14} /> Dupliquer la sélection
          </button>
        </div>
      </div>
    </div>
  )
}
