import React, { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Users, Clock, Star, ShoppingBag, Smartphone, Heart } from 'lucide-react'

interface MetricCard {
  label: string
  value: string
  target: string
  delta: string
  trend: 'up' | 'down' | 'stable'
  color: string
  icon: React.ElementType
}

const metrics: MetricCard[] = [
  { label: 'NPS Global', value: '42', target: 'Cible > 40', delta: '+5 vs M-1', trend: 'up', color: '#34d399', icon: Star },
  { label: 'Visiteurs / jour', value: '4 200', target: 'Cible 4 000', delta: '+8%', trend: 'up', color: '#38bdf8', icon: Users },
  { label: 'Dwell Time moyen', value: '94 min', target: 'Cible > 90 min', delta: '+6 min', trend: 'up', color: '#a77d4c', icon: Clock },
  { label: 'Conversion visite → achat', value: '47%', target: 'Cible > 45%', delta: '+2 pts', trend: 'up', color: '#f59e0b', icon: ShoppingBag },
  { label: 'Cosmos Club actifs', value: '8 450', target: 'Cible 12 000 à M+6', delta: '+620 ce mois', trend: 'up', color: '#ec4899', icon: Heart },
  { label: 'App MAU', value: '3 120', target: 'Cible > 3 500', delta: '-2%', trend: 'down', color: '#ef4444', icon: Smartphone },
]

interface ZoneScore {
  zone: string
  nps: number
  dwellMin: number
  satisfaction: number
  trend: 'up' | 'down' | 'stable'
}

const zoneScores: ZoneScore[] = [
  { zone: 'Hall Principal (RDC)', nps: 48, dwellMin: 12, satisfaction: 88, trend: 'up' },
  { zone: 'Food Court (R+1)', nps: 52, dwellMin: 38, satisfaction: 91, trend: 'up' },
  { zone: 'Galerie Mode (RDC)', nps: 39, dwellMin: 22, satisfaction: 79, trend: 'stable' },
  { zone: 'Galerie Est (RDC)', nps: 31, dwellMin: 14, satisfaction: 68, trend: 'down' },
  { zone: 'Parking B1', nps: 28, dwellMin: 8, satisfaction: 62, trend: 'stable' },
  { zone: 'Espace Loisirs (R+1)', nps: 55, dwellMin: 45, satisfaction: 93, trend: 'up' },
  { zone: 'Services (RDC)', nps: 35, dwellMin: 15, satisfaction: 74, trend: 'stable' },
]

const weeklyTrend = [
  { week: 'S10', visitors: 28500, nps: 38, dwell: 87 },
  { week: 'S11', visitors: 29200, nps: 39, dwell: 89 },
  { week: 'S12', visitors: 30100, nps: 41, dwell: 91 },
  { week: 'S13', visitors: 29400, nps: 42, dwell: 94 },
]

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp size={14} style={{ color: '#22c55e' }} />
  if (trend === 'down') return <TrendingDown size={14} style={{ color: '#ef4444' }} />
  return <Minus size={14} style={{ color: '#6b7280' }} />
}

export default function ExperienceDashboard() {
  const avgNps = useMemo(() => Math.round(zoneScores.reduce((s, z) => s + z.nps, 0) / zoneScores.length), [])
  const globalScore = useMemo(() => Math.round(zoneScores.reduce((s, z) => s + z.satisfaction, 0) / zoneScores.length), [])

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#34d399' }}>
          VOL. 3 — PILOTAGE
        </p>
        <h1 className="text-[28px] font-light text-white mb-2">Dashboard Experience Visiteur</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Vue consolidee de l'experience client — NPS, dwell time, satisfaction par zone, tendances hebdomadaires.
        </p>
      </div>

      {/* Global Score */}
      <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-center w-20 h-20 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', border: '2px solid rgba(52,211,153,0.3)' }}>
          <span className="text-3xl font-bold" style={{ color: '#34d399' }}>{globalScore}</span>
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Score Experience Global</p>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>Moyenne ponderee de satisfaction sur {zoneScores.length} zones — NPS moyen : {avgNps}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={18} style={{ color: m.color }} />
                <TrendIcon trend={m.trend} />
              </div>
              <p className="text-2xl font-bold text-white">{m.value}</p>
              <p className="text-[12px] text-slate-400 mt-1">{m.label}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px]" style={{ color: '#4a5568' }}>{m.target}</span>
                <span className="text-[10px] font-medium" style={{ color: m.trend === 'up' ? '#22c55e' : m.trend === 'down' ? '#ef4444' : '#6b7280' }}>{m.delta}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Zone Scores Table */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Satisfaction par zone</h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: '#0f1623' }}>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Zone</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">NPS</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Dwell (min)</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Satisfaction</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Tendance</th>
              </tr>
            </thead>
            <tbody>
              {zoneScores.map((z) => (
                <tr key={z.zone} style={{ borderTop: '1px solid #1e2a3a' }}>
                  <td className="px-4 py-3 text-white">{z.zone}</td>
                  <td className="text-center px-4 py-3">
                    <span className="font-mono font-bold" style={{ color: z.nps >= 40 ? '#22c55e' : z.nps >= 30 ? '#f59e0b' : '#ef4444' }}>{z.nps}</span>
                  </td>
                  <td className="text-center px-4 py-3 text-slate-300">{z.dwellMin}</td>
                  <td className="text-center px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${z.satisfaction}%`, background: z.satisfaction >= 80 ? '#22c55e' : z.satisfaction >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-slate-300 font-mono text-[11px]">{z.satisfaction}%</span>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3"><TrendIcon trend={z.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Weekly trend */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Tendance hebdomadaire</h2>
        <div className="grid grid-cols-4 gap-3">
          {weeklyTrend.map((w) => (
            <div key={w.week} className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <p className="text-[11px] font-mono text-slate-500 mb-2">{w.week}</p>
              <p className="text-white font-bold text-lg">{(w.visitors / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-slate-500">visiteurs</p>
              <div className="flex items-center justify-center gap-3 mt-2 text-[11px]">
                <span style={{ color: '#34d399' }}>NPS {w.nps}</span>
                <span style={{ color: '#a77d4c' }}>{w.dwell}min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
