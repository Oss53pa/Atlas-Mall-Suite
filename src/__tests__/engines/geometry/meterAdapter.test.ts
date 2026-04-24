import { describe, it, expect } from 'vitest'
import {
  mToMm, mmToM, polygonToMm, polygonToM,
  tuplePolygonToMm, tuplePolygonToM,
  xyPolygonToMm, xyPolygonToM,
} from '../../../modules/building/shared/engines/geometry/meterAdapter'

describe('meterAdapter', () => {
  it('mToMm arrondit au mm près', () => {
    expect(mToMm([1.2345, 0.0004])).toEqual([1235, 0])
    expect(mToMm([-2.5, 3.1])).toEqual([-2500, 3100])
  })

  it('mmToM divise par 1000 exactement', () => {
    expect(mmToM([1235, 0])).toEqual([1.235, 0])
    expect(mmToM([-2500, 3100])).toEqual([-2.5, 3.1])
  })

  it('roundtrip m → mm → m avec perte bornée au mm', () => {
    const p: [number, number] = [1.2345, 6.7891]
    const back = mmToM(mToMm(p))
    expect(Math.abs(back[0] - p[0])).toBeLessThanOrEqual(0.001)
    expect(Math.abs(back[1] - p[1])).toBeLessThanOrEqual(0.001)
  })

  it('polygonToMm et polygonToM', () => {
    const poly = [[0, 0], [1, 0], [1, 1], [0, 1]] as [number, number][]
    const mm = polygonToMm(poly)
    expect(mm).toEqual([[0, 0], [1000, 0], [1000, 1000], [0, 1000]])
    expect(polygonToM(mm)).toEqual([[0, 0], [1, 0], [1, 1], [0, 1]])
  })

  it('tuplePolygonToMm accepte les tuples EditableSpace', () => {
    const poly: [number, number][] = [[0, 0], [2.5, 0], [2.5, 1.5]]
    expect(tuplePolygonToMm(poly)).toEqual([[0, 0], [2500, 0], [2500, 1500]])
    expect(tuplePolygonToM([[0, 0], [2500, 0], [2500, 1500]])).toEqual([[0, 0], [2.5, 0], [2.5, 1.5]])
  })

  it('xyPolygonToMm accepte le format {x,y}', () => {
    const poly = [{ x: 0, y: 0 }, { x: 1, y: 2 }]
    expect(xyPolygonToMm(poly)).toEqual([[0, 0], [1000, 2000]])
    expect(xyPolygonToM([[0, 0], [1000, 2000]])).toEqual([{ x: 0, y: 0 }, { x: 1, y: 2 }])
  })
})
