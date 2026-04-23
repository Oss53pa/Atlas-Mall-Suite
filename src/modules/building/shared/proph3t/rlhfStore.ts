// ═══ RLHF STORE — Persiste les corrections humaines pour fine-tuning futur ═══
// Le dataset est local (IndexedDB via simple JSON localStorage pour MVP).
// Chaque correction enrichit le contexte des futures sessions.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Proph3tCorrection } from './orchestrator.types'

interface RlhfState {
  corrections: Proph3tCorrection[]
  /** Statistiques par skill : taux d'acceptation. */
  statsBySkill: Record<string, { total: number; accepted: number; rejected: number; modified: number }>

  record: (correction: Proph3tCorrection) => void
  recent: (n?: number) => Proph3tCorrection[]
  acceptanceRate: (skill: string) => number
  /** Génère un bloc de prompt à injecter avec les corrections récentes (calibration). */
  buildContextPrompt: (skill: string, maxExamples?: number) => string
  clear: () => void
}

export const useRlhfStore = create<RlhfState>()(
  persist(
    (set, get) => ({
      corrections: [],
      statsBySkill: {},

      record: (correction) => set(s => {
        const corrections = [...s.corrections, correction].slice(-1000) // cap 1k
        const stats = { ...s.statsBySkill }
        const cur = stats[correction.skill] ?? { total: 0, accepted: 0, rejected: 0, modified: 0 }
        cur.total++
        if (correction.decision === 'accepted') cur.accepted++
        else if (correction.decision === 'rejected') cur.rejected++
        else cur.modified++
        stats[correction.skill] = cur
        return { corrections, statsBySkill: stats }
      }),

      recent: (n = 20) => get().corrections.slice(-n).reverse(),

      acceptanceRate: (skill) => {
        const s = get().statsBySkill[skill]
        if (!s || s.total === 0) return 1
        return s.accepted / s.total
      },

      buildContextPrompt: (skill, maxExamples = 5) => {
        const all = get().corrections.filter(c => c.skill === skill)
        const sample = all.slice(-maxExamples).reverse()
        if (sample.length === 0) return ''
        const lines = sample.map(c => {
          if (c.decision === 'rejected') {
            return `- ACTION ${c.actionId} REFUSÉE: ${c.reason ?? 'sans motif'}`
          }
          if (c.decision === 'modified') {
            return `- ACTION ${c.actionId} MODIFIÉE: ${c.reason ?? ''} → nouveau payload: ${JSON.stringify(c.modifiedPayload)}`
          }
          return `- ACTION ${c.actionId} ACCEPTÉE`
        })
        return `\n\nCALIBRATION (corrections humaines passées sur cette skill, à respecter):\n${lines.join('\n')}\n`
      },

      clear: () => set({ corrections: [], statsBySkill: {} }),
    }),
    { name: 'cosmos-proph3t-rlhf-v1', storage: createJSONStorage(() => localStorage) },
  ),
)
