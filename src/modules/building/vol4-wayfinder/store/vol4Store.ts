// ═══ VOL.4 WAYFINDER — Zustand Store ═══
//
// Pas de données mockées : le store démarre vide. Le contenu du catalogue
// de recherche, le graphe et la radio map proviennent :
//   - du ParsedPlan importé (Vol.3 partage la même source)
//   - du store Vol.1 (statut commercial des locaux)
//   - du store Vol.2 (alertes / zones bloquées)
//   - des imports utilisateur (radio map WiFi, beacons BLE, favoris)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Position2D, RadioMapPoint, BleBeacon, EkfState } from '../engines/positioningEngine'
import { ekfInitial } from '../engines/positioningEngine'
import type { RouteMode, RouteResult } from '../engines/astarEngine'
import type { Persona } from '../engines/proph3tWayfinder'
import type { SearchableItem, SearchIndex } from '../engines/searchEngine'
import type { UsageLog } from '../engines/proph3tWayfinder'

// ─── Types persistants ──────────────────────────────────

export interface FavoriteDestination {
  id: string
  itemId: string
  label: string
  floorId: string
  addedAt: number
}

export interface HistoryEntry {
  id: string
  itemId: string
  label: string
  lastVisitedAt: number
  count: number
}

export type Platform = 'mobile' | 'web' | 'kiosk'

// ─── Platform kiosks (position fixe connue) ─────────────

export interface KioskLocation {
  id: string
  label: string
  x: number
  y: number
  floorId: string
  /** Langue par défaut. */
  defaultLang: 'fr' | 'en' | 'dioula'
}

// ─── State ──────────────────────────────────────────────

interface Vol4State {
  // Configuration plateforme
  activePlatform: Platform
  activeKioskId: string | null
  kiosks: KioskLocation[]

  // Positionnement
  ekf: EkfState
  currentPosition: Position2D | null
  radioMap: RadioMapPoint[]
  bleBeacons: BleBeacon[]
  positioningMode: 'auto' | 'qr' | 'manual' | 'kiosk-fixed'
  positioningAccuracyM: number

  // Persona & préférences
  activePersona: Persona
  userHeightM: number | null
  pmrMode: boolean
  preferredLang: 'fr' | 'en' | 'dioula'
  voiceGuidance: boolean
  defaultMode: RouteMode

  // Itinéraire courant
  currentRoute: RouteResult | null
  fromNodeId: string | null
  toNodeId: string | null
  routeHistory: UsageLog[]

  // Catalogue & recherche
  catalogItems: SearchableItem[]
  searchIndex: SearchIndex | null

  // Favoris & historique
  favorites: FavoriteDestination[]
  history: HistoryEntry[]

  // Intégration autres volumes
  blockedEdgeIds: Set<string>
  closedLocalIds: Set<string>

  // UI
  showInstructions: boolean
  showMinimap: boolean
  selectedSuggestionCategory: string | null

  // ─── Actions ─────────────────────────────────────────
  setPlatform: (p: Platform) => void
  setActiveKiosk: (id: string | null) => void
  addKiosk: (k: KioskLocation) => void

  updatePosition: (pos: Position2D) => void
  setEkf: (e: EkfState) => void
  setRadioMap: (pts: RadioMapPoint[]) => void
  setBleBeacons: (b: BleBeacon[]) => void
  setPositioningMode: (m: Vol4State['positioningMode']) => void

  setPersona: (p: Persona) => void
  setUserHeight: (h: number | null) => void
  setPmrMode: (v: boolean) => void
  setLang: (l: Vol4State['preferredLang']) => void
  setVoiceGuidance: (v: boolean) => void
  setDefaultMode: (m: RouteMode) => void

  setRoute: (r: RouteResult | null, fromId?: string, toId?: string) => void
  logRoute: (entry: UsageLog) => void
  clearHistoryLogs: () => void

  setCatalog: (items: SearchableItem[]) => void
  setSearchIndex: (i: SearchIndex | null) => void

  addFavorite: (f: Omit<FavoriteDestination, 'id' | 'addedAt'>) => void
  removeFavorite: (id: string) => void
  touchHistory: (itemId: string, label: string) => void
  clearHistory: () => void

  blockEdges: (ids: Iterable<string>) => void
  unblockEdges: (ids: Iterable<string>) => void
  setClosedLocals: (ids: Iterable<string>) => void

  setShowInstructions: (v: boolean) => void
  setShowMinimap: (v: boolean) => void
  setSelectedSuggestionCategory: (c: string | null) => void

  reset: () => void
}

// ─── Initial state ──────────────────────────────────────

const INITIAL: Omit<Vol4State, keyof {
  setPlatform: any; setActiveKiosk: any; addKiosk: any;
  updatePosition: any; setEkf: any; setRadioMap: any; setBleBeacons: any;
  setPositioningMode: any; setPersona: any; setUserHeight: any;
  setPmrMode: any; setLang: any; setVoiceGuidance: any; setDefaultMode: any;
  setRoute: any; logRoute: any; clearHistoryLogs: any;
  setCatalog: any; setSearchIndex: any;
  addFavorite: any; removeFavorite: any; touchHistory: any; clearHistory: any;
  blockEdges: any; unblockEdges: any; setClosedLocals: any;
  setShowInstructions: any; setShowMinimap: any; setSelectedSuggestionCategory: any;
  reset: any;
}> = {
  activePlatform: 'web',
  activeKioskId: null,
  kiosks: [],

  ekf: ekfInitial(),
  currentPosition: null,
  radioMap: [],
  bleBeacons: [],
  positioningMode: 'auto',
  positioningAccuracyM: 3.0,

  activePersona: 'generic',
  userHeightM: null,
  pmrMode: false,
  preferredLang: 'fr',
  voiceGuidance: false,
  defaultMode: 'standard',

  currentRoute: null,
  fromNodeId: null,
  toNodeId: null,
  routeHistory: [],

  catalogItems: [],
  searchIndex: null,

  favorites: [],
  history: [],

  blockedEdgeIds: new Set<string>(),
  closedLocalIds: new Set<string>(),

  showInstructions: true,
  showMinimap: true,
  selectedSuggestionCategory: null,
}

// ─── Store ──────────────────────────────────────────────

export const useVol4Store = create<Vol4State>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      setPlatform: (p) => set({ activePlatform: p }),
      setActiveKiosk: (id) => {
        const k = get().kiosks.find(x => x.id === id)
        set({
          activeKioskId: id,
          ...(k ? {
            currentPosition: {
              x: k.x, y: k.y, floorId: k.floorId,
              headingDeg: 0, speedMps: 0, accuracyM: 0,
              t: Date.now(), source: 'kiosk' as const as any,
            } as Position2D,
            positioningMode: 'kiosk-fixed' as const,
            preferredLang: k.defaultLang,
          } : {}),
        })
      },
      addKiosk: (k) => set((s) => ({ kiosks: [...s.kiosks.filter(x => x.id !== k.id), k] })),

      updatePosition: (pos) => set({ currentPosition: pos, positioningAccuracyM: pos.accuracyM }),
      setEkf: (e) => set({ ekf: e }),
      setRadioMap: (pts) => set({ radioMap: pts }),
      setBleBeacons: (b) => set({ bleBeacons: b }),
      setPositioningMode: (m) => set({ positioningMode: m }),

      setPersona: (p) => set({ activePersona: p }),
      setUserHeight: (h) => set({ userHeightM: h }),
      setPmrMode: (v) => set({ pmrMode: v, defaultMode: v ? 'pmr' : get().defaultMode }),
      setLang: (l) => set({ preferredLang: l }),
      setVoiceGuidance: (v) => set({ voiceGuidance: v }),
      setDefaultMode: (m) => set({ defaultMode: m }),

      setRoute: (r, fromId, toId) => set({
        currentRoute: r,
        fromNodeId: fromId ?? null,
        toNodeId: toId ?? null,
      }),
      logRoute: (entry) => set((s) => ({
        routeHistory: [...s.routeHistory.slice(-499), entry], // garde 500 derniers
      })),
      clearHistoryLogs: () => set({ routeHistory: [] }),

      setCatalog: (items) => set({ catalogItems: items }),
      setSearchIndex: (i) => set({ searchIndex: i }),

      addFavorite: (f) => set((s) => {
        if (s.favorites.some(x => x.itemId === f.itemId)) return s
        return {
          favorites: [
            ...s.favorites,
            { ...f, id: `fav-${Date.now()}`, addedAt: Date.now() },
          ],
        }
      }),
      removeFavorite: (id) => set((s) => ({ favorites: s.favorites.filter(x => x.id !== id) })),
      touchHistory: (itemId, label) => set((s) => {
        const existing = s.history.find(h => h.itemId === itemId)
        if (existing) {
          return {
            history: s.history.map(h => h.itemId === itemId
              ? { ...h, lastVisitedAt: Date.now(), count: h.count + 1 }
              : h),
          }
        }
        return {
          history: [
            { id: `hist-${Date.now()}`, itemId, label, lastVisitedAt: Date.now(), count: 1 },
            ...s.history.slice(0, 9), // garde 10 entries
          ],
        }
      }),
      clearHistory: () => set({ history: [] }),

      blockEdges: (ids) => set((s) => {
        const next = new Set(s.blockedEdgeIds)
        for (const id of ids) next.add(id)
        return { blockedEdgeIds: next }
      }),
      unblockEdges: (ids) => set((s) => {
        const next = new Set(s.blockedEdgeIds)
        for (const id of ids) next.delete(id)
        return { blockedEdgeIds: next }
      }),
      setClosedLocals: (ids) => set({ closedLocalIds: new Set(ids) }),

      setShowInstructions: (v) => set({ showInstructions: v }),
      setShowMinimap: (v) => set({ showMinimap: v }),
      setSelectedSuggestionCategory: (c) => set({ selectedSuggestionCategory: c }),

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'vol4-wayfinder',
      // Ne pas persister searchIndex/currentRoute (volumineux/éphémères)
      // Ne pas persister les Sets (non serialisables par défaut)
      partialize: (s) => ({
        activePlatform: s.activePlatform,
        activeKioskId: s.activeKioskId,
        kiosks: s.kiosks,
        activePersona: s.activePersona,
        userHeightM: s.userHeightM,
        pmrMode: s.pmrMode,
        preferredLang: s.preferredLang,
        voiceGuidance: s.voiceGuidance,
        defaultMode: s.defaultMode,
        favorites: s.favorites,
        history: s.history,
        showInstructions: s.showInstructions,
        showMinimap: s.showMinimap,
        bleBeacons: s.bleBeacons,
        radioMap: s.radioMap,
      }) as any,
    },
  ),
)
