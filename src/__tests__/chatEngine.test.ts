import { describe, it, expect } from 'vitest'
import { proph3tAnswer } from '../modules/building/shared/proph3t/chatEngine'
import type { FullProjectContext } from '../modules/building/shared/proph3t/types'

const ctx = (o: Partial<FullProjectContext> = {}): FullProjectContext => ({
  zones: [], cameras: [], doors: [], pois: [], signageItems: [],
  transitions: [], floors: [], score: null, blindSpots: [],
  parcours: [], memory: null, volume: 'vol2', activeFloorId: 'f1',
  ...o,
})

describe('proph3tAnswer — cas principaux', () => {

  it('repond au score', () => {
    const r = proph3tAnswer('score', ctx())
    expect(r.text).toMatch(/score|APSAD/i)
  })

  it('repond aux cameras', () => {
    const r = proph3tAnswer('combien de cameras', ctx())
    expect(r.text).toMatch(/cam|couverture/i)
  })

  it('parse simulation "si j\'ajoute 5 cameras"', () => {
    const r = proph3tAnswer("si j'ajoute 5 cameras", ctx())
    expect(r.type).toBe('simulation')
    expect(r.text).toMatch(/5/)
  })

  it('repond aux angles morts', () => {
    const r = proph3tAnswer('angles morts detectes', ctx())
    expect(r.text).toMatch(/angle|mort|blind/i)
  })

  it('repond au budget/capex', () => {
    const r = proph3tAnswer('quel est le budget total', ctx())
    expect(r.text).toMatch(/FCFA|budget|capex/i)
  })

  it('repond a la signaletique', () => {
    const r = proph3tAnswer('signaletique configuree', ctx())
    expect(r.text).toMatch(/signal|panneau/i)
  })

  it('repond aux etages', () => {
    const r = proph3tAnswer("combien d'etages", ctx())
    expect(r.text).toMatch(/etage|niveau|floor/i)
  })

  it('repond au benchmark', () => {
    const r = proph3tAnswer('benchmark malls africains', ctx())
    expect(r.text).toMatch(/benchmark|mall|comparaison/i)
  })

  it('repond aux recommandations', () => {
    const r = proph3tAnswer('quelles sont les priorites', ctx())
    expect(r.text.length).toBeGreaterThan(20)
  })

  it('retourne aide pour question inconnue', () => {
    const r = proph3tAnswer('quelle est la meteo', ctx())
    expect(r.type).toBe('aide')
  })

  it('ne leve jamais d\'exception', () => {
    const questions = [
      '', '???', 'SELECT * FROM cameras',
      '<script>alert(1)</script>', 'undefined', 'null',
      'a'.repeat(1000),
    ]
    for (const q of questions) {
      expect(() => proph3tAnswer(q, ctx())).not.toThrow()
    }
  })
})
