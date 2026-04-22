import { useMemo } from 'react'
import { Users, Sun, Sunset, Moon, DollarSign } from 'lucide-react'
import { calculateStaffing } from '../../shared/proph3t/staffingCalculator'
import { useVol2Store } from '../store/vol2Store'

export default function StaffingPlanner() {
  const zones = useVol2Store(s => s.zones)

  const plans = useMemo(() => {
    const today = new Date()
    return [0, 1, 2].map(offset => {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)
      return calculateStaffing(zones, [], [], date)
    })
  }, [zones])

  const periodConfig = {
    jour: { icon: Sun, color: '#f59e0b', label: 'Jour (6h-14h)' },
    soir: { icon: Sunset, color: '#f97316', label: 'Soir (14h-22h)' },
    nuit: { icon: Moon, color: '#b38a5a', label: 'Nuit (22h-6h)' },
  }

  const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Planification Staffing</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Effectifs securite calcules par Proph3t selon le niveau de risque, la frequentation et le type de zone.
        </p>
      </div>

      {/* 3-day overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, idx) => {
          const date = new Date()
          date.setDate(date.getDate() + idx)
          const dayLabel = idx === 0 ? "Aujourd'hui" : idx === 1 ? 'Demain' : date.toLocaleDateString('fr-FR', { weekday: 'long' })

          return (
            <div key={plan.date} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>{dayLabel}</span>
                  <p className="text-[13px] font-medium text-white">{plan.date}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} style={{ color: '#38bdf8' }} />
                  <span className="text-lg font-bold text-white">{plan.totalAgents}</span>
                </div>
              </div>

              {/* Period summary */}
              <div className="space-y-2 mb-3">
                {(['jour', 'soir', 'nuit'] as const).map(period => {
                  const cfg = periodConfig[period]
                  const Icon = cfg.icon
                  return (
                    <div key={period} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#0f1729' }}>
                      <div className="flex items-center gap-2">
                        <Icon size={13} style={{ color: cfg.color }} />
                        <span className="text-[11px]" style={{ color: '#94a3b8' }}>{cfg.label}</span>
                      </div>
                      <span className="text-[13px] font-medium text-white">{plan.summary[period]} agents</span>
                    </div>
                  )
                })}
              </div>

              {/* Daily cost */}
              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #1e2a3a' }}>
                <div className="flex items-center gap-1">
                  <DollarSign size={12} style={{ color: '#22c55e' }} />
                  <span className="text-[11px]" style={{ color: '#6b7280' }}>Cout journalier</span>
                </div>
                <span className="text-[13px] font-medium" style={{ color: '#22c55e' }}>
                  {formatFcfa(plan.dailyCostFcfa)} FCFA
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Zone breakdown for today */}
      <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h2 className="text-sm font-semibold text-white mb-3">Detail par zone — {plans[0]?.date}</h2>

        {plans[0]?.requirements.length === 0 ? (
          <p className="text-center text-[13px] py-8" style={{ color: '#4a5568' }}>
            Ajoutez des zones sur le plan pour calculer le staffing.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: '#6b7280', borderBottom: '1px solid #1e2a3a' }}>
                  <th className="text-left py-2 pr-4">Zone</th>
                  <th className="text-center py-2 px-2">Periode</th>
                  <th className="text-center py-2 px-2">Agents</th>
                  <th className="text-center py-2 px-2">Risque</th>
                  <th className="text-left py-2 pl-4">Justification</th>
                </tr>
              </thead>
              <tbody>
                {plans[0].requirements.map((req, i) => {
                  const riskColor = req.riskLevel === 'critique' ? '#ef4444' : req.riskLevel === 'eleve' ? '#f59e0b' : req.riskLevel === 'moyen' ? '#38bdf8' : '#22c55e'
                  const pCfg = periodConfig[req.period]
                  const PIcon = pCfg.icon
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1e2a3a10' }}>
                      <td className="py-2 pr-4 text-white">{req.zoneLabel}</td>
                      <td className="py-2 px-2 text-center">
                        <PIcon size={12} style={{ color: pCfg.color, display: 'inline' }} />
                      </td>
                      <td className="py-2 px-2 text-center text-white font-medium">{req.agentsRequired}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${riskColor}15`, color: riskColor }}>
                          {req.riskLevel}
                        </span>
                      </td>
                      <td className="py-2 pl-4" style={{ color: '#6b7280' }}>{req.justification}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
