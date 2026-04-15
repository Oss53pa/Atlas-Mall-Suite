// ═══ REAL ESTATE FINANCE — WALE / NOI / Cap Rate (M12) ═══
// Métriques financières standard du retail asset management.
// Source : ICSC / RICS / MSCI conventions.

import type { Tenant } from './commercialEngine'

export interface LeaseLine {
  /** Identifiant du bail. */
  id: string
  /** Lot concerné (référence lot.id). */
  lotId: string
  /** Surface louée m². */
  areaSqm: number
  /** Date début bail (ISO). */
  startDate: string
  /** Date fin bail (ISO). */
  endDate: string
  /** Loyer annuel FCFA (base, hors charges). */
  annualRentFcfa: number
  /** Charges annuelles récupérables FCFA. */
  annualChargesFcfa?: number
  /** Tenant rattaché (optionnel). */
  tenantId?: string
}

export interface OperatingExpenses {
  /** Entretien & maintenance annuel. */
  maintenanceFcfa?: number
  /** Gestion (management fee). */
  managementFcfa?: number
  /** Assurances. */
  insuranceFcfa?: number
  /** Taxes foncières. */
  propertyTaxFcfa?: number
  /** Utilities communs (électricité parties communes...). */
  utilitiesFcfa?: number
  /** Sécurité & nettoyage. */
  securityCleaningFcfa?: number
  /** Vacance & impayés (provision). */
  vacancyProvisionFcfa?: number
  /** Autres. */
  otherFcfa?: number
}

export interface PortfolioMetrics {
  /** Gross Rental Income annuel (loyers facturés). */
  griFcfa: number
  /** Effective Rental Income (GRI − vacance − impayés). */
  eriFcfa: number
  /** Operating Expenses total. */
  opexFcfa: number
  /** Net Operating Income = ERI + charges récupérables − OPEX. */
  noiFcfa: number
  /** Weighted Average Lease Expiry en années (pondéré par loyer). */
  waleYears: number
  /** WALE pondéré par surface. */
  waleByAreaYears: number
  /** Cap rate estimé (NOI / valeur d'actif) — nécessite valuation. */
  capRatePct?: number
  /** Yield on cost (NOI / coût total) — nécessite cost basis. */
  yieldOnCostPct?: number
  /** Loyer moyen FCFA/m²/an. */
  avgRentPerSqmYear: number
  /** Nombre de baux expirant < 12 mois. */
  expiringIn12Months: number
  /** Nombre de baux expirant < 24 mois. */
  expiringIn24Months: number
  /** Concentration (part du plus gros tenant en % du GRI). */
  topTenantConcentrationPct: number
}

export interface PortfolioInput {
  leases: LeaseLine[]
  opex?: OperatingExpenses
  /** Date de valuation (défaut : aujourd'hui). */
  valuationDate?: string
  /** Valeur d'actif estimée pour cap rate. */
  assetValueFcfa?: number
  /** Coût historique pour yield on cost. */
  totalCostFcfa?: number
  /** Taux de vacance observé (0-1) pour le calcul ERI. */
  vacancyRate?: number
  tenants?: Tenant[]
}

// ─── Computations ─────────────────────────────────────────

function yearsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000)
}

function sumOpex(o: OperatingExpenses | undefined): number {
  if (!o) return 0
  return (
    (o.maintenanceFcfa ?? 0) +
    (o.managementFcfa ?? 0) +
    (o.insuranceFcfa ?? 0) +
    (o.propertyTaxFcfa ?? 0) +
    (o.utilitiesFcfa ?? 0) +
    (o.securityCleaningFcfa ?? 0) +
    (o.vacancyProvisionFcfa ?? 0) +
    (o.otherFcfa ?? 0)
  )
}

export function computePortfolioMetrics(input: PortfolioInput): PortfolioMetrics {
  const valDate = input.valuationDate ? new Date(input.valuationDate) : new Date()
  const vacancy = input.vacancyRate ?? 0.05
  const leases = input.leases

  const gri = leases.reduce((s, l) => s + l.annualRentFcfa, 0)
  const charges = leases.reduce((s, l) => s + (l.annualChargesFcfa ?? 0), 0)
  const eri = gri * (1 - vacancy)
  const opex = sumOpex(input.opex)
  const noi = eri + charges - opex

  const totalArea = leases.reduce((s, l) => s + l.areaSqm, 0)
  const avgRentPerSqmYear = totalArea > 0 ? gri / totalArea : 0

  // WALE : pondéré par loyer (norme ICSC)
  let weightedYears = 0
  let weightSum = 0
  let weightedYearsByArea = 0
  let areaSum = 0
  let expiring12 = 0
  let expiring24 = 0

  for (const l of leases) {
    const endDate = new Date(l.endDate)
    const remYears = Math.max(0, yearsBetween(valDate, endDate))
    const rentWeight = l.annualRentFcfa
    weightedYears += remYears * rentWeight
    weightSum += rentWeight
    weightedYearsByArea += remYears * l.areaSqm
    areaSum += l.areaSqm
    if (remYears <= 1) expiring12++
    if (remYears <= 2) expiring24++
  }

  const waleYears = weightSum > 0 ? weightedYears / weightSum : 0
  const waleByAreaYears = areaSum > 0 ? weightedYearsByArea / areaSum : 0

  // Concentration top tenant
  const byTenant = new Map<string, number>()
  for (const l of leases) {
    if (!l.tenantId) continue
    byTenant.set(l.tenantId, (byTenant.get(l.tenantId) ?? 0) + l.annualRentFcfa)
  }
  const topTenantRent = byTenant.size > 0 ? Math.max(...byTenant.values()) : 0
  const topTenantConcentrationPct = gri > 0 ? (topTenantRent / gri) * 100 : 0

  // Cap rate & yield on cost
  const capRatePct = input.assetValueFcfa && input.assetValueFcfa > 0
    ? (noi / input.assetValueFcfa) * 100
    : undefined
  const yieldOnCostPct = input.totalCostFcfa && input.totalCostFcfa > 0
    ? (noi / input.totalCostFcfa) * 100
    : undefined

  return {
    griFcfa: gri,
    eriFcfa: eri,
    opexFcfa: opex,
    noiFcfa: noi,
    waleYears,
    waleByAreaYears,
    capRatePct,
    yieldOnCostPct,
    avgRentPerSqmYear,
    expiringIn12Months: expiring12,
    expiringIn24Months: expiring24,
    topTenantConcentrationPct,
  }
}

// ─── Helpers de présentation ──────────────────────────────

export function formatFcfa(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)} Md FCFA`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} M FCFA`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)} k FCFA`
  return `${Math.round(n)} FCFA`
}

export function formatYears(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—'
  const y = Math.floor(n)
  const m = Math.round((n - y) * 12)
  if (y === 0) return `${m} mois`
  if (m === 0) return `${y} an${y > 1 ? 's' : ''}`
  return `${y} an${y > 1 ? 's' : ''} ${m} mois`
}
