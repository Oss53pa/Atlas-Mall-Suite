// ═══ SIGNAGE PLAN PINS STORE — Pins de propositions visuels sur le plan ═══
//
// Quand recommendSignagePlan tourne, on push ici toutes les positions
// proposées sous forme de pins légers (différents des PlacedSign).
// Les pins sont semi-transparents et portent le code du type proposé.
// Cliquer sur "+N" dans le modal commit les pins de ce type comme
// PlacedSign et les retire du store.

import { create } from 'zustand'

export interface ProposalPin {
  id: string
  /** Code catalogue du panneau proposé. */
  code: string
  x: number
  y: number
  reason: string
  zoneLabel?: string
  targetPoiId?: string
}

interface PinsState {
  pins: ProposalPin[]
  /** Visibilité globale (toggle utilisateur). */
  visible: boolean
  setPins: (pins: ProposalPin[]) => void
  removeByCode: (code: string) => void
  setVisible: (v: boolean) => void
  clear: () => void
}

export const useSignagePlanPinsStore = create<PinsState>((set) => ({
  pins: [],
  visible: true,
  setPins: (pins) => set({ pins, visible: true }),
  removeByCode: (code) => set(s => ({ pins: s.pins.filter(p => p.code !== code) })),
  setVisible: (visible) => set({ visible }),
  clear: () => set({ pins: [] }),
}))
