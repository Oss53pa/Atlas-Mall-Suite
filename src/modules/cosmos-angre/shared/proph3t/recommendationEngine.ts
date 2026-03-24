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

export const MOCK_MEMBERS: CosmosClubMember[] = [
  {
    id: 'mb-01', name: 'Aissatou Diallo', tier: 'prestige', pointsBalance: 12_400,
    monthlyVisits: 8, avgSpendFcfa: 85_000, preferredCategories: ['restauration', 'commerce'],
    joinDate: '2025-06-15', lastVisit: '2026-03-20', churnRisk: 0.05,
  },
  {
    id: 'mb-02', name: 'Kouame Yao', tier: 'privilege', pointsBalance: 5_200,
    monthlyVisits: 4, avgSpendFcfa: 42_000, preferredCategories: ['loisirs', 'restauration'],
    joinDate: '2025-09-01', lastVisit: '2026-03-18', churnRisk: 0.12,
  },
  {
    id: 'mb-03', name: 'Fatou Bamba', tier: 'infinite', pointsBalance: 34_000,
    monthlyVisits: 12, avgSpendFcfa: 180_000, preferredCategories: ['commerce', 'hotel'],
    joinDate: '2025-03-10', lastVisit: '2026-03-22', churnRisk: 0.02,
  },
  {
    id: 'mb-04', name: 'Ibrahima Kone', tier: 'decouverte', pointsBalance: 800,
    monthlyVisits: 1, avgSpendFcfa: 15_000, preferredCategories: ['restauration'],
    joinDate: '2026-02-01', lastVisit: '2026-02-28', churnRisk: 0.45,
  },
  {
    id: 'mb-05', name: 'Marie Coulibaly', tier: 'privilege', pointsBalance: 7_800,
    monthlyVisits: 6, avgSpendFcfa: 55_000, preferredCategories: ['commerce', 'services'],
    joinDate: '2025-07-20', lastVisit: '2026-03-15', churnRisk: 0.08,
  },
]

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
