// ═══ PHASING ENGINE — Temporal commercial scenarios ═══

import type { CommercialSpace, Tenant } from '../store/vol1Types'

// ── Types ────────────────────────────────────────────────────

export interface Phase {
  id: string
  name: string
  date: string                        // ISO date
  targetOccupancyRate: number         // 0-100
  confirmedTenantIds: string[]
  projectedRevenueFcfa: number
  color: string
}

export interface PhaseMetrics {
  phaseId: string
  occupiedSpaces: number
  totalSpaces: number
  occupancyRate: number
  occupiedGla: number
  totalGla: number
  revenueFcfa: number
  vacantCells: string[]               // space references
}

// ── Default phases for The Mall ──────────────────────────

export const DEFAULT_PHASES: Phase[] = [
  {
    id: 'phase-soft',
    name: 'Soft Opening',
    date: '2026-10-01',
    targetOccupancyRate: 60,
    confirmedTenantIds: [],
    projectedRevenueFcfa: 0,
    color: '#f59e0b',
  },
  {
    id: 'phase-inaug',
    name: 'Inauguration',
    date: '2026-11-15',
    targetOccupancyRate: 85,
    confirmedTenantIds: [],
    projectedRevenueFcfa: 0,
    color: '#22c55e',
  },
  {
    id: 'phase-cruise',
    name: 'Vitesse de croisière',
    date: '2027-06-01',
    targetOccupancyRate: 95,
    confirmedTenantIds: [],
    projectedRevenueFcfa: 0,
    color: '#38bdf8',
  },
]

// ── Compute phase metrics ────────────────────────────────────

export function computePhaseMetrics(
  phase: Phase,
  spaces: CommercialSpace[],
  tenants: Tenant[]
): PhaseMetrics {
  const totalGla = spaces.reduce((s, sp) => s + sp.areaSqm, 0)
  const totalSpaces = spaces.length

  // A space is occupied in this phase if its tenant is confirmed for this phase
  const occupiedSpaces = spaces.filter((sp) => {
    if (!sp.tenantId) return false
    if (phase.confirmedTenantIds.length === 0) {
      // If no specific tenants listed, use current occupancy status
      return sp.status === 'occupied'
    }
    return phase.confirmedTenantIds.includes(sp.tenantId)
  })

  const occupiedGla = occupiedSpaces.reduce((s, sp) => s + sp.areaSqm, 0)
  const occupancyRate = totalGla > 0 ? Math.round((occupiedGla / totalGla) * 100) : 0

  // Revenue projection
  let revenueFcfa = 0
  for (const sp of occupiedSpaces) {
    const tenant = tenants.find((t) => t.id === sp.tenantId)
    if (tenant) {
      revenueFcfa += tenant.baseRentFcfa * sp.areaSqm
    }
  }

  const vacantCells = spaces
    .filter((sp) => !occupiedSpaces.find((o) => o.id === sp.id))
    .map((sp) => sp.reference)

  return {
    phaseId: phase.id,
    occupiedSpaces: occupiedSpaces.length,
    totalSpaces,
    occupancyRate,
    occupiedGla,
    totalGla,
    revenueFcfa,
    vacantCells,
  }
}

// ── Get space status for a specific phase ────────────────────

export type PhaseSpaceStatus = 'confirmed' | 'projected' | 'vacant'

export function getSpacePhaseStatus(
  space: CommercialSpace,
  phase: Phase
): PhaseSpaceStatus {
  if (!space.tenantId) return 'vacant'
  if (phase.confirmedTenantIds.length === 0) {
    return space.status === 'occupied' ? 'confirmed' : 'vacant'
  }
  if (phase.confirmedTenantIds.includes(space.tenantId)) return 'confirmed'
  return 'projected'
}

export const PHASE_STATUS_COLORS: Record<PhaseSpaceStatus, string> = {
  confirmed: '#22c55e',
  projected: '#f59e0b',
  vacant:    '#ef4444',
}
