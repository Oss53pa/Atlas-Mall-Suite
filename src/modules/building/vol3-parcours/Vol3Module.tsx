// ═══ VOL.3 PARCOURS CLIENT — Main Module ═══

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense
} from 'react'
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
  X,
  Loader2,
  Bell,
  PlayCircle
} from 'lucide-react'
import { useVol3Store } from './store/vol3Store'
import { usePlanImportStore } from '../shared/stores/planImportStore'
import { ATLAS_STUDIO_DEFAULT_TAB } from '../shared/components/atlasStudioNav'
import FloorPlanCanvas, { CANVAS_SCALE } from '../shared/components/FloorPlanCanvas'
import { ConsolidatedReportButton } from '../shared/components/ConsolidatedReportButton'
import { DetailedJourneyReport } from '../shared/components/DetailedJourneyReport'
import { PlanCleaningPanel } from '../shared/components/PlanCleaningPanel'
import { SignageBudgetPanel } from '../shared/components/SignageBudgetPanel'
import { PmrAnalysisPanel } from '../shared/components/PmrAnalysisPanel'
import { AbmSimulationPanel } from '../shared/components/AbmSimulationPanel'
import type { AbmResult, TimeSlot } from '../shared/engines/plan-analysis/abmSocialForceEngine'
import { exportWayfindingJSON } from '../shared/engines/plan-analysis/navGraphEngine'
// signageExportEngine (exceljs ~350kB gzip) + pdfReportEngine (jspdf ~150kB gzip)
// sont lazy-loadés à la demande → bundle initial allégé ~500 kB gzip.
import { PovGuideViewer } from '../shared/components/PovGuideViewer'
import { QrLabelsExport } from '../shared/components/QrLabelsExport'
import { SignageFeedbackInbox } from '../shared/components/SignageFeedbackInbox'
import { SignageMemoryPanel } from '../shared/components/SignageMemoryPanel'
import type { FlowAnalysisResult } from '../shared/engines/plan-analysis/flowPathEngine'

// F-004 : overlays + downloadBlob + Proph3tPanel extraits dans components/Vol3Overlays.tsx
import {
  Vol3ProphJourneysMount,
  Vol3AbmHeatmapMount,
  Vol3FlowPathsMount,
  Vol3SpaceInfoMount,
  Vol3Proph3tPanel,
  downloadBlob
} from './components/Vol3Overlays'
import { PlanCanvasV2 } from '../shared/components/PlanCanvasV2'
import { PlanLayerSelector } from '../shared/components/PlanLayerSelector'
import { usePlanEngineStore } from '../shared/stores/planEngineStore'
import { buildParsedPlanFromImport } from '../shared/planReader/planBridge'
import { savePlanImageFromUrl, loadAllPlanImages } from '../shared/stores/planImageCache'
const Vol3DModuleEmbed = lazy(() => import('../vol-3d/Vol3DModule'))
import EntityPanel from '../shared/components/EntityPanel'
import ToolbarButton from '../shared/components/ToolbarButton'
import { type SaveStatus } from '../shared/components/SaveStatusIndicator'
import { useActiveProjectId } from '../../../hooks/useActiveProject'
import HeatmapOverlay, { type ZoneHeatData } from './components/HeatmapOverlay'
import GeoNotificationPanel, { type GeoNotification } from './components/GeoNotificationPanel'
import VisitReplay, { type VisitPath } from './components/VisitReplay'
import type { ChatMessage } from '../shared/proph3t/types'

// F-004 : 26 lazy imports deplaces dans sections/Vol3NonPlanRouter.tsx
// Conserves ici uniquement ceux utilises inline dans Vol3Module (branch 'plan').
const PlanImportsSectionLazy = lazy(() => import('../shared/components/PlanImportsSection'))

// Router des sections non-plan (routing `activeTab` hors `plan`).
import { Vol3NonPlanRouter } from './sections/Vol3NonPlanRouter'
// Sidebar navigation (F-004).
import { Vol3Sidebar } from './components/Vol3Sidebar'
// Footer (F-004).
import { Vol3Footer } from './components/Vol3Footer'
// Plan toolbar (F-004).
import { Vol3PlanToolbar } from './components/Vol3PlanToolbar'

// F-004 : Vol3Tab + NavItem/NavGroup + buildNavGroups extraits dans sidebarConfig.tsx
import { type Vol3Tab, buildNavGroups } from './sidebarConfig'
import { useAutoSnapshot } from '../shared/hooks/useAutoSnapshot'

// F-004 : helpers iconAbbrev / signageColor / uid extraits dans ./helpers.ts
import { iconAbbrev, signageColor, uid } from './helpers'

// ─── Moment Detail Sub-Panel ──────────────────────────────────

// F-004 : MomentDetail extrait dans components/MomentDetail.tsx
import { MomentDetail } from './components/MomentDetail'

// ─── Main Component ───────────────────────────────────────────

export default function Vol3Module() {
  const navigate = useNavigate()
  const store = useVol3Store()
  // Build once per mount — reads the cross-chunk ATLAS_STUDIO_GROUP_META
  // at render time, after all chunks have finished evaluating.
  const NAV_GROUPS = useMemo(() => buildNavGroups(), [])

  // ── Hydrate from Supabase on mount / project switch ──────
  const projectId = useActiveProjectId()
  useEffect(() => {
    void store.hydrateFromSupabase(projectId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Rehydrate plan image backgrounds from IndexedDB on mount — blob URLs in localStorage die on refresh.
  useEffect(() => {
    void loadAllPlanImages().then((urls) => {
      for (const [floorId, url] of Object.entries(urls)) {
        useVol3Store.getState().setPlanImageUrl(floorId, url)
      }
    })
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
  const [activeTab, setActiveTab] = useState<Vol3Tab>(ATLAS_STUDIO_DEFAULT_TAB as Vol3Tab)

  // Auto-snapshot : capture automatique des versions majeures
  useAutoSnapshot({ volumeId: 'vol3' })
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
  const [viewMode, setViewMode] = useState<'2d' | '3d' | '3d-advanced'>('2d')

  // ── PROPH3T parcours détaillés (calculés à la demande) ──
  const [proph3tJourneys, _setProph3tJourneys] = useState<import('../shared/engines/plan-analysis/detailedJourneyEngine').DetailedJourney[] | null>(null)
  const [_computingJourneys, _setComputingJourneys] = useState(false)

  // ── Flux entrées → sorties + signalétique (nouveau moteur principal) ──
  const [flowResult, setFlowResult] = useState<FlowAnalysisResult | null>(null)
  const [computingFlow, setComputingFlow] = useState(false)
  const [focusedEntrance, setFocusedEntrance] = useState<string | null>(null)

  // ── Overlay infos espaces (type + dimensions cliquables pour correction) ──
  const [showSpaceInfo, setShowSpaceInfo] = useState(false)

  // ── Mode gomme : clic sur une entite du plan → la masque individuellement ──
  const [eraseMode, setEraseMode] = useState(false)

  // ── Rapport détaillé parcours (modal) ──
  const [reportOpen, setReportOpen] = useState(false)

  // ── Panneau de nettoyage du plan (modal) ──
  const [cleaningOpen, setCleaningOpen] = useState(false)

  // ── Budget max de panneaux optionnels (hors ERP qui est non négociable) ──
  const [signageBudget, setSignageBudget] = useState(50)

  // ── Panneau configuration signalétique (budget + score cohérence) ──
  const [signageConfigOpen, setSignageConfigOpen] = useState(false)

  // ── Panneau PMR (analyse accessibilité + surbrillance) ──
  const [pmrPanelOpen, setPmrPanelOpen] = useState(false)
  const [highlightPmrNonCompliant, setHighlightPmrNonCompliant] = useState(false)

  // ── Simulation ABM Social Force (3 tranches horaires) ──
  const [abmPanelOpen, setAbmPanelOpen] = useState(false)
  const [abmResults, setAbmResults] = useState<Partial<Record<TimeSlot, AbmResult>>>({})
  const [activeAbmSlot, setActiveAbmSlot] = useState<TimeSlot | null>(null)

  // ── Visite guidée POV first-person ──
  const [povOpen, setPovOpen] = useState(false)

  // ── Signalétique : QR export, feedback inbox, mémoire inter-projets ──
  const [qrExportOpen, setQrExportOpen] = useState(false)
  const [feedbackInboxOpen, setFeedbackInboxOpen] = useState(false)
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(false)

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

  const _handleEntityDelete = useCallback((id: string) => {
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

  // Plan courant pour le panneau PROPH3T (abonnement réactif)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)

  // Synthétise des floors depuis parsedPlan si vol3Store.floors est vide
  const effectiveFloors = useMemo(() => {
    if (floors.length > 0) return floors
    if (parsedPlan?.detectedFloors && parsedPlan.detectedFloors.length > 0) {
      return parsedPlan.detectedFloors.map(f => ({
        id: f.id,
        projectId: 'cosmos-angre',
        level: f.label as any,
        order: f.stackOrder,
        widthM: f.bounds.width,
        heightM: f.bounds.height,
        zones: [],
        transitions: [],
      }))
    }
    if (parsedPlan) {
      return [{
        id: 'RDC',
        projectId: 'cosmos-angre',
        level: 'RDC' as any,
        order: 0,
        widthM: parsedPlan.bounds.width || 200,
        heightM: parsedPlan.bounds.height || 140,
        zones: [],
        transitions: [],
      }]
    }
    return floors
  }, [floors, parsedPlan])

  const activeFloor = useMemo(
    () => effectiveFloors.find((f) => f.id === activeFloorId) ?? effectiveFloors[0],
    [effectiveFloors, activeFloorId],
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

  // ── Handlers toolbar plan (F-004 : extraits pour Vol3PlanToolbar) ─────

  const handleComputeFlow = useCallback(async () => {
    if (!parsedPlan || computingFlow) return
    setComputingFlow(true)
    try {
      const { computeFlowPaths } = await import('../shared/engines/plan-analysis/flowPathEngine')
      const wallSegments = (parsedPlan.wallSegments ?? []).map(w => ({
        x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
      }))
      const result = computeFlowPaths({
        spaces: (parsedPlan.spaces ?? []).map(s => ({
          id: s.id, label: s.label, type: s.type,
          areaSqm: s.areaSqm, polygon: s.polygon as [number, number][],
          floorId: s.floorId,
        })),
        planWidth: parsedPlan.bounds.width || 200,
        planHeight: parsedPlan.bounds.height || 140,
        floorId: activeFloorId,
        wallSegments,
        signageBudget,
        erpMaxSpacingM: 30,
      })
      setFlowResult(result)
      setFocusedEntrance(null)
    } catch (err) {
      console.error('[PROPH3T Flux] failed', err)
    } finally {
      setComputingFlow(false)
    }
  }, [parsedPlan, computingFlow, activeFloorId, signageBudget])

  const handleExportWayfindingJson = useCallback(() => {
    if (!flowResult?.navGraph) return
    const json = exportWayfindingJSON(flowResult.navGraph)
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `wayfinding-${Date.now()}.json`)
  }, [flowResult])

  const handleExportCdcExcel = useCallback(async () => {
    if (!flowResult) return
    try {
      // Lazy-load : exceljs (~350 kB gzip) chargé uniquement à l'export
      const { exportSignageCDC } = await import('../shared/engines/plan-analysis/signageExportEngine')
      const blob = await exportSignageCDC(flowResult, 'The Mall', activeFloor?.level ?? 'RDC')
      downloadBlob(blob, `CDC-signaletique-${Date.now()}.xlsx`)
    } catch (err) {
      console.error('[Export Excel] failed:', err)
    }
  }, [flowResult, activeFloor])

  const handleExportDxf = useCallback(async () => {
    if (!parsedPlan) return
    try {
      const { exportCleanedDxf } = await import('../shared/engines/plan-analysis/signageExportEngine')
      const blob = exportCleanedDxf(parsedPlan, 'The Mall')
      downloadBlob(blob, `plan-nettoye-${Date.now()}.dxf`)
    } catch (err) {
      console.error('[Export DXF] failed:', err)
    }
  }, [parsedPlan])

  const handleExportPdfReport = useCallback(async () => {
    if (!flowResult || !parsedPlan) return
    try {
      // Lazy-load : jspdf (~150 kB gzip) chargé uniquement à l'export PDF
      const { generateSignagePdfReport } = await import('../shared/engines/plan-analysis/pdfReportEngine')
      const blob = await generateSignagePdfReport({
        flowResult,
        wallSegments: (parsedPlan.wallSegments ?? []).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })),
        spacePolygons: (parsedPlan.spaces ?? []).map(s => s.polygon as [number, number][]),
        planBounds: { width: parsedPlan.bounds.width || 200, height: parsedPlan.bounds.height || 140 },
        projectName: 'The Mall',
        floorLabel: activeFloor?.level ?? 'RDC',
        abmResults,
      })
      downloadBlob(blob, `rapport-parcours-${Date.now()}.pdf`)
    } catch (err) {
      console.error('[Rapport PDF] failed:', err)
    }
  }, [flowResult, parsedPlan, activeFloor, abmResults])

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
            <p className="text-[10px] text-gray-500">The Mall</p>
          </div>
        </div>

        {/* F-004 : toolbar plan extrait dans Vol3PlanToolbar */}
        <Vol3PlanToolbar
          activeTab={activeTab}
          floors={floors}
          activeFloorId={activeFloorId}
          onSetActiveFloor={(id) => store.setActiveFloor(id)}
          viewMode={viewMode}
          onSetViewMode={setViewMode}
          parsedPlan={parsedPlan}
          flowResult={flowResult as any}
          computingFlow={computingFlow}
          onComputeFlow={handleComputeFlow}
          onClearFlow={() => { setFlowResult(null); setFocusedEntrance(null) }}
          showSpaceInfo={showSpaceInfo}
          onToggleSpaceInfo={() => setShowSpaceInfo(v => !v)}
          eraseMode={eraseMode}
          onToggleEraseMode={() => setEraseMode(v => !v)}
          onOpenReport={() => setReportOpen(true)}
          onOpenCleaning={() => setCleaningOpen(true)}
          onOpenSignage={() => setSignageConfigOpen(true)}
          activeAbmSlot={activeAbmSlot}
          onOpenAbm={() => setAbmPanelOpen(true)}
          onOpenPmr={() => setPmrPanelOpen(true)}
          onExportWayfindingJson={handleExportWayfindingJson}
          onExportCdcExcel={handleExportCdcExcel}
          onExportDxf={handleExportDxf}
          onOpenPov={() => setPovOpen(true)}
          onOpenQrExport={() => setQrExportOpen(true)}
          projectId={projectId}
          onOpenFeedbackInbox={() => setFeedbackInboxOpen(true)}
          onOpenMemory={() => setMemoryPanelOpen(true)}
          onExportPdfReport={handleExportPdfReport}
          visitorProfiles={visitorProfiles}
          activeProfileId={activeProfileId}
          onSetActiveProfile={(id) => store.setActiveProfile(id)}
        />
        {/* Tous les boutons toolbar plan + profile selector + badge Proph3t
            sont desormais rendus par <Vol3PlanToolbar /> ci-dessus (F-004). */}
      </header>

      {/* ═══ Main body ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ── Sidebar navigation — F-004 : extraite dans Vol3Sidebar ── */}
        <Vol3Sidebar
          navGroups={NAV_GROUPS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
          saveStatus={saveStatus}
        />

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
            activeColor="text-atlas-400"
          />

          {/* Export PDF */}
          <button
            onClick={async () => {
              const parsedPlan = usePlanEngineStore.getState().parsedPlan
              if (!parsedPlan) {
                alert('Importer un plan avant d\'exporter.')
                return
              }
              const mod = await import('../shared/engines/parcoursEngine')
              const pw = parsedPlan.bounds.width || 200
              const ph = parsedPlan.bounds.height || 140
              const floorsList = (parsedPlan.detectedFloors ?? [{
                id: activeFloorId, label: activeFloor?.level ?? 'RDC',
                bounds: { minX: 0, minY: 0, maxX: pw, maxY: ph, width: pw, height: ph },
                entityCount: 0, stackOrder: 0,
              }]).map(f => ({ id: f.id, label: f.label, areaSqm: f.bounds.width * f.bounds.height }))

              const poisMetric = store.pois.map(p => ({
                id: p.id, floorId: p.floorId, label: p.label,
                x: p.x > 1 ? p.x : p.x * pw,
                y: p.y > 1 ? p.y : p.y * ph,
                category: p.icon, accessible: true,
              }))
              const sigsMetric = store.signageItems.map(s => ({
                id: s.id, floorId: s.floorId, ref: s.ref,
                x: s.x > 1 ? s.x : s.x * pw,
                y: s.y > 1 ? s.y : s.y * ph,
                type: s.type, content: s.content,
              }))
              const momentsMetric = store.moments.map(m => ({
                id: m.id, floorId: m.floorId, number: m.number, name: m.name,
                x: m.x > 1 ? m.x : m.x * pw,
                y: m.y > 1 ? m.y : m.y * ph,
              }))
              const spacesForEngine = parsedPlan.spaces.map(s => ({
                id: s.id, floorId: s.floorId, type: s.type,
                polygon: s.polygon, areaSqm: s.areaSqm, label: s.label,
              }))

              const report = mod.runParcoursAnalysis({
                pois: poisMetric, signage: sigsMetric, moments: momentsMetric,
                spaces: spacesForEngine, floors: floorsList,
              })
              const pdf = await mod.generateParcoursReportPDF({
                projectName: 'The Mall · Parcours Client',
                pois: poisMetric, signage: sigsMetric, moments: momentsMetric,
                floors: floorsList, report,
              })
              const url = URL.createObjectURL(pdf)
              const a = document.createElement('a')
              a.href = url
              a.download = `parcours-client-${new Date().toISOString().slice(0, 10)}.pdf`
              a.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}
            className="w-9 h-9 mt-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 flex items-center justify-center text-[10px]"
            title="Exporter rapport parcours PDF"
          >📄</button>
          <button
            onClick={async () => {
              const parsedPlan = usePlanEngineStore.getState().parsedPlan
              if (!parsedPlan) {
                alert('Importer un plan avant d\'exporter.')
                return
              }
              const mod = await import('../shared/engines/parcoursEngine')
              const pw = parsedPlan.bounds.width || 200
              const ph = parsedPlan.bounds.height || 140
              const csv = mod.generateParcoursCSV({
                pois: store.pois.map(p => ({
                  id: p.id, floorId: p.floorId, label: p.label,
                  x: p.x > 1 ? p.x : p.x * pw,
                  y: p.y > 1 ? p.y : p.y * ph,
                  category: p.icon, accessible: true,
                })),
                signage: store.signageItems.map(s => ({
                  id: s.id, floorId: s.floorId, ref: s.ref,
                  x: s.x > 1 ? s.x : s.x * pw,
                  y: s.y > 1 ? s.y : s.y * ph,
                  type: s.type, content: s.content,
                })),
                moments: store.moments.map(m => ({
                  id: m.id, floorId: m.floorId, number: m.number, name: m.name,
                  x: m.x > 1 ? m.x : m.x * pw,
                  y: m.y > 1 ? m.y : m.y * ph,
                })),
              })
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `parcours-client-${new Date().toISOString().slice(0, 10)}.csv`
              a.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}
            className="w-9 h-9 mt-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 flex items-center justify-center text-[10px]"
            title="Exporter nomenclature CSV"
          >📊</button>
          {/* M10 — Auto-placement signalétique */}
          <button
            onClick={async () => {
              if (!parsedPlan) { alert('Aucun plan chargé'); return }
              const { optimizeSignage } = await import('../shared/engines/signageOptimizer')
              const pw = parsedPlan.bounds.width || 200
              const ph = parsedPlan.bounds.height || 140
              const circulations = (parsedPlan.spaces ?? [])
                .filter(s => /circul|couloir|hall|mail|passage/i.test(String(s.type ?? '')))
                .map(s => ({ id: s.id, polygon: s.polygon as [number, number][], type: String(s.type ?? ''), areaSqm: s.areaSqm }))
              const poiInputs = floorPois.map(p => ({
                id: p.id, label: p.label,
                x: p.x > 1 ? p.x : p.x * pw,
                y: p.y > 1 ? p.y : p.y * ph,
                priority: (p.priority ?? 2) as 1 | 2 | 3,
              }))
              const res = optimizeSignage({
                circulations, pois: poiInputs,
                planBounds: { width: pw, height: ph },
                targetDensityPer100Sqm: 1,
                visibilityRadiusM: 15,
              })
              alert(`Signalétique: ${res.proposed.length} panneaux proposés · couverture circulation ${res.coveragePct.toFixed(1)}% · ${res.elapsedMs.toFixed(0)}ms`)
              console.log('[SignageOptim]', res)
            }}
            className="w-9 h-9 mt-1 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30 flex items-center justify-center text-[10px]"
            title="Auto-placement signalétique (nœuds de décision)"
          >🪧</button>
          {/* M25 — Rapport directeur consolidé */}
          <div className="mt-1">
            <ConsolidatedReportButton
              projectName="The Mall"
              orgName="Centre commercial · Abidjan"
              executiveNote="Généré depuis Vol.3 Parcours. Consolide Commercial + Sécurité + Parcours."
              className="w-full justify-center"
              buildAnalysisInput={async () => {
                if (!parsedPlan) return null
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                const scaleXY = (x: number, y: number) => ({
                  x: x > 1 ? x : x * pw,
                  y: y > 1 ? y : y * ph,
                })
                return {
                  floors: (parsedPlan.detectedFloors ?? [{ id: 'RDC', label: 'Rez-de-chaussée', bounds: { minX: 0, minY: 0, maxX: pw, maxY: ph, width: pw, height: ph }, stackOrder: 0 }]).map(f => ({
                    id: f.id, label: f.label, bounds: f.bounds, stackOrder: f.stackOrder,
                  })),
                  planBounds: { width: pw, height: ph },
                  cameras: [], doors: [],
                  commercialSpaces: (parsedPlan.spaces ?? []).map(s => ({
                    id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm,
                    floorId: s.floorId, polygon: s.polygon as [number, number][],
                  })),
                  tenants: [],
                  pois: floorPois.map(p => { const q = scaleXY(p.x, p.y); return { ...p, x: q.x, y: q.y } }),
                  signage: floorSignage.map(s => { const q = scaleXY(s.x, s.y); return { ...s, x: q.x, y: q.y } }),
                  moments: floorMoments.map(m => { const q = scaleXY(m.x, m.y); return { ...m, x: q.x, y: q.y } }),
                  spaces: (parsedPlan.spaces ?? []).map(s => ({
                    id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm,
                    polygon: s.polygon as [number, number][], floorId: s.floorId,
                  })),
                }
              }}
            />
          </div>
        </aside>

        {/* ── Center: Floor Plan Canvas / 3D ── */}
        <main className="flex-1 relative overflow-hidden bg-surface-1/50">
          {viewMode === '3d-advanced' ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-surface-0">
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

          {/* DIAGNOSTIC plan non chargé */}
          {!parsedPlan && (
            <div className="absolute top-3 right-3 z-20 px-3 py-2 rounded-lg bg-amber-900/80 border border-amber-500/40 text-amber-200 text-[10px]">
              ⚠ parsedPlan null — importez un DXF
            </div>
          )}

          {/* Sélecteur de plans superposés — multi-plans */}
          {parsedPlan && activeFloor && (
            <div className="absolute top-3 right-3 z-20">
              <PlanLayerSelector
                floorId={activeFloor.id}
                onPrimaryPlanChange={(url) => useVol3Store.getState().setPlanImageUrl(activeFloor.id, url)}
              />
            </div>
          )}

          {/* Overlay FLUX 2D (affiché UNIQUEMENT en mode 2D — en 3D les chemins
              sont rendus comme tubes Three.js directement dans la scène) */}
          {parsedPlan && flowResult && viewMode === '2d' && (
            <Vol3FlowPathsMount
              result={flowResult}
              focusedEntranceId={focusedEntrance}
              onFocusEntrance={setFocusedEntrance}
              planWidth={parsedPlan.bounds.width || 200}
              planHeight={parsedPlan.bounds.height || 140}
            />
          )}

          {/* Overlay HEATMAP ABM (2D uniquement — densité piétonne par tranche horaire) */}
          {parsedPlan && activeAbmSlot && abmResults[activeAbmSlot] && viewMode === '2d' && (
            <Vol3AbmHeatmapMount
              heatmap={abmResults[activeAbmSlot]!.heatmap}
              planWidth={parsedPlan.bounds.width || 200}
              planHeight={parsedPlan.bounds.height || 140}
            />
          )}

          {/* Overlay PROPH3T parcours détaillés (ancien, conservé pour compat) */}
          {parsedPlan && proph3tJourneys && proph3tJourneys.length > 0 && (
            <Vol3ProphJourneysMount
              journeys={proph3tJourneys}
              planWidth={parsedPlan.bounds.width || 200}
              planHeight={parsedPlan.bounds.height || 140}
            />
          )}

          {/* Overlay infos espaces (type + dimensions + clic = corriger labelisation) */}
          {parsedPlan && showSpaceInfo && (
            <Vol3SpaceInfoMount
              spaces={(parsedPlan.spaces ?? []).map(s => ({
                id: s.id, label: s.label, type: s.type,
                areaSqm: s.areaSqm, polygon: s.polygon as [number, number][],
                floorId: s.floorId,
              }))}
              planWidth={parsedPlan.bounds.width || 200}
              planHeight={parsedPlan.bounds.height || 140}
              floorId={activeFloorId}
            />
          )}

          {/* When a real plan is imported (parsedPlan exists), use PlanCanvasV2
              (abonnement réactif pour se re-render quand le plan arrive) */}
          {parsedPlan ? (
            (() => {
              const plan = parsedPlan
              const pw = plan.bounds.width || 200
              const ph = plan.bounds.height || 140
              const placeMode3D: 'poi' | 'signage' | 'moment' | null =
                placeTool === 'poi' ? 'poi' :
                placeTool === 'signage' ? 'signage' :
                placeTool === 'moment' ? 'moment' :
                null
              return (
                <PlanCanvasV2
                  plan={plan}
                  onCanvasClick={placeTool ? (x, y) => handleCanvasClick(x, y) : undefined}
                  viewMode={viewMode === '2d' ? '2d' : viewMode === '3d' ? '3d' : '3d-advanced'}
                  eraseMode={eraseMode}
                  overlayFloorId={activeFloorId}
                  pois={(() => {
                    const base = floorPois.map(p => ({
                      id: p.id, floorId: p.floorId, label: p.label,
                      x: p.x > 1 ? p.x : p.x * pw,
                      y: p.y > 1 ? p.y : p.y * ph,
                      icon: p.icon, color: p.color,
                    }))
                    // Ajoute les entrées / sorties / transits du flowResult comme POIs 3D
                    if (flowResult) {
                      for (const e of flowResult.entrances) base.push({
                        id: `flow-${e.id}`, floorId: e.floorId ?? activeFloorId,
                        label: e.label, x: e.x, y: e.y, icon: 'info', color: '#10b981',
                      } as any)
                      for (const e of flowResult.exits) base.push({
                        id: `flow-${e.id}`, floorId: e.floorId ?? activeFloorId,
                        label: e.label, x: e.x, y: e.y, icon: 'info', color: '#ef4444',
                      } as any)
                      for (const e of flowResult.transits) base.push({
                        id: `flow-${e.id}`, floorId: e.floorId ?? activeFloorId,
                        label: e.label, x: e.x, y: e.y, icon: 'info', color: '#60a5fa',
                      } as any)
                    }
                    return base
                  })()}
                  signage={(() => {
                    const base = floorSignage.map(s => ({
                      id: s.id, floorId: s.floorId, ref: s.ref,
                      x: s.x > 1 ? s.x : s.x * pw,
                      y: s.y > 1 ? s.y : s.y * ph,
                      type: s.type, content: s.content,
                    }))
                    // Injecte les panneaux recommandés par PROPH3T dans la scène 3D
                    if (flowResult) {
                      for (const s of flowResult.signage) {
                        const sigTypeMap: Record<string, 'directionnel' | 'identifiant' | 'info' | 'reglementaire'> = {
                          welcome: 'info',
                          directional: 'directionnel',
                          'you-are-here': 'identifiant',
                          information: 'info',
                          exit: 'reglementaire',
                        }
                        base.push({
                          id: `flow-sig-${s.id}`,
                          floorId: activeFloorId,
                          ref: s.type.toUpperCase(),
                          x: s.x, y: s.y,
                          type: sigTypeMap[s.type] ?? 'info',
                          content: s.suggestedContent[0] ?? s.reason,
                        } as any)
                      }
                    }
                    return base
                  })()}
                  moments={floorMoments.map(m => ({
                    id: m.id, floorId: m.floorId, number: m.number, name: m.name,
                    x: m.x > 1 ? m.x : m.x * pw,
                    y: m.y > 1 ? m.y : m.y * ph,
                  }))}
                  journeys={(() => {
                    // Priorité : si flowResult → chemins flux (colorés par paire)
                    if (flowResult && flowResult.paths.length > 0) {
                      // Même palette que l'overlay pour cohérence visuelle
                      const palette = [
                        '#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa',
                        '#fb7185', '#22d3ee', '#facc15', '#fb923c', '#c084fc',
                        '#4ade80', '#38bdf8', '#f59e0b', '#ec4899', '#a77d4c',
                        '#e11d48', '#06b6d4', '#eab308', '#ea580c', '#d946ef',
                      ]
                      const hash = (s: string) => {
                        let h = 0
                        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
                        return palette[Math.abs(h) % palette.length]
                      }
                      return flowResult.paths
                        .filter(p => !focusedEntrance || p.from.id === focusedEntrance)
                        .map(p => ({
                          id: p.id,
                          floorId: activeFloorId,
                          points: p.waypoints,
                          color: hash(`${p.from.id}→${p.to.id}`),
                        }))
                    }
                    // Fallback : parcours séquentiel des moments
                    return floorMoments.length > 1 ? [{
                      id: 'journey-default',
                      floorId: floorMoments[0]?.floorId ?? activeFloorId,
                      points: [...floorMoments].sort((a, b) => a.number - b.number).map(m => ({
                        x: m.x > 1 ? m.x : m.x * pw,
                        y: m.y > 1 ? m.y : m.y * ph,
                      })),
                      color: '#34d399',
                    }] : []
                  })()}
                  placeMode={placeMode3D}
                  onPlace={(kind, x, y, floorId) => {
                    const id = `${kind}-${Date.now()}`
                    if (kind === 'poi') {
                      store.addPoi({
                        id, floorId: floorId || activeFloorId,
                        label: `POI ${store.pois.length + 1}`,
                        x, y,
                        icon: 'info',
                        color: '#10b981',
                      } as unknown as Parameters<typeof store.addPoi>[0])
                    } else if (kind === 'signage') {
                      store.addSignageItem({
                        id, floorId: floorId || activeFloorId,
                        ref: `SIG-${store.signageItems.length + 1}`,
                        x, y, type: 'directionnel', content: '',
                      } as unknown as Parameters<typeof store.addSignageItem>[0])
                    } else if (kind === 'moment') {
                      const newMoment = {
                        id, floorId: floorId || activeFloorId,
                        number: store.moments.length + 1,
                        name: `Moment ${store.moments.length + 1}`,
                        x, y,
                      }
                      store.setMoments([...store.moments, newMoment as unknown as (typeof store.moments)[number]])
                    }
                    setPlaceTool(null)
                  }}
                  onEntityUpdate={(kind, id, updates) => {
                    if (kind === 'poi') store.updatePoi(id, updates as Parameters<typeof store.updatePoi>[1])
                    else if (kind === 'signage') store.updateSignageItem(id, updates as Parameters<typeof store.updateSignageItem>[1])
                    else if (kind === 'moment') {
                      store.setMoments(store.moments.map(m => m.id === id ? { ...m, ...updates } as typeof m : m))
                    }
                  }}
                  onEntityDelete={(kind, id) => {
                    if (kind === 'poi') store.deletePoi(id)
                    else if (kind === 'signage') store.deleteSignageItem(id)
                    else if (kind === 'moment') {
                      store.setMoments(store.moments.filter(m => m.id !== id))
                    }
                  }}
                />
              )
            })()
          ) : (
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
          )}

          {/* Heatmap hour slider overlay */}
          {showHeatmap && (
            <div className="absolute bottom-4 left-4 bg-surface-1/90 border border-gray-700 rounded-xl px-4 py-3 backdrop-blur-sm w-56">
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
            <div className="absolute top-3 left-3 bg-surface-1/90 border border-emerald-800/40 rounded-lg px-3 py-2 text-xs backdrop-blur-sm">
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
        <aside className="w-80 border-l border-gray-800 bg-surface-0 flex flex-col shrink-0 overflow-hidden">
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
                <div className="w-6 h-6 rounded-full bg-atlas-600/30 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-atlas-400" />
                </div>
                <h3 className="text-sm font-semibold text-atlas-300">
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
                    className="flex-1 bg-surface-1 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
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
          /* ── Non-plan sections: routing delegue a Vol3NonPlanRouter (F-004) ── */
          <Vol3NonPlanRouter
            activeTab={activeTab}
            renderPlanImports={() => (
              <PlanImportsSectionLazy
                volumeColor="#34d399"
                volumeLabel="VOL. 3 — PARCOURS CLIENT"
                floors={floors}
                activeFloorId={activeFloorId}
                onImportComplete={(importedZones, dims, calibration, floorId, planImageUrl, _fileInfo, parsedPlan, importId) => {
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
                  if (planImageUrl) {
                    useVol3Store.getState().setPlanImageUrl(floorId, planImageUrl)
                    void savePlanImageFromUrl(floorId, planImageUrl, 'plan-import.png')
                  }
                  const plan = parsedPlan ?? buildParsedPlanFromImport(importedZones, dims, calibration)
                  usePlanEngineStore.getState().setParsedPlan(plan)
                  usePlanEngineStore.getState().setSpaces(plan.spaces)
                  usePlanEngineStore.getState().setLayers(plan.layers)
                  if (importId) usePlanEngineStore.getState().storeParsedPlan(importId, plan)
                }}
              />
            )}
          />
        )}
      </div>

      {/* ═══ Bottom Bar — F-004 : extrait dans Vol3Footer ═══ */}
      <Vol3Footer
        poiCount={floorPois.length}
        signageCount={floorSignage.length}
        momentsAddressed={momentsProgress.addressed}
        momentsTotal={momentsProgress.total}
        activeProfileName={activeProfile?.name}
        activeFloorLevel={activeFloor?.level}
      />

      {/* Panneau PROPH3T Vol.3 — suggestions parcours / signalétique / audit */}
      {parsedPlan && <Vol3Proph3tPanel parsedPlan={parsedPlan} floorPois={floorPois} />}

      {/* Planche QR à imprimer (un QR par panneau) */}
      {qrExportOpen && flowResult?.placement && projectId && (
        <QrLabelsExport
          panels={flowResult.placement.panels}
          projetId={projectId}
          floorId={activeFloor?.level}
          projectName="The Mall"
          onClose={() => setQrExportOpen(false)}
        />
      )}

      {/* Inbox des signalements terrain */}
      {feedbackInboxOpen && projectId && (
        <SignageFeedbackInbox
          projetId={projectId}
          onClose={() => setFeedbackInboxOpen(false)}
        />
      )}

      {/* Mémoire inter-projets : suggestions automatiques */}
      {memoryPanelOpen && projectId && (
        <SignageMemoryPanel
          projetId={projectId}
          onClose={() => setMemoryPanelOpen(false)}
        />
      )}

      {/* Visite guidée POV first-person (modal plein-écran Three.js) */}
      {povOpen && flowResult && parsedPlan && flowResult.paths.length > 0 && (
        <PovGuideViewer
          flowResult={flowResult}
          walls={(parsedPlan.wallSegments ?? []).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))}
          spacePolygons={(parsedPlan.spaces ?? []).map(s => s.polygon as [number, number][])}
          onClose={() => setPovOpen(false)}
        />
      )}

      {/* Panneau ABM : simulation flux (3 tranches horaires) */}
      {abmPanelOpen && flowResult && parsedPlan && (
        <AbmSimulationPanel
          flowResult={flowResult}
          walls={(parsedPlan.wallSegments ?? []).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }))}
          spacePolygons={(parsedPlan.spaces ?? []).map(s => s.polygon as [number, number][])}
          abmResults={abmResults}
          onResultsChange={setAbmResults}
          activeSlot={activeAbmSlot}
          onActiveSlotChange={setActiveAbmSlot}
          onClose={() => setAbmPanelOpen(false)}
        />
      )}

      {/* Panneau PMR : analyse accessibilité + surbrillance */}
      {pmrPanelOpen && flowResult && (
        <PmrAnalysisPanel
          flowResult={flowResult}
          highlightNonCompliant={highlightPmrNonCompliant}
          onToggleHighlight={setHighlightPmrNonCompliant}
          onClose={() => setPmrPanelOpen(false)}
        />
      )}

      {/* Panneau signalétique : budget + score + liste panneaux */}
      {signageConfigOpen && flowResult && (
        <SignageBudgetPanel
          flowResult={flowResult}
          signageBudget={signageBudget}
          onBudgetChange={setSignageBudget}
          onRecompute={async () => {
            if (!parsedPlan || computingFlow) return
            setComputingFlow(true)
            try {
              const { computeFlowPaths } = await import('../shared/engines/plan-analysis/flowPathEngine')
              const wallSegments = (parsedPlan.wallSegments ?? []).map(w => ({
                x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
              }))
              const result = computeFlowPaths({
                spaces: (parsedPlan.spaces ?? []).map(s => ({
                  id: s.id, label: s.label, type: s.type,
                  areaSqm: s.areaSqm, polygon: s.polygon as [number, number][],
                  floorId: s.floorId,
                })),
                planWidth: parsedPlan.bounds.width || 200,
                planHeight: parsedPlan.bounds.height || 140,
                floorId: activeFloorId,
                wallSegments,
                signageBudget,
                erpMaxSpacingM: 30,
                floors: effectiveFloors.map(f => ({
                  id: f.id,
                  label: f.level,
                  level: parseInt(String(f.level).replace(/[^\d-]/g, ''), 10) || 0,
                })),
                includePmr: true,
              })
              setFlowResult(result)
            } finally {
              setComputingFlow(false)
            }
          }}
          onClose={() => setSignageConfigOpen(false)}
        />
      )}

      {/* Panneau de nettoyage du plan (Min / Std / Complet) */}
      {cleaningOpen && parsedPlan && (
        <PlanCleaningPanel
          plan={parsedPlan}
          onClose={() => setCleaningOpen(false)}
          onApply={(cleaned) => {
            // Remplace le plan courant par sa version nettoyée
            usePlanEngineStore.getState().setParsedPlan(cleaned)
          }}
        />
      )}

      {/* Rapport écrit détaillé des flux + signalétique (PDF-ready modal) */}
      {reportOpen && parsedPlan && flowResult && (
        <DetailedJourneyReport
          onClose={() => setReportOpen(false)}
          flowResult={flowResult}
          spaces={(parsedPlan.spaces ?? []).map(s => ({
            id: s.id, label: s.label, type: s.type,
            areaSqm: s.areaSqm, polygon: s.polygon as [number, number][],
            floorId: s.floorId,
          }))}
          planWidth={parsedPlan.bounds.width || 200}
          planHeight={parsedPlan.bounds.height || 140}
          projectName="The Mall"
          floorId={activeFloorId}
        />
      )}
    </div>
  )
}
