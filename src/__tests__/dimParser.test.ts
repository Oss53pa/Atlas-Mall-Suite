import { describe, it, expect } from 'vitest'
import { calibratePlanFromDims } from '../modules/cosmos-angre/shared/planReader/dimParser'
import type { DimEntity } from '../modules/cosmos-angre/shared/planReader/planReaderTypes'

const mockDim = (value: number, dist: number, overrides: Partial<DimEntity> = {}): DimEntity => ({
  id: `d-${Math.random()}`,
  type: 'lineaire', value, valueText: `${value}m`, unit: 'm',
  confidence: 0.9,
  defPoint1: [0, 0], defPoint2: [dist, 0],
  textPosition: [dist / 2, 0],
  measuredDistance: dist, layer: '0',
  ...overrides,
})

describe('calibratePlanFromDims', () => {
  const bounds = { minX: 0, minY: 0, maxX: 120000, maxY: 80000 }

  it('calibre correctement depuis des cotes coherentes (mm)', () => {
    const dims = [
      mockDim(14.5, 14500),
      mockDim(20.0, 20000),
      mockDim(8.0, 8000),
    ]
    const result = calibratePlanFromDims(dims, bounds)
    expect(result.method).toBe('dim_auto')
    expect(result.realWidthM).toBeCloseTo(120, 0)
    expect(result.confidence).toBeGreaterThan(0.3)
  })

  it('retourne un fallback si aucune cote fiable', () => {
    const result = calibratePlanFromDims([], bounds)
    expect(result.confidence).toBeLessThan(0.5)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('ne retourne jamais NaN', () => {
    const dims = [mockDim(5, 0)]
    const result = calibratePlanFromDims(dims, bounds)
    expect(isNaN(result.realWidthM)).toBe(false)
    expect(isNaN(result.scaleFactorX)).toBe(false)
  })
})
