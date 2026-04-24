import { describe, it, expect } from 'vitest'
import {
  snapToGrid,
  enforceOrthogonal,
  findNeighborSnap,
  applyConstraints,
  type PointMm,
  type PolygonMm,
} from '../../../modules/building/shared/engines/geometry/constraints'

describe('snapToGrid', () => {
  it('aligne sur grille 100mm', () => {
    expect(snapToGrid([123, 456], 100)).toEqual([100, 500])
    expect(snapToGrid([149, 150], 100)).toEqual([100, 200])
    expect(snapToGrid([0, 0], 100)).toEqual([0, 0])
  })

  it('avec gridMm=0 ne fait que arrondir', () => {
    expect(snapToGrid([12.7, 3.2], 0)).toEqual([13, 3])
  })

  it('gère les valeurs négatives (Math.round half-away-from-zero côté JS)', () => {
    // Math.round(-1.49)=-1 → -100 ; Math.round(-2.5)=-2 (pas -3) → -200
    expect(snapToGrid([-149, -250], 100)).toEqual([-100, -200])
    expect(snapToGrid([-151, -251], 100)).toEqual([-200, -300])
  })
})

describe('enforceOrthogonal', () => {
  it('dx dominant → horizontale', () => {
    expect(enforceOrthogonal([0, 0], [1000, 200])).toEqual([1000, 0])
  })

  it('dy dominant → verticale', () => {
    expect(enforceOrthogonal([0, 0], [100, 800])).toEqual([0, 800])
  })

  it('dx=dy privilégie horizontale (>=)', () => {
    expect(enforceOrthogonal([0, 0], [500, 500])).toEqual([500, 0])
  })
})

describe('findNeighborSnap', () => {
  const square: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]

  it('snap sur sommet prioritaire', () => {
    const hit = findNeighborSnap([1005, 5], [square], 50)
    expect(hit).not.toBeNull()
    expect(hit!.kind).toBe('vertex')
    expect(hit!.snapped).toEqual([1000, 0])
  })

  it('snap sur arête si aucun sommet proche', () => {
    const hit = findNeighborSnap([500, 10], [square], 50)
    expect(hit).not.toBeNull()
    expect(hit!.kind).toBe('edge')
    expect(hit!.snapped).toEqual([500, 0])
  })

  it('hors tolérance → null', () => {
    expect(findNeighborSnap([2000, 2000], [square], 50)).toBeNull()
  })

  it('choisit le sommet le plus proche parmi plusieurs voisins', () => {
    const far: PolygonMm = [[5000, 5000], [6000, 5000], [6000, 6000]]
    const hit = findNeighborSnap([1010, 0], [far, square], 50)
    expect(hit!.sourcePolygonIndex).toBe(1)
    expect(hit!.snapped).toEqual([1000, 0])
  })
})

describe('applyConstraints', () => {
  it('priorité snap voisin > ortho > grille', () => {
    const square: PolygonMm = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]]
    const r = applyConstraints([1003, 7], {
      gridMm: 100,
      orthogonalPrev: [0, 0] as PointMm,
      neighbors: [square],
      neighborTolMm: 50,
    })
    expect(r.appliedSnap).toBe('neighbor-vertex')
    expect(r.point).toEqual([1000, 0])
  })

  it('sans voisin : applique ortho puis grille', () => {
    const r = applyConstraints([1007, 203], {
      gridMm: 100,
      orthogonalPrev: [0, 0],
    })
    // ortho → [1007, 0] (dx dominant), puis grid → [1000, 0]
    expect(r.point).toEqual([1000, 0])
    expect(r.appliedSnap).toBe('ortho')
  })

  it('coords non-entières arrondies', () => {
    const r = applyConstraints([123.7, 456.2] as PointMm, {})
    expect(r.point).toEqual([124, 456])
    expect(r.appliedSnap).toBe('none')
  })
})
