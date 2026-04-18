// ═══ VOL.4 WAYFINDER — POSITIONING ENGINE ═══
//
// Positionnement indoor par fusion de 3 sources (EKF — Extended Kalman Filter
// simplifié en 2D), conformément à la spec PROPH3T Vol.4 :
//
//   • WiFi Fingerprinting → KNN (k=5) sur radio map ; précision ±2–3 m
//   • BLE Trilatération   → 3 balises min ; précision ±1–1.5 m
//   • PDR                 → accéléromètre + gyro + magnéto ; dérive ±0.5 m/pas
//
// Poids adaptatifs selon disponibilité :
//   - BLE présent  → BLE 0.6 / WiFi 0.3 / PDR 0.1
//   - BLE absent   → WiFi 0.5 / PDR 0.5
//
// Position publiée toutes les 100 ms (10 Hz) sur un bus d'événements interne.
// En environnement navigateur/app web, ce module fonctionne en simulateur
// (aucun hardware requis). En production mobile (React Native / Capacitor),
// les trois sources seront alimentées par des plugins natifs.

// ─── Types ──────────────────────────────────────────────

export interface Position2D {
  x: number
  y: number
  /** Étage courant. */
  floorId: string
  /** Cap magnétique en degrés (0 = Nord, 90 = Est). */
  headingDeg: number
  /** Vitesse estimée (m/s). */
  speedMps: number
  /** Incertitude en mètres (1 σ). */
  accuracyM: number
  /** Timestamp ms. */
  t: number
  /** Source dominante. */
  source: 'wifi' | 'ble' | 'pdr' | 'ekf' | 'qr' | 'manual'
}

export interface RssiSample {
  apId: string
  rssi: number
}

/** Point de la radio map WiFi (collecté en phase de calibration). */
export interface RadioMapPoint {
  id: string
  x: number
  y: number
  floorId: string
  /** Vecteur RSSI observé en ce point (par AP). */
  samples: RssiSample[]
}

export interface BleBeacon {
  id: string
  x: number
  y: number
  floorId: string
  /** Puissance de référence à 1 m (dBm). */
  txPowerDbm: number
}

export interface BleSample {
  beaconId: string
  rssi: number
}

export interface ImuSample {
  /** Accélération verticale (axe Z du téléphone) — détection de pas. */
  accZ: number
  /** Cap magnétique (°). */
  headingDeg: number
  /** Timestamp ms. */
  t: number
}

// ─── WiFi Fingerprinting — KNN ───────────────────────────

/** Distance euclidienne dans l'espace RSSI (APs manquants pénalisés à -100 dBm). */
function rssiDistance(a: RssiSample[], b: RssiSample[]): number {
  const map = new Map<string, number>()
  for (const s of a) map.set(s.apId, s.rssi)
  let sum = 0
  const allIds = new Set<string>()
  for (const s of a) allIds.add(s.apId)
  for (const s of b) allIds.add(s.apId)
  for (const id of allIds) {
    const ra = map.get(id) ?? -100
    const rb = b.find(s => s.apId === id)?.rssi ?? -100
    const d = ra - rb
    sum += d * d
  }
  return Math.sqrt(sum)
}

/**
 * Estimation position WiFi par KNN (k=5 par défaut) pondéré par l'inverse
 * de la distance RSSI. Retourne null si la radio map est vide.
 */
export function estimateWifiPosition(
  radioMap: RadioMapPoint[],
  currentScan: RssiSample[],
  k = 5,
): { x: number; y: number; floorId: string; accuracyM: number } | null {
  if (radioMap.length === 0 || currentScan.length === 0) return null

  const scored = radioMap.map(pt => ({ pt, d: rssiDistance(pt.samples, currentScan) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, Math.min(k, radioMap.length))

  // Moyenne pondérée par 1/d
  let wx = 0, wy = 0, sumW = 0
  const floorVotes = new Map<string, number>()
  for (const s of scored) {
    const w = 1 / Math.max(0.1, s.d)
    wx += s.pt.x * w
    wy += s.pt.y * w
    sumW += w
    floorVotes.set(s.pt.floorId, (floorVotes.get(s.pt.floorId) ?? 0) + w)
  }
  const x = wx / sumW, y = wy / sumW
  const floorId = [...floorVotes.entries()].sort((a, b) => b[1] - a[1])[0][0]

  // Accuracy ≈ écart-type pondéré des k voisins × 2 m/m
  let variance = 0
  for (const s of scored) {
    const w = 1 / Math.max(0.1, s.d)
    variance += w * (Math.pow(s.pt.x - x, 2) + Math.pow(s.pt.y - y, 2))
  }
  const accuracyM = Math.max(2.0, Math.sqrt(variance / sumW))

  return { x, y, floorId, accuracyM }
}

// ─── BLE Trilatération ──────────────────────────────────

/** Conversion RSSI → distance (modèle log-distance, n=2 indoor). */
function rssiToDistance(rssi: number, txPowerDbm: number): number {
  return Math.pow(10, (txPowerDbm - rssi) / (10 * 2.5))
}

/**
 * Trilatération par moindres carrés linéarisés.
 * Retourne null si < 3 balises disponibles.
 */
export function estimateBlePosition(
  beacons: BleBeacon[],
  scan: BleSample[],
): { x: number; y: number; floorId: string; accuracyM: number } | null {
  const detected = scan.map(s => {
    const b = beacons.find(x => x.id === s.beaconId)
    if (!b) return null
    return { x: b.x, y: b.y, floorId: b.floorId, d: rssiToDistance(s.rssi, b.txPowerDbm) }
  }).filter(Boolean) as Array<{ x: number; y: number; floorId: string; d: number }>

  if (detected.length < 3) return null

  // Vote majoritaire pour l'étage (plus forte RSSI = plus proche = priorité)
  const floorVotes = new Map<string, number>()
  for (const b of detected) {
    floorVotes.set(b.floorId, (floorVotes.get(b.floorId) ?? 0) + 1 / Math.max(0.5, b.d))
  }
  const floorId = [...floorVotes.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const sameFloor = detected.filter(b => b.floorId === floorId)
  if (sameFloor.length < 3) return null

  // Système linéaire A·p = b (voir Fang 1990, trilateration planaire)
  // Référence = premier point
  const ref = sameFloor[0]
  const A: number[][] = []
  const bv: number[] = []
  for (let i = 1; i < sameFloor.length; i++) {
    const p = sameFloor[i]
    A.push([2 * (p.x - ref.x), 2 * (p.y - ref.y)])
    bv.push(
      ref.d * ref.d - p.d * p.d
      - (ref.x * ref.x - p.x * p.x)
      - (ref.y * ref.y - p.y * p.y),
    )
  }

  // Résolution par moindres carrés : (AᵀA)⁻¹ Aᵀ b
  const AtA = mul(transpose(A), A)
  const Atb = mulVec(transpose(A), bv)
  const inv = invert2x2(AtA)
  if (!inv) return null
  const sol = mulVec(inv, Atb)

  // Accuracy ≈ écart moyen résiduel
  let resid = 0
  for (const p of sameFloor) {
    const r = Math.hypot(sol[0] - p.x, sol[1] - p.y)
    resid += Math.abs(r - p.d)
  }
  const accuracyM = Math.max(1.0, resid / sameFloor.length)

  return { x: sol[0], y: sol[1], floorId, accuracyM }
}

// Helpers linalg
function transpose(m: number[][]): number[][] {
  const r = m.length, c = m[0]?.length ?? 0
  const t: number[][] = []
  for (let j = 0; j < c; j++) {
    t.push([])
    for (let i = 0; i < r; i++) t[j].push(m[i][j])
  }
  return t
}
function mul(a: number[][], b: number[][]): number[][] {
  const r = a.length, c = b[0].length, k = b.length
  const res: number[][] = []
  for (let i = 0; i < r; i++) {
    res.push([])
    for (let j = 0; j < c; j++) {
      let sum = 0
      for (let x = 0; x < k; x++) sum += a[i][x] * b[x][j]
      res[i].push(sum)
    }
  }
  return res
}
function mulVec(a: number[][], v: number[]): number[] {
  return a.map(row => row.reduce((s, x, i) => s + x * v[i], 0))
}
function invert2x2(m: number[][]): number[][] | null {
  const [[a, b], [c, d]] = m
  const det = a * d - b * c
  if (Math.abs(det) < 1e-9) return null
  return [[d / det, -b / det], [-c / det, a / det]]
}

// ─── Pedestrian Dead Reckoning (PDR) ─────────────────────

export interface PdrState {
  x: number
  y: number
  headingDeg: number
  /** Nb de pas détectés depuis la dernière ancre. */
  stepsSinceAnchor: number
  /** Longueur de pas estimée (m). */
  stepLengthM: number
}

/** Détecteur de pas : cherche les pics d'accélération verticale ≥ 1.2 g. */
export class StepDetector {
  private prevAcc = 9.81
  private lastStepT = 0
  private readonly minIntervalMs = 250 // évite les doubles-détections
  private readonly threshold = 11.8    // m/s² (≈ 1.2 g)

  /** Retourne true si un pas a été détecté à cet échantillon. */
  sample(imu: ImuSample): boolean {
    const isPeak = imu.accZ > this.threshold && this.prevAcc <= this.threshold
    this.prevAcc = imu.accZ
    if (isPeak && imu.t - this.lastStepT >= this.minIntervalMs) {
      this.lastStepT = imu.t
      return true
    }
    return false
  }

  reset() { this.prevAcc = 9.81; this.lastStepT = 0 }
}

/** Avance une position PDR à partir d'un pas + cap. */
export function advancePdr(state: PdrState, headingDeg: number): PdrState {
  const rad = headingDeg * Math.PI / 180
  return {
    x: state.x + state.stepLengthM * Math.sin(rad),
    y: state.y - state.stepLengthM * Math.cos(rad), // Y écran = inverse
    headingDeg,
    stepsSinceAnchor: state.stepsSinceAnchor + 1,
    stepLengthM: state.stepLengthM,
  }
}

/** Longueur de pas adaptée à la taille utilisateur (mètres). */
export function estimateStepLength(userHeightM?: number): number {
  if (!userHeightM) return 0.70
  return Math.max(0.5, Math.min(0.95, userHeightM * 0.65))
}

// ─── Fusion Kalman scalaire 2D — WiFi / BLE / PDR ─────────
//
// F-EKF (audit Axe 2) : ce qui était nommé "EKF" est en réalité un Kalman
// scalaire séparé sur x et y avec covariance diagonale. Aucun jacobien,
// aucune linéarisation : pas un EKF au sens strict. Renommé `kalmanFusion2D`.
//
// F-EKF : la double pondération `weight × K` a été supprimée. Le poids de
// chaque mesure est désormais porté par sa variance R = accuracyM², ce qui
// donne automatiquement la pondération optimale au sens Kalman.

export interface EkfState {
  /** Vecteur d'état [x, y]. */
  x: number
  y: number
  floorId: string
  headingDeg: number
  speedMps: number
  /** Matrice de covariance 2×2 (diagonale approximative). */
  px: number
  py: number
  t: number
}

export function ekfInitial(pos?: { x: number; y: number; floorId: string }): EkfState {
  return {
    x: pos?.x ?? 0,
    y: pos?.y ?? 0,
    floorId: pos?.floorId ?? 'RDC',
    headingDeg: 0,
    speedMps: 0,
    px: 100, py: 100,
    t: Date.now(),
  }
}

export interface EkfInput {
  wifi?: { x: number; y: number; floorId: string; accuracyM: number } | null
  ble?: { x: number; y: number; floorId: string; accuracyM: number } | null
  pdrDelta?: { dx: number; dy: number; headingDeg: number } | null
}

/** Fusion EKF 2D : prédiction PDR + correction par WiFi/BLE. */
export function ekfUpdate(state: EkfState, input: EkfInput, now: number = Date.now()): EkfState {
  const out: EkfState = { ...state, t: now }

  // 1. Prédiction PDR
  if (input.pdrDelta) {
    out.x += input.pdrDelta.dx
    out.y += input.pdrDelta.dy
    out.headingDeg = input.pdrDelta.headingDeg
    // Incertitude croît avec le déplacement (bruit de processus Q ≈ 0.05 m²/pas)
    out.px += 0.05
    out.py += 0.05
    const dt = Math.max(0.01, (now - state.t) / 1000)
    out.speedMps = Math.hypot(input.pdrDelta.dx, input.pdrDelta.dy) / dt
  }

  // 2. Correction observable (WiFi et/ou BLE) — gain de Kalman scalaire par axe.
  //    F-EKF : on supprime la double pondération `weight × K`. Le gain K seul
  //    réalise déjà la pondération optimale via R = accuracyM².
  const obs: Array<{ x: number; y: number; floorId: string; r: number }> = []
  if (input.ble) obs.push({ ...input.ble, r: input.ble.accuracyM ** 2 })
  if (input.wifi) obs.push({ ...input.wifi, r: input.wifi.accuracyM ** 2 })

  for (const z of obs) {
    // Gain K = P / (P + R) — pondération optimale au sens Kalman
    const kx = out.px / (out.px + z.r)
    const ky = out.py / (out.py + z.r)
    out.x += kx * (z.x - out.x)
    out.y += ky * (z.y - out.y)
    out.px *= (1 - kx)
    out.py *= (1 - ky)
    out.floorId = z.floorId // dernier observé → étage courant
  }

  return out
}

/** Alias avec le nom techniquement correct (F-EKF). À privilégier dans le nouveau code. */
export const kalmanFusion2D = ekfUpdate

// ─── Plan de déploiement des beacons BLE ────────────────

export interface BeaconPlanInput {
  /** Nœuds du graphe de navigation (décision, transit, entrée). */
  keyNodes: Array<{ id: string; x: number; y: number; floorId: string; kind: string }>
  /** Espacement cible en mètres (défaut 10 m). */
  spacingM?: number
}

export interface BeaconPlacement {
  id: string
  x: number
  y: number
  floorId: string
  /** Raison du placement. */
  rationale: 'decision-node' | 'transit' | 'entrance' | 'coverage-fill'
  /** Précision estimée (m). */
  expectedAccuracyM: number
}

/**
 * Génère un plan de placement de beacons BLE optimal :
 *   - 1 beacon à chaque transit (escalator, ascenseur, entrée)
 *   - 1 beacon à chaque intersection majeure
 *   - Des beacons de remplissage tous les `spacingM` mètres
 */
export function planBeaconDeployment(input: BeaconPlanInput): BeaconPlacement[] {
  const out: BeaconPlacement[] = []
  const spacing = input.spacingM ?? 10

  // 1. Nœuds clés : transits + entrées = prioritaires
  for (const n of input.keyNodes) {
    if (n.kind === 'transit' || n.kind === 'entrance' || n.kind === 'exit') {
      out.push({
        id: `beacon-${out.length + 1}`,
        x: n.x, y: n.y, floorId: n.floorId,
        rationale: n.kind === 'transit' ? 'transit' : 'entrance',
        expectedAccuracyM: 1.2,
      })
    }
  }

  // 2. Nœuds de décision (jonctions) → beacon si pas déjà couvert dans `spacing/2`
  for (const n of input.keyNodes) {
    if (n.kind !== 'junction') continue
    const nearby = out.some(b => b.floorId === n.floorId && Math.hypot(b.x - n.x, b.y - n.y) < spacing / 2)
    if (!nearby) {
      out.push({
        id: `beacon-${out.length + 1}`,
        x: n.x, y: n.y, floorId: n.floorId,
        rationale: 'decision-node',
        expectedAccuracyM: 1.5,
      })
    }
  }

  return out
}
