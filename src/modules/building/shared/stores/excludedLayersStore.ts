// ═══ EXCLUDED LAYERS STORE — Source unique des calques DXF exclus ═══
// Permet à PROPH3T (ou l'UI) d'exclure un calque, et au DxfViewerCanvas
// de réagir immédiatement (vs ne réagir qu'au remount).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ExcludedLayersState {
  /** Set de noms de calques exclus. Exposé en array dans le state pour Zustand. */
  excluded: string[]
  /** Bump à chaque mutation pour notifier les abonnés (utile si Set utilisé). */
  version: number

  exclude: (layerName: string) => void
  excludeMany: (layerNames: string[]) => void
  restore: (layerName: string) => void
  restoreAll: () => void
  isExcluded: (layerName: string) => boolean
}

export const useExcludedLayersStore = create<ExcludedLayersState>()(
  persist(
    (set, get) => ({
      excluded: [],
      version: 0,

      exclude: (layerName) => set(s => {
        if (s.excluded.includes(layerName)) return s
        return { excluded: [...s.excluded, layerName], version: s.version + 1 }
      }),
      excludeMany: (layerNames) => set(s => {
        const next = new Set([...s.excluded, ...layerNames])
        return { excluded: Array.from(next), version: s.version + 1 }
      }),
      restore: (layerName) => set(s => ({
        excluded: s.excluded.filter(l => l !== layerName),
        version: s.version + 1,
      })),
      restoreAll: () => set({ excluded: [], version: get().version + 1 }),
      isExcluded: (layerName) => get().excluded.includes(layerName),
    }),
    { name: 'cosmos-excluded-layers-v1', storage: createJSONStorage(() => localStorage) },
  ),
)
