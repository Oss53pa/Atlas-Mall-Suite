// ═══ VOL.3 PARCOURS CLIENT — Journey Map & Carte du Parcours Store ═══

import { create } from 'zustand'

/* ═══════════════════ TYPES ═══════════════════ */

export interface JourneyStage {
  id: string
  label: string
  color: string
  duration: string
  durationPct: number // for the duration bar (0 = continu)
}

export interface JourneyStep {
  id: string
  stageId: string
  label: string
}

export interface JourneyEmotion {
  stageId: string
  level: number // 1-5
  emoji: string
  label: string
}

export interface JourneyTouchpoint {
  id: string
  name: string
  activeStageIds: string[] // which stages this touchpoint is active in
}

export interface JourneyDepartment {
  id: string
  name: string
  activeStageIds: string[]
}

// For the Carte du Parcours (Swimlane) view
export interface CarteTouchpoint {
  id: string
  label: string
  type: 'géré' | 'gagné'
  stageId: string
  zone: 'digital' | 'physical'
  col: number // 0 or 1 (left/right within stage column)
  row: number // 1-4 (distance from timeline)
}

/* ═══════════════════ STATE ═══════════════════ */

export interface JourneyState {
  // Data
  stages: JourneyStage[]
  steps: JourneyStep[]
  emotions: JourneyEmotion[]
  touchpoints: JourneyTouchpoint[]
  departments: JourneyDepartment[]
  carteTouchpoints: CarteTouchpoint[]

  // UI
  selectedStageId: string | null
  editingId: string | null // id of any item being edited inline

  // Actions — Stages
  addStage: (stage: JourneyStage) => void
  updateStage: (id: string, updates: Partial<JourneyStage>) => void
  deleteStage: (id: string) => void
  reorderStages: (ids: string[]) => void

  // Actions — Steps
  addStep: (step: JourneyStep) => void
  updateStep: (id: string, updates: Partial<JourneyStep>) => void
  deleteStep: (id: string) => void

  // Actions — Emotions
  updateEmotion: (stageId: string, updates: Partial<JourneyEmotion>) => void

  // Actions — Touchpoints (Journey Layers view)
  addTouchpoint: (tp: JourneyTouchpoint) => void
  updateTouchpoint: (id: string, updates: Partial<JourneyTouchpoint>) => void
  deleteTouchpoint: (id: string) => void
  toggleTouchpointStage: (tpId: string, stageId: string) => void

  // Actions — Departments
  addDepartment: (dept: JourneyDepartment) => void
  updateDepartment: (id: string, updates: Partial<JourneyDepartment>) => void
  deleteDepartment: (id: string) => void
  toggleDepartmentStage: (deptId: string, stageId: string) => void

  // Actions — Carte touchpoints (Swimlane view)
  addCarteTouchpoint: (ct: CarteTouchpoint) => void
  updateCarteTouchpoint: (id: string, updates: Partial<CarteTouchpoint>) => void
  deleteCarteTouchpoint: (id: string) => void

  // UI actions
  setSelectedStage: (id: string | null) => void
  setEditingId: (id: string | null) => void
}

/* ═══════════════════ ID GENERATOR ═══════════════════ */

let _nextId = 1000
function _uid(prefix: string): string {
  return `${prefix}-${++_nextId}`
}

/* ═══════════════════ INITIAL DATA ═══════════════════ */

const INIT_STAGES: JourneyStage[] = [
  { id: 'stage-1', label: 'Approche',      color: '#34d399', duration: '~10 min', durationPct: 8 },
  { id: 'stage-2', label: 'Parking',       color: '#38bdf8', duration: '~5 min',  durationPct: 4 },
  { id: 'stage-3', label: 'Entrée',        color: '#a77d4c', duration: '~3 min',  durationPct: 3 },
  { id: 'stage-4', label: 'Hall central',  color: '#f59e0b', duration: '~15 min', durationPct: 13 },
  { id: 'stage-5', label: 'Shopping',      color: '#ef4444', duration: '~45 min', durationPct: 38 },
  { id: 'stage-6', label: 'Restauration',  color: '#06b6d4', duration: '~40 min', durationPct: 34 },
  { id: 'stage-7', label: 'Fidélisation',  color: '#ec4899', duration: 'continu', durationPct: 0 },
]

const INIT_STEPS: JourneyStep[] = [
  // Approche
  { id: 'step-1',  stageId: 'stage-1', label: 'Voit panneaux' },
  { id: 'step-2',  stageId: 'stage-1', label: 'Cherche sur Maps' },
  { id: 'step-3',  stageId: 'stage-1', label: 'Découvre Instagram' },
  { id: 'step-4',  stageId: 'stage-1', label: 'Scanne QR' },
  // Parking
  { id: 'step-5',  stageId: 'stage-2', label: 'Entre parking' },
  { id: 'step-6',  stageId: 'stage-2', label: 'Suit guidage LED' },
  { id: 'step-7',  stageId: 'stage-2', label: 'Localise véhicule' },
  { id: 'step-8',  stageId: 'stage-2', label: 'Paie NFC/QR' },
  // Entrée
  { id: 'step-9',  stageId: 'stage-3', label: 'Franchit portes' },
  { id: 'step-10', stageId: 'stage-3', label: 'Push bienvenue' },
  { id: 'step-11', stageId: 'stage-3', label: 'WiFi gratuit' },
  { id: 'step-12', stageId: 'stage-3', label: 'Directory digital' },
  // Hall central
  { id: 'step-13', stageId: 'stage-4', label: 'Découvre atrium' },
  { id: 'step-14', stageId: 'stage-4', label: 'Photos #Cosmos' },
  { id: 'step-15', stageId: 'stage-4', label: 'Événements du jour' },
  { id: 'step-16', stageId: 'stage-4', label: 'Explore niveaux' },
  // Shopping
  { id: 'step-17', stageId: 'stage-5', label: 'Parcourt galeries' },
  { id: 'step-18', stageId: 'stage-5', label: 'Visite boutiques' },
  { id: 'step-19', stageId: 'stage-5', label: 'Promos beacons' },
  { id: 'step-20', stageId: 'stage-5', label: 'Bornes catalogue' },
  // Restauration
  { id: 'step-21', stageId: 'stage-6', label: 'Food court R+2' },
  { id: 'step-22', stageId: 'stage-6', label: 'Commande QR' },
  { id: 'step-23', stageId: 'stage-6', label: 'Terrasse rooftop' },
  { id: 'step-24', stageId: 'stage-6', label: 'Réserve Le Cosmos' },
  // Fidélisation
  { id: 'step-25', stageId: 'stage-7', label: 'Inscrit Club' },
  { id: 'step-26', stageId: 'stage-7', label: 'Cumule points' },
  { id: 'step-27', stageId: 'stage-7', label: 'Offres ciblées' },
  { id: 'step-28', stageId: 'stage-7', label: 'Monte en niveau' },
]

const INIT_EMOTIONS: JourneyEmotion[] = [
  { stageId: 'stage-1', level: 3,   emoji: '\u{1F914}', label: 'Curiosité' },
  { stageId: 'stage-2', level: 3.5, emoji: '\u{1F60C}', label: 'Rassurance' },
  { stageId: 'stage-3', level: 4.5, emoji: '\u{1F62E}', label: 'Émerveillement' },
  { stageId: 'stage-4', level: 5,   emoji: '\u{1F929}', label: 'Wow maximal' },
  { stageId: 'stage-5', level: 4,   emoji: '\u{1F60A}', label: 'Plaisir' },
  { stageId: 'stage-6', level: 4.5, emoji: '\u{1F604}', label: 'Détente' },
  { stageId: 'stage-7', level: 4,   emoji: '\u{2764}\u{FE0F}',  label: 'Appartenance' },
]

const INIT_TOUCHPOINTS: JourneyTouchpoint[] = [
  { id: 'tp-1',  name: 'Signalétique',       activeStageIds: ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'] },
  { id: 'tp-2',  name: 'Google Maps',         activeStageIds: ['stage-1', 'stage-6'] },
  { id: 'tp-3',  name: 'Waze Ads',            activeStageIds: ['stage-1'] },
  { id: 'tp-4',  name: 'Instagram',           activeStageIds: ['stage-1', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'tp-5',  name: 'App Cosmos',          activeStageIds: ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'tp-6',  name: 'QR panneaux',         activeStageIds: ['stage-1'] },
  { id: 'tp-7',  name: 'GPS indoor',          activeStageIds: ['stage-2'] },
  { id: 'tp-8',  name: 'Paiement NFC',        activeStageIds: ['stage-2', 'stage-6'] },
  { id: 'tp-9',  name: 'Push notif.',         activeStageIds: ['stage-2', 'stage-3', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'tp-10', name: 'WiFi Cosmos',         activeStageIds: ['stage-3', 'stage-4', 'stage-5', 'stage-6'] },
  { id: 'tp-11', name: 'Directory',           activeStageIds: ['stage-3'] },
  { id: 'tp-12', name: 'Portiques flux',      activeStageIds: ['stage-3'] },
  { id: 'tp-13', name: 'Bornes wayfinding',   activeStageIds: ['stage-3', 'stage-4', 'stage-5'] },
  { id: 'tp-14', name: 'Hôtesses accueil',    activeStageIds: ['stage-3', 'stage-7'] },
  { id: 'tp-15', name: 'Écrans LED',          activeStageIds: ['stage-4'] },
  { id: 'tp-16', name: '#CosmosAngré',        activeStageIds: ['stage-4', 'stage-5', 'stage-6'] },
  { id: 'tp-17', name: 'Beacons BLE',         activeStageIds: ['stage-5'] },
  { id: 'tp-18', name: 'Catalogue interactif', activeStageIds: ['stage-5'] },
  { id: 'tp-19', name: 'Vitrines charte',     activeStageIds: ['stage-5'] },
  { id: 'tp-20', name: 'QR commande',         activeStageIds: ['stage-6'] },
  { id: 'tp-21', name: 'Menu digital',        activeStageIds: ['stage-6'] },
  { id: 'tp-22', name: 'File virtuelle',      activeStageIds: ['stage-6'] },
  { id: 'tp-23', name: 'Avis Google',         activeStageIds: ['stage-6'] },
  { id: 'tp-24', name: 'Desk Club',           activeStageIds: ['stage-7'] },
  { id: 'tp-25', name: 'CRM HubSpot',         activeStageIds: ['stage-7'] },
  { id: 'tp-26', name: 'Email/SMS',           activeStageIds: ['stage-7'] },
  { id: 'tp-27', name: 'Lounge VIP',          activeStageIds: ['stage-7'] },
  { id: 'tp-28', name: 'Programme fidélité',  activeStageIds: ['stage-7'] },
]

const INIT_DEPARTMENTS: JourneyDepartment[] = [
  { id: 'dept-1',  name: 'Marketing / Digital',    activeStageIds: ['stage-1', 'stage-5', 'stage-7'] },
  { id: 'dept-2',  name: 'Design / Signalétique',  activeStageIds: ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'] },
  { id: 'dept-3',  name: 'Operations',             activeStageIds: ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'dept-4',  name: 'DSI / IT',               activeStageIds: ['stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'dept-5',  name: 'CRM / Fidélisation',     activeStageIds: ['stage-7'] },
  { id: 'dept-6',  name: 'F&B (Restauration)',      activeStageIds: ['stage-6'] },
  { id: 'dept-7',  name: 'RH / Formation',          activeStageIds: ['stage-3'] },
  { id: 'dept-8',  name: 'Sécurité',               activeStageIds: ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5', 'stage-6', 'stage-7'] },
  { id: 'dept-9',  name: 'Asset Management',        activeStageIds: ['stage-5', 'stage-6'] },
  { id: 'dept-10', name: 'Direction',               activeStageIds: ['stage-7'] },
  { id: 'dept-11', name: 'Tenant Coordination',     activeStageIds: ['stage-5'] },
]

const INIT_CARTE_TOUCHPOINTS: CarteTouchpoint[] = [
  // ── Digital ──────────────────────────────────────
  // Approche
  { id: 'ct-d-1',  label: 'Google Maps / Waze',   type: 'géré', stageId: 'stage-1', zone: 'digital', col: 0, row: 3 },
  { id: 'ct-d-2',  label: 'Waze Ads',             type: 'géré', stageId: 'stage-1', zone: 'digital', col: 1, row: 2 },
  { id: 'ct-d-3',  label: 'Instagram sponsorisé', type: 'géré', stageId: 'stage-1', zone: 'digital', col: 0, row: 1 },
  { id: 'ct-d-4',  label: 'QR code panneaux',     type: 'géré', stageId: 'stage-1', zone: 'digital', col: 1, row: 4 },
  // Parking
  { id: 'ct-d-5',  label: 'App GPS indoor',       type: 'géré', stageId: 'stage-2', zone: 'digital', col: 0, row: 2 },
  { id: 'ct-d-6',  label: 'Paiement NFC/QR',      type: 'géré', stageId: 'stage-2', zone: 'digital', col: 1, row: 3 },
  // Entrée
  { id: 'ct-d-7',  label: 'Push bienvenue',       type: 'géré', stageId: 'stage-3', zone: 'digital', col: 0, row: 1 },
  { id: 'ct-d-8',  label: 'WiFi portail captif',  type: 'géré', stageId: 'stage-3', zone: 'digital', col: 1, row: 3 },
  { id: 'ct-d-9',  label: 'Directory digital',    type: 'géré', stageId: 'stage-3', zone: 'digital', col: 0, row: 2 },
  // Hall central
  { id: 'ct-d-10', label: 'WiFi haute densité',   type: 'géré', stageId: 'stage-4', zone: 'digital', col: 0, row: 1 },
  { id: 'ct-d-11', label: 'App événements',       type: 'géré', stageId: 'stage-4', zone: 'digital', col: 1, row: 2 },
  { id: 'ct-d-12', label: 'Écrans LED API',       type: 'géré', stageId: 'stage-4', zone: 'digital', col: 0, row: 3 },
  { id: 'ct-d-13', label: '#CosmosAngré UGC',     type: 'gagné', stageId: 'stage-4', zone: 'digital', col: 1, row: 4 },
  // Shopping
  { id: 'ct-d-14', label: 'App offres géoloc',    type: 'géré', stageId: 'stage-5', zone: 'digital', col: 0, row: 2 },
  { id: 'ct-d-15', label: 'Beacons Bluetooth',    type: 'géré', stageId: 'stage-5', zone: 'digital', col: 1, row: 1 },
  { id: 'ct-d-16', label: 'Bornes catalogue',     type: 'géré', stageId: 'stage-5', zone: 'digital', col: 0, row: 3 },
  // Restauration
  { id: 'ct-d-17', label: 'QR commande table',    type: 'géré', stageId: 'stage-6', zone: 'digital', col: 0, row: 1 },
  { id: 'ct-d-18', label: 'App menu/réservation', type: 'géré', stageId: 'stage-6', zone: 'digital', col: 1, row: 3 },
  { id: 'ct-d-19', label: 'File virtuelle',       type: 'géré', stageId: 'stage-6', zone: 'digital', col: 0, row: 2 },
  { id: 'ct-d-20', label: 'Avis Google',          type: 'gagné', stageId: 'stage-6', zone: 'digital', col: 1, row: 4 },
  // Fidélisation
  { id: 'ct-d-21', label: 'App Cosmos Club',      type: 'géré', stageId: 'stage-7', zone: 'digital', col: 0, row: 1 },
  { id: 'ct-d-22', label: 'Email personnalisé',   type: 'géré', stageId: 'stage-7', zone: 'digital', col: 1, row: 2 },
  { id: 'ct-d-23', label: 'SMS automatisé',       type: 'géré', stageId: 'stage-7', zone: 'digital', col: 0, row: 3 },
  { id: 'ct-d-24', label: 'Push offres flash',    type: 'géré', stageId: 'stage-7', zone: 'digital', col: 1, row: 4 },

  // ── Physical ─────────────────────────────────────
  // Approche
  { id: 'ct-p-1',  label: '12 panneaux directionnels', type: 'géré', stageId: 'stage-1', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-2',  label: 'Totem lumineux 4m',         type: 'géré', stageId: 'stage-1', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-3',  label: 'Bâche façade 600m²',   type: 'géré', stageId: 'stage-1', zone: 'physical', col: 0, row: 3 },
  { id: 'ct-p-4',  label: 'Bouche-à-oreille',          type: 'gagné', stageId: 'stage-1', zone: 'physical', col: 1, row: 4 },
  // Parking
  { id: 'ct-p-5',  label: 'Compteurs LED places',      type: 'géré', stageId: 'stage-2', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-6',  label: 'Signalétique zones A-D',    type: 'géré', stageId: 'stage-2', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-7',  label: 'Bornes interphone',         type: 'géré', stageId: 'stage-2', zone: 'physical', col: 0, row: 3 },
  // Entrée
  { id: 'ct-p-8',  label: 'Portes automatiques',       type: 'géré', stageId: 'stage-3', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-9',  label: 'Hôtesses bilingues',        type: 'géré', stageId: 'stage-3', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-10', label: 'Parfum signature',          type: 'géré', stageId: 'stage-3', zone: 'physical', col: 0, row: 3 },
  // Hall central
  { id: 'ct-p-11', label: 'Atrium verrière 12m',       type: 'géré', stageId: 'stage-4', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-12', label: 'Végétalisation 3 niveaux',  type: 'géré', stageId: 'stage-4', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-13', label: 'Espace événementiel',       type: 'géré', stageId: 'stage-4', zone: 'physical', col: 0, row: 3 },
  // Shopping
  { id: 'ct-p-14', label: 'Vitrines premium',          type: 'géré', stageId: 'stage-5', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-15', label: 'Points repos /60m',         type: 'géré', stageId: 'stage-5', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-16', label: 'Signalétique univers',      type: 'géré', stageId: 'stage-5', zone: 'physical', col: 0, row: 3 },
  // Restauration
  { id: 'ct-p-17', label: 'Food court 12 enseignes',   type: 'géré', stageId: 'stage-6', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-18', label: 'Terrasse rooftop',          type: 'géré', stageId: 'stage-6', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-19', label: 'Le Cosmos restaurant',      type: 'géré', stageId: 'stage-6', zone: 'physical', col: 0, row: 3 },
  { id: 'ct-p-20', label: 'La Terrasse brasserie',     type: 'géré', stageId: 'stage-6', zone: 'physical', col: 1, row: 4 },
  // Fidélisation
  { id: 'ct-p-21', label: 'Desk Cosmos Club',          type: 'géré', stageId: 'stage-7', zone: 'physical', col: 0, row: 1 },
  { id: 'ct-p-22', label: 'Lounge VIP Platinum',       type: 'géré', stageId: 'stage-7', zone: 'physical', col: 1, row: 2 },
  { id: 'ct-p-23', label: 'Carte métal brossé',        type: 'géré', stageId: 'stage-7', zone: 'physical', col: 0, row: 3 },
]

/* ═══════════════════ STORE ═══════════════════ */

export const useJourneyStore = create<JourneyState>((set) => ({
  // ── Data ──────────────────────────────────────────
  stages: INIT_STAGES,
  steps: INIT_STEPS,
  emotions: INIT_EMOTIONS,
  touchpoints: INIT_TOUCHPOINTS,
  departments: INIT_DEPARTMENTS,
  carteTouchpoints: INIT_CARTE_TOUCHPOINTS,

  // ── UI ────────────────────────────────────────────
  selectedStageId: null,
  editingId: null,

  // ── Actions — Stages ──────────────────────────────
  addStage: (stage) =>
    set((s) => ({ stages: [...s.stages, stage] })),

  updateStage: (id, updates) =>
    set((s) => ({
      stages: s.stages.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    })),

  deleteStage: (id) =>
    set((s) => ({
      stages: s.stages.filter((st) => st.id !== id),
      steps: s.steps.filter((st) => st.stageId !== id),
      emotions: s.emotions.filter((e) => e.stageId !== id),
      touchpoints: s.touchpoints.map((tp) => ({
        ...tp,
        activeStageIds: tp.activeStageIds.filter((sid) => sid !== id),
      })),
      departments: s.departments.map((d) => ({
        ...d,
        activeStageIds: d.activeStageIds.filter((sid) => sid !== id),
      })),
      carteTouchpoints: s.carteTouchpoints.filter((ct) => ct.stageId !== id),
    })),

  reorderStages: (ids) =>
    set((s) => {
      const map = new Map(s.stages.map((st) => [st.id, st]))
      return { stages: ids.map((id) => map.get(id)!).filter(Boolean) }
    }),

  // ── Actions — Steps ───────────────────────────────
  addStep: (step) =>
    set((s) => ({ steps: [...s.steps, step] })),

  updateStep: (id, updates) =>
    set((s) => ({
      steps: s.steps.map((st) => (st.id === id ? { ...st, ...updates } : st)),
    })),

  deleteStep: (id) =>
    set((s) => ({ steps: s.steps.filter((st) => st.id !== id) })),

  // ── Actions — Emotions ────────────────────────────
  updateEmotion: (stageId, updates) =>
    set((s) => ({
      emotions: s.emotions.map((e) =>
        e.stageId === stageId ? { ...e, ...updates } : e,
      ),
    })),

  // ── Actions — Touchpoints (Journey Layers) ────────
  addTouchpoint: (tp) =>
    set((s) => ({ touchpoints: [...s.touchpoints, tp] })),

  updateTouchpoint: (id, updates) =>
    set((s) => ({
      touchpoints: s.touchpoints.map((tp) =>
        tp.id === id ? { ...tp, ...updates } : tp,
      ),
    })),

  deleteTouchpoint: (id) =>
    set((s) => ({ touchpoints: s.touchpoints.filter((tp) => tp.id !== id) })),

  toggleTouchpointStage: (tpId, stageId) =>
    set((s) => ({
      touchpoints: s.touchpoints.map((tp) => {
        if (tp.id !== tpId) return tp
        const has = tp.activeStageIds.includes(stageId)
        return {
          ...tp,
          activeStageIds: has
            ? tp.activeStageIds.filter((sid) => sid !== stageId)
            : [...tp.activeStageIds, stageId],
        }
      }),
    })),

  // ── Actions — Departments ─────────────────────────
  addDepartment: (dept) =>
    set((s) => ({ departments: [...s.departments, dept] })),

  updateDepartment: (id, updates) =>
    set((s) => ({
      departments: s.departments.map((d) =>
        d.id === id ? { ...d, ...updates } : d,
      ),
    })),

  deleteDepartment: (id) =>
    set((s) => ({ departments: s.departments.filter((d) => d.id !== id) })),

  toggleDepartmentStage: (deptId, stageId) =>
    set((s) => ({
      departments: s.departments.map((d) => {
        if (d.id !== deptId) return d
        const has = d.activeStageIds.includes(stageId)
        return {
          ...d,
          activeStageIds: has
            ? d.activeStageIds.filter((sid) => sid !== stageId)
            : [...d.activeStageIds, stageId],
        }
      }),
    })),

  // ── Actions — Carte touchpoints (Swimlane) ───────
  addCarteTouchpoint: (ct) =>
    set((s) => ({ carteTouchpoints: [...s.carteTouchpoints, ct] })),

  updateCarteTouchpoint: (id, updates) =>
    set((s) => ({
      carteTouchpoints: s.carteTouchpoints.map((ct) =>
        ct.id === id ? { ...ct, ...updates } : ct,
      ),
    })),

  deleteCarteTouchpoint: (id) =>
    set((s) => ({
      carteTouchpoints: s.carteTouchpoints.filter((ct) => ct.id !== id),
    })),

  // ── UI actions ────────────────────────────────────
  setSelectedStage: (id) => set({ selectedStageId: id }),
  setEditingId: (id) => set({ editingId: id }),
}))
