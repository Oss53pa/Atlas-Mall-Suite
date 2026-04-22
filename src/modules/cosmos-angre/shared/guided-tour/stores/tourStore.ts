// ═══ TOUR STORE — Visites guidées du plan ═══
//
// Modèle : un Tour contient une liste ordonnée de TourStep.
// Chaque étape est positionnée sur le plan (coordonnées monde en mètres).
// Le player gère la lecture (manuel / auto-play avec minuterie).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FloorLevelKey } from '../../proph3t/libraries/spaceTypeLibrary'

// ── Domain types ────────────────────────────────────────────────────────────

export interface TourStep {
  id: string
  /** Order index (0-based). */
  order: number
  title: string
  description?: string
  /** World position (metres) on the floor plan. */
  x: number
  y: number
  /** Floor level the step belongs to. */
  floorLevel: FloorLevelKey
  /** Auto-play dwell time in seconds before advancing. Default: 5. */
  duration: number
  /** Optional image/video URL to display in the player card. */
  mediaUrl?: string
  /** Optional reference to an EditableSpace id. */
  spaceId?: string
  /** Camera zoom level to apply when reaching this step (2D viewer). */
  zoomLevel?: number
}

export interface Tour {
  id: string
  name: string
  description?: string
  /** Primary floor level (used as default for new steps). */
  primaryFloor: FloorLevelKey
  steps: TourStep[]
  /** ISO string. */
  createdAt: string
  updatedAt: string
}

export interface TourPlayerState {
  activeTourId: string | null
  currentStepIndex: number
  isPlaying: boolean
  autoPlay: boolean
  /** Seconds remaining until auto-advance. */
  countdown: number
}

// ── Store ────────────────────────────────────────────────────────────────────

interface TourStoreState {
  tours: Tour[]
  player: TourPlayerState

  // ── Tour CRUD ──
  createTour: (name: string, primaryFloor: FloorLevelKey) => string
  updateTour: (id: string, patch: Partial<Pick<Tour, 'name' | 'description' | 'primaryFloor'>>) => void
  deleteTour: (id: string) => void

  // ── Step CRUD ──
  addStep: (tourId: string, step: Omit<TourStep, 'id' | 'order'>) => string
  updateStep: (tourId: string, stepId: string, patch: Partial<TourStep>) => void
  deleteStep: (tourId: string, stepId: string) => void
  reorderSteps: (tourId: string, fromIndex: number, toIndex: number) => void

  // ── Player ──
  startTour: (tourId: string) => void
  stopTour: () => void
  goToStep: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  toggleAutoPlay: () => void
  tickCountdown: () => void   // called by an interval; advances when countdown hits 0

  // ── Selectors ──
  getTour: (id: string) => Tour | undefined
  getActiveStep: () => TourStep | undefined
}

const DEFAULT_PLAYER: TourPlayerState = {
  activeTourId: null,
  currentStepIndex: 0,
  isPlaying: false,
  autoPlay: false,
  countdown: 5,
}

export const useTourStore = create<TourStoreState>()(
  persist(
    (set, get) => ({
      tours: [],
      player: DEFAULT_PLAYER,

      // ── Tour CRUD ──────────────────────────────────────────────────────────

      createTour: (name, primaryFloor) => {
        const id = `tour-${Date.now()}-${Math.floor(Math.random() * 9999)}`
        const now = new Date().toISOString()
        set((s) => ({
          tours: [
            ...s.tours,
            { id, name, primaryFloor, steps: [], createdAt: now, updatedAt: now },
          ],
        }))
        return id
      },

      updateTour: (id, patch) =>
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
          ),
        })),

      deleteTour: (id) =>
        set((s) => ({
          tours: s.tours.filter((t) => t.id !== id),
          player: s.player.activeTourId === id ? DEFAULT_PLAYER : s.player,
        })),

      // ── Step CRUD ──────────────────────────────────────────────────────────

      addStep: (tourId, stepData) => {
        const id = `step-${Date.now()}-${Math.floor(Math.random() * 9999)}`
        set((s) => ({
          tours: s.tours.map((t) => {
            if (t.id !== tourId) return t
            const order = t.steps.length
            return {
              ...t,
              steps: [...t.steps, { id, order, duration: 5, ...stepData }],
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
        return id
      },

      updateStep: (tourId, stepId, patch) =>
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id !== tourId ? t : {
              ...t,
              steps: t.steps.map((st) => st.id === stepId ? { ...st, ...patch } : st),
              updatedAt: new Date().toISOString(),
            },
          ),
        })),

      deleteStep: (tourId, stepId) =>
        set((s) => ({
          tours: s.tours.map((t) => {
            if (t.id !== tourId) return t
            const filtered = t.steps.filter((st) => st.id !== stepId)
              .map((st, i) => ({ ...st, order: i }))
            return { ...t, steps: filtered, updatedAt: new Date().toISOString() }
          }),
        })),

      reorderSteps: (tourId, fromIndex, toIndex) =>
        set((s) => ({
          tours: s.tours.map((t) => {
            if (t.id !== tourId) return t
            const steps = [...t.steps]
            if (fromIndex < 0 || fromIndex >= steps.length || toIndex < 0 || toIndex >= steps.length) return t
            const [moved] = steps.splice(fromIndex, 1)
            steps.splice(toIndex, 0, moved)
            return {
              ...t,
              steps: steps.map((st, i) => ({ ...st, order: i })),
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      // ── Player ─────────────────────────────────────────────────────────────

      startTour: (tourId) => {
        const tour = get().tours.find((t) => t.id === tourId)
        if (!tour || !tour.steps.length) return
        set({
          player: {
            activeTourId: tourId,
            currentStepIndex: 0,
            isPlaying: true,
            autoPlay: false,
            countdown: tour.steps[0]?.duration ?? 5,
          },
        })
      },

      stopTour: () => set({ player: DEFAULT_PLAYER }),

      goToStep: (index) =>
        set((s) => {
          const tour = s.tours.find((t) => t.id === s.player.activeTourId)
          if (!tour) return s
          const clamped = Math.max(0, Math.min(index, tour.steps.length - 1))
          return {
            player: {
              ...s.player,
              currentStepIndex: clamped,
              countdown: tour.steps[clamped]?.duration ?? 5,
            },
          }
        }),

      nextStep: () => {
        const { player, tours } = get()
        const tour = tours.find((t) => t.id === player.activeTourId)
        if (!tour) return
        const next = player.currentStepIndex + 1
        if (next >= tour.steps.length) {
          // End of tour — stop auto-play
          set((s) => ({ player: { ...s.player, autoPlay: false } }))
          return
        }
        set((s) => ({
          player: {
            ...s.player,
            currentStepIndex: next,
            countdown: tour.steps[next]?.duration ?? 5,
          },
        }))
      },

      prevStep: () => {
        const { player, tours } = get()
        const tour = tours.find((t) => t.id === player.activeTourId)
        if (!tour) return
        const prev = Math.max(0, player.currentStepIndex - 1)
        set((s) => ({
          player: {
            ...s.player,
            currentStepIndex: prev,
            countdown: tour.steps[prev]?.duration ?? 5,
          },
        }))
      },

      toggleAutoPlay: () =>
        set((s) => {
          const tour = s.tours.find((t) => t.id === s.player.activeTourId)
          const step = tour?.steps[s.player.currentStepIndex]
          return {
            player: {
              ...s.player,
              autoPlay: !s.player.autoPlay,
              countdown: step?.duration ?? 5,
            },
          }
        }),

      tickCountdown: () => {
        const { player } = get()
        if (!player.autoPlay || !player.isPlaying) return
        if (player.countdown <= 1) {
          get().nextStep()
        } else {
          set((s) => ({ player: { ...s.player, countdown: s.player.countdown - 1 } }))
        }
      },

      // ── Selectors ──────────────────────────────────────────────────────────

      getTour: (id) => get().tours.find((t) => t.id === id),

      getActiveStep: () => {
        const { player, tours } = get()
        const tour = tours.find((t) => t.id === player.activeTourId)
        return tour?.steps[player.currentStepIndex]
      },
    }),
    { name: 'atlas-guided-tours-v1' },
  ),
)
