// ═══ STORE — Historique des imports de plans ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlanSourceType, CalibrationResult, RecognizedZone, DimEntity } from '../planReader/planReaderTypes'

export type ImportStatus = 'processing' | 'success' | 'error' | 'reviewing'

export interface PlanImportRecord {
  id: string
  fileName: string
  fileSize: number
  sourceType: PlanSourceType
  floorId: string
  floorLevel: string
  status: ImportStatus
  importedAt: string
  zonesDetected: number
  dimsDetected: number
  calibrationMethod: CalibrationResult['method'] | null
  calibrationConfidence: number
  thumbnailUrl?: string
  planImageUrl?: string
  errorMessage?: string
  warnings: string[]
}

/** Un plan visible sur le canvas avec son opacite */
export interface PlanLayer {
  importId: string
  opacity: number   // 0-1
  visible: boolean
}

interface PlanImportStoreState {
  imports: PlanImportRecord[]
  /** Which import is active per floor (floorId → importId) — backward compat */
  activePlanPerFloor: Record<string, string>
  /** Plans superposes par etage (floorId → PlanLayer[]) */
  layersPerFloor: Record<string, PlanLayer[]>
  addImport: (record: PlanImportRecord) => void
  updateImport: (id: string, data: Partial<PlanImportRecord>) => void
  removeImport: (id: string) => void
  clearAll: () => void
  /** Set which plan is the active background for a floor */
  setActivePlan: (floorId: string, importId: string) => void
  /** Get the plan image URL for a floor (from the active import) */
  getActivePlanUrl: (floorId: string) => string | undefined
  /** Ajouter un plan comme couche superposee sur un etage */
  addLayer: (floorId: string, importId: string) => void
  /** Retirer une couche */
  removeLayer: (floorId: string, importId: string) => void
  /** Modifier l'opacite d'une couche */
  setLayerOpacity: (floorId: string, importId: string, opacity: number) => void
  /** Basculer la visibilite d'une couche */
  toggleLayerVisibility: (floorId: string, importId: string) => void
  /** Réordonne les couches (pour drag&drop) */
  reorderLayers: (floorId: string, fromIndex: number, toIndex: number) => void
  /** Obtenir toutes les couches visibles pour un etage */
  getVisibleLayers: (floorId: string) => Array<{ importId: string; planImageUrl: string; opacity: number }>
}

export const usePlanImportStore = create<PlanImportStoreState>()(
  persist(
    (set, get) => ({
      imports: [],
      activePlanPerFloor: {},
      layersPerFloor: {},

      addImport: (record) =>
        set((s) => ({ imports: [record, ...s.imports] })),

      updateImport: (id, data) =>
        set((s) => ({
          imports: s.imports.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),

      removeImport: (id) =>
        set((s) => {
          const newActive = { ...s.activePlanPerFloor }
          for (const [fid, iid] of Object.entries(newActive)) {
            if (iid === id) delete newActive[fid]
          }
          return { imports: s.imports.filter((r) => r.id !== id), activePlanPerFloor: newActive }
        }),

      clearAll: () => set({ imports: [], activePlanPerFloor: {}, layersPerFloor: {} }),

      setActivePlan: (floorId, importId) =>
        set((s) => ({ activePlanPerFloor: { ...s.activePlanPerFloor, [floorId]: importId } })),

      getActivePlanUrl: (floorId) => {
        const s = get()
        const importId = s.activePlanPerFloor[floorId]
        if (!importId) return undefined
        const record = s.imports.find((r) => r.id === importId)
        return record?.planImageUrl
      },

      // ── Gestion des couches superposees ──

      addLayer: (floorId, importId) =>
        set((s) => {
          const current = s.layersPerFloor[floorId] ?? []
          if (current.some(l => l.importId === importId)) return s // Deja present
          return {
            layersPerFloor: {
              ...s.layersPerFloor,
              [floorId]: [...current, { importId, opacity: 0.5, visible: true }],
            },
          }
        }),

      removeLayer: (floorId, importId) =>
        set((s) => ({
          layersPerFloor: {
            ...s.layersPerFloor,
            [floorId]: (s.layersPerFloor[floorId] ?? []).filter(l => l.importId !== importId),
          },
        })),

      setLayerOpacity: (floorId, importId, opacity) =>
        set((s) => ({
          layersPerFloor: {
            ...s.layersPerFloor,
            [floorId]: (s.layersPerFloor[floorId] ?? []).map(l =>
              l.importId === importId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
            ),
          },
        })),

      toggleLayerVisibility: (floorId, importId) =>
        set((s) => ({
          layersPerFloor: {
            ...s.layersPerFloor,
            [floorId]: (s.layersPerFloor[floorId] ?? []).map(l =>
              l.importId === importId ? { ...l, visible: !l.visible } : l
            ),
          },
        })),

      /** Réordonne les couches d'un étage (drag&drop). */
      reorderLayers: (floorId: string, fromIndex: number, toIndex: number) =>
        set((s) => {
          const current = [...(s.layersPerFloor[floorId] ?? [])]
          if (fromIndex < 0 || fromIndex >= current.length || toIndex < 0 || toIndex >= current.length) return s
          const [moved] = current.splice(fromIndex, 1)
          current.splice(toIndex, 0, moved)
          return { layersPerFloor: { ...s.layersPerFloor, [floorId]: current } }
        }),

      getVisibleLayers: (floorId) => {
        const s = get()
        const layers = s.layersPerFloor[floorId] ?? []
        return layers
          .filter(l => l.visible)
          .map(l => {
            const record = s.imports.find(r => r.id === l.importId)
            return record?.planImageUrl
              ? { importId: l.importId, planImageUrl: record.planImageUrl, opacity: l.opacity }
              : null
          })
          .filter((l): l is NonNullable<typeof l> => l !== null)
      },
    }),
    { name: 'atlas-plan-imports' }
  )
)
