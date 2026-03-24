import React, { useMemo, useState } from 'react'
import { Route, MapPin, Clock, Target } from 'lucide-react'
import { generateRondePoints, optimizeRondes, type RondeRoute } from '../../shared/proph3t/rondeOptimizer'
import { useVol2Store } from '../store/vol2Store'

const priorityConfig = {
  haute: { color: '#ef4444', label: 'Haute' },
  moyenne: { color: '#f59e0b', label: 'Moyenne' },
  basse: { color: '#22c55e', label: 'Basse' },
}

export default function RondePlanner() {
  const zones = useVol2Store(s => s.zones)
  const cameras = useVol2Store(s => s.cameras)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  const plan = useMemo(() => {
    const points = generateRondePoints(zones, cameras)
    return optimizeRondes(points)
  }, [zones, cameras])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const activeRoute = plan.routes.find(r => r.id === selectedRoute) ?? plan.routes[0]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SECURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Planification des Rondes</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Itineraires optimises par Proph3t — algorithme du plus proche voisin avec priorite securitaire.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Routes', value: plan.routes.length, icon: Route, color: '#38bdf8' },
          { label: 'Points de controle', value: plan.totalPoints, icon: MapPin, color: '#22c55e' },
          { label: 'Temps total', value: formatTime(plan.totalTimeSec), icon: Clock, color: '#f59e0b' },
          { label: 'Couverture', value: `${plan.coveragePercent}%`, icon: Target, color: '#a855f7' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#6b7280' }}>{k.label}</span>
                <Icon size={14} style={{ color: k.color }} />
              </div>
              <span className="text-xl font-bold text-white">{k.value}</span>
            </div>
          )
        })}
      </div>

      {plan.routes.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>
            Ajoutez des zones et cameras sur le plan pour generer les rondes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Route List */}
          <div className="space-y-2">
            {plan.routes.map(route => (
              <div
                key={route.id}
                onClick={() => setSelectedRoute(route.id)}
                className="rounded-xl p-4 cursor-pointer transition-colors"
                style={{
                  background: selectedRoute === route.id || (!selectedRoute && route.id === plan.routes[0]?.id) ? '#1a2744' : '#141e2e',
                  border: `1px solid ${selectedRoute === route.id ? '#38bdf840' : '#1e2a3a'}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Route size={14} style={{ color: '#38bdf8' }} />
                  <span className="text-[13px] font-medium text-white">{route.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]" style={{ color: '#6b7280' }}>
                  <span>{route.points.length} points</span>
                  <span>{route.totalDistanceM}m</span>
                  <span>{formatTime(route.totalTimeSec)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Checkpoint List */}
          <div className="lg:col-span-2 rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <h2 className="text-sm font-semibold text-white mb-3">
              Checkpoints — {activeRoute?.label ?? ''}
            </h2>
            <div className="space-y-1">
              {activeRoute?.points.map((pt, idx) => {
                const pCfg = priorityConfig[pt.priority]
                return (
                  <div key={pt.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: '#0f1729' }}>
                    <span className="text-[11px] font-mono w-6 text-center" style={{ color: '#6b7280' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: pCfg.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white truncate">{pt.label}</p>
                      <p className="text-[10px]" style={{ color: '#6b7280' }}>
                        {pt.type === 'camera_check' ? 'Verification camera' : pt.type === 'door_check' ? 'Verification porte' : 'Patrouille zone'}
                        {' — '}{pt.estimatedTimeSec}s
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${pCfg.color}15`, color: pCfg.color }}>
                      {pCfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
