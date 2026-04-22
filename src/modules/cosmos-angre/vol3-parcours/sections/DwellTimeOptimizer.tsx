// ═══ VOL.3 — Dwell Time Optimizer (F3.8) ═══

import { useMemo } from 'react'
import { Clock, AlertTriangle, Lightbulb, TrendingUp, Target } from 'lucide-react'

interface ZoneDwell {
  zone: string
  floor: string
  avgMinutes: number
  targetMinutes: number
  isDropoff: boolean
  interventions: string[]
}

const ZONES: ZoneDwell[] = [
  { zone: 'Hall Principal', floor: 'RDC', avgMinutes: 8, targetMinutes: 12, isDropoff: false, interventions: [] },
  { zone: 'Galerie Ouest (Mode)', floor: 'RDC', avgMinutes: 22, targetMinutes: 20, isDropoff: false, interventions: [] },
  { zone: 'Galerie Est', floor: 'RDC', avgMinutes: 9, targetMinutes: 18, isDropoff: true, interventions: ['Point d\'activation : demo produit ou animation', 'Reposoir : ajout banc + eclairage chaud', 'Borne interactive : ecran dynamique promotions', 'Requalification enseigne (signal Vol.1)'] },
  { zone: 'Centre Commercial', floor: 'RDC', avgMinutes: 15, targetMinutes: 15, isDropoff: false, interventions: [] },
  { zone: 'Food Court', floor: 'R+1', avgMinutes: 38, targetMinutes: 35, isDropoff: false, interventions: [] },
  { zone: 'Espace Loisirs', floor: 'R+1', avgMinutes: 45, targetMinutes: 40, isDropoff: false, interventions: [] },
  { zone: 'Couloir Est R+1', floor: 'R+1', avgMinutes: 4, targetMinutes: 10, isDropoff: true, interventions: ['Signalétique directionnelle manquante', 'Aucun attracteur visible — ajouter vitrine animee', 'Zone de repos avec vue terrasse'] },
  { zone: 'Parking B1', floor: 'B1', avgMinutes: 6, targetMinutes: 8, isDropoff: false, interventions: [] },
  { zone: 'Couloir Services', floor: 'RDC', avgMinutes: 5, targetMinutes: 12, isDropoff: true, interventions: ['Espace trop lineaire sans surprise', 'Ajouter point photo/selfie instagrammable', 'Borne Cosmos Club gamification'] },
]

export default function DwellTimeOptimizer() {
  const globalAvg = useMemo(() => Math.round(ZONES.reduce((s, z) => s + z.avgMinutes, 0) / ZONES.length), [])
  const targetGlobal = 90 // minutes
  const dropoffZones = ZONES.filter(z => z.isDropoff)
  const totalEstimated = ZONES.reduce((s, z) => s + z.avgMinutes, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#8b5cf6' }}>VOL. 3 — PARCOURS CLIENT</p>
        <h1 className="text-[28px] font-light text-white mb-2">Dwell Time Optimizer</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Analyse du temps de presence par zone, detection des zones de decrochage et recommandations d'intervention.</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Clock size={18} className="mx-auto mb-2" style={{ color: '#8b5cf6' }} />
          <p className="text-2xl font-bold text-white">{totalEstimated} min</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Presence totale estimee</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Target size={18} className="mx-auto mb-2" style={{ color: '#34d399' }} />
          <p className="text-2xl font-bold" style={{ color: totalEstimated >= targetGlobal ? '#22c55e' : '#f59e0b' }}>{targetGlobal} min</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Objectif cible</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <AlertTriangle size={18} className="mx-auto mb-2" style={{ color: '#ef4444' }} />
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{dropoffZones.length}</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Zones de decrochage</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <TrendingUp size={18} className="mx-auto mb-2" style={{ color: '#38bdf8' }} />
          <p className="text-2xl font-bold text-white">{globalAvg} min</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Moy. par zone</p>
        </div>
      </div>

      {/* Zone bars */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-white font-semibold mb-4">Temps de presence par zone</h3>
        <div className="space-y-3">
          {ZONES.map((z) => {
            const ratio = z.avgMinutes / Math.max(z.targetMinutes, 1)
            const barColor = z.isDropoff ? '#ef4444' : ratio >= 1 ? '#22c55e' : '#f59e0b'
            const barWidth = Math.min(100, (z.avgMinutes / 50) * 100)
            return (
              <div key={z.zone}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {z.isDropoff && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                    <span className="text-[12px] text-white">{z.zone}</span>
                    <span className="text-[10px]" style={{ color: '#4a5568' }}>{z.floor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-bold" style={{ color: barColor }}>{z.avgMinutes} min</span>
                    <span style={{ color: '#4a5568' }}>/ {z.targetMinutes} cible</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${barWidth}%`, background: barColor }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dropoff zones with interventions */}
      {dropoffZones.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            Zones de decrochage — Interventions recommandees
          </h3>
          <div className="space-y-3">
            {dropoffZones.map((z) => (
              <div key={z.zone} className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{z.zone} ({z.floor})</span>
                  <span className="text-[11px]" style={{ color: '#ef4444' }}>{z.avgMinutes} min vs {z.targetMinutes} min cible</span>
                </div>
                <div className="space-y-1.5 ml-2">
                  {z.interventions.map((intervention, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <Lightbulb size={12} style={{ color: '#f59e0b' }} />
                      <span className="text-slate-300">{intervention}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
