// ═══ SIGNAGE EDIT UI STORE — État éphémère drag/add (non persisté) ═══
//
// Pilote l'interaction utilisateur autour de la signalétique :
//   • mode 'idle'   → rien
//   • mode 'add'    → clic sur le plan ajoute un panneau (kind = addKind)
//   • mode 'drag'   → un panneau existant est en cours de drag
//
// Volatile : reset à chaque reload, pas dans localStorage.

import { create } from 'zustand'
import type { SignKind } from './signagePlacementStore'

type EditMode = 'idle' | 'add' | 'drag'

interface EditUiState {
  mode: EditMode
  /** Kind utilisé en mode 'add'. */
  addKind: SignKind
  /** ID du sign en cours de drag (mode 'drag'). */
  draggingId: string | null
  setMode: (m: EditMode) => void
  setAddKind: (k: SignKind) => void
  startDrag: (id: string) => void
  endDrag: () => void
}

export const useSignageEditUiStore = create<EditUiState>((set) => ({
  mode: 'idle',
  addKind: 'direction',
  draggingId: null,
  setMode: (mode) => set({ mode, draggingId: mode === 'drag' ? null : null }),
  setAddKind: (addKind) => set({ addKind }),
  startDrag: (id) => set({ mode: 'drag', draggingId: id }),
  endDrag: () => set({ mode: 'idle', draggingId: null }),
}))
