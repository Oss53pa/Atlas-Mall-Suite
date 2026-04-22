// ═══ VOL.3 — Parcours Client (Studio tab) ═══
// Vue plan/opérationnelle du parcours : personas, trajectoires, simulation.
// À ne pas confondre avec ParcoursSection (« 7 moments clés » — vue narrative UX).

import { useNavigate } from 'react-router-dom'
import { Users, Route, Navigation as NavIcon, Play, Map as MapIcon, Accessibility } from 'lucide-react'
import { useVol3Store } from '../store/vol3Store'

export default function ParcoursClientSection() {
  const navigate = useNavigate()
  const profiles = useVol3Store((s) => s.visitorProfiles)
  const zones = useVol3Store((s) => s.zones)
  const pois = useVol3Store((s) => s.pois)
  const floors = useVol3Store((s) => s.floors)
  const navGraph = useVol3Store((s) => s.navGraph)
  const setActiveProfile = useVol3Store((s) => s.setActiveProfile)
  const simulateProfile = useVol3Store((s) => s.simulateProfile)

  const handleSimulate = (id: string) => {
    setActiveProfile(id)
    void simulateProfile(id)
  }

  const kpis = [
    { label: 'Personas', value: profiles.length, icon: Users, color: '#8b5cf6' },
    { label: 'Zones', value: zones.length, icon: MapIcon, color: '#34d399' },
    { label: 'Points d\'intérêt', value: pois.length, icon: NavIcon, color: '#38bdf8' },
    { label: 'Étages', value: floors.length, icon: Route, color: '#f59e0b' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#a855f7' }}>
          VOL. 3 — STUDIO · PARCOURS CLIENT
        </p>
        <h1 className="text-[24px] font-light text-white mb-2">Trajectoires sur le plan</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Simulation des déplacements des personas cibles entre zones et POI. Chaque persona suit
          ses attracteurs et produit une trajectoire utilisée pour le wayfinding et la signalétique.
        </p>
      </div>

      {/* KPIs plan */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div
              key={k.label}
              className="rounded-xl p-4"
              style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#6b7280' }}>
                  {k.label}
                </span>
                <div
                  className="h-7 w-7 flex items-center justify-center rounded-md"
                  style={{ background: `${k.color}15` }}
                >
                  <Icon size={14} style={{ color: k.color }} />
                </div>
              </div>
              <span className="text-xl font-bold text-white">{k.value}</span>
            </div>
          )
        })}
      </div>

      {/* Statut graph de navigation */}
      <div className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Graphe de navigation</h2>
          {navGraph ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
              Prêt · {navGraph.nodes.length} nœuds
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: '1px solid #1e2a3a' }}>
              Non calculé
            </span>
          )}
        </div>
        <p className="text-[11px]" style={{ color: '#6b7280' }}>
          Le graphe est généré à partir des zones et POI importés. Il alimente le calcul des
          trajectoires et la section Wayfinding.
        </p>
      </div>

      {/* Liste personas + simulate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Personas à simuler</h2>
          <button
            onClick={() => navigate('.')}
            className="text-[11px] text-slate-500 hover:text-white"
          >
            Ajouter un persona →
          </button>
        </div>

        {profiles.length === 0 ? (
          <div
            className="rounded-lg p-6 text-center"
            style={{ background: '#141e2e', border: '1px dashed #1e2a3a' }}
          >
            <Users size={22} className="mx-auto text-slate-600 mb-2" />
            <p className="text-[12px] text-slate-400 mb-1">Aucun persona défini</p>
            <p className="text-[11px] text-slate-600">
              Créez des personas dans l'onglet « 4 Personas Cosmos » pour lancer des simulations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="rounded-lg p-4 flex items-start gap-3"
                style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
              >
                <div
                  className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: 'rgba(139,92,246,0.15)',
                    color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,0.3)',
                  }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-white truncate">{p.name}</p>
                    {p.pmrRequired && (
                      <Accessibility size={10} style={{ color: '#38bdf8' }} />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {p.speed} m/s · dwell ×{p.dwellMultiplier} · {p.attractors.length} attracteurs
                  </p>
                </div>
                <button
                  onClick={() => handleSimulate(p.id)}
                  disabled={!navGraph || zones.length === 0}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title={!navGraph ? 'Calculer le graphe de navigation dans Wayfinding' : 'Simuler'}
                >
                  <Play size={11} /> Simuler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lien vers sections connexes */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
      >
        <NavIcon size={16} className="text-violet-300 flex-shrink-0" />
        <div className="flex-1 text-[12px] text-slate-400">
          Pour visualiser les trajectoires calculées sur le plan, ouvrez l'onglet{' '}
          <span className="text-violet-300">Wayfinding</span>. Pour la narration UX,{' '}
          <span className="text-violet-300">Parcours visuel</span> (M1) affiche les 7 moments clés.
        </div>
      </div>
    </div>
  )
}
