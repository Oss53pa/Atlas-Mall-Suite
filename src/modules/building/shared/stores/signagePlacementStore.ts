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
  /** Confiance algorithmique 0..1 (1 si manuel — l'humain valide). */
  confidence?: number
  /** True si Proph3t hésite et attend une validation humaine. */
  needsReview?: boolean
  /** Raison de l'hésitation. */
  reviewReason?: string
  /** True si l'utilisateur a explicitement validé/déplacé/réajusté. */
  reviewed?: boolean
  createdAt: string
}

interface PlacementState {
  signs: PlacedSign[]
  addMany: (projectId: string, signs: Array<Omit<PlacedSign, 'id' | 'projectId' | 'createdAt'>>) => string[]
  addOne: (projectId: string, sign: Omit<PlacedSign, 'id' | 'projectId' | 'createdAt'>) => string
  updatePosition: (id: string, x: number, y: number) => void
  updateKind: (id: string, kind: SignKind) => void
  markReviewed: (id: string) => void
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
      addOne: (projectId, sign) => {
        const id = `sign-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const created: PlacedSign = {
          ...sign,
          id,
          projectId,
          createdAt: new Date().toISOString(),
        }
        set(state => ({ signs: [...state.signs, created] }))
        return id
      },
      updatePosition: (id, x, y) => set(s => ({
        signs: s.signs.map(sign => sign.id === id ? { ...sign, x, y } : sign),
      })),
      updateKind: (id, kind) => set(s => ({
        signs: s.signs.map(sign => sign.id === id ? { ...sign, kind } : sign),
      })),
      markReviewed: (id) => set(s => ({
        signs: s.signs.map(sign => sign.id === id
          ? { ...sign, reviewed: true, needsReview: false }
          : sign),
      })),
      remove: (id) => set(s => ({ signs: s.signs.filter(x => x.id !== id) })),
      clearForProject: (projectId) => set(s => ({
        signs: s.signs.filter(x => x.projectId !== projectId),
      })),
      byProject: (projectId) => get().signs.filter(s => s.projectId === projectId),
    }),
    { name: 'atlas-signage-placements-v1', storage: createJSONStorage(() => localStorage) },
  ),
)
