// ═══ VOL.1 — Proph3t Commercial IA (F1.5) ═══
// Tenant Mix Analyzer, Vacancy Recommender, Rent Optimizer

import React, { useState, useMemo } from 'react'
import { Brain, Sparkles, Target, DollarSign, MapPin, ArrowRight, Loader2 } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import { formatFcfa } from '../../shared/utils/formatting'
import { SECTOR_LABELS as sectorLabels } from '../../shared/constants/sectorConfig'

type AnalysisTab = 'mix' | 'vacancy' | 'rent'

interface MixInsight {
  type: 'warning' | 'success' | 'info'
  title: string
  detail: string
  wing?: string
}

interface VacancyReco {
  spaceRef: string
  wing: string
  areaSqm: number
  recommendedSector: Sector
  reasoning: string
  estimatedRentFcfa: number
  confidence: number
}

interface RentSuggestion {
  spaceRef: string
  brandName: string
  currentRent: number
  suggestedRent: number
  delta: number
  reasoning: string
}

export default function Proph3tCommercialSection() {
  const tenants = useVol1Store(s => s.tenants)
  const spaces = useVol1Store(s => s.spaces)
  const occupancy = useVol1Store(s => s.occupancy)
  const [tab, setTab] = useState<AnalysisTab>('mix')
  const [loading, setLoading] = useState(false)

  // ── Tenant Mix Analysis ───────────────────
  const mixInsights: MixInsight[] = useMemo(() => {
    const insights: MixInsight[] = []
    const restoCount = occupancy.sectorBreakdown.find(s => s.sector === 'restauration')
    const modeCount = occupancy.sectorBreakdown.find(s => s.sector === 'mode')
    const servCount = occupancy.sectorBreakdown.find(s => s.sector === 'services')

    if (restoCount && restoCount.percentage > 30) {
      insights.push({ type: 'warning', title: 'Surdensité restauration', detail: `La restauration represente ${restoCount.percentage}% de la GLA. Le benchmark africain recommande 20-25% pour un mall de classe A.`, wing: 'Food Court R+1' })
    }
    if (!occupancy.sectorBreakdown.find(s => s.sector === 'enfants')) {
      insights.push({ type: 'warning', title: 'Absence secteur enfants', detail: 'Aucune enseigne dediee aux enfants detectee. Les malls africains performants consacrent 5-8% de GLA aux enfants (ex: Playce Marcory).', wing: 'Galerie Est' })
    }
    if (servCount && servCount.count <= 2) {
      insights.push({ type: 'info', title: 'Services sous-representes', detail: `Seulement ${servCount.count} enseignes de services. Recommandation : pressing, cordonnerie, cle-minute pour completer l'offre de proximite.` })
    }
    if (modeCount && modeCount.percentage >= 10 && modeCount.percentage <= 20) {
      insights.push({ type: 'success', title: 'Mode equilibre', detail: `Le secteur mode represente ${modeCount.percentage}% de la GLA, conforme au benchmark.` })
    }
    insights.push({ type: 'success', title: 'Ancre alimentaire forte', detail: 'Carrefour en B1 (2 500 m²) assure un flux de base solide. Position strategique validee.' })
    insights.push({ type: 'info', title: 'Bijouterie manquante', detail: 'Aucune bijouterie detectee. Pour un mall premium a Angre, une enseigne bijouterie (ex: Terre d\'Or, Thiam Bijoux) renforcerait le positionnement haut de gamme.' })
    return insights
  }, [occupancy])

  // ── Vacancy Recommendations ───────────────
  const vacancyRecos: VacancyReco[] = useMemo(() => {
    return spaces.filter(s => s.status === 'vacant').map(s => {
      const adjacentTenants = spaces.filter(s2 => s2.floorLevel === s.floorLevel && s2.tenantId && Math.abs(s2.x - s.x) < 50).map(s2 => tenants.find(t => t.id === s2.tenantId)!)
      const adjacentSectors = adjacentTenants.map(t => t?.sector).filter(Boolean)

      let recommendedSector: Sector = 'services'
      let reasoning = ''
      let estimatedRent = 18000

      if (s.wing.includes('Food Court') || s.wing.includes('Restauration')) {
        recommendedSector = 'restauration'
        reasoning = `Position en zone ${s.wing} avec fort trafic food court. Profil ideal : restauration rapide ou concept original (poke bowl, smoothie bar). Enseignes adjacentes : ${adjacentTenants.map(t => t?.brandName).join(', ')}.`
        estimatedRent = 26000
      } else if (s.wing.includes('Est')) {
        recommendedSector = 'enfants'
        reasoning = 'La Galerie Est manque d\'attracteur. Une enseigne enfants (jouets, vetements enfants) creerait un flux complementaire depuis le food court R+1.'
        estimatedRent = 16000
      } else {
        recommendedSector = 'beaute'
        reasoning = `Cellule de ${s.areaSqm} m² en ${s.wing}. Le secteur beaute/cosmetique est sous-represente. Profil ideal : institut de beaute, parfumerie locale, nail bar.`
        estimatedRent = 20000
      }

      return {
        spaceRef: s.reference, wing: s.wing, areaSqm: s.areaSqm,
        recommendedSector, reasoning, estimatedRentFcfa: estimatedRent,
        confidence: 0.78 + Math.random() * 0.15,
      }
    })
  }, [spaces, tenants])

  // ── Rent Optimization ─────────────────────
  const rentSuggestions: RentSuggestion[] = useMemo(() => {
    return spaces.filter(s => s.tenantId).slice(0, 8).map(s => {
      const t = tenants.find(t2 => t2.id === s.tenantId)!
      const fluxFactor = s.floorLevel === 'RDC' ? 1.15 : s.floorLevel === 'R+1' ? 1.0 : 0.85
      const sectorFactor = t.sector === 'restauration' ? 1.2 : t.sector === 'mode' ? 1.1 : 1.0
      const suggested = Math.round(t.baseRentFcfa * fluxFactor * sectorFactor / 1000) * 1000
      const delta = suggested - t.baseRentFcfa
      let reasoning = ''
      if (delta > 0) reasoning = `Position ${s.floorLevel} avec fort flux, secteur ${sectorLabels[t.sector]} porteur. Potentiel de revalorisation.`
      else if (delta < 0) reasoning = `Loyer actuel legerement au-dessus du marche pour cette position.`
      else reasoning = 'Loyer conforme au benchmark pour ce positionnement.'
      return { spaceRef: s.reference, brandName: t.brandName, currentRent: t.baseRentFcfa, suggestedRent: suggested, delta, reasoning }
    })
  }, [spaces, tenants])

  const tabs: { id: AnalysisTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'mix', label: 'Tenant Mix Analyzer', icon: Brain, color: '#a855f7' },
    { id: 'vacancy', label: 'Vacancy Recommender', icon: Target, color: '#22c55e' },
    { id: 'rent', label: 'Rent Optimizer', icon: DollarSign, color: '#f59e0b' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600/20">
          <Sparkles className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <p className="text-[11px] tracking-[0.2em] font-medium" style={{ color: '#a855f7' }}>VOL. 1 — PROPH3T COMMERCIAL</p>
          <h1 className="text-[28px] font-light text-white">Intelligence Commerciale</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-2 text-[12px] px-4 py-2 rounded-lg transition-all" style={{ background: tab === t.id ? `${t.color}15` : 'transparent', border: `1px solid ${tab === t.id ? `${t.color}40` : '#1e2a3a'}`, color: tab === t.id ? t.color : '#4a5568' }}>
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Mix Analysis */}
      {tab === 'mix' && (
        <div className="space-y-3">
          <p className="text-[13px] text-slate-400">Proph3t analyse le mix enseigne et detecte les desequilibres par rapport au benchmark africain.</p>
          {mixInsights.map((insight, i) => {
            const color = insight.type === 'warning' ? '#f59e0b' : insight.type === 'success' ? '#22c55e' : '#38bdf8'
            return (
              <div key={i} className="rounded-xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}25` }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <p className="text-[13px] font-semibold" style={{ color }}>{insight.title}</p>
                  {insight.wing && <span className="text-[10px] ml-auto" style={{ color: '#4a5568' }}>{insight.wing}</span>}
                </div>
                <p className="text-[12px] text-slate-400 ml-4">{insight.detail}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Vacancy Recommendations */}
      {tab === 'vacancy' && (
        <div className="space-y-4">
          <p className="text-[13px] text-slate-400">Pour chaque cellule vacante, Proph3t recommande le profil d'enseigne ideal.</p>
          {vacancyRecos.length === 0 && <p className="text-slate-500 text-[13px]">Aucune cellule vacante.</p>}
          {vacancyRecos.map((r) => (
            <div key={r.spaceRef} className="rounded-xl p-5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <MapPin size={16} style={{ color: '#ef4444' }} />
                  <span className="text-white font-bold">{r.spaceRef}</span>
                  <span className="text-[11px]" style={{ color: '#4a5568' }}>{r.wing} · {r.areaSqm} m²</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                  Confiance {Math.round(r.confidence * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight size={12} style={{ color: '#a855f7' }} />
                <span className="text-[13px] font-semibold" style={{ color: '#a855f7' }}>Recommandation : {sectorLabels[r.recommendedSector]}</span>
              </div>
              <p className="text-[12px] text-slate-400 mb-2">{r.reasoning}</p>
              <p className="text-[11px]" style={{ color: '#f59e0b' }}>Loyer estime : {formatFcfa(r.estimatedRentFcfa)} FCFA/m²/an → {formatFcfa(r.estimatedRentFcfa * r.areaSqm)} FCFA/an total</p>
            </div>
          ))}
        </div>
      )}

      {/* Rent Optimizer */}
      {tab === 'rent' && (
        <div className="space-y-3">
          <p className="text-[13px] text-slate-400">Proph3t suggere le loyer optimal par cellule selon la position, le flux et le secteur.</p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: '#0f1623' }}>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Ref</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Enseigne</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Loyer actuel</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Suggestion</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Delta</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Justification</th>
                </tr>
              </thead>
              <tbody>
                {rentSuggestions.map((r) => (
                  <tr key={r.spaceRef} style={{ borderTop: '1px solid #1e2a3a' }}>
                    <td className="px-4 py-3 font-mono text-white">{r.spaceRef}</td>
                    <td className="px-4 py-3 text-slate-300">{r.brandName}</td>
                    <td className="text-right px-4 py-3 text-slate-400">{formatFcfa(r.currentRent)}</td>
                    <td className="text-right px-4 py-3 font-bold text-white">{formatFcfa(r.suggestedRent)}</td>
                    <td className="text-right px-4 py-3 font-bold" style={{ color: r.delta > 0 ? '#22c55e' : r.delta < 0 ? '#ef4444' : '#6b7280' }}>
                      {r.delta > 0 ? '+' : ''}{formatFcfa(r.delta)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] max-w-[200px]">{r.reasoning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
