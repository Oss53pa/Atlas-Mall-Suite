// ═══ SPATIAL ENTITY STORE — Zustand global ═══
//
// State management des SpatialEntity au sein de l'éditeur.
// Persisté en localStorage pour survivre aux reloads (best-effort).
//
// Convention : un store par projet pour éviter les fuites entre projets
// (clé `atlas-spatial-entities-{projectId}`).

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpatialEntity, SpatialGeometry } from '../domain/SpatialEntity'

interface SpatialEntityState {
  entities: Record<string, SpatialEntity>
  selectedIds: ReadonlyArray<string>

  // Actions
  setEntities: (list: ReadonlyArray<SpatialEntity>) => void
  upsertEntity: (entity: SpatialEntity) => void
  upsertMany: (entities: ReadonlyArray<SpatialEntity>) => void
  deleteEntity: (id: string) => void
  updateGeometry: (id: string, geometry: SpatialGeometry) => void
  selectEntities: (ids: ReadonlyArray<string>) => void
  clear: () => void
}

/** Factory : retourne un store unique par projectId. */
const stores = new Map<string, ReturnType<typeof createSingleStore>>()

function createSingleStore(projectId: string) {
  return create<SpatialEntityState>()(
    persist(
      (set) => ({
        entities: {},
        selectedIds: [],

        setEntities: (list) => set(() => {
          const map: Record<string, SpatialEntity> = {}
          for (const e of list) map[e.id] = e
          return { entities: map }
        }),

        upsertEntity: (entity) => set((s) => ({
          entities: { ...s.entities, [entity.id]: entity },
        })),

        upsertMany: (list) => set((s) => {
          const next = { ...s.entities }
          for (const e of list) next[e.id] = e
          return { entities: next }
        }),

        deleteEntity: (id) => set((s) => {
          const next = { ...s.entities }
          delete next[id]
          return { entities: next, selectedIds: s.selectedIds.filter(x => x !== id) }
        }),

        updateGeometry: (id, geometry) => set((s) => {
          const existing = s.entities[id]
          if (!existing) return s
          return {
            entities: {
              ...s.entities,
              [id]: { ...existing, geometry, updatedAt: new Date().toISOString() },
            },
          }
        }),

        selectEntities: (ids) => set({ selectedIds: ids }),

        clear: () => set({ entities: {}, selectedIds: [] }),
      }),
      { name: `atlas-spatial-entities-${projectId}` },
    ),
  )
}

export function useSpatialEntityStore(projectId: string) {
  let s = stores.get(projectId)
  if (!s) {
    s = createSingleStore(projectId)
    stores.set(projectId, s)
  }
  return s
}
