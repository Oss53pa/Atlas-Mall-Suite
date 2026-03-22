// ═══ VOL.3 PARCOURS CLIENT — Zustand Store ═══

import { create } from 'zustand'
import type {
  Floor, Zone, TransitionNode, POI, SignageItem,
  MomentCle, VisitorProfile, NavigationGraph, PathResult,
  ProjectMemorySummary, ChatMessage
} from '../../shared/proph3t/types'

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
    label: 'Espace Loisirs',
    type: 'loisirs',
    x: 10,
    y: 85,
    w: 40,
    h: 25,
    niveau: 3,
    color: '#E8F5E9',
    surfaceM2: 1000,
  },
  {
    id: 'zone-rdc-07',
    floorId: 'floor-rdc',
    label: 'Espace Services',
    type: 'services',
    x: 145,
    y: 80,
    w: 25,
    h: 20,
    niveau: 2,
    color: '#FFF9C4',
    surfaceM2: 500,
  },
  {
    id: 'zone-rdc-08',
    floorId: 'floor-rdc',
    label: 'Parking Access',
    type: 'parking',
    x: 175,
    y: 110,
    w: 20,
    h: 20,
    niveau: 1,
    color: '#CFD8DC',
    surfaceM2: 400,
  },
]

const MOCK_POIS: POI[] = [
  {
    id: 'poi-01',
    floorId: 'floor-rdc',
    label: 'Entree Principale',
    type: 'sortie',
    x: 100,
    y: 5,
    pmr: true,
    color: '#4CAF50',
    icon: 'door-open',
  },
  {
    id: 'poi-02',
    floorId: 'floor-rdc',
    label: 'Zara',
    type: 'enseigne',
    x: 30,
    y: 60,
    pmr: true,
    color: '#000000',
    icon: 'store',
  },
  {
    id: 'poi-03',
    floorId: 'floor-rdc',
    label: 'Celio',
    type: 'enseigne',
    x: 70,
    y: 60,
    pmr: true,
    color: '#1565C0',
    icon: 'store',
  },
  {
    id: 'poi-04',
    floorId: 'floor-rdc',
    label: 'Food Court Central',
    type: 'restauration',
    x: 115,
    y: 65,
    pmr: true,
    color: '#E65100',
    icon: 'utensils',
  },
  {
    id: 'poi-05',
    floorId: 'floor-rdc',
    label: 'Cosmos Club Lounge',
    type: 'cosmos_club',
    x: 155,
    y: 60,
    pmr: true,
    color: '#7B1FA2',
    icon: 'crown',
    cosmosClubOffre: 'Accueil VIP, consigne, personal shopper',
  },
  {
    id: 'poi-06',
    floorId: 'floor-rdc',
    label: 'Toilettes RDC',
    type: 'toilettes',
    x: 175,
    y: 60,
    pmr: true,
    color: '#0097A7',
    icon: 'restroom',
  },
  {
    id: 'poi-07',
    floorId: 'floor-rdc',
    label: 'Ascenseur Principal',
    type: 'ascenseur',
    x: 80,
    y: 50,
    pmr: true,
    color: '#5D4037',
    icon: 'elevator',
    linkedFloorId: 'floor-b1',
  },
  {
    id: 'poi-08',
    floorId: 'floor-rdc',
    label: 'Escalator RDC→R+1',
    type: 'escalator',
    x: 100,
    y: 70,
    pmr: false,
    color: '#455A64',
    icon: 'escalator',
    linkedFloorId: 'floor-r1',
  },
  {
    id: 'poi-09',
    floorId: 'floor-rdc',
    label: 'Totem Info Central',
    type: 'totem',
    x: 100,
    y: 30,
    pmr: true,
    color: '#FF6F00',
    icon: 'info-circle',
    qrUrl: 'https://cosmos-angre.ci/plan',
  },
  {
    id: 'poi-10',
    floorId: 'floor-rdc',
    label: 'Pharmacie Cosmos',
    type: 'pharmacie',
    x: 55,
    y: 85,
    pmr: true,
    color: '#2E7D32',
    icon: 'prescription',
  },
  {
    id: 'poi-11',
    floorId: 'floor-rdc',
    label: 'Caisse Centrale',
    type: 'caisse',
    x: 90,
    y: 85,
    pmr: true,
    color: '#BF360C',
    icon: 'cash-register',
  },
  {
    id: 'poi-12',
    floorId: 'floor-b1',
    label: 'Acces Parking B1',
    type: 'parking',
    x: 90,
    y: 60,
    pmr: true,
    color: '#546E7A',
    icon: 'car',
  },
]

const MOCK_SIGNAGE: SignageItem[] = [
  {
    id: 'sign-01',
    floorId: 'floor-rdc',
    type: 'totem_5m',
    x: 100,
    y: 10,
    orientationDeg: 180,
    poseHeightM: 0,
    textHeightMm: 200,
    maxReadingDistanceM: 25,
    visibilityScore: 95,
    isLuminous: true,
    requiresBAES: false,
    content: 'BIENVENUE — Cosmos Mall Angre',
    ref: 'TOTEM-5M-001',
    capexFcfa: 3_500_000,
    normRef: 'NF P96-105',
  },
  {
    id: 'sign-02',
    floorId: 'floor-rdc',
    type: 'panneau_dir_suspendu',
    x: 60,
    y: 45,
    orientationDeg: 0,
    poseHeightM: 2.8,
    textHeightMm: 80,
    maxReadingDistanceM: 15,
    visibilityScore: 82,
    isLuminous: true,
    requiresBAES: false,
    content: '← Zara  |  Celio →  |  Food Court ↑',
    ref: 'PDS-002',
    capexFcfa: 450_000,
    normRef: 'NF P96-105',
  },
  {
    id: 'sign-03',
    floorId: 'floor-rdc',
    type: 'pictogramme_pmr',
    x: 80,
    y: 48,
    orientationDeg: 0,
    poseHeightM: 1.4,
    textHeightMm: 40,
    maxReadingDistanceM: 5,
    visibilityScore: 90,
    isLuminous: false,
    requiresBAES: false,
    content: 'Ascenseur PMR →',
    ref: 'PICTO-PMR-003',
    capexFcfa: 85_000,
    normRef: 'NF P96-105 / ISO 7001',
  },
  {
    id: 'sign-04',
    floorId: 'floor-rdc',
    type: 'sortie_secours_led',
    x: 95,
    y: 128,
    orientationDeg: 180,
    poseHeightM: 2.5,
    textHeightMm: 100,
    maxReadingDistanceM: 30,
    visibilityScore: 98,
    isLuminous: true,
    requiresBAES: true,
    content: 'SORTIE DE SECOURS',
    ref: 'SORTIE-LED-004',
    capexFcfa: 280_000,
    normRef: 'NF C 71-800 / NF S 61-937',
  },
]

const MOCK_PROFILES: VisitorProfile[] = [
  {
    id: 'profile-famille',
    name: 'Famille',
    speed: 0.8,
    pmrRequired: false,
    attractors: ['enseigne', 'restauration', 'toilettes', 'caisse'],
    dwellMultiplier: 1.4,
  },
  {
    id: 'profile-jeune-urbain',
    name: 'Jeune Urbain',
    speed: 1.2,
    pmrRequired: false,
    attractors: ['enseigne', 'restauration', 'cosmos_club'],
    dwellMultiplier: 0.8,
  },
  {
    id: 'profile-senior',
    name: 'Senior',
    speed: 0.5,
    pmrRequired: false,
    attractors: ['pharmacie', 'banque', 'toilettes', 'service_client'],
    dwellMultiplier: 1.6,
  },
  {
    id: 'profile-vip',
    name: 'VIP Cosmos',
    speed: 1.0,
    pmrRequired: false,
    attractors: ['cosmos_club', 'enseigne', 'restauration', 'hotel'],
    dwellMultiplier: 1.2,
  },
  {
    id: 'profile-touriste',
    name: 'Touriste',
    speed: 0.7,
    pmrRequired: false,
    attractors: ['totem', 'enseigne', 'restauration', 'cosmos_club'],
    dwellMultiplier: 1.8,
  },
  {
    id: 'profile-pmr',
    name: 'PMR',
    speed: 0.4,
    pmrRequired: true,
    attractors: ['ascenseur', 'toilettes', 'enseigne', 'pharmacie'],
    dwellMultiplier: 2.0,
  },
]

const MOCK_MOMENTS: MomentCle[] = [
  {
    id: 'moment-01',
    number: 1,
    name: 'Arrivee & Orientation',
    floorId: 'floor-rdc',
    x: 100,
    y: 10,
    poiId: 'poi-01',
    kpi: 'Temps d\'orientation < 15s',
    friction: 'Totem info peu visible depuis l\'entree',
    recommendation: 'Ajouter totem lumineux 5m face entree',
    signageItems: ['sign-01'],
  },
  {
    id: 'moment-02',
    number: 2,
    name: 'Decision de Direction',
    floorId: 'floor-rdc',
    x: 100,
    y: 35,
    poiId: 'poi-09',
    kpi: 'Taux d\'hesitation < 10%',
    friction: 'Carrefour sans signaletique directionnelle claire',
    recommendation: 'Panneau directionnel suspendu au carrefour principal',
    signageItems: ['sign-02'],
  },
  {
    id: 'moment-03',
    number: 3,
    name: 'Navigation Inter-etages',
    floorId: 'floor-rdc',
    x: 80,
    y: 50,
    poiId: 'poi-07',
    kpi: 'Accessibilite PMR 100%',
    friction: 'Signaletique PMR insuffisante vers ascenseur',
    recommendation: 'Pictogramme PMR a chaque intersection',
    cosmosClubAction: 'Accompagnement personnalise inter-niveaux',
    signageItems: ['sign-03'],
  },
  {
    id: 'moment-04',
    number: 4,
    name: 'Decouverte Enseigne',
    floorId: 'floor-rdc',
    x: 30,
    y: 60,
    poiId: 'poi-02',
    kpi: 'Visibilite enseigne > 15m',
    friction: 'Enseignes noyees dans le bruit visuel',
    recommendation: 'Hierarchie visuelle : enseignes 150mm, directionnels 80mm',
    signageItems: [],
  },
  {
    id: 'moment-05',
    number: 5,
    name: 'Pause & Restauration',
    floorId: 'floor-rdc',
    x: 115,
    y: 65,
    poiId: 'poi-04',
    kpi: 'Temps moyen pause 25min',
    friction: 'Difficulte a localiser le food court depuis boutiques',
    recommendation: 'Marquage sol + bannieres suspendues vers food court',
    cosmosClubAction: 'Menu VIP et espace reserve',
    signageItems: [],
  },
  {
    id: 'moment-06',
    number: 6,
    name: 'Checkout & Services',
    floorId: 'floor-rdc',
    x: 90,
    y: 85,
    poiId: 'poi-11',
    kpi: 'File d\'attente < 3min',
    friction: 'Localisation caisse confuse en periode affluence',
    recommendation: 'Borne interactive avec temps d\'attente en temps reel',
    signageItems: [],
  },
  {
    id: 'moment-07',
    number: 7,
    name: 'Sortie & Fidelisation',
    floorId: 'floor-rdc',
    x: 100,
    y: 5,
    poiId: 'poi-01',
    kpi: 'Taux inscription Cosmos Club > 30%',
    friction: 'Aucune incitation a la fidelisation en sortie',
    recommendation: 'Totem Cosmos Club en sortie avec QR code inscription',
    cosmosClubAction: 'Offre de bienvenue -10% prochain achat',
    signageItems: [],
  },
]

// ─── Entity type union ───────────────────────────────────────

type EntityType = 'poi' | 'signage' | 'moment'

// ─── State Interface ─────────────────────────────────────────

interface Vol3State {
  // Project
  projectId: string
  projectName: string

  // Multi-floor
  floors: Floor[]
  activeFloorId: string
  transitions: TransitionNode[]

  // Entities
  zones: Zone[]
  pois: POI[]
  signageItems: SignageItem[]
  moments: MomentCle[]

  // Navigation
  navGraph: NavigationGraph | null
  currentPath: PathResult | null

  // Profiles
  visitorProfiles: VisitorProfile[]
  activeProfileId: string | null

  // Heatmap
  heatmapData: number[][] | null
  heatmapFloorId: string | null

  // Memory
  memory: ProjectMemorySummary | null

  // Chat
  chatMessages: ChatMessage[]

  // UI
  selectedEntityId: string | null
  selectedEntityType: EntityType | null
  showSignage: boolean
  showWayfinding: boolean
  showHeatmap: boolean
  showMoments: boolean
  showPmrOnly: boolean

  // Library
  libraryOpen: boolean
  libraryTab: 'camera' | 'door' | 'signage' | 'mobilier_pmr'

  // Actions - Floors
  setActiveFloor: (floorId: string) => void
  addFloor: (floor: Floor) => void

  // Actions - POIs
  addPoi: (poi: POI) => void
  updatePoi: (id: string, updates: Partial<POI>) => void
  deletePoi: (id: string) => void
  setPois: (pois: POI[]) => void

  // Actions - Signage
  addSignageItem: (item: SignageItem) => void
  updateSignageItem: (id: string, updates: Partial<SignageItem>) => void
  deleteSignageItem: (id: string) => void
  setSignageItems: (items: SignageItem[]) => void

  // Actions - Moments
  setMoments: (moments: MomentCle[]) => void

  // Actions - Navigation
  setNavGraph: (graph: NavigationGraph | null) => void
  setCurrentPath: (path: PathResult | null) => void

  // Actions - Heatmap
  setHeatmapData: (data: number[][] | null, floorId?: string | null) => void

  // Actions - Memory
  setMemory: (memory: ProjectMemorySummary) => void

  // Actions - Chat
  addChatMessage: (msg: ChatMessage) => void
  clearChat: () => void

  // Actions - UI
  selectEntity: (id: string | null, type: EntityType | null) => void
  toggleSignage: () => void
  toggleWayfinding: () => void
  toggleHeatmap: () => void
  toggleMoments: () => void
  togglePmrOnly: () => void
  setLibraryOpen: (open: boolean) => void
  setLibraryTab: (tab: Vol3State['libraryTab']) => void

  // Actions - Profiles
  setActiveProfile: (id: string | null) => void

  // Actions - Reset
  resetProject: () => void
}

// ─── Initial State (data only, no actions) ───────────────────

const initialState = {
  projectId: 'cosmos-angre-vol3',
  projectName: 'Cosmos Angre — Vol.3 Parcours Client',

  floors: MOCK_FLOORS,
  activeFloorId: 'floor-rdc',
  transitions: MOCK_TRANSITIONS,

  zones: MOCK_ZONES,
  pois: MOCK_POIS,
  signageItems: MOCK_SIGNAGE,
  moments: MOCK_MOMENTS,

  navGraph: null as NavigationGraph | null,
  currentPath: null as PathResult | null,

  visitorProfiles: MOCK_PROFILES,
  activeProfileId: null as string | null,

  heatmapData: null as number[][] | null,
  heatmapFloorId: null as string | null,

  memory: null as ProjectMemorySummary | null,

  chatMessages: [] as ChatMessage[],

  selectedEntityId: null as string | null,
  selectedEntityType: null as EntityType | null,
  showSignage: true,
  showWayfinding: true,
  showHeatmap: false,
  showMoments: true,
  showPmrOnly: false,

  libraryOpen: false,
  libraryTab: 'signage' as const,
} satisfies Record<string, unknown>

// ─── Store ───────────────────────────────────────────────────

export const useVol3Store = create<Vol3State>()((set) => ({
  ...initialState,

  // ── Floors ──────────────────────────────────────────────
  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  addFloor: (floor) => set((s) => ({ floors: [...s.floors, floor] })),

  // ── POIs ────────────────────────────────────────────────
  addPoi: (poi) => set((s) => ({ pois: [...s.pois, poi] })),
  updatePoi: (id, updates) =>
    set((s) => ({
      pois: s.pois.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deletePoi: (id) => set((s) => ({ pois: s.pois.filter((p) => p.id !== id) })),
  setPois: (pois) => set({ pois }),

  // ── Signage ─────────────────────────────────────────────
  addSignageItem: (item) =>
    set((s) => ({ signageItems: [...s.signageItems, item] })),
  updateSignageItem: (id, updates) =>
    set((s) => ({
      signageItems: s.signageItems.map((si) =>
        si.id === id ? { ...si, ...updates } : si
      ),
    })),
  deleteSignageItem: (id) =>
    set((s) => ({ signageItems: s.signageItems.filter((si) => si.id !== id) })),
  setSignageItems: (items) => set({ signageItems: items }),

  // ── Moments ─────────────────────────────────────────────
  setMoments: (moments) => set({ moments }),

  // ── Navigation ──────────────────────────────────────────
  setNavGraph: (graph) => set({ navGraph: graph }),
  setCurrentPath: (path) => set({ currentPath: path }),

  // ── Heatmap ─────────────────────────────────────────────
  setHeatmapData: (data, floorId) =>
    set({ heatmapData: data, heatmapFloorId: floorId ?? null }),

  // ── Memory ──────────────────────────────────────────────
  setMemory: (memory) => set({ memory }),

  // ── Chat ────────────────────────────────────────────────
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),

  // ── UI ──────────────────────────────────────────────────
  selectEntity: (id, type) =>
    set({ selectedEntityId: id, selectedEntityType: type }),
  toggleSignage: () => set((s) => ({ showSignage: !s.showSignage })),
  toggleWayfinding: () => set((s) => ({ showWayfinding: !s.showWayfinding })),
  toggleHeatmap: () => set((s) => ({ showHeatmap: !s.showHeatmap })),
  toggleMoments: () => set((s) => ({ showMoments: !s.showMoments })),
  togglePmrOnly: () => set((s) => ({ showPmrOnly: !s.showPmrOnly })),
  setLibraryOpen: (open) => set({ libraryOpen: open }),
  setLibraryTab: (tab) => set({ libraryTab: tab }),

  // ── Profiles ────────────────────────────────────────────
  setActiveProfile: (id) => set({ activeProfileId: id }),

  // ── Reset ───────────────────────────────────────────────
  resetProject: () => set(initialState),
}))
