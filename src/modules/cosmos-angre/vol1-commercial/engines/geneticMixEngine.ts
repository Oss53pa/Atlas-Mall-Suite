// ═══ VOL.1 · Algorithme Génétique — Optimisation mix enseignes ═══
//
// Optimise la répartition des catégories d'enseignes dans un centre commercial
// pour maximiser le CA global en respectant les contraintes :
//   - budget surfaces totales disponibles
//   - ratios minima/maxima par catégorie (charte mall)
//   - compatibilités de voisinage (restaurants ≠ parfumerie adjacente, etc.)
//   - obligation d'ancres (grande surface / cinéma)
//
// Chromosome : vecteur de N locaux × catégorie
// Fitness : CA prédit total + bonus diversité Shannon - pénalités contraintes
//
// Référence : Holland 1975 "Adaptation in Natural and Artificial Systems".

import {
  TENANT_CATEGORIES, type TenantCategory, type LocalFeatures,
  type RevenueForest, predictRevenue,
} from './revenueForestEngine'
import { mulberry32 } from '../../shared/utils/prng'

// ─── Types ─────────────────────────────────────────

export interface AvailableLocal {
  id: string
  label: string
  features: Omit<LocalFeatures, 'category'>
  /** Catégorie actuelle (si occupé), null si libre. */
  currentCategory: TenantCategory | null
  /** Bloquer ce local ? (pas modifiable). */
  locked: boolean
}

export interface MixConstraints {
  /** Ratios par catégorie (part de surface totale). */
  ratios: Partial<Record<TenantCategory, { min: number; max: number }>>
  /** Paires incompatibles (ex: beauté ne doit pas être adjacente à food). */
  incompatibleNeighbors?: Array<[TenantCategory, TenantCategory]>
  /** Matrice d'adjacence des locaux (distances, m). */
  adjacencyMatrix?: number[][]
  /** Distance max pour considérer comme voisin. */
  neighborThresholdM?: number
}

export interface GaConfig {
  populationSize?: number     // défaut 100
  generations?: number        // défaut 200
  mutationRate?: number       // défaut 0.08
  crossoverRate?: number      // défaut 0.85
  elitismCount?: number       // défaut 4
  seed?: number
}

export interface GaResult {
  bestChromosome: TenantCategory[]
  bestFitness: number
  bestTotalRevenueFcfa: number
  bestDiversity: number
  constraintViolations: number
  /** Historique fitness (best + avg par génération). */
  fitnessHistory: Array<{ gen: number; best: number; avg: number }>
  /** Répartition finale par catégorie. */
  allocation: Record<TenantCategory, { count: number; totalSurface: number; ratio: number }>
  /** Locaux modifiés. */
  changes: Array<{ localId: string; before: TenantCategory | null; after: TenantCategory }>
  computeMs: number
}

// ─── Fonctions utilitaires ────────────────────

// F-010 : LCG remplacé par Mulberry32 (qualité statistique supérieure, période ~2^32)
function rngFactory(seed?: number) {
  return mulberry32(seed ?? Date.now())
}

function randomCategory(rand: () => number): TenantCategory {
  return TENANT_CATEGORIES[Math.floor(rand() * TENANT_CATEGORIES.length)]
}

function shannonDiversity(counts: Record<TenantCategory, number>): number {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  let h = 0
  for (const c of TENANT_CATEGORIES) {
    const p = (counts[c] ?? 0) / total
    if (p > 0) h -= p * Math.log(p)
  }
  return h / Math.log(TENANT_CATEGORIES.length) // normalisé 0..1
}

// ─── Fitness ──────────────────────────────────

function fitness(
  chrom: TenantCategory[],
  locals: AvailableLocal[],
  forest: RevenueForest,
  constraints: MixConstraints,
): { total: number; revenue: number; diversity: number; violations: number } {
  const totalSurface = locals.reduce((s, l) => s + l.features.surfaceSqm, 0)

  // CA total prédit
  let revenue = 0
  for (let i = 0; i < locals.length; i++) {
    const f: LocalFeatures = { ...locals[i].features, category: chrom[i] }
    const p = predictRevenue(forest, f)
    revenue += p.revenuePerYearFcfa
  }

  // Diversité Shannon
  const counts: Record<TenantCategory, number> = {} as any
  for (const c of TENANT_CATEGORIES) counts[c] = 0
  for (const c of chrom) counts[c] = (counts[c] ?? 0) + 1
  const diversity = shannonDiversity(counts)

  // Contraintes ratio
  let violations = 0
  const surfaceByCat: Record<TenantCategory, number> = {} as any
  for (const c of TENANT_CATEGORIES) surfaceByCat[c] = 0
  for (let i = 0; i < locals.length; i++) {
    surfaceByCat[chrom[i]] += locals[i].features.surfaceSqm
  }
  for (const c of TENANT_CATEGORIES) {
    const cons = constraints.ratios[c]
    if (!cons) continue
    const ratio = surfaceByCat[c] / Math.max(1, totalSurface)
    if (ratio < cons.min) violations += (cons.min - ratio) * 100
    if (ratio > cons.max) violations += (ratio - cons.max) * 100
  }

  // Contraintes voisinage
  if (constraints.incompatibleNeighbors && constraints.adjacencyMatrix) {
    const thresh = constraints.neighborThresholdM ?? 10
    const pairs = new Set(constraints.incompatibleNeighbors.map(([a, b]) =>
      [a, b].sort().join('|')
    ))
    for (let i = 0; i < locals.length; i++) {
      for (let j = i + 1; j < locals.length; j++) {
        if (constraints.adjacencyMatrix[i]?.[j] === undefined) continue
        if (constraints.adjacencyMatrix[i][j] > thresh) continue
        const key = [chrom[i], chrom[j]].sort().join('|')
        if (pairs.has(key)) violations += 1
      }
    }
  }

  // Pénalité verrouillage (locked doit conserver catégorie actuelle)
  for (let i = 0; i < locals.length; i++) {
    if (locals[i].locked && locals[i].currentCategory && chrom[i] !== locals[i].currentCategory) {
      violations += 10
    }
  }

  const totalFitness = revenue / 1e9 + diversity * 0.5 - violations * 0.5
  return { total: totalFitness, revenue, diversity, violations }
}

// ─── Opérateurs génétiques ───────────────────

function crossover(a: TenantCategory[], b: TenantCategory[], rand: () => number): TenantCategory[] {
  const n = a.length
  const point = Math.floor(rand() * (n - 1)) + 1
  return [...a.slice(0, point), ...b.slice(point)]
}

function mutate(chrom: TenantCategory[], rate: number, rand: () => number): TenantCategory[] {
  return chrom.map(c => rand() < rate ? randomCategory(rand) : c)
}

function tournamentSelect(
  pop: TenantCategory[][], scores: number[], k: number, rand: () => number,
): TenantCategory[] {
  let best = -1, bestScore = -Infinity
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(rand() * pop.length)
    if (scores[idx] > bestScore) { bestScore = scores[idx]; best = idx }
  }
  return pop[best]
}

// ─── Pipeline ──────────────────────────────────

export function optimizeMix(
  locals: AvailableLocal[],
  forest: RevenueForest,
  constraints: MixConstraints,
  config: GaConfig = {},
): GaResult {
  const t0 = performance.now()
  const popSize = config.populationSize ?? 100
  const generations = config.generations ?? 200
  const mutRate = config.mutationRate ?? 0.08
  const crossRate = config.crossoverRate ?? 0.85
  const elitism = config.elitismCount ?? 4
  const rand = rngFactory(config.seed)

  const n = locals.length
  if (n === 0) {
    return {
      bestChromosome: [], bestFitness: 0, bestTotalRevenueFcfa: 0, bestDiversity: 0,
      constraintViolations: 0, fitnessHistory: [],
      allocation: allocationStats([], locals),
      changes: [],
      computeMs: performance.now() - t0,
    }
  }

  // Population initiale : moitié aléatoire + moitié basée sur currentCategory
  const population: TenantCategory[][] = []
  for (let i = 0; i < popSize; i++) {
    if (i < popSize / 2) {
      population.push(locals.map(l => l.currentCategory ?? randomCategory(rand)))
    } else {
      population.push(locals.map(() => randomCategory(rand)))
    }
  }

  const history: Array<{ gen: number; best: number; avg: number }> = []
  let bestEver: TenantCategory[] = population[0].slice()
  let bestEverFit = -Infinity

  for (let gen = 0; gen < generations; gen++) {
    const fits = population.map(chrom => fitness(chrom, locals, forest, constraints))
    const scores = fits.map(f => f.total)

    // Meilleur de la génération
    let bestIdx = 0
    for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i
    if (scores[bestIdx] > bestEverFit) {
      bestEverFit = scores[bestIdx]
      bestEver = population[bestIdx].slice()
    }

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    history.push({ gen, best: scores[bestIdx], avg })

    // Elitisme
    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s)
    const newPop: TenantCategory[][] = []
    for (let e = 0; e < elitism && e < population.length; e++) {
      newPop.push(population[indexed[e].i].slice())
    }

    // Reproduction
    while (newPop.length < popSize) {
      const a = tournamentSelect(population, scores, 3, rand)
      const b = tournamentSelect(population, scores, 3, rand)
      let child = rand() < crossRate ? crossover(a, b, rand) : a.slice()
      child = mutate(child, mutRate, rand)
      // Respect verrouillage
      for (let i = 0; i < n; i++) {
        if (locals[i].locked && locals[i].currentCategory) {
          child[i] = locals[i].currentCategory!
        }
      }
      newPop.push(child)
    }
    population.splice(0, population.length, ...newPop)
  }

  const bestFit = fitness(bestEver, locals, forest, constraints)
  const changes: GaResult['changes'] = []
  for (let i = 0; i < n; i++) {
    if (bestEver[i] !== locals[i].currentCategory) {
      changes.push({
        localId: locals[i].id,
        before: locals[i].currentCategory,
        after: bestEver[i],
      })
    }
  }

  return {
    bestChromosome: bestEver,
    bestFitness: bestFit.total,
    bestTotalRevenueFcfa: bestFit.revenue,
    bestDiversity: bestFit.diversity,
    constraintViolations: bestFit.violations,
    fitnessHistory: history,
    allocation: allocationStats(bestEver, locals),
    changes,
    computeMs: performance.now() - t0,
  }
}

function allocationStats(
  chrom: TenantCategory[], locals: AvailableLocal[],
): GaResult['allocation'] {
  const out: GaResult['allocation'] = {} as any
  const totalSurface = locals.reduce((s, l) => s + l.features.surfaceSqm, 0)
  for (const c of TENANT_CATEGORIES) {
    out[c] = { count: 0, totalSurface: 0, ratio: 0 }
  }
  for (let i = 0; i < chrom.length; i++) {
    const c = chrom[i]
    out[c].count++
    out[c].totalSurface += locals[i].features.surfaceSqm
  }
  for (const c of TENANT_CATEGORIES) {
    out[c].ratio = totalSurface ? out[c].totalSurface / totalSurface : 0
  }
  return out
}

// ─── Contraintes par défaut (charte mall Classe A) ──

export const DEFAULT_MALL_CONSTRAINTS: MixConstraints = {
  ratios: {
    mode:          { min: 0.35, max: 0.55 },
    restauration:  { min: 0.10, max: 0.20 },
    services:      { min: 0.05, max: 0.15 },
    loisirs:       { min: 0.05, max: 0.15 },
    alimentaire:   { min: 0.08, max: 0.18 },
    beaute:        { min: 0.05, max: 0.12 },
    enfants:       { min: 0.03, max: 0.08 },
    autre:         { min: 0,    max: 0.05 },
  },
  incompatibleNeighbors: [
    ['restauration', 'beaute'],    // odeurs
    ['enfants', 'services'],       // bruit vs calme
  ],
  neighborThresholdM: 8,
}
