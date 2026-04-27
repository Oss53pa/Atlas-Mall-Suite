// ═══ SIGNAGE PROPOSALS STORE — Pont volatile Proph3t → UI ═══
// Quand Proph3tVolumePanel exécute analyzeParcours, on pousse ici les
// propositions optimisées (ProposedSign[]) + métadonnées (coverage,
// circulation totale). Le composant SignageImplementer lit ce store pour
// afficher le bouton « Implémenter » et le rapport détaillé.
//
// Volatile (pas de persist) — recalculé à chaque run de la skill.

import { create } from 'zustand'
import type { ProposedSign } from '../engines/signageOptimizer'

interface ProposalsState {
  proposals: ProposedSign[]
  coveragePct: number
  circulationSqm: number
  /** Map id POI → label, pour affichage lisible des cibles. */
  poiLabels: Record<string, string>
  generatedAt: string | null
  setProposals: (data: {
    proposals: ProposedSign[]
    coveragePct: number
    circulationSqm: number
    poiLabels: Record<string, string>
  }) => void
  clear: () => void
}

export const useSignageProposalsStore = create<ProposalsState>((set) => ({
  proposals: [],
  coveragePct: 0,
  circulationSqm: 0,
  poiLabels: {},
  generatedAt: null,
  setProposals: (data) => set({
    ...data,
    generatedAt: new Date().toISOString(),
  }),
  clear: () => set({
    proposals: [],
    coveragePct: 0,
    circulationSqm: 0,
    poiLabels: {},
    generatedAt: null,
  }),
}))
