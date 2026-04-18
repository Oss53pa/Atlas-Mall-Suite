// ═══ SIGNAGE VISIBILITY ENGINE ═══
//
// Modèle de lisibilité (spec PROPH3T Vol.3) :
//   - Angle de vue max 30° par rapport à l'axe normal du panneau
//   - Hauteur œil 1.60 m (ne joue que sur portée 3D, non utilisée en 2D)
//   - Distance lisibilité = hauteur lettre × 200 (règle typographique)
//   - Portée par type : suspendu plafond 15 m, mural 8 m, sol 3 m
//
// Ray-casting 2D : pour chaque nœud de décision, on trace un segment vers
// chaque panneau candidat et on teste l'intersection avec les obstacles
// (murs + polygones de boutiques). Aucune intersection = ligne de vue directe.

// ─── Types ─────────────────────────────────────────────

export type PanelMount = 'ceiling' | 'wall' | 'floor'

export interface PanelCandidate {
  id: string
  /** Position monde en mètres. */
  x: number
  y: number
  /** Type de pose (détermine la portée). */
  mount: PanelMount
  /** Hauteur de la lettre en mm (défaut 80 mm). */
  letterHeightMm?: number
  /** Orientation en degrés (0 = axe +X). Si indéfini, le panneau est omnidirectionnel. */
  orientationDeg?: number
}

/** Portée en mètres par type de pose. */
export const MOUNT_RANGE_M: Record<PanelMount, number> = {
  ceiling: 15,
  wall: 8,
  floor: 3,
}

/** Hauteur de lettre par défaut par type (mm). */
export const MOUNT_DEFAULT_LETTER_MM: Record<PanelMount, number> = {
  ceiling: 120, // gros caractères sur panneau suspendu
  wall: 80,
  floor: 50,
}

/** Angle max de vue par rapport à la normale du panneau (degrés). */
export const MAX_VIEW_ANGLE_DEG = 30

export interface Obstacle {
  /** Segment 2D représentant un mur (x1,y1)-(x2,y2). */
  x1: number; y1: number
  x2: number; y2: number
}

export interface VisibilityCheckInput {
  panel: PanelCandidate
  observerX: number
  observerY: number
  /** Segments-obstacles entre panneau et observateur. */
  obstacles: Obstacle[]
}

export interface VisibilityResult {
  visible: boolean
  distanceM: number
  /** Angle en degrés entre la normale du panneau et la ligne de vue. */
  angleDeg: number
  /** Distance de lisibilité théorique selon la taille de police. */
  readableUpToM: number
  /** Cause de non-visibilité (si visible=false). */
  reason?: 'out-of-range' | 'angle-too-wide' | 'occluded'
  /** Score 0..1 (1 = parfaitement visible au plus près). */
  score: number
}

// ─── Helpers géométriques ─────────────────────────────

/** Intersection segment-segment 2D (true si les segments se croisent strictement). */
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

/** True si le segment [x1,y1]-[x2,y2] est obstrué par au moins un obstacle. */
export function segmentOccluded(
  x1: number, y1: number, x2: number, y2: number,
  obstacles: Obstacle[],
): boolean {
  for (const o of obstacles) {
    if (segmentsIntersect(x1, y1, x2, y2, o.x1, o.y1, o.x2, o.y2)) return true
  }
  return false
}

// ─── Calcul visibilité pour un panneau ─────────────────

export function checkVisibility(input: VisibilityCheckInput): VisibilityResult {
  const { panel, observerX, observerY, obstacles } = input
  const dx = observerX - panel.x
  const dy = observerY - panel.y
  const distanceM = Math.hypot(dx, dy)

  const range = MOUNT_RANGE_M[panel.mount]
  const letterHeightMm = panel.letterHeightMm ?? MOUNT_DEFAULT_LETTER_MM[panel.mount]
  // Règle typographique : distance lisibilité [m] ≈ hauteurLettre [mm] × 0.2
  // (équivalente à hauteurLettre × 200 si on exprime la hauteur en m)
  const readableUpToM = Math.min(range, letterHeightMm * 0.2)

  if (distanceM > readableUpToM) {
    return {
      visible: false,
      distanceM,
      angleDeg: 0,
      readableUpToM,
      reason: 'out-of-range',
      score: 0,
    }
  }

  // Angle de vue
  let angleDeg = 0
  if (panel.orientationDeg !== undefined && distanceM > 0.01) {
    const normalRad = (panel.orientationDeg * Math.PI) / 180
    // Vecteur normal du panneau
    const nx = Math.cos(normalRad)
    const ny = Math.sin(normalRad)
    // Vecteur observer → panneau
    const ux = -dx / distanceM
    const uy = -dy / distanceM
    const cos = nx * ux + ny * uy
    angleDeg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI
    if (angleDeg > MAX_VIEW_ANGLE_DEG) {
      return {
        visible: false,
        distanceM,
        angleDeg,
        readableUpToM,
        reason: 'angle-too-wide',
        score: 0,
      }
    }
  }

  // Occlusion : segment panel → observer traverse-t-il un mur ?
  if (segmentOccluded(panel.x, panel.y, observerX, observerY, obstacles)) {
    return {
      visible: false,
      distanceM,
      angleDeg,
      readableUpToM,
      reason: 'occluded',
      score: 0,
    }
  }

  // Score : 1 au contact, dégradé linéaire jusqu'à readableUpToM
  // Bonus si plafond (vue plus dégagée)
  const mountBonus = panel.mount === 'ceiling' ? 1.0 : panel.mount === 'wall' ? 0.9 : 0.8
  const distScore = Math.max(0, 1 - distanceM / readableUpToM)
  const angleScore = panel.orientationDeg !== undefined
    ? Math.max(0, 1 - angleDeg / MAX_VIEW_ANGLE_DEG)
    : 1.0
  const score = distScore * angleScore * mountBonus

  return {
    visible: true,
    distanceM,
    angleDeg,
    readableUpToM,
    score,
  }
}

// ─── Matrice visibilité : quels observateurs voient quels panneaux ────

export interface VisibilityMatrix {
  /** panelId → liste des observerId qui le voient (triés par score décroissant) */
  panelToObservers: Map<string, Array<{ observerId: string; result: VisibilityResult }>>
  /** observerId → liste des panelId visibles (triés par score décroissant) */
  observerToPanels: Map<string, Array<{ panelId: string; result: VisibilityResult }>>
}

export interface Observer {
  id: string
  x: number
  y: number
}

export function computeVisibilityMatrix(
  panels: PanelCandidate[],
  observers: Observer[],
  obstacles: Obstacle[],
): VisibilityMatrix {
  const panelToObservers = new Map<string, Array<{ observerId: string; result: VisibilityResult }>>()
  const observerToPanels = new Map<string, Array<{ panelId: string; result: VisibilityResult }>>()

  for (const p of panels) panelToObservers.set(p.id, [])
  for (const o of observers) observerToPanels.set(o.id, [])

  for (const panel of panels) {
    for (const obs of observers) {
      const res = checkVisibility({
        panel,
        observerX: obs.x,
        observerY: obs.y,
        obstacles,
      })
      if (res.visible) {
        panelToObservers.get(panel.id)!.push({ observerId: obs.id, result: res })
        observerToPanels.get(obs.id)!.push({ panelId: panel.id, result: res })
      }
    }
  }

  // Tri par score décroissant
  for (const arr of panelToObservers.values()) arr.sort((a, b) => b.result.score - a.result.score)
  for (const arr of observerToPanels.values()) arr.sort((a, b) => b.result.score - a.result.score)

  return { panelToObservers, observerToPanels }
}

// ─── Construction des obstacles depuis spaces + murs ───

export function buildObstaclesFromSpaces(
  spaces: Array<{ polygon: [number, number][] }>,
  /** Murs DXF (segments). */
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>,
): Obstacle[] {
  const obstacles: Obstacle[] = []

  // Segments de mur directs
  for (const w of walls) {
    obstacles.push({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })
  }

  // Contours des boutiques (chaque côté du polygone devient un mur)
  for (const s of spaces) {
    for (let i = 0; i < s.polygon.length; i++) {
      const a = s.polygon[i]
      const b = s.polygon[(i + 1) % s.polygon.length]
      obstacles.push({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] })
    }
  }

  return obstacles
}
