// Tests F-010 : PRNG centralise.
import { describe, it, expect } from 'vitest'
import { mulberry32, randn } from '../../modules/building/shared/utils/prng'

describe('mulberry32', () => {
  it('produit la meme sequence avec la meme graine', () => {
    const a = mulberry32(123)
    const b = mulberry32(123)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('produit des sequences differentes avec graines differentes', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('valeurs dans [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('moyenne proche de 0.5 sur 10000 tirages', () => {
    const r = mulberry32(42)
    let sum = 0
    const N = 10000
    for (let i = 0; i < N; i++) sum += r()
    const mean = sum / N
    expect(mean).toBeGreaterThan(0.48)
    expect(mean).toBeLessThan(0.52)
  })
})

describe('randn (Box-Muller)', () => {
  it('moyenne proche de 0, ecart-type proche de 1', () => {
    const r = mulberry32(42)
    const N = 5000
    const values = Array.from({ length: N }, () => randn(r))
    const mean = values.reduce((a, b) => a + b, 0) / N
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / N
    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05)
  })
})
