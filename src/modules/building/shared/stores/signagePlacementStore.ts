// ═══ SIGNAGE PLACEMENT STORE — Signalétique placée persistée par projet ═══
// Les propositions de Proph3t (analyzeParcours → optimizeSignage) deviennent
// des entités réelles persistées en localStorage quand l'utilisateur clique
// sur « Implémenter signalétique optimisée ».
//
// Différent de signageProposalsStore (volatile, juste pour le pont
// Proph3tVolumePanel ↔ SignageImplementer).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type SignKind = 'direction' | 'you-are-here' | 'zone-entrance'

export interface PlacedSign {
  id: string
  projectId: string
  /** Coordonnées en mètres dans le repère du plan. */
  x: number
  y: number
  kind: SignKind
  /** IDs des POIs ciblés (max 3). */
  targets: string[]
  /** Libellé court (ex: "Ancres : Carrefour, Cinéma"). */
  label?: string
  /** Justification algorithmique. */
  reason: string
  /** Source de la proposition. */
  source: 'proph3t-auto' | 'manual'
  /** floorId optionnel. */
  floorId?: string
  createdAt: string
}

interface PlacementState {
  signs: PlacedSign[]
  addMany: (projectId: string, signs: Array<Omit<PlacedSign, 'id' | 'projectId' | 'createdAt'>>) => string[]
  remove: (id: string) => void
  clearForProject: (projectId: string) => void
  byProject: (projectId: string) => PlacedSign[]
}

export const useSignagePlacementStore = create<PlacementState>()(
  persist(
    (set, get) => ({
      signs: [],
      addMany: (projectId, items) => {
        const now = new Date().toISOString()
        const created: PlacedSign[] = items.map((s, i) => ({
          ...s,
          id: `sign-${Date.now()}-${i}`,
          projectId,
          createdAt: now,
        }))
        set(state => ({ signs: [...state.signs, ...created] }))
        return created.map(c => c.id)
      },
      remove: (id) => set(s => ({ signs: s.signs.filter(x => x.id !== id) })),
      clearForProject: (projectId) => set(s => ({
        signs: s.signs.filter(x => x.projectId !== projectId),
      })),
      byProject: (projectId) => get().signs.filter(s => s.projectId === projectId),
    }),
    { name: 'atlas-signage-placements-v1', storage: createJSONStorage(() => localStorage) },
  ),
)
