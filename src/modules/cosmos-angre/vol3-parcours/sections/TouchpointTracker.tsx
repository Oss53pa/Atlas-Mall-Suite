import React, { useState } from 'react'
import { Smartphone, CheckCircle, Circle, Clock, AlertTriangle, Zap } from 'lucide-react'

type TPStatus = 'actif' | 'en_test' | 'planifie' | 'desactive'

interface Touchpoint {
  id: string
  name: string
  channel: string
  moment: string
  trigger: string
  status: TPStatus
  conversionRate: number | null
  activations: number
  description: string
}

const TOUCHPOINTS: Touchpoint[] = [
  { id: 'TP-01', name: 'QR Bienvenue Parking', channel: 'QR Code', moment: 'M1 — Arrivee', trigger: 'Scan QR borne parking', status: 'actif', conversionRate: 23, activations: 1840, description: "Scan au parking → page bienvenue + plan mall + offre de bienvenue -10% food court" },
  { id: 'TP-02', name: 'Notification Push Entree', channel: 'Push / Beacon', moment: 'M1 — Arrivee', trigger: 'Beacon BLE entree principale', status: 'en_test', conversionRate: 12, activations: 450, description: "Notification push geoloc à l'entree : 'Bienvenue chez Cosmos ! Decouvrez les offres du jour'" },
  { id: 'TP-03', name: 'Totem Orientation', channel: 'Totem digital', moment: 'M2 — Orientation', trigger: 'Touch ecran totem', status: 'actif', conversionRate: 67, activations: 3200, description: "Plan interactif avec itineraire personnalise selon profil (mode, food, loisirs)" },
  { id: 'TP-04', name: 'QR Vitrine Enseigne', channel: 'QR Code', moment: 'M3 — Decouverte', trigger: 'Scan QR vitrine', status: 'actif', conversionRate: 8, activations: 920, description: "QR devant chaque enseigne → fiche enseigne + avis + promo Cosmos Club" },
  { id: 'TP-05', name: 'Push Promo Food Court', channel: 'Push / Geofence', moment: 'M4 — Pause', trigger: 'Entree zone food court', status: 'actif', conversionRate: 18, activations: 2100, description: "Notification food court : menu du jour + -15% pour membres Gold" },
  { id: 'TP-06', name: 'Scan Caisse Points', channel: 'QR Code / NFC', moment: 'M5 — Achat', trigger: 'Passage caisse partenaire', status: 'actif', conversionRate: 45, activations: 5600, description: "Scan app a la caisse → cumul points Cosmos Club (1 FCFA = 1 point)" },
  { id: 'TP-07', name: 'Photobooth Experience', channel: 'Physique + Digital', moment: 'M6 — Memorable', trigger: 'Interaction photobooth', status: 'planifie', conversionRate: null, activations: 0, description: "Photobooth instagrammable avec cadre Cosmos → partage RS = +100 points" },
  { id: 'TP-08', name: 'NPS Sortie', channel: 'Borne tactile', moment: 'M7 — Depart', trigger: 'Borne de sortie', status: 'en_test', conversionRate: 31, activations: 380, description: "Borne rapide NPS (smiley) + commentaire optionnel à la sortie" },
  { id: 'TP-09', name: 'Email Post-Visite', channel: 'Email', moment: 'M7 — Depart', trigger: 'J+1 automatique CRM', status: 'actif', conversionRate: 15, activations: 7200, description: "Email automatique J+1 : merci + resume points + prochains evenements" },
  { id: 'TP-10', name: 'Push Win-Back J+14', channel: 'Push', moment: 'Post-visite', trigger: 'Pas de visite depuis 14j', status: 'actif', conversionRate: 9, activations: 3400, description: "Push de reactivation : 'Vous nous manquez ! -20% sur votre prochain achat'" },
]

const statusConfig: Record<TPStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  actif: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'Actif', icon: CheckCircle },
  en_test: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', label: 'En test', icon: Clock },
  planifie: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'Planifie', icon: Circle },
  desactive: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: 'Desactive', icon: AlertTriangle },
}

export default function TouchpointTracker() {
  const [filter, setFilter] = useState<'all' | TPStatus>('all')
  const filtered = filter === 'all' ? TOUCHPOINTS : TOUCHPOINTS.filter(t => t.status === filter)
  const counts = { all: TOUCHPOINTS.length, actif: TOUCHPOINTS.filter(t => t.status === 'actif').length, en_test: TOUCHPOINTS.filter(t => t.status === 'en_test').length, planifie: TOUCHPOINTS.filter(t => t.status === 'planifie').length, desactive: TOUCHPOINTS.filter(t => t.status === 'desactive').length }
  const totalActivations = TOUCHPOINTS.reduce((s, t) => s + t.activations, 0)
  const avgConversion = Math.round(TOUCHPOINTS.filter(t => t.conversionRate !== null).reduce((s, t) => s + (t.conversionRate ?? 0), 0) / TOUCHPOINTS.filter(t => t.conversionRate !== null).length)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 3 — PILOTAGE</p>
        <h1 className="text-[28px] font-light text-white mb-2">Touchpoints Digitaux</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Suivi des {TOUCHPOINTS.length} points de contact digitaux du parcours Cosmos Club.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Zap size={18} style={{ color: '#f59e0b' }} className="mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{(totalActivations / 1000).toFixed(1)}k</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Activations totales</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Smartphone size={18} style={{ color: '#38bdf8' }} className="mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{counts.actif}/{counts.all}</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Touchpoints actifs</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <CheckCircle size={18} style={{ color: '#22c55e' }} className="mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{avgConversion}%</p>
          <p className="text-[11px]" style={{ color: '#4a5568' }}>Conversion moyenne</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'actif', 'en_test', 'planifie', 'desactive'] as const).map(f => {
          const label = f === 'all' ? 'Tous' : statusConfig[f].label
          const color = f === 'all' ? '#34d399' : statusConfig[f].color
          return (
            <button key={f} onClick={() => setFilter(f)} className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: filter === f ? `${color}15` : 'transparent', border: `1px solid ${filter === f ? `${color}50` : '#1e2a3a'}`, color: filter === f ? color : '#4a5568' }}>
              {label} ({counts[f]})
            </button>
          )
        })}
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((tp) => {
          const cfg = statusConfig[tp.status]
          const Icon = cfg.icon
          return (
            <div key={tp.id} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Icon size={16} style={{ color: cfg.color }} />
                  <div>
                    <p className="text-[13px] text-white font-medium">{tp.name}</p>
                    <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
                      <span>{tp.id}</span>
                      <span>·</span>
                      <span>{tp.channel}</span>
                      <span>·</span>
                      <span>{tp.moment}</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, color: cfg.color }}>{cfg.label}</span>
              </div>
              <p className="text-[12px] text-slate-400 mb-3">{tp.description}</p>
              <div className="flex items-center gap-6 text-[11px]">
                <span style={{ color: '#4a5568' }}>Trigger: <span className="text-slate-300">{tp.trigger}</span></span>
                {tp.conversionRate !== null && (
                  <span style={{ color: '#4a5568' }}>Conversion: <span className="font-bold" style={{ color: tp.conversionRate >= 20 ? '#22c55e' : tp.conversionRate >= 10 ? '#f59e0b' : '#ef4444' }}>{tp.conversionRate}%</span></span>
                )}
                <span style={{ color: '#4a5568' }}>Activations: <span className="text-slate-300 font-mono">{tp.activations.toLocaleString()}</span></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
