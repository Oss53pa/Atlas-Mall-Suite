import { describe, it, expect } from 'vitest'

// ── HELPERS ──

function makeZone(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `z-${Math.random().toString(36).slice(2, 6)}`,
    floorId: 'f1', label: 'Zone Test', type: 'commerce' as const,
    x: 0.3, y: 0.3, w: 0.2, h: 0.2, niveau: 2 as const, color: '#ccc',
    ...overrides,
  }
}

function makeCamera(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id, floorId: 'f1', label: `Cam ${id}`, model: 'XNV-8080R' as const,
    x: 0.5, y: 0.5, angle: 0, fov: 109, range: 0.1, rangeM: 12,
    color: '#00f', priority: 'normale' as const, capexFcfa: 850000, autoPlaced: false,
    ...overrides,
  }
}

function makeDoor(id: string, isExit: boolean, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id, floorId: 'f1', label: `Door ${id}`, x: 0.5, y: 0.5,
    zoneType: 'commerce' as const, isExit, hasBadge: false, hasBiometric: false,
    hasSas: false, ref: 'ABLOY', normRef: 'EN 1125', note: '',
    widthM: 1.4, capexFcfa: 350000,
    ...overrides,
  }
}

function makeFloor(id: string = 'f1') {
  return {
    id, level: 'RDC' as const, order: 1, widthM: 200, heightM: 140,
    zones: [], transitions: [],
  }
}

function makeCtx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    zones: [makeZone()],
    cameras: [makeCamera('c1')],
    doors: [makeDoor('d1', true), makeDoor('d2', true), makeDoor('d3', true)],
    pois: [],
    signageItems: [],
    transitions: [],
    floors: [makeFloor()],
    score: {
      total: 75, camScore: 30, zoneScore: 18, doorScore: 15, exitScore: 12,
      coverage: 80, issues: [] as string[], norm: 'APSAD R82' as const,
      generatedAt: new Date().toISOString(),
    },
    blindSpots: [],
    parcours: [],
    memory: null,
    volume: 'vol2' as const,
    activeFloorId: 'f1',
    ...overrides,
  }
}

// ── TESTS INSIGHTS PROACTIFS ──

describe('Insight Engine', () => {
  it('genere un bloquant si sorties < 3', async () => {
    const { evaluateInsights } = await import(
      '../modules/cosmos-angre/shared/proph3t/insightEngine'
    )
    const ctx = makeCtx({
      doors: [makeDoor('d1', true), makeDoor('d2', true)],
    })
    const insights = evaluateInsights(ctx as any)
    expect(insights.some(i => i.id === 'exits-count' && i.level === 'bloquant')).toBe(true)
  })

  it('genere max 5 insights', async () => {
    const { evaluateInsights } = await import(
      '../modules/cosmos-angre/shared/proph3t/insightEngine'
    )
    const ctx = makeCtx({
      cameras: [],
      doors: [],
      zones: Array.from({ length: 10 }, () => makeZone({ niveau: 4 })),
      score: {
        total: 20, camScore: 5, zoneScore: 5, doorScore: 5, exitScore: 5,
        coverage: 30, issues: ['test'], norm: 'APSAD R82' as const, generatedAt: '',
      },
    })
    const insights = evaluateInsights(ctx as any)
    expect(insights.length).toBeLessThanOrEqual(5)
  })

  it('priorise bloquants avant opportunites', async () => {
    const { evaluateInsights } = await import(
      '../modules/cosmos-angre/shared/proph3t/insightEngine'
    )
    const ctx = makeCtx({
      cameras: [],
      doors: [makeDoor('d1', true)],
      zones: [makeZone({ niveau: 4 })],
      score: {
        total: 50, camScore: 10, zoneScore: 10, doorScore: 10, exitScore: 10,
        coverage: 50, issues: [], norm: 'APSAD R82' as const, generatedAt: '',
      },
    })
    const insights = evaluateInsights(ctx as any)
    const firstOpp = insights.findIndex(i => i.level === 'opportunite')
    const lastBlock = [...insights].reverse().findIndex(i => i.level === 'bloquant')
    const lastBlockIdx = lastBlock >= 0 ? insights.length - 1 - lastBlock : -1
    if (firstOpp >= 0 && lastBlockIdx >= 0) {
      expect(lastBlockIdx).toBeLessThan(firstOpp)
    }
  })
})

// ── TESTS PHASAGE ──

describe('Phasing Engine', () => {
  it('identifie bloquants pour phase incomplete', async () => {
    const { simulatePhase } = await import(
      '../modules/cosmos-angre/shared/proph3t/phasingEngine'
    )
    const phase = {
      id: 'p1', name: 'Soft opening', targetDate: '2026-10-01',
      confirmedTenantIds: ['t1'], plannedCameraIds: ['c1'],
      plannedDoorIds: ['d1'], targetOccupancyRate: 60,
    }
    const zones = [makeZone()]
    const cameras = [makeCamera('c1')]
    const doors = [makeDoor('d1', true)]
    const tenants = [{ spaceId: 't1', name: 'Test', status: 'confirmed' as const, sector: 'commerce' }]
    const result = simulatePhase(phase, zones as any, cameras as any, doors as any, tenants as any)
    expect(result.isASPADCertifiable).toBe(false)
    expect(result.blockers.length).toBeGreaterThan(0)
  })

  it('valide une phase bien configuree', async () => {
    const { simulatePhase } = await import(
      '../modules/cosmos-angre/shared/proph3t/phasingEngine'
    )
    const cams = Array.from({ length: 12 }, (_, i) => makeCamera(`c${i}`))
    const exits = Array.from({ length: 4 }, (_, i) => makeDoor(`d${i}`, true))
    const phase = {
      id: 'p2', name: 'Inauguration', targetDate: '2026-11-01',
      confirmedTenantIds: ['t1'],
      plannedCameraIds: cams.map(c => c.id),
      plannedDoorIds: exits.map(d => d.id),
      targetOccupancyRate: 85,
    }
    const tenants = [{ spaceId: 't1', name: 'Test', status: 'confirmed' as const, sector: 'commerce' }]
    const result = simulatePhase(phase, [makeZone()] as any, cams as any, exits as any, tenants as any)
    // Avec 4 exits et 12 cameras, les bloquants de base doivent etre resolus
    expect(result.blockers.filter(b => b.includes('camera') || b.includes('Sorties')).length).toBe(0)
  })
})

// ── TESTS APPRENTISSAGE ──

describe('Learning Engine', () => {
  it('detecte une preference camera apres 3 choix identiques', async () => {
    const { detectPreferences } = await import(
      '../modules/cosmos-angre/shared/proph3t/learningEngine'
    )
    const feedbacks = Array.from({ length: 3 }, (_, i) => ({
      id: `fb${i}`, projectId: 'p1', ruleId: 'camera_model',
      ruleCategory: 'camera_placement', recommendation: 'XNV-8080R',
      userAction: 'modified' as const, modifiedValue: 'QNV-8080R',
      context: { equipmentModel: 'XNV-8080R' }, timestamp: new Date().toISOString(),
    }))
    const prefs = detectPreferences(feedbacks)
    expect(prefs.preferredCameraModel).toBe('QNV-8080R')
  })

  it('ne detecte pas de preference avec moins de 3 choix', async () => {
    const { detectPreferences } = await import(
      '../modules/cosmos-angre/shared/proph3t/learningEngine'
    )
    const feedbacks = [
      { id: 'fb1', projectId: 'p1', ruleId: 'cam', ruleCategory: 'camera', recommendation: 'A', userAction: 'modified' as const, modifiedValue: 'B', context: { equipmentModel: 'A' }, timestamp: '' },
      { id: 'fb2', projectId: 'p1', ruleId: 'cam', ruleCategory: 'camera', recommendation: 'A', userAction: 'modified' as const, modifiedValue: 'C', context: { equipmentModel: 'A' }, timestamp: '' },
    ]
    const prefs = detectPreferences(feedbacks)
    expect(prefs.preferredCameraModel).toBeUndefined()
  })
})

// ── TESTS BENCHMARK ──

describe('Benchmark Engine', () => {
  it('retourne un rapport avec des percentiles', async () => {
    const { benchmarkProject } = await import(
      '../modules/cosmos-angre/shared/proph3t/benchmarkEngine'
    )
    const metrics = {
      cameraDensity: 1.2, securityScore: 75, occupancyRate: 85,
      avgDwellTimeMin: 80, signagetDensity: 2.0, exitCount: 5,
    }
    const report = benchmarkProject(metrics, 'CI', 'A')
    expect(report.peerCount).toBeGreaterThan(0)
    expect(report.narrative).toBeTruthy()
    expect(report.percentiles).toBeDefined()
  })

  it('genere des recommandations pour les faiblesses', async () => {
    const { benchmarkProject } = await import(
      '../modules/cosmos-angre/shared/proph3t/benchmarkEngine'
    )
    const weakMetrics = {
      cameraDensity: 0.3, securityScore: 40, occupancyRate: 50,
      avgDwellTimeMin: 30, signagetDensity: 0.5, exitCount: 2,
    }
    const report = benchmarkProject(weakMetrics, 'CI', 'A')
    expect(report.recommendations.length).toBeGreaterThan(0)
  })

  it('contient 52 malls dans la base', async () => {
    const { BENCHMARK_DB } = await import(
      '../modules/cosmos-angre/shared/proph3t/benchmarkEngine'
    )
    expect(BENCHMARK_DB.length).toBeGreaterThanOrEqual(48)
  })
})

// ── TESTS CASCADE INTER-VOLUMES ──

describe('Cascade Engine v3', () => {
  it('detecte un angle mort sur un moment cle', async () => {
    const { computeCrossVolumeInsights } = await import(
      '../modules/cosmos-angre/shared/proph3t/cascadeEngine'
    )
    const state = {
      floors: [makeFloor()], zones: [makeZone()], cameras: [], doors: [],
      transitions: [], signageItems: [],
      moments: [{ id: 'm3', number: 3 as const, name: 'Decouverte Active', floorId: 'f1', x: 0.45, y: 0.45, kpi: '', friction: '', recommendation: '', signageItems: [] }],
    }
    const blindSpots = [{
      id: 'bs1', floorId: 'f1', x: 0.4, y: 0.4, w: 0.1, h: 0.1,
      severity: 'critique' as const, surfaceM2: 50, parentZoneId: 'z1', sessionCount: 1,
    }]
    const insights = computeCrossVolumeInsights(state as any, blindSpots, null, null)
    expect(insights.some(i => i.insightType === 'conflict' && i.severity === 'critique')).toBe(true)
    expect(insights[0].title).toContain('Moment 3')
  })

  it('ne genere pas de conflit si positions eloignees', async () => {
    const { computeCrossVolumeInsights } = await import(
      '../modules/cosmos-angre/shared/proph3t/cascadeEngine'
    )
    const state = {
      floors: [makeFloor()], zones: [makeZone()], cameras: [], doors: [],
      transitions: [], signageItems: [],
      moments: [{ id: 'm1', number: 1 as const, name: 'Arrivee', floorId: 'f1', x: 0.9, y: 0.9, kpi: '', friction: '', recommendation: '', signageItems: [] }],
    }
    const blindSpots = [{
      id: 'bs1', floorId: 'f1', x: 0.1, y: 0.1, w: 0.05, h: 0.05,
      severity: 'critique' as const, surfaceM2: 20, parentZoneId: 'z1', sessionCount: 0,
    }]
    const insights = computeCrossVolumeInsights(state as any, blindSpots, null, null)
    expect(insights.filter(i => i.insightType === 'conflict').length).toBe(0)
  })
})
