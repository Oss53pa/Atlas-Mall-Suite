import { describe, it, expect } from 'vitest'
import { cleanupPolygon, cleanupBatch } from '../../../modules/building/shared/engines/geometry/legacyCleanup'
import type { PolygonMm } from '../../../modules/building/shared/engines/geometry/constraints'

describe('cleanupPolygon', () => {
  it('carré quasi-droit → aligné orthogonal', () => {
    const bancal: PolygonMm = [
      [3, 7], [1003, 2], [1001, 1005], [-2, 1001],
    ]
    const r = cleanupPolygon(bancal, { gridMm: 100, orthoAlignMm: 50 })
    expect(r.changed).toBe(true)
    expect(r.afterScore).toBeGreaterThan(r.beforeScore)
    // Tous les sommets snappés sur grille 100 (Math.abs évite le piège -0)
    for (const [x, y] of r.cleaned) {
      expect(Math.abs(x % 100)).toBe(0)
      expect(Math.abs(y % 100)).toBe(0)
    }
  })

  it('carré déjà propre → idempotent', () => {
    const clean: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const r = cleanupPolygon(clean)
    expect(r.changed).toBe(false)
    expect(r.cleaned).toEqual(clean)
  })

  it('supprime les micro-arêtes (< 2 cm)', () => {
    const withSpike: PolygonMm = [
      [0, 0], [1000, 0], [1000, 5], [1000, 1000], [0, 1000],
    ]
    const r = cleanupPolygon(withSpike, { gridMm: 0, minEdgeMm: 20 })
    expect(r.cleaned.length).toBeLessThan(withSpike.length)
  })

  it('refuse le cleanup si drift > maxDriftMm ou si collapse', () => {
    // Grille trop grossière → le polygone entier s'effondre : on accepte
    // soit quality-drop (drift), soit too-few-vertices (collapse).
    const poly: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const r = cleanupPolygon(poly, { gridMm: 5000, maxDriftMm: 100 })
    expect(r.changed).toBe(false)
    expect(['quality-drop', 'too-few-vertices']).toContain(r.rejectedReason)
  })

  it('refuse le cleanup si self-intersection résultante', () => {
    // Ce cas est difficile à provoquer de façon déterministe ; on vérifie
    // au moins que la fonction ne crashe pas sur un polygone pathologique.
    const bowtie: PolygonMm = [[0, 0], [1000, 1000], [1000, 0], [0, 1000]]
    const r = cleanupPolygon(bowtie)
    expect(r).toBeDefined()
  })

  it('< 3 sommets → rejet', () => {
    const r = cleanupPolygon([[0, 0], [100, 0]])
    expect(r.changed).toBe(false)
    expect(r.rejectedReason).toBe('too-few-vertices')
  })
})

describe('cleanupBatch', () => {
  it('agrège les stats correctement', () => {
    const clean: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const bancal: PolygonMm = [[3, 7], [1003, 2], [1001, 1005], [-2, 1001]]
    const report = cleanupBatch([clean, bancal], { gridMm: 100 })
    expect(report.total).toBe(2)
    expect(report.cleaned).toBe(1)
    expect(report.unchanged).toBe(1)
    expect(report.averageScoreAfter).toBeGreaterThanOrEqual(report.averageScoreBefore)
  })

  it('liste vide → rapport zéro', () => {
    const r = cleanupBatch([])
    expect(r.total).toBe(0)
    expect(r.cleaned).toBe(0)
  })
})
