// ═══ VOL.1 · Ray-casting Visibilité commerciale ═══
//
// Calcule le score de visibilité de chaque local commercial depuis les points
// de flux (promenade, entrées, nœuds de décision) via ray-casting 2D.
//
// Principe :
//   - Pour chaque local (boutique), on identifie sa ligne de façade/vitrine
//   - Pour chaque observateur (échantillons sur les chemins principaux), on
//     teste s'il existe une ligne de vue directe (pas de mur, pas d'obstacle
//     autre que la vitrine elle-même) vers la façade du local
//   - Score = ratio d'observateurs visibles × densité fréquentation locale
//     (le vrai CA boost vient de la vue × passage)
//
// Paramètres :
//   - Angle max de vue efficace : 60° depuis l'axe de la vitrine
//   - Distance max visibilité : 30 m (au-delà, signalétique ne suffit pas à
//     capter le regard)
//
// Sortie : score 0..1 par local + heatmap des "points aveugles" commerciaux.

// ─── Types ─────────────────────────────────────────

export interface CommercialSpace {
  id: string
  polygon: Array<{ x: number; y: number }>
  /** Point principal de la vitrine (centre). */
  frontageCenter: { x: number; y: number }
  /** Vecteur normal sortant de la vitrine (direction de regard). */
  frontageNormal: { x: number; y: number }
  /** Longueur de façade en mètres. */
  frontageLengthM: number
}

export interface Observer {
  id: string
  x: number
  y: number
  /** Poids d'importance de cet observateur (fréquence de passage). */
  weight?: number
}

export interface Obstacle {
  x1: number; y1: number
  x2: number; y2: number
  /** L'obstacle est-il le propre polygone du local ? (on ignore). */
  ownerSpaceId?: string
}

export interface VisibilityConfig {
  /** Angle max par rapport à la normale vitrine (degrés). Défaut 60. */
  maxAngleDeg?: number
  /** Distance max visibilité (m). Défaut 30. */
  maxDistanceM?: number
  /** Poids par distance : score décroît selon (1 - d/maxDist). Défaut true. */
  weightByDistance?: boolean
}

export interface VisibilityScore {
  spaceId: string
  /** Score 0..1 normalisé. */
  score: number
  /** Nombre d'observateurs ayant ligne de vue directe. */
  visibleObservers: number
  /** Somme pondérée des contributions. */
  weightedSum: number
  /** Observateurs les mieux placés (pour diagnostic). */
  topObserverIds: string[]
}

// ─── Géométrie ─────────────────────────────────────

function segmentsIntersect(
  a1x: number, a1y: number, a2x: number, a2y: number,
  b1x: number, b1y: number, b2x: number, b2y: number,
): boolean {
  const d = (a2x - a1x) * (b2y - b1y) - (a2y - a1y) * (b2x - b1x)
  if (Math.abs(d) < 1e-9) return false
  const t = ((b1x - a1x) * (b2y - b1y) - (b1y - a1y) * (b2x - b1x)) / d
  const u = ((b1x - a1x) * (a2y - a1y) - (b1y - a1y) * (a2x - a1x)) / d
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6
}

function hasLineOfSight(
  obs: Observer, spaceId: string, target: { x: number; y: number }, obstacles: Obstacle[],
): boolean {
  for (const o of obstacles) {
    if (o.ownerSpaceId === spaceId) continue // ignore sa propre vitrine
    if (segmentsIntersect(obs.x, obs.y, target.x, target.y, o.x1, o.y1, o.x2, o.y2)) return false
  }
  return true
}

// ─── Dérive frontage depuis un polygone ───────────

/**
 * Infère la ligne de vitrine d'un espace commercial : côté le plus long et
 * le plus proche du couloir de circulation (ou par défaut le plus long).
 */
export function inferFrontage(
  polygon: Array<{ x: number; y: number }>,
  circulationPoints?: Array<{ x: number; y: number }>,
): { center: { x: number; y: number }; normal: { x: number; y: number }; lengthM: number } {
  let bestIdx = 0
  let bestScore = -Infinity
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    let proximity = 0
    if (circulationPoints && circulationPoints.length) {
      let minD = Infinity
      for (const cp of circulationPoints) {
        const d = Math.hypot(mid.x - cp.x, mid.y - cp.y)
        if (d < minD) minD = d
      }
      proximity = minD < 30 ? (30 - minD) : 0
    }

    const score = len + proximity * 0.5
    if (score > bestScore) { bestScore = score; bestIdx = i }
  }

  const a = polygon[bestIdx]
  const b = polygon[(bestIdx + 1) % polygon.length]
  const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  // Normale extérieure : perpendiculaire au segment, orientée vers l'extérieur du polygone
  const nx0 = -(b.y - a.y) / Math.max(len, 1e-6)
  const ny0 = (b.x - a.x) / Math.max(len, 1e-6)
  // Tester vers quel côté le centroïde se trouve ; la normale pointe de l'autre côté
  let cx = 0, cy = 0
  for (const p of polygon) { cx += p.x; cy += p.y }
  cx /= polygon.length; cy /= polygon.length
  const dotToCentroid = (cx - center.x) * nx0 + (cy - center.y) * ny0
  const sign = dotToCentroid > 0 ? -1 : 1
  return {
    center,
    normal: { x: nx0 * sign, y: ny0 * sign },
    lengthM: len,
  }
}

// ─── Ray-casting principal ────────────────────────

export function computeVisibility(
  spaces: CommercialSpace[],
  observers: Observer[],
  obstacles: Obstacle[],
  config: VisibilityConfig = {},
): VisibilityScore[] {
  const maxAngle = ((config.maxAngleDeg ?? 60) * Math.PI) / 180
  const maxDistance = config.maxDistanceM ?? 30
  const weightByDistance = config.weightByDistance ?? true

  const scores: VisibilityScore[] = []

  for (const s of spaces) {
    let visible = 0
    let weightedSum = 0
    let totalWeight = 0
    const contribs: Array<{ id: string; w: number }> = []

    // Target : plusieurs échantillons le long de la vitrine pour robustesse
    const samples = sampleFrontage(s, 5)

    for (const obs of observers) {
      const w = obs.weight ?? 1
      totalWeight += w

      // Teste ligne de vue vers n'importe quel échantillon de la vitrine
      let foundSample: { x: number; y: number } | null = null
      let bestDist = Infinity
      for (const sp of samples) {
        const d = Math.hypot(obs.x - sp.x, obs.y - sp.y)
        if (d > maxDistance) continue

        // Angle par rapport à la normale sortante
        const dx = obs.x - sp.x, dy = obs.y - sp.y
        const len = Math.hypot(dx, dy)
        if (len < 0.01) continue
        const cosA = (dx * s.frontageNormal.x + dy * s.frontageNormal.y) / len
        const angle = Math.acos(Math.max(-1, Math.min(1, cosA)))
        if (angle > maxAngle) continue

        if (hasLineOfSight(obs, s.id, sp, obstacles)) {
          if (d < bestDist) { bestDist = d; foundSample = sp }
        }
      }

      if (foundSample) {
        visible++
        const distFactor = weightByDistance ? 1 - bestDist / maxDistance : 1
        const contrib = w * distFactor
        weightedSum += contrib
        contribs.push({ id: obs.id, w: contrib })
      }
    }

    contribs.sort((a, b) => b.w - a.w)
    scores.push({
      spaceId: s.id,
      score: totalWeight > 0 ? weightedSum / totalWeight : 0,
      visibleObservers: visible,
      weightedSum,
      topObserverIds: contribs.slice(0, 5).map(c => c.id),
    })
  }

  return scores
}

function sampleFrontage(s: CommercialSpace, n: number): Array<{ x: number; y: number }> {
  // Distribue n points le long d'un segment centré sur frontageCenter selon
  // la tangente (perpendiculaire à la normale).
  const tx = -s.frontageNormal.y, ty = s.frontageNormal.x
  const out: Array<{ x: number; y: number }> = []
  const half = s.frontageLengthM / 2
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1 // [-1..1]
    out.push({
      x: s.frontageCenter.x + tx * half * t,
      y: s.frontageCenter.y + ty * half * t,
    })
  }
  return out
}

// ─── Heatmap visibilité (pour zone de promenade) ─

/**
 * Pour chaque cellule d'une grille couvrant le plan, compte combien de locaux
 * commerciaux sont visibles depuis le centre de cette cellule. Produit une
 * heatmap du "potentiel commercial" d'emplacement kiosques / PLV / écrans.
 */
export function visibilityHeatmap(
  spaces: CommercialSpace[],
  planBounds: { width: number; height: number },
  obstacles: Obstacle[],
  gridSizeM = 3,
  config: VisibilityConfig = {},
): {
  gridSizeM: number
  cols: number
  rows: number
  data: Float32Array
  max: number
} {
  const cols = Math.ceil(planBounds.width / gridSizeM)
  const rows = Math.ceil(planBounds.height / gridSizeM)
  const data = new Float32Array(cols * rows)
  let max = 0

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = (i + 0.5) * gridSizeM
      const cy = (j + 0.5) * gridSizeM
      const obs: Observer = { id: `cell-${i}-${j}`, x: cx, y: cy }
      let count = 0
      for (const s of spaces) {
        const samples = sampleFrontage(s, 3)
        for (const sp of samples) {
          const d = Math.hypot(cx - sp.x, cy - sp.y)
          if (d > (config.maxDistanceM ?? 30)) continue
          if (hasLineOfSight(obs, s.id, sp, obstacles)) {
            count++
            break
          }
        }
      }
      data[j * cols + i] = count
      if (count > max) max = count
    }
  }
  return { gridSizeM, cols, rows, data, max }
}

// ─── Helpers : construire obstacles depuis plan ──

export function obstaclesFromSpaces(
  spaces: Array<{ id: string; polygon: Array<{ x: number; y: number }> }>,
  walls?: Array<{ x1: number; y1: number; x2: number; y2: number }>,
): Obstacle[] {
  const out: Obstacle[] = []
  for (const s of spaces) {
    for (let i = 0; i < s.polygon.length; i++) {
      const a = s.polygon[i]
      const b = s.polygon[(i + 1) % s.polygon.length]
      out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, ownerSpaceId: s.id })
    }
  }
  if (walls) {
    for (const w of walls) {
      out.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })
    }
  }
  return out
}
