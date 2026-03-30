// ═══ VOL.3 PARCOURS CLIENT — Main Module ═══

import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Signpost,
  Route,
  Flame,
  MapPin,
  Accessibility,
  Library,
  Send,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Star,
  AlertTriangle,
  Lightbulb,
  Crown,
  X,
  Loader2,
  Bell,
  PlayCircle,
  Info,
  Map,
  Eye,
  Layers,
  Users,
  User,
  Grid3X3,
  BarChart2,
  Calendar,
  Navigation,
  FileText,
  MessageSquare,
  LayoutDashboard,
  Smartphone,
  Upload,
  Box,
} from 'lucide-react'
import { useVol3Store } from './store/vol3Store'
import { usePlanImportStore } from '../shared/stores/planImportStore'
import FloorPlanCanvas, { CANVAS_SCALE } from '../shared/components/FloorPlanCanvas'
const Vol3DModuleEmbed = lazy(() => import('../vol-3d/Vol3DModule'))
import Proph3tChat from '../shared/components/Proph3tChat'
import EntityPanel from '../shared/components/EntityPanel'
import ToolbarButton from '../shared/components/ToolbarButton'
import ScoreGauge from '../shared/components/ScoreGauge'
import SaveStatusIndicator, { type SaveStatus } from '../shared/components/SaveStatusIndicator'
import HeatmapOverlay, { type ZoneHeatData } from './components/HeatmapOverlay'
import GeoNotificationPanel, { type GeoNotification } from './components/GeoNotificationPanel'
import VisitReplay, { type VisitPath } from './components/VisitReplay'
import type { ChatMessage, MomentCle, POI, SignageItem } from '../shared/proph3t/types'

// ── Lazy section imports ─────────────────────────────────────
const ParcoursSectionLazy = lazy(() => import('./sections/ParcoursSection'))
const WayfindingSectionLazy = lazy(() => import('./sections/WayfindingSection'))
const SignaleticsSectionLazy = lazy(() => import('./sections/SignaleticsSection'))
const HeatmapSectionLazy = lazy(() => import('./sections/HeatmapSection'))
const RapportSectionLazy = lazy(() => import('./sections/RapportSection'))
const ChatSectionLazy = lazy(() => import('./sections/ChatSection'))
const IntroSectionLazy = lazy(() => import('./sections/IntroSection'))
const JourneyMapSectionLazy = lazy(() => import('./sections/JourneyMapSection'))
const SwimlaneSectionLazy = lazy(() => import('./sections/SwimlaneSection'))
const PersonasGridLazy = lazy(() => import('./sections/PersonasGrid'))
const PersonaDetailLazy = lazy(() => import('./sections/PersonaDetail'))
const TouchpointsMatrixLazy = lazy(() => import('./sections/TouchpointsMatrix'))
const KpiDashboardLazy = lazy(() => import('./sections/KpiDashboard'))
const PlanActionLazy = lazy(() => import('./sections/PlanAction'))
const SignaletiquePageLazy = lazy(() => import('./sections/SignaletiquePage'))
const ExperienceDashboardLazy = lazy(() => import('./sections/ExperienceDashboard'))
const ActionTrackerLazy = lazy(() => import('./sections/ActionTracker'))
const SignaletiquTrackerLazy = lazy(() => import('./sections/SignaletiquTracker'))
const TouchpointTrackerLazy = lazy(() => import('./sections/TouchpointTracker'))
const FeedbackModuleLazy = lazy(() => import('./sections/FeedbackModule'))
const DwellTimeOptimizerLazy = lazy(() => import('./sections/DwellTimeOptimizer'))
const RevenuePredictorLazy = lazy(() => import('./sections/RevenuePredictor'))
const SeasonalPlanningLazy = lazy(() => import('./sections/SeasonalPlanning'))
const TenantMixValidatorLazy = lazy(() => import('./sections/TenantMixValidator'))
const PlanImportsSectionLazy = lazy(() => import('../shared/components/PlanImportsSection'))
const View3DSectionLazy = lazy(() => import('../shared/view3d/View3DSection'))

type Vol3Tab =
  | 'plan'
  | 'plan_imports'
  | 'parcours'
  | 'wayfinding'
  | 'signaletique'
  | 'heatmap'
  | 'rapport'
  | 'chat'
  | 'intro'
  | 'journeymap'
  | 'parcoursvisuel'
  | 'swimlane'
  | 'personas'
  | 'awa_moussa'
  | 'serge'
  | 'pamela'
  | 'aminata'
  | 'touchpoints'
  | 'kpis'
  | 'action'
  | 'signaletique_page'
  | 'exp_dashboard'
  | 'action_tracker'
  | 'signa_tracker'
  | 'touch_tracker'
  | 'feedbacks'
  | 'dwell_time'
  | 'revenue_predictor'
  | 'seasonal'
  | 'tenant_mix_validator'

// ─── Sidebar nav definition ─────────────────────────────────

interface NavItem {
  id: Vol3Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
  dot?: boolean
}

interface NavGroup {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  items: NavItem[]
  separator?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'vue',
    label: "VUE D'ENSEMBLE",
    icon: LayoutDashboard,
    color: '#34d399',
    items: [
      { id: 'intro', label: 'Introduction', icon: Info },
    ],
  },
  {
    key: 'journeymap',
    label: 'M1 — JOURNEY MAP',
    icon: Map,
    color: '#34d399',
    items: [
      { id: 'journeymap', label: 'Journey Map', icon: Map, dot: true },
      { id: 'parcoursvisuel', label: 'Parcours visuel', icon: Eye },
      { id: 'swimlane', label: 'Swimlane · 10 couches', icon: Layers },
    ],
  },
  {
    key: 'personas',
    label: 'M2 — PERSONAS',
    icon: Users,
    color: '#8b5cf6',
    items: [
      { id: 'personas', label: '4 Personas Cosmos', icon: Users },
      { id: 'awa_moussa', label: 'Awa & Moussa', icon: Users },
      { id: 'serge', label: 'Serge', icon: User },
      { id: 'pamela', label: 'Pamela', icon: User },
      { id: 'aminata', label: 'Aminata', icon: User },
    ],
  },
  {
    key: 'touchpoints',
    label: 'M3 — TOUCHPOINTS',
    icon: Grid3X3,
    color: '#f59e0b',
    items: [
      { id: 'touchpoints', label: 'Matrice touchpoints', icon: Grid3X3 },
    ],
  },
  {
    key: 'kpis',
    label: 'M4 — KPIS',
    icon: BarChart2,
    color: '#ef4444',
    items: [
      { id: 'kpis', label: 'Dashboard KPIs', icon: BarChart2 },
    ],
  },
  {
    key: 'action',
    label: "M5 — PLAN D'ACTION",
    icon: Calendar,
    color: '#06b6d4',
    items: [
      { id: 'action', label: "Plan d'action", icon: Calendar },
    ],
  },
  {
    key: 'signaletique_page',
    label: 'M6 — SIGNALÉTIQUE',
    icon: Signpost,
    color: '#22c55e',
    items: [
      { id: 'signaletique_page', label: 'Signalétique directionnelle', icon: Signpost },
    ],
  },
  {
    key: 'studio',
    label: 'ATLAS STUDIO',
    icon: Sparkles,
    color: '#a855f7',
    separator: true,
    items: [
      { id: 'plan_imports', label: 'Plans importés', icon: Upload },
      { id: 'plan', label: 'Plan interactif', icon: Map },
      { id: 'parcours', label: 'Parcours client', icon: Route },
      { id: 'wayfinding', label: 'Wayfinding', icon: Navigation },
      { id: 'signaletique', label: 'Signalétique (plan)', icon: Signpost },
      { id: 'heatmap', label: 'Heatmap', icon: Flame },
      { id: 'rapport', label: 'Rapport', icon: FileText },
      { id: 'chat', label: 'Proph3t Chat', icon: MessageSquare },
    ],
  },
  {
    key: 'pilotage',
    label: 'PILOTAGE',
    icon: BarChart2,
    color: '#ef4444',
    separator: true,
    items: [
      { id: 'exp_dashboard', label: 'Dashboard expérience', icon: BarChart2, dot: true },
      { id: 'action_tracker', label: "Plan d'action A01-A13", icon: Calendar },
      { id: 'signa_tracker', label: 'Déploiement signalétique', icon: Signpost },
      { id: 'touch_tracker', label: 'Touchpoints', icon: Smartphone },
      { id: 'feedbacks', label: 'Réclamations visiteurs', icon: MessageSquare },
    ],
  },
  {
    key: 'advanced',
    label: 'ANALYSE AVANCÉE',
    icon: BarChart2,
    color: '#ec4899',
    separator: true,
    items: [
      { id: 'dwell_time', label: 'Dwell Time Optimizer', icon: Eye },
      { id: 'revenue_predictor', label: 'Revenue Predictor', icon: BarChart2 },
      { id: 'seasonal', label: 'Scénarios saisonniers', icon: Calendar },
      { id: 'tenant_mix_validator', label: 'Tenant Mix Validator', icon: Grid3X3 },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function iconAbbrev(icon: string): string {
  const map: Record<string, string> = {
    'door-open': 'EN',
    store: 'ST',
    utensils: 'RS',
    crown: 'VIP',
    restroom: 'WC',
    elevator: 'ASC',
    escalator: 'ESC',
    'info-circle': 'i',
    prescription: 'PH',
    'cash-register': 'CA',
    car: 'PK',
  }
  return map[icon] ?? icon.slice(0, 2).toUpperCase()
}

function signageColor(type: string): string {
  if (type.startsWith('totem')) return '#F59E0B'
  if (type.includes('pmr') || type.includes('pictogramme')) return '#3B82F6'
  if (type.includes('sortie') || type.includes('secours') || type.includes('bloc')) return '#EF4444'
  if (type.includes('dir')) return '#10B981'
  return '#8B5CF6'
}

function uid(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Moment Detail Sub-Panel ──────────────────────────────────

function MomentDetail({
  moment,
  onClose,
}: {
  moment: MomentCle
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
            {moment.number}
          </span>
          {moment.name}
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* KPI */}
        <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-3">
          <div className="text-xs text-emerald-500 font-mono mb-1 flex items-center gap-1">
            <Star className="w-3 h-3" /> KPI
          </div>
          <p className="text-gray-200">{moment.kpi}</p>
        </div>

        {/* Friction */}
        <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-3">
          <div className="text-xs text-amber-500 font-mono mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Friction
          </div>
          <p className="text-gray-200">{moment.friction}</p>
        </div>

        {/* Recommendation */}
        <div className="rounded-lg bg-blue-950/30 border border-blue-800/40 p-3">
          <div className="text-xs text-blue-400 font-mono mb-1 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Recommandation
          </div>
          <p className="text-gray-200">{moment.recommendation}</p>
        </div>

        {/* Cosmos Club Action */}
        {moment.cosmosClubAction && (
          <div className="rounded-lg bg-purple-950/30 border border-purple-800/40 p-3">
            <div className="text-xs text-purple-400 font-mono mb-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Cosmos Club
            </div>
            <p className="text-gray-200">{moment.cosmosClubAction}</p>
          </div>
        )}

        {/* Linked Signage */}
        {moment.signageItems.length > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 font-mono mb-2">Signalétique liée</div>
            <div className="flex flex-wrap gap-1">
              {moment.signageItems.map((sid) => (
                <span
                  key={sid}
                  className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 font-mono"
                >
                  {sid}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function Vol3Module() {
  const navigate = useNavigate()
  const store = useVol3Store()

  // ── Hydrate from Supabase on mount ───────────────────────
  useEffect(() => {
    void store.hydrateFromSupabase('cosmos-angre')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveStatus: SaveStatus = store.isHydrating ? 'saving' : store.hydrationError ? 'offline' : 'saved'

  const {
    floors,
    activeFloorId,
    zones,
    pois,
    signageItems,
    moments,
    currentPath,
    visitorProfiles,
    activeProfileId,
    showSignage,
    showWayfinding,
    showHeatmap,
    showMoments,
    showPmrOnly,
    chatMessages,
    selectedEntityId,
    selectedEntityType,
    libraryOpen,
  } = store

  const [chatInput, setChatInput] = useState('')
  const [activeTab, setActiveTab] = useState<Vol3Tab>('intro')
  const [heatmapHour, setHeatmapHour] = useState(14) // default 2pm

  // ── Sidebar accordion state ─────────────────────────────
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vue: true,
    journeymap: true,
    personas: true,
    touchpoints: true,
    kpis: true,
    action: true,
    signaletique_page: true,
    studio: false,
  })

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'2d' | '3d-advanced'>('2d')

  // ── Placement tools ──
  type PlaceTool = null | 'poi' | 'signage'
  const [placeTool, setPlaceTool] = useState<PlaceTool>(null)

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (!placeTool) return
    const id = `${placeTool}-${Date.now()}`
    if (placeTool === 'poi') {
      store.addPoi({
        id, floorId: activeFloorId, label: `POI ${pois.length + 1}`,
        type: 'enseigne', x, y, pmr: true, color: '#22c55e', icon: 'store',
      })
      store.selectEntity(id, 'poi')
    }
    setPlaceTool(null)
  }, [placeTool, activeFloorId, pois.length, store])

  const handleEntityDelete = useCallback((id: string) => {
    if (selectedEntityType === 'poi') store.deletePoi(id)
    else if (selectedEntityType === 'signage') store.deleteSignageItem(id)
    store.selectEntity(null, null)
  }, [selectedEntityType, store])
  const [showReplay, setShowReplay] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [geoNotifications, setGeoNotifications] = useState<GeoNotification[]>([
    {
      id: 'gn-1',
      zoneId: 'zone-rdc-commerce-01',
      zoneName: 'Galerie Marchande',
      triggerRadius: 15,
      message: 'Bienvenue ! -15% sur votre prochain achat avec Cosmos Club',
      type: 'cosmos_club',
      cosmosClubPoints: 50,
      active: true,
    },
    {
      id: 'gn-2',
      zoneId: 'zone-rdc-restau-01',
      zoneName: 'Food Court',
      triggerRadius: 10,
      message: 'Decouvrez notre menu du jour a la carte !',
      type: 'promo',
      active: true,
    },
  ])

  // ── Derived data ──────────────────────────────────────────

  const activeFloor = useMemo(
    () => floors.find((f) => f.id === activeFloorId) ?? floors[0],
    [floors, activeFloorId],
  )

  const floorPois = useMemo(() => {
    let filtered = pois.filter((p) => p.floorId === activeFloorId)
    if (showPmrOnly) filtered = filtered.filter((p) => p.pmr)
    return filtered
  }, [pois, activeFloorId, showPmrOnly])

  const floorSignage = useMemo(
    () => (showSignage ? signageItems.filter((s) => s.floorId === activeFloorId) : []),
    [signageItems, activeFloorId, showSignage],
  )

  const floorMoments = useMemo(
    () => (showMoments ? moments.filter((m) => m.floorId === activeFloorId) : []),
    [moments, activeFloorId, showMoments],
  )

  const floorZones = useMemo(
    () => zones.filter((z) => z.floorId === activeFloorId),
    [zones, activeFloorId],
  )

  const selectedMoment = useMemo(
    () =>
      selectedEntityType === 'moment'
        ? moments.find((m) => m.id === selectedEntityId) ?? null
        : null,
    [moments, selectedEntityId, selectedEntityType],
  )

  const selectedPoi = useMemo(
    () =>
      selectedEntityType === 'poi'
        ? pois.find((p) => p.id === selectedEntityId) ?? null
        : null,
    [pois, selectedEntityId, selectedEntityType],
  )

  const selectedSignage = useMemo(
    () =>
      selectedEntityType === 'signage'
        ? signageItems.find((s) => s.id === selectedEntityId) ?? null
        : null,
    [signageItems, selectedEntityId, selectedEntityType],
  )

  const activeProfile = useMemo(
    () => visitorProfiles.find((p) => p.id === activeProfileId) ?? null,
    [visitorProfiles, activeProfileId],
  )

  const momentsProgress = useMemo(() => {
    const withSignage = moments.filter((m) => m.signageItems.length > 0).length
    return { total: moments.length, addressed: withSignage }
  }, [moments])

  // ── Heatmap zone data ─────────────────────────────────────

  const heatZoneData = useMemo<ZoneHeatData[]>(() => {
    if (!showHeatmap) return []
    const baseScores: Record<string, number> = {
      commerce: 0.65, restauration: 0.75, circulation: 0.50, parking: 0.30,
      loisirs: 0.70, services: 0.45, sortie_secours: 0.10, technique: 0.05,
      backoffice: 0.08, financier: 0.15, hotel: 0.40, bureaux: 0.25, exterieur: 0.35,
    }
    const peakHours: Record<string, number> = {
      commerce: 15, restauration: 12, circulation: 14, parking: 10,
      loisirs: 16, services: 11, sortie_secours: 18, technique: 9,
      backoffice: 10, financier: 10, hotel: 20, bureaux: 9, exterieur: 17,
    }
    return floorZones.map(z => ({
      zoneId: z.id,
      x: z.x,
      y: z.y,
      w: z.w,
      h: z.h,
      label: z.label,
      dwellTime: Math.round((baseScores[z.type] ?? 0.3) * 600 + Math.random() * 120),
      visitFrequency: Math.round((baseScores[z.type] ?? 0.3) * 80 + Math.random() * 20),
      peakHour: peakHours[z.type] ?? 14,
      congestionScore: Math.min(1, (baseScores[z.type] ?? 0.3) + (Math.random() - 0.5) * 0.15),
    }))
  }, [floorZones, showHeatmap])

  // ── Visit replay mock data ────────────────────────────────

  const replayPaths = useMemo<VisitPath[]>(() => {
    if (!showReplay || floorZones.length < 3) return []
    const shuffled = [...floorZones].sort(() => Math.random() - 0.5)
    const makeSteps = (zones: typeof floorZones) => {
      let t = 0
      return zones.map(z => {
        const dur = 60 + Math.random() * 240
        const step = {
          zoneId: z.id, zoneName: z.label, zoneColor: z.color,
          x: z.x + z.w / 2, y: z.y + z.h / 2,
          enteredAt: t, exitedAt: t + dur,
        }
        t += dur + 15 // 15s transit
        return { step, endTime: t }
      })
    }
    const familySteps = makeSteps(shuffled.slice(0, Math.min(6, shuffled.length)))
    const vipSteps = makeSteps([...floorZones].sort(() => Math.random() - 0.5).slice(0, Math.min(4, floorZones.length)))
    return [
      {
        id: 'replay-famille',
        profileName: 'Famille',
        profileColor: '#34D399',
        steps: familySteps.map(s => s.step),
        totalDuration: familySteps[familySteps.length - 1]?.endTime ?? 300,
      },
      {
        id: 'replay-vip',
        profileName: 'VIP',
        profileColor: '#A855F7',
        steps: vipSteps.map(s => s.step),
        totalDuration: vipSteps[vipSteps.length - 1]?.endTime ?? 300,
      },
    ]
  }, [showReplay, floorZones])

  // ── Geo-notification handlers ─────────────────────────────

  const handleAddNotification = useCallback((notif: Omit<GeoNotification, 'id'>) => {
    setGeoNotifications(prev => [...prev, { ...notif, id: `gn-${Date.now()}` }])
  }, [])

  const handleToggleNotification = useCallback((id: string) => {
    setGeoNotifications(prev => prev.map(n => n.id === id ? { ...n, active: !n.active } : n))
  }, [])

  const handleDeleteNotification = useCallback((id: string) => {
    setGeoNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // ── Handlers ──────────────────────────────────────────────

  const handleSelectEntity = useCallback(
    (id: string | null, type: 'poi' | 'signage' | 'moment' | null) => {
      store.selectEntity(id, type)
    },
    [store],
  )

  const handleSendChat = useCallback(() => {
    const text = chatInput.trim()
    if (!text) return

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    store.addChatMessage(userMsg)
    setChatInput('')

    // Mock Proph3t response after 500ms
    setTimeout(() => {
      const reply: ChatMessage = {
        id: uid(),
        role: 'proph3t',
        content: `Analyse en cours pour "${text}"... En tant qu'expert parcours client, je recommande de vérifier les 7 moments-clés du parcours visiteur et d'optimiser la signalétique directionnelle aux points de friction identifiés.`,
        timestamp: new Date().toISOString(),
        references: ['NF P96-105', 'ISO 7001'],
      }
      store.addChatMessage(reply)
    }, 500)
  }, [chatInput, store])

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendChat()
      }
    },
    [handleSendChat],
  )

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-surface-0 text-white overflow-hidden">
      {/* ═══ Header ═══ */}
      <header className="flex-none h-14 border-b border-white/[0.04] bg-surface-1/80 backdrop-blur-md flex items-center px-4 gap-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/projects/cosmos-angre')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Vol.3 — Parcours Client</h1>
            <p className="text-[10px] text-gray-500">Cosmos Angré</p>
          </div>
        </div>

        {/* Floor tabs — only shown when plan is active */}
        {activeTab === 'plan' && (
          <div className="flex items-center gap-1 ml-6">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => store.setActiveFloor(f.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  f.id === activeFloorId
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {f.level}
              </button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        {activeTab === 'plan' && (
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5 mr-3">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '2d'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d-advanced')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '3d-advanced'
                  ? 'bg-purple-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Vue 3D avancée : Isométrique, Perspective, Semi-réaliste"
            >
              <Box className="w-3 h-3" />
              3D
            </button>
          </div>
        )}

        {/* Profile selector — only shown when plan is active */}
        {activeTab === 'plan' && (
          <div className="relative">
            <select
              value={activeProfileId ?? ''}
              onChange={(e) => store.setActiveProfile(e.target.value || null)}
              className="appearance-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 pr-7 text-xs text-gray-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Tous profils</option>
              {visitorProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.pmrRequired ? ' (PMR)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Proph3t badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/8 border border-purple-500/15">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-semibold text-purple-300/80">Proph3t</span>
        </div>
      </header>

      {/* ═══ Main body ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ── Sidebar navigation — always visible ──────────── */}
        <aside className="flex-none w-60 border-r border-white/[0.04] bg-surface-1 overflow-y-auto">
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
            <div className="text-[12px] font-bold text-white tracking-tight">Cosmos Angré</div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5 tracking-wider">VOL. 3 — PARCOURS CLIENT</div>
          </div>

          {/* Navigation groups */}
          <nav className="py-2 px-2">
            {NAV_GROUPS.map((group) => {
              const groupAccent = group.color

              return (
                <div key={group.key}>
                  {group.separator && <div className="divider mx-1" />}

                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-2 py-2 cursor-pointer rounded-lg hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <div className="w-0.5 h-3.5 rounded-full flex-none" style={{ background: group.color, opacity: 0.5 }} />
                    <group.icon className="w-3 h-3 flex-none" style={{ color: group.color, opacity: 0.7 }} />
                    <span className="text-[10px] font-semibold tracking-[0.1em] flex-1 text-left text-gray-500">
                      {group.label}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform duration-200 ${openGroups[group.key] ? '' : '-rotate-90'}`} />
                  </button>

                  {/* Group items with smooth transition */}
                  <div className={`overflow-hidden transition-all duration-200 ${openGroups[group.key] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pb-1 pl-1">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-2.5 pl-4 pr-3 py-[7px] rounded-lg text-left transition-all duration-150 ${
                              isActive
                                ? 'bg-white/[0.06] text-white'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                            }`}
                            style={isActive ? { boxShadow: `inset 2px 0 0 ${groupAccent}` } : undefined}
                          >
                            <item.icon className="w-3.5 h-3.5 flex-none" style={isActive ? { color: groupAccent } : undefined} />
                            <span className="text-[11px] font-medium truncate">{item.label}</span>
                            {item.dot && (
                              <span className="glow-dot flex-none ml-auto" style={{ background: '#f59e0b' }} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Save status */}
          <div className="px-4 py-2 border-t border-white/[0.04]">
            <SaveStatusIndicator status={saveStatus} />
          </div>
        </aside>

        {/* ── Content area ─────────────────────────────────── */}
        {activeTab === 'plan' ? (<>
        {/* ── Left sidebar (toolbar) ────────────────────────── */}
        <aside className="w-12 border-r border-white/[0.04] bg-surface-1/50 flex flex-col items-center py-3 gap-2 shrink-0">
          {/* PLACEMENT TOOLS */}
          <div className="text-[8px] text-gray-600 font-mono mb-0.5">PLACER</div>
          <ToolbarButton
            icon={MapPin}
            label="+ POI"
            active={placeTool === 'poi'}
            onClick={() => setPlaceTool(placeTool === 'poi' ? null : 'poi')}
            activeColor="text-emerald-400"
          />

          <div className="w-6 h-px bg-gray-800 my-0.5" />
          <div className="text-[8px] text-gray-600 font-mono mb-0.5">VUE</div>

          <ToolbarButton
            icon={Signpost}
            label="Signalétique"
            active={showSignage}
            onClick={() => store.toggleSignage()}
            activeColor="text-amber-400"
          />
          <ToolbarButton
            icon={Route}
            label="Wayfinding"
            active={showWayfinding}
            onClick={() => store.toggleWayfinding()}
            activeColor="text-emerald-400"
          />
          <ToolbarButton
            icon={Flame}
            label="Heatmap"
            active={showHeatmap}
            onClick={() => store.toggleHeatmap()}
            activeColor="text-red-400"
          />
          <ToolbarButton
            icon={MapPin}
            label="Moments"
            active={showMoments}
            onClick={() => store.toggleMoments()}
            activeColor="text-blue-400"
          />
          <ToolbarButton
            icon={Accessibility}
            label="PMR"
            active={showPmrOnly}
            onClick={() => store.togglePmrOnly()}
            activeColor="text-cyan-400"
          />

          <div className="w-8 border-t border-gray-800 my-1" />

          <ToolbarButton
            icon={PlayCircle}
            label="Replay"
            active={showReplay}
            onClick={() => setShowReplay(!showReplay)}
            activeColor="text-emerald-400"
          />
          <ToolbarButton
            icon={Bell}
            label="Notifs"
            active={showNotifPanel}
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            activeColor="text-amber-400"
          />

          <div className="flex-1" />

          <ToolbarButton
            icon={Library}
            label="Bibliothèque"
            active={libraryOpen}
            onClick={() => store.setLibraryOpen(!libraryOpen)}
            activeColor="text-purple-400"
          />
        </aside>

        {/* ── Center: Floor Plan Canvas / 3D ── */}
        <main className="flex-1 relative overflow-hidden bg-gray-900/50">
          {viewMode === '3d-advanced' ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-950">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement Vue 3D avancée...
                </div>
              </div>
            }>
              <Vol3DModuleEmbed />
            </Suspense>
          ) : (<>
          {/* Placement indicator */}
          {placeTool && (
            <div className="absolute top-3 left-3 z-20 bg-emerald-900/90 border border-emerald-500/40 text-emerald-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
              <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-400" />
              Cliquez sur le plan pour placer un POI
              <button onClick={() => setPlaceTool(null)} className="ml-2 text-emerald-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <FloorPlanCanvas
            floor={activeFloor}
            zones={floorZones}
            showHeatmap={showHeatmap}
            onCanvasClick={placeTool ? handleCanvasClick : undefined}
            cursorMode={placeTool ? 'place' : 'select'}
            planImageUrl={store.planImageUrls?.[activeFloorId] || usePlanImportStore.getState().getActivePlanUrl(activeFloorId)}
            heatmapContent={
              showHeatmap && heatZoneData.length > 0 ? (
                <HeatmapOverlay
                  data={heatZoneData}
                  scale={CANVAS_SCALE}
                  hour={heatmapHour}
                  onZoneClick={(id) => handleSelectEntity(id, 'zone' as any)}
                />
              ) : undefined
            }
          >
            {/* Zones are rendered by FloorPlanCanvas; we add overlays here */}

            {/* POI Markers */}
            {floorPois.map((poi) => (
              <g
                key={poi.id}
                transform={`translate(${poi.x}, ${poi.y})`}
                onClick={() => handleSelectEntity(poi.id, 'poi')}
                className="cursor-pointer"
              >
                <circle
                  r={3.5}
                  fill={poi.color}
                  stroke={selectedEntityId === poi.id ? '#10B981' : '#1F2937'}
                  strokeWidth={selectedEntityId === poi.id ? 1.2 : 0.6}
                  opacity={0.9}
                />
                <text
                  y={0.8}
                  textAnchor="middle"
                  fill="white"
                  fontSize={2.2}
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {iconAbbrev(poi.icon)}
                </text>
                {/* Label on hover area */}
                <title>{poi.label}</title>
              </g>
            ))}

            {/* Signage Items (diamond / rotated squares) */}
            {floorSignage.map((sig) => {
              const col = signageColor(sig.type)
              return (
                <g
                  key={sig.id}
                  transform={`translate(${sig.x}, ${sig.y})`}
                  onClick={() => handleSelectEntity(sig.id, 'signage')}
                  className="cursor-pointer"
                >
                  <rect
                    x={-2.5}
                    y={-2.5}
                    width={5}
                    height={5}
                    fill={col}
                    stroke={selectedEntityId === sig.id ? '#10B981' : '#1F2937'}
                    strokeWidth={selectedEntityId === sig.id ? 1.2 : 0.5}
                    transform="rotate(45)"
                    opacity={0.85}
                  />
                  <text
                    y={0.8}
                    textAnchor="middle"
                    fill="white"
                    fontSize={2}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                  >
                    S
                  </text>
                  <title>{sig.ref} — {sig.content ?? sig.type}</title>
                </g>
              )
            })}

            {/* Moment Badges (numbered circles 1-7) + dashed journey lines */}
            {floorMoments.length > 0 && (
              <g>
                {/* Dashed lines connecting moments in order */}
                {floorMoments
                  .sort((a, b) => a.number - b.number)
                  .map((m, i, arr) => {
                    if (i === 0) return null
                    const prev = arr[i - 1]
                    return (
                      <line
                        key={`journey-${prev.id}-${m.id}`}
                        x1={prev.x}
                        y1={prev.y}
                        x2={m.x}
                        y2={m.y}
                        stroke="#10B981"
                        strokeWidth={0.8}
                        strokeDasharray="3 2"
                        opacity={0.5}
                      />
                    )
                  })}

                {/* Moment circles */}
                {floorMoments.map((m) => (
                  <g
                    key={m.id}
                    transform={`translate(${m.x}, ${m.y})`}
                    onClick={() => handleSelectEntity(m.id, 'moment')}
                    className="cursor-pointer"
                  >
                    <circle
                      r={5}
                      fill={selectedEntityId === m.id ? '#059669' : '#065F46'}
                      stroke={selectedEntityId === m.id ? '#34D399' : '#10B981'}
                      strokeWidth={selectedEntityId === m.id ? 1.5 : 0.8}
                      opacity={0.9}
                    />
                    <text
                      y={1.2}
                      textAnchor="middle"
                      fill="white"
                      fontSize={4}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {m.number}
                    </text>
                    <title>
                      Moment {m.number}: {m.name}
                    </title>
                  </g>
                ))}
              </g>
            )}

            {/* Wayfinding Path Overlay */}
            {showWayfinding && currentPath && currentPath.path.length > 1 && (
              <g>
                <polyline
                  points={currentPath.path
                    .map((n) => `${n.x},${n.y}`)
                    .join(' ')}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
                {/* Start marker */}
                <circle
                  cx={currentPath.path[0].x}
                  cy={currentPath.path[0].y}
                  r={2.5}
                  fill="#34D399"
                  stroke="white"
                  strokeWidth={0.5}
                />
                {/* End marker */}
                <circle
                  cx={currentPath.path[currentPath.path.length - 1].x}
                  cy={currentPath.path[currentPath.path.length - 1].y}
                  r={2.5}
                  fill="#F59E0B"
                  stroke="white"
                  strokeWidth={0.5}
                />
              </g>
            )}

            {/* Visit Replay overlay */}
            {showReplay && replayPaths.length > 0 && (
              <VisitReplay
                paths={replayPaths}
                scale={CANVAS_SCALE}
              />
            )}
          </FloorPlanCanvas>

          {/* Heatmap hour slider overlay */}
          {showHeatmap && (
            <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-xl px-4 py-3 backdrop-blur-sm w-56">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400">Heure</span>
                <span className="text-xs font-mono text-orange-300">{heatmapHour}h00</span>
              </div>
              <input
                type="range"
                min={6}
                max={22}
                value={heatmapHour}
                onChange={e => setHeatmapHour(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>6h</span>
                <span>14h</span>
                <span>22h</span>
              </div>
            </div>
          )}

          {/* Active profile info overlay */}
          {activeProfile && (
            <div className="absolute top-3 left-3 bg-gray-900/90 border border-emerald-800/40 rounded-lg px-3 py-2 text-xs backdrop-blur-sm">
              <span className="text-emerald-400 font-semibold">{activeProfile.name}</span>
              <span className="text-gray-500 ml-2">
                Vitesse {activeProfile.speed}x &middot; Dwell {activeProfile.dwellMultiplier}x
                {activeProfile.pmrRequired && ' · PMR'}
              </span>
            </div>
          )}
          </>)}
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0 overflow-hidden">
          {/* Geo-notification panel */}
          {showNotifPanel && (
            <div className="border-b border-gray-800 p-3 max-h-[50%] overflow-y-auto">
              <GeoNotificationPanel
                notifications={geoNotifications}
                onAdd={handleAddNotification}
                onToggle={handleToggleNotification}
                onDelete={handleDeleteNotification}
                zones={floorZones.map(z => ({ id: z.id, label: z.label }))}
              />
            </div>
          )}

          {selectedMoment ? (
            <MomentDetail
              moment={selectedMoment}
              onClose={() => handleSelectEntity(null, null)}
            />
          ) : selectedPoi || selectedSignage ? (
            <EntityPanel
              entity={selectedPoi ?? selectedSignage!}
              entityType={selectedEntityType!}
              onClose={() => handleSelectEntity(null, null)}
            />
          ) : (
            /* Default: Proph3t Chat */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
                <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-purple-300">
                  Proph3t — Parcours Client
                </h3>
              </div>

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-xs text-gray-600 text-center mt-8">
                    Posez une question sur le parcours client, la signalétique ou le wayfinding...
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-emerald-900/30 border border-emerald-800/30 text-gray-200 ml-6'
                        : 'bg-purple-900/20 border border-purple-800/30 text-gray-300 mr-6'
                    }`}
                  >
                    {msg.role === 'proph3t' && (
                      <div className="text-[10px] text-purple-500 font-mono mb-1">Proph3t</div>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    {msg.references && msg.references.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {msg.references.map((r) => (
                          <span
                            key={r}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 font-mono"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat input */}
              <div className="border-t border-gray-800 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Question sur le parcours..."
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
        </>) : (
          /* ── Non-plan sections: full-width content ── */
          <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: '#080c14' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}>
              {activeTab === 'intro' && <IntroSectionLazy />}
              {activeTab === 'journeymap' && <JourneyMapSectionLazy />}
              {activeTab === 'parcoursvisuel' && <SwimlaneSectionLazy />}
              {activeTab === 'swimlane' && <SwimlaneSectionLazy />}
              {activeTab === 'personas' && <PersonasGridLazy />}
              {activeTab === 'awa_moussa' && <PersonaDetailLazy personaId="awa_moussa" />}
              {activeTab === 'serge' && <PersonaDetailLazy personaId="serge" />}
              {activeTab === 'pamela' && <PersonaDetailLazy personaId="pamela" />}
              {activeTab === 'aminata' && <PersonaDetailLazy personaId="aminata" />}
              {activeTab === 'touchpoints' && <TouchpointsMatrixLazy />}
              {activeTab === 'kpis' && <KpiDashboardLazy />}
              {activeTab === 'action' && <PlanActionLazy />}
              {activeTab === 'signaletique_page' && <SignaletiquePageLazy />}
              {activeTab === 'parcours' && <ParcoursSectionLazy />}
              {activeTab === 'wayfinding' && <WayfindingSectionLazy />}
              {activeTab === 'signaletique' && <SignaleticsSectionLazy />}
              {activeTab === 'heatmap' && <HeatmapSectionLazy />}
              {activeTab === 'rapport' && <RapportSectionLazy />}
              {activeTab === 'chat' && <ChatSectionLazy />}
              {activeTab === 'exp_dashboard' && <ExperienceDashboardLazy />}
              {activeTab === 'action_tracker' && <ActionTrackerLazy />}
              {activeTab === 'signa_tracker' && <SignaletiquTrackerLazy />}
              {activeTab === 'touch_tracker' && <TouchpointTrackerLazy />}
              {activeTab === 'feedbacks' && <FeedbackModuleLazy />}
              {activeTab === 'dwell_time' && <DwellTimeOptimizerLazy />}
              {activeTab === 'revenue_predictor' && <RevenuePredictorLazy />}
              {activeTab === 'seasonal' && <SeasonalPlanningLazy />}
              {activeTab === 'tenant_mix_validator' && <TenantMixValidatorLazy />}
              {activeTab === 'plan_imports' && (
                <PlanImportsSectionLazy
                  volumeColor="#34d399"
                  volumeLabel="VOL. 3 — PARCOURS CLIENT"
                  floors={floors}
                  activeFloorId={activeFloorId}
                  onImportComplete={(importedZones, _dims, _calibration, floorId) => {
                    const current = useVol3Store.getState().zones
                    const newZones = importedZones.map((z, i) => ({
                      id: z.id ?? `import-${Date.now()}-${i}`,
                      floorId: z.floorId ?? floorId,
                      label: z.label ?? `Zone ${i + 1}`,
                      type: (z.type ?? 'commerce') as any,
                      x: z.x ?? 0, y: z.y ?? 0, w: z.w ?? 0.1, h: z.h ?? 0.1,
                      niveau: (z.niveau ?? 2) as any,
                      color: z.color ?? '#0a2a15',
                    }))
                    useVol3Store.setState({ zones: [...current, ...newZones] })
                  }}
                />
              )}
            </Suspense>
          </main>
        )}
      </div>

      {/* ═══ Bottom Bar ═══ */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm text-xs text-gray-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-emerald-400 font-semibold">{floorPois.length}</span> POI
            {floorPois.length !== 1 && 's'}
          </span>
          <span className="w-px h-3 bg-gray-800" />
          <span>
            <span className="text-amber-400 font-semibold">{floorSignage.length}</span> signalétique
          </span>
          <span className="w-px h-3 bg-gray-800" />
          <span>
            Moments{' '}
            <span className="text-blue-400 font-semibold">
              {momentsProgress.addressed}/{momentsProgress.total}
            </span>{' '}
            adressés
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeProfile && (
            <span className="text-gray-600">
              Profil: <span className="text-gray-400">{activeProfile.name}</span>
            </span>
          )}
          <span className="text-gray-600">
            Étage: <span className="text-gray-400">{activeFloor?.level ?? '—'}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
