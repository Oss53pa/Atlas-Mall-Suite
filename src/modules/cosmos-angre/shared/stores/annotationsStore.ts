// ═══ ANNOTATIONS STORE — Étiquettes / annotations libres sur le plan ═══
// Supports : texte libre placé, attaché à un floor, persisté localStorage

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Annotation {
  id: string
  floorId?: string
  /** Coordonnées en mètres (top-left). */
  x: number
  y: number
  text: string
  /** Style : taille, couleur, gras. */
  fontSize?: number
  color?: string
  bold?: boolean
  background?: string
  /** Rotation en degrés. */
  rotation?: number
  createdAt: string
  updatedAt: string
}

interface AnnotationsState {
  annotations: Annotation[]
  add: (a: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => string
  update: (id: string, patch: Partial<Annotation>) => void
  remove: (id: string) => void
  clear: () => void
  byFloor: (floorId: string | undefined) => Annotation[]
}

export const useAnnotationsStore = create<AnnotationsState>()(
  persist(
    (set, get) => ({
      annotations: [],
      add: (a) => {
        const id = `ann-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        const now = new Date().toISOString()
        set(s => ({
          annotations: [...s.annotations, {
            id, createdAt: now, updatedAt: now,
            fontSize: 12, color: '#1e293b', background: '#ffffffcc',
            ...a,
          }],
        }))
        return id
      },
      update: (id, patch) => set(s => ({
        annotations: s.annotations.map(a => a.id === id
          ? { ...a, ...patch, updatedAt: new Date().toISOString() }
          : a),
      })),
      remove: (id) => set(s => ({ annotations: s.annotations.filter(a => a.id !== id) })),
      clear: () => set({ annotations: [] }),
      byFloor: (floorId) => get().annotations.filter(a => !floorId || a.floorId === floorId),
    }),
    { name: 'cosmos-annotations-v1', storage: createJSONStorage(() => localStorage) },
  ),
)
