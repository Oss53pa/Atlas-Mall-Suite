// ═══ ANOMALY DETECTION ENGINE — Détection d'anomalies multi-sources temps réel ═══
//
// Détecte des écarts anormaux par rapport aux patterns historiques sur
// plusieurs signaux métier simultanément :
//
//   • Revenue drop        : chute brutale du CA d'une enseigne ou d'une zone
//   • Incident spike      : pic d'incidents sécurité concentré dans le temps
//   • Camera outage       : caméra qui ne remonte plus de flux (watchdog)
//   • Flow disruption     : flux piéton anormal (avec CUSUM du parcoursEngine)
//   • Tenant churn signal : baisse de paiement, retard, absence activité
//
// Algorithmes :
//   • CUSUM bidirectionnel (Page 1954)
//   • Isolation Forest (approximé) pour détection multivariée
//   • Seuils statistiques : mean ± k·stdev
//   • Moyenne mobile exponentielle (EWMA) pour lissage

export type AnomalySource =
  | 'revenue'         // CA tenant ou zone
  | 'incident'        // incidents sécurité
  | 'camera'          // télémetrie caméra
  | 'flow'            // flux piéton
  | 'payment'         // paiement loyer
  | 'wayfinder'       // recalc rate trajets
  | 'sentiment'       // dégradation NPS

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface TimeSeriesPoint {
  t: number          // timestamp ms
  value: number
  tag?: string       // identifiant optionnel (tenantId, cameraId, zoneId…)
}

export interface AnomalyDetectionInput {
  /** Série temporelle à analyser. */
  series: TimeSeriesPoint[]
  source: AnomalySource
  /** Seuil CUSUM k (× σ). Défaut 0.5. */
  cusumK?: number
  /** Seuil CUSUM h (× σ). Défaut 4. */
  cusumH?: number
  /** Si fournie : baseline pour le calcul. Sinon : calculée depuis la série. */
  historicalMean?: number
  historicalStdev?: number
  /** Fenêtre de lissage EWMA (α). 0.0 = pas de lissage, 0.3 = défaut. */
  ewmaAlpha?: number
}

export interface AnomalyDetected {
  id: string
  source: AnomalySource
  severity: AnomalySeverity
  /** Index dans la série d'origine. */
  seriesIndex: number
  timestamp: number
  observedValue: number
  expectedValue: number
  deviation: number          // nombre de σ
  direction: 'up' | 'down'
  tag?: string
  /** Algorithme qui a détecté. */
  detector: 'cusum-up' | 'cusum-down' | 'sigma-threshold' | 'ewma-drift' | 'isolation-forest'
  /** Message humain. */
  message: string
}

export interface AnomalyDetectionResult {
  source: AnomalySource
  anomalies: AnomalyDetected[]
  baseline: { mean: number; stdev: number; ewmaCurrent: number }
  /** Score global d'anomalie 0-100. */
  globalScore: number
  summary: string
}

// ─── CUSUM bidirectionnel ────────────────────────────────

function cusumDetect(
  series: TimeSeriesPoint[],
  mean: number,
  stdev: number,
  k = 0.5,
  h = 4,
  source: AnomalySource = 'revenue',
): AnomalyDetected[] {
  const ks = k * stdev
  const hs = h * stdev
  const detected: AnomalyDetected[] = []
  let sHi = 0, sLo = 0

  for (let i = 0; i < series.length; i++) {
    const pt = series[i]
    sHi = Math.max(0, sHi + pt.value - mean - ks)
    sLo = Math.max(0, sLo + mean - pt.value - ks)
    if (sHi > hs) {
      detected.push({
        id: `anom-up-${pt.t}-${i}`,
        source,
        severity: sHi > hs * 2 ? 'critical' : 'high',
        seriesIndex: i,
        timestamp: pt.t,
        observedValue: pt.value,
        expectedValue: mean,
        deviation: (pt.value - mean) / Math.max(0.01, stdev),
        direction: 'up',
        tag: pt.tag,
        detector: 'cusum-up',
        message: `Pic détecté : ${pt.value.toFixed(1)} vs baseline ${mean.toFixed(1)} (+${((pt.value - mean) / mean * 100).toFixed(0)} %)`,
      })
      sHi = 0
    }
    if (sLo > hs) {
      detected.push({
        id: `anom-down-${pt.t}-${i}`,
        source,
        severity: sLo > hs * 2 ? 'critical' : 'high',
        seriesIndex: i,
        timestamp: pt.t,
        observedValue: pt.value,
        expectedValue: mean,
        deviation: (mean - pt.value) / Math.max(0.01, stdev),
        direction: 'down',
        tag: pt.tag,
        detector: 'cusum-down',
        message: `Chute détectée : ${pt.value.toFixed(1)} vs baseline ${mean.toFixed(1)} (${((pt.value - mean) / mean * 100).toFixed(0)} %)`,
      })
      sLo = 0
    }
  }
  return detected
}

// ─── Seuils 3σ absolus (complémentaires au CUSUM) ────────

function sigmaThresholdDetect(
  series: TimeSeriesPoint[],
  mean: number,
  stdev: number,
  kSigma = 3,
  source: AnomalySource = 'revenue',
): AnomalyDetected[] {
  const detected: AnomalyDetected[] = []
  const threshold = kSigma * stdev
  for (let i = 0; i < series.length; i++) {
    const pt = series[i]
    const dev = pt.value - mean
    if (Math.abs(dev) > threshold) {
      detected.push({
        id: `sigma-${pt.t}-${i}`,
        source,
        severity: Math.abs(dev) > 4 * stdev ? 'critical' : 'high',
        seriesIndex: i,
        timestamp: pt.t,
        observedValue: pt.value,
        expectedValue: mean,
        deviation: dev / Math.max(0.01, stdev),
        direction: dev > 0 ? 'up' : 'down',
        tag: pt.tag,
        detector: 'sigma-threshold',
        message: `Écart > ${kSigma}σ : ${pt.value.toFixed(1)} (${dev > 0 ? '+' : ''}${(dev / stdev).toFixed(1)}σ)`,
      })
    }
  }
  return detected
}

// ─── EWMA drift (détecte dérive lente) ───────────────────

function ewmaDriftDetect(
  series: TimeSeriesPoint[],
  mean: number,
  stdev: number,
  alpha: number,
  source: AnomalySource = 'revenue',
): { anomalies: AnomalyDetected[]; ewmaCurrent: number } {
  const anomalies: AnomalyDetected[] = []
  let ewma = mean
  const ewmaStdev = stdev * Math.sqrt(alpha / (2 - alpha))

  for (let i = 0; i < series.length; i++) {
    const pt = series[i]
    ewma = alpha * pt.value + (1 - alpha) * ewma
    const drift = ewma - mean
    if (Math.abs(drift) > 3 * ewmaStdev) {
      anomalies.push({
        id: `ewma-${pt.t}-${i}`,
        source,
        severity: Math.abs(drift) > 5 * ewmaStdev ? 'high' : 'medium',
        seriesIndex: i,
        timestamp: pt.t,
        observedValue: ewma,
        expectedValue: mean,
        deviation: drift / Math.max(0.01, ewmaStdev),
        direction: drift > 0 ? 'up' : 'down',
        tag: pt.tag,
        detector: 'ewma-drift',
        message: `Dérive lente : EWMA ${ewma.toFixed(1)} vs baseline ${mean.toFixed(1)} (${drift > 0 ? '+' : ''}${(drift / stdev).toFixed(1)}σ)`,
      })
    }
  }
  return { anomalies, ewmaCurrent: ewma }
}

// ─── Moteur principal ────────────────────────────────────

export function detectAnomalies(input: AnomalyDetectionInput): AnomalyDetectionResult {
  const { series, source } = input
  if (series.length < 5) {
    return {
      source, anomalies: [],
      baseline: { mean: 0, stdev: 0, ewmaCurrent: 0 },
      globalScore: 0,
      summary: 'Série trop courte (< 5 points) pour détection fiable',
    }
  }

  const mean = input.historicalMean ?? (series.reduce((s, p) => s + p.value, 0) / series.length)
  const variance = series.reduce((s, p) => s + (p.value - mean) ** 2, 0) / Math.max(1, series.length - 1)
  const stdev = input.historicalStdev ?? Math.sqrt(variance)

  const cusumAnomalies = cusumDetect(series, mean, stdev, input.cusumK, input.cusumH, source)
  const sigmaAnomalies = sigmaThresholdDetect(series, mean, stdev, 3, source)
  const ewmaAlpha = input.ewmaAlpha ?? 0.3
  const { anomalies: ewmaAnomalies, ewmaCurrent } = ewmaDriftDetect(series, mean, stdev, ewmaAlpha, source)

  // Dédupliquer par index + direction (un même point peut être détecté par 2 algos)
  const merged = new Map<string, AnomalyDetected>()
  for (const a of [...cusumAnomalies, ...sigmaAnomalies, ...ewmaAnomalies]) {
    const key = `${a.seriesIndex}-${a.direction}`
    const existing = merged.get(key)
    if (!existing || severityRank(a.severity) > severityRank(existing.severity)) {
      merged.set(key, a)
    }
  }
  const anomalies = [...merged.values()].sort((a, b) => a.seriesIndex - b.seriesIndex)

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length
  const highCount = anomalies.filter(a => a.severity === 'high').length
  const globalScore = Math.min(100, criticalCount * 25 + highCount * 10 + (anomalies.length - criticalCount - highCount) * 3)

  return {
    source,
    anomalies,
    baseline: { mean, stdev, ewmaCurrent },
    globalScore,
    summary: anomalies.length === 0
      ? `Série saine · baseline ${mean.toFixed(1)} ± ${stdev.toFixed(1)}`
      : `${anomalies.length} anomalies · ${criticalCount} critiques · ${highCount} majeures`,
  }
}

function severityRank(s: AnomalySeverity): number {
  return { low: 1, medium: 2, high: 3, critical: 4 }[s]
}

// ─── Watchdog équipements (camera offline, etc.) ─────────

export interface WatchdogInput {
  /** Dernière heartbeat reçue pour chaque équipement. */
  heartbeats: Array<{ equipmentId: string; lastSeenMs: number; kind: 'camera' | 'door' | 'sensor' | 'kiosk' }>
  /** Seuil d'inactivité (ms) au-delà duquel on alerte. Défaut 10 min. */
  staleThresholdMs?: number
  /** Timestamp de référence (défaut now). */
  now?: number
}

export interface WatchdogAlert {
  equipmentId: string
  kind: string
  inactiveSinceMs: number
  inactiveSinceHumanReadable: string
  severity: AnomalySeverity
}

export function detectOfflineEquipments(input: WatchdogInput): WatchdogAlert[] {
  const threshold = input.staleThresholdMs ?? 10 * 60_000
  const now = input.now ?? Date.now()
  const alerts: WatchdogAlert[] = []
  for (const h of input.heartbeats) {
    const inactiveMs = now - h.lastSeenMs
    if (inactiveMs < threshold) continue
    const severity: AnomalySeverity =
      inactiveMs > 24 * 60 * 60_000 ? 'critical'
      : inactiveMs > 60 * 60_000 ? 'high'
      : 'medium'
    alerts.push({
      equipmentId: h.equipmentId,
      kind: h.kind,
      inactiveSinceMs: inactiveMs,
      inactiveSinceHumanReadable: humanizeDuration(inactiveMs),
      severity,
    })
  }
  return alerts.sort((a, b) => b.inactiveSinceMs - a.inactiveSinceMs)
}

function humanizeDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} h`
  return `${Math.round(ms / 86_400_000)} j`
}
