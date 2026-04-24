import { describe, it, expect } from 'vitest'
import { scorePolygonQuality } from '../../../modules/building/shared/engines/geometry/qualityScore'
import type { PolygonMm } from '../../../modules/building/shared/engines/geometry/constraints'

describe('scorePolygonQuality', () => {
  it('carré parfait → score élevé, tous critères à 1', () => {
    const square: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const r = scorePolygonQuality(square)
    expect(r.breakdown.orthogonality).toBe(1)
    expect(r.breakdown.closure).toBe(1)
    expect(r.breakdown.simpleRing).toBe(1)
    expect(r.breakdown.compactness).toBeCloseTo(1, 1)
    expect(r.score).toBeGreaterThan(0.95)
    expect(r.areaMm2).toBe(1_000_000)
    expect(r.perimeterMm).toBe(4000)
  })

  it('moins de 3 sommets → score 0', () => {
    expect(scorePolygonQuality([[0, 0], [1, 1]]).score).toBe(0)
  })

  it('polygone auto-intersectant → simpleRing=0, score pénalisé', () => {
    // sablier (bow-tie) : coupe au centre
    const bowtie: PolygonMm = [[0, 0], [1000, 1000], [1000, 0], [0, 1000]]
    const r = scorePolygonQuality(bowtie)
    expect(r.breakdown.simpleRing).toBe(0)
    expect(r.score).toBeLessThan(0.7)
  })

  it('polygone long et fin → compactness faible', () => {
    const thin: PolygonMm = [[0, 0], [10000, 0], [10000, 100], [0, 100]]
    const r = scorePolygonQuality(thin)
    expect(r.breakdown.orthogonality).toBe(1)
    expect(r.breakdown.compactness).toBeLessThan(0.3)
    // toujours un score honnête grâce à orthogonality + simpleRing
    expect(r.score).toBeGreaterThan(0.5)
  })

  it('triangle non-rectangle → orthogonality=0', () => {
    const tri: PolygonMm = [[0, 0], [1000, 0], [500, 866]]
    const r = scorePolygonQuality(tri)
    expect(r.breakdown.orthogonality).toBe(0)
    expect(r.breakdown.simpleRing).toBe(1)
  })

  it('score borné dans [0, 1]', () => {
    const square: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const r = scorePolygonQuality(square)
    expect(r.score).toBeLessThanOrEqual(1)
    expect(r.score).toBeGreaterThanOrEqual(0)
  })
})
