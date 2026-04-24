import { describe, it, expect } from 'vitest'
import {
  hasSelfIntersection,
  polygonsOverlap,
  detectOverlaps,
} from '../../../modules/building/shared/engines/geometry/overlapDetection'
import type { PolygonMm } from '../../../modules/building/shared/engines/geometry/constraints'

describe('hasSelfIntersection', () => {
  it('carré simple → false', () => {
    const sq: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    expect(hasSelfIntersection(sq)).toBe(false)
  })

  it('bow-tie → true', () => {
    const bt: PolygonMm = [[0, 0], [1000, 1000], [1000, 0], [0, 1000]]
    expect(hasSelfIntersection(bt)).toBe(true)
  })

  it('polygone en L simple → false', () => {
    const L: PolygonMm = [
      [0, 0], [2000, 0], [2000, 1000],
      [1000, 1000], [1000, 2000], [0, 2000],
    ]
    expect(hasSelfIntersection(L)).toBe(false)
  })

  it('< 4 sommets → false (triangle)', () => {
    expect(hasSelfIntersection([[0, 0], [100, 0], [50, 100]])).toBe(false)
  })
})

describe('polygonsOverlap', () => {
  const sqA: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]

  it('polygones disjoints → false', () => {
    const sqB: PolygonMm = [[2000, 2000], [3000, 2000], [3000, 3000], [2000, 3000]]
    expect(polygonsOverlap(sqA, sqB)).toBe(false)
  })

  it('polygones adjacents (arête commune) → false', () => {
    // sqB partage l'arête x=1000 avec sqA — pas de chevauchement d'intérieur
    const sqB: PolygonMm = [[1000, 0], [2000, 0], [2000, 1000], [1000, 1000]]
    expect(polygonsOverlap(sqA, sqB)).toBe(false)
  })

  it('polygones qui se chevauchent → true', () => {
    const sqB: PolygonMm = [[500, 500], [1500, 500], [1500, 1500], [500, 1500]]
    expect(polygonsOverlap(sqA, sqB)).toBe(true)
  })

  it('un polygone contient l\'autre → true', () => {
    const small: PolygonMm = [[100, 100], [200, 100], [200, 200], [100, 200]]
    expect(polygonsOverlap(sqA, small)).toBe(true)
    expect(polygonsOverlap(small, sqA)).toBe(true)
  })
})

describe('detectOverlaps', () => {
  it('batch : retourne les paires qui se chevauchent', () => {
    const a: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const b: PolygonMm = [[500, 500], [1500, 500], [1500, 1500], [500, 1500]] // overlap a
    const c: PolygonMm = [[3000, 3000], [4000, 3000], [4000, 4000], [3000, 4000]] // disjoint
    const d: PolygonMm = [[3500, 3500], [4500, 3500], [4500, 4500], [3500, 4500]] // overlap c
    const pairs = detectOverlaps([a, b, c, d])
    expect(pairs).toContainEqual({ indexA: 0, indexB: 1 })
    expect(pairs).toContainEqual({ indexA: 2, indexB: 3 })
    expect(pairs).toHaveLength(2)
  })

  it('liste vide → []', () => {
    expect(detectOverlaps([])).toEqual([])
  })
})
