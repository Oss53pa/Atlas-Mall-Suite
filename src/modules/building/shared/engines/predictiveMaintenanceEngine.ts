// ═══ PREDICTIVE MAINTENANCE ENGINE — Weibull + MTBF équipement ═══
//
// Pour chaque équipement du mall (caméra, escalator, ascenseur, porte
// automatique, éclairage LED…), prédit :
//
//   • Probabilité de panne dans les N prochains jours
//   • Date estimée de prochaine panne (P50, P90)
//   • Recommandation : intervenir maintenant / surveillance / attendre
//   • Coût d'opportunité (panne imprévue × 3 vs maintenance préventive)
//
// Algorithme :
//   • Loi de Weibull (distribution survival de l'industrie équipement)
//     F(t) = 1 - exp(-(t/η)^β)  avec η = scale, β = shape
//   • MTBF (Mean Time Between Failures) calibré par type + marque
//   • Dégradation par usage (intensité d'utilisation × 1.5 si haute)

export type EquipmentKind =
  | 'camera'        // caméra CCTV
  | 'escalator'     // escalator/tapis roulant
  | 'elevator'      // ascenseur
  | 'door-auto'     // porte automatique coulissante
  | 'door-access'   // porte avec badge
  | 'led-panel'     // panneau LED DOOH
  | 'kiosk'         // borne interactive
  | 'hvac'          // climatisation / VMC
  | 'fire-door'     // porte anti-panique
  | 'generator'     // groupe électrogène
  | 'other'

/** Paramètres Weibull par type (MTBF en jours, shape β). Valeurs industrie. */
export const WEIBULL_PARAMS: Record<EquipmentKind, { etaDays: number; beta: number; avgRepairCostFcfa: number }> = {
  camera:       { etaDays: 2_920, beta: 1.2, avgRepairCostFcfa:   280_000 }, // ~8 ans
  escalator:    { etaDays: 1_825, beta: 2.5, avgRepairCostFcfa: 3_500_000 }, // ~5 ans
  elevator:     { etaDays: 2_555, beta: 2.2, avgRepairCostFcfa: 4_200_000 }, // ~7 ans
  'door-auto':  { etaDays: 1_460, beta: 1.8, avgRepairCostFcfa:   850_000 }, // ~4 ans
  'door-access':{ etaDays: 2_555, beta: 1.5, avgRepairCostFcfa:   420_000 }, // ~7 ans
  'led-panel':  { etaDays: 1_825, beta: 2.0, avgRepairCostFcfa: 1_200_000 }, // ~5 ans
  kiosk:        { etaDays: 1_460, beta: 1.6, avgRepairCostFcfa:   650_000 }, // ~4 ans
  hvac:         { etaDays: 2_190, beta: 2.3, avgRepairCostFcfa: 2_800_000 }, // ~6 ans
  'fire-door':  { etaDays: 3_285, beta: 1.4, avgRepairCostFcfa:   380_000 }, // ~9 ans (peu utilisé)
  generator:    { etaDays: 2_555, beta: 2.8, avgRepairCostFcfa: 5_800_000 }, // ~7 ans
  other:        { etaDays: 1_825, beta: 1.5, avgRepairCostFcfa:   500_000 },
}

export interface Equipment {
  id: string
  kind: EquipmentKind
  label: string
  /** Date d'installation (ISO). */
  installedAt: string
  /** Dernière maintenance preventive (ISO), si connue. */
  lastMaintenanceAt?: string
  /** Usage ratio 0-1 (1 = usage 24/7 intense). */
  usageIntensity?: number
  /** Nb pannes passées observées. */
  pastFailures?: number
  /** Indice de criticité 0-100 (100 = sortie secours, critique). */
  criticalityScore?: number
}

export interface MaintenanceForecast {
  equipmentId: string
  kind: EquipmentKind
  label: string
  ageDays: number
  /** Probabilité de panne dans 30 / 90 / 180 j. */
  failureProb30d: number
  failureProb90d: number
  failureProb180d: number
  /** P50 : date médiane de prochaine panne. */
  p50FailureDate: string
  /** P90 : 90% des pannes avant cette date. */
  p90FailureDate: string
  /** Recommandation. */
  recommendation: 'act-now' | 'schedule-soon' | 'monitor' | 'no-action'
  rationale: string
  /** Coût maintenance préventive estimé. */
  preventiveCostFcfa: number
  /** Coût panne imprévue (× 3). */
  unplannedFailureCostFcfa: number
  /** Économie potentielle. */
  expectedSavingsFcfa: number
}

// ─── CDF Weibull : P(T ≤ t) ───────────────────────────────

function weibullCdf(t: number, eta: number, beta: number): number {
  if (t <= 0) return 0
  return 1 - Math.exp(-Math.pow(t / eta, beta))
}

/** Quantile Weibull : t tel que F(t) = p. */
function weibullQuantile(p: number, eta: number, beta: number): number {
  const pClamped = Math.min(0.9999, Math.max(0.0001, p))
  return eta * Math.pow(-Math.log(1 - pClamped), 1 / beta)
}

// ─── Ajustement dynamique de η selon l'usage observé ─────

function adjustedEta(
  baseEta: number,
  usageIntensity = 0.5,
  pastFailures = 0,
): number {
  // Usage intense → usure 1.5× plus rapide
  const usageFactor = 1 - 0.3 * (usageIntensity - 0.5)
  // Pannes passées → équipement fragile (MTBF réduit)
  const historyFactor = Math.max(0.5, 1 - 0.15 * pastFailures)
  return baseEta * usageFactor * historyFactor
}

// ─── Moteur principal ────────────────────────────────────

export function forecastMaintenance(equipment: Equipment, now: Date = new Date()): MaintenanceForecast {
  const installed = new Date(equipment.installedAt).getTime()
  const nowMs = now.getTime()
  // L'âge effectif = temps depuis dernière maintenance si récente, sinon installation
  const referenceMs = equipment.lastMaintenanceAt
    ? Math.max(installed, new Date(equipment.lastMaintenanceAt).getTime())
    : installed
  const ageDays = Math.max(1, (nowMs - referenceMs) / 86_400_000)

  const params = WEIBULL_PARAMS[equipment.kind]
  const eta = adjustedEta(params.etaDays, equipment.usageIntensity, equipment.pastFailures)
  const beta = params.beta

  // Probabilités conditionnelles : P(panne avant t+Δ | pas encore en panne à t)
  const survAge = 1 - weibullCdf(ageDays, eta, beta)
  const survAge30 = 1 - weibullCdf(ageDays + 30, eta, beta)
  const survAge90 = 1 - weibullCdf(ageDays + 90, eta, beta)
  const survAge180 = 1 - weibullCdf(ageDays + 180, eta, beta)

  const failureProb30d = Math.max(0, (survAge - survAge30) / survAge)
  const failureProb90d = Math.max(0, (survAge - survAge90) / survAge)
  const failureProb180d = Math.max(0, (survAge - survAge180) / survAge)

  // Quantiles (dates de panne)
  const p50Days = weibullQuantile(0.5, eta, beta)
  const p90Days = weibullQuantile(0.9, eta, beta)
  const p50Date = new Date(referenceMs + p50Days * 86_400_000)
  const p90Date = new Date(referenceMs + p90Days * 86_400_000)

  // Coûts
  const criticality = equipment.criticalityScore ?? 50
  const preventiveCostFcfa = params.avgRepairCostFcfa
  const unplannedFailureCostFcfa = Math.round(params.avgRepairCostFcfa * (1.8 + criticality / 100 * 1.5))

  // Recommandation
  let recommendation: MaintenanceForecast['recommendation']
  let rationale: string
  if (failureProb30d > 0.15) {
    recommendation = 'act-now'
    rationale = `Probabilité de panne > 15 % dans 30 j (${(failureProb30d * 100).toFixed(0)} %). Intervention préventive immédiate évite un surcoût ${((unplannedFailureCostFcfa - preventiveCostFcfa) / 1000).toFixed(0)}k FCFA.`
  } else if (failureProb90d > 0.25) {
    recommendation = 'schedule-soon'
    rationale = `Probabilité de panne ${(failureProb90d * 100).toFixed(0)} % dans 90 j. Planifier intervention dans les 30-60 j.`
  } else if (failureProb180d > 0.3 || criticality > 75) {
    recommendation = 'monitor'
    rationale = `Surveillance recommandée (criticité ${criticality}, P180 = ${(failureProb180d * 100).toFixed(0)} %). Inspection visuelle bimestrielle.`
  } else {
    recommendation = 'no-action'
    rationale = `Équipement en bon état. Prochaine maintenance planifiée : ${p50Date.toLocaleDateString('fr-FR')}.`
  }

  const expectedSavings = Math.round(
    failureProb90d * (unplannedFailureCostFcfa - preventiveCostFcfa),
  )

  return {
    equipmentId: equipment.id,
    kind: equipment.kind,
    label: equipment.label,
    ageDays: Math.round(ageDays),
    failureProb30d, failureProb90d, failureProb180d,
    p50FailureDate: p50Date.toISOString(),
    p90FailureDate: p90Date.toISOString(),
    recommendation,
    rationale,
    preventiveCostFcfa,
    unplannedFailureCostFcfa,
    expectedSavingsFcfa: expectedSavings,
  }
}

/** Forecast batch avec priorisation. */
export function forecastMaintenanceBatch(
  equipments: Equipment[],
  now?: Date,
): {
  forecasts: MaintenanceForecast[]
  actNowCount: number
  totalExpectedSavings: number
  totalPreventiveBudget: number
} {
  const forecasts = equipments.map(e => forecastMaintenance(e, now))
    .sort((a, b) => {
      // Tri : act-now > schedule-soon > monitor > no-action, puis par criticité/prob
      const rank = (r: MaintenanceForecast['recommendation']) =>
        r === 'act-now' ? 4 : r === 'schedule-soon' ? 3 : r === 'monitor' ? 2 : 1
      const dr = rank(b.recommendation) - rank(a.recommendation)
      if (dr !== 0) return dr
      return b.failureProb90d - a.failureProb90d
    })

  return {
    forecasts,
    actNowCount: forecasts.filter(f => f.recommendation === 'act-now').length,
    totalExpectedSavings: forecasts.reduce((s, f) => s + f.expectedSavingsFcfa, 0),
    totalPreventiveBudget: forecasts
      .filter(f => f.recommendation === 'act-now' || f.recommendation === 'schedule-soon')
      .reduce((s, f) => s + f.preventiveCostFcfa, 0),
  }
}
