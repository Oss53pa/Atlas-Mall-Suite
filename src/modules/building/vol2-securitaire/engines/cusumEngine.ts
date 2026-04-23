// ═══ VOL.2 · CUSUM — Détection d'anomalies ═══
//
// Cumulative Sum Control Chart (Page 1954) pour détecter un changement de
// moyenne dans une série temporelle (footfall, détections capteurs, alarmes).
//
// Particulièrement adapté à la sécurité centre commercial :
//   - surveillance densité de foule vs moyenne historique (pics anormaux)
//   - détection tentative d'effraction (ouvertures porte service > normale)
//   - anomalie fréquentation (baisse soudaine → zone bloquée ?)
//
// Paramètres (référence : Montgomery 2005 "Introduction to Statistical QC") :
//   K (reference value) = δ/2 × σ     où δ est la taille de shift à détecter (σ)
//   H (decision interval) = h × σ     typiquement h=4..5 (ARL0 ≈ 370)
//
// Le moteur expose :
//   - computeCusum(series, config) : calcule C+ et C- et les flags d'alarme
//   - detectChangePoint(series)    : localise le 1er point d'alarme
//   - adaptiveCusum(stream)        : version streaming pour temps réel

// ─── Types ─────────────────────────────────────────

export interface CusumConfig {
  /** Moyenne de référence (μ₀). Si absent, calculée sur les `baselineSize` premiers points. */
  mean?: number
  /** Écart-type de référence (σ). Si absent, calculé sur baseline. */
  stddev?: number
  /** Taille de shift à détecter, en unités de σ. Défaut 1 (1σ shift). */
  delta?: number
  /** Coefficient du seuil d'alarme h. Défaut 4 (ARL0 ≈ 168, balance sensibilité/FP). */
  hCoef?: number
  /** Nombre de points pour initialiser les stats. Défaut 30. */
  baselineSize?: number
  /** Sens de détection : 'up' hausse, 'down' baisse, 'both' défaut. */
  direction?: 'up' | 'down' | 'both'
}

export interface CusumPoint {
  /** Valeur observée. */
  x: number
  /** CUSUM haut (C+). */
  sHigh: number
  /** CUSUM bas (C-). */
  sLow: number
  /** Alarme déclenchée à ce pas ? */
  alarm: boolean
  /** Type d'alarme si alarm=true. */
  alarmType?: 'up' | 'down'
}

export interface CusumResult {
  points: CusumPoint[]
  mean: number
  stddev: number
  k: number
  h: number
  /** Indices des alarmes. */
  alarmIndices: number[]
  /** Premier changement de régime détecté (si présent). */
  firstChangePointIndex: number | null
  /** Stats agrégées. */
  stats: {
    total: number
    alarmCount: number
    alarmRate: number
    maxSHigh: number
    maxSLow: number
  }
}

// ─── Helpers stats ─────────────────────────────────

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stddev(values: number[], mu?: number): number {
  if (values.length < 2) return 0
  const m = mu ?? mean(values)
  const s = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(s)
}

// ─── Pipeline CUSUM ────────────────────────────────

export function computeCusum(series: number[], config: CusumConfig = {}): CusumResult {
  const baselineSize = Math.min(config.baselineSize ?? 30, series.length)
  const baseline = series.slice(0, baselineSize)
  const mu = config.mean ?? mean(baseline)
  const sigma = Math.max(1e-6, config.stddev ?? stddev(baseline, mu))
  const delta = config.delta ?? 1
  const hCoef = config.hCoef ?? 4
  const direction = config.direction ?? 'both'

  const k = (delta / 2) * sigma
  const h = hCoef * sigma

  const points: CusumPoint[] = []
  const alarmIndices: number[] = []
  let sHigh = 0
  let sLow = 0
  let firstChange: number | null = null

  let maxSHigh = 0
  let maxSLow = 0

  for (let i = 0; i < series.length; i++) {
    const x = series[i]
    // Reset si alarme (Page-Hinkley stopping)
    if (i > 0 && points[i - 1].alarm) {
      sHigh = 0
      sLow = 0
    }
    sHigh = Math.max(0, sHigh + (x - mu) - k)
    sLow = Math.max(0, sLow + (mu - x) - k)

    if (sHigh > maxSHigh) maxSHigh = sHigh
    if (sLow > maxSLow) maxSLow = sLow

    let alarm = false
    let alarmType: 'up' | 'down' | undefined
    if ((direction === 'up' || direction === 'both') && sHigh > h) {
      alarm = true; alarmType = 'up'
    }
    if ((direction === 'down' || direction === 'both') && sLow > h) {
      alarm = true; alarmType = 'down'
    }

    if (alarm) {
      alarmIndices.push(i)
      if (firstChange === null) firstChange = i
    }

    points.push({ x, sHigh, sLow, alarm, alarmType })
  }

  return {
    points, mean: mu, stddev: sigma, k, h,
    alarmIndices,
    firstChangePointIndex: firstChange,
    stats: {
      total: series.length,
      alarmCount: alarmIndices.length,
      alarmRate: series.length ? alarmIndices.length / series.length : 0,
      maxSHigh, maxSLow,
    },
  }
}

// ─── Version streaming (temps réel, 1 point à la fois) ──

export interface StreamingCusumState {
  mean: number
  stddev: number
  k: number
  h: number
  sHigh: number
  sLow: number
  count: number
  direction: 'up' | 'down' | 'both'
}

export function createCusumStream(config: Required<Pick<CusumConfig, 'mean' | 'stddev'>> & CusumConfig): StreamingCusumState {
  const sigma = Math.max(1e-6, config.stddev)
  const delta = config.delta ?? 1
  const hCoef = config.hCoef ?? 4
  return {
    mean: config.mean,
    stddev: sigma,
    k: (delta / 2) * sigma,
    h: hCoef * sigma,
    sHigh: 0, sLow: 0,
    count: 0,
    direction: config.direction ?? 'both',
  }
}

export function updateCusumStream(state: StreamingCusumState, x: number): {
  state: StreamingCusumState
  alarm: boolean
  alarmType?: 'up' | 'down'
} {
  let sHigh = Math.max(0, state.sHigh + (x - state.mean) - state.k)
  let sLow = Math.max(0, state.sLow + (state.mean - x) - state.k)
  let alarm = false
  let alarmType: 'up' | 'down' | undefined
  if ((state.direction === 'up' || state.direction === 'both') && sHigh > state.h) {
    alarm = true; alarmType = 'up'
  }
  if ((state.direction === 'down' || state.direction === 'both') && sLow > state.h) {
    alarm = true; alarmType = 'down'
  }
  if (alarm) { sHigh = 0; sLow = 0 }
  return {
    state: { ...state, sHigh, sLow, count: state.count + 1 },
    alarm, alarmType,
  }
}

// ─── Interprétation métier ─────────────────────────

export function interpretCusum(result: CusumResult, label: string): string[] {
  const insights: string[] = []
  if (result.alarmIndices.length === 0) {
    insights.push(`« ${label} » : aucune anomalie détectée. Régime stable (μ=${result.mean.toFixed(1)}, σ=${result.stddev.toFixed(2)}).`)
    return insights
  }
  insights.push(
    `« ${label} » : ${result.alarmIndices.length} alarme(s) CUSUM détectée(s) (h = ${result.h.toFixed(2)}).`
  )
  if (result.firstChangePointIndex !== null) {
    insights.push(
      `Premier changement de régime au pas t=${result.firstChangePointIndex} — action immédiate recommandée.`
    )
  }
  const upAlarms = result.points.filter(p => p.alarmType === 'up').length
  const downAlarms = result.points.filter(p => p.alarmType === 'down').length
  if (upAlarms > 0) insights.push(`${upAlarms} alarme(s) à la hausse (≥ moyenne + ${(result.h / result.stddev).toFixed(1)}σ).`)
  if (downAlarms > 0) insights.push(`${downAlarms} alarme(s) à la baisse (≤ moyenne - ${(result.h / result.stddev).toFixed(1)}σ).`)

  // Taux d'alarme anormal
  if (result.stats.alarmRate > 0.1) {
    insights.push(`Taux d'alarme élevé (${(result.stats.alarmRate * 100).toFixed(1)} %) — considérer recalibrer μ, σ ou augmenter h.`)
  }
  return insights
}
