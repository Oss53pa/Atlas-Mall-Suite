// ═══ COX PROPORTIONAL HAZARDS — Modèle simplifié de risque de vacance ═══
// Approche : régression logistique sur features + baseline hazard mensuelle.
// h(t|x) = h₀(t) × exp(βᵀx)   →   S(t|x) = S₀(t)^exp(βᵀx)
// Apprend les β par descente de gradient simple (pas de matrice de Fisher).

export interface SurvivalSample {
  /** Durée observée (mois). */
  durationMonths: number
  /** 1 = événement survenu (vacance), 0 = censuré. */
  event: 0 | 1
  /** Features numériques. */
  features: number[]
}

export interface CoxModel {
  /** Coefficients β (n features). */
  coefficients: number[]
  /** Hazard de base mensuelle (estimation Breslow simplifiée). */
  baselineHazardMonthly: number
  /** Concordance (C-index). */
  concordance: number
}

/** Sigmoide stable. */
function sigmoid(x: number): number {
  if (x > 0) return 1 / (1 + Math.exp(-x))
  const ex = Math.exp(x)
  return ex / (1 + ex)
}

export function fitCox(samples: SurvivalSample[], opts: { lr?: number; iter?: number } = {}): CoxModel {
  if (samples.length === 0) return { coefficients: [], baselineHazardMonthly: 0, concordance: 0 }
  const lr = opts.lr ?? 0.01
  const iter = opts.iter ?? 200
  const k = samples[0].features.length
  const beta = new Array(k).fill(0)

  // Optim : maximise log-likelihood partiel par descente de gradient (proxy)
  // On utilise une approximation : régression logistique sur P(event)
  for (let it = 0; it < iter; it++) {
    const grad = new Array(k).fill(0)
    for (const s of samples) {
      const z = s.features.reduce((sum, f, i) => sum + f * beta[i], 0)
      const p = sigmoid(z)
      const error = s.event - p
      for (let i = 0; i < k; i++) grad[i] += error * s.features[i]
    }
    for (let i = 0; i < k; i++) beta[i] += (lr / samples.length) * grad[i]
  }

  // Baseline hazard : taux moyen mensuel d'événements
  const totalMonths = samples.reduce((s, x) => s + x.durationMonths, 0)
  const events = samples.reduce((s, x) => s + x.event, 0)
  const baselineHazardMonthly = totalMonths > 0 ? events / totalMonths : 0

  // C-index : paire concordante = celui à plus haut risque échoue plus tôt
  let concordant = 0, comparable = 0
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const a = samples[i], b = samples[j]
      if (a.event !== 1 && b.event !== 1) continue
      if (a.event === 1 && b.event === 1 && a.durationMonths === b.durationMonths) continue
      const ra = a.features.reduce((s, f, ix) => s + f * beta[ix], 0)
      const rb = b.features.reduce((s, f, ix) => s + f * beta[ix], 0)
      const earlierIsA = a.durationMonths < b.durationMonths
      if ((earlierIsA && a.event === 1) || (!earlierIsA && b.event === 1)) {
        comparable++
        if ((earlierIsA && ra > rb) || (!earlierIsA && rb > ra)) concordant++
      }
    }
  }
  const concordance = comparable > 0 ? concordant / comparable : 0.5

  return { coefficients: beta, baselineHazardMonthly, concordance }
}

/** Probabilité de survie au-delà de tMonths. */
export function survivalProb(model: CoxModel, features: number[], tMonths: number): number {
  const lp = features.reduce((s, f, i) => s + f * (model.coefficients[i] ?? 0), 0)
  const cumulHazard = model.baselineHazardMonthly * tMonths * Math.exp(lp)
  return Math.exp(-cumulHazard)
}

/** Probabilité de vacance avant tMonths. */
export function vacancyProb(model: CoxModel, features: number[], tMonths: number): number {
  return 1 - survivalProb(model, features, tMonths)
}
