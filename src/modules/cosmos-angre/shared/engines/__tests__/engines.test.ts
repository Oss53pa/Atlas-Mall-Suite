// ═══ ENGINES TESTS — Coverage, signage, finance (M09, M10, M12) ═══

import { describe, it, expect } from 'vitest'
import { optimizeCoverage } from '../coverageOptimizer'
import { optimizeSignage } from '../signageOptimizer'
import { computePortfolioMetrics, formatFcfa, formatYears } from '../realEstateFinance'

describe('coverageOptimizer', () => {
  it('propose au moins une caméra sur un plan simple', () => {
    const res = optimizeCoverage({
      planWidth: 40, planHeight: 30,
      spaces: [{
        id: 'hall',
        type: 'commerce',
        polygon: [[5, 5], [35, 5], [35, 25], [5, 25]],
      }],
      budget: 3,
      defaultRangeM: 10, defaultFovDeg: 90, gridStepM: 1.5,
    })
    expect(res.proposed.length).toBeGreaterThan(0)
    expect(res.proposed.length).toBeLessThanOrEqual(3)
    expect(res.finalCoveragePct).toBeGreaterThan(30)
  })

  it('respecte le budget maximum', () => {
    const res = optimizeCoverage({
      planWidth: 20, planHeight: 20,
      spaces: [{ id: 's', type: 'commerce', polygon: [[0, 0], [20, 0], [20, 20], [0, 20]] }],
      budget: 2,
    })
    expect(res.proposed.length).toBeLessThanOrEqual(2)
  })

  it('ne propose rien si budget 0', () => {
    const res = optimizeCoverage({
      planWidth: 20, planHeight: 20,
      spaces: [{ id: 's', type: 'commerce', polygon: [[0, 0], [20, 0], [20, 20], [0, 20]] }],
      budget: 0,
    })
    expect(res.proposed).toEqual([])
  })
})

describe('signageOptimizer', () => {
  it('propose des panneaux dans les circulations', () => {
    const res = optimizeSignage({
      circulations: [{
        id: 'mall',
        type: 'circulation',
        polygon: [[0, 0], [60, 0], [60, 10], [0, 10]],
        areaSqm: 600,
      }],
      pois: [
        { id: 'carrefour', label: 'Carrefour', x: 5, y: 5, priority: 1 },
        { id: 'food', label: 'Food court', x: 55, y: 5, priority: 1 },
      ],
      planBounds: { width: 60, height: 10 },
      targetDensityPer100Sqm: 1,
      visibilityRadiusM: 10,
    })
    expect(res.proposed.length).toBeGreaterThan(0)
    expect(res.coveragePct).toBeGreaterThanOrEqual(0)
    expect(res.coveragePct).toBeLessThanOrEqual(100)
  })

  it('ignore les espaces non-circulation', () => {
    const res = optimizeSignage({
      circulations: [{
        id: 'shop',
        type: 'commerce', // <- pas une circulation
        polygon: [[0, 0], [10, 0], [10, 10], [0, 10]],
        areaSqm: 100,
      }],
      pois: [],
      planBounds: { width: 10, height: 10 },
    })
    expect(res.proposed.length).toBe(0)
  })
})

describe('realEstateFinance', () => {
  it('calcule GRI, ERI, NOI correctement', () => {
    const m = computePortfolioMetrics({
      leases: [
        { id: '1', lotId: 'l1', areaSqm: 100, startDate: '2024-01-01', endDate: '2028-01-01', annualRentFcfaM2: undefined as any, annualRentFcfa: 12_000_000 } as any,
        { id: '2', lotId: 'l2', areaSqm: 50, startDate: '2024-01-01', endDate: '2026-01-01', annualRentFcfa: 6_000_000 },
      ],
      opex: { maintenanceFcfa: 2_000_000, managementFcfa: 1_000_000 },
      vacancyRate: 0.1,
    })
    expect(m.griFcfa).toBe(18_000_000)
    expect(m.eriFcfa).toBeCloseTo(16_200_000, 0) // 18M * 0.9
    expect(m.opexFcfa).toBe(3_000_000)
    expect(m.noiFcfa).toBeCloseTo(13_200_000, 0)
  })

  it('calcule WALE pondéré par loyer', () => {
    const m = computePortfolioMetrics({
      valuationDate: '2026-01-01',
      leases: [
        { id: '1', lotId: 'l1', areaSqm: 100, startDate: '2024-01-01', endDate: '2030-01-01', annualRentFcfa: 10_000_000 },
        { id: '2', lotId: 'l2', areaSqm: 100, startDate: '2024-01-01', endDate: '2028-01-01', annualRentFcfa: 10_000_000 },
      ],
    })
    // Bail 1 : 4 ans restants, Bail 2 : 2 ans → moyenne pondérée par loyer égal = 3 ans
    expect(m.waleYears).toBeCloseTo(3, 1)
  })

  it('compte les baux expirant < 12 mois', () => {
    const m = computePortfolioMetrics({
      valuationDate: '2026-01-01',
      leases: [
        { id: '1', lotId: 'l1', areaSqm: 100, startDate: '2024-01-01', endDate: '2026-06-01', annualRentFcfa: 1_000_000 },
        { id: '2', lotId: 'l2', areaSqm: 100, startDate: '2024-01-01', endDate: '2030-01-01', annualRentFcfa: 1_000_000 },
      ],
    })
    expect(m.expiringIn12Months).toBe(1)
  })

  it('cap rate optionnel quand assetValue fourni', () => {
    const m = computePortfolioMetrics({
      leases: [{ id: '1', lotId: 'l1', areaSqm: 100, startDate: '2024-01-01', endDate: '2028-01-01', annualRentFcfa: 10_000_000 }],
      assetValueFcfa: 100_000_000,
      vacancyRate: 0,
    })
    // NOI = 10M - 0 opex = 10M. Cap rate = 10M/100M = 10%
    expect(m.capRatePct).toBeCloseTo(10, 1)
  })

  it('formatFcfa lisible', () => {
    expect(formatFcfa(1_500_000_000)).toBe('1.50 Md FCFA')
    expect(formatFcfa(2_500_000)).toBe('2.5 M FCFA')
    expect(formatFcfa(8_000)).toBe('8 k FCFA')
    expect(formatFcfa(500)).toBe('500 FCFA')
  })

  it('formatYears lisible', () => {
    expect(formatYears(3.5)).toBe('3 ans 6 mois')
    expect(formatYears(1)).toBe('1 an')
    expect(formatYears(2)).toBe('2 ans')
    expect(formatYears(0.25)).toBe('3 mois')
  })
})
