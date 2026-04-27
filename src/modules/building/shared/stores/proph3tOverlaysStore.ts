// ═══ PROPH3T OVERLAYS STORE — Partage des overlays entre Panel et Plan ═══
//
// Le Proph3tVolumePanel exécute un skill et reçoit un Proph3tResult
// contenant `overlays: Proph3tOverlay[]`. Ce store met ces overlays à
// disposition de MallMap2D / SpaceEditorCanvas pour les dessiner par-
// dessus le plan (heatmaps bottleneck, badges signalétique, flèches).

import { create } from 'zustand'
import type { Proph3tOverlay } from '../proph3t/orchestrator.types'

interface OverlaysState {
  overlays: ReadonlyArray<Proph3tOverlay>
  /** Nom du skill qui a produit ces overlays (debug). */
  source: string | null
  /** Replace tous les overlays par un nouveau set. */
  setOverlays: (overlays: ReadonlyArray<Proph3tOverlay>, source: string) => void
  clear: () => void
}

export const useProph3tOverlaysStore = create<OverlaysState>((set) => ({
  overlays: [],
  source: null,
  setOverlays: (overlays, source) => set({ overlays, source }),
  clear: () => set({ overlays: [], source: null }),
}))
