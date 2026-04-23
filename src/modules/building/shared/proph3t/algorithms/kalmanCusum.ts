// ═══ KALMAN 1D + CUSUM — Fusion capteurs IoT et détection d'anomalies ═══

// ─── Filtre de Kalman scalaire (1 dimension) ──────────────

export interface KalmanState {
  x: number     // estimation
  p: number     // covariance erreur
  q: number     // bruit process
  r: number     // bruit mesure
}

export function kalmanInit(x0 = 0, p0 = 1, q = 1e-3, r = 0.5): KalmanState {
  return { x: x0, p: p0, q, r }
}

export function kalmanUpdate(state: KalmanState, measurement: number): KalmanState {
  // Prediction
  const xPred = state.x
  const pPred = state.p + state.q
  // Update
  const k = pPred / (pPred + state.r)
  const x = xPred + k * (measurement - xPred)
  const p = (1 - k) * pPred
  return { ...state, x, p }
}

/** Fusion de N capteurs : moyenne pondérée par 1/variance puis Kalman global. */
export function fuseSensorsKalman(
  measurements: Array<{ value: number; variance: number }>,
  state: KalmanState,
): KalmanState {
  if (measurements.length === 0) return state
  const totalWeight = measurements.reduce((s, m) => s + 1 / Math.max(m.variance, 1e-6), 0)
  const fused = measurements.reduce((s, m) => s + m.value / Math.max(m.variance, 1e-6), 0) / totalWeight
  return kalmanUpdate(state, fused)
}

// ─── CUSUM — Cumulative Sum control chart ─────────────────

export interface CusumState {
  /** Cumul positif (détection hausse). */
  sH: number
  /** Cumul négatif (détection baisse). */
  sL: number
  /** Cible (moyenne baseline). */
  mu: number
  /** Écart-type baseline. */
  sigma: number
  /** Tolerance k = 0.5 σ par défaut (sensibilité). */
  k: number
  /** Seuil h = 5 σ (alerte). */
  h: number
}

export function cusumInit(mu: number, sigma: number, k = 0.5, h = 5): CusumState {
  return { sH: 0, sL: 0, mu, sigma, k: k * sigma, h: h * sigma }
}

export type CusumAlert = 'none' | 'increase' | 'decrease'

export function cusumStep(state: CusumState, value: number): { state: CusumState; alert: CusumAlert } {
  const dev = value - state.mu
  const sH = Math.max(0, state.sH + dev - state.k)
  const sL = Math.max(0, state.sL - dev - state.k)
  let alert: CusumAlert = 'none'
  let nextSH = sH, nextSL = sL
  if (sH > state.h) { alert = 'increase'; nextSH = 0 }   // reset après alerte
  else if (sL > state.h) { alert = 'decrease'; nextSL = 0 }
  return {
    state: { ...state, sH: nextSH, sL: nextSL },
    alert,
  }
}

/** Pipeline Kalman → CUSUM : nettoie le signal puis détecte anomalies. */
export interface PipelineState {
  kalman: KalmanState
  cusum: CusumState
}

export function processSignal(
  state: PipelineState,
  rawMeasurement: number,
): { state: PipelineState; smoothed: number; alert: CusumAlert } {
  const newKalman = kalmanUpdate(state.kalman, rawMeasurement)
  const cusumStepRes = cusumStep(state.cusum, newKalman.x)
  return {
    state: { kalman: newKalman, cusum: cusumStepRes.state },
    smoothed: newKalman.x,
    alert: cusumStepRes.alert,
  }
}
