// ═══ PROPH3T — Modele Performance Locataires ═══

export interface TenantScorecard {
  tenantId: string
  tenantName: string
  category: string
  floorId: string
  scores: {
    traffic: number      // 0-100
    conversion: number   // 0-100
    revenue: number      // 0-100
    satisfaction: number  // 0-100
    loyalty: number      // 0-100
  }
  overallScore: number
  rank: number
  trend: 'up' | 'stable' | 'down'
  recommendations: string[]
}

interface TenantInput {
  id: string
  name: string
  category: string
  floorId: string
  monthlyVisitors: number
  monthlyRevenueFcfa: number
  conversionRate: number
  npsScore: number
  returnRate: number
}

export function calculateTenantScorecard(tenant: TenantInput): Omit<TenantScorecard, 'rank'> {
  // Normalize each metric to 0-100
  const traffic = Math.min(100, Math.round((tenant.monthlyVisitors / 5000) * 100))
  const conversion = Math.min(100, Math.round(tenant.conversionRate * 200)) // 50% = 100
  const revenue = Math.min(100, Math.round((tenant.monthlyRevenueFcfa / 50_000_000) * 100))
  const satisfaction = Math.min(100, Math.max(0, Math.round(tenant.npsScore)))
  const loyalty = Math.min(100, Math.round(tenant.returnRate * 100))

  const overallScore = Math.round(
    traffic * 0.2 + conversion * 0.25 + revenue * 0.25 + satisfaction * 0.15 + loyalty * 0.15
  )

  const recommendations: string[] = []
  if (traffic < 40) recommendations.push('Ameliorer la visibilite — ajouter signaletique directionnelle')
  if (conversion < 40) recommendations.push('Optimiser la vitrine et l\'offre promotionnelle')
  if (revenue < 40) recommendations.push('Revoir le positionnement prix')
  if (satisfaction < 40) recommendations.push('Enquete satisfaction + plan d\'amelioration experience')
  if (loyalty < 40) recommendations.push('Integrer offre Cosmos Club pour fideliser')

  // Trend based on simple heuristic (random for mock)
  const trendScore = traffic + conversion + revenue
  const trend: TenantScorecard['trend'] = trendScore > 180 ? 'up' : trendScore > 120 ? 'stable' : 'down'

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    category: tenant.category,
    floorId: tenant.floorId,
    scores: { traffic, conversion, revenue, satisfaction, loyalty },
    overallScore,
    trend,
    recommendations,
  }
}

export function rankTenants(tenants: TenantInput[]): TenantScorecard[] {
  const scorecards = tenants.map(t => calculateTenantScorecard(t))
  const sorted = [...scorecards].sort((a, b) => b.overallScore - a.overallScore)
  return sorted.map((sc, i) => ({ ...sc, rank: i + 1 }))
}
