import { describe, it, expect } from 'vitest'
import { MigrationHeuristics, type LegacyEntity } from '../../../packages/spatial-core/src/migration/MigrationHeuristics'

const h = new MigrationHeuristics()

const polyEntity = (label: string, area = 100): LegacyEntity => {
  const side = Math.sqrt(area)
  return {
    id: 'l-' + label.replace(/\s/g, '-'),
    projectId: 'cosmos-angre',
    type: 'WALL',
    geometry: { outer: [{ x: 0, y: 0 }, { x: side, y: 0 }, { x: side, y: side }, { x: 0, y: side }] },
    label,
    createdAt: '2026-04-25', updatedAt: '2026-04-25',
  }
}

describe('MigrationHeuristics — règle 1 boutiques', () => {
  it('label boutique + aire valide → BOUTIQUE_BOUNDARY high', () => {
    const r = h.classify(polyEntity('Boutique LACOSTE', 250), 'mall_vol1')
    expect(r.newType).toBe('BOUTIQUE_BOUNDARY')
    expect(r.confidence).toBe('high')
  })
})

describe('MigrationHeuristics — règle 2 voies piétonnes', () => {
  it('label "mall central" → PEDESTRIAN_PATH', () => {
    const r = h.classify(polyEntity('Mall central'), 'mall_vol1')
    expect(r.newType).toBe('PEDESTRIAN_PATH')
  })
})

describe('MigrationHeuristics — règle 3 routes', () => {
  it('label parking → PARKING_SPACE', () => {
    const r = h.classify(polyEntity('Parking C5'), 'mall_vol1')
    expect(r.newType).toBe('PARKING_SPACE')
  })
  it('label voirie → VEHICLE_ROAD', () => {
    const r = h.classify(polyEntity('Voirie principale'), 'mall_vol1')
    expect(r.newType).toBe('VEHICLE_ROAD')
  })
})

describe('MigrationHeuristics — règle 4 espaces verts', () => {
  it('label jardin → GREEN_AREA', () => {
    const r = h.classify(polyEntity('Jardin'), 'mall_vol1')
    expect(r.newType).toBe('GREEN_AREA')
  })
})

describe('MigrationHeuristics — règle 5 terre-pleins', () => {
  it('label terre-plein → TERRE_PLEIN', () => {
    const r = h.classify(polyEntity('TERRE PLEIN'), 'mall_vol1')
    expect(r.newType).toBe('TERRE_PLEIN')
  })
})

describe('MigrationHeuristics — règle 7 Vol.2 safety', () => {
  it('label "issue de secours" → EMERGENCY_EXIT', () => {
    const r = h.classify(polyEntity('Issue de secours'), 'mall_vol2')
    expect(r.newType).toBe('EMERGENCY_EXIT')
  })
  it('label "RIA" → RIA', () => {
    const r = h.classify(polyEntity('RIA niveau 1'), 'mall_vol2')
    expect(r.newType).toBe('RIA')
  })
  it('label "désenfumage" → SMOKE_EXTRACTION', () => {
    const r = h.classify(polyEntity('Désenfumage zone A'), 'mall_vol2')
    expect(r.newType).toBe('SMOKE_EXTRACTION')
  })
})

describe('MigrationHeuristics — règle 9 Vol.4 wayfinder', () => {
  it('label "totem" → WAYFINDER_TOTEM', () => {
    const r = h.classify(polyEntity('Totem entrée nord'), 'mall_vol4')
    expect(r.newType).toBe('WAYFINDER_TOTEM')
  })
  it('label "ascenseur" → ELEVATOR', () => {
    const r = h.classify(polyEntity('Ascenseur A'), 'mall_vol4')
    expect(r.newType).toBe('ELEVATOR')
  })
  it('label "PMR" → PMR_PATH', () => {
    const r = h.classify(polyEntity('Cheminement PMR'), 'mall_vol4')
    expect(r.newType).toBe('PMR_PATH')
  })
})

describe('MigrationHeuristics — règle 10 WiseFM', () => {
  it('label "CVC" → EQUIPMENT_HVAC', () => {
    const r = h.classify(polyEntity('Local CVC R+1'), 'wisefm')
    expect(r.newType).toBe('EQUIPMENT_HVAC')
  })
  it('label "vanne" → VALVE', () => {
    const r = h.classify(polyEntity('Vanne arrivée eau'), 'wisefm')
    expect(r.newType).toBe('VALVE')
  })
})

describe('MigrationHeuristics — règle 11 Atlas Lease', () => {
  it('label "partie privative" → LEASE_LOT_PRIVATE', () => {
    const r = h.classify(polyEntity('Partie privative lot 23'), 'atlas_lease')
    expect(r.newType).toBe('LEASE_LOT_PRIVATE')
  })
})

describe('MigrationHeuristics — fallback', () => {
  it('label inconnu → manual_review_needed', () => {
    const r = h.classify(polyEntity('XYZ123 mystérieux'), 'mall_vol1')
    expect(r.confidence).toBe('manual_review_needed')
    expect(r.alternativeTypes.length).toBeGreaterThan(0)
  })
})
