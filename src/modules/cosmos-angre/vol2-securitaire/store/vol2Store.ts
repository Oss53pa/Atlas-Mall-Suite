// ═══ VOL.2 SECURITAIRE — Zustand Store ═══

import { create } from 'zustand'
import * as THREE from 'three'
import type {
  FloorLevel, Floor, Zone, Camera, Door, BlindSpot,
  SecurityScore, TransitionNode, EvacuationResult,
  MonteCarloResult, EvacuationScenario, CascadeTrigger,
  CascadeResult, CapexItem, WiseFMLink, CockpitMilestone,
  LibraryItem, MallBenchmark, ProPh3tMemory,
  ProjectMemorySummary, ChatMessage, SecurityScenario, SignageItem
} from '../../shared/proph3t/types'
import { addImported3DModel } from './imported3DModel'
import {
  scoreSecurite, findBlindSpots, computeFloorCoverage,
  solveCameraPlacement, recommendDoors, computeCapex
} from '../../shared/proph3t/engine'
import {
  importPlan as importPlanOrchestrator,
  generateCotationSpecs,
  renderCotationsOnPDF,
} from '../../shared/planReader'
import type { DimEntity, CalibrationResult, CotationSpec, PlanImportState } from '../../shared/planReader/planReaderTypes'
import { runCascade as cascadeRun, type CascadeState } from '../../shared/proph3t/cascadeEngine'
import { runMonteCarlo as monteCarloRun, simulateEvacuation } from '../../shared/proph3t/simulationEngine'
import { optimizeSignaleticsPlacement } from '../../shared/proph3t/signaleticsEngine'
import { exportASPADPDF } from '../../../export/exportPDFApsad'
import { exportCAPEXExcel } from '../../../export/exportCAPEX'
import { exportAnnotatedDXF } from '../../../export/exportDXF'

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_FLOORS: Floor[] = [
  {
    id: 'floor-b1',
    level: 'B1',
    order: 0,
    widthM: 180,
    heightM: 120,
    zones: [],
    transitions: [],
  },
  {
    id: 'floor-rdc',
    level: 'RDC',
    order: 1,
    widthM: 200,
    heightM: 140,
    zones: [],
    transitions: [],
  },
  {
    id: 'floor-r1',
    level: 'R+1',
    order: 2,
    widthM: 200,
    heightM: 140,
    zones: [],
    transitions: [],
  },
]

const MOCK_TRANSITIONS: TransitionNode[] = [
  {
    id: 'tr-esc-fixe-01',
    type: 'escalier_fixe',
    fromFloor: 'B1',
    toFloor: 'RDC',
    x: 60,
    y: 50,
    pmr: false,
    capacityPerMin: 30,
    label: 'Esc. Fixe B1→RDC',
  },
  {
    id: 'tr-asc-01',
    type: 'ascenseur',
    fromFloor: 'B1',
    toFloor: 'RDC',
    x: 80,
    y: 50,
    pmr: true,
    capacityPerMin: 12,
    label: 'Asc. Principal B1→RDC',
  },
  {
    id: 'tr-escalator-up-01',
    type: 'escalator_montant',
    fromFloor: 'RDC',
    toFloor: 'R+1',
    x: 100,
    y: 70,
    pmr: false,
    capacityPerMin: 60,
    label: 'Escalator ↑ RDC→R+1',
  },
  {
    id: 'tr-escalator-down-01',
    type: 'escalator_descendant',
    fromFloor: 'R+1',
    toFloor: 'RDC',
    x: 105,
    y: 70,
    pmr: false,
    capacityPerMin: 60,
    label: 'Escalator ↓ R+1→RDC',
  },
  {
    id: 'tr-rampe-pmr-01',
    type: 'rampe_pmr',
    fromFloor: 'RDC',
    toFloor: 'R+1',
    x: 130,
    y: 90,
    pmr: true,
    capacityPerMin: 10,
    label: 'Rampe PMR RDC→R+1',
  },
  {
    id: 'tr-esc-secours-01',
    type: 'escalier_secours',
    fromFloor: 'B1',
    toFloor: 'RDC',
    x: 10,
    y: 120,
    pmr: false,
    capacityPerMin: 40,
    label: 'Esc. Secours B1→RDC',
  },
  {
    id: 'tr-esc-secours-02',
    type: 'escalier_secours',
    fromFloor: 'RDC',
    toFloor: 'R+1',
    x: 190,
    y: 10,
    pmr: false,
    capacityPerMin: 40,
    label: 'Esc. Secours RDC→R+1',
  },
]

const MOCK_ZONES: Zone[] = [
  {
    id: 'zone-rdc-01',
    floorId: 'floor-rdc',
    label: 'Hall Principal',
    type: 'circulation',
    x: 40,
    y: 20,
    w: 120,
    h: 30,
    niveau: 5,
    color: '#E3F2FD',
    surfaceM2: 3600,
  },
  {
    id: 'zone-rdc-02',
    floorId: 'floor-rdc',
    label: 'Boutique Zara',
    type: 'commerce',
    x: 10,
    y: 55,
    w: 40,
    h: 25,
    niveau: 3,
    color: '#FFF3E0',
    surfaceM2: 1000,
  },
  {
    id: 'zone-rdc-03',
    floorId: 'floor-rdc',
    label: 'Boutique Celio',
    type: 'commerce',
    x: 55,
    y: 55,
    w: 30,
    h: 25,
    niveau: 2,
    color: '#FFF3E0',
    surfaceM2: 750,
  },
  {
    id: 'zone-rdc-04',
    floorId: 'floor-rdc',
    label: 'Restauration Food Court',
    type: 'restauration',
    x: 90,
    y: 55,
    w: 50,
    h: 30,
    niveau: 4,
    color: '#FFEBEE',
    surfaceM2: 1500,
  },
  {
    id: 'zone-rdc-05',
    floorId: 'floor-rdc',
    label: 'Services Financiers',
    type: 'financier',
    x: 145,
    y: 55,
    w: 25,
    h: 20,
    niveau: 5,
    color: '#E8EAF6',
    surfaceM2: 500,
  },
  {
    id: 'zone-rdc-06',
    floorId: 'floor-rdc',
    label: 'Local Technique',
    type: 'technique',
    x: 175,
    y: 55,
    w: 15,
    h: 15,
    niveau: 5,
    color: '#ECEFF1',
    surfaceM2: 225,
  },
  {
    id: 'zone-rdc-07',
    floorId: 'floor-rdc',
    label: 'Sortie Secours Sud',
    type: 'sortie_secours',
    x: 95,
    y: 130,
    w: 10,
    h: 10,
    niveau: 5,
    color: '#C8E6C9',
    surfaceM2: 100,
  },
  {
    id: 'zone-rdc-08',
    floorId: 'floor-rdc',
    label: 'Back-Office Securite',
    type: 'backoffice',
    x: 175,
    y: 75,
    w: 15,
    h: 20,
    niveau: 5,
    color: '#F3E5F5',
    surfaceM2: 300,
  },
]

const MOCK_CAMERAS: Camera[] = [
  {
    id: 'cam-rdc-01',
    floorId: 'floor-rdc',
    label: 'Cam Hall Entree',
    model: 'XNV-8080R',
    x: 100,
    y: 20,
    angle: 180,
    fov: 110,
    range: 80,
    rangeM: 15,
    color: '#2196F3',
    priority: 'haute',
    capexFcfa: 850_000,
    autoPlaced: false,
    coverageScore: 92,
  },
  {
    id: 'cam-rdc-02',
    floorId: 'floor-rdc',
    label: 'Cam Food Court',
    model: 'PTZ QNP-9300RWB',
    x: 115,
    y: 60,
    angle: 0,
    fov: 360,
    range: 100,
    rangeM: 25,
    color: '#FF9800',
    priority: 'haute',
    capexFcfa: 2_200_000,
    autoPlaced: false,
    coverageScore: 88,
  },
  {
    id: 'cam-rdc-03',
    floorId: 'floor-rdc',
    label: 'Cam Financier',
    model: 'DS-2CD2T47G2',
    x: 157,
    y: 55,
    angle: 270,
    fov: 90,
    range: 60,
    rangeM: 12,
    color: '#F44336',
    priority: 'critique',
    capexFcfa: 650_000,
    autoPlaced: false,
    coverageScore: 95,
  },
  {
    id: 'cam-rdc-04',
    floorId: 'floor-rdc',
    label: 'Cam Sortie Secours',
    model: 'QNO-8080R',
    x: 100,
    y: 130,
    angle: 90,
    fov: 100,
    range: 50,
    rangeM: 10,
    color: '#4CAF50',
    priority: 'normale',
    capexFcfa: 480_000,
    autoPlaced: true,
    coverageScore: 78,
  },
]

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

  // Signalétique
  signageItems: SignageItem[]

  // Plan reader
  planImportState: PlanImportState | null
  detectedDims: DimEntity[]
  calibration: CalibrationResult | null
  showDims: boolean
  cotationSpecs: CotationSpec[]

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

  // Actions - Reset
  resetProject: () => void
}

// ─── Initial State (data only, no actions) ───────────────────

const initialState = {
  projectId: 'cosmos-angre-vol2',
  projectName: 'Cosmos Angre — Vol.2 Securitaire',

  floors: MOCK_FLOORS,
  activeFloorId: 'floor-rdc',
  transitions: MOCK_TRANSITIONS,

  zones: MOCK_ZONES,
  cameras: MOCK_CAMERAS,
  doors: [] as Door[],
  blindSpots: [] as BlindSpot[],

  score: null as SecurityScore | null,
  coverageByFloor: {
    'floor-b1': 0,
    'floor-rdc': 68,
    'floor-r1': 0,
  } as Record<string, number>,

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

  planImportState: null as PlanImportState | null,
  detectedDims: [] as DimEntity[],
  calibration: null as CalibrationResult | null,
  showDims: false,
  cotationSpecs: [] as CotationSpec[],

  selectedEntityId: null as string | null,
  selectedEntityType: null as EntityType | null,
  showFov: true,
  showBlindSpots: true,
  showHeatmap: false,
  showTransitions: true,
  simulationSpeed: 1,

  libraryOpen: false,
  libraryTab: 'camera' as const,
} satisfies Record<string, unknown>

// ─── Store ───────────────────────────────────────────────────

export const useVol2Store = create<Vol2State>()((set) => ({
  ...initialState,

  // ── Floors ──────────────────────────────────────────────
  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  addFloor: (floor) => set((s) => ({ floors: [...s.floors, floor] })),

  // ── Zones ───────────────────────────────────────────────
  addZone: (zone) => set((s) => ({ zones: [...s.zones, zone] })),
  updateZone: (id, updates) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === id ? { ...z, ...updates } : z)),
    })),
  deleteZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
  setZones: (zones) => set({ zones }),

  // ── Cameras ─────────────────────────────────────────────
  addCamera: (camera) => set((s) => ({ cameras: [...s.cameras, camera] })),
  updateCamera: (id, updates) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  deleteCamera: (id) => set((s) => ({ cameras: s.cameras.filter((c) => c.id !== id) })),
  setCameras: (cameras) => set({ cameras }),

  // ── Doors ───────────────────────────────────────────────
  addDoor: (door) => set((s) => ({ doors: [...s.doors, door] })),
  updateDoor: (id, updates) =>
    set((s) => ({
      doors: s.doors.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  deleteDoor: (id) => set((s) => ({ doors: s.doors.filter((d) => d.id !== id) })),
  setDoors: (doors) => set({ doors }),

  // ── Transitions ─────────────────────────────────────────
  addTransition: (t) => set((s) => ({ transitions: [...s.transitions, t] })),
  removeTransition: (id) =>
    set((s) => ({ transitions: s.transitions.filter((t) => t.id !== id) })),

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
    set((s) => ({
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
    const cascadeState: CascadeState = {
      floors: s.floors, zones: s.zones, cameras: s.cameras,
      doors: s.doors, transitions: s.transitions, signageItems: s.signageItems,
    }
    const result = await cascadeRun(cascadeState, trigger)
    set({
      blindSpots: result.blindSpots,
      score: result.score,
      coverageByFloor: result.coverageByFloor,
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

  // ── Reset ───────────────────────────────────────────────
  resetProject: () => set(initialState),
}))
