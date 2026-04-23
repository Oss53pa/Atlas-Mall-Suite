import React, { useState } from 'react'
import { Signpost, CheckCircle, Circle, Clock, AlertTriangle, MapPin } from 'lucide-react'

type DeployStatus = 'installe' | 'en_cours' | 'en_attente' | 'probleme'

interface SignageDeployItem {
  id: string
  type: string
  location: string
  floor: string
  content: string
  status: DeployStatus
  installDate: string | null
  note?: string
}

const ITEMS: SignageDeployItem[] = [
  { id: 'SIG-001', type: 'Totem digital', location: 'Hall principal RDC', floor: 'RDC', content: 'Plan interactif + annuaire', status: 'installe', installDate: '2026-03-10' },
  { id: 'SIG-002', type: 'Totem digital', location: 'Entree Nord RDC', floor: 'RDC', content: 'Plan interactif + annuaire', status: 'installe', installDate: '2026-03-10' },
  { id: 'SIG-003', type: 'Panneau directionnel', location: 'Carrefour Galerie Est/Ouest', floor: 'RDC', content: 'Fleches + enseignes ancres', status: 'installe', installDate: '2026-03-08' },
  { id: 'SIG-004', type: 'Panneau directionnel', location: 'Palier escalator R+1', floor: 'R+1', content: 'Food court / Loisirs / Terrasse', status: 'en_cours', installDate: null, note: 'Fixation en cours, livraison panneau OK' },
  { id: 'SIG-005', type: 'Panneau suspendu', location: 'Galerie Mode RDC', floor: 'RDC', content: 'Identification zone MODE', status: 'installe', installDate: '2026-03-12' },
  { id: 'SIG-006', type: 'Panneau suspendu', location: 'Food Court R+1', floor: 'R+1', content: 'Identification FOOD COURT', status: 'installe', installDate: '2026-03-12' },
  { id: 'SIG-007', type: 'Stickers sol', location: 'Parking B1 → RDC', floor: 'B1', content: 'Guidage pietons fleches vertes', status: 'en_attente', installDate: null, note: 'Attente validation couleur par DG' },
  { id: 'SIG-008', type: 'Totem exterieur', location: 'Facade Bd Latrille', floor: 'EXT', content: 'Enseigne COSMOS lumineux H4m', status: 'probleme', installDate: null, note: 'Retard autorisation mairie Cocody — relance envoyee' },
  { id: 'SIG-009', type: 'Bache facade', location: 'Facade principale', floor: 'EXT', content: 'Coming soon 600m²', status: 'en_attente', installDate: null },
  { id: 'SIG-010', type: 'Panneau WC / PMR', location: 'Couloir services RDC', floor: 'RDC', content: 'WC + PMR + Nursery', status: 'installe', installDate: '2026-03-06' },
  { id: 'SIG-011', type: 'Panneau sortie secours', location: 'Galerie Est', floor: 'RDC', content: 'Issue secours balisee', status: 'installe', installDate: '2026-03-06' },
  { id: 'SIG-012', type: 'Ecran digital', location: 'Ascenseur hall RDC', floor: 'RDC', content: 'Evenements + promos Cosmos Club', status: 'en_cours', installDate: null, note: 'Ecran recu, cablage en cours' },
]

const statusConfig: Record<DeployStatus, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  installe: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', label: 'Installe', icon: CheckCircle },
  en_cours: { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', label: 'En cours', icon: Clock },
  en_attente: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: 'En attente', icon: Circle },
  probleme: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', label: 'Probleme', icon: AlertTriangle },
}

export default function SignaletiquTracker() {
  const [filter, setFilter] = useState<'all' | DeployStatus>('all')

  const filtered = filter === 'all' ? ITEMS : ITEMS.filter(i => i.status === filter)
  const counts = { all: ITEMS.length, installe: ITEMS.filter(i => i.status === 'installe').length, en_cours: ITEMS.filter(i => i.status === 'en_cours').length, en_attente: ITEMS.filter(i => i.status === 'en_attente').length, probleme: ITEMS.filter(i => i.status === 'probleme').length }
  const deployRate = Math.round((counts.installe / counts.all) * 100)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#22c55e' }}>VOL. 3 — PILOTAGE</p>
        <h1 className="text-[28px] font-light text-white mb-2">Deploiement Signaletique</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Suivi de l'installation de chaque element de signaletique — {counts.all} elements references.</p>
      </div>

      {/* Progress */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Signpost size={18} style={{ color: '#22c55e' }} />
            <span className="text-white font-semibold">Taux de deploiement</span>
          </div>
          <span className="text-lg font-bold" style={{ color: '#22c55e' }}>{deployRate}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${deployRate}%`, background: '#22c55e' }} />
        </div>
        <div className="flex gap-4 mt-3 text-[11px]">
          {(['installe', 'en_cours', 'en_attente', 'probleme'] as DeployStatus[]).map(s => (
            <span key={s} style={{ color: statusConfig[s].color }}>{statusConfig[s].label}: {counts[s]}</span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'probleme', 'en_cours', 'en_attente', 'installe'] as const).map(f => {
          const label = f === 'all' ? 'Tous' : statusConfig[f].label
          const color = f === 'all' ? '#34d399' : statusConfig[f].color
          return (
            <button key={f} onClick={() => setFilter(f)} className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ background: filter === f ? `${color}15` : 'transparent', border: `1px solid ${filter === f ? `${color}50` : '#1e2a3a'}`, color: filter === f ? color : '#4a5568' }}>
              {label} ({counts[f]})
            </button>
          )
        })}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const cfg = statusConfig[item.status]
          const Icon = cfg.icon
          return (
            <div key={item.id} className="flex items-center gap-4 rounded-lg p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <Icon size={16} style={{ color: cfg.color }} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono" style={{ color: '#4a5568' }}>{item.id}</span>
                  <span className="text-[13px] text-white font-medium">{item.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin size={10} style={{ color: '#4a5568' }} />
                  <span className="text-[11px]" style={{ color: '#4a5568' }}>{item.location} ({item.floor})</span>
                </div>
                {item.note && <p className="text-[11px] mt-1" style={{ color: cfg.color }}>{item.note}</p>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, color: cfg.color }}>{cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
