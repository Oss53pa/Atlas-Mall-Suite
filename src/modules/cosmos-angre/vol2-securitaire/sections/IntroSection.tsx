import React from 'react'
import { Camera, Monitor, Layers, Zap, Sparkles } from 'lucide-react'

const stats = [
  { value: '120+', label: 'CAMÉRAS', icon: Camera },
  { value: '24/7', label: 'PC SÉCURITÉ', icon: Monitor },
  { value: '5', label: 'ZONES', icon: Layers },
  { value: '<3min', label: 'INTERVENTION', icon: Zap },
]

export default function IntroSection() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#38bdf8' }}>
          VOL. 2 — PLAN SÉCURITAIRE
        </p>
        <h1 className="text-[28px] font-light text-white mb-3">Introduction</h1>
        <p className="text-[13px] leading-[1.7]" style={{ color: '#4a5568' }}>
          Dispositif de sûreté et sécurité incendie — contrôle d'accès, vidéoprotection, procédures d'urgence et formation.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="rounded-[10px] p-5 flex flex-col items-center text-center"
              style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}
            >
              <Icon size={20} style={{ color: '#38bdf8' }} className="mb-3" />
              <span className="text-2xl font-semibold" style={{ color: '#38bdf8' }}>{s.value}</span>
              <span className="text-[10px] tracking-wider mt-1" style={{ color: '#4a5568' }}>{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* Introduction text */}
      <div className="rounded-[10px] p-6" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <h3 className="text-sm font-semibold text-white mb-3">Dispositif global de sécurité</h3>
        <p className="text-[13px] leading-[1.8]" style={{ color: '#94a3b8' }}>
          Le centre commercial Cosmos Angré déploie un dispositif de sécurité intégré couvrant cinq périmètres complémentaires : la surveillance périmétrique extérieure, le contrôle d'accès physique et électronique, un réseau de vidéosurveillance intelligent de plus de 120 caméras, un système de sécurité incendie conforme ERP catégorie 1, et un programme de procédures opérationnelles et de formation continue.
        </p>
        <p className="text-[13px] leading-[1.8] mt-3" style={{ color: '#94a3b8' }}>
          L'ensemble est piloté depuis un PC sécurité central opérationnel 24h/24, 7j/7, sous la direction d'un Directeur Sûreté et de deux chefs de poste (jour/nuit) encadrant 12 agents SSIAP qualifiés. Le temps d'intervention cible est inférieur à 3 minutes sur l'ensemble du site.
        </p>
      </div>

      {/* Proph3t Insight */}
      <div className="rounded-[10px] p-6" style={{ background: 'rgba(126,34,206,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(126,34,206,0.2)' }}>
            <Sparkles size={16} className="text-purple-400" />
          </div>
          <h3 className="font-semibold text-purple-300">Proph3t Insight</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-purple-300">87/100</span>
            <span className="text-sm" style={{ color: '#94a3b8' }}>Score sécurité global</span>
          </div>
          <p className="text-[13px] leading-[1.7]" style={{ color: '#94a3b8' }}>
            Le dispositif est globalement conforme aux normes APSAD R82 et EN 62676. Points d'attention : renforcer la couverture vidéo en zone parking niveau -2 (angle mort détecté secteur C) et planifier l'exercice d'évacuation T1 2026 conformément à la réglementation ERP.
          </p>
        </div>
      </div>
    </div>
  )
}
