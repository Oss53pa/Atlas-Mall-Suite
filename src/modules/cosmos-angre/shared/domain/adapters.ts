// ═══ DOMAIN ADAPTERS — Bridge between legacy types and canonical Lot ═══
// Permet une migration progressive : les stores existants conservent leurs types
// legacy, mais les moteurs et UI convergent vers Lot via ces adaptateurs.

import type { DetectedSpace } from '../planReader/planEngineTypes'
import type { CommercialSpace, Tenant } from '../engines/commercialEngine'
import type { SpaceType } from '../proph3t/types'
import { FloorLevel, parseFloorLevel } from './FloorLevel'
import { metric, type MetricXY } from './coordinates'
import {
  createLot, lotId, tenantId, LotType, LotStatus,
  type Lot, type CommercialExtension,
} from './LotEntity'

// ─── SpaceType → LotType ────────────────────────────────────

const SPACE_TYPE_TO_LOT_TYPE: Record<string, LotType> = {
  commerce: LotType.Commerce,
  restaurant: LotType.Restauration,
  restauration: LotType.Restauration,
  service: LotType.Services,
  services: LotType.Services,
  loisir: LotType.Loisirs,
  loisirs: LotType.Loisirs,
  bureau: LotType.Bureau,
  technique: LotType.Technique,
  circulation: LotType.Circulation,
  couloir: LotType.Circulation,
  hall: LotType.Circulation,
  parking: LotType.Parking,
  sanitaire: LotType.Sanitaire,
  wc: LotType.Sanitaire,
  toilette: LotType.Sanitaire,
  logistique: LotType.Logistique,
  exterieur: LotType.Exterieur,
  cour: LotType.Exterieur,
}

export function lotTypeFromSpaceType(st: SpaceType | string | undefined): LotType {
  if (!st) return LotType.Inconnu
  const key = String(st).toLowerCase()
  return SPACE_TYPE_TO_LOT_TYPE[key] ?? LotType.Inconnu
}

// ─── Polygon conversion ─────────────────────────────────────

function toMetricPolygon(tuples: [number, number][]): MetricXY[] {
  return tuples.map(t => metric(t[0], t[1]))
}

function toTuplePolygon(poly: MetricXY[]): [number, number][] {
  return poly.map(p => [p.x as number, p.y as number])
}

// ─── Status mapping ─────────────────────────────────────────

function toLotStatus(raw: string | undefined): LotStatus {
  switch (raw) {
    case 'occupied': return LotStatus.Occupied
    case 'reserved': return LotStatus.Reserved
    case 'works': return LotStatus.Works
    case 'negotiation': return LotStatus.Negotiation
    case 'vacant':
    default: return LotStatus.Vacant
  }
}

// ─── DetectedSpace → Lot ────────────────────────────────────

export function lotFromDetectedSpace(
  space: DetectedSpace,
  floorLevel?: FloorLevel,
): Lot {
  const level = floorLevel ?? parseFloorLevel(space.floorId) ?? FloorLevel.RDC
  return createLot({
    id: lotId(space.id),
    label: space.label,
    type: lotTypeFromSpaceType(space.type),
    floorLevel: level,
    polygon: toMetricPolygon(space.polygon),
    areaSqm: space.areaSqm,
    metadata: {
      layer: space.layer,
      color: space.color,
      ...space.metadata,
    },
  })
}

// ─── CommercialSpace → Lot (fusion avec Tenant optionnel) ───

export function lotFromCommercialSpace(
  space: CommercialSpace,
  tenants?: Tenant[],
): Lot {
  const tenant = tenants?.find(t => t.id === space.tenantId)
  const level = parseFloorLevel(space.floorId) ?? FloorLevel.RDC
  const status = toLotStatus(space.status)

  const commercial: CommercialExtension = {
    status,
    tenantId: space.tenantId ? tenantId(space.tenantId) : undefined,
    category: tenant?.category,
    anchor: tenant?.anchor,
    rentFcfaM2: tenant?.rentFcfaM2,
    monthlyRentFcfa: tenant?.monthlyRentFcfa,
    leaseStart: tenant?.leaseStart,
    leaseEnd: tenant?.leaseEnd,
  }

  return createLot({
    id: lotId(space.id),
    label: space.label,
    type: lotTypeFromSpaceType(space.type),
    floorLevel: level,
    polygon: space.polygon ? toMetricPolygon(space.polygon) : [],
    areaSqm: space.areaSqm,
    commercial,
  })
}

// ─── Lot → legacy types (pour alimenter les moteurs existants) ───

export function commercialSpaceFromLot(lot: Lot): CommercialSpace {
  return {
    id: lot.id as string,
    label: lot.label,
    type: lot.type,
    areaSqm: lot.areaSqm,
    floorId: lot.floorLevel,
    polygon: toTuplePolygon(lot.polygon),
    status: lot.commercial?.status as CommercialSpace['status'],
    tenantId: (lot.commercial?.tenantId as string | undefined) ?? null,
  }
}

export function detectedSpaceFromLot(lot: Lot): DetectedSpace {
  const xs = lot.polygon.map(p => p.x as number)
  const ys = lot.polygon.map(p => p.y as number)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  return {
    id: lot.id as string,
    polygon: toTuplePolygon(lot.polygon),
    areaSqm: lot.areaSqm,
    label: lot.label,
    layer: (lot.metadata?.layer as string) ?? '',
    type: lot.type as SpaceType,
    bounds: {
      minX, minY, maxX, maxY,
      width: maxX - minX, height: maxY - minY,
      centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
    },
    color: (lot.metadata?.color as string) ?? null,
    metadata: lot.metadata ?? {},
    floorId: lot.floorLevel,
  }
}

// ─── Tenant → helper (créer/extraire depuis Lot) ────────────

export function tenantFromLot(lot: Lot): Tenant | null {
  if (!lot.commercial?.tenantId) return null
  const c = lot.commercial
  return {
    id: c.tenantId as string,
    name: lot.label,
    category: c.category,
    anchor: c.anchor,
    rentFcfaM2: c.rentFcfaM2,
    monthlyRentFcfa: c.monthlyRentFcfa,
    leaseStart: c.leaseStart,
    leaseEnd: c.leaseEnd,
  }
}
