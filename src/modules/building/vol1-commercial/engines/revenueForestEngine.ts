// ═══ VOL.1 · Revenue Forest — Prédiction CA / m² ═══
//
// Implémentation d'un gradient-boosted decision tree régressionnel
// (inspiration XGBoost) pour prédire le chiffre d'affaires annuel d'un
// local commercial à partir de ses caractéristiques.
//
// Features utilisées (14) :
//   01. surface_sqm (m²)
//   02. category (one-hot : mode/resto/services/loisirs/food/beauté/enfants)
//   03. floor_level (0=RDC, 1=R+1, -1=sous-sol)
//   04. distance_to_entrance (m)
//   05. distance_to_anchor (m)
//   06. distance_to_competitors (m)
//   07. visibility_score (0..1, ray-casting)
//   08. frontage_length (m, façade vitrine)
//   09. footfall_score (0..1, ABM Vol.3)
//   10. neighborhood_diversity (index Shannon mix local)
//   11. access_pmr (0/1)
//   12. corner_location (0/1, bonus angle)
//   13. elevator_proximity_m
//   14. parking_proximity_m
//
// Pas de dépendance externe : on code un "mini-XGBoost" lisible (CART +
// gradient boosting régression, L2 loss). Adapté à quelques milliers
// d'observations, calibré avec valeurs benchmark Afrique subsaharienne.
//
// Référence : Chen & Guestrin 2016 "XGBoost: A Scalable Tree Boosting System"
// + calibration empirique The Mall.

import { mulberry32 } from '../../shared/utils/prng'

// ─── Types ─────────────────────────────────────────

export type TenantCategory =
  | 'mode' | 'restauration' | 'services' | 'loisirs'
  | 'alimentaire' | 'beaute' | 'enfants' | 'autre'

export const TENANT_CATEGORIES: TenantCategory[] = [
  'mode', 'restauration', 'services', 'loisirs',
  'alimentaire', 'beaute', 'enfants', 'autre',
]

export interface LocalFeatures {
  surfaceSqm: number
  category: TenantCategory
  floorLevel: number           // -1, 0, 1, 2
  distanceToEntranceM: number
  distanceToAnchorM: number
  distanceToCompetitorsM: number
  visibilityScore: number      // 0..1
  frontageLengthM: number
  footfallScore: number        // 0..1
  neighborhoodDiversity: number // 0..1 (Shannon normalisé)
  accessPmr: 0 | 1
  cornerLocation: 0 | 1
  elevatorProximityM: number
  parkingProximityM: number
}

export interface Prediction {
  /** CA annuel prédit en FCFA. */
  revenuePerYearFcfa: number
  /** CA / m² annuel. */
  revenuePerSqmFcfa: number
  /** Intervalle de confiance 80% (basé sur variance des arbres). */
  ci80Low: number
  ci80High: number
  /** Top 3 features contributives. */
  topContributors: Array<{ feature: string; gain: number }>
}

// ─── Feature encoding ──────────────────────────

function encode(f: LocalFeatures): number[] {
  const catOneHot = TENANT_CATEGORIES.map(c => f.category === c ? 1 : 0)
  return [
    f.surfaceSqm,
    ...catOneHot,
    f.floorLevel,
    f.distanceToEntranceM,
    f.distanceToAnchorM,
    f.distanceToCompetitorsM,
    f.visibilityScore,
    f.frontageLengthM,
    f.footfallScore,
    f.neighborhoodDiversity,
    f.accessPmr,
    f.cornerLocation,
    f.elevatorProximityM,
    f.parkingProximityM,
  ]
}

const FEATURE_NAMES = [
  'surfaceSqm',
  ...TENANT_CATEGORIES.map(c => `cat_${c}`),
  'floorLevel', 'distanceEntranceM', 'distanceAnchorM', 'distanceCompetitorsM',
  'visibilityScore', 'frontageLengthM', 'footfallScore', 'neighborhoodDiversity',
  'accessPmr', 'cornerLocation', 'elevatorProximityM', 'parkingProximityM',
]

// ─── Arbre de décision régression ──────────────

interface TreeNode {
  featureIdx?: number
  threshold?: number
  value?: number
  left?: TreeNode
  right?: TreeNode
  gain?: number
}

function mse(values: number[]): number {
  if (values.length === 0) return 0
  const m = values.reduce((a, b) => a + b, 0) / values.length
  return values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length
}

function splitBestFeature(
  X: number[][], y: number[], features: number[], minSplit: number,
): { featureIdx: number; threshold: number; gain: number } | null {
  let bestGain = 0
  let bestFeature = -1
  let bestThreshold = 0
  const parentMSE = mse(y)

  for (const fi of features) {
    const values = X.map(row => row[fi])
    const sorted = Array.from(new Set(values)).sort((a, b) => a - b)
    for (let i = 0; i < sorted.length - 1; i++) {
      const th = (sorted[i] + sorted[i + 1]) / 2
      const leftY: number[] = [], rightY: number[] = []
      for (let k = 0; k < X.length; k++) {
        if (X[k][fi] <= th) leftY.push(y[k])
        else rightY.push(y[k])
      }
      if (leftY.length < minSplit || rightY.length < minSplit) continue
      const gain = parentMSE - (leftY.length * mse(leftY) + rightY.length * mse(rightY)) / y.length
      if (gain > bestGain) {
        bestGain = gain
        bestFeature = fi
        bestThreshold = th
      }
    }
  }
  if (bestFeature < 0) return null
  return { featureIdx: bestFeature, threshold: bestThreshold, gain: bestGain }
}

function buildTree(
  X: number[][], y: number[], depth: number, maxDepth: number, minSplit: number,
): TreeNode {
  if (depth >= maxDepth || y.length < minSplit * 2) {
    return { value: y.reduce((a, b) => a + b, 0) / Math.max(1, y.length) }
  }
  const features = Array.from({ length: X[0].length }, (_, i) => i)
  const split = splitBestFeature(X, y, features, minSplit)
  if (!split) {
    return { value: y.reduce((a, b) => a + b, 0) / Math.max(1, y.length) }
  }
  const leftX: number[][] = [], leftY: number[] = []
  const rightX: number[][] = [], rightY: number[] = []
  for (let k = 0; k < X.length; k++) {
    if (X[k][split.featureIdx] <= split.threshold) { leftX.push(X[k]); leftY.push(y[k]) }
    else { rightX.push(X[k]); rightY.push(y[k]) }
  }
  return {
    featureIdx: split.featureIdx,
    threshold: split.threshold,
    gain: split.gain,
    left: buildTree(leftX, leftY, depth + 1, maxDepth, minSplit),
    right: buildTree(rightX, rightY, depth + 1, maxDepth, minSplit),
  }
}

function predictTree(tree: TreeNode, x: number[]): number {
  if (tree.value !== undefined) return tree.value
  if (tree.featureIdx === undefined) return 0
  const goLeft = x[tree.featureIdx] <= (tree.threshold ?? 0)
  return predictTree(goLeft ? tree.left! : tree.right!, x)
}

function featureGains(tree: TreeNode, gains: number[]): void {
  if (tree.featureIdx !== undefined && tree.gain !== undefined) {
    gains[tree.featureIdx] += tree.gain
  }
  if (tree.left) featureGains(tree.left, gains)
  if (tree.right) featureGains(tree.right, gains)
}

// ─── Gradient boosting ──────────────────────────

export interface RevenueForest {
  trees: TreeNode[]
  learningRate: number
  basePrediction: number
  featureImportance: number[]
}

export interface TrainConfig {
  nTrees?: number       // défaut 50
  maxDepth?: number     // défaut 4
  minSplit?: number     // défaut 3
  learningRate?: number // défaut 0.1
}

export function trainRevenueForest(
  samples: LocalFeatures[],
  revenuesPerSqmFcfa: number[],
  config: TrainConfig = {},
): RevenueForest {
  const nTrees = config.nTrees ?? 50
  const maxDepth = config.maxDepth ?? 4
  const minSplit = config.minSplit ?? 3
  const lr = config.learningRate ?? 0.1

  const X = samples.map(encode)
  const y = revenuesPerSqmFcfa.slice()
  const basePrediction = y.reduce((a, b) => a + b, 0) / Math.max(1, y.length)
  const residuals = y.map(v => v - basePrediction)
  const trees: TreeNode[] = []
  const featureImportance = new Array(X[0]?.length ?? 0).fill(0)

  for (let t = 0; t < nTrees; t++) {
    const tree = buildTree(X, residuals, 0, maxDepth, minSplit)
    trees.push(tree)
    featureGains(tree, featureImportance)
    for (let k = 0; k < X.length; k++) {
      residuals[k] -= lr * predictTree(tree, X[k])
    }
  }

  return { trees, learningRate: lr, basePrediction, featureImportance }
}

export function predictRevenue(forest: RevenueForest, f: LocalFeatures): Prediction {
  const x = encode(f)
  let predPerSqm = forest.basePrediction
  const contributions: number[] = new Array(x.length).fill(0)

  for (const tree of forest.trees) {
    const delta = forest.learningRate * predictTree(tree, x)
    predPerSqm += delta
    // Attribution rapide : on attribue au feature choisi par la racine
    if (tree.featureIdx !== undefined) contributions[tree.featureIdx] += Math.abs(delta)
  }

  // Variance approchée : écart-type des prédictions individuelles des arbres
  const perTreePreds = forest.trees.map(t => predictTree(t, x))
  const mp = perTreePreds.reduce((a, b) => a + b, 0) / Math.max(1, perTreePreds.length)
  const variance = perTreePreds.reduce((a, b) => a + (b - mp) ** 2, 0) / Math.max(1, perTreePreds.length)
  const std = Math.sqrt(variance) * forest.learningRate * Math.sqrt(forest.trees.length)

  const revenuePerSqm = Math.max(0, predPerSqm)
  const revenueYear = revenuePerSqm * f.surfaceSqm

  // Top contributors
  const ranked = contributions
    .map((g, i) => ({ feature: FEATURE_NAMES[i] ?? `f${i}`, gain: g }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3)

  return {
    revenuePerYearFcfa: revenueYear,
    revenuePerSqmFcfa: revenuePerSqm,
    ci80Low: Math.max(0, revenueYear - 1.28 * std * f.surfaceSqm),
    ci80High: revenueYear + 1.28 * std * f.surfaceSqm,
    topContributors: ranked,
  }
}

// ─── Dataset benchmark par défaut (Afrique subsaharienne Classe A) ──

/**
 * Produit un dataset synthétique calibré (500 samples) basé sur benchmarks
 * réels (The Mall, Marina Mall Accra, Mall of the Emirates, Morocco Mall).
 * CA/m² annuel indicatif FCFA — à re-calibrer avec vos propres données.
 */
export function generateBenchmarkDataset(): { features: LocalFeatures[]; revenuesPerSqm: number[] } {
  const features: LocalFeatures[] = []
  const revenues: number[] = []

  // Base : CA/m² par catégorie FCFA (Classe A UEMOA 2025-2026)
  const baseRevenue: Record<TenantCategory, number> = {
    mode: 550_000,
    restauration: 780_000,
    services: 420_000,
    loisirs: 620_000,
    alimentaire: 680_000,
    beaute: 510_000,
    enfants: 450_000,
    autre: 380_000,
  }

  // F-009/F-010 : PRNG seedé centralisé pour determinisme complet
  // (avant : `Math.random()` mélangé à un LCG seedé → résultats non reproductibles)
  const rnd = mulberry32(42)

  for (let i = 0; i < 500; i++) {
    const cat = TENANT_CATEGORIES[Math.floor(rnd() * TENANT_CATEGORIES.length)]
    const surface = 30 + rnd() * 170
    const floor = rnd() < 0.6 ? 0 : (rnd() < 0.5 ? 1 : -1)
    const distEntry = 5 + rnd() * 80
    const distAnchor = 10 + rnd() * 120
    const distComp = 5 + rnd() * 100
    const visibility = 0.2 + rnd() * 0.8
    const frontage = 3 + rnd() * 12
    const footfall = 0.2 + rnd() * 0.7
    const diversity = 0.3 + rnd() * 0.6
    const pmr = rnd() > 0.3 ? 1 : 0
    const corner = rnd() > 0.7 ? 1 : 0
    const elevProx = 5 + rnd() * 60
    const parkProx = 20 + rnd() * 200

    const f: LocalFeatures = {
      surfaceSqm: surface, category: cat, floorLevel: floor,
      distanceToEntranceM: distEntry, distanceToAnchorM: distAnchor,
      distanceToCompetitorsM: distComp, visibilityScore: visibility,
      frontageLengthM: frontage, footfallScore: footfall,
      neighborhoodDiversity: diversity, accessPmr: pmr as 0 | 1,
      cornerLocation: corner as 0 | 1,
      elevatorProximityM: elevProx, parkingProximityM: parkProx,
    }
    features.push(f)

    // Modèle sous-jacent (réaliste, pour générer y)
    const base = baseRevenue[cat]
    const distPenalty = Math.max(0.5, 1 - (distEntry + distAnchor) / 400)
    const visBoost = 0.7 + visibility * 0.5
    const ffBoost = 0.7 + footfall * 0.6
    const diversityBoost = 0.85 + diversity * 0.3
    const floorPenalty = floor === 0 ? 1 : floor === 1 ? 0.78 : 0.65
    const cornerBoost = corner ? 1.15 : 1
    const frontageBoost = 0.85 + frontage / 30
    const noise = 0.8 + rnd() * 0.4

    const revenue = base * distPenalty * visBoost * ffBoost * diversityBoost
      * floorPenalty * cornerBoost * frontageBoost * noise

    revenues.push(revenue)
  }

  return { features, revenuesPerSqm: revenues }
}

// ─── Helpers interprétation ───────────────

export function interpretPrediction(p: Prediction, f: LocalFeatures): string[] {
  const out: string[] = []
  out.push(
    `CA annuel estimé : ${p.revenuePerYearFcfa.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA ` +
    `(${p.revenuePerSqmFcfa.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA/m²)`
  )
  out.push(
    `Intervalle 80 % : ${p.ci80Low.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} – ` +
    `${p.ci80High.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA.`
  )
  const top = p.topContributors.map(c => c.feature).slice(0, 3)
  if (top.length > 0) out.push(`Facteurs principaux : ${top.join(', ')}.`)
  if (f.distanceToEntranceM > 80) out.push(`⚠ Distance entrée > 80 m — pénalise fortement le CA.`)
  if (f.visibilityScore < 0.4) out.push(`⚠ Visibilité faible (${(f.visibilityScore * 100).toFixed(0)} %) — envisager enseigne rétroéclairée.`)
  if (f.footfallScore < 0.3) out.push(`⚠ Footfall faible — relocaliser ou attirer avec opération commerciale.`)
  return out
}
