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
  errorMessage?: string
  warnings: string[]
}

interface PlanImportStoreState {
  imports: PlanImportRecord[]
  addImport: (record: PlanImportRecord) => void
  updateImport: (id: string, data: Partial<PlanImportRecord>) => void
  removeImport: (id: string) => void
  clearAll: () => void
}

export const usePlanImportStore = create<PlanImportStoreState>()(
  persist(
    (set) => ({
      imports: [],

      addImport: (record) =>
        set((s) => ({ imports: [record, ...s.imports] })),

      updateImport: (id, data) =>
        set((s) => ({
          imports: s.imports.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),

      removeImport: (id) =>
        set((s) => ({ imports: s.imports.filter((r) => r.id !== id) })),

      clearAll: () => set({ imports: [] }),
    }),
    { name: 'atlas-plan-imports' }
  )
)
