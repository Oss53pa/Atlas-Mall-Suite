// ═══ SPACE CORRECTIONS STORE ═══
// Corrections manuelles apportées par l'utilisateur sur les espaces détectés
// depuis le plan (DXF). Sert à corriger la labelisation auto (souvent
// imparfaite) pour que PROPH3T calcule des parcours cohérents.
//
// 3 champs corrigeables par space :
//   - customLabel : nom lisible (ex : "Boutique Orange")
//   - category    : catégorie métier (mode / restauration / services / …)
//   - notes       : commentaire libre (affichage tooltip)
//
// Persisté localStorage + snapshot IndexedDB via cohabitation avec le reste.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ─── Catégories manuelles (source de vérité côté utilisateur) ───────

export const SPACE_CATEGORIES = [
  'mode',
  'restauration',
  'services',
  'loisirs',
  'alimentaire',
  'beaute',
  'enfants',
  'circulation',
  'service-tech',
  'other',
] as const

export type SpaceCategory = typeof SPACE_CATEGORIES[number]

export const CATEGORY_META: Record<SpaceCategory, { label: string; color: string; icon: string }> = {
  mode:           { label: 'Mode / Textile',      color: '#ec4899', icon: '👗' },
  restauration:   { label: 'Restauration',        color: '#f59e0b', icon: '🍽' },
  services:       { label: 'Services',            color: '#06b6d4', icon: '🏛' },
  loisirs:        { label: 'Loisirs / Culture',   color: '#b38a5a', icon: '🎬' },
  alimentaire:    { label: 'Alimentaire',         color: '#10b981', icon: '🛒' },
  beaute:         { label: 'Beauté / Santé',      color: '#f43f5e', icon: '💄' },
  enfants:        { label: 'Enfants / Jouets',    color: '#f97316', icon: '🧸' },
  circulation:    { label: 'Circulation',         color: '#64748b', icon: '↔' },
  'service-tech': { label: 'Technique / WC',      color: '#475569', icon: '⚙' },
  other:          { label: 'Autre',               color: '#94a3b8', icon: '·' },
}

// ─── Correction unitaire ────────────────────────────────────────────

export interface SpaceCorrection {
  /** Nouveau libellé lisible (si absent on retombe sur space.label). */
  customLabel?: string
  /** Catégorie corrigée (override du regex auto). */
  category?: SpaceCategory
  /** Commentaire libre. */
  notes?: string
  /** Exclure ce space de l'analyse parcours (ex: espace technique mal détecté). */
  excluded?: boolean
  /** Timestamp ISO de la dernière modification. */
  updatedAt: string
}

// ─── State ──────────────────────────────────────────────────────────

interface SpaceCorrectionsState {
  /** spaceId → correction. */
  corrections: Record<string, SpaceCorrection>
  /** Bump à chaque mutation — permet aux abonnés de se re-render. */
  version: number

  setCorrection: (spaceId: string, patch: Omit<SpaceCorrection, 'updatedAt'>) => void
  removeCorrection: (spaceId: string) => void
  clearAll: () => void

  /** Retourne la correction (ou undefined). */
  get: (spaceId: string) => SpaceCorrection | undefined
  /** Retourne la catégorie corrigée (ou undefined si pas de correction). */
  getCategory: (spaceId: string) => SpaceCategory | undefined
  /** Retourne le libellé final (customLabel > fallback). */
  resolveLabel: (spaceId: string, fallback: string) => string
  /** true si exclu. */
  isExcluded: (spaceId: string) => boolean

  /** Statistiques agrégées. */
  getStats: () => { total: number; excluded: number; relabeled: number; recategorized: number }
}

export const useSpaceCorrectionsStore = create<SpaceCorrectionsState>()(
  persist(
    (set, get) => ({
      corrections: {},
      version: 0,

      setCorrection: (spaceId, patch) => set(s => {
        const existing = s.corrections[spaceId] ?? { updatedAt: new Date().toISOString() }
        const next: SpaceCorrection = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
        // Si patch vide → on retire la correction
        const isEmpty = !next.customLabel && !next.category && !next.notes && !next.excluded
        const corrections = { ...s.corrections }
        if (isEmpty) delete corrections[spaceId]
        else corrections[spaceId] = next
        return { corrections, version: s.version + 1 }
      }),

      removeCorrection: (spaceId) => set(s => {
        if (!s.corrections[spaceId]) return s
        const corrections = { ...s.corrections }
        delete corrections[spaceId]
        return { corrections, version: s.version + 1 }
      }),

      clearAll: () => set(s => ({ corrections: {}, version: s.version + 1 })),

      get: (spaceId) => get().corrections[spaceId],
      getCategory: (spaceId) => get().corrections[spaceId]?.category,
      resolveLabel: (spaceId, fallback) =>
        get().corrections[spaceId]?.customLabel || fallback,
      isExcluded: (spaceId) => !!get().corrections[spaceId]?.excluded,

      getStats: () => {
        const all = Object.values(get().corrections)
        return {
          total: all.length,
          excluded: all.filter(c => c.excluded).length,
          relabeled: all.filter(c => c.customLabel).length,
          recategorized: all.filter(c => c.category).length,
        }
      },
    }),
    {
      name: 'cosmos-space-corrections-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
