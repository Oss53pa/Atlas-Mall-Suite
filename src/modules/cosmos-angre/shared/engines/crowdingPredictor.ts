// ═══ CROWDING PREDICTOR — Prédit surpopulation & risque piétinement ═══
//
// À partir d'un historique de flux piéton (footfall par zone x heure), prédit :
//
//   • Occupation attendue dans les N prochaines heures (par zone)
//   • Risque de surpopulation (densité pax/m² > seuil)
//   • Risque de piétinement / bousculade (densité + vitesse congestion)
//   • Recommandations : ouvrir sas supplémentaires, déployer agents, fermer zone
//
// Modèle :
//   • Lissage exponentiel (Holt-Winters simplifié) sur série horaire
//   • Pattern hebdo + saisonnier (jour/heure)
//   • Seuil de densité ISO 20382 (PMR) + retour d'expérience Mall Afrique
//
// Seuils de densité (pax / m²) :
//   • < 0.5  : confortable
//   • 0.5-1.0 : animé
//   • 1.0-2.0 : dense (attention)
//   • 2.0-3.5 : surpopulation (risque)
//   • > 3.5  : critique (évacuation)

export interface FootfallSample {
  /** ISO timestamp. */
  timestamp: string
  zoneId: string
  /** Nombre moyen de personnes simultanément présentes. */
  paxCount: number
}

export interface ZoneCapacity {
  zoneId: string
  label: string
  /** Surface utile (m²). */
  areaSqm: number
  /** Capacité max recommandée (pax). */
  maxCapacity: number
  /** Nombre de sorties d'évacuation. */
  exitsCount: number
}

export type CrowdingLevel = 'comfortable' | 'active' | 'dense' | 'overcrowded' | 'critical'

export interface CrowdingForecast {
  zoneId: string
  zoneLabel: string
  /** Horizon en heures. */
  horizonHours: number
  /** Points prédits pour chaque heure future. */
  predictions: Array<{
    timestamp: string
    expectedPax: number
    densityPaxPerSqm: number
    level: CrowdingLevel
    /** 0-1 = probabilité de dépassement capacité. */
    overflowProbability: number
  }>
  /** Peak prédit dans l'horizon. */
  peak: {
    timestamp: string
    expectedPax: number
    densityPaxPerSqm: number
    level: CrowdingLevel
  }
  /** Recommandations actionnables. */
  recommendations: string[]
}

// ─── Seuils densité ────────────────────────────────────────

const DENSITY_THRESHOLDS: Array<{ max: number; level: CrowdingLevel }> = [
  { max: 0.5, level: 'comfortable' },
  { max: 1.0, level: 'active' },
  { max: 2.0, level: 'dense' },
  { max: 3.5, level: 'overcrowded' },
  { max: Infinity, level: 'critical' },
]

function densityToLevel(density: number): CrowdingLevel {
  return DENSITY_THRESHOLDS.find(t => density <= t.max)!.level
}

// ─── Lissage Holt-Winters simplifié ────────────────────────

/** Extrait la "saison" jour-de-semaine + heure-de-journée. */
function seasonKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getDay()}-${d.getHours()}`
}

function computeSeasonalMeans(samples: FootfallSample[]): Map<string, number> {
  const buckets = new Map<string, number[]>()
  for (const s of samples) {
    const key = seasonKey(s.timestamp)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(s.paxCount)
  }
  const means = new Map<string, number>()
  for (const [key, arr] of buckets) {
    means.set(key, arr.reduce((a, b) => a + b, 0) / arr.length)
  }
  return means
}

/** Tendance récente (dernières 6 heures). */
function recentTrend(samples: FootfallSample[]): number {
  if (samples.length < 3) return 0
  const sorted = [...samples].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const recent = sorted.slice(-6)
  const n = recent.length
  const avgFirst = recent.slice(0, Math.floor(n / 2)).reduce((s, x) => s + x.paxCount, 0) / Math.floor(n / 2)
  const avgLast = recent.slice(Math.floor(n / 2)).reduce((s, x) => s + x.paxCount, 0) / Math.ceil(n / 2)
  return avgLast - avgFirst
}

// ─── Probabilité overflow (loi normale approx) ────────────

/** P(X > capacity) avec X ~ N(expected, sigma²). */
function overflowProb(expected: number, capacity: number, sigma: number): number {
  if (sigma <= 0) return expected > capacity ? 1 : 0
  const z = (capacity - expected) / sigma
  // Approximation CDF normale (Abramowitz & Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp(-z * z / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z >= 0 ? p : 1 - p
}

// ─── Recommandations ──────────────────────────────────────

function buildRecommendations(
  forecast: CrowdingForecast['predictions'],
  peak: CrowdingForecast['peak'],
  zone: ZoneCapacity,
): string[] {
  const recs: string[] = []
  if (peak.level === 'critical') {
    recs.push(`🚨 CRITIQUE : évacuer partiellement zone ${zone.label} avant ${peak.timestamp}`)
    recs.push(`Ouvrir les ${zone.exitsCount} sorties d'évacuation + sorties de secours`)
  } else if (peak.level === 'overcrowded') {
    recs.push(`⚠️ Surpopulation attendue à ${peak.timestamp} (${peak.expectedPax} pax / cap ${zone.maxCapacity})`)
    recs.push(`Déployer 2-3 agents de régulation en amont (1h avant le pic)`)
    recs.push(`Activer signalétique dynamique "zone saturée, patientez"`)
  } else if (peak.level === 'dense') {
    recs.push(`Zone dense prévue à ${peak.timestamp}. Surveillance renforcée recommandée`)
  }
  const rising = forecast.filter(p => p.overflowProbability > 0.3).length
  if (rising >= 3) {
    recs.push(`Tendance haussière sur ${rising}h : anticiper extension horaires agents`)
  }
  return recs
}

// ─── Moteur principal ─────────────────────────────────────

export function forecastCrowding(
  zone: ZoneCapacity,
  history: FootfallSample[],
  horizonHours = 6,
  startFrom?: Date,
): CrowdingForecast {
  const zoneSamples = history.filter(s => s.zoneId === zone.zoneId)
  const seasonalMeans = computeSeasonalMeans(zoneSamples)
  const trend = recentTrend(zoneSamples)
  const overallStd = zoneSamples.length > 0
    ? Math.sqrt(zoneSamples.reduce((s, x) => s + x.paxCount ** 2, 0) / zoneSamples.length -
        (zoneSamples.reduce((s, x) => s + x.paxCount, 0) / zoneSamples.length) ** 2)
    : 10

  const t0 = startFrom ?? new Date()
  const predictions: CrowdingForecast['predictions'] = []
  for (let h = 1; h <= horizonHours; h++) {
    const ts = new Date(t0.getTime() + h * 3_600_000)
    const key = seasonKey(ts.toISOString())
    const seasonal = seasonalMeans.get(key) ?? 0
    const expectedPax = Math.max(0, seasonal + trend * (1 - h / horizonHours))
    const density = expectedPax / Math.max(1, zone.areaSqm)
    const level = densityToLevel(density)
    predictions.push({
      timestamp: ts.toISOString(),
      expectedPax: Math.round(expectedPax),
      densityPaxPerSqm: Math.round(density * 100) / 100,
      level,
      overflowProbability: overflowProb(expectedPax, zone.maxCapacity, overallStd),
    })
  }

  const peakPoint = predictions.reduce((max, p) => p.expectedPax > max.expectedPax ? p : max, predictions[0])
  const peak = {
    timestamp: peakPoint.timestamp,
    expectedPax: peakPoint.expectedPax,
    densityPaxPerSqm: peakPoint.densityPaxPerSqm,
    level: peakPoint.level,
  }
  const recommendations = buildRecommendations(predictions, peak, zone)

  return {
    zoneId: zone.zoneId,
    zoneLabel: zone.label,
    horizonHours,
    predictions,
    peak,
    recommendations,
  }
}

/** Forecast batch sur toutes les zones. */
export function forecastCrowdingBatch(
  zones: ZoneCapacity[],
  history: FootfallSample[],
  horizonHours = 6,
): CrowdingForecast[] {
  return zones.map(z => forecastCrowding(z, history, horizonHours))
    .sort((a, b) => {
      const order: Record<CrowdingLevel, number> = {
        critical: 0, overcrowded: 1, dense: 2, active: 3, comfortable: 4,
      }
      return order[a.peak.level] - order[b.peak.level]
    })
}
