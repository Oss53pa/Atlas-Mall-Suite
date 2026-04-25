import { describe, it, expect } from 'vitest'
import { harmonizePolygons } from '../../../modules/building/shared/engines/geometry/harmonize'

describe('harmonizePolygons', () => {
  it('aligne deux polygones voisins avec coords proches', () => {
    const a = [{ x: 0, y: 0 }, { x: 10.21, y: 0 }, { x: 10.21, y: 5 }, { x: 0, y: 5 }]
    const b = [{ x: 10.31, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }, { x: 10.31, y: 5 }]
    const [hA, hB] = harmonizePolygons([a, b], { toleranceM: 0.15 })
    // Les murs partagés (x=10.21 et x=10.31) doivent être alignés sur la
    // même valeur (médiane des deux).
    expect(hA[1].x).toEqual(hB[0].x)
    expect(hA[2].x).toEqual(hB[3].x)
  })

  it('ne touche pas les coords éloignées (au-delà de la tolérance)', () => {
    const a = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    const b = [{ x: 30, y: 0 }, { x: 40, y: 0 }]
    const [hA, hB] = harmonizePolygons([a, b], { toleranceM: 0.10 })
    expect(hA[0].x).toBe(0)
    expect(hA[1].x).toBe(10)
    expect(hB[0].x).toBe(30)
    expect(hB[1].x).toBe(40)
  })

  it('respecte maxDisplacementM (sécurité)', () => {
    // Cluster avec coords très étalées : la médiane ferait bouger certains
    // sommets de >25cm → ils doivent rester à leur valeur d'origine.
    const a = [{ x: 0, y: 0 }, { x: 10.0, y: 0 }]
    const b = [{ x: 10.5, y: 0 }, { x: 20, y: 0 }]
    const [hA, hB] = harmonizePolygons([a, b], { toleranceM: 0.6, maxDisplacementM: 0.10 })
    // 10.0 et 10.5 différent de 50cm → médiane 10.25 → drift 25cm > 10cm → reject
    expect(hA[1].x).toBe(10.0)
    expect(hB[0].x).toBe(10.5)
  })

  it('liste vide → retourne tableau vide', () => {
    expect(harmonizePolygons([])).toEqual([])
  })

  it('médiane sur 3+ valeurs proches', () => {
    const a = [{ x: 5.00, y: 0 }, { x: 5.05, y: 1 }, { x: 5.08, y: 2 }]
    const [h] = harmonizePolygons([a], { toleranceM: 0.15 })
    // Les 3 X (5.00, 5.05, 5.08) clusterisent → médiane 5.05
    expect(h[0].x).toEqual(h[1].x)
    expect(h[1].x).toEqual(h[2].x)
    expect(h[0].x).toBeCloseTo(5.05, 2)
  })
})
