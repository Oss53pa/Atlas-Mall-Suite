// Tests Hungarian Jonker-Volgenant.
import { describe, it, expect } from 'vitest'
import { solveHungarian } from '../../modules/building/vol2-securitaire/engines/hungarianAssignmentEngine'

describe('solveHungarian', () => {
  it('matrice 1x1', () => {
    expect(solveHungarian([[5]])).toEqual([0])
  })

  it('matrice carree 3x3 — optimum analytique', () => {
    // Optimum connu : affectation (0->1, 1->0, 2->2) coute 1+2+3 = 6
    const cost = [
      [9, 1, 9],
      [2, 9, 9],
      [9, 9, 3],
    ]
    const res = solveHungarian(cost)
    const total = res.reduce((s, j, i) => s + cost[i][j], 0)
    expect(total).toBe(6)
  })

  it('matrice identite — affectation triviale', () => {
    const n = 4
    const cost: number[][] = []
    for (let i = 0; i < n; i++) {
      const row: number[] = []
      for (let j = 0; j < n; j++) row.push(i === j ? 0 : 10)
      cost.push(row)
    }
    const res = solveHungarian(cost)
    expect(res).toEqual([0, 1, 2, 3])
  })

  it('matrice vide', () => {
    expect(solveHungarian([])).toEqual([])
  })

  it('matrice non-carree 2x3 — padding gere', () => {
    const cost = [
      [1, 2, 3],
      [4, 5, 6],
    ]
    const res = solveHungarian(cost)
    expect(res.length).toBe(2)
    // Chaque ligne doit etre affectee a une colonne distincte
    const uniq = new Set(res.filter(x => x >= 0))
    expect(uniq.size).toBe(res.filter(x => x >= 0).length)
  })
})
