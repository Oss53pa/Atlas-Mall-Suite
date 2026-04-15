// ═══ LOTS STORE — Source unique de vérité canonique (Lot[]) ═══
// Persistance localStorage + émission d'événements de domaine sur chaque mutation.
// Remplace progressivement les divers spaces/tenants éparpillés dans vol1/vol2/vol3.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  type Lot, type LotId, type CommercialExtension, type SecurityExtension,
  type ParcoursExtension, type LotStatus, touchLot,
  emitLotCreated, emitLotUpdated, emitLotDeleted,
  FloorLevel,
} from '../domain'

interface LotsState {
  /** Map lotId → Lot. Plus rapide que array pour les mutations. */
  lots: Record<string, Lot>
  /** Import plan actif (pour filtrage). */
  activeImportId: string | null

  // ─── Queries (selectors) ──────────────────────────────────
  all: () => Lot[]
  byId: (id: LotId) => Lot | undefined
  byFloor: (level: FloorLevel) => Lot[]
  commercial: () => Lot[]
  count: () => number

  // ─── Mutations ───────────────────────────────────────────
  upsert: (lot: Lot) => void
  upsertMany: (lots: Lot[]) => void
  remove: (id: LotId) => void
  clear: () => void

  // ─── Extensions par volume ───────────────────────────────
  setCommercial: (id: LotId, ext: CommercialExtension) => void
  setSecurity: (id: LotId, ext: SecurityExtension) => void
  setParcours: (id: LotId, ext: ParcoursExtension) => void
  setStatus: (id: LotId, status: LotStatus) => void

  // ─── Import lifecycle ────────────────────────────────────
  setActiveImport: (importId: string | null) => void
}

export const useLotsStore = create<LotsState>()(
  persist(
    (set, get) => ({
      lots: {},
      activeImportId: null,

      all: () => Object.values(get().lots),
      byId: (id) => get().lots[id as string],
      byFloor: (level) => Object.values(get().lots).filter(l => l.floorLevel === level),
      commercial: () => Object.values(get().lots).filter(l => l.commercial !== undefined),
      count: () => Object.keys(get().lots).length,

      upsert: (lot) => set(state => {
        const previous = state.lots[lot.id as string]
        if (previous) emitLotUpdated(lot, previous)
        else emitLotCreated(lot)
        return { lots: { ...state.lots, [lot.id as string]: lot } }
      }),

      upsertMany: (incoming) => set(state => {
        const next = { ...state.lots }
        for (const lot of incoming) {
          const prev = next[lot.id as string]
          next[lot.id as string] = lot
          if (prev) emitLotUpdated(lot, prev); else emitLotCreated(lot)
        }
        return { lots: next }
      }),

      remove: (id) => set(state => {
        const next = { ...state.lots }
        delete next[id as string]
        emitLotDeleted(id)
        return { lots: next }
      }),

      clear: () => set({ lots: {}, activeImportId: null }),

      setCommercial: (id, ext) => {
        const lot = get().lots[id as string]
        if (!lot) return
        const updated = touchLot(lot, { commercial: ext })
        get().upsert(updated)
      },

      setSecurity: (id, ext) => {
        const lot = get().lots[id as string]
        if (!lot) return
        const updated = touchLot(lot, { security: ext })
        get().upsert(updated)
      },

      setParcours: (id, ext) => {
        const lot = get().lots[id as string]
        if (!lot) return
        const updated = touchLot(lot, { parcours: ext })
        get().upsert(updated)
      },

      setStatus: (id, status) => {
        const lot = get().lots[id as string]
        if (!lot) return
        const com: CommercialExtension = { ...(lot.commercial ?? { status }), status }
        get().setCommercial(id, com)
      },

      setActiveImport: (importId) => set({ activeImportId: importId }),
    }),
    {
      name: 'cosmos-angre-lots-v1',
      storage: createJSONStorage(() => localStorage),
      // Ne persiste que les lots et l'import actif
      partialize: (state) => ({ lots: state.lots, activeImportId: state.activeImportId }),
    },
  ),
)

// ─── Selectors React-friendly ────────────────────────────────

export const selectAllLots = (s: LotsState) => Object.values(s.lots)
export const selectLotById = (id: LotId) => (s: LotsState) => s.lots[id as string]
export const selectLotsOnFloor = (level: FloorLevel) => (s: LotsState) =>
  Object.values(s.lots).filter(l => l.floorLevel === level)
