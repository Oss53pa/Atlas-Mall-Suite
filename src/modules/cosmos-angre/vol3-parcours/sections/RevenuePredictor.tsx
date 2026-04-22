// ═══ VOL.3 — Revenue per Sqm Predictor (F3.9) ═══

import { DollarSign, MapPin, Star } from 'lucide-react'

interface CellRevenue {
  spaceRef: string
  floor: string
  wing: string
  areaSqm: number
  tenant: string | null
  sector: string
  revenuePotentialScore: number // 1-100
  estimatedConversion: number // %
  estimatedAnnualCA: number // FCFA
  footfallIndex: number // relative traffic score
}

const CELLS: CellRevenue[] = [
  { spaceRef: 'RDC-A01', floor: 'RDC', wing: 'Galerie Ouest', areaSqm: 350, tenant: 'Zara', sector: 'Mode', revenuePotentialScore: 92, estimatedConversion: 52, estimatedAnnualCA: 420_000_000, footfallIndex: 95 },
  { spaceRef: 'RDC-A02', floor: 'RDC', wing: 'Galerie Ouest', areaSqm: 180, tenant: 'Sephora', sector: 'Beaute', revenuePotentialScore: 85, estimatedConversion: 48, estimatedAnnualCA: 195_000_000, footfallIndex: 88 },
  { spaceRef: 'RDC-A03', floor: 'RDC', wing: 'Galerie Est', areaSqm: 220, tenant: 'Samsung', sector: 'Electronique', revenuePotentialScore: 78, estimatedConversion: 35, estimatedAnnualCA: 280_000_000, footfallIndex: 72 },
  { spaceRef: 'RDC-A04', floor: 'RDC', wing: 'Galerie Est', areaSqm: 120, tenant: null, sector: 'Vacant', revenuePotentialScore: 55, estimatedConversion: 0, estimatedAnnualCA: 0, footfallIndex: 45 },
  { spaceRef: 'R1-C01', floor: 'R+1', wing: 'Food Court', areaSqm: 130, tenant: 'KFC', sector: 'Restauration', revenuePotentialScore: 95, estimatedConversion: 68, estimatedAnnualCA: 310_000_000, footfallIndex: 98 },
  { spaceRef: 'R1-C02', floor: 'R+1', wing: 'Food Court', areaSqm: 110, tenant: 'Brioche Doree', sector: 'Restauration', revenuePotentialScore: 88, estimatedConversion: 62, estimatedAnnualCA: 180_000_000, footfallIndex: 90 },
  { spaceRef: 'R1-C03', floor: 'R+1', wing: 'Loisirs', areaSqm: 1800, tenant: 'Pathe', sector: 'Loisirs', revenuePotentialScore: 82, estimatedConversion: 45, estimatedAnnualCA: 850_000_000, footfallIndex: 85 },
  { spaceRef: 'R1-C05', floor: 'R+1', wing: 'Food Court', areaSqm: 75, tenant: null, sector: 'Vacant', revenuePotentialScore: 90, estimatedConversion: 0, estimatedAnnualCA: 0, footfallIndex: 92 },
  { spaceRef: 'B1-B01', floor: 'B1', wing: 'Hypermarche', areaSqm: 2500, tenant: 'Carrefour', sector: 'Alimentaire', revenuePotentialScore: 88, estimatedConversion: 72, estimatedAnnualCA: 1_200_000_000, footfallIndex: 80 },
]

const formatFcfa = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} M`
  return new Intl.NumberFormat('fr-FR').format(n)
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

export default function RevenuePredictor() {
  const totalCA = CELLS.reduce((s, c) => s + c.estimatedAnnualCA, 0)
  const avgScore = Math.round(CELLS.reduce((s, c) => s + c.revenuePotentialScore, 0) / CELLS.length)
  const vacantHighPotential = CELLS.filter(c => !c.tenant && c.revenuePotentialScore >= 80)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 3 — PARCOURS CLIENT</p>
        <h1 className="text-[28px] font-light text-white mb-2">Revenue per Sqm Predictor</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Croisement heatmap frequentation x loyer x secteur — potentiel CA par cellule pour argumentation leasing.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <DollarSign size={18} className="mx-auto mb-2" style={{ color: '#f59e0b' }} />
          <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{formatFcfa(totalCA)} F</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>CA annuel potentiel total</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Star size={18} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
          <p className="text-2xl font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Score Revenue moyen</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <MapPin size={18} className="mx-auto mb-2" style={{ color: '#ef4444' }} />
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{vacantHighPotential.length}</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Vacantes haut potentiel</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: '#0f1623' }}>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Cellule</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Enseigne</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Score Revenue</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Trafic</th>
              <th className="text-center px-4 py-3 text-slate-400 font-medium">Conversion</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">CA annuel est.</th>
            </tr>
          </thead>
          <tbody>
            {CELLS.sort((a, b) => b.revenuePotentialScore - a.revenuePotentialScore).map((c) => (
              <tr key={c.spaceRef} style={{ borderTop: '1px solid #1e2a3a' }}>
                <td className="px-4 py-3">
                  <div className="font-mono text-white font-medium">{c.spaceRef}</div>
                  <div className="text-[10px]" style={{ color: '#4a5568' }}>{c.wing} · {c.areaSqm} m²</div>
                </td>
                <td className="px-4 py-3">
                  <span className={c.tenant ? 'text-slate-300' : ''} style={{ color: c.tenant ? undefined : '#ef4444' }}>{c.tenant ?? 'VACANT'}</span>
                  <div className="text-[10px]" style={{ color: '#4a5568' }}>{c.sector}</div>
                </td>
                <td className="text-center px-4 py-3">
                  <span className="font-bold text-lg" style={{ color: scoreColor(c.revenuePotentialScore) }}>{c.revenuePotentialScore}</span>
                </td>
                <td className="text-center px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-12 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.footfallIndex}%`, background: '#38bdf8' }} />
                    </div>
                    <span className="text-[10px] text-slate-400">{c.footfallIndex}</span>
                  </div>
                </td>
                <td className="text-center px-4 py-3 text-slate-300">{c.estimatedConversion > 0 ? `${c.estimatedConversion}%` : '—'}</td>
                <td className="text-right px-4 py-3 font-mono font-medium" style={{ color: c.estimatedAnnualCA > 0 ? '#f59e0b' : '#4a5568' }}>
                  {c.estimatedAnnualCA > 0 ? `${formatFcfa(c.estimatedAnnualCA)} F` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vacant high potential callout */}
      {vacantHighPotential.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-[13px] font-semibold mb-2" style={{ color: '#ef4444' }}>Cellules vacantes a haut potentiel</p>
          {vacantHighPotential.map(c => (
            <p key={c.spaceRef} className="text-[12px] text-slate-400">
              <span className="font-mono text-white">{c.spaceRef}</span> ({c.wing}, {c.areaSqm} m²) — Score {c.revenuePotentialScore}, trafic {c.footfallIndex}/100. Ideal pour enseigne {c.wing.includes('Food') ? 'restauration rapide' : 'commerce'}.
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
