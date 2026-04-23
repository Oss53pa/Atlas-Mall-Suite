import { describe, it, expect } from 'vitest'
import { calculateSignaleticsSpec } from '../modules/building/shared/proph3t/signaleticsEngine'
import type { Zone } from '../modules/building/shared/proph3t/types'

const zone = (o: Partial<Zone> = {}): Zone => ({
  id: 'z1', floorId: 'f1', label: 'Test', type: 'circulation',
  x: 0.1, y: 0.1, w: 0.4, h: 0.3, niveau: 1, color: '#0a1a0a', lux: 300, ...o,
})

describe('calculateSignaleticsSpec — NF X 08-003', () => {

  it('taille texte = ceil(distance / 0.2)', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 4, 3.5, 0, 10)
    expect(spec.textHeightMm).toBe(50)
  })

  it('hauteur de pose = 1.60 + D * 0.268 (min 2.20m)', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 4, 4.0, 0, 5)
    expect(spec.poseHeightM).toBeCloseTo(2.94, 1)
    expect(spec.poseHeightM).toBeGreaterThanOrEqual(2.20)
  })

  it('minimum de pose 2.20m respecte', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 2, 3.0, 0, 1)
    expect(spec.poseHeightM).toBeGreaterThanOrEqual(2.20)
  })

  it('lumineux obligatoire si lux < 200', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone({ lux: 150 }), 4, 3.5, 0, 10)
    expect(spec.isLuminousRequired).toBe(true)
  })

  it('BAES obligatoire si lux < 50', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone({ lux: 30 }), 4, 3.5, 0, 10)
    expect(spec.isBAESRequired).toBe(true)
    expect(spec.isLuminousRequired).toBe(true)
  })

  it('pas de lumineux si lux >= 200', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone({ lux: 400 }), 4, 3.5, 0, 10)
    expect(spec.isLuminousRequired).toBe(false)
    expect(spec.isBAESRequired).toBe(false)
  })

  it('totem 5m pour plafond haut + longue distance', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 8, 5.5, 0, 25)
    expect(spec.recommendedType).toBe('totem_5m')
  })

  it('panneau mural pour couloir etroit', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 2, 2.8, 0, 8)
    expect(spec.recommendedType).toBe('panneau_dir_mural')
  })

  it('capexFcfa toujours > 0', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 4, 3.5, 0, 10)
    expect(spec.capexFcfa).toBeGreaterThan(0)
  })

  it('justification non vide', () => {
    const spec = calculateSignaleticsSpec({ x: 0.5, y: 0.5 }, zone(), 4, 3.5, 0, 10)
    expect(spec.justification.length).toBeGreaterThan(10)
  })
})
