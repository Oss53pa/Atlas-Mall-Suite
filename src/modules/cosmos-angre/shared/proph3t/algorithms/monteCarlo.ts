// ═══ MONTE CARLO — Génération de variantes A/B + percentiles P10/P50/P90 ═══

export interface MonteCarloOpts {
  iterations?: number
  seed?: number
}

export interface PercentileResult {
  p10: number
  p50: number
  p90: number
  mean: number
  std: number
  min: number
  max: number
  samples: number
}

/** Lance N simulations, retourne percentiles des résultats. */
export function monteCarloPercentiles(
  simulate: () => number,
  opts: MonteCarloOpts = {},
): PercentileResult {
  const N = opts.iterations ?? 1000
  const samples: number[] = []
  for (let i = 0; i < N; i++) samples.push(simulate())
  return percentiles(samples)
}

export function percentiles(samples: number[]): PercentileResult {
  if (samples.length === 0) return { p10: 0, p50: 0, p90: 0, mean: 0, std: 0, min: 0, max: 0, samples: 0 }
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length
  return {
    p10: at(0.10), p50: at(0.50), p90: at(0.90),
    mean, std: Math.sqrt(variance),
    min: sorted[0], max: sorted[sorted.length - 1],
    samples: sorted.length,
  }
}

/** Variantes A/B Monte Carlo : compare deux scénarios. */
export interface ABComparisonResult {
  a: PercentileResult
  b: PercentileResult
  /** P(A > B). */
  probABetter: number
  /** Effet moyen B-A. */
  meanLift: number
  recommendation: 'A' | 'B' | 'inconclusive'
}

export function compareAB(
  simulateA: () => number,
  simulateB: () => number,
  iterations = 1000,
): ABComparisonResult {
  const samplesA: number[] = []
  const samplesB: number[] = []
  let aBeatsB = 0
  for (let i = 0; i < iterations; i++) {
    const va = simulateA()
    const vb = simulateB()
    samplesA.push(va)
    samplesB.push(vb)
    if (va > vb) aBeatsB++
  }
  const a = percentiles(samplesA)
  const b = percentiles(samplesB)
  const probABetter = aBeatsB / iterations
  const meanLift = b.mean - a.mean
  let recommendation: ABComparisonResult['recommendation']
  if (probABetter >= 0.7) recommendation = 'A'
  else if (probABetter <= 0.3) recommendation = 'B'
  else recommendation = 'inconclusive'
  return { a, b, probABetter, meanLift, recommendation }
}

/** Helper : générateur normal Box-Muller. */
export function randomNormal(mean = 0, std = 1, seed?: { value: number }): number {
  let u = 0, v = 0
  if (seed) {
    seed.value = (seed.value * 1664525 + 1013904223) >>> 0
    u = seed.value / 2 ** 32
    seed.value = (seed.value * 1664525 + 1013904223) >>> 0
    v = seed.value / 2 ** 32
  } else {
    u = Math.random()
    v = Math.random()
  }
  if (u === 0) u = 1e-9
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
