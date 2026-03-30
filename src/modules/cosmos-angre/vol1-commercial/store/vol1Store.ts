// ═══ VOL.1 COMMERCIAL — Zustand Store ═══

import { create } from 'zustand'
import type { Tenant, CommercialSpace, SpaceTenantHistory, LeaseAlert, SpaceStatus, Sector, OccupancyStats } from './vol1Types'
import { shouldUseMockData } from '../../shared/useMockData'
import { type Phase, DEFAULT_PHASES } from '../engines/phasingEngine'

// ─── Mock Tenants ──────────────────────────────────────────

const MOCK_TENANTS: Tenant[] = [
  { id: 't-01', companyName: 'Zara CI', brandName: 'Zara', sector: 'mode', contact: { name: 'Kouadio Marc', email: 'marc@zaraci.com', phone: '+225 07 00 01 01' }, leaseStart: '2026-10-01', leaseEnd: '2032-09-30', baseRentFcfa: 22000, serviceCharges: 4500, depositFcfa: 15000000, status: 'actif' },
  { id: 't-02', companyName: 'Carrefour Market', brandName: 'Carrefour', sector: 'alimentaire', contact: { name: 'Diallo Fatou', email: 'fatou@carrefourci.com', phone: '+225 07 00 02 02' }, leaseStart: '2026-10-01', leaseEnd: '2036-09-30', baseRentFcfa: 15000, serviceCharges: 3500, depositFcfa: 50000000, status: 'actif' },
  { id: 't-03', companyName: 'KFC CI', brandName: 'KFC', sector: 'restauration', contact: { name: 'Bamba Ali', email: 'ali@kfcci.com', phone: '+225 07 00 03 03' }, leaseStart: '2026-10-01', leaseEnd: '2031-09-30', baseRentFcfa: 28000, serviceCharges: 6000, depositFcfa: 8000000, status: 'actif' },
  { id: 't-04', companyName: 'Orange Money', brandName: 'Orange', sector: 'services', contact: { name: 'Traore Issa', email: 'issa@orange.ci', phone: '+225 07 00 04 04' }, leaseStart: '2026-10-01', leaseEnd: '2029-09-30', baseRentFcfa: 18000, serviceCharges: 3000, depositFcfa: 5000000, status: 'actif' },
  { id: 't-05', companyName: 'Pathé Cinéma', brandName: 'Pathé', sector: 'loisirs', contact: { name: 'Coulibaly Jean', email: 'jean@pathe.ci', phone: '+225 07 00 05 05' }, leaseStart: '2026-10-01', leaseEnd: '2036-09-30', baseRentFcfa: 12000, serviceCharges: 5000, depositFcfa: 30000000, status: 'actif' },
  { id: 't-06', companyName: 'Sephora Africa', brandName: 'Sephora', sector: 'beaute', contact: { name: 'Koné Mariam', email: 'mariam@sephora.ci', phone: '+225 07 00 06 06' }, leaseStart: '2026-10-01', leaseEnd: '2031-09-30', baseRentFcfa: 25000, serviceCharges: 4000, depositFcfa: 10000000, status: 'actif' },
  { id: 't-07', companyName: 'Samsung Store', brandName: 'Samsung', sector: 'electronique', contact: { name: 'N\'Guessan Paul', email: 'paul@samsung.ci', phone: '+225 07 00 07 07' }, leaseStart: '2026-10-01', leaseEnd: '2031-09-30', baseRentFcfa: 20000, serviceCharges: 3500, depositFcfa: 12000000, status: 'actif' },
  { id: 't-08', companyName: 'SGBCI Agence', brandName: 'SGBCI', sector: 'banque', contact: { name: 'Yao Ernest', email: 'ernest@sgbci.ci', phone: '+225 07 00 08 08' }, leaseStart: '2026-10-01', leaseEnd: '2033-09-30', baseRentFcfa: 16000, serviceCharges: 3000, depositFcfa: 8000000, status: 'actif' },
  { id: 't-09', companyName: 'Décathlon CI', brandName: 'Décathlon', sector: 'sport', contact: { name: 'Koffi Daniel', email: 'daniel@decathlon.ci', phone: '+225 07 00 09 09' }, leaseStart: '2026-10-01', leaseEnd: '2034-09-30', baseRentFcfa: 14000, serviceCharges: 3500, depositFcfa: 20000000, status: 'actif' },
  { id: 't-10', companyName: 'Burger King CI', brandName: 'Burger King', sector: 'restauration', contact: { name: 'Ouattara Moussa', email: 'moussa@bkci.com', phone: '+225 07 00 10 10' }, leaseStart: '2027-01-01', leaseEnd: '2032-12-31', baseRentFcfa: 26000, serviceCharges: 5500, depositFcfa: 7000000, status: 'en_negociation' },
  { id: 't-11', companyName: 'Pharmacie du Mall', brandName: 'Pharm+', sector: 'sante', contact: { name: 'Adou Claire', email: 'claire@pharmplus.ci', phone: '+225 07 00 11 11' }, leaseStart: '2026-10-01', leaseEnd: '2029-09-30', baseRentFcfa: 18000, serviceCharges: 3000, depositFcfa: 6000000, status: 'actif' },
  { id: 't-12', companyName: 'La Brioche Dorée', brandName: 'Brioche Dorée', sector: 'restauration', contact: { name: 'Gnolou Marie', email: 'marie@brioche.ci', phone: '+225 07 00 12 12' }, leaseStart: '2026-10-01', leaseEnd: '2029-03-31', baseRentFcfa: 24000, serviceCharges: 5000, depositFcfa: 5000000, status: 'actif' },
]

// ─── Mock Spaces ───────────────────────────────────────────

const MOCK_SPACES: CommercialSpace[] = [
  // RDC — Galerie Mode
  { id: 's-01', reference: 'RDC-A01', floorId: 'floor-rdc', floorLevel: 'RDC', x: 20, y: 20, w: 40, h: 30, areaSqm: 350, status: 'occupied', tenantId: 't-01', wing: 'Galerie Ouest' },
  { id: 's-02', reference: 'RDC-A02', floorId: 'floor-rdc', floorLevel: 'RDC', x: 65, y: 20, w: 25, h: 20, areaSqm: 180, status: 'occupied', tenantId: 't-06', wing: 'Galerie Ouest' },
  { id: 's-03', reference: 'RDC-A03', floorId: 'floor-rdc', floorLevel: 'RDC', x: 95, y: 20, w: 30, h: 25, areaSqm: 220, status: 'occupied', tenantId: 't-07', wing: 'Galerie Est' },
  { id: 's-04', reference: 'RDC-A04', floorId: 'floor-rdc', floorLevel: 'RDC', x: 130, y: 20, w: 20, h: 18, areaSqm: 120, status: 'vacant', tenantId: null, wing: 'Galerie Est' },
  { id: 's-05', reference: 'RDC-A05', floorId: 'floor-rdc', floorLevel: 'RDC', x: 20, y: 55, w: 15, h: 15, areaSqm: 80, status: 'occupied', tenantId: 't-04', wing: 'Galerie Ouest' },
  { id: 's-06', reference: 'RDC-A06', floorId: 'floor-rdc', floorLevel: 'RDC', x: 40, y: 55, w: 15, h: 15, areaSqm: 90, status: 'occupied', tenantId: 't-08', wing: 'Galerie Ouest' },
  { id: 's-07', reference: 'RDC-A07', floorId: 'floor-rdc', floorLevel: 'RDC', x: 60, y: 55, w: 12, h: 15, areaSqm: 65, status: 'occupied', tenantId: 't-11', wing: 'Centre' },
  { id: 's-08', reference: 'RDC-A08', floorId: 'floor-rdc', floorLevel: 'RDC', x: 77, y: 55, w: 18, h: 15, areaSqm: 100, status: 'vacant', tenantId: null, wing: 'Centre' },
  { id: 's-09', reference: 'RDC-A09', floorId: 'floor-rdc', floorLevel: 'RDC', x: 100, y: 55, w: 15, h: 15, areaSqm: 85, status: 'reserved', tenantId: 't-10', wing: 'Galerie Est' },
  // B1 — Alimentaire + Parking commercial
  { id: 's-10', reference: 'B1-B01', floorId: 'floor-b1', floorLevel: 'B1', x: 30, y: 20, w: 60, h: 40, areaSqm: 2500, status: 'occupied', tenantId: 't-02', wing: 'Hypermarche' },
  { id: 's-11', reference: 'B1-B02', floorId: 'floor-b1', floorLevel: 'B1', x: 95, y: 20, w: 20, h: 20, areaSqm: 150, status: 'under_works', tenantId: null, wing: 'Galerie B1' },
  // R+1 — Food Court + Loisirs
  { id: 's-12', reference: 'R1-C01', floorId: 'floor-r1', floorLevel: 'R+1', x: 20, y: 20, w: 20, h: 18, areaSqm: 130, status: 'occupied', tenantId: 't-03', wing: 'Food Court' },
  { id: 's-13', reference: 'R1-C02', floorId: 'floor-r1', floorLevel: 'R+1', x: 45, y: 20, w: 18, h: 16, areaSqm: 110, status: 'occupied', tenantId: 't-12', wing: 'Food Court' },
  { id: 's-14', reference: 'R1-C03', floorId: 'floor-r1', floorLevel: 'R+1', x: 68, y: 20, w: 50, h: 40, areaSqm: 1800, status: 'occupied', tenantId: 't-05', wing: 'Loisirs' },
  { id: 's-15', reference: 'R1-C04', floorId: 'floor-r1', floorLevel: 'R+1', x: 20, y: 45, w: 40, h: 30, areaSqm: 600, status: 'occupied', tenantId: 't-09', wing: 'Sport' },
  { id: 's-16', reference: 'R1-C05', floorId: 'floor-r1', floorLevel: 'R+1', x: 123, y: 20, w: 15, h: 14, areaSqm: 75, status: 'vacant', tenantId: null, wing: 'Food Court' },
]

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

  // Phasing
  phases: Phase[]
  activePhaseId: string | null

  selectSpace: (id: string | null) => void
  setSearch: (q: string) => void
  setFilterSector: (s: Sector | 'all') => void
  setFilterStatus: (s: SpaceStatus | 'all') => void
  updateTenant: (id: string, data: Partial<Tenant>) => void
  assignTenant: (spaceId: string, tenantId: string) => void
  vacateSpace: (spaceId: string) => void
  setActivePhase: (phaseId: string | null) => void
  updatePhase: (id: string, data: Partial<Phase>) => void
  addPhase: (phase: Phase) => void
  removePhase: (id: string) => void
}

const _useMock = shouldUseMockData()
const _initTenants = _useMock ? MOCK_TENANTS : []
const _initSpaces = _useMock ? MOCK_SPACES : []

export const useVol1Store = create<Vol1State>((set, get) => ({
  tenants: _initTenants,
  spaces: _initSpaces,
  history: [],
  alerts: generateAlerts(_initTenants, _initSpaces),
  occupancy: computeOccupancy(_initSpaces, _initTenants),
  selectedSpaceId: null,
  searchQuery: '',
  filterSector: 'all',
  filterStatus: 'all',

  phases: DEFAULT_PHASES,
  activePhaseId: null,

  selectSpace: (id) => set({ selectedSpaceId: id }),
  setSearch: (q) => set({ searchQuery: q }),
  setFilterSector: (s) => set({ filterSector: s }),
  setFilterStatus: (s) => set({ filterStatus: s }),

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
}))

export default useVol1Store
