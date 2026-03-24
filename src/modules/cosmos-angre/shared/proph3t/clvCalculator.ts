// ═══ PROPH3T — Calculateur CLV (Customer Lifetime Value) ═══

export interface CLVResult {
  memberId: string
  memberName: string
  tier: string
  avgMonthlySpendFcfa: number
  monthlyVisits: number
  retentionRate: number
  projectedLifetimeMonths: number
  clvFcfa: number
  segmentLabel: 'champion' | 'loyal' | 'prometteur' | 'a_risque' | 'dormant'
}

export interface CLVSummary {
  totalMembers: number
  avgClvFcfa: number
  totalProjectedRevenueFcfa: number
  segmentBreakdown: { segment: string; count: number; avgClv: number }[]
  topMembers: CLVResult[]
}

export function calculateCLV(
  memberId: string,
  memberName: string,
  tier: string,
  avgMonthlySpendFcfa: number,
  monthlyVisits: number,
  churnRisk: number,
): CLVResult {
  const retentionRate = 1 - churnRisk
  // Projected lifetime in months using geometric series: 1 / (1 - retention)
  const projectedLifetimeMonths = retentionRate >= 1 ? 60 : Math.min(60, Math.round(1 / (1 - retentionRate)))
  const monthlyRevenue = avgMonthlySpendFcfa * monthlyVisits
  // Discount rate 1% monthly
  const discountRate = 0.01
  let clv = 0
  for (let m = 0; m < projectedLifetimeMonths; m++) {
    clv += (monthlyRevenue * Math.pow(retentionRate, m)) / Math.pow(1 + discountRate, m)
  }
  clv = Math.round(clv)

  let segmentLabel: CLVResult['segmentLabel'] = 'prometteur'
  if (churnRisk > 0.3) segmentLabel = 'dormant'
  else if (churnRisk > 0.15) segmentLabel = 'a_risque'
  else if (monthlyVisits >= 8 && avgMonthlySpendFcfa >= 80_000) segmentLabel = 'champion'
  else if (monthlyVisits >= 4) segmentLabel = 'loyal'

  return {
    memberId, memberName, tier,
    avgMonthlySpendFcfa, monthlyVisits, retentionRate,
    projectedLifetimeMonths, clvFcfa: clv, segmentLabel,
  }
}

export function calculateCLVSummary(results: CLVResult[]): CLVSummary {
  const totalMembers = results.length
  const totalProjectedRevenueFcfa = results.reduce((s, r) => s + r.clvFcfa, 0)
  const avgClvFcfa = totalMembers > 0 ? Math.round(totalProjectedRevenueFcfa / totalMembers) : 0

  const segmentMap = new Map<string, CLVResult[]>()
  for (const r of results) {
    const arr = segmentMap.get(r.segmentLabel) ?? []
    arr.push(r)
    segmentMap.set(r.segmentLabel, arr)
  }

  const segmentBreakdown = Array.from(segmentMap.entries()).map(([segment, members]) => ({
    segment,
    count: members.length,
    avgClv: Math.round(members.reduce((s, m) => s + m.clvFcfa, 0) / members.length),
  }))

  const topMembers = [...results].sort((a, b) => b.clvFcfa - a.clvFcfa).slice(0, 5)

  return { totalMembers, avgClvFcfa, totalProjectedRevenueFcfa, segmentBreakdown, topMembers }
}
