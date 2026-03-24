// ═══ VOL.3 — Tenant Mix Validator Parcours (F3.12) ═══

import React from 'react'
import { AlertTriangle, MapPin, ArrowRight, Users, Sparkles, CheckCircle } from 'lucide-react'

interface ZoneAnalysis {
  zone: string
  floor: string
  trafficDensity: number // 0-100
  isDesert: boolean
  currentTenants: string[]
  missingSectors: string[]
  vacantSpaces: { ref: string; areaSqm: number }[]
  recommendation: string
  balanceScore: number // 0-100
}

const ZONE_ANALYSIS: ZoneAnalysis[] = [
  {
    zone: 'Galerie Ouest', floor: 'RDC', trafficDensity: 85, isDesert: false,
    currentTenants: ['Zara', 'Sephora', 'Orange Money', 'SGBCI'],
    missingSectors: [],
    vacantSpaces: [],
    recommendation: 'Equilibre satisfaisant. Mix mode/beaute/services bien calibre.',
    balanceScore: 88,
  },
  {
    zone: 'Galerie Est', floor: 'RDC', trafficDensity: 35, isDesert: true,
    currentTenants: ['Samsung'],
    missingSectors: ['Enfants', 'Bijouterie', 'Mode accessoires'],
    vacantSpaces: [{ ref: 'RDC-A04', areaSqm: 120 }],
    recommendation: 'Desert commercial detecte. Seulement 1 enseigne sur 3 cellules. Le flux visiteur decroche apres Samsung. Recommandation : enseigne enfants (Joupi, Chicco) + bijouterie artisanale pour creer un attracteur de destination.',
    balanceScore: 32,
  },
  {
    zone: 'Food Court', floor: 'R+1', trafficDensity: 92, isDesert: false,
    currentTenants: ['KFC', 'Brioche Doree'],
    missingSectors: ['Cuisine africaine', 'Juice bar'],
    vacantSpaces: [{ ref: 'R1-C05', areaSqm: 75 }],
    recommendation: 'Fort trafic mais cellule R1-C05 vacante a haut potentiel. Profil ideal : cuisine africaine locale (garba, attiéké) ou juice bar sante. Completerait l\'offre food court.',
    balanceScore: 75,
  },
  {
    zone: 'Loisirs / Sport', floor: 'R+1', trafficDensity: 78, isDesert: false,
    currentTenants: ['Pathe', 'Decathlon'],
    missingSectors: [],
    vacantSpaces: [],
    recommendation: 'Ancres loisirs/sport fortes. Le cinema Pathe genere un flux constant apres-midi/soir.',
    balanceScore: 90,
  },
  {
    zone: 'Hypermarche B1', floor: 'B1', trafficDensity: 70, isDesert: false,
    currentTenants: ['Carrefour'],
    missingSectors: ['Services proximite'],
    vacantSpaces: [{ ref: 'B1-B02', areaSqm: 150 }],
    recommendation: 'Cellule B1-B02 en travaux adjacente a Carrefour. Profil ideal : pressing, cordonnerie ou cle-minute. Les clients hypermarche utilisent ces services de proximite.',
    balanceScore: 65,
  },
]

function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export default function TenantMixValidator() {
  const globalBalance = Math.round(ZONE_ANALYSIS.reduce((s, z) => s + z.balanceScore, 0) / ZONE_ANALYSIS.length)
  const desertCount = ZONE_ANALYSIS.filter(z => z.isDesert).length
  const totalVacant = ZONE_ANALYSIS.reduce((s, z) => s + z.vacantSpaces.length, 0)

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#ec4899' }}>VOL. 3 — PARCOURS CLIENT</p>
        <h1 className="text-[28px] font-light text-white mb-2">Tenant Mix Validator (Parcours)</h1>
        <p className="text-[13px]" style={{ color: '#4a5568' }}>
          Analyse du parcours pour detecter les deserts commerciaux et recommander les enseignes manquantes pour equilibrer les flux.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-3xl font-bold" style={{ color: scoreColor(globalBalance) }}>{globalBalance}%</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Score equilibre global</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-3xl font-bold" style={{ color: desertCount > 0 ? '#ef4444' : '#22c55e' }}>{desertCount}</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Deserts commerciaux</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{totalVacant}</p>
          <p className="text-[10px]" style={{ color: '#4a5568' }}>Cellules strategiques vacantes</p>
        </div>
      </div>

      {/* Zone cards */}
      <div className="space-y-4">
        {ZONE_ANALYSIS.sort((a, b) => a.balanceScore - b.balanceScore).map((z) => (
          <div key={z.zone} className="rounded-xl p-5" style={{
            background: z.isDesert ? 'rgba(239,68,68,0.03)' : '#141e2e',
            border: `1px solid ${z.isDesert ? 'rgba(239,68,68,0.2)' : '#1e2a3a'}`,
          }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {z.isDesert ? <AlertTriangle size={18} style={{ color: '#ef4444' }} /> : <CheckCircle size={18} style={{ color: '#22c55e' }} />}
                <div>
                  <p className="text-white font-semibold">{z.zone} ({z.floor})</p>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
                    <Users size={10} />
                    <span>Trafic : {z.trafficDensity}/100</span>
                    <span>·</span>
                    <span>Enseignes : {z.currentTenants.join(', ')}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold" style={{ color: scoreColor(z.balanceScore) }}>{z.balanceScore}</span>
                <p className="text-[9px]" style={{ color: '#4a5568' }}>Score equilibre</p>
              </div>
            </div>

            {/* Missing sectors */}
            {z.missingSectors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 ml-8">
                {z.missingSectors.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    Manque : {s}
                  </span>
                ))}
              </div>
            )}

            {/* Vacant spaces */}
            {z.vacantSpaces.length > 0 && (
              <div className="flex gap-2 mb-2 ml-8">
                {z.vacantSpaces.map(v => (
                  <span key={v.ref} className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    {v.ref} — {v.areaSqm} m²
                  </span>
                ))}
              </div>
            )}

            {/* Recommendation */}
            <div className="flex items-start gap-2 ml-8">
              <Sparkles size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#a855f7' }} />
              <p className="text-[12px] text-slate-400">{z.recommendation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
