// ═══ FT.1 — Dashboard Sante Globale du Mall (Jumeaux Numeriques) ═══
// Vue transversale : 3 scores (Commercial + Securite + Experience) en un

import { Building2, Shield, Route, TrendingUp, TrendingDown, Minus, AlertTriangle, Bell } from 'lucide-react'

export interface VolumeHealth {
  score: number
  trend: 'up' | 'down' | 'stable'
  criticalAlerts: number
  keyMetric: string
  keyMetricValue: string
}

interface GlobalHealthDashboardProps {
  commercial: VolumeHealth
  security: VolumeHealth
  experience: VolumeHealth
  crossAlerts: { id: string; message: string; volumes: string[]; severity: 'info' | 'warning' | 'critical' }[]
}

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp size={14} style={{ color: '#22c55e' }} />
  if (trend === 'down') return <TrendingDown size={14} style={{ color: '#ef4444' }} />
  return <Minus size={14} style={{ color: '#6b7280' }} />
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

export default function GlobalHealthDashboard({ commercial, security, experience, crossAlerts }: GlobalHealthDashboardProps) {
  const globalScore = Math.round((commercial.score + security.score + experience.score) / 3)
  const totalCritical = commercial.criticalAlerts + security.criticalAlerts + experience.criticalAlerts

  const volumes = [
    { label: 'Vol. 1 — Commercial', icon: Building2, color: '#f59e0b', data: commercial },
    { label: 'Vol. 2 — Securitaire', icon: Shield, color: '#38bdf8', data: security },
    { label: 'Vol. 3 — Experience', icon: Route, color: '#34d399', data: experience },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#a855f7' }}>ATLAS MALL SUITE — VUE TRANSVERSALE</p>
        <h1 className="text-[28px] font-light text-white mb-2">Sante Globale du Mall</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Vue consolidee des 3 volumes — score global, alertes croisees, metriques cles.</p>
      </div>

      {/* Global Score */}
      <div className="flex items-center gap-6 p-6 rounded-xl" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-center w-24 h-24 rounded-full" style={{ background: `${scoreColor(globalScore)}10`, border: `3px solid ${scoreColor(globalScore)}60` }}>
          <span className="text-4xl font-bold" style={{ color: scoreColor(globalScore) }}>{globalScore}</span>
        </div>
        <div>
          <p className="text-white font-bold text-xl">Score Global Mall</p>
          <p className="text-[13px] text-slate-400">Moyenne des 3 volumes — {totalCritical > 0 ? `${totalCritical} alertes critiques` : 'Aucune alerte critique'}</p>
        </div>
      </div>

      {/* 3 Volume Cards */}
      <div className="grid grid-cols-3 gap-4">
        {volumes.map((vol) => {
          const Icon = vol.icon
          return (
            <div key={vol.label} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon size={18} style={{ color: vol.color }} />
                  <span className="text-[12px] font-medium text-white">{vol.label}</span>
                </div>
                <TrendIcon trend={vol.data.trend} />
              </div>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold" style={{ color: scoreColor(vol.data.score) }}>{vol.data.score}</span>
                <span className="text-[12px] text-slate-500 mb-1">/100</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{vol.data.keyMetric}</span>
                <span className="text-white font-medium">{vol.data.keyMetricValue}</span>
              </div>
              {vol.data.criticalAlerts > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px]" style={{ color: '#ef4444' }}>
                  <AlertTriangle size={10} />
                  {vol.data.criticalAlerts} alerte(s) critique(s)
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Cross-volume alerts */}
      {crossAlerts.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-purple-400" />
            <h3 className="text-white font-semibold">Alertes Croisees Inter-Volumes</h3>
          </div>
          <div className="space-y-2">
            {crossAlerts.map((alert) => {
              const color = alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#38bdf8'
              return (
                <div key={alert.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <p className="text-[12px] text-slate-300 flex-1">{alert.message}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    {alert.volumes.map(v => (
                      <span key={v} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>{v}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Default demo data for standalone usage ──
export function GlobalHealthDashboardDemo() {
  return (
    <GlobalHealthDashboard
      commercial={{ score: 88, trend: 'up', criticalAlerts: 0, keyMetric: 'Occupation', keyMetricValue: '92%' }}
      security={{ score: 82, trend: 'stable', criticalAlerts: 1, keyMetric: 'Couverture', keyMetricValue: '95%' }}
      experience={{ score: 79, trend: 'up', criticalAlerts: 0, keyMetric: 'NPS', keyMetricValue: '42' }}
      crossAlerts={[
        { id: 'ca-1', message: 'Angle mort camera en zone de fort trafic (Galerie Est RDC) — Vol.2 securite + Vol.3 heatmap confirment le risque.', volumes: ['Vol.2', 'Vol.3'], severity: 'warning' },
        { id: 'ca-2', message: 'Cellule RDC-A04 vacante depuis 80j dans une zone a faible densite commerciale — signal croise Vol.1 + Vol.3.', volumes: ['Vol.1', 'Vol.3'], severity: 'warning' },
        { id: 'ca-3', message: 'Goulot d\'evacuation potentiel food court R+1 detecte — Vol.3 flux confirme saturation samedi > 14h.', volumes: ['Vol.2', 'Vol.3'], severity: 'critical' },
      ]}
    />
  )
}
