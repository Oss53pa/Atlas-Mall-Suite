// ═══ VOL.3 — Tenant Mix Validator Parcours (Faille #6 corrigee) ═══
// Connecte au vol1Store pour les enseignes reelles + fallback donnees demo

import React, { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, MapPin, ArrowRight, Users, Sparkles, CheckCircle, RefreshCw } from 'lucide-react'

// Import dynamique du vol1Store pour eviter les dependances circulaires
let useVol1Store: (() => { tenants: any[]; spaces: any[] }) | null = null

interface ZoneAnalysis {
  zone: string
  floor: string
  trafficDensity: number
  isDesert: boolean
  currentTenants: string[]
  missingSectors: string[]
  vacantSpaces: { ref: string; areaSqm: number }[]
  recommendation: string
  balanceScore: number
}

const DEMO_ZONE_ANALYSIS: ZoneAnalysis[] = [
  {
    zone: 'Galerie Ouest', floor: 'RDC', trafficDensity: 85, isDesert: false,
    currentTenants: ['Zara', 'Sephora', 'Orange Money', 'SGBCI'], missingSectors: [],
    vacantSpaces: [], recommendation: 'Equilibre satisfaisant. Mix mode/beaute/services bien calibre.', balanceScore: 88,
  },
  {
    zone: 'Galerie Est', floor: 'RDC', trafficDensity: 35, isDesert: true,
    currentTenants: ['Samsung'],
    missingSectors: ['Enfants', 'Bijouterie', 'Mode accessoires'],
    vacantSpaces: [{ ref: 'CE-03', areaSqm: 85 }, { ref: 'CE-05', areaSqm: 120 }],
    recommendation: 'Desert commercial critique. Placer une enseigne enfants (ex: Orchestra) en CE-03 et bijouterie en CE-05 pour creer un flux croise.',
    balanceScore: 28,
  },
  {
    zone: 'Food Court', floor: 'R+1', trafficDensity: 72, isDesert: false,
    currentTenants: ['KFC', 'Patisserie Abidjanaise', 'Juice Bar'],
    missingSectors: ['Cuisine africaine haut de gamme'],
    vacantSpaces: [{ ref: 'FC-07', areaSqm: 65 }],
    recommendation: 'Bon trafic mais manque un restaurant ivoirien premium. Cellule FC-07 ideale (65m2, proche terrasse).',
    balanceScore: 72,
  },
  {
    zone: 'Loisirs & Sport', floor: 'R+1', trafficDensity: 55, isDesert: false,
    currentTenants: ['Pathe Cinemas', 'Fitness Park'],
    missingSectors: ['Jeux enfants', 'Bowling/divertissement'],
    vacantSpaces: [{ ref: 'LS-04', areaSqm: 200 }],
    recommendation: 'Ajouter un espace jeux enfants (Funplanet / Kidzzz) en LS-04 pour capter le flux famille du cinema adjacent.',
    balanceScore: 60,
  },
  {
    zone: 'Hypermarche B1', floor: 'B1', trafficDensity: 90, isDesert: false,
    currentTenants: ['Carrefour'], missingSectors: [],
    vacantSpaces: [], recommendation: 'Ancre principale. Trafic eleve. Pas de vacance.', balanceScore: 95,
  },
]

function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function TenantMixValidator() {
  const [isDemo, setIsDemo] = useState(true)
  const [vol1Tenants, setVol1Tenants] = useState<any[]>([])
  const [vol1Spaces, setVol1Spaces] = useState<any[]>([])

  // Charger vol1Store dynamiquement
  useEffect(() => {
    import('../../vol1-commercial/store/vol1Store').then(mod => {
      useVol1Store = () => mod.useVol1Store.getState() as any
      const state = mod.useVol1Store.getState()
      if (state.tenants.length > 0) {
        setVol1Tenants(state.tenants)
        setVol1Spaces(state.spaces)
        setIsDemo(false)
      }
      // S'abonner aux changements
      mod.useVol1Store.subscribe((s: any) => {
        if (s.tenants.length > 0) {
          setVol1Tenants(s.tenants)
          setVol1Spaces(s.spaces)
          setIsDemo(false)
        }
      })
    }).catch(() => { /* Vol1 non charge */ })
  }, [])

  const handleSync = () => {
    if (!useVol1Store) return
    const state = useVol1Store()
    setVol1Tenants(state.tenants)
    setVol1Spaces(state.spaces)
    setIsDemo(state.tenants.length === 0)
  }

  // Construire l'analyse a partir des donnees Vol.1 ou utiliser les donnees demo
  const zoneAnalysis = useMemo<ZoneAnalysis[]>(() => {
    if (isDemo || vol1Tenants.length === 0) return DEMO_ZONE_ANALYSIS

    // Regrouper les espaces par wing/zone
    const wingGroups = new Map<string, typeof vol1Spaces>()
    for (const space of vol1Spaces) {
      const wing = space.wing || 'Autre'
      const group = wingGroups.get(wing) ?? []
      group.push(space)
      wingGroups.set(wing, group)
    }

    return Array.from(wingGroups.entries()).map(([wing, spaces]) => {
      const occupied = spaces.filter((s: any) => s.status === 'occupied')
      const vacant = spaces.filter((s: any) => s.status === 'vacant')
      const tenantNames = occupied.map((s: any) => {
        const t = vol1Tenants.find((t2: any) => t2.id === s.tenantId)
        return t?.brandName ?? 'Inconnu'
      }).filter(Boolean)

      const sectors = new Set(occupied.map((s: any) => {
        const t = vol1Tenants.find((t2: any) => t2.id === s.tenantId)
        return t?.sector ?? ''
      }).filter(Boolean))

      const allSectors = ['mode', 'restauration', 'services', 'loisirs', 'alimentaire', 'beaute', 'electronique']
      const missing = allSectors.filter(s => !sectors.has(s) && spaces.length > 3).slice(0, 3)
      const density = spaces.length > 0 ? Math.round((occupied.length / spaces.length) * 100) : 0
      const balance = Math.min(100, density + (missing.length === 0 ? 15 : -missing.length * 10))

      return {
        zone: wing,
        floor: spaces[0]?.floorLevel ?? 'RDC',
        trafficDensity: density,
        isDesert: density < 40 && spaces.length > 2,
        currentTenants: tenantNames,
        missingSectors: missing,
        vacantSpaces: vacant.map((v: any) => ({ ref: v.reference, areaSqm: v.areaSqm })),
        recommendation: density < 40
          ? `Desert commercial : seulement ${occupied.length}/${spaces.length} cellules occupees. Prioriser le remplissage.`
          : missing.length > 0
            ? `Mix a completer : ${missing.join(', ')} manquant(s) pour equilibrer les flux.`
            : 'Equilibre satisfaisant.',
        balanceScore: Math.max(0, Math.min(100, balance)),
      }
    })
  }, [isDemo, vol1Tenants, vol1Spaces])

  const globalBalance = Math.round(zoneAnalysis.reduce((s, z) => s + z.balanceScore, 0) / Math.max(1, zoneAnalysis.length))
  const desertCount = zoneAnalysis.filter(z => z.isDesert).length
  const totalVacant = zoneAnalysis.reduce((s, z) => s + z.vacantSpaces.length, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#ec4899' }}>VOL. 3 — PARCOURS CLIENT</p>
          <h1 className="text-[28px] font-display font-bold text-white mb-2">Tenant Mix Validator</h1>
          <p className="text-[13px]" style={{ color: '#4a5568' }}>
            Analyse des flux pour detecter les deserts commerciaux et recommander les enseignes manquantes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              Donnees de demonstration
            </span>
          )}
          <button onClick={handleSync} className="btn-ghost text-[11px]">
            <RefreshCw size={12} /> Synchroniser Vol.1
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center border border-white/[0.06] bg-surface-2">
          <p className="text-3xl font-display font-bold" style={{ color: scoreColor(globalBalance) }}>{globalBalance}%</p>
          <p className="text-[10px] text-gray-600">Score equilibre global</p>
        </div>
        <div className="rounded-xl p-4 text-center border border-white/[0.06] bg-surface-2">
          <p className="text-3xl font-display font-bold" style={{ color: desertCount > 0 ? '#ef4444' : '#22c55e' }}>{desertCount}</p>
          <p className="text-[10px] text-gray-600">Deserts commerciaux</p>
        </div>
        <div className="rounded-xl p-4 text-center border border-white/[0.06] bg-surface-2">
          <p className="text-3xl font-display font-bold" style={{ color: '#f59e0b' }}>{totalVacant}</p>
          <p className="text-[10px] text-gray-600">Cellules strategiques vacantes</p>
        </div>
      </div>

      {/* Zone cards */}
      <div className="space-y-4">
        {zoneAnalysis.sort((a, b) => a.balanceScore - b.balanceScore).map((z) => (
          <div key={z.zone} className="rounded-xl p-5" style={{
            background: z.isDesert ? 'rgba(239,68,68,0.03)' : undefined,
            border: `1px solid ${z.isDesert ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {z.isDesert ? <AlertTriangle size={18} style={{ color: '#ef4444' }} /> : <CheckCircle size={18} style={{ color: '#22c55e' }} />}
                <div>
                  <p className="text-white font-semibold">{z.zone} ({z.floor})</p>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5 text-gray-600">
                    <Users size={10} />
                    <span>Trafic : {z.trafficDensity}/100</span>
                    <span>·</span>
                    <span>Enseignes : {z.currentTenants.join(', ') || 'Aucune'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: scoreColor(z.balanceScore) }}>{z.balanceScore}</span>
                <p className="text-[9px] text-gray-600">Score equilibre</p>
              </div>
            </div>

            {z.missingSectors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 ml-8">
                {z.missingSectors.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                    Manque : {s}
                  </span>
                ))}
              </div>
            )}

            {z.vacantSpaces.length > 0 && (
              <div className="flex gap-2 mb-2 ml-8">
                {z.vacantSpaces.map(v => (
                  <span key={v.ref} className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    {v.ref} — {v.areaSqm} m²
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 ml-8">
              <Sparkles size={12} className="mt-0.5 flex-shrink-0 text-purple-400" />
              <p className="text-[12px] text-slate-400">{z.recommendation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
