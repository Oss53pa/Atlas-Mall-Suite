// Tests F-009 : determinisme via graine seedee.
import { describe, it, expect } from 'vitest'
import {
  simulateIntervention,
  type InterventionConfig,
} from '../../modules/cosmos-angre/vol2-securitaire/engines/monteCarloInterventionEngine'

function baseConfig(seed?: number): InterventionConfig {
  return {
    posts: [{ id: 'p1', label: 'P1', x: 0, y: 0, agentsCount: 1 }],
    iterations: 200,
    seed,
  }
}

describe('monteCarloInterventionEngine F-009 — determinisme', () => {
  it('produit un resultat stable avec la meme graine', () => {
    const a = simulateIntervention(50, 50, baseConfig(42))
    const b = simulateIntervention(50, 50, baseConfig(42))
    expect(a.stats.mean).toBeCloseTo(b.stats.mean, 10)
    expect(a.stats.p95).toBeCloseTo(b.stats.p95, 10)
    expect(a.responseTimesSec).toEqual(b.responseTimesSec)
  })

  it('produit un resultat different avec une graine differente', () => {
    const a = simulateIntervention(50, 50, baseConfig(42))
    const b = simulateIntervention(50, 50, baseConfig(99))
    expect(a.responseTimesSec).not.toEqual(b.responseTimesSec)
  })

  it('calcule des percentiles coherents (P50 <= P95 <= P99)', () => {
    const r = simulateIntervention(50, 50, baseConfig(7))
    expect(r.stats.median).toBeLessThanOrEqual(r.stats.p95)
    expect(r.stats.p95).toBeLessThanOrEqual(r.stats.p99)
    expect(r.stats.min).toBeLessThanOrEqual(r.stats.median)
    expect(r.stats.max).toBeGreaterThanOrEqual(r.stats.p99)
  })

  it('retourne Infinity si aucun poste disponible', () => {
    const cfg: InterventionConfig = {
      posts: [{ id: 'p1', label: 'P1', x: 0, y: 0, agentsCount: 0 }],
      iterations: 10,
      seed: 1,
    }
    const r = simulateIntervention(10, 10, cfg)
    expect(r.responseTimesSec.every(t => !isFinite(t))).toBe(true)
  })
})
