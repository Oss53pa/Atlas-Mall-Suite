// ═══ WAYFINDER DESIGNER — Store Zustand ═══
//
// Source de vérité du Designer : config courante, projet chargé, undo/redo,
// autosave 30s, sync Supabase optionnelle.
//
// Référence : Cahier des charges §10 (persistence, versioning, autosave).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { supabase, isOfflineMode } from '../../../../lib/supabase'
import type {
  DesignerConfig, DesignerProjectRecord, DesignerProjectStatus,
  LocaleCode, TemplateFormat,
} from '../types'

// ─── Config par défaut (cohérente avec les exigences) ───

export const DEFAULT_LOCALE: LocaleCode = 'fr-FR'

export function buildDefaultConfig(): DesignerConfig {
  return {
    project: {
      siteName: 'Centre commercial',
      location: 'Abidjan, Côte d\'Ivoire',
      locales: ['fr-FR', 'en-US'],
      activeLocale: DEFAULT_LOCALE,
      dir: 'ltr',
      version: '0.1.0',
      updatedAt: new Date().toISOString(),
    },
    brand: {
      palette: {
        primary: '#0ea5e9',
        secondary: '#64748b',
        accent: '#f59e0b',
        emergency: '#dc2626',
        neutral: '#94a3b8',
        background: '#ffffff',
        backgroundDark: '#0f172a',
        foreground: '#0f172a',
        foregroundDark: '#f1f5f9',
      },
      fonts: {
        heading: {
          family: 'Inter',
          source: 'google',
          weights: [400, 600, 700],
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
          fallback: 'system-ui, sans-serif',
        },
        body: {
          family: 'Inter',
          source: 'google',
          weights: [400, 500],
          url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap',
          fallback: 'system-ui, sans-serif',
        },
      },
      borderRadius: 'md',
      iconStyle: 'outline',
      mapStyle: 'default',
      themeMode: 'light',
      wcagLevel: 'AA',
      source: { kind: 'manual' },
    },
    templateId: 'kiosk-portrait-default',
    format: 'kiosk-portrait-1080x1920',
    map: {
      showWalls: true,
      showSpaces: true,
      showPaths: true,
      showPOIs: true,
      showSignage: false,
      showEntrances: true,
      showGrid: false,
      visibleFloorIds: [],
    },
    legend: {
      enabled: true,
      position: 'right',
      showCategories: true,
      showLandmarks: true,
      maxItems: 40,
    },
    header: {
      enabled: true,
      showLogo: true,
      showSiteName: true,
      showTagline: true,
      showLanguageSwitch: true,
      height: 12,
    },
    footer: {
      enabled: true,
      showQrCode: true,
      showVersion: true,
      showScaleBar: true,
      showNorthArrow: true,
      showLegalMentions: false,
    },
    search: {
      enabled: true,
      suggestCategories: ['mode', 'restauration', 'services'],
      maxResults: 8,
      showKeyboard: true,
      keyboardLayout: 'azerty',
    },
    attract: {
      enabled: true,
      inactivitySec: 30,
      message: 'Touchez pour démarrer',
      animation: 'zoom-loop',
    },
    highlightedPois: [],
    i18nStrings: {
      'fr-FR': {
        welcome: 'Bienvenue',
        searchPlaceholder: 'Que cherchez-vous ?',
        wayYouAreHere: 'Vous êtes ici',
        itineraryStart: 'Commencer l\'itinéraire',
        scanToPhone: 'Scannez pour continuer sur votre téléphone',
        back: 'Retour',
        reset: 'Recommencer',
        pmrMode: 'Accessibilité PMR',
      },
      'en-US': {
        welcome: 'Welcome',
        searchPlaceholder: 'What are you looking for?',
        wayYouAreHere: 'You are here',
        itineraryStart: 'Start directions',
        scanToPhone: 'Scan to continue on your phone',
        back: 'Back',
        reset: 'Restart',
        pmrMode: 'Accessibility mode',
      },
    },
    previewMode: 'light',
    colorBlindnessSim: 'none',
  }
}

// ─── Undo/Redo (historique de DesignerConfig) ─────

const HISTORY_MAX = 50

interface HistoryState {
  past: DesignerConfig[]
  future: DesignerConfig[]
}

// ─── State store ──────────────────────────────────

export type DesignerTab = 'project' | 'brand' | 'templates' | 'canvas' | 'export' | 'deploy'

interface DesignerState {
  // Onglet actif
  activeTab: DesignerTab
  setActiveTab: (t: DesignerTab) => void

  // Config courante
  config: DesignerConfig
  setConfig: (next: DesignerConfig) => void
  /** Patch partiel + push dans l'historique. */
  patchConfig: (patch: Partial<DesignerConfig>) => void
  patchBrand: (patch: Partial<DesignerConfig['brand']>) => void
  patchProject: (patch: Partial<DesignerConfig['project']>) => void

  // Projet chargé (Supabase)
  currentProject: DesignerProjectRecord | null
  setCurrentProject: (p: DesignerProjectRecord | null) => void

  // Undo / Redo
  history: HistoryState
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Dirty flag
  isDirty: boolean
  lastSavedAt: string | null
  markClean: () => void

  // Autosave
  autosaveEnabled: boolean
  setAutosaveEnabled: (v: boolean) => void

  // Déploiement : bornes associées
  deployedKioskIds: string[]
  addKiosk: (id: string) => void
  removeKiosk: (id: string) => void

  // Reset / new project
  resetToDefaults: () => void
}

export const useDesignerStore = create<DesignerState>()(
  persist(
    (set, get) => ({
      activeTab: 'project',
      setActiveTab: (t) => set({ activeTab: t }),

      config: buildDefaultConfig(),
      setConfig: (next) => set(s => ({
        config: next,
        isDirty: true,
        history: pushHistory(s.history, s.config),
      })),
      patchConfig: (patch) => set(s => ({
        config: { ...s.config, ...patch, project: {
          ...s.config.project, ...(patch.project ?? {}),
          updatedAt: new Date().toISOString(),
        } },
        isDirty: true,
        history: pushHistory(s.history, s.config),
      })),
      patchBrand: (patch) => set(s => ({
        config: { ...s.config, brand: { ...s.config.brand, ...patch } },
        isDirty: true,
        history: pushHistory(s.history, s.config),
      })),
      patchProject: (patch) => set(s => ({
        config: {
          ...s.config,
          project: {
            ...s.config.project, ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
        isDirty: true,
        history: pushHistory(s.history, s.config),
      })),

      currentProject: null,
      setCurrentProject: (p) => set({
        currentProject: p,
        config: p?.config ?? get().config,
        isDirty: false,
        lastSavedAt: p?.updatedAt ?? null,
        history: { past: [], future: [] },
      }),

      history: { past: [], future: [] },
      undo: () => set(s => {
        if (s.history.past.length === 0) return s
        const previous = s.history.past[s.history.past.length - 1]
        return {
          config: previous,
          history: {
            past: s.history.past.slice(0, -1),
            future: [s.config, ...s.history.future].slice(0, HISTORY_MAX),
          },
          isDirty: true,
        }
      }),
      redo: () => set(s => {
        if (s.history.future.length === 0) return s
        const next = s.history.future[0]
        return {
          config: next,
          history: {
            past: [...s.history.past, s.config].slice(-HISTORY_MAX),
            future: s.history.future.slice(1),
          },
          isDirty: true,
        }
      }),
      canUndo: () => get().history.past.length > 0,
      canRedo: () => get().history.future.length > 0,

      isDirty: false,
      lastSavedAt: null,
      markClean: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      autosaveEnabled: true,
      setAutosaveEnabled: (v) => set({ autosaveEnabled: v }),

      deployedKioskIds: [],
      addKiosk: (id) => set(s => ({
        deployedKioskIds: s.deployedKioskIds.includes(id)
          ? s.deployedKioskIds
          : [...s.deployedKioskIds, id],
        isDirty: true,
      })),
      removeKiosk: (id) => set(s => ({
        deployedKioskIds: s.deployedKioskIds.filter(k => k !== id),
        isDirty: true,
      })),

      resetToDefaults: () => set({
        config: buildDefaultConfig(),
        currentProject: null,
        history: { past: [], future: [] },
        isDirty: false,
        deployedKioskIds: [],
      }),
    }),
    {
      name: 'atlas-wayfinder-designer-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        config: s.config,
        currentProject: s.currentProject,
        activeTab: s.activeTab,
        deployedKioskIds: s.deployedKioskIds,
        autosaveEnabled: s.autosaveEnabled,
      }),
    },
  ),
)

function pushHistory(h: HistoryState, snapshot: DesignerConfig): HistoryState {
  return {
    past: [...h.past, snapshot].slice(-HISTORY_MAX),
    future: [],   // toute modification écrase le futur
  }
}

// ═══════════════════════════════════════════════════
// Services Supabase — sauvegarde / chargement / autosave
// ═══════════════════════════════════════════════════

export async function saveDesignerProject(opts?: {
  name?: string
  status?: DesignerProjectStatus
  incrementVersion?: boolean
  changelog?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const state = useDesignerStore.getState()
  const { config, currentProject, deployedKioskIds } = state
  const projetId = config.project.projetId

  if (!projetId) return { success: false, error: 'Projet Atlas non associé (projetId manquant).' }
  if (!config.project.siteName) return { success: false, error: 'Nom du site obligatoire.' }

  // Gestion version bump
  const base = currentProject?.version ?? '0.1.0'
  const version = opts?.incrementVersion ? bumpVersion(base) : base

  const payload = {
    projet_id: projetId,
    name: opts?.name ?? currentProject?.name ?? config.project.siteName,
    status: opts?.status ?? currentProject?.status ?? 'draft',
    config: {
      ...config,
      project: { ...config.project, version, updatedAt: new Date().toISOString() },
    },
    version,
    version_history: [
      ...(currentProject?.versionHistory ?? []),
      ...(opts?.incrementVersion ? [{
        version,
        publishedAt: new Date().toISOString(),
        changelog: opts.changelog,
      }] : []),
    ],
    deployed_kiosk_ids: deployedKioskIds,
    updated_at: new Date().toISOString(),
  }

  if (isOfflineMode) {
    // Fallback localStorage uniquement : le store persiste déjà via middleware.
    state.markClean()
    return { success: true, id: currentProject?.id ?? 'local-draft' }
  }

  try {
    if (currentProject?.id) {
      const { error } = await supabase
        .from('designer_projects')
        .update(payload)
        .eq('id', currentProject.id)
      if (error) return { success: false, error: error.message }
      state.setCurrentProject({
        ...currentProject,
        ...payloadToRecord(payload, currentProject.id),
      })
      state.markClean()
      return { success: true, id: currentProject.id }
    } else {
      const { data, error } = await supabase
        .from('designer_projects')
        .insert(payload)
        .select('*')
        .single()
      if (error || !data) return { success: false, error: error?.message ?? 'insert failed' }
      state.setCurrentProject({
        id: data.id,
        projetId: data.projet_id,
        name: data.name,
        status: data.status,
        config: data.config,
        version: data.version,
        versionHistory: data.version_history,
        deployedKioskIds: data.deployed_kiosk_ids,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })
      state.markClean()
      return { success: true, id: data.id }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return { success: false, error: msg }
  }
}

export async function loadDesignerProject(id: string): Promise<{ success: boolean; error?: string }> {
  if (isOfflineMode) {
    return { success: false, error: 'Chargement serveur indisponible en mode offline.' }
  }
  const { data, error } = await supabase
    .from('designer_projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return { success: false, error: error?.message ?? 'not found' }

  useDesignerStore.getState().setCurrentProject({
    id: data.id,
    projetId: data.projet_id,
    name: data.name,
    status: data.status,
    config: data.config,
    version: data.version,
    versionHistory: data.version_history,
    deployedKioskIds: data.deployed_kiosk_ids,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  })
  return { success: true }
}

export async function listDesignerProjects(projetId: string): Promise<DesignerProjectRecord[]> {
  if (isOfflineMode) return []
  const { data } = await supabase
    .from('designer_projects')
    .select('*')
    .eq('projet_id', projetId)
    .order('updated_at', { ascending: false })
  return (data ?? []).map(r => ({
    id: r.id, projetId: r.projet_id, name: r.name,
    status: r.status, config: r.config, version: r.version,
    versionHistory: r.version_history,
    deployedKioskIds: r.deployed_kiosk_ids,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

// ─── Autosave (30s) ────────────────────────────────

let autosaveTimer: ReturnType<typeof setInterval> | null = null

export function startAutosave(): void {
  if (autosaveTimer) return
  autosaveTimer = setInterval(() => {
    const s = useDesignerStore.getState()
    if (!s.autosaveEnabled) return
    if (!s.isDirty) return
    if (!s.config.project.projetId) return
    void saveDesignerProject({ status: 'draft' })
      .then(r => {
        if (r.success) {
           
          console.debug('[designer autosave]', new Date().toLocaleTimeString(), r.id)
        }
      })
  }, 30_000)
}

export function stopAutosave(): void {
  if (autosaveTimer) {
    clearInterval(autosaveTimer)
    autosaveTimer = null
  }
}

// ─── Helpers ────────────────────────────────────────

function bumpVersion(v: string): string {
  // Semantic bump : patch level par défaut
  const parts = v.split('.').map(n => parseInt(n, 10) || 0)
  const [maj = 0, min = 0, patch = 0] = parts
  return `${maj}.${min}.${patch + 1}`
}

function payloadToRecord(payload: {
  name: string; status: string; config: DesignerConfig;
  version: string; version_history: DesignerProjectRecord['versionHistory'];
  deployed_kiosk_ids: string[]; updated_at: string;
}, id: string): Partial<DesignerProjectRecord> {
  return {
    id,
    name: payload.name,
    status: payload.status as DesignerProjectStatus,
    config: payload.config,
    version: payload.version,
    versionHistory: payload.version_history,
    deployedKioskIds: payload.deployed_kiosk_ids,
    updatedAt: payload.updated_at,
  }
}

// ─── Import / Export JSON projet complet (§10) ────

export function exportProjectJson(): string {
  const { config, currentProject, deployedKioskIds } = useDesignerStore.getState()
  return JSON.stringify({
    schema: 'atlas-wayfinder-designer-project@1',
    exportedAt: new Date().toISOString(),
    config,
    currentProject: currentProject
      ? { id: currentProject.id, version: currentProject.version, versionHistory: currentProject.versionHistory }
      : null,
    deployedKioskIds,
  }, null, 2)
}

export function importProjectJson(raw: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw)
    if (parsed.schema !== 'atlas-wayfinder-designer-project@1') {
      return { success: false, error: `Schema incompatible : ${parsed.schema}` }
    }
    useDesignerStore.getState().setConfig(parsed.config)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'JSON invalide' }
  }
}

// ─── Limite de mémoire preview — template format switch ─

export function switchTemplate(templateId: string, format: TemplateFormat): void {
  useDesignerStore.getState().patchConfig({ templateId, format })
}
