// Store des IDs d'entites masquees manuellement par l'utilisateur.
// Complete le PlanCleaningPanel (qui filtre par calque entier) avec une
// gomme par entite individuelle : pilier beton, hachure, texte oriente mal,
// acier isole qui cache un local, etc. Persiste en localStorage par projet.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HiddenEntitiesState {
  /** IDs d'entites masquees (format serialise Zustand : tableau → reconstruit en Set). */
  hiddenIds: string[]
  hide: (id: string) => void
  show: (id: string) => void
  toggle: (id: string) => void
  isHidden: (id: string) => boolean
  showAll: () => void
  hiddenCount: () => number
}

export const useHiddenEntitiesStore = create<HiddenEntitiesState>()(
  persist(
    (set, get) => ({
      hiddenIds: [],
      hide: (id) => set(s => s.hiddenIds.includes(id) ? s : { hiddenIds: [...s.hiddenIds, id] }),
      show: (id) => set(s => ({ hiddenIds: s.hiddenIds.filter(x => x !== id) })),
      toggle: (id) => {
        const arr = get().hiddenIds
        set({ hiddenIds: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] })
      },
      isHidden: (id) => get().hiddenIds.includes(id),
      showAll: () => set({ hiddenIds: [] }),
      hiddenCount: () => get().hiddenIds.length,
    }),
    { name: 'cosmos.hidden-entities.v1' },
  ),
)
