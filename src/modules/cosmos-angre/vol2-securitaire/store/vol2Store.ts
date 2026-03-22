// ═══ VOL.2 SECURITAIRE — Zustand Store ═══

import { create } from 'zustand'
import * as THREE from 'three'
import type {
  FloorLevel, Floor, Zone, Camera, Door, BlindSpot,
  SecurityScore, TransitionNode, EvacuationResult,
  MonteCarloResult, EvacuationScenario, CascadeTrigger,
  CascadeResult, CapexItem, WiseFMLink, CockpitMilestone,
  LibraryItem, MallBenchmark, ProPh3tMemory,
  ProjectMemorySummary, ChatMessage
} from '../../shared/proph3t/types'
import { addImported3DModel } from './imported3DModel'

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

  // Actions - Automation flags (actual computation via workers)
  runAutoCameras: () => void
  runAutoDoors: () => void
  runBlindSpots: () => void
  runFullAnalysis: () => void

  // Actions - DXF import
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

  // ── Automation flags ────────────────────────────────────
  runAutoCameras: () => set({ isRunningAutoCameras: true }),
  runAutoDoors: () => set({ isRunningAutoDoors: true }),
  runBlindSpots: () => set({ isRunningBlindSpots: true }),
  runFullAnalysis: () => set({ isRunningFullAnalysis: true }),

  // ── DXF Import ──────────────────────────────────────────
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

  // ── Reset ───────────────────────────────────────────────
  resetProject: () => set(initialState),
}))
