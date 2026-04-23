import { useState } from 'react'
import { Camera, AlertTriangle, Shield, Users, WifiOff } from 'lucide-react'
import { useVol2Store } from '../store/vol2Store'

interface LiveIncident {
  id: string
  type: string
  zone: string
  time: string
  severity: 'critique' | 'haute' | 'moyenne'
  status: 'ouvert' | 'en_cours' | 'resolu'
}

// Incidents temps réel fournis par une intégration VMS/Supabase non encore connectée.
// Rester vide tant qu'aucune source réelle n'est branchée.
const LIVE_INCIDENTS: LiveIncident[] = []

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
    { label: 'Incidents ouverts', value: LIVE_INCIDENTS.filter(i => i.status === 'ouvert').length, icon: AlertTriangle, color: '#ef4444' },
    { label: 'Couverture', value: `${totalCoverage}%`, icon: Shield, color: '#38bdf8' },
    { label: 'Equipes actives', value: '—', icon: Users, color: '#b38a5a' },
  ]

  const filtered = filter === 'all' ? LIVE_INCIDENTS : LIVE_INCIDENTS.filter(i => i.status === filter)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Salle de Contrôle</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Vue temps réel du dispositif de sécurité — caméras, incidents et équipes.
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
          {filtered.length === 0 && (
            <p className="text-center text-[12px] py-4" style={{ color: '#4a5568' }}>
              Aucun incident remonté. Les incidents apparaîtront ici une fois l'intégration VMS/Supabase active.
            </p>
          )}
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
          {cameras.slice(0, 24).map((cam) => (
            <div
              key={cam.id}
              className="flex flex-col items-center gap-1 p-2 rounded-lg"
              style={{ background: 'rgba(148,163,184,0.04)', border: '1px solid #1e2a3a' }}
              title="Statut temps réel non disponible — intégration VMS requise"
            >
              <WifiOff size={12} style={{ color: '#64748b' }} />
              <span className="text-[9px] text-center" style={{ color: '#94a3b8' }}>{cam.label.slice(0, 10)}</span>
            </div>
          ))}
          {cameras.length === 0 && (
            <p className="col-span-8 text-center text-[13px] py-4" style={{ color: '#4a5568' }}>
              Aucune caméra enregistrée. Ajoutez-en via la section Vidéosurveillance.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
