import { describe, it, expect } from 'vitest'
import { scoreSecurite, calcDistance, calcArea, recommendDoor } from '../modules/cosmos-angre/shared/proph3t/engine'
import type { Zone, Camera, Door } from '../modules/cosmos-angre/shared/proph3t/types'

const mockZone = (overrides: Partial<Zone> = {}): Zone => ({
  id: 'z1', floorId: 'f1', label: 'Test', type: 'commerce',
  x: 0.1, y: 0.1, w: 0.3, h: 0.3, niveau: 2, color: '#000',
  ...overrides,
} as Zone)

const mockCam = (overrides: Partial<Camera> = {}): Camera => ({
  id: 'c1', floorId: 'f1', label: 'Cam1', model: 'XNV-8080R',
  x: 0.2, y: 0.2, angle: 270, fov: 109, range: 0.12, rangeM: 14,
  color: '#3b82f6', priority: 'normale', autoPlaced: false, capexFcfa: 850000,
  ...overrides,
} as Camera)

const mockDoor = (overrides: Partial<Door> = {}): Door => ({
  id: 'd1', floorId: 'f1', label: 'Porte', zoneType: 'commerce',
  isExit: false, hasBadge: false, hasBiometric: false, hasSas: false,
  ref: 'DORMA ES200', normRef: 'NF EN 16005', note: '', widthM: 0.9, capexFcfa: 1200000,
  x: 0.15, y: 0.1,
  ...overrides,
} as Door)

describe('scoreSecurite', () => {
  it('retourne un score bas avec des donnees vides', () => {
    const score = scoreSecurite([], [], [], [])
    expect(score.total).toBeLessThanOrEqual(40)
    expect(score.issues.length).toBeGreaterThan(0)
  })

  it('detecte le manque de sorties de secours', () => {
    const score = scoreSecurite([mockZone()], [mockCam()], [mockDoor()], [])
    expect(score.issues.some((i: string) => i.toLowerCase().includes('sortie') || i.toLowerCase().includes('exit') || i.toLowerCase().includes('secours'))).toBe(true)
  })

  it('ne depasse pas 100', () => {
    const cameras = Array.from({ length: 30 }, (_, i) => mockCam({ id: `c${i}` }))
    const exits = Array.from({ length: 5 }, (_, i) => mockDoor({ id: `d${i}`, isExit: true }))
    const zones = Array.from({ length: 5 }, (_, i) => mockZone({ id: `z${i}` }))
    const score = scoreSecurite(zones, cameras, exits, exits)
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('ameliore le score avec plus de cameras', () => {
    const s1 = scoreSecurite([mockZone()], [mockCam()], [mockDoor({ isExit: true })], [mockDoor({ isExit: true })])
    const s2 = scoreSecurite(
      [mockZone()],
      Array.from({ length: 10 }, (_, i) => mockCam({ id: `c${i}` })),
      [mockDoor({ isExit: true })],
      [mockDoor({ isExit: true })]
    )
    expect(s2.total).toBeGreaterThanOrEqual(s1.total)
  })
})

describe('calcDistance', () => {
  it('calcule une distance correcte (Pythagore)', () => {
    const d = calcDistance(0, 0, 1, 0, 100, 80)
    expect(d).toBe(100)
  })

  it('retourne 0 pour deux points identiques', () => {
    expect(calcDistance(0.5, 0.5, 0.5, 0.5)).toBe(0)
  })
})

describe('calcArea', () => {
  it('calcule correctement la surface', () => {
    const area = calcArea(mockZone({ w: 0.1, h: 0.1 }), 200, 140)
    expect(area).toBeCloseTo(280, 0)
  })
})

describe('recommendDoor', () => {
  it('recommande une porte anti-panique pour les sorties de secours', () => {
    const rec = recommendDoor(mockZone({ type: 'sortie_secours' }))
    expect(rec.ref).toBe('ASSA ABLOY PB1000')
    expect(rec.hasBadge).toBe(false)
  })

  it('recommande un SAS pour les zones financieres', () => {
    const rec = recommendDoor(mockZone({ type: 'financier' }))
    expect(rec.hasSas).toBe(true)
    expect(rec.hasBiometric).toBe(true)
  })

  it('ne retourne jamais undefined', () => {
    const types = ['parking', 'commerce', 'restauration', 'circulation', 'technique', 'backoffice', 'financier', 'sortie_secours', 'loisirs', 'services', 'hotel', 'bureaux', 'exterieur'] as const
    for (const type of types) {
      const rec = recommendDoor(mockZone({ type }))
      expect(rec).toBeDefined()
      expect(rec.ref.length).toBeGreaterThan(0)
    }
  })
})
