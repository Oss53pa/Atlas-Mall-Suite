import { describe, it, expect } from 'vitest'
import {
  GeometryCorrector,
  RC0_AGGRESSIVE_CONFIG,
  PRECISION_CONFIG,
  MIGRATION_CONFIG,
} from '../../../packages/spatial-core/src/domain/GeometryCorrector'
import type { SpatialEntity } from '../../../packages/spatial-core/src/domain/SpatialEntity'

const baseEntity = (overrides: Partial<SpatialEntity> = {}): SpatialEntity => ({
  id: 'test-1',
  projectId: 'cosmos-angre',
  type: 'WALL_STRUCTURAL',
  level: 'rdc',
  geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] },
  extrusion: { enabled: true, height: 3, baseElevation: 0 },
  material: 'concrete_wall',
  snapBehavior: 'strong',
  mergeWithNeighbors: false,
  childrenIds: [],
  customProperties: {},
  createdAt: '2026-04-25T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
  createdBy: 'test',
  isAutoCorrected: false,
  correctionAuditTrail: [],
  ...overrides,
})

describe('GeometryCorrector', () => {
  describe('configurations', () => {
    it('RC0_AGGRESSIVE est plus permissive que PRECISION', () => {
      expect(RC0_AGGRESSIVE_CONFIG.endpointSnapDistanceM).toBeGreaterThan(PRECISION_CONFIG.endpointSnapDistanceM)
      expect(RC0_AGGRESSIVE_CONFIG.parallelDriftMaxM).toBeGreaterThan(PRECISION_CONFIG.parallelDriftMaxM)
    })
    it('MIGRATION est entre les deux', () => {
      expect(MIGRATION_CONFIG.endpointSnapDistanceM).toBeGreaterThan(PRECISION_CONFIG.endpointSnapDistanceM)
      expect(MIGRATION_CONFIG.endpointSnapDistanceM).toBeLessThan(RC0_AGGRESSIVE_CONFIG.endpointSnapDistanceM)
    })
  })

  describe('straightenWalls', () => {
    it('redresse un segment quasi-horizontal à 90°', () => {
      const c = new GeometryCorrector(RC0_AGGRESSIVE_CONFIG)
      const e = baseEntity({
        // Polygone avec 1er segment à 3° au lieu de 0°
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0.5 }, { x: 10, y: 5 }, { x: 0, y: 5 }] },
      })
      const r = c.correctEntity(e, [])
      expect(r.isAutoCorrected).toBe(true)
      const after = (r.geometry as { outer: { x: number; y: number }[] }).outer
      expect(after[1].y).toBeCloseTo(0, 5)
    })

    it('ne touche pas un segment loin de l\'orthogonalité', () => {
      const c = new GeometryCorrector(PRECISION_CONFIG)
      const e = baseEntity({
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 4 }, { x: 5, y: 8 }] }, // triangle à 21°
      })
      const r = c.correctEntity(e, [])
      const after = (r.geometry as { outer: { x: number; y: number }[] }).outer
      expect(after[1].x).toBeCloseTo(10, 5)
      expect(after[1].y).toBeCloseTo(4, 5)
    })
  })

  describe('snapEndpoints', () => {
    it('snap un endpoint sur un sommet voisin proche', () => {
      const c = new GeometryCorrector(RC0_AGGRESSIVE_CONFIG)
      const neighbor = baseEntity({
        id: 'neighbor',
        geometry: { outer: [{ x: 10.3, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }, { x: 10.3, y: 5 }] },
      })
      const e = baseEntity({
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] },
      })
      const r = c.correctEntity(e, [neighbor])
      const after = (r.geometry as { outer: { x: number; y: number }[] }).outer
      // x=10 a été snappé sur x=10.3 (distance 30cm < tol 80cm)
      expect(after[1].x).toBeCloseTo(10.3, 2)
    })
  })

  describe('closePolygon', () => {
    it('retire un dernier point dupliqué dans la tolérance', () => {
      const c = new GeometryCorrector(RC0_AGGRESSIVE_CONFIG)
      const e = baseEntity({
        // Premier et dernier sommets quasi-identiques (10cm)
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }, { x: 0.05, y: 0.05 }] },
      })
      const r = c.correctEntity(e, [])
      const after = (r.geometry as { outer: { x: number; y: number }[] }).outer
      expect(after.length).toBe(4)
    })
  })

  describe('audit trail', () => {
    it('enregistre chaque action avec before/after', () => {
      const c = new GeometryCorrector(RC0_AGGRESSIVE_CONFIG)
      const e = baseEntity({
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0.5 }, { x: 10, y: 5 }, { x: 0, y: 5 }] },
      })
      const r = c.correctEntity(e, [])
      expect(r.correctionAuditTrail.length).toBeGreaterThan(0)
      const a = r.correctionAuditTrail[0]
      expect(a.action).toBe('straighten')
      expect(a.beforeGeometry).toBeDefined()
      expect(a.afterGeometry).toBeDefined()
      expect(a.timestamp).toBeTruthy()
    })

    it('ne crée pas d\'entrée si rien n\'a changé', () => {
      const c = new GeometryCorrector(PRECISION_CONFIG)
      const e = baseEntity({
        geometry: { outer: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 0, y: 5 }] },
      })
      const r = c.correctEntity(e, [])
      expect(r.correctionAuditTrail.length).toBe(0)
      expect(r.isAutoCorrected).toBe(false)
    })
  })
})
