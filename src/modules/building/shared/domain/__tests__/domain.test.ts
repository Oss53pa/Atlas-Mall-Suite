// ═══ DOMAIN TESTS — Canonical model + coordinates + events (M26) ═══

import { describe, it, expect, beforeEach } from 'vitest'
import { FloorLevel, parseFloorLevel, FLOOR_STACK_ORDER, sortByStackOrder } from '../FloorLevel'
import {
  metric, normalized, boundsM,
  metricToNormalized, normalizedToMetric,
  detectUnit, toMeters,
} from '../coordinates'
import {
  createLot, touchLot, lotId, LotType, LotStatus,
  withCommercial, hasCommercial, glaSqm, lotsOnFloor,
} from '../LotEntity'
import { eventBus, emitLotCreated, emitLotUpdated } from '../events'
import { lotFromDetectedSpace, commercialSpaceFromLot } from '../adapters'

describe('FloorLevel', () => {
  it('parse les variantes françaises courantes', () => {
    expect(parseFloorLevel('RDC')).toBe(FloorLevel.RDC)
    expect(parseFloorLevel('rez-de-chaussée')).toBe(FloorLevel.RDC)
    expect(parseFloorLevel('R+1')).toBe(FloorLevel.R1)
    expect(parseFloorLevel('B1')).toBe(FloorLevel.B1)
    expect(parseFloorLevel('Sous-sol 2')).toBe(FloorLevel.B2)
    expect(parseFloorLevel('PARKING')).toBe(FloorLevel.PARKING)
    expect(parseFloorLevel('Mezzanine')).toBe(FloorLevel.MEZZ)
  })

  it('retourne null pour les chaînes inconnues', () => {
    expect(parseFloorLevel('invalid')).toBeNull()
    expect(parseFloorLevel('')).toBeNull()
    expect(parseFloorLevel(undefined)).toBeNull()
  })

  it('ordre d\'empilement cohérent (B2 < B1 < RDC < R+1 < ROOF)', () => {
    expect(FLOOR_STACK_ORDER[FloorLevel.B2]).toBeLessThan(FLOOR_STACK_ORDER[FloorLevel.B1])
    expect(FLOOR_STACK_ORDER[FloorLevel.B1]).toBeLessThan(FLOOR_STACK_ORDER[FloorLevel.RDC])
    expect(FLOOR_STACK_ORDER[FloorLevel.RDC]).toBeLessThan(FLOOR_STACK_ORDER[FloorLevel.R1])
    expect(FLOOR_STACK_ORDER[FloorLevel.R1]).toBeLessThan(FLOOR_STACK_ORDER[FloorLevel.ROOF])
  })

  it('sortByStackOrder trie du plus bas au plus haut', () => {
    const input = [
      { level: FloorLevel.R2 },
      { level: FloorLevel.B1 },
      { level: FloorLevel.RDC },
    ]
    const sorted = sortByStackOrder(input)
    expect(sorted.map(x => x.level)).toEqual([FloorLevel.B1, FloorLevel.RDC, FloorLevel.R2])
  })
})

describe('coordinates', () => {
  it('convertit metric → normalized (Y inversé)', () => {
    const bounds = boundsM(0, 0, 100, 80)
    const p = metric(10, 20)
    const n = metricToNormalized(p, bounds)
    expect(n.x).toBe(10)
    expect(n.y).toBe(60) // 80 - 20
  })

  it('metric → normalized → metric roundtrip', () => {
    const bounds = boundsM(-50, -30, 150, 120)
    const orig = metric(25, 40)
    const round = normalizedToMetric(metricToNormalized(orig, bounds), bounds)
    expect(round.x).toBeCloseTo(orig.x, 6)
    expect(round.y).toBeCloseTo(orig.y, 6)
  })

  it('detectUnit identifie mm/cm/m correctement', () => {
    expect(detectUnit(150_000)).toBe('mm')    // 150 000 mm = 150 m
    expect(detectUnit(15_000)).toBe('cm')     // 15 000 cm = 150 m
    expect(detectUnit(150)).toBe('m')         // 150 m direct
    expect(detectUnit(5)).toBe('unknown')     // trop petit
  })

  it('toMeters applique le bon facteur', () => {
    expect(toMeters(1000, 'mm')).toBe(1)
    expect(toMeters(100, 'cm')).toBe(1)
    expect(toMeters(1, 'm')).toBe(1)
    expect(toMeters(1, 'ft')).toBeCloseTo(0.3048, 4)
  })
})

describe('LotEntity', () => {
  it('createLot initialise version=1 et timestamps', () => {
    const lot = createLot({
      id: lotId('l1'),
      label: 'B-12',
      type: LotType.Commerce,
      floorLevel: FloorLevel.RDC,
      polygon: [metric(0, 0), metric(10, 0), metric(10, 5), metric(0, 5)],
      areaSqm: 50,
    })
    expect(lot.version).toBe(1)
    expect(lot.createdAt).toBe(lot.updatedAt)
    expect(lot.areaSqm).toBe(50)
  })

  it('touchLot bump version et updatedAt', async () => {
    const lot = createLot({
      id: lotId('l1'), label: 'x', type: LotType.Commerce,
      floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 1,
    })
    await new Promise(r => setTimeout(r, 5))
    const updated = touchLot(lot, { label: 'y' })
    expect(updated.version).toBe(2)
    expect(updated.label).toBe('y')
    expect(updated.updatedAt).not.toBe(lot.updatedAt)
    expect(updated.createdAt).toBe(lot.createdAt) // immutable
  })

  it('withCommercial ajoute l\'extension et bump version', () => {
    const lot = createLot({
      id: lotId('l1'), label: 'x', type: LotType.Commerce,
      floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 1,
    })
    const withCom = withCommercial(lot, { status: LotStatus.Occupied, anchor: true })
    expect(hasCommercial(withCom)).toBe(true)
    expect(withCom.commercial?.status).toBe(LotStatus.Occupied)
    expect(withCom.version).toBe(2)
  })

  it('glaSqm somme les lots commerciaux uniquement', () => {
    const l1 = createLot({ id: lotId('1'), label: '', type: LotType.Commerce, floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 100 })
    const l2 = createLot({ id: lotId('2'), label: '', type: LotType.Restauration, floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 80 })
    const l3 = createLot({ id: lotId('3'), label: '', type: LotType.Circulation, floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 200 })
    expect(glaSqm([l1, l2, l3])).toBe(180)
  })

  it('lotsOnFloor filtre par niveau', () => {
    const l1 = createLot({ id: lotId('1'), label: '', type: LotType.Commerce, floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 1 })
    const l2 = createLot({ id: lotId('2'), label: '', type: LotType.Commerce, floorLevel: FloorLevel.R1, polygon: [], areaSqm: 1 })
    expect(lotsOnFloor([l1, l2], FloorLevel.RDC)).toEqual([l1])
  })
})

describe('events', () => {
  beforeEach(() => eventBus.clear())

  it('émet lot.created et notifie les handlers', () => {
    let received: string | null = null
    eventBus.on('lot.created', (e) => { received = e.lot.id as string })
    const lot = createLot({
      id: lotId('lx'), label: '', type: LotType.Commerce,
      floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 1,
    })
    emitLotCreated(lot)
    expect(received).toBe('lx')
  })

  it('détecte les changements de statut et émet lot.statusChanged', () => {
    const events: string[] = []
    eventBus.on('lot.statusChanged', (e) => { events.push(`${e.previous}→${e.next}`) })
    const prev = createLot({
      id: lotId('l1'), label: '', type: LotType.Commerce,
      floorLevel: FloorLevel.RDC, polygon: [], areaSqm: 1,
      commercial: { status: LotStatus.Vacant },
    })
    const next = withCommercial(prev, { status: LotStatus.Occupied })
    emitLotUpdated(next, prev)
    expect(events).toEqual(['vacant→occupied'])
  })

  it('wildcard onAny reçoit tout', () => {
    const received: string[] = []
    eventBus.onAny((e) => received.push(e.kind))
    eventBus.emit({ kind: 'plan.cleared' })
    eventBus.emit({ kind: 'floor.added', level: FloorLevel.RDC })
    expect(received).toEqual(['plan.cleared', 'floor.added'])
  })

  it('erreur dans un handler n\'interrompt pas les autres', () => {
    const received: string[] = []
    eventBus.on('plan.cleared', () => { throw new Error('boom') })
    eventBus.on('plan.cleared', () => { received.push('ok') })
    eventBus.emit({ kind: 'plan.cleared' })
    expect(received).toEqual(['ok'])
  })
})

describe('adapters', () => {
  it('lotFromDetectedSpace mappe correctement type et floor', () => {
    const lot = lotFromDetectedSpace({
      id: 'sp1', label: 'Boutique A', layer: 'WALLS',
      type: 'commerce' as any,
      polygon: [[0, 0], [10, 0], [10, 5], [0, 5]],
      areaSqm: 50,
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 5, width: 10, height: 5, centerX: 5, centerY: 2.5 },
      color: '#fff', metadata: {},
      floorId: 'R+1',
    })
    expect(lot.type).toBe(LotType.Commerce)
    expect(lot.floorLevel).toBe(FloorLevel.R1)
    expect(lot.areaSqm).toBe(50)
    expect(lot.polygon).toHaveLength(4)
  })

  it('roundtrip Lot → CommercialSpace → Lot préserve l\'essentiel', () => {
    const lot = createLot({
      id: lotId('l1'), label: 'B-12', type: LotType.Commerce,
      floorLevel: FloorLevel.RDC,
      polygon: [metric(0, 0), metric(10, 0), metric(10, 5), metric(0, 5)],
      areaSqm: 50,
      commercial: { status: LotStatus.Occupied },
    })
    const cs = commercialSpaceFromLot(lot)
    expect(cs.id).toBe('l1')
    expect(cs.areaSqm).toBe(50)
    expect(cs.status).toBe('occupied')
    expect(cs.floorId).toBe('RDC')
  })
})
