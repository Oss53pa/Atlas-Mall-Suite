// ═══ SCENARIO ENGINE — A/B comparison of configurations ═══

import type { Zone, Camera, Door, POI, SignageItem, TransitionNode } from '../proph3t/types'

// ── Types ────────────────────────────────────────────────────

export interface ScenarioSnapshot {
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  pois: POI[]
  signageItems: SignageItem[]
  transitions: TransitionNode[]
}

export interface ScenarioMetrics {
  // Vol.1
  occupancyRate: number
  projectedRevenueFcfa: number
  tenantMixScore: number
  // Vol.2
  securityScore: number
  cameraCoverage: number
  capexTotalFcfa: number
  cameraCount: number
  doorCount: number
  // Vol.3
  poiCount: number
  signageCount: number
  // Global
  proph3tScore: number
}

export interface AtlasScenario {
  id: string
  name: string
  description: string
  createdAt: string
  snapshot: ScenarioSnapshot
  metrics: ScenarioMetrics
  isActive: boolean
}

export interface ScenarioComparison {
  metricKey: keyof ScenarioMetrics
  label: string
  unit: string
  valueA: number
  valueB: number
  delta: number
  deltaPct: number
  winner: 'A' | 'B' | 'tie'
}

// ── Metric labels ────────────────────────────────────────────

const METRIC_CONFIG: Record<keyof ScenarioMetrics, { label: string; unit: string; higherIsBetter: boolean }> = {
  occupancyRate:        { label: 'Taux d\'occupation',      unit: '%',    higherIsBetter: true },
  projectedRevenueFcfa: { label: 'Revenu projete',          unit: 'FCFA', higherIsBetter: true },
  tenantMixScore:       { label: 'Score mix enseigne',      unit: '/100', higherIsBetter: true },
  securityScore:        { label: 'Score securite',          unit: '/100', higherIsBetter: true },
  cameraCoverage:       { label: 'Couverture cameras',      unit: '%',    higherIsBetter: true },
  capexTotalFcfa:       { label: 'CAPEX total',             unit: 'FCFA', higherIsBetter: false },
  cameraCount:          { label: 'Nb cameras',              unit: '',     higherIsBetter: false },
  doorCount:            { label: 'Nb portes',               unit: '',     higherIsBetter: false },
  poiCount:             { label: 'Points d\'interet',       unit: '',     higherIsBetter: true },
  signageCount:         { label: 'Signaletique',            unit: '',     higherIsBetter: true },
  proph3tScore:         { label: 'Score Proph3t global',    unit: '/100', higherIsBetter: true },
}

// ── Compute metrics from snapshot ────────────────────────────

export function computeScenarioMetrics(snapshot: ScenarioSnapshot): ScenarioMetrics {
  const cameraCount = snapshot.cameras.length
  const doorCount = snapshot.doors.length
  const zoneCount = snapshot.zones.length

  // Simplified coverage: % of zones with at least one camera nearby
  const coveredZones = snapshot.zones.filter((z) =>
    snapshot.cameras.some(
      (c) => c.floorId === z.floorId &&
        c.x >= z.x - 10 && c.x <= z.x + z.w + 10 &&
        c.y >= z.y - 10 && c.y <= z.y + z.h + 10
    )
  ).length
  const cameraCoverage = zoneCount > 0 ? Math.round((coveredZones / zoneCount) * 100) : 0

  const capexTotalFcfa = [
    ...snapshot.cameras.map((c) => c.capexFcfa ?? 0),
    ...snapshot.doors.map((d) => d.capexFcfa ?? 0),
  ].reduce((s, v) => s + v, 0)

  // Security score simplified
  const exitCount = snapshot.doors.filter((d) => d.isExit).length
  const securityScore = Math.min(100, Math.round(
    (Math.min(cameraCount, 120) / 120) * 40 +
    (cameraCoverage / 100) * 30 +
    (Math.min(exitCount, 5) / 5) * 20 +
    (doorCount > 0 ? 10 : 0)
  ))

  return {
    occupancyRate: 0,       // Computed from Vol.1 store if available
    projectedRevenueFcfa: 0,
    tenantMixScore: 0,
    securityScore,
    cameraCoverage,
    capexTotalFcfa,
    cameraCount,
    doorCount,
    poiCount: snapshot.pois.length,
    signageCount: snapshot.signageItems.length,
    proph3tScore: Math.round(securityScore * 0.4 + cameraCoverage * 0.3 + Math.min(100, snapshot.pois.length * 5) * 0.3),
  }
}

// ── Compare two scenarios ────────────────────────────────────

export function compareScenarios(
  scenarioA: AtlasScenario,
  scenarioB: AtlasScenario
): ScenarioComparison[] {
  const keys = Object.keys(METRIC_CONFIG) as (keyof ScenarioMetrics)[]

  return keys.map((key) => {
    const config = METRIC_CONFIG[key]
    const valueA = scenarioA.metrics[key]
    const valueB = scenarioB.metrics[key]
    const delta = valueB - valueA
    const deltaPct = valueA !== 0 ? Math.round((delta / valueA) * 100) : 0

    let winner: 'A' | 'B' | 'tie' = 'tie'
    if (delta !== 0) {
      winner = (delta > 0) === config.higherIsBetter ? 'B' : 'A'
    }

    return { metricKey: key, label: config.label, unit: config.unit, valueA, valueB, delta, deltaPct, winner }
  })
}

// ── Create scenario from current state ───────────────────────

export function createScenario(
  name: string,
  description: string,
  snapshot: ScenarioSnapshot
): AtlasScenario {
  return {
    id: `scenario-${Date.now()}`,
    name,
    description,
    createdAt: new Date().toISOString(),
    snapshot,
    metrics: computeScenarioMetrics(snapshot),
    isActive: false,
  }
}
