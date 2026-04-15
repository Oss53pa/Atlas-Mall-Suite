// ═══ PROPH3T — Moteur de Recommandations & Cosmos Club ═══

import type { POI } from './types'

export type CosmosClubTier = 'decouverte' | 'privilege' | 'prestige' | 'infinite'

export interface CosmosClubMember {
  id: string
  name: string
  tier: CosmosClubTier
  pointsBalance: number
  monthlyVisits: number
  avgSpendFcfa: number
  preferredCategories: string[]
  joinDate: string
  lastVisit: string
  churnRisk: number
}

export interface Recommendation {
  id: string
  memberId: string
  type: 'offre' | 'parcours' | 'evenement' | 'upgrade'
  title: string
  description: string
  confidence: number
  expectedImpactFcfa: number
  poi?: string
}

// Pas de membres mockés : les données Cosmos Club sont à alimenter par saisie ou import.
// La fonction generateRecommendations reste utilisable sur tout CosmosClubMember fourni.

export function generateRecommendations(member: CosmosClubMember, pois: POI[]): Recommendation[] {
  const recs: Recommendation[] = []
  let idx = 0

  // Tier upgrade suggestion
  if (member.tier === 'decouverte' && member.monthlyVisits >= 2) {
    idx++
    recs.push({
      id: `rec-${member.id}-${idx}`,
      memberId: member.id,
      type: 'upgrade',
      title: 'Passer au tier Privilege',
      description: `${member.name} visite ${member.monthlyVisits}x/mois. Proposer upgrade Privilege avec -10% parking.`,
      confidence: 0.78,
      expectedImpactFcfa: member.avgSpendFcfa * 0.2,
    })
  }
  if (member.tier === 'privilege' && member.pointsBalance > 8000) {
    idx++
    recs.push({
      id: `rec-${member.id}-${idx}`,
      memberId: member.id,
      type: 'upgrade',
      title: 'Passer au tier Prestige',
      description: `${member.pointsBalance} points accumules. Offrir acces lounge Prestige.`,
      confidence: 0.82,
      expectedImpactFcfa: member.avgSpendFcfa * 0.35,
    })
  }

  // Category-based offers
  for (const cat of member.preferredCategories) {
    const matchingPois = pois.filter(p => p.type === cat).slice(0, 2)
    for (const poi of matchingPois) {
      idx++
      recs.push({
        id: `rec-${member.id}-${idx}`,
        memberId: member.id,
        type: 'offre',
        title: `Offre speciale ${poi.label}`,
        description: `Categorie preferee "${cat}". Proposer bon -15% chez ${poi.label}.`,
        confidence: 0.65 + Math.random() * 0.2,
        expectedImpactFcfa: member.avgSpendFcfa * 0.1,
        poi: poi.id,
      })
    }
  }

  // Churn prevention
  if (member.churnRisk > 0.2) {
    idx++
    recs.push({
      id: `rec-${member.id}-${idx}`,
      memberId: member.id,
      type: 'evenement',
      title: 'Invitation evenement fidelite',
      description: `Risque de churn ${Math.round(member.churnRisk * 100)}%. Envoyer invitation VIP prochaine soiree Cosmos Club.`,
      confidence: 0.7,
      expectedImpactFcfa: member.avgSpendFcfa * 0.5,
    })
  }

  return recs
}
