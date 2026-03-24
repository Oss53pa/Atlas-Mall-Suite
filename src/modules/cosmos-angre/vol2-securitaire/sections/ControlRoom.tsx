import React, { useState } from 'react'
import { Camera, AlertTriangle, Shield, Users, Wifi, WifiOff, Eye } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'

interface MockIncident {
  id: string
  type: string
  zone: string
  time: string
  severity: 'critique' | 'haute' | 'moyenne'
  status: 'ouvert' | 'en_cours' | 'resolu'
}

const MOCK_INCIDENTS: MockIncident[] = [
  { id: 'inc-01', type: 'Intrusion zone technique', zone: 'B1 - Local TGBT', time: '14:32', severity: 'critique', status: 'ouvert' },
  { id: 'inc-02', type: 'Camera hors ligne', zone: 'RDC - Hall Est', time: '13:45', severity: 'haute', status: 'en_cours' },
  { id: 'inc-03', type: 'Porte forcee', zone: 'R+1 - Issue secours 3', time: '12:18', severity: 'haute', status: 'en_cours' },
  { id: 'inc-04', type: 'Mouvement suspect', zone: 'B1 - Parking P2', time: '11:05', severity: 'moyenne', status: 'resolu' },
  { id: 'inc-05', type: 'Alarme incendie test', zone: 'R+1 - Food Court', time: '09:30', severity: 'moyenne', status: 'resolu' },
]

const sevConfig = {
  critique: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  haute: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  moyenne: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
}

const statConfig = {
  ouvert: { color: '#ef4444', label: 'Ouvert' },
  en_cours: { color: '#f59e0b', label: 'En cours' },
  resolu: { color: '#22c55e', label: 'Resolu' },
}

export default function ControlRoom() {
  const cameras = useVol2Store(s => s.cameras)
  const zones = useVol2Store(s => s.zones)
  const [filter, setFilter] = useState<'all' | 'ouvert' | 'en_cours'>('all')

  const onlineCameras = cameras.length
  const totalCoverage = zones.length > 0 ? Math.min(100, Math.round((cameras.length / Math.max(zones.length, 1)) * 50)) : 0

  const kpis = [
    { label: 'Cameras en ligne', value: `${onlineCameras}/${onlineCameras}`, icon: Camera, color: '#22c55e' },
    { label: 'Incidents ouverts', value: MOCK_INCIDENTS.filter(i => i.status === 'ouvert').length, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Couverture', value: `${totalCoverage}%`, icon: Shield, color: '#38bdf8' },
    { label: 'Equipes actives', value: '3/4', icon: Users, color: '#a855f7' },
  ]

  const filtered = filter === 'all' ? MOCK_INCIDENTS : MOCK_INCIDENTS.filter(i => i.status === filter)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Salle de Controle</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Vue temps reel du dispositif de securite — cameras, incidents et equipes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#6b7280' }}>{k.label}</span>
                <div className="h-7 w-7 flex items-center justify-center rounded-md" style={{ background: `${k.color}15` }}>
                  <Icon size={14} style={{ color: k.color }} />
                </div>
              </div>
              <span className="text-xl font-bold text-white">{k.value}</span>
            </div>
          )
        })}
      </div>

      {/* Alert List */}
      <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Incidents recents</h2>
          <div className="flex gap-1">
            {(['all', 'ouvert', 'en_cours'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-[10px] px-2 py-1 rounded-md"
                style={{
                  background: filter === f ? 'rgba(56,189,248,0.15)' : 'transparent',
                  color: filter === f ? '#38bdf8' : '#6b7280',
                }}
              >
                {f === 'all' ? 'Tous' : f === 'ouvert' ? 'Ouverts' : 'En cours'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(inc => {
            const sev = sevConfig[inc.severity]
            const stat = statConfig[inc.status]
            return (
              <div key={inc.id} className="flex items-center gap-3 rounded-lg p-3" style={{ background: sev.bg, border: `1px solid ${sev.color}20` }}>
                <AlertTriangle size={14} style={{ color: sev.color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white">{inc.type}</p>
                  <p className="text-[11px]" style={{ color: '#6b7280' }}>{inc.zone} - {inc.time}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${stat.color}15`, color: stat.color }}>
                  {stat.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Camera Status Grid */}
      <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h2 className="text-sm font-semibold text-white mb-3">Etat des cameras</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {cameras.slice(0, 24).map((cam, i) => {
            const online = true // mock: all online
            return (
              <div
                key={cam.id}
                className="flex flex-col items-center gap-1 p-2 rounded-lg"
                style={{ background: online ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${online ? '#22c55e20' : '#ef444420'}` }}
              >
                {online ? <Wifi size={12} style={{ color: '#22c55e' }} /> : <WifiOff size={12} style={{ color: '#ef4444' }} />}
                <span className="text-[9px] text-center" style={{ color: '#94a3b8' }}>{cam.label.slice(0, 10)}</span>
              </div>
            )
          })}
          {cameras.length === 0 && (
            <p className="col-span-8 text-center text-[13px] py-4" style={{ color: '#4a5568' }}>
              Aucune camera configuree. Ajoutez des cameras sur le plan 2D.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
