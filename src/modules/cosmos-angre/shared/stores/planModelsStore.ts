// ═══ PlanModelsStore — bibliothèque de modèles de plan ═══
//
// Un "modèle de plan" est un snapshot nommé du ParsedPlan + des espaces
// édités manuellement (EditableSpace[]). L'utilisateur peut enregistrer
// plusieurs versions de son plan (V1, V2, "après split parking", etc.)
// et choisir laquelle alimente les volumes Vol.1/2/3/4.
//
// Le plan actif (activeModelId) est ce qui est lu par usePlanEngineStore
// côté volumes métier. Changer de modèle remplace parsedPlan en cascade.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ParsedPlan } from '../planReader/planEngineTypes'

// ─── Types ──────────────────────────────

export interface PlanModel {
  id: string
  /** Nom affiché : "V1 initial", "Avec places PMR", "Split parking OK" */
  name: string
  /** Description libre. */
  description?: string
  /** Snapshot du parsedPlan (entities, wallSegments, spaces, layers...). */
  plan: ParsedPlan
  /** Identifiant du projet auquel ce modèle appartient. */
  projectId: string
  createdAt: string
  updatedAt: string
  /** Tag : 'brouillon' | 'validé' | 'archivé' */
  status: 'brouillon' | 'valide' | 'archive'
  /** Couleur visuelle pour la carte (optionnelle). */
  color?: string
  /** Statistiques pour affichage rapide. */
  stats?: {
    spacesCount: number
    wallSegmentsCount: number
    surfaceTotaleSqm: number
  }
}

// ─── State ──────────────────────────────

interface PlanModelsState {
  /** Tous les modèles enregistrés, toutes projets confondus. */
  models: PlanModel[]
  /** ID du modèle actif par projet. */
  activeModelIdByProject: Record<string, string>

  // Actions
  saveCurrentAsModel: (
    projectId: string,
    name: string,
    plan: ParsedPlan,
    opts?: { description?: string; status?: PlanModel['status']; color?: string },
  ) => PlanModel

  duplicateModel: (modelId: string, newName?: string) => PlanModel | null

  updateModel: (id: string, patch: Partial<Omit<PlanModel, 'id' | 'projectId' | 'createdAt'>>) => void

  deleteModel: (id: string) => void

  setActiveModel: (projectId: string, modelId: string) => void

  getActiveModel: (projectId: string) => PlanModel | undefined

  /** Renvoie tous les modèles d'un projet, triés par date de modif desc. */
  getModelsForProject: (projectId: string) => PlanModel[]
}

// ─── Helpers ──────────────────────────────

function computeStats(plan: ParsedPlan): PlanModel['stats'] {
  const surface = (plan.spaces ?? []).reduce((s, sp) => s + (sp.areaSqm || 0), 0)
  return {
    spacesCount: plan.spaces?.length ?? 0,
    wallSegmentsCount: plan.wallSegments?.length ?? 0,
    surfaceTotaleSqm: surface,
  }
}

function genId(): string {
  return `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const DEFAULT_COLORS = ['#b38a5a', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#b38a5a', '#84cc16']

// ─── Store ──────────────────────────────

export const usePlanModelsStore = create<PlanModelsState>()(
  persist(
    (set, get) => ({
      models: [],
      activeModelIdByProject: {},

      saveCurrentAsModel: (projectId, name, plan, opts = {}) => {
        const now = new Date().toISOString()
        const id = genId()
        const models = get().models
        const colorIdx = models.filter(m => m.projectId === projectId).length % DEFAULT_COLORS.length
        const model: PlanModel = {
          id,
          projectId,
          name: name.trim() || 'Modèle sans nom',
          description: opts.description,
          plan,
          createdAt: now,
          updatedAt: now,
          status: opts.status ?? 'brouillon',
          color: opts.color ?? DEFAULT_COLORS[colorIdx],
          stats: computeStats(plan),
        }
        set(s => ({
          models: [...s.models, model],
          // Active automatiquement le nouveau modèle si aucun n'est actif
          activeModelIdByProject: s.activeModelIdByProject[projectId]
            ? s.activeModelIdByProject
            : { ...s.activeModelIdByProject, [projectId]: id },
        }))
        return model
      },

      duplicateModel: (modelId, newName) => {
        const src = get().models.find(m => m.id === modelId)
        if (!src) return null
        const now = new Date().toISOString()
        const copy: PlanModel = {
          ...src,
          id: genId(),
          name: newName ?? `${src.name} (copie)`,
          createdAt: now,
          updatedAt: now,
          status: 'brouillon',
        }
        set(s => ({ models: [...s.models, copy] }))
        return copy
      },

      updateModel: (id, patch) => {
        set(s => ({
          models: s.models.map(m =>
            m.id === id
              ? {
                  ...m, ...patch,
                  stats: patch.plan ? computeStats(patch.plan) : m.stats,
                  updatedAt: new Date().toISOString(),
                }
              : m,
          ),
        }))
      },

      deleteModel: (id) => {
        set(s => {
          const model = s.models.find(m => m.id === id)
          const nextModels = s.models.filter(m => m.id !== id)
          // Si on supprime le modèle actif, on bascule sur un autre du même projet
          const nextActive = { ...s.activeModelIdByProject }
          if (model && s.activeModelIdByProject[model.projectId] === id) {
            const fallback = nextModels.find(m => m.projectId === model.projectId)
            if (fallback) nextActive[model.projectId] = fallback.id
            else delete nextActive[model.projectId]
          }
          return { models: nextModels, activeModelIdByProject: nextActive }
        })
      },

      setActiveModel: (projectId, modelId) => {
        set(s => ({
          activeModelIdByProject: { ...s.activeModelIdByProject, [projectId]: modelId },
        }))
      },

      getActiveModel: (projectId) => {
        const s = get()
        const id = s.activeModelIdByProject[projectId]
        if (!id) return undefined
        return s.models.find(m => m.id === id)
      },

      getModelsForProject: (projectId) => {
        return get().models
          .filter(m => m.projectId === projectId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      },
    }),
    {
      name: 'atlas-plan-models',
      // Note : les ParsedPlan peuvent être gros (polygones détaillés) → on
      // persiste tel quel dans localStorage. Pour des plans > 2 Mo, envisager
      // IndexedDB via un middleware custom.
      //
      // Strip des blob: URLs : un ParsedPlan fraîchement importé porte des
      // blob:http://.../uuid (planImageUrl, dxfBlobUrl, imageUrl). Ces URLs
      // meurent au refresh → ERR_FILE_NOT_FOUND si on les remet dans <img>.
      // On les enlève à la persistance ET à la réhydratation (v1 legacy).
      partialize: (state) => ({
        ...state,
        models: state.models.map((m) => ({ ...m, plan: stripBlobsFromPlan(m.plan) })),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.models = state.models.map((m) => ({ ...m, plan: stripBlobsFromPlan(m.plan) }))
      },
    },
  ),
)

/** Retire blob: URLs d'un ParsedPlan (mortes au refresh). */
function stripBlobsFromPlan(plan: ParsedPlan): ParsedPlan {
  const p = plan as ParsedPlan & { imageUrl?: string }
  const cleaned = { ...plan } as ParsedPlan & { imageUrl?: string }
  if (p.imageUrl?.startsWith('blob:'))      cleaned.imageUrl = undefined
  if (p.planImageUrl?.startsWith('blob:'))  cleaned.planImageUrl = undefined
  if (p.dxfBlobUrl?.startsWith('blob:'))    cleaned.dxfBlobUrl = undefined
  return cleaned
}
