// ═══ PLAN ENGINE STORE — Zustand store for viewport, spaces, objects ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ViewportState, DetectedSpace, SpaceState, SpaceStatus,
  PlacedObject, PlanTool, ViewMode, ParsedPlan, PlanLayer,
  ObjectCategory,
} from '../planReader/planEngineTypes'

// ─── STORE INTERFACE ──────────────────────────────────────

interface PlanEngineState {
  // ── Viewport ──
  viewport: ViewportState
  setViewport: (v: ViewportState | ((prev: ViewportState) => ViewportState)) => void

  // ── Parsed plan data ──
  parsedPlan: ParsedPlan | null
  setParsedPlan: (plan: ParsedPlan | null) => void

  // ── PROPH3T modal auto-open après import ──
  proph3tModalOpen: boolean
  openProph3tModal: () => void
  closeProph3tModal: () => void

  // ── Workflow state ──
  /** Plan validé par l'utilisateur (Phase A terminée) → accès aux volumes. */
  planValidated: boolean
  /** Timestamp de validation. */
  planValidatedAt: string | null
  validatePlan: () => void
  invalidatePlan: () => void
  /** All parsed plans keyed by importId (in-memory only, not persisted) */
  parsedPlans: Record<string, ParsedPlan>
  /** Store a parsed plan associated with an import */
  storeParsedPlan: (importId: string, plan: ParsedPlan) => void
  /** Load a previously stored plan into the active parsedPlan + spaces + layers */
  loadParsedPlan: (importId: string) => boolean

  // ── Detected spaces ──
  spaces: DetectedSpace[]
  setSpaces: (spaces: DetectedSpace[]) => void

  // ── Space states (user edits — persisted) ──
  spaceStates: Record<string, SpaceState>
  setSpaceState: (spaceId: string, updates: Partial<SpaceState>) => void
  getSpaceState: (spaceId: string) => SpaceState

  // ── Selected space ──
  selectedSpaceId: string | null
  selectSpace: (id: string | null) => void

  // ── Active tool ──
  activeTool: PlanTool
  setTool: (tool: PlanTool) => void

  // ── View mode ──
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // ── Layers ──
  layers: PlanLayer[]
  setLayers: (layers: PlanLayer[]) => void
  toggleLayerVisibility: (name: string) => void

  // ── Display toggles ──
  showGrid: boolean
  showDimensions: boolean
  showLabels: boolean
  showMinimap: boolean
  showZones: boolean
  toggleShowGrid: () => void
  toggleShowDimensions: () => void
  toggleShowLabels: () => void
  toggleShowMinimap: () => void
  toggleShowZones: () => void

  // ── Placed objects ──
  placedObjects: PlacedObject[]
  addObject: (obj: PlacedObject) => void
  updateObject: (id: string, updates: Partial<PlacedObject>) => void
  removeObject: (id: string) => void

  // ── Wall height (3D) ──
  wallHeight: number
  setWallHeight: (h: number) => void
}

// ─── DEFAULT SPACE STATE ──────────────────────────────────

const defaultSpaceState = (): SpaceState => ({
  color: null,
  label: '',
  notes: '',
  status: 'vacant',
  objects: [],
})

// ─── STORE ────────────────────────────────────────────────

export const usePlanEngineStore = create<PlanEngineState>()(
  persist(
    (set, get) => ({
      // Viewport
      viewport: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
      setViewport: (v) => set(s => ({
        viewport: typeof v === 'function' ? v(s.viewport) : v,
      })),

      // Parsed plan
      parsedPlan: null,
      setParsedPlan: (plan) => set({ parsedPlan: plan }),

      // PROPH3T modal auto-open
      proph3tModalOpen: false,
      openProph3tModal: () => set({ proph3tModalOpen: true }),
      closeProph3tModal: () => set({ proph3tModalOpen: false }),

      // Workflow state
      planValidated: false,
      planValidatedAt: null,
      validatePlan: () => set({ planValidated: true, planValidatedAt: new Date().toISOString() }),
      invalidatePlan: () => set({ planValidated: false, planValidatedAt: null }),

      parsedPlans: {},
      storeParsedPlan: (importId, plan) => set(s => ({
        parsedPlans: { ...s.parsedPlans, [importId]: plan },
      })),
      loadParsedPlan: (importId) => {
        const plan = get().parsedPlans[importId]
        if (!plan) return false
        set({ parsedPlan: plan, spaces: plan.spaces, layers: plan.layers })
        return true
      },

      // Spaces
      spaces: [],
      setSpaces: (spaces) => set({ spaces }),

      // Space states
      spaceStates: {},
      setSpaceState: (spaceId, updates) => set(s => ({
        spaceStates: {
          ...s.spaceStates,
          [spaceId]: {
            ...(s.spaceStates[spaceId] ?? defaultSpaceState()),
            ...updates,
          },
        },
      })),
      getSpaceState: (spaceId) => {
        const s = get().spaceStates[spaceId]
        if (s) return s
        // Return space default from detected
        const space = get().spaces.find(sp => sp.id === spaceId)
        return {
          ...defaultSpaceState(),
          label: space?.label ?? '',
        }
      },

      // Selection
      selectedSpaceId: null,
      selectSpace: (id) => set({ selectedSpaceId: id }),

      // Tool
      activeTool: 'select',
      setTool: (tool) => set({ activeTool: tool }),

      // View mode
      viewMode: '2d',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Layers
      layers: [],
      setLayers: (layers) => set({ layers }),
      toggleLayerVisibility: (name) => set(s => ({
        layers: s.layers.map(l =>
          l.name === name ? { ...l, visible: !l.visible } : l
        ),
      })),

      // Display
      showGrid: false,
      showDimensions: true,
      showLabels: true,
      showMinimap: true,
      showZones: true,
      toggleShowGrid: () => set(s => ({ showGrid: !s.showGrid })),
      toggleShowDimensions: () => set(s => ({ showDimensions: !s.showDimensions })),
      toggleShowLabels: () => set(s => ({ showLabels: !s.showLabels })),
      toggleShowMinimap: () => set(s => ({ showMinimap: !s.showMinimap })),
      toggleShowZones: () => set(s => ({ showZones: !s.showZones })),

      // Objects
      placedObjects: [],
      addObject: (obj) => set(s => ({ placedObjects: [...s.placedObjects, obj] })),
      updateObject: (id, updates) => set(s => ({
        placedObjects: s.placedObjects.map(o => o.id === id ? { ...o, ...updates } : o),
      })),
      removeObject: (id) => set(s => ({
        placedObjects: s.placedObjects.filter(o => o.id !== id),
      })),

      // 3D
      wallHeight: 3.5,
      setWallHeight: (h) => set({ wallHeight: h }),
    }),
    {
      name: 'atlas-plan-engine',
      partialize: (state) => ({
        spaceStates: state.spaceStates,
        placedObjects: state.placedObjects,
        showGrid: state.showGrid,
        showDimensions: state.showDimensions,
        showLabels: state.showLabels,
        showMinimap: state.showMinimap,
        showZones: state.showZones,
        wallHeight: state.wallHeight,
      }),
    }
  )
)
