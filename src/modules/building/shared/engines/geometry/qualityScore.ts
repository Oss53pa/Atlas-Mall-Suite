// ═══ GEOMETRY QUALITY SCORE ═══
//
// Note un polygone dans [0, 1] selon 4 critères indépendants pondérés :
//   • orthogonalité   (25%) — proportion d'angles à 90°
//   • edges propres   (15%) — aucune arête dégénérée (longueur ≥ seuil)
//   • simple ring     (30%) — absence d'auto-intersection (cf overlapDetection)
//   • compacité       (30%) — ratio aire/périmètre² normalisé (pénalise les
//                              spikes/zigzags). Un carré vaut 1, un long
//                              rectangle tend vers 0.
//
// ⚠️ Certains types d'espaces ont une géométrie naturellement "non-parfaite" :
//   • Portes : très allongées (compactness bas) et suivent l'angle du mur
//     (orthogonality bas). Pondération adaptée via scorePolygonQualityForType.
//   • Voies / couloirs : idem, allongés par nature.
//   • Couverts végétaux / jardins : formes organiques, non-orthogonales.
// Utiliser scorePolygonQualityForType(polygon, typeKey) pour bénéficier des
// pondérations contextuelles. scorePolygonQuality(polygon) reste strict.
//
// Le score est stocké en base (cells.geometry_quality_score NUMERIC(3,2))
// et affiché dans le dashboard admin qualité.
//
// Unités : millimètres entiers (voir constraints.ts).

import type { PolygonMm } from './constraints'
import { hasSelfIntersection } from './overlapDetection'

const ORTHO_TOLERANCE_DEG = 2 // un angle à ±2° de 90° est considéré orthogonal
const MIN_EDGE_MM = 20 // arête < 2 cm = dégénérée (doigt qui tremble)

export interface QualityBreakdown {
  readonly orthogonality: number  // 0..1
  readonly closure: number        // 0..1 — renommage interne : edges non-dégénérées
  readonly simpleRing: number     // 0..1 (binaire en pratique)
  readonly compactness: number    // 0..1
}

export interface QualityResult {
  readonly score: number          // 0..1 final pondéré
  readonly breakdown: QualityBreakdown
  readonly areaMm2: number
  readonly perimeterMm: number
  readonly vertexCount: number
}

const WEIGHTS = {
  orthogonality: 0.25,
  closure: 0.15,
  simpleRing: 0.30,
  compactness: 0.30,
} as const

/**
 * Pondérations adaptées par catégorie de type. Pour les espaces dont la
 * géométrie est naturellement non-orthogonale ou non-compacte (portes
 * allongées, voies, jardins), on déporte le poids sur les critères qui
 * restent pertinents (simpleRing surtout).
 *
 * Règle : simpleRing reste discriminant PARTOUT (un polygone qui se coupe
 * lui-même est toujours invalide, quel que soit le type).
 */
const WEIGHTS_BY_CATEGORY: Record<string, typeof WEIGHTS> = {
  // Portes : allongées, orientées selon le mur. On valorise simple_ring + edges propres.
  door: {
    orthogonality: 0.05,
    closure: 0.25,
    simpleRing: 0.55,
    compactness: 0.15,
  },
  // Voies / couloirs / circulations linéaires.
  linear: {
    orthogonality: 0.15,
    closure: 0.15,
    simpleRing: 0.50,
    compactness: 0.20,
  },
  // Espaces organiques (jardins, espaces verts, terrasses courbes).
  organic: {
    orthogonality: 0.05,
    closure: 0.20,
    simpleRing: 0.55,
    compactness: 0.20,
  },
  // Défaut = WEIGHTS standard (commerces, bureaux, pièces fermées).
  default: WEIGHTS,
}

type WeightCategory = keyof typeof WEIGHTS_BY_CATEGORY

/** Mappe un type d'espace sur sa catégorie de pondération. */
function weightCategoryForType(type: string): WeightCategory {
  const t = type.toLowerCase()
  if (t.startsWith('porte_') || t === 'porte') return 'door'
  if (
    t.startsWith('voie_') ||
    t.startsWith('route_') ||
    t.startsWith('acces_site_') ||
    t === 'couloir' || t === 'couloir_secondaire' ||
    t === 'galerie' || t === 'mail' || t === 'mail_central' || t === 'mail_secondaire' ||
    t === 'circulation' || t === 'passage_pieton'
  ) return 'linear'
  if (
    t === 'jardin' || t === 'pelouse' || t === 'terrasse_restaurant' ||
    t === 'espace_vert' || t === 'massif_vegetal' || t === 'plantation' ||
    t === 'terre_plein' || t === 'alignement_arbre' || t === 'haie' ||
    t === 'rond_point' || t === 'giratoire' || t === 'rond_point_public'
  ) return 'organic'
  return 'default'
}

/**
 * Scoring adapté au type de space : portes/voies/organiques obtiennent des
 * pondérations réalistes (pas pénalisés pour leur géométrie naturelle).
 * Pour un type inconnu ou "default", équivalent à scorePolygonQuality.
 */
export function scorePolygonQualityForType(polygon: PolygonMm, type: string): QualityResult {
  const category = weightCategoryForType(type)
  return scorePolygonQualityWithWeights(polygon, WEIGHTS_BY_CATEGORY[category])
}

export function scorePolygonQuality(polygon: PolygonMm): QualityResult {
  return scorePolygonQualityWithWeights(polygon, WEIGHTS)
}

function scorePolygonQualityWithWeights(polygon: PolygonMm, weights: typeof WEIGHTS): QualityResult {
  const n = polygon.length
  if (n < 3) {
    return {
      score: 0,
      breakdown: { orthogonality: 0, closure: 0, simpleRing: 0, compactness: 0 },
      areaMm2: 0,
      perimeterMm: 0,
      vertexCount: n,
    }
  }

  const orthogonality = computeOrthogonality(polygon)
  const closure = computeClosure(polygon)
  const simpleRing = hasSelfIntersection(polygon) ? 0 : 1
  const areaMm2 = Math.abs(signedArea(polygon))
  const perimeterMm = computePerimeter(polygon)
  const compactness = computeCompactness(areaMm2, perimeterMm)

  const score =
    orthogonality * weights.orthogonality +
    closure * weights.closure +
    simpleRing * weights.simpleRing +
    compactness * weights.compactness

  return {
    score: Math.max(0, Math.min(1, score)),
    breakdown: { orthogonality, closure, simpleRing, compactness },
    areaMm2: Math.round(areaMm2),
    perimeterMm: Math.round(perimeterMm),
    vertexCount: n,
  }
}

// ─── Critères ─────────────────────────────────────────────

function computeOrthogonality(polygon: PolygonMm): number {
  const n = polygon.length
  let orthoCount = 0
  for (let i = 0; i < n; i++) {
    const prev = polygon[(i - 1 + n) % n]
    const curr = polygon[i]
    const next = polygon[(i + 1) % n]
    const ax = prev[0] - curr[0], ay = prev[1] - curr[1]
    const bx = next[0] - curr[0], by = next[1] - curr[1]
    const la = Math.hypot(ax, ay)
    const lb = Math.hypot(bx, by)
    if (la === 0 || lb === 0) continue
    const cos = (ax * bx + ay * by) / (la * lb)
    const angleDeg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
    if (Math.abs(angleDeg - 90) <= ORTHO_TOLERANCE_DEG) orthoCount++
  }
  return orthoCount / n
}

function computeClosure(polygon: PolygonMm): number {
  // On mesure la proportion d'arêtes "saines" (non-dégénérées).
  // Le ring est implicitement fermé par la représentation ; ce qui nous
  // intéresse c'est d'attraper les micro-segments parasites dus à un
  // double-clic accidentel ou un tremblement de main.
  const n = polygon.length
  let healthy = 0
  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= MIN_EDGE_MM) healthy++
  }
  return n === 0 ? 0 : healthy / n
}

function computeCompactness(areaMm2: number, perimeterMm: number): number {
  if (perimeterMm <= 0 || areaMm2 <= 0) return 0
  // Isoperimetric quotient normalisé : 4π·A / P² ∈ [0, 1] pour un cercle=1.
  // Un carré parfait donne π/4 ≈ 0.785 → on renormalise pour qu'un carré = 1.
  const q = (4 * Math.PI * areaMm2) / (perimeterMm * perimeterMm)
  const norm = q / (Math.PI / 4) // carré → 1, cercle → ~1.27 (clampé)
  return Math.max(0, Math.min(1, norm))
}

// ─── Utilitaires géométriques ─────────────────────────────

function signedArea(polygon: PolygonMm): number {
  let s = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polygon[i]
    const [x2, y2] = polygon[(i + 1) % n]
    s += x1 * y2 - x2 * y1
  }
  return s / 2
}

function computePerimeter(polygon: PolygonMm): number {
  let p = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]
    p += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return p
}
