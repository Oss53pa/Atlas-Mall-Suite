// Pseudo-random number generators centralisés.
// Référence : Mulberry32 — public domain, statistiquement supérieur au LCG
// historiquement utilisé dans certains engines (geneticMixEngine).

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box-Muller — gaussienne N(0,1) à partir d'un PRNG uniforme. */
export function randn(rng: () => number = Math.random): number {
  let u = 0, v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
