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

interface PlanImportStoreState {
  imports: PlanImportRecord[]
  /** Which import is active per floor (floorId → importId) */
  activePlanPerFloor: Record<string, string>
  addImport: (record: PlanImportRecord) => void
  updateImport: (id: string, data: Partial<PlanImportRecord>) => void
  removeImport: (id: string) => void
  clearAll: () => void
  /** Set which plan is the active background for a floor */
  setActivePlan: (floorId: string, importId: string) => void
  /** Get the plan image URL for a floor (from the active import) */
  getActivePlanUrl: (floorId: string) => string | undefined
}

export const usePlanImportStore = create<PlanImportStoreState>()(
  persist(
    (set, get) => ({
      imports: [],
      activePlanPerFloor: {},

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

      clearAll: () => set({ imports: [], activePlanPerFloor: {} }),

      setActivePlan: (floorId, importId) =>
        set((s) => ({ activePlanPerFloor: { ...s.activePlanPerFloor, [floorId]: importId } })),

      getActivePlanUrl: (floorId) => {
        const s = get()
        const importId = s.activePlanPerFloor[floorId]
        if (!importId) return undefined
        const record = s.imports.find((r) => r.id === importId)
        return record?.planImageUrl
      },
    }),
    { name: 'atlas-plan-imports' }
  )
)
