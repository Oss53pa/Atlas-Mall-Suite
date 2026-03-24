import React from 'react'
import { Eye, Sparkles } from 'lucide-react'

type EquipStatus = 'Opérationnel' | 'En cours' | 'Planifié'

interface Equipment {
  name: string
  description: string
  status: EquipStatus
}

const equipments: Equipment[] = [
  { name: 'Caméras PTZ haute définition sur mâts', description: 'Surveillance parking et voies d\'accès — rotation 360° et zoom ×30', status: 'Opérationnel' },
  { name: 'Détection périmétrique par analyse vidéo IA', description: 'Détection intrusion automatique sur clôtures et limites de propriété', status: 'En cours' },
  { name: 'Éclairage dissuasif automatique', description: 'Activation sur détection de mouvement — zones sombres du périmètre', status: 'Opérationnel' },
  { name: 'Barrières levantes contrôlées', description: 'Entrées véhicules avec lecture de badge ou ticket — ouverture automatique Platinum', status: 'Opérationnel' },
  { name: 'Rondes véhiculées — circuit GPS tracé', description: 'Circuit de ronde nocturne géolocalisé — rapport automatique via tablette', status: 'Planifié' },
]

const statusColors: Record<EquipStatus, { bg: string; border: string; text: string }> = {
  'Opérationnel': { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' },
  'En cours': { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b' },
  'Planifié': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#64748b' },
}

export default function PerimetreSection() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>VOL. 2 — PLAN SÉCURITAIRE</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)' }}>ZONE 01</span>
          <h1 className="text-[28px] font-light text-white">Périmétrique</h1>
        </div>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>Surveillance du périmètre extérieur : parking, voies d'accès, façades.</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Dispositif</h2>
        {equipments.map((eq) => {
          const sc = statusColors[eq.status]
          return (
            <div key={eq.name} className="rounded-[10px] p-4 flex items-start justify-between" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0" style={{ background: '#38bdf8' }} />
                <div>
                  <span className="text-[13px] font-medium text-white">{eq.name}</span>
                  <p className="text-[12px] mt-1" style={{ color: '#4a5568' }}>{eq.description}</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-4" style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{eq.status}</span>
            </div>
          )
        })}
      </div>

      <div className="rounded-[10px] p-6" style={{ background: 'rgba(126,34,206,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(126,34,206,0.2)' }}><Sparkles size={16} className="text-purple-400" /></div>
          <h3 className="font-semibold text-purple-300">Proph3t Insight — Zone Périmétrique</h3>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-purple-300">82/100</span>
          <span className="text-sm" style={{ color: '#94a3b8' }}>Score couverture périmétrique</span>
        </div>
        <ul className="space-y-1 text-[13px]" style={{ color: '#94a3b8' }}>
          <li>• Couverture parking : 94% — angle mort détecté secteur C niveau -2</li>
          <li>• Éclairage dissuasif : 100% zones couvertes</li>
          <li>• Recommandation : ajouter 2 caméras PTZ secteur C pour atteindre 100%</li>
        </ul>
      </div>
    </div>
  )
}
