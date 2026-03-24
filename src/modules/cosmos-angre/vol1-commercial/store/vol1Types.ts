// ═══ VOL.1 COMMERCIAL — Types ═══

export type TenantStatus = 'actif' | 'en_negociation' | 'en_contentieux' | 'sortant'
export type SpaceStatus = 'occupied' | 'vacant' | 'reserved' | 'under_works'
export type Sector = 'mode' | 'restauration' | 'services' | 'loisirs' | 'alimentaire' | 'beaute' | 'electronique' | 'bijouterie' | 'banque' | 'sante' | 'enfants' | 'maison' | 'sport'

export interface Tenant {
  id: string
  companyName: string
  brandName: string
  sector: Sector
  contact: {
    name: string
    email: string
    phone: string
  }
  leaseStart: string
  leaseEnd: string
  baseRentFcfa: number   // FCFA/m²/an
  serviceCharges: number // FCFA/m²/an
  depositFcfa: number
  status: TenantStatus
  logo?: string
}

export interface CommercialSpace {
  id: string
  reference: string
  floorId: string
  floorLevel: string
  x: number
  y: number
  w: number
  h: number
  areaSqm: number
  status: SpaceStatus
  tenantId: string | null
  wing: string
  metadata?: Record<string, unknown>
}

export interface SpaceTenantHistory {
  spaceId: string
  tenantId: string
  since: string
  until: string | null
  notes?: string
}

export interface OccupancyStats {
  totalGla: number
  occupiedGla: number
  vacantGla: number
  reservedGla: number
  underWorksGla: number
  occupancyRate: number
  totalPotentialRent: number
  totalCollectedRent: number
  sectorBreakdown: { sector: Sector; count: number; gla: number; percentage: number }[]
  floorBreakdown: { floor: string; total: number; occupied: number; rate: number }[]
  vacantByDuration: { spaceRef: string; daysVacant: number; areaSqm: number; wing: string }[]
}

export interface LeaseAlert {
  id: string
  type: 'expiring_90d' | 'expiring_30d' | 'unpaid' | 'vacant_60d' | 'contentieux'
  spaceRef: string
  tenantName?: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  date: string
}

export interface TenantMixRecommendation {
  spaceId: string
  spaceRef: string
  recommendedSector: Sector
  reasoning: string
  estimatedRentFcfa: number
  confidence: number
}
