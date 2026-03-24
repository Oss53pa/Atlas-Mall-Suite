// ═══ VOL.1 — Dashboard Occupancy (F1.4) ═══

import React, { useMemo } from 'react'
import { Building2, TrendingUp, TrendingDown, DollarSign, Users, BarChart2 } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import type { Sector } from '../store/vol1Types'

const sectorLabels: Record<Sector, string> = {
  mode: 'Mode', restauration: 'Restauration', services: 'Services', loisirs: 'Loisirs',
  alimentaire: 'Alimentaire', beaute: 'Beauté', electronique: 'Electronique', bijouterie: 'Bijouterie',
  banque: 'Banque', sante: 'Santé', enfants: 'Enfants', maison: 'Maison', sport: 'Sport',
}

const sectorColors: Record<string, string> = {
  mode: '#ec4899', restauration: '#f59e0b', services: '#38bdf8', loisirs: '#8b5cf6',
  alimentaire: '#22c55e', beaute: '#f472b6', electronique: '#06b6d4', bijouterie: '#fbbf24',
  banque: '#6366f1', sante: '#ef4444', enfants: '#a78bfa', maison: '#14b8a6', sport: '#f97316',
}

const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function DashboardSection() {
  const occupancy = useVol1Store(s => s.occupancy)
  const alerts = useVol1Store(s => s.alerts)

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')

  // Monthly evolution (mock)
  const monthlyOcc = useMemo(() => [
    { month: 'Oct', rate: 85 }, { month: 'Nov', rate: 87 }, { month: 'Dec', rate: 88 },
    { month: 'Jan', rate: 90 }, { month: 'Fev', rate: 91 }, { month: 'Mar', rate: occupancy.occupancyRate },
  ], [occupancy.occupancyRate])

  const maxBar = 100

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 1 — PLAN COMMERCIAL</p>
        <h1 className="text-[28px] font-light text-white mb-2">Dashboard Occupancy</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Vue synthetique du taux d'occupation, des loyers et de la repartition du mix enseigne.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Taux d\'occupation', value: `${occupancy.occupancyRate}%`, icon: Building2, color: '#22c55e', sub: `${formatFcfa(occupancy.occupiedGla)} m² / ${formatFcfa(occupancy.totalGla)} m²` },
          { label: 'GLA vacante', value: `${formatFcfa(occupancy.vacantGla)} m²`, icon: BarChart2, color: '#ef4444', sub: `${occupancy.vacantByDuration.length} cellules` },
          { label: 'Loyer encaissé / an', value: `${formatFcfa(occupancy.totalCollectedRent)} F`, icon: DollarSign, color: '#f59e0b', sub: `Potentiel : ${formatFcfa(occupancy.totalPotentialRent)} F` },
          { label: 'Preneurs actifs', value: String(useVol1Store.getState().tenants.filter(t => t.status === 'actif').length), icon: Users, color: '#38bdf8', sub: `${criticalAlerts.length} alertes critiques` },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} style={{ color: kpi.color }} />
                <TrendingUp size={14} style={{ color: '#22c55e' }} />
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-[12px] text-slate-400 mt-1">{kpi.label}</p>
              <p className="text-[10px] mt-2" style={{ color: '#4a5568' }}>{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Two columns: Sector breakdown + Monthly evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Breakdown */}
        <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <h3 className="text-white font-semibold mb-4">Mix enseigne par secteur</h3>
          <div className="space-y-3">
            {occupancy.sectorBreakdown.map((s) => (
              <div key={s.sector}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-slate-300">{sectorLabels[s.sector] ?? s.sector}</span>
                  <span className="text-[11px] font-mono" style={{ color: '#4a5568' }}>{s.count} · {formatFcfa(s.gla)} m² · {s.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.percentage}%`, background: sectorColors[s.sector] ?? '#6b7280' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Evolution */}
        <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <h3 className="text-white font-semibold mb-4">Evolution mensuelle du taux d'occupation</h3>
          <div className="flex items-end gap-3 h-40">
            {monthlyOcc.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-mono text-slate-300 mb-1">{m.rate}%</span>
                <div className="w-full rounded-t" style={{ height: `${(m.rate / maxBar) * 100}%`, background: m.rate >= 90 ? '#22c55e' : m.rate >= 80 ? '#f59e0b' : '#ef4444', minHeight: 4 }} />
                <span className="text-[10px] mt-1" style={{ color: '#4a5568' }}>{m.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floor Breakdown */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-white font-semibold mb-4">Occupation par niveau</h3>
        <div className="grid grid-cols-3 gap-4">
          {occupancy.floorBreakdown.map((f) => (
            <div key={f.floor} className="rounded-lg p-4 text-center" style={{ background: '#0f1623', border: '1px solid #1e2a3a' }}>
              <p className="text-lg font-bold text-white">{f.floor}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: f.rate >= 90 ? '#22c55e' : f.rate >= 75 ? '#f59e0b' : '#ef4444' }}>{f.rate}%</p>
              <p className="text-[11px] mt-1" style={{ color: '#4a5568' }}>{formatFcfa(f.occupied)} / {formatFcfa(f.total)} m²</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top vacant spaces */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-white font-semibold mb-4">Cellules vacantes par durée</h3>
        {occupancy.vacantByDuration.length === 0 ? (
          <p className="text-[13px] text-slate-500">Aucune cellule vacante</p>
        ) : (
          <div className="space-y-2">
            {occupancy.vacantByDuration.map((v) => (
              <div key={v.spaceRef} className="flex items-center justify-between rounded-lg p-3" style={{ background: '#0f1623', border: '1px solid #1e2a3a' }}>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-mono font-bold" style={{ color: '#ef4444' }}>{v.spaceRef}</span>
                  <span className="text-[12px] text-slate-300">{v.wing}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span style={{ color: '#4a5568' }}>{v.areaSqm} m²</span>
                  <span className="font-bold" style={{ color: v.daysVacant > 60 ? '#ef4444' : '#f59e0b' }}>{v.daysVacant}j vacant</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <h3 className="text-white font-semibold mb-4">Alertes ({alerts.length})</h3>
          <div className="space-y-2">
            {alerts.map((a) => {
              const sevColor = a.severity === 'critical' ? '#ef4444' : a.severity === 'warning' ? '#f59e0b' : '#38bdf8'
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: `${sevColor}08`, border: `1px solid ${sevColor}25` }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sevColor }} />
                  <p className="text-[12px] text-slate-300 flex-1">{a.message}</p>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#4a5568' }}>{a.spaceRef}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
