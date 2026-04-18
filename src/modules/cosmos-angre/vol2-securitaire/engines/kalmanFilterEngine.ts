// ═══ VOL.2 · Kalman Filter — suivi & lissage temps réel ═══
//
// Implémentations : Kalman scalaire (fréquentation lissée), Kalman 2D position
// (suivi caméra / agent), Extended Kalman (EKF) pour systèmes non-linéaires.
//
// Usages Vol.2 :
//   - Lissage du comptage visiteurs en temps réel (capteurs bruités)
//   - Suivi de position d'un agent de sécurité via BLE beacons (2D)
//   - Prédiction à 10s / 30s du niveau d'occupation par zone
//
// Référence : Kalman 1960 "A new approach to linear filtering and prediction
// problems", Welch & Bishop "An Introduction to the Kalman Filter" (2006).

// ─── 1D Kalman (scalaire) ─────────────────────────

export interface Kalman1D {
  x: number     // estimé
  p: number     // variance
  q: number     // bruit de process
  r: number     // bruit de mesure
}

export function kalman1DInit(initialX: number, initialP = 1, q = 0.01, r = 1): Kalman1D {
  return { x: initialX, p: initialP, q, r }
}

export function kalman1DUpdate(state: Kalman1D, measurement: number): Kalman1D {
  // Prédiction
  const xPred = state.x
  const pPred = state.p + state.q
  // Mise à jour
  const K = pPred / (pPred + state.r)
  const x = xPred + K * (measurement - xPred)
  const p = (1 - K) * pPred
  return { ...state, x, p }
}

// ─── 2D Kalman (position + vitesse) ──────────────
//
// État : [x, y, vx, vy]ᵀ
// Modèle : position linéaire + vitesse constante (acc = bruit)
// Matrice F (transition) dépend de dt :
//   F = [[1,0,dt,0],[0,1,0,dt],[0,0,1,0],[0,0,0,1]]
// H (mesure x,y seulement) = [[1,0,0,0],[0,1,0,0]]

export interface Kalman2DState {
  x: number; y: number
  vx: number; vy: number
  P: number[][]  // 4x4 covariance
}

export interface Kalman2DParams {
  q: number  // bruit de process (accélération)
  r: number  // bruit de mesure (position)
}

export function kalman2DInit(
  x0: number, y0: number, params: Kalman2DParams,
): { state: Kalman2DState; params: Kalman2DParams } {
  return {
    state: {
      x: x0, y: y0, vx: 0, vy: 0,
      P: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 10, 0],
        [0, 0, 0, 10],
      ],
    },
    params,
  }
}

function mat4x4Identity(): number[][] {
  return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
}

function matMul4(a: number[][], b: number[][]): number[][] {
  const n = 4
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0
      for (let k = 0; k < n; k++) s += a[i][k] * b[k][j]
      out[i][j] = s
    }
  }
  return out
}

function mat4Transpose(a: number[][]): number[][] {
  const n = 4
  const out: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      out[i][j] = a[j][i]
  return out
}

function matMul4Vec(a: number[][], v: number[]): number[] {
  const out = new Array(4).fill(0)
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      out[i] += a[i][j] * v[j]
  return out
}

export function kalman2DPredict(
  state: Kalman2DState, params: Kalman2DParams, dt: number,
): Kalman2DState {
  // x' = F x
  const F = [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]
  const xVec = [state.x, state.y, state.vx, state.vy]
  const xNew = matMul4Vec(F, xVec)

  // P' = F P Fᵀ + Q
  const FP = matMul4(F, state.P)
  const FPFt = matMul4(FP, mat4Transpose(F))

  // Q (bruit process : accélération)
  const q = params.q
  const dt2 = dt * dt
  const dt3 = dt2 * dt / 2
  const dt4 = dt2 * dt2 / 4
  const Q = [
    [dt4 * q, 0, dt3 * q, 0],
    [0, dt4 * q, 0, dt3 * q],
    [dt3 * q, 0, dt2 * q, 0],
    [0, dt3 * q, 0, dt2 * q],
  ]

  const P = Array.from({ length: 4 }, (_, i) =>
    new Array(4).fill(0).map((_, j) => FPFt[i][j] + Q[i][j])
  )

  return { x: xNew[0], y: xNew[1], vx: xNew[2], vy: xNew[3], P }
}

export function kalman2DUpdate(
  state: Kalman2DState, params: Kalman2DParams, measX: number, measY: number,
): Kalman2DState {
  // Mesure : z = [measX, measY]
  // Innovation : y = z - H x
  const innX = measX - state.x
  const innY = measY - state.y

  // S = H P Hᵀ + R (2x2)
  const r = params.r
  const sXX = state.P[0][0] + r
  const sYY = state.P[1][1] + r
  const sXY = state.P[0][1]
  const sYX = state.P[1][0]
  // Inversion 2x2
  const det = sXX * sYY - sXY * sYX
  if (Math.abs(det) < 1e-12) return state
  const sInv00 = sYY / det
  const sInv01 = -sXY / det
  const sInv10 = -sYX / det
  const sInv11 = sXX / det

  // K = P Hᵀ S⁻¹  (K est 4x2)
  const K: number[][] = []
  for (let i = 0; i < 4; i++) {
    const a = state.P[i][0], b = state.P[i][1]
    K.push([a * sInv00 + b * sInv10, a * sInv01 + b * sInv11])
  }

  // x = x + K y
  const x = state.x + K[0][0] * innX + K[0][1] * innY
  const y = state.y + K[1][0] * innX + K[1][1] * innY
  const vx = state.vx + K[2][0] * innX + K[2][1] * innY
  const vy = state.vy + K[3][0] * innX + K[3][1] * innY

  // P = (I - K H) P
  const KH: number[][] = Array.from({ length: 4 }, () => new Array(4).fill(0))
  for (let i = 0; i < 4; i++) {
    KH[i][0] = K[i][0]
    KH[i][1] = K[i][1]
  }
  const I = mat4x4Identity()
  const IminusKH: number[][] = Array.from({ length: 4 }, (_, i) =>
    new Array(4).fill(0).map((_, j) => I[i][j] - KH[i][j])
  )
  const P = matMul4(IminusKH, state.P)

  return { x, y, vx, vy, P }
}

// ─── Application : footfall lisse + prédiction ──

export interface FootfallFilterInput {
  measurements: Array<{ t: number; count: number }>
  /** Horizon de prédiction en secondes après dernier point. */
  predictSec?: number
  q?: number
  r?: number
}

export interface FootfallFilterResult {
  smoothed: Array<{ t: number; count: number; variance: number }>
  prediction?: { t: number; count: number; variance: number }
}

export function filterFootfall(input: FootfallFilterInput): FootfallFilterResult {
  const { measurements, predictSec = 30 } = input
  if (measurements.length === 0) return { smoothed: [] }
  let state = kalman1DInit(measurements[0].count, 10, input.q ?? 0.5, input.r ?? 5)
  const smoothed: FootfallFilterResult['smoothed'] = []
  for (const m of measurements) {
    state = kalman1DUpdate(state, m.count)
    smoothed.push({ t: m.t, count: state.x, variance: state.p })
  }
  // Prédiction = état actuel maintenu (car modèle scalaire sans vitesse).
  // Pour un modèle avec drift, utiliser Kalman 2D avec vx/vy.
  const last = measurements[measurements.length - 1]
  return {
    smoothed,
    prediction: {
      t: last.t + predictSec,
      count: state.x,
      variance: state.p + (input.q ?? 0.5) * predictSec,
    },
  }
}
