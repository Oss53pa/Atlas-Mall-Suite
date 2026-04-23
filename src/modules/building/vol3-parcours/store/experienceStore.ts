// ═══ VOL.3 EXPERIENCE STORE — Personas / Touchpoints / KPIs / Actions ═══
//
// Remplace le contenu hardcodé "Cosmos Angré" des sections Vol.3 par un
// vrai store persistant par projet + initialisation depuis des templates
// adaptés à la verticale (mall, hotel, office, hospital, campus, etc.).
//
// Principes :
//   • CRUD complet (create, update, delete, reorder)
//   • Persistance localStorage (Zustand persist)
//   • Templates par verticale : au 1er usage d'un projet, hydrate depuis
//     src/verticals/*.ts + experienceTemplates.ts
//   • Scope par projectId : chaque projet a son propre set de
//     personas/touchpoints/kpis/actions

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { VerticalId } from '../../../../verticals/types'
import {
  getPersonaTemplates,
  getTouchpointTemplates,
  getKpiTemplates,
  getActionPlanTemplates,
} from './experienceTemplates'

// ─── Types ────────────────────────────────────────────────

export interface Persona {
  id: string
  name: string
  role: string         // "Visiteuse jeune", "Patient ambulatoire", "Cadre télétravailleur"
  age: string          // "25-34 ans"
  description: string
  avatar?: string      // emoji ou image URL
  contexte?: string    // phrase situationnelle
  frustrations: string[]
  besoins: string[]
  motivations?: string[]
  canauxPreferes: string[]
  parcoursType?: string
  createdAt: string
  updatedAt: string
}

export type TouchpointType = 'physique' | 'digital' | 'humain'
export type Priority = 'critique' | 'important' | 'secondaire'

export interface Touchpoint {
  id: string
  name: string
  phase: string        // "Approche", "Entrée", "Parcours", "Sortie"...
  type: TouchpointType
  responsable: string
  description: string
  priorite: Priority
  /** Lié à une zone du plan (optionnel). */
  linkedZoneId?: string
  createdAt: string
}

export type KpiStatus = 'atteint' | 'en_cours' | 'non_atteint'

export interface Kpi {
  id: string
  groupTitle: string   // "Trafic & Fréquentation", "Satisfaction"...
  groupColor: string
  label: string
  cible: string
  frequence: string
  source: string
  status: KpiStatus
  /** Valeur actuelle calculée (auto si source branchée, manuelle sinon). */
  currentValue?: number | string
  /** Pourcentage d'atteinte 0-100. */
  progress?: number
  /** Auto-calculé depuis un engine ? */
  computedBy?: 'manual' | 'journey-store' | 'lots-store' | 'plan-engine' | 'proph3t'
  createdAt: string
}

export type ActionStatus = 'a_faire' | 'en_cours' | 'termine' | 'bloque'
export type ActionPriority = 'p0' | 'p1' | 'p2'

export interface ActionItem {
  id: string
  title: string
  category: string     // "Signalétique", "Digital", "RH", "Travaux"
  responsable: string
  deadline?: string    // ISO date
  capexFcfa?: number
  opexFcfaPerYear?: number
  impact: string       // description qualitative
  priority: ActionPriority
  status: ActionStatus
  /** Source : créé à la main, ou généré depuis Proph3t ? */
  origin: 'manual' | 'proph3t' | 'template'
  /** Skill Proph3t d'origine (si origin=proph3t). */
  proph3tSkill?: string
  createdAt: string
  updatedAt: string
}

// ─── State ────────────────────────────────────────────────

interface ExperienceState {
  // Scope par projet : Record<projectId, items[]>
  personasByProject:    Record<string, Persona[]>
  touchpointsByProject: Record<string, Touchpoint[]>
  kpisByProject:        Record<string, Kpi[]>
  actionsByProject:     Record<string, ActionItem[]>

  /** Projets déjà initialisés depuis les templates (pour ne pas réinitialiser). */
  initializedProjects: string[]

  // ─── Initialisation depuis templates ─────────────────────
  /** Hydrate un projet depuis les templates de sa verticale. Idempotent. */
  ensureInitialized: (projectId: string, verticalId: VerticalId) => void
  /** Re-initialise un projet (perd les customisations). */
  resetToTemplate: (projectId: string, verticalId: VerticalId) => void

  // ─── Personas CRUD ───────────────────────────────────────
  getPersonas:  (projectId: string) => Persona[]
  addPersona:   (projectId: string, p: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>) => void
  updatePersona:(projectId: string, id: string, patch: Partial<Persona>) => void
  deletePersona:(projectId: string, id: string) => void

  // ─── Touchpoints CRUD ────────────────────────────────────
  getTouchpoints:   (projectId: string) => Touchpoint[]
  addTouchpoint:    (projectId: string, t: Omit<Touchpoint, 'id' | 'createdAt'>) => void
  updateTouchpoint: (projectId: string, id: string, patch: Partial<Touchpoint>) => void
  deleteTouchpoint: (projectId: string, id: string) => void

  // ─── KPIs CRUD ───────────────────────────────────────────
  getKpis:   (projectId: string) => Kpi[]
  addKpi:    (projectId: string, k: Omit<Kpi, 'id' | 'createdAt'>) => void
  updateKpi: (projectId: string, id: string, patch: Partial<Kpi>) => void
  deleteKpi: (projectId: string, id: string) => void

  // ─── Actions CRUD ────────────────────────────────────────
  getActions:    (projectId: string) => ActionItem[]
  addAction:     (projectId: string, a: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateAction:  (projectId: string, id: string, patch: Partial<ActionItem>) => void
  deleteAction:  (projectId: string, id: string) => void
  /** Insère en masse des actions générées par Proph3t (évite doublons via clé logique). */
  syncFromProph3t: (projectId: string, skill: string, actions: Array<Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt' | 'origin' | 'proph3tSkill'>>) => void
}

// ─── Helpers ──────────────────────────────────────────────

const uid = () => `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const now = () => new Date().toISOString()

// ─── Store ────────────────────────────────────────────────

export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set, get) => ({
      personasByProject:    {},
      touchpointsByProject: {},
      kpisByProject:        {},
      actionsByProject:     {},
      initializedProjects:  [],

      ensureInitialized: (projectId, verticalId) => {
        const s = get()
        if (s.initializedProjects.includes(projectId)) return
        const t = now()
        const personas:    Persona[]    = getPersonaTemplates(verticalId).map(p => ({ ...p, id: uid(), createdAt: t, updatedAt: t }))
        const touchpoints: Touchpoint[] = getTouchpointTemplates(verticalId).map(tp => ({ ...tp, id: uid(), createdAt: t }))
        const kpis:        Kpi[]        = getKpiTemplates(verticalId).map(k => ({ ...k, id: uid(), createdAt: t }))
        const actions:     ActionItem[] = getActionPlanTemplates(verticalId).map(a => ({ ...a, id: uid(), origin: 'template', createdAt: t, updatedAt: t }))
        set(state => ({
          personasByProject:    { ...state.personasByProject,    [projectId]: personas },
          touchpointsByProject: { ...state.touchpointsByProject, [projectId]: touchpoints },
          kpisByProject:        { ...state.kpisByProject,        [projectId]: kpis },
          actionsByProject:     { ...state.actionsByProject,     [projectId]: actions },
          initializedProjects:  [...state.initializedProjects, projectId],
        }))
      },

      resetToTemplate: (projectId, verticalId) => {
        set(state => ({
          initializedProjects: state.initializedProjects.filter(p => p !== projectId),
        }))
        get().ensureInitialized(projectId, verticalId)
      },

      // Personas
      getPersonas: (pid) => get().personasByProject[pid] ?? [],
      addPersona: (pid, p) => set(s => ({
        personasByProject: {
          ...s.personasByProject,
          [pid]: [...(s.personasByProject[pid] ?? []), { ...p, id: uid(), createdAt: now(), updatedAt: now() }],
        },
      })),
      updatePersona: (pid, id, patch) => set(s => ({
        personasByProject: {
          ...s.personasByProject,
          [pid]: (s.personasByProject[pid] ?? []).map(p => p.id === id ? { ...p, ...patch, updatedAt: now() } : p),
        },
      })),
      deletePersona: (pid, id) => set(s => ({
        personasByProject: {
          ...s.personasByProject,
          [pid]: (s.personasByProject[pid] ?? []).filter(p => p.id !== id),
        },
      })),

      // Touchpoints
      getTouchpoints: (pid) => get().touchpointsByProject[pid] ?? [],
      addTouchpoint: (pid, t) => set(s => ({
        touchpointsByProject: {
          ...s.touchpointsByProject,
          [pid]: [...(s.touchpointsByProject[pid] ?? []), { ...t, id: uid(), createdAt: now() }],
        },
      })),
      updateTouchpoint: (pid, id, patch) => set(s => ({
        touchpointsByProject: {
          ...s.touchpointsByProject,
          [pid]: (s.touchpointsByProject[pid] ?? []).map(t => t.id === id ? { ...t, ...patch } : t),
        },
      })),
      deleteTouchpoint: (pid, id) => set(s => ({
        touchpointsByProject: {
          ...s.touchpointsByProject,
          [pid]: (s.touchpointsByProject[pid] ?? []).filter(t => t.id !== id),
        },
      })),

      // KPIs
      getKpis: (pid) => get().kpisByProject[pid] ?? [],
      addKpi: (pid, k) => set(s => ({
        kpisByProject: {
          ...s.kpisByProject,
          [pid]: [...(s.kpisByProject[pid] ?? []), { ...k, id: uid(), createdAt: now() }],
        },
      })),
      updateKpi: (pid, id, patch) => set(s => ({
        kpisByProject: {
          ...s.kpisByProject,
          [pid]: (s.kpisByProject[pid] ?? []).map(k => k.id === id ? { ...k, ...patch } : k),
        },
      })),
      deleteKpi: (pid, id) => set(s => ({
        kpisByProject: {
          ...s.kpisByProject,
          [pid]: (s.kpisByProject[pid] ?? []).filter(k => k.id !== id),
        },
      })),

      // Actions
      getActions: (pid) => get().actionsByProject[pid] ?? [],
      addAction: (pid, a) => set(s => ({
        actionsByProject: {
          ...s.actionsByProject,
          [pid]: [...(s.actionsByProject[pid] ?? []), { ...a, id: uid(), createdAt: now(), updatedAt: now() }],
        },
      })),
      updateAction: (pid, id, patch) => set(s => ({
        actionsByProject: {
          ...s.actionsByProject,
          [pid]: (s.actionsByProject[pid] ?? []).map(a => a.id === id ? { ...a, ...patch, updatedAt: now() } : a),
        },
      })),
      deleteAction: (pid, id) => set(s => ({
        actionsByProject: {
          ...s.actionsByProject,
          [pid]: (s.actionsByProject[pid] ?? []).filter(a => a.id !== id),
        },
      })),
      syncFromProph3t: (pid, skill, actions) => {
        const t = now()
        const existing = get().actionsByProject[pid] ?? []
        const nonProph3t = existing.filter(a => a.proph3tSkill !== skill)
        const newOnes: ActionItem[] = actions.map(a => ({
          ...a, id: uid(), origin: 'proph3t', proph3tSkill: skill, createdAt: t, updatedAt: t,
        }))
        set(s => ({
          actionsByProject: { ...s.actionsByProject, [pid]: [...nonProph3t, ...newOnes] },
        }))
      },
    }),
    {
      name: 'atlas-experience-store-v1',
      version: 1,
    },
  ),
)
