// Tests F-009 : determinisme du dataset benchmark + sanite du forest.
import { describe, it, expect } from 'vitest'
import {
  generateBenchmarkDataset,
  trainRevenueForest,
  predictRevenue,
  type LocalFeatures,
} from '../../modules/cosmos-angre/vol1-commercial/engines/revenueForestEngine'

describe('revenueForestEngine F-009 — determinisme', () => {
  it('generateBenchmarkDataset est deterministe (seed fixe 42)', () => {
    const a = generateBenchmarkDataset()
    const b = generateBenchmarkDataset()
    expect(a.features.length).toBe(b.features.length)
    expect(a.revenuesPerSqm).toEqual(b.revenuesPerSqm)
  })
})

describe('revenueForestEngine — sanite predictions', () => {
  it('predit un revenu positif sur un local plausible', () => {
    // Sous-echantillon pour rester sous le timeout vitest (split O(N²) couteux).
    const { features: allF, revenuesPerSqm: allR } = generateBenchmarkDataset()
    const features = allF.slice(0, 100)
    const revenuesPerSqm = allR.slice(0, 100)
    const forest = trainRevenueForest(features, revenuesPerSqm, { nTrees: 8, maxDepth: 3 })
    const f: LocalFeatures = {
      surfaceSqm: 80, category: 'mode', floorLevel: 0,
      distanceToEntranceM: 20, distanceToAnchorM: 40, distanceToCompetitorsM: 30,
      visibilityScore: 0.7, frontageLengthM: 8, footfallScore: 0.6,
      neighborhoodDiversity: 0.5, accessPmr: 1, cornerLocation: 0,
      elevatorProximityM: 20, parkingProximityM: 80,
    }
    const p = predictRevenue(forest, f)
    expect(p.revenuePerYearFcfa).toBeGreaterThan(0)
    expect(p.revenuePerSqmFcfa).toBeGreaterThan(0)
    expect(p.ci80Low).toBeLessThanOrEqual(p.revenuePerYearFcfa)
    expect(p.ci80High).toBeGreaterThanOrEqual(p.revenuePerYearFcfa)
  })

  it('renvoie au plus 3 contributeurs top', () => {
    const { features: allF, revenuesPerSqm: allR } = generateBenchmarkDataset()
    const features = allF.slice(0, 80)
    const revenuesPerSqm = allR.slice(0, 80)
    const forest = trainRevenueForest(features, revenuesPerSqm, { nTrees: 5, maxDepth: 3 })
    const p = predictRevenue(forest, features[0])
    expect(p.topContributors.length).toBeLessThanOrEqual(3)
  })
})
