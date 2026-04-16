// ═══ GENETIC ALGORITHM — Optimisation combinatoire (mix enseignes par lot) ═══
// Population de "chromosomes" = vecteurs d'assignations (lot → catégorie).
// Sélection tournoi, crossover uniforme, mutation faible.

export interface GAOptions {
  populationSize?: number
  generations?: number
  mutationRate?: number
  eliteSize?: number
  tournamentSize?: number
  seed?: number
}

export interface GASolution<T> {
  chromosome: T[]
  fitness: number
  generation: number
}

export interface GAResult<T> {
  best: GASolution<T>
  history: Array<{ generation: number; bestFitness: number; meanFitness: number }>
  finalPopulation: GASolution<T>[]
}

export interface GAProblem<TGene> {
  /** Domaine des valeurs possibles d'un gène. */
  domain: TGene[]
  /** Longueur du chromosome. */
  chromosomeLength: number
  /** Fitness à maximiser. */
  fitness: (chromosome: TGene[]) => number
  /** Contrainte hard : si false, fitness pénalisée. */
  isFeasible?: (chromosome: TGene[]) => boolean
}

export function geneticOptimize<T>(problem: GAProblem<T>, opts: GAOptions = {}): GAResult<T> {
  const popSize = opts.populationSize ?? 80
  const generations = opts.generations ?? 60
  const mutationRate = opts.mutationRate ?? 0.05
  const eliteSize = opts.eliteSize ?? 4
  const tournamentSize = opts.tournamentSize ?? 4

  let seed = opts.seed ?? 1337
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
  const randInt = (n: number) => Math.floor(rand() * n)
  const pickRandom = <X>(arr: X[]): X => arr[randInt(arr.length)]

  const evalFit = (c: T[]): number => {
    if (problem.isFeasible && !problem.isFeasible(c)) return problem.fitness(c) * 0.5 - 1e6
    return problem.fitness(c)
  }

  // Init population
  let population: GASolution<T>[] = []
  for (let i = 0; i < popSize; i++) {
    const chromo = Array.from({ length: problem.chromosomeLength }, () => pickRandom(problem.domain))
    population.push({ chromosome: chromo, fitness: evalFit(chromo), generation: 0 })
  }

  const history: GAResult<T>['history'] = []

  for (let g = 0; g < generations; g++) {
    population.sort((a, b) => b.fitness - a.fitness)
    const meanFit = population.reduce((s, p) => s + p.fitness, 0) / population.length
    history.push({ generation: g, bestFitness: population[0].fitness, meanFitness: meanFit })

    // Élite préservée
    const newPop: GASolution<T>[] = population.slice(0, eliteSize).map(p => ({ ...p, generation: g + 1 }))

    while (newPop.length < popSize) {
      // Tournament selection
      const tournA: GASolution<T>[] = []
      const tournB: GASolution<T>[] = []
      for (let t = 0; t < tournamentSize; t++) {
        tournA.push(population[randInt(population.length)])
        tournB.push(population[randInt(population.length)])
      }
      tournA.sort((a, b) => b.fitness - a.fitness)
      tournB.sort((a, b) => b.fitness - a.fitness)
      const parentA = tournA[0]
      const parentB = tournB[0]

      // Uniform crossover
      const child: T[] = []
      for (let i = 0; i < problem.chromosomeLength; i++) {
        child.push(rand() < 0.5 ? parentA.chromosome[i] : parentB.chromosome[i])
      }
      // Mutation
      for (let i = 0; i < child.length; i++) {
        if (rand() < mutationRate) child[i] = pickRandom(problem.domain)
      }
      newPop.push({ chromosome: child, fitness: evalFit(child), generation: g + 1 })
    }
    population = newPop
  }

  population.sort((a, b) => b.fitness - a.fitness)
  return { best: population[0], history, finalPopulation: population }
}
