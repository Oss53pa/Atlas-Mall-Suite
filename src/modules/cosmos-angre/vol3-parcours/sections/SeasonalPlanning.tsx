// ═══ VOL.3 — Seasonal Scenario Planning (F3.11) ═══

import React, { useState } from 'react'
import { Calendar, Users, Signpost, Shield, ShoppingBag, Play, Loader2 } from 'lucide-react'

interface Season {
  id: string
  name: string
  emoji: string
  coefficient: number
  durationDays: number
  peakHours: string
  description: string
  color: string
}

interface SeasonalRecommendation {
  category: string
  icon: React.ElementType
  items: string[]
}

const SEASONS: Season[] = [
  { id: 'tabaski', name: 'Tabaski / Aid al-Adha', emoji: '\u{1F411}', coefficient: 3.0, durationDays: 7, peakHours: '10h-20h', description: 'Pic de frequentation maximal. Achats mode, bijouterie, alimentaire. Flux entree x3.', color: '#f59e0b' },
  { id: 'noel', name: 'Noel / Fetes', emoji: '\u{1F384}', coefficient: 2.5, durationDays: 21, peakHours: '10h-22h', description: 'Periode cadeaux prolongee. Forte demande loisirs, mode, electronique. Evenements enfants.', color: '#ef4444' },
  { id: 'rentree', name: 'Rentree scolaire', emoji: '\u{1F4DA}', coefficient: 2.0, durationDays: 14, peakHours: '9h-19h', description: 'Achats fournitures, vetements enfants, electronique. Flux famille dense.', color: '#38bdf8' },
  { id: 'valentine', name: 'Saint-Valentin', emoji: '\u{2764}\u{FE0F}', coefficient: 1.8, durationDays: 3, peakHours: '11h-21h', description: 'Pic bijouterie, restauration, mode femme. Evenements couples.', color: '#ec4899' },
  { id: 'promo', name: 'Journee promotionnelle', emoji: '\u{1F4B0}', coefficient: 2.2, durationDays: 2, peakHours: '8h-22h', description: 'Soldes flash. Affluence tres concentree. Risque saturation parking et food court.', color: '#22c55e' },
]

function getRecommendations(season: Season): SeasonalRecommendation[] {
  return [
    {
      category: 'Signaletique temporaire',
      icon: Signpost,
      items: [
        `Panneaux directionnels supplementaires entrees (x${season.coefficient.toFixed(0)} affluence)`,
        `Balisage file d'attente parking B1 + entrees principales`,
        `Affichage promotionnel ${season.name} sur totems digitaux`,
        'Stickers sol guidage flux sortie',
      ],
    },
    {
      category: 'Gestion des flux',
      icon: Users,
      items: [
        `Configuration entree/sortie : separation flux aux heures de pointe (${season.peakHours})`,
        `Barrieres de canalisation hall principal + food court`,
        `Compteurs flux temps reel : seuil alerte a ${Math.round(4500 * season.coefficient / 3)} visiteurs simultanes`,
        'Navettes parking relais si debordement (> 95% capacite)',
      ],
    },
    {
      category: 'Securite renforcee',
      icon: Shield,
      items: [
        `Agents securite supplementaires : +${Math.round((season.coefficient - 1) * 10)} agents (jour)`,
        'Poste PC securite en configuration renforcee',
        'Pre-positionnement equipe intervention food court',
        'Brief securite specifique ' + season.name,
      ],
    },
    {
      category: 'Food Court & Services',
      icon: ShoppingBag,
      items: [
        season.coefficient >= 2.5 ? 'Extension food court : stands temporaires galerie R+1' : 'Renforcement equipes food court',
        'Hotesses accueil renforcees x3 aux entrees',
        `Horaires etendus : ouverture ${season.peakHours}`,
        'Offre Cosmos Club speciale ' + season.name,
      ],
    },
  ]
}

export default function SeasonalPlanning() {
  const [selected, setSelected] = useState<string>('tabaski')
  const [simulating, setSimulating] = useState(false)

  const season = SEASONS.find(s => s.id === selected)!
  const recommendations = getRecommendations(season)

  const handleSimulate = () => {
    setSimulating(true)
    setTimeout(() => setSimulating(false), 2000)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 3 — PARCOURS CLIENT</p>
        <h1 className="text-[28px] font-light text-white mb-2">Scenarios Saisonniers</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>Planification operationnelle par saison — signaletique temporaire, flux, securite, food court.</p>
      </div>

      {/* Season selector */}
      <div className="flex gap-3">
        {SEASONS.map(s => (
          <button key={s.id} onClick={() => setSelected(s.id)} className="flex-1 rounded-xl p-4 text-center transition-all" style={{ background: selected === s.id ? `${s.color}12` : '#141e2e', border: `1px solid ${selected === s.id ? `${s.color}50` : '#1e2a3a'}` }}>
            <span className="text-2xl">{s.emoji}</span>
            <p className="text-[12px] font-medium mt-1" style={{ color: selected === s.id ? s.color : '#4a5568' }}>{s.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#4a5568' }}>x{s.coefficient}</p>
          </button>
        ))}
      </div>

      {/* Selected season detail */}
      <div className="rounded-xl p-5" style={{ background: '#141e2e', border: `1px solid ${season.color}30` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-lg">{season.emoji} {season.name}</h3>
            <p className="text-[12px] text-slate-400 mt-1">{season.description}</p>
          </div>
          <button onClick={handleSimulate} disabled={simulating} className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-lg" style={{ background: `${season.color}15`, border: `1px solid ${season.color}40`, color: season.color }}>
            {simulating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {simulating ? 'Simulation...' : 'Simuler'}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-lg p-3 text-center" style={{ background: '#0f1623' }}>
            <p className="text-xl font-bold" style={{ color: season.color }}>x{season.coefficient}</p>
            <p className="text-[10px] text-slate-500">Coefficient affluence</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#0f1623' }}>
            <p className="text-xl font-bold text-white">{season.durationDays}j</p>
            <p className="text-[10px] text-slate-500">Duree pic</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: '#0f1623' }}>
            <p className="text-xl font-bold text-white">{season.peakHours}</p>
            <p className="text-[10px] text-slate-500">Heures pic</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h3 className="text-white font-semibold">Plan operationnel — {season.name}</h3>
        {recommendations.map((rec) => {
          const Icon = rec.icon
          return (
            <div key={rec.category} className="rounded-xl p-4" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} style={{ color: season.color }} />
                <span className="text-white font-medium text-[13px]">{rec.category}</span>
              </div>
              <div className="space-y-1.5 ml-6">
                {rec.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px]">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: season.color }} />
                    <span className="text-slate-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
