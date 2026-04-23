// Tests CUSUM Page-Hinkley.
import { describe, it, expect } from 'vitest'
import { computeCusum } from '../../modules/building/vol2-securitaire/engines/cusumEngine'

function noisySeries(n: number, mu: number, sigma: number, seed = 1): number[] {
  // Simple LCG suffisant pour un test deterministe.
  let s = seed
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const randn = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd())
  return Array.from({ length: n }, () => mu + sigma * randn())
}

describe('computeCusum', () => {
  it('ne declenche pas d\'alarme sur une serie stable', () => {
    const series = noisySeries(100, 100, 5)
    const r = computeCusum(series, { baselineSize: 30, hCoef: 5 })
    expect(r.alarmIndices.length).toBeLessThanOrEqual(2) // tolere quelques faux positifs
  })

  it('declenche une alarme sur un saut net', () => {
    const stable = noisySeries(50, 100, 5, 1)
    const jump = noisySeries(50, 140, 5, 2) // shift de +8σ
    const series = [...stable, ...jump]
    const r = computeCusum(series, { baselineSize: 30, hCoef: 4 })
    expect(r.alarmIndices.length).toBeGreaterThan(0)
    expect(r.firstChangePointIndex).not.toBeNull()
    expect(r.firstChangePointIndex!).toBeGreaterThanOrEqual(40)
  })

  it('retourne stats coherentes', () => {
    const series = noisySeries(80, 50, 3, 5)
    const r = computeCusum(series)
    expect(r.points.length).toBe(series.length)
    expect(r.k).toBeGreaterThan(0)
    expect(r.h).toBeGreaterThan(r.k)
    expect(r.stats.total).toBe(series.length)
  })

  it('mode up ne leve que des alarmes up', () => {
    const series = [...noisySeries(30, 100, 3), ...noisySeries(30, 140, 3)]
    const r = computeCusum(series, { direction: 'up', baselineSize: 25, hCoef: 3 })
    expect(r.points.filter(p => p.alarmType === 'down').length).toBe(0)
  })
})
