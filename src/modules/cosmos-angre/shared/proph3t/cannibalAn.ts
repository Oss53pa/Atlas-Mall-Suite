// ═══ PROPH3T — Analyse de Cannibalisation ═══

export interface CategoryAnalysis {
  category: string
  tenantCount: number
  totalSurfaceM2: number
  avgRentFcfaPerM2: number
  marketSharePercent: number
  cannibalizationIndex: number
  recommendation: string
}

export interface CannibalizationResult {
  tenantA: string
  tenantB: string
  category: string
  overlapPercent: number
  distanceM: number
  floorId: string
  severity: 'faible' | 'moyen' | 'eleve'
  recommendation: string
}

interface TenantInput {
  id: string
  name: string
  category: string
  floorId: string
  x: number
  y: number
  surfaceM2: number
  monthlyRentFcfa: number
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function analyzeCannibalization(tenants: TenantInput[]): CannibalizationResult[] {
  const results: CannibalizationResult[] = []

  for (let i = 0; i < tenants.length; i++) {
    for (let j = i + 1; j < tenants.length; j++) {
      const a = tenants[i]
      const b = tenants[j]

      if (a.category !== b.category) continue
      if (a.floorId !== b.floorId) continue

      const d = dist(a, b)
      if (d > 100) continue // Only flag if < 100m apart

      const overlapPercent = Math.max(0, Math.round((1 - d / 100) * 100))
      const severity: CannibalizationResult['severity'] =
        overlapPercent >= 60 ? 'eleve' : overlapPercent >= 30 ? 'moyen' : 'faible'

      const recommendation = severity === 'eleve'
        ? `Repositionner ${b.name} sur un autre niveau ou diversifier l'offre.`
        : severity === 'moyen'
        ? `Differencier les gammes entre ${a.name} et ${b.name}.`
        : `Surveiller la performance relative.`

      results.push({
        tenantA: a.name,
        tenantB: b.name,
        category: a.category,
        overlapPercent,
        distanceM: Math.round(d),
        floorId: a.floorId,
        severity,
        recommendation,
      })
    }
  }

  return results.sort((a, b) => b.overlapPercent - a.overlapPercent)
}

export function analyzeByCategoryV(tenants: TenantInput[]): CategoryAnalysis[] {
  const catMap = new Map<string, TenantInput[]>()
  for (const t of tenants) {
    const arr = catMap.get(t.category) ?? []
    arr.push(t)
    catMap.set(t.category, arr)
  }

  const totalSurface = tenants.reduce((s, t) => s + t.surfaceM2, 0)

  return Array.from(catMap.entries()).map(([category, members]) => {
    const totalSurfaceM2 = members.reduce((s, t) => s + t.surfaceM2, 0)
    const avgRent = members.length > 0
      ? Math.round(members.reduce((s, t) => s + t.monthlyRentFcfa / Math.max(t.surfaceM2, 1), 0) / members.length)
      : 0
    const marketSharePercent = totalSurface > 0 ? Math.round((totalSurfaceM2 / totalSurface) * 100) : 0

    // Cannibalization index: average pairwise proximity for same-category tenants
    let pairCount = 0
    let totalProximity = 0
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (members[i].floorId === members[j].floorId) {
          totalProximity += Math.max(0, 1 - dist(members[i], members[j]) / 100)
          pairCount++
        }
      }
    }
    const cannibalizationIndex = pairCount > 0 ? Math.round((totalProximity / pairCount) * 100) : 0

    let recommendation = 'Equilibre satisfaisant.'
    if (cannibalizationIndex > 60) recommendation = 'Fort risque de cannibalisation — repositionner ou differencier.'
    else if (cannibalizationIndex > 30) recommendation = 'Cannibalisation moderee — diversifier les gammes.'
    else if (members.length === 1) recommendation = 'Categorie sous-representee — envisager un 2e locataire.'

    return { category, tenantCount: members.length, totalSurfaceM2, avgRentFcfaPerM2: avgRent, marketSharePercent, cannibalizationIndex, recommendation }
  })
}
