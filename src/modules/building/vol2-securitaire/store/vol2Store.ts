// ═══ VOL.2 SECURITAIRE — Zustand Store ═══

import { create } from 'zustand'
import * as THREE from 'three'
import type {
  Floor,
  Zone,
  Camera,
  Door,
  BlindSpot,
  SecurityScore,
  TransitionNode,
  EvacuationResult,
  MonteCarloResult,
  EvacuationScenario,
  CascadeTrigger,
  CascadeResult,
  CapexItem,
  ProjectMemorySummary,
  ChatMessage,
  SecurityScenario,
  SignageItem,
  CrossVolumeInsight,
  ProactiveInsight,
  ProjectPhase
} from '../../shared/proph3t/types'
import { addImported3DModel } from './imported3DModel'
import {
  scoreSecurite,
  findBlindSpots,
  computeFloorCoverage,
  solveCameraPlacement,
  recommendDoors,
  computeCapex
} from '../../shared/proph3t/engine'
import { importPlan as importPlanOrchestrator, generateCotationSpecs } from '../../shared/planReader'
import type {
  DimEntity,
  CalibrationResult,
  CotationSpec,
  PlanImportState
} from '../../shared/planReader/planReaderTypes'
import { runCascade as cascadeRun, type CascadeState } from '../../shared/proph3t/cascadeEngine'
import type { TenantInfo } from '../../shared/proph3t/types'
import { runMonteCarlo as monteCarloRun, simulateEvacuation } from '../../shared/proph3t/simulationEngine'
import { optimizeSignaleticsPlacement } from '../../shared/proph3t/signaleticsEngine'
import { exportASPADPDF } from '../../../export/exportPDFApsad'
import { exportCAPEXExcel } from '../../../export/exportCAPEX'
import { exportAnnotatedDXF } from '../../../export/exportDXF'
import {
  loadProjectFromSupabase,
  persistEntity,
  deleteEntity,
  mapCameraToDB,
  mapZoneToDB,
  mapDoorToDB,
  mapTransitionToDB
} from '../../shared/supabaseSync'

// No seed/mock data: stores start empty — user populates via DXF import or forms.

// ─── Entity type union ───────────────────────────────────────

type EntityType = 'camera' | 'door' | 'zone' | 'transition'

// ─── DXF Import Result type ─────────────────────────────────

interface DXFImportResult {
  zones: Zone[]
  doors?: Door[]
  floorId: string
}

// ─── State Interface ─────────────────────────────────────────

interface Vol2State {
  // Project
  projectId: string
  projectName: string

  // Multi-floor
  floors: Floor[]
  activeFloorId: string
  transitions: TransitionNode[]

  // Entities
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  blindSpots: BlindSpot[]

  // Score
  score: SecurityScore | null
  coverageByFloor: Record<string, number>

  // Simulation
  evacResult: EvacuationResult | null
  monteCarloResults: MonteCarloResult[]
  activeScenario: EvacuationScenario | null
  isSimulating: boolean

  // Computation flags
  isRunningAutoCameras: boolean
  isRunningAutoDoors: boolean
  isRunningBlindSpots: boolean
  isRunningFullAnalysis: boolean

  // Memory
  memory: ProjectMemorySummary | null

  // Chat
  chatMessages: ChatMessage[]

  // CAPEX
  capexItems: CapexItem[]

  // Proph3t v3 — Insights inter-volumes, phasage, apprentissage
  crossVolumeInsights: CrossVolumeInsight[]
  proactiveInsights: ProactiveInsight[]
  phases: ProjectPhase[]
  lastApprovedVersion: { date: string; snapshotId: string } | null
  userPreferences: Record<string, unknown>

  // Signalétique
  signageItems: SignageItem[]

  // Plan reader
  planImportState: PlanImportState | null
  detectedDims: DimEntity[]
  calibration: CalibrationResult | null
  showDims: boolean
  cotationSpecs: CotationSpec[]
  /** Image de fond du plan par etage (floorId → blob URL) */
  planImageUrls: Record<string, string>

  // UI
  selectedEntityId: string | null
  selectedEntityType: EntityType | null
  showFov: boolean
  showBlindSpots: boolean
  showHeatmap: boolean
  showTransitions: boolean
  simulationSpeed: number

  // Library
  libraryOpen: boolean
  libraryTab: 'camera' | 'door' | 'signage' | 'mobilier_pmr'

  // Actions - Floors
  setActiveFloor: (floorId: string) => void
  addFloor: (floor: Floor) => void

  // Actions - Zones
  addZone: (zone: Zone) => void
  updateZone: (id: string, updates: Partial<Zone>) => void
  deleteZone: (id: string) => void
  setZones: (zones: Zone[]) => void
  setPlanImageUrl: (floorId: string, url: string) => void

  // Actions - Cameras
  addCamera: (camera: Camera) => void
  updateCamera: (id: string, updates: Partial<Camera>) => void
  deleteCamera: (id: string) => void
  setCameras: (cameras: Camera[]) => void

  // Actions - Doors
  addDoor: (door: Door) => void
  updateDoor: (id: string, updates: Partial<Door>) => void
  deleteDoor: (id: string) => void
  setDoors: (doors: Door[]) => void

  // Actions - Transitions
  addTransition: (t: TransitionNode) => void
  removeTransition: (id: string) => void

  // Actions - Score & Coverage
  setScore: (score: SecurityScore) => void
  setBlindSpots: (spots: BlindSpot[]) => void
  setCoverageByFloor: (coverage: Record<string, number>) => void

  // Actions - Simulation
  setEvacResult: (result: EvacuationResult | null) => void
  addMonteCarloResult: (result: MonteCarloResult) => void
  setIsSimulating: (v: boolean) => void

  // Actions - Memory
  setMemory: (memory: ProjectMemorySummary) => void

  // Actions - Chat
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Actions - UI
  selectEntity: (id: string | null, type: EntityType | null) => void
  toggleFov: () => void
  toggleBlindSpots: () => void
  toggleHeatmap: () => void
  toggleTransitions: () => void
  setLibraryOpen: (open: boolean) => void
  setLibraryTab: (tab: Vol2State['libraryTab']) => void

  // Actions - Cascade
  applyCascadeResult: (result: CascadeResult) => void

  // Actions - Generic entity move
  moveEntity: (entityType: EntityType, id: string, x: number, y: number) => void

  // Actions - Automation (real orchestration)
  runAutoCameras: () => void
  runAutoDoors: () => void
  runBlindSpots: () => void
  runFullAnalysis: () => void

  // Actions - Orchestration (PRD)
  runEvacuation: (scenario: EvacuationScenario) => Promise<void>
  runMonteCarlo: (scenario: SecurityScenario) => Promise<void>
  runCascade: (trigger: CascadeTrigger) => Promise<void>
  runAutoSignaletics: () => Promise<void>
  calibrateFloor: (floorId: string, widthM: number, heightM: number) => void
  importDXF: (file: File, floorId: string) => Promise<void>

  // Actions - Plan reader
  importPlan: (file: File, floorId: string) => Promise<void>
  setPlanImportState: (state: PlanImportState | null) => void
  setDetectedDims: (dims: DimEntity[]) => void
  setCalibration: (cal: CalibrationResult | null) => void
  toggleDims: () => void
  generateCotations: () => void

  // Actions - Export (PRD)
  exportASPADPDF: () => Promise<void>
  exportBudgetXLSX: () => void
  exportAnnotatedDWG: () => void
  exportPowerPoint: () => Promise<void>

  // Actions - DXF import result
  importDXFResult: (result: DXFImportResult) => void

  // Actions - 3D model import
  setImported3DModel: (scene: THREE.Group, format: string, floorId: string) => void

  // Actions - Supabase hydration
  hydrateFromSupabase: (projetId: string) => Promise<void>
  isHydrating: boolean
  hydrationError: string | null

  // Actions - Reset
  resetProject: () => void
}

// ─── Initial State (data only, no actions) ───────────────────

const initialState = {
  projectId: 'cosmos-angre-vol2',
  projectName: 'The Mall — Vol.2 Securitaire',

  floors: [] as Floor[],
  activeFloorId: '',
  transitions: [] as TransitionNode[],

  zones: [] as Zone[],
  cameras: [] as Camera[],
  doors: [] as Door[],
  blindSpots: [] as BlindSpot[],

  score: null as SecurityScore | null,
  coverageByFloor: {} as Record<string, number>,

  evacResult: null as EvacuationResult | null,
  monteCarloResults: [] as MonteCarloResult[],
  activeScenario: null as EvacuationScenario | null,
  isSimulating: false,

  isRunningAutoCameras: false,
  isRunningAutoDoors: false,
  isRunningBlindSpots: false,
  isRunningFullAnalysis: false,

  memory: null as ProjectMemorySummary | null,

  chatMessages: [] as ChatMessage[],

  capexItems: [] as CapexItem[],

  signageItems: [] as SignageItem[],

  // Proph3t v3
  crossVolumeInsights: [] as CrossVolumeInsight[],
  proactiveInsights: [] as ProactiveInsight[],
  phases: [] as ProjectPhase[],
  lastApprovedVersion: null,
  userPreferences: {} as Record<string, unknown>,

  planImportState: null as PlanImportState | null,
  detectedDims: [] as DimEntity[],
  calibration: null as CalibrationResult | null,
  showDims: false,
  cotationSpecs: [] as CotationSpec[],
  planImageUrls: {} as Record<string, string>,

  selectedEntityId: null as string | null,
  selectedEntityType: null as EntityType | null,
  showFov: true,
  showBlindSpots: true,
  showHeatmap: false,
  showTransitions: true,
  simulationSpeed: 1,

  libraryOpen: false,
  libraryTab: 'camera' as const,

  isHydrating: false,
  hydrationError: null as string | null,
} satisfies Record<string, unknown>

// ─── Store ───────────────────────────────────────────────────

export const useVol2Store = create<Vol2State>()((set) => ({
  ...initialState,

  // ── Floors ──────────────────────────────────────────────
  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  addFloor: (floor) => set((s) => ({ floors: [...s.floors, floor] })),

  // ── Zones (with Supabase persist) ──────────────────────
  addZone: (zone) => {
    set((s) => ({ zones: [...s.zones, zone] }))
    const pid = useVol2Store.getState().projectId
    void persistEntity('zones', mapZoneToDB(zone, pid))
  },
  updateZone: (id, updates) => {
    set((s) => ({ zones: s.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)) }))
    const s = useVol2Store.getState()
    const zone = s.zones.find(z => z.id === id)
    if (zone) void persistEntity('zones', mapZoneToDB(zone, s.projectId))
  },
  deleteZone: (id) => {
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) }))
    void deleteEntity('zones', id)
  },
  setZones: (zones) => set({ zones }),
  setPlanImageUrl: (floorId: string, url: string) => set((s) => ({ planImageUrls: { ...s.planImageUrls, [floorId]: url } })),

  // ── Cameras (with Supabase persist) ───────────────────
  addCamera: (camera) => {
    set((s) => ({ cameras: [...s.cameras, camera] }))
    const pid = useVol2Store.getState().projectId
    void persistEntity('cameras', mapCameraToDB(camera, pid))
  },
  updateCamera: (id, updates) => {
    set((s) => ({ cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...updates } : c)) }))
    const s = useVol2Store.getState()
    const cam = s.cameras.find(c => c.id === id)
    if (cam) void persistEntity('cameras', mapCameraToDB(cam, s.projectId))
  },
  deleteCamera: (id) => {
    set((s) => ({ cameras: s.cameras.filter((c) => c.id !== id) }))
    void deleteEntity('cameras', id)
  },
  setCameras: (cameras) => set({ cameras }),

  // ── Doors (with Supabase persist) ─────────────────────
  addDoor: (door) => {
    set((s) => ({ doors: [...s.doors, door] }))
    const pid = useVol2Store.getState().projectId
    void persistEntity('doors', mapDoorToDB(door, pid))
  },
  updateDoor: (id, updates) => {
    set((s) => ({ doors: s.doors.map((d) => (d.id === id ? { ...d, ...updates } : d)) }))
    const s = useVol2Store.getState()
    const door = s.doors.find(d => d.id === id)
    if (door) void persistEntity('doors', mapDoorToDB(door, s.projectId))
  },
  deleteDoor: (id) => {
    set((s) => ({ doors: s.doors.filter((d) => d.id !== id) }))
    void deleteEntity('doors', id)
  },
  setDoors: (doors) => set({ doors }),

  // ── Transitions (with Supabase persist) ───────────────
  addTransition: (t) => {
    set((s) => ({ transitions: [...s.transitions, t] }))
    const pid = useVol2Store.getState().projectId
    void persistEntity('transitions', mapTransitionToDB(t, pid))
  },
  removeTransition: (id) => {
    set((s) => ({ transitions: s.transitions.filter((t) => t.id !== id) }))
    void deleteEntity('transitions', id)
  },

  // ── Score & Coverage ────────────────────────────────────
  setScore: (score) => set({ score }),
  setBlindSpots: (spots) => set({ blindSpots: spots }),
  setCoverageByFloor: (coverage) => set({ coverageByFloor: coverage }),

  // ── Simulation ──────────────────────────────────────────
  setEvacResult: (result) => set({ evacResult: result }),
  addMonteCarloResult: (result) =>
    set((s) => ({ monteCarloResults: [...s.monteCarloResults, result] })),
  setIsSimulating: (v) => set({ isSimulating: v }),

  // ── Memory ──────────────────────────────────────────────
  setMemory: (memory) => set({ memory }),

  // ── Chat ────────────────────────────────────────────────
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  // ── UI ──────────────────────────────────────────────────
  selectEntity: (id, type) =>
    set({ selectedEntityId: id, selectedEntityType: type }),
  toggleFov: () => set((s) => ({ showFov: !s.showFov })),
  toggleBlindSpots: () => set((s) => ({ showBlindSpots: !s.showBlindSpots })),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleTransitions: () => set((s) => ({ showTransitions: !s.showTransitions })),
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  setLibraryTab: (tab) => set({ libraryTab: tab }),

  // ── Cascade ─────────────────────────────────────────────
  applyCascadeResult: (result) =>
    set((_s) => ({
      blindSpots: result.blindSpots,
      score: result.score,
      coverageByFloor: result.coverageByFloor,
    })),

  // ── Generic entity move ─────────────────────────────────
  moveEntity: (entityType, id, x, y) =>
    set((s) => {
      switch (entityType) {
        case 'camera':
          return {
            cameras: s.cameras.map((c) =>
              c.id === id ? { ...c, x, y } : c
            ),
          }
        case 'door':
          return {
            doors: s.doors.map((d) =>
              d.id === id ? { ...d, x, y } : d
            ),
          }
        case 'zone':
          return {
            zones: s.zones.map((z) =>
              z.id === id ? { ...z, x, y } : z
            ),
          }
        case 'transition':
          return {
            transitions: s.transitions.map((t) =>
              t.id === id ? { ...t, x, y } : t
            ),
          }
        default:
          return {}
      }
    }),

  // ── Automation — real orchestration ────────────────────
  runAutoCameras: () => {
    set({ isRunningAutoCameras: true })
    const s = useVol2Store.getState()
    const activeFloor = s.floors.find(f => f.id === s.activeFloorId)
    if (!activeFloor) { set({ isRunningAutoCameras: false }); return }
    const floorZones = s.zones.filter(z => z.floorId === s.activeFloorId)
    const result = solveCameraPlacement({
      zones: floorZones,
      existingCameras: s.cameras.filter(c => c.floorId === s.activeFloorId),
      floorWidthM: activeFloor.widthM,
      floorHeightM: activeFloor.heightM,
    })
    set(st => ({ cameras: [...st.cameras, ...result.cameras], isRunningAutoCameras: false }))
  },

  runAutoDoors: () => {
    set({ isRunningAutoDoors: true })
    const s = useVol2Store.getState()
    const floorZones = s.zones.filter(z => z.floorId === s.activeFloorId)
    const newDoors = recommendDoors(floorZones, s.activeFloorId)
    set(st => ({
      doors: [...st.doors, ...(newDoors as Door[])],
      isRunningAutoDoors: false,
    }))
  },

  runBlindSpots: () => {
    set({ isRunningBlindSpots: true })
    const s = useVol2Store.getState()
    const activeFloor = s.floors.find(f => f.id === s.activeFloorId)
    if (!activeFloor) { set({ isRunningBlindSpots: false }); return }
    const floorCameras = s.cameras.filter(c => c.floorId === s.activeFloorId)
    const floorZones = s.zones.filter(z => z.floorId === s.activeFloorId)
    const spots = findBlindSpots(floorZones, floorCameras, s.activeFloorId, activeFloor.widthM, activeFloor.heightM)
    set({ blindSpots: spots, isRunningBlindSpots: false })
  },

  runFullAnalysis: () => {
    set({ isRunningFullAnalysis: true })
    const s = useVol2Store.getState()
    const score = scoreSecurite(s.zones, s.cameras, s.doors)
    const cov: Record<string, number> = {}
    for (const floor of s.floors) {
      const fZones = s.zones.filter(z => z.floorId === floor.id)
      const fCams = s.cameras.filter(c => c.floorId === floor.id)
      cov[floor.id] = computeFloorCoverage(fZones, fCams, floor.widthM, floor.heightM)
    }
    set({ score, coverageByFloor: cov, isRunningFullAnalysis: false })
  },

  // ── Orchestration actions (PRD) ──────────────────────
  runEvacuation: async (scenario) => {
    set({ isSimulating: true })
    const s = useVol2Store.getState()
    const exits = s.doors.filter(d => d.isExit)
    const result = simulateEvacuation({
      floors: s.floors, transitions: s.transitions, exits, zones: s.zones,
      scenario, cameras: s.cameras,
    })
    set({ evacResult: result, isSimulating: false })
  },

  runMonteCarlo: async (scenario) => {
    set({ isSimulating: true })
    const s = useVol2Store.getState()
    const result = monteCarloRun({
      floors: s.floors, cameras: s.cameras, transitions: s.transitions,
      zones: s.zones, scenario, runs: 1000,
    })
    set(st => ({
      monteCarloResults: [...st.monteCarloResults, result],
      isSimulating: false,
    }))
  },

  runCascade: async (trigger) => {
    const s = useVol2Store.getState()

    // Lecture cross-volume : recuperer les tenants Vol.1 pour l'analyse commerciale
    let vol1Tenants: TenantInfo[] = []
    try {
      const { useVol1Store } = await import('../../vol1-commercial/store/vol1Store')
      const vol1 = useVol1Store.getState()
      vol1Tenants = vol1.tenants.map(t => ({
        spaceId: vol1.spaces.find(sp => sp.tenantId === t.id)?.id ?? t.id,
        name: t.brandName,
        status: t.status === 'actif' ? 'active' as const : t.status === 'en_negociation' ? 'negotiation' as const : 'vacant' as const,
        sector: t.sector,
        rentFcfaM2: t.baseRentFcfa,
      }))
    } catch { /* Vol1 non charge — cascade continue sans donnees commerciales */ }

    const cascadeState: CascadeState = {
      floors: s.floors, zones: s.zones, cameras: s.cameras,
      doors: s.doors, transitions: s.transitions, signageItems: s.signageItems,
      tenants: vol1Tenants.length > 0 ? vol1Tenants : undefined,
      phases: s.phases.length > 0 ? s.phases : undefined,
    }
    const result = await cascadeRun(cascadeState, trigger)
    set({
      blindSpots: result.blindSpots,
      score: result.score,
      coverageByFloor: result.coverageByFloor,
      crossVolumeInsights: result.crossVolumeInsights,
      proactiveInsights: result.proactiveInsights,
    })
  },

  runAutoSignaletics: async () => {
    const s = useVol2Store.getState()
    const activeFloor = s.floors.find(f => f.id === s.activeFloorId)
    if (!activeFloor) return
    const items = optimizeSignaleticsPlacement(activeFloor, null, s.signageItems)
    set(st => ({ signageItems: [...st.signageItems, ...items] }))
  },

  calibrateFloor: (floorId, widthM, heightM) =>
    set(s => ({
      floors: s.floors.map(f => f.id === floorId ? { ...f, widthM, heightM } : f),
    })),

  importDXF: async (file, floorId) => {
    const text = await file.text()
    const { default: DxfParser } = await import('dxf-parser')
    const parser = new DxfParser()
    const dxf = parser.parseSync(text)
    if (!dxf) return
    const newZones: Zone[] = []
    let idx = 0
    for (const entity of (dxf.entities ?? [])) {
      if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const verts = (entity as { vertices?: { x: number; y: number }[] }).vertices ?? []
        if (verts.length < 3) continue
        const xs = verts.map(v => v.x)
        const ys = verts.map(v => v.y)
        const minX = Math.min(...xs), maxX = Math.max(...xs)
        const minY = Math.min(...ys), maxY = Math.max(...ys)
        newZones.push({
          id: `dxf-zone-${floorId}-${idx++}`,
          floorId,
          label: `Zone DXF ${idx}`,
          type: 'circulation',
          x: minX, y: minY, w: maxX - minX, h: maxY - minY,
          niveau: 2,
          color: '#E0E0E0',
          surfaceM2: (maxX - minX) * (maxY - minY),
        })
      }
    }
    set(s => ({ zones: [...s.zones, ...newZones] }))
  },

  // ── Export actions (PRD) ──────────────────────────────
  exportASPADPDF: async () => {
    const s = useVol2Store.getState()
    const data = {
      projectName: s.projectName, generatedAt: new Date().toISOString(),
      floors: s.floors, zones: s.zones, cameras: s.cameras, doors: s.doors,
      transitions: s.transitions, blindSpots: s.blindSpots,
      score: s.score ?? { total: 0, camScore: 0, zoneScore: 0, doorScore: 0, exitScore: 0, coverage: 0, issues: [], norm: 'APSAD R82' as const, generatedAt: new Date().toISOString() },
      coverageByFloor: s.coverageByFloor, capexTotal: computeCapex(s.cameras, s.doors, s.signageItems).total,
    }
    const cartouche = {
      projectName: s.projectName, address: 'Angre, Abidjan, Cote d\'Ivoire',
      date: new Date().toLocaleDateString('fr-FR'), reportNumber: `APSAD-${Date.now()}`,
      author: 'Proph3t Engine', version: '2.0', norm: 'APSAD R82 / NF S 61-938',
      scale: '1:200', establishmentType: 'ERP Type M', classificationICPE: 'Non concerne',
      visaResponsable: '', surface_m2: s.zones.reduce((a, z) => a + (z.surfaceM2 ?? 0), 0),
    }
    const blob = await exportASPADPDF(data, null, cartouche)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Plan_Securitaire_APSAD_R82.pdf'; a.click()
    URL.revokeObjectURL(url)
  },

  exportBudgetXLSX: () => {
    const s = useVol2Store.getState()
    const capex = computeCapex(s.cameras, s.doors, s.signageItems)
    const blob = exportCAPEXExcel(capex as Parameters<typeof exportCAPEXExcel>[0])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'CAPEX_Budget.xlsx'; a.click()
    URL.revokeObjectURL(url)
  },

  exportAnnotatedDWG: () => {
    const s = useVol2Store.getState()
    const data = {
      projectName: s.projectName, generatedAt: new Date().toISOString(),
      floors: s.floors, zones: s.zones, cameras: s.cameras, doors: s.doors,
      transitions: s.transitions, blindSpots: s.blindSpots,
      score: s.score ?? { total: 0, camScore: 0, zoneScore: 0, doorScore: 0, exitScore: 0, coverage: 0, issues: [], norm: 'APSAD R82' as const, generatedAt: new Date().toISOString() },
      coverageByFloor: s.coverageByFloor, capexTotal: 0,
    }
    const blob = exportAnnotatedDXF(data)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Plan_Annote.dxf'; a.click()
    URL.revokeObjectURL(url)
  },

  exportPowerPoint: async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx')
    const s = useVol2Store.getState()
    const sc = s.score
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: `Rapport Securitaire — ${s.projectName}`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: `Date : ${new Date().toLocaleDateString('fr-FR')}`, spacing: { after: 200 } }),
          new Paragraph({ text: 'Score Securitaire APSAD R82', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun({ text: `Score global : ${sc?.total ?? 'N/A'} / 100` })] }),
          new Paragraph({ children: [new TextRun({ text: `Couverture cameras : ${sc?.coverage ?? 0}%` })] }),
          new Paragraph({ children: [new TextRun({ text: `Cameras : ${s.cameras.length} | Portes : ${s.doors.length} | Zones : ${s.zones.length}` })] }),
          new Paragraph({ text: 'Problemes identifies', heading: HeadingLevel.HEADING_2 }),
          ...(sc?.issues ?? []).map(issue => new Paragraph({ children: [new TextRun({ text: `- ${issue}` })] })),
        ],
      }],
    })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Rapport_Securitaire.docx'; a.click()
    URL.revokeObjectURL(url)
  },

  // ── DXF Import result ────────────────────────────────────
  importDXFResult: (result) =>
    set((s) => {
      const existingZoneIds = new Set(s.zones.map((z) => z.id))
      const newZones = result.zones.filter((z) => !existingZoneIds.has(z.id))

      const existingDoorIds = new Set(s.doors.map((d) => d.id))
      const newDoors = result.doors
        ? result.doors.filter((d) => !existingDoorIds.has(d.id))
        : []

      return {
        zones: [...s.zones, ...newZones],
        doors: [...s.doors, ...newDoors],
      }
    }),

  // ── 3D Model Import ────────────────────────────────────
  setImported3DModel: (scene, format, floorId) => {
    addImported3DModel({ scene, format, floorId, addedAt: Date.now() })
  },

  // ── Plan reader ─────────────────────────────────────────
  importPlan: async (file, floorId) => {
    const result = await importPlanOrchestrator(file, floorId, {
      onProgress: (s) => set({ planImportState: s }),
    })
    set({ planImportState: result })
    if (result.detectedDims.length > 0) {
      set({ detectedDims: result.detectedDims })
    }
    if (result.calibration) {
      set({ calibration: result.calibration })
      if (result.calibration.realWidthM > 0 && result.calibration.realHeightM > 0) {
        set(s => ({
          floors: s.floors.map(f =>
            f.id === floorId
              ? { ...f, widthM: result.calibration!.realWidthM, heightM: result.calibration!.realHeightM }
              : f
          ),
        }))
      }
    }
    if (result.detectedZones.length > 0) {
      const newZones: Zone[] = result.detectedZones.map((rz, idx) => ({
        id: rz.id ?? `import-zone-${idx}`,
        floorId,
        label: rz.label,
        type: rz.estimatedType,
        x: rz.boundingBox.x,
        y: rz.boundingBox.y,
        w: rz.boundingBox.w,
        h: rz.boundingBox.h,
        niveau: 2 as const,
        color: rz.color ?? '#E0E0E0',
      }))
      set(s => ({ zones: [...s.zones, ...newZones] }))
    }
  },

  setPlanImportState: (state) => set({ planImportState: state }),
  setDetectedDims: (dims) => set({ detectedDims: dims }),
  setCalibration: (cal) => set({ calibration: cal }),
  toggleDims: () => set(s => ({ showDims: !s.showDims })),

  generateCotations: () => {
    const s = useVol2Store.getState()
    const activeFloor = s.floors.find(f => f.id === s.activeFloorId)
    if (!activeFloor) return
    const floorZones = s.zones.filter(z => z.floorId === s.activeFloorId)
    const floorCameras = s.cameras.filter(c => c.floorId === s.activeFloorId)
    const floorDoors = s.doors.filter(d => d.floorId === s.activeFloorId)
    const specs = generateCotationSpecs(activeFloor, floorZones, floorCameras, floorDoors, s.signageItems)
    set({ cotationSpecs: specs })
  },

  // ── Supabase hydration ─────────────────────────────────
  hydrateFromSupabase: async (projetId) => {
    // CRITICAL: if zones were already imported, do NOT overwrite them with mock data
    const currentZones = useVol2Store.getState().zones
    const hasImportedData = currentZones.length > 0 && currentZones.some(z => z.id.startsWith('import-') || z.id.startsWith('dwg-') || z.id.startsWith('dxf-') || z.id.startsWith('proph3t-') || z.id.startsWith('txt-zone-'))

    if (hasImportedData) {
      // Already have imported zones — keep them intact, do not inject seed data
      set({ isHydrating: false, projectId: projetId })
      return
    }

    set({ isHydrating: true, hydrationError: null })
    try {
      const data = await loadProjectFromSupabase(projetId)
      if (data && (data.floors.length > 0 || data.zones.length > 0)) {
        set({
          projectId: projetId,
          floors: data.floors,
          activeFloorId: data.floors[0]?.id ?? '',
          zones: data.zones,
          cameras: data.cameras,
          doors: data.doors,
          transitions: data.transitions,
          signageItems: data.signageItems,
          isHydrating: false,
        })
      } else {
        // No remote data: start empty — user populates via forms or DXF import
        set({ projectId: projetId, isHydrating: false })
      }
    } catch (err) {
      console.warn('[Vol2Store] Hydration failed:', err)
      set({
        isHydrating: false,
        hydrationError: err instanceof Error ? err.message : 'Erreur de chargement',
      })
    }
  },

  // ── Reset ───────────────────────────────────────────────
  resetProject: () => set(initialState),
}))
