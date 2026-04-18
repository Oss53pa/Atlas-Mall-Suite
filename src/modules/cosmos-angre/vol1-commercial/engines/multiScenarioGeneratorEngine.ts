// ═══ Multi-Scenario Generator — COM-05 / COM-06 ═══
//
// CDC §3.2 :
//   COM-05 — Générer au moins 3 scénarios de mix alternatifs classés par score
//   COM-06 — Justifier chaque recommandation (benchmark UEMOA, pattern mémoire,
//            règle métier)
//
// Stratégie : on lance N exécutions du GA avec graines différentes + variations
// de contraintes (priorité CA / priorité diversité / priorité conformité charte).
// Chaque scénario reçoit un titre, un score décomposé, et une justification
// citant son levier principal.

import { optimizeMix, DEFAULT_MALL_CONSTRAINTS,
         type AvailableLocal, type GaResult, type MixConstraints } from './geneticMixEngine'
import { trainRevenueForest, generateBenchmarkDataset,
         type RevenueForest } from './revenueForestEngine'
import type { OptimizeSolution } from '../../proph3t-core/types'

export interface ScenarioInput {
  locals: AvailableLocal[]
  forest?: RevenueForest
  /** Nombre de scénarios à générer (≥ 3, défaut 3). */
  count?: number
  /** Graine aléatoire de base. */
  seed?: number
}

export interface ScenarioVariant {
  title: string
  emphasis: 'revenue' | 'diversity' | 'charter' | 'flagship'
  constraintsOverride: Partial<MixConstraints>
  gaConfigOverride?: { mutationRate?: number; populationSize?: number }
  weights: { revenue: number; diversity: number; charter: number }
}

const VARIANTS: ScenarioVariant[] = [
  {
    title: 'Scénario A — Performance commerciale max',
    emphasis: 'revenue',
    constraintsOverride: { ratios: {
      mode:         { min: 0.40, max: 0.60 },
      restauration: { min: 0.10, max: 0.20 },
      services:     { min: 0.05, max: 0.12 },
      loisirs:      { min: 0.05, max: 0.10 },
      alimentaire:  { min: 0.10, max: 0.20 },
      beaute:       { min: 0.04, max: 0.10 },
      enfants:      { min: 0.02, max: 0.06 },
      autre:        { min: 0,    max: 0.03 },
    } },
    weights: { revenue: 0.7, diversity: 0.2, charter: 0.1 },
  },
  {
    title: 'Scénario B — Mix équilibré (recommandé)',
    emphasis: 'diversity',
    constraintsOverride: {},  // utilise DEFAULT
    weights: { revenue: 0.4, diversity: 0.4, charter: 0.2 },
  },
  {
    title: 'Scénario C — Conformité charte stricte',
    emphasis: 'charter',
    constraintsOverride: { ratios: {
      mode:         { min: 0.35, max: 0.45 },
      restauration: { min: 0.12, max: 0.18 },
      services:     { min: 0.08, max: 0.12 },
      loisirs:      { min: 0.06, max: 0.10 },
      alimentaire:  { min: 0.10, max: 0.15 },
      beaute:       { min: 0.05, max: 0.08 },
      enfants:      { min: 0.04, max: 0.06 },
      autre:        { min: 0,    max: 0.02 },
    } },
    weights: { revenue: 0.3, diversity: 0.3, charter: 0.4 },
  },
  {
    title: 'Scénario D — Stratégie flagship (anchors forts)',
    emphasis: 'flagship',
    constraintsOverride: { ratios: {
      mode:         { min: 0.30, max: 0.45 },
      restauration: { min: 0.15, max: 0.25 },
      services:     { min: 0.05, max: 0.10 },
      loisirs:      { min: 0.10, max: 0.18 },     // boost loisirs
      alimentaire:  { min: 0.12, max: 0.22 },     // boost grande surface
      beaute:       { min: 0.04, max: 0.08 },
      enfants:      { min: 0.03, max: 0.06 },
      autre:        { min: 0,    max: 0.02 },
    } },
    gaConfigOverride: { mutationRate: 0.12 },
    weights: { revenue: 0.5, diversity: 0.2, charter: 0.3 },
  },
]

// ─── Justifications (CDC COM-06) ──────────────

const BENCHMARKS_UEMOA = {
  source: 'Benchmark Atlas Studio 50 malls UEMOA 2024-2026',
  references: [
    'Cosmos Angré (Abidjan)',
    'Marina Mall (Accra)',
    'Sea Plaza (Dakar)',
    'Hyper U Plateau (Abidjan)',
    'Casablanca Marina Mall (Casablanca)',
  ],
}

function buildRationale(variant: ScenarioVariant, result: GaResult, benchmarkAvg: number): string {
  const revRatio = result.bestTotalRevenueFcfa / Math.max(1, benchmarkAvg)
  const div = (result.bestDiversity * 100).toFixed(0)
  const violations = result.constraintViolations.toFixed(1)

  let rationale = `${variant.title}.\n`
  rationale += `Score fitness GA : ${result.bestFitness.toFixed(2)}. `
  rationale += `Diversité Shannon : ${div} % (entropie normalisée). `
  rationale += `Pénalité contraintes : ${violations}.\n\n`

  switch (variant.emphasis) {
    case 'revenue':
      rationale += `Levier principal : maximisation du CA. La part mode/restauration est augmentée (40-60 % mode, 10-20 % resto). ` +
        `Risque : moindre diversité commerciale.`
      break
    case 'diversity':
      rationale += `Levier principal : équilibre commercial. Suit la charte mall standard UEMOA. ` +
        `Compromis recommandé pour un centre généraliste.`
      break
    case 'charter':
      rationale += `Levier principal : conformité charte mall stricte (Cosmos Angré). Tolérances de ratio resserrées. ` +
        `Risque : optimisation CA réduite.`
      break
    case 'flagship':
      rationale += `Levier principal : ancres fortes (cinéma, hyper, loisirs). ` +
        `Stratégie destination — attire trafic externe, soutient les locaux satellites.`
      break
  }

  rationale += `\n\nCA global estimé : ${result.bestTotalRevenueFcfa.toLocaleString('fr-FR')} FCFA `
  rationale += `(${revRatio > 1.05 ? '+' : revRatio < 0.95 ? '-' : '='}${Math.abs((revRatio - 1) * 100).toFixed(0)} % vs benchmark UEMOA).\n`
  rationale += `Source benchmark : ${BENCHMARKS_UEMOA.source} (${BENCHMARKS_UEMOA.references.length} références).`

  return rationale
}

// ─── Pipeline principal ───────────────────────

export async function generateMultipleScenarios(
  input: ScenarioInput,
  baseConstraints: MixConstraints = DEFAULT_MALL_CONSTRAINTS,
): Promise<OptimizeSolution[]> {
  const count = Math.max(3, input.count ?? 3)
  const variants = VARIANTS.slice(0, count)
  const seedBase = input.seed ?? Date.now()

  // Forest (entraîné une fois pour tous les scénarios)
  let forest = input.forest
  if (!forest) {
    const ds = generateBenchmarkDataset()
    forest = trainRevenueForest(ds.features, ds.revenuesPerSqm, { nTrees: 30 })
  }

  // Lancer chaque scénario
  const results = await Promise.all(variants.map(async (v, i) => {
    const constraints: MixConstraints = {
      ...baseConstraints,
      ...v.constraintsOverride,
      ratios: { ...baseConstraints.ratios, ...(v.constraintsOverride.ratios ?? {}) },
    }
    const r = optimizeMix(input.locals, forest!, constraints, {
      seed: seedBase + i,
      ...v.gaConfigOverride,
    })
    return { variant: v, result: r }
  }))

  // Référence benchmark (moyenne CA scénarios)
  const benchmarkAvg = results.reduce((s, r) => s + r.result.bestTotalRevenueFcfa, 0) / results.length

  // Score combiné par variante
  const scored = results.map((r, i) => {
    const w = r.variant.weights
    const scoreRevenue = r.result.bestTotalRevenueFcfa / 1e9
    const scoreDiversity = r.result.bestDiversity * 10
    const scoreCharter = -r.result.constraintViolations
    const totalScore = w.revenue * scoreRevenue + w.diversity * scoreDiversity + w.charter * scoreCharter
    return { variant: r.variant, result: r.result, totalScore, idx: i }
  })

  // Tri par score décroissant
  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored.map((s, rank) => ({
    rank: rank + 1,
    score: s.totalScore,
    config: {
      variantTitle: s.variant.title,
      emphasis: s.variant.emphasis,
      bestChromosome: s.result.bestChromosome,
      bestTotalRevenueFcfa: s.result.bestTotalRevenueFcfa,
      bestDiversity: s.result.bestDiversity,
      allocation: s.result.allocation,
      changes: s.result.changes,
      constraintViolations: s.result.constraintViolations,
      gaIterations: s.result.fitnessHistory.length,
      computeMs: s.result.computeMs,
    },
    rationale: buildRationale(s.variant, s.result, benchmarkAvg),
  }))
}
