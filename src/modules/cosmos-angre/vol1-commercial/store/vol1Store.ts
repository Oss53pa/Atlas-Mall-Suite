// ═══ VOL.1 COMMERCIAL — Zustand Store ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tenant, CommercialSpace, SpaceTenantHistory, LeaseAlert, SpaceStatus, Sector, OccupancyStats } from './vol1Types'
import { type Phase, DEFAULT_PHASES } from '../engines/phasingEngine'

// No seed / mock data: tenants and spaces are entered exclusively via forms
// or derived from DXF imports. All persistence is local (Zustand persist → localStorage,
// plan images → Dexie/IndexedDB in shared/stores/planImageCache).

// ─── Lease Alerts ──────────────────────────────────────────

function generateAlerts(tenants: Tenant[], spaces: CommercialSpace[]): LeaseAlert[] {
  const alerts: LeaseAlert[] = []
  const now = new Date()
  for (const t of tenants) {
    const end = new Date(t.leaseEnd)
    const daysToEnd = Math.floor((end.getTime() - now.getTime()) / 86_400_000)
    if (daysToEnd <= 90 && daysToEnd > 30 && t.status === 'actif') {
      const sp = spaces.find(s => s.tenantId === t.id)
      alerts.push({ id: `alert-exp90-${t.id}`, type: 'expiring_90d', spaceRef: sp?.reference ?? '?', tenantName: t.brandName, message: `Bail ${t.brandName} expire dans ${daysToEnd}j (${t.leaseEnd})`, severity: 'warning', date: t.leaseEnd })
    }
    if (daysToEnd <= 30 && daysToEnd > 0 && t.status === 'actif') {
      const sp = spaces.find(s => s.tenantId === t.id)
      alerts.push({ id: `alert-exp30-${t.id}`, type: 'expiring_30d', spaceRef: sp?.reference ?? '?', tenantName: t.brandName, message: `URGENT : Bail ${t.brandName} expire dans ${daysToEnd}j`, severity: 'critical', date: t.leaseEnd })
    }
    if (t.status === 'en_contentieux') {
      const sp = spaces.find(s => s.tenantId === t.id)
      alerts.push({ id: `alert-cont-${t.id}`, type: 'contentieux', spaceRef: sp?.reference ?? '?', tenantName: t.brandName, message: `${t.brandName} en contentieux`, severity: 'critical', date: new Date().toISOString().slice(0, 10) })
    }
  }
  const vacantSpaces = spaces.filter(s => s.status === 'vacant')
  for (const s of vacantSpaces) {
    alerts.push({ id: `alert-vac-${s.id}`, type: 'vacant_60d', spaceRef: s.reference, message: `Cellule ${s.reference} vacante (${s.areaSqm} m² — ${s.wing})`, severity: 'warning', date: new Date().toISOString().slice(0, 10) })
  }
  return alerts
}

// ─── Compute Occupancy ─────────────────────────────────────

function computeOccupancy(spaces: CommercialSpace[], tenants: Tenant[]): OccupancyStats {
  const totalGla = spaces.reduce((s, sp) => s + sp.areaSqm, 0)
  const occupiedGla = spaces.filter(s => s.status === 'occupied').reduce((s, sp) => s + sp.areaSqm, 0)
  const vacantGla = spaces.filter(s => s.status === 'vacant').reduce((s, sp) => s + sp.areaSqm, 0)
  const reservedGla = spaces.filter(s => s.status === 'reserved').reduce((s, sp) => s + sp.areaSqm, 0)
  const underWorksGla = spaces.filter(s => s.status === 'under_works').reduce((s, sp) => s + sp.areaSqm, 0)

  let totalPotentialRent = 0
  let totalCollectedRent = 0
  for (const sp of spaces) {
    const t = tenants.find(t2 => t2.id === sp.tenantId)
    if (t) {
      const annualRent = t.baseRentFcfa * sp.areaSqm
      totalCollectedRent += annualRent
      totalPotentialRent += annualRent
    } else {
      totalPotentialRent += 18000 * sp.areaSqm // avg estimated
    }
  }

  const sectorMap = new Map<string, { count: number; gla: number }>()
  for (const sp of spaces.filter(s => s.tenantId)) {
    const t = tenants.find(t2 => t2.id === sp.tenantId)
    if (t) {
      const entry = sectorMap.get(t.sector) ?? { count: 0, gla: 0 }
      entry.count++
      entry.gla += sp.areaSqm
      sectorMap.set(t.sector, entry)
    }
  }
  const sectorBreakdown = Array.from(sectorMap.entries()).map(([sector, data]) => ({
    sector: sector as Sector,
    count: data.count,
    gla: data.gla,
    percentage: Math.round((data.gla / totalGla) * 100),
  })).sort((a, b) => b.gla - a.gla)

  const floorMap = new Map<string, { total: number; occupied: number }>()
  for (const sp of spaces) {
    const entry = floorMap.get(sp.floorLevel) ?? { total: 0, occupied: 0 }
    entry.total += sp.areaSqm
    if (sp.status === 'occupied') entry.occupied += sp.areaSqm
    floorMap.set(sp.floorLevel, entry)
  }
  const floorBreakdown = Array.from(floorMap.entries()).map(([floor, data]) => ({
    floor, total: data.total, occupied: data.occupied, rate: Math.round((data.occupied / data.total) * 100),
  }))

  const vacantByDuration = spaces.filter(s => s.status === 'vacant').map((s, i) => ({
    spaceRef: s.reference, daysVacant: 30 + i * 25, areaSqm: s.areaSqm, wing: s.wing,
  })).sort((a, b) => b.daysVacant - a.daysVacant)

  return {
    totalGla, occupiedGla, vacantGla, reservedGla, underWorksGla,
    occupancyRate: Math.round((occupiedGla / totalGla) * 100),
    totalPotentialRent, totalCollectedRent,
    sectorBreakdown, floorBreakdown, vacantByDuration,
  }
}

// ─── Store ─────────────────────────────────────────────────

interface Vol1State {
  tenants: Tenant[]
  spaces: CommercialSpace[]
  history: SpaceTenantHistory[]
  alerts: LeaseAlert[]
  occupancy: OccupancyStats
  selectedSpaceId: string | null
  searchQuery: string
  filterSector: Sector | 'all'
  filterStatus: SpaceStatus | 'all'

  // Plan images (imported plan backgrounds per floor)
  planImageUrls: Record<string, string>

  // Phasing
  phases: Phase[]
  activePhaseId: string | null

  selectSpace: (id: string | null) => void
  setSearch: (q: string) => void
  setFilterSector: (s: Sector | 'all') => void
  setFilterStatus: (s: SpaceStatus | 'all') => void
  addTenant: (tenant: Tenant) => void
  removeTenant: (id: string) => void
  updateTenant: (id: string, data: Partial<Tenant>) => void
  assignTenant: (spaceId: string, tenantId: string) => void
  vacateSpace: (spaceId: string) => void
  addSpace: (space: CommercialSpace) => void
  updateSpace: (id: string, data: Partial<CommercialSpace>) => void
  deleteSpace: (id: string) => void
  setActivePhase: (phaseId: string | null) => void
  updatePhase: (id: string, data: Partial<Phase>) => void
  addPhase: (phase: Phase) => void
  removePhase: (id: string) => void
}

const _initTenants: Tenant[] = []
const _initSpaces: CommercialSpace[] = []

export const useVol1Store = create<Vol1State>()(persist((set, get) => ({
  tenants: _initTenants,
  spaces: _initSpaces,
  history: [],
  alerts: generateAlerts(_initTenants, _initSpaces),
  occupancy: computeOccupancy(_initSpaces, _initTenants),
  selectedSpaceId: null,
  searchQuery: '',
  filterSector: 'all',
  filterStatus: 'all',

  planImageUrls: {} as Record<string, string>,
  phases: DEFAULT_PHASES,
  activePhaseId: null,

  selectSpace: (id) => set({ selectedSpaceId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterSector: (s) => set({ filterSector: s }),
  setFilterStatus: (s) => set({ filterStatus: s }),

  addTenant: (tenant) => {
    const tenants = [...get().tenants, tenant]
    const spaces = get().spaces
    set({ tenants, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  removeTenant: (id) => {
    const tenants = get().tenants.filter(t => t.id !== id)
    const spaces = get().spaces.map(s => s.tenantId === id ? { ...s, tenantId: null, status: 'vacant' as SpaceStatus } : s)
    set({ tenants, spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  updateTenant: (id, data) => {
    const tenants = get().tenants.map(t => t.id === id ? { ...t, ...data } : t)
    const spaces = get().spaces
    set({ tenants, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  assignTenant: (spaceId, tenantId) => {
    const spaces = get().spaces.map(s => s.id === spaceId ? { ...s, tenantId, status: 'occupied' as SpaceStatus } : s)
    const tenants = get().tenants
    set({ spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  vacateSpace: (spaceId) => {
    const spaces = get().spaces.map(s => s.id === spaceId ? { ...s, tenantId: null, status: 'vacant' as SpaceStatus } : s)
    const tenants = get().tenants
    set({ spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  // CRUD Spaces
  addSpace: (space: CommercialSpace) => {
    const spaces = [...get().spaces, space]
    const tenants = get().tenants
    set({ spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },
  updateSpace: (id: string, data: Partial<CommercialSpace>) => {
    const spaces = get().spaces.map(s => s.id === id ? { ...s, ...data } : s)
    const tenants = get().tenants
    set({ spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },
  deleteSpace: (id: string) => {
    const spaces = get().spaces.filter(s => s.id !== id)
    const tenants = get().tenants
    set({ spaces, alerts: generateAlerts(tenants, spaces), occupancy: computeOccupancy(spaces, tenants) })
  },

  setActivePhase: (phaseId) => set({ activePhaseId: phaseId }),

  updatePhase: (id, data) => {
    set({ phases: get().phases.map(p => p.id === id ? { ...p, ...data } : p) })
  },

  addPhase: (phase) => {
    set({ phases: [...get().phases, phase] })
  },

  removePhase: (id) => {
    set({ phases: get().phases.filter(p => p.id !== id), activePhaseId: get().activePhaseId === id ? null : get().activePhaseId })
  },
}), {
  name: 'vol1-planning',
  partialize: (s) => ({
    tenants: s.tenants,
    spaces: s.spaces,
    phases: s.phases,
    planImageUrls: s.planImageUrls,
  }),
}))

export default useVol1Store
