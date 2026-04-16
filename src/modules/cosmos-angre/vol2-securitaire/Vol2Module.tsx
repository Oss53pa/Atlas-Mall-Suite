// ═══ VOL.2 SECURITAIRE — Main Module Component ═══

import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConsolidatedReportButton } from '../shared/components/ConsolidatedReportButton'
import { Proph3tVolumePanel } from '../shared/proph3t/components/Proph3tVolumePanel'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Flame,
  Library,
  Play,
  Shield,
  ShieldAlert,
  ArrowUpDown,
  Loader2,
  Camera as CameraIcon,
  Sparkles,
  Square,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight,
  Accessibility,
  AlertTriangle,
  Upload,
  Box,
  Layers,
  Grid3x3,
  Scissors,
  X,
  Info,
  BarChart2,
  KeyRound,
  Lock,
  ClipboardList,
  Users,
  Map,
  DollarSign,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Monitor,
  Footprints,
  CheckSquare,
  FlaskConical,
  TrendingUp,
  Brain,
} from 'lucide-react'

import { useVol2Store } from './store/vol2Store'
import { usePlanImportStore } from '../shared/stores/planImportStore'
import { computeCoverage } from '../shared/engines/cameraCoverageEngine'
import { runCompliance } from '../shared/engines/complianceEngine'
import { PlanLayerSelector } from '../shared/components/PlanLayerSelector'
import type { ChatMessage, Camera, BlindSpot, TransitionNode } from '../shared/proph3t/types'
import { proph3tAnswer } from '../shared/proph3t/chatEngine'
import type { FullProjectContext } from '../shared/proph3t/chatEngine'

import FloorPlanCanvas from '../shared/components/FloorPlanCanvas'
import { PlanCanvasV2 } from '../shared/components/PlanCanvasV2'
import { usePlanEngineStore } from '../shared/stores/planEngineStore'
import { buildParsedPlanFromImport } from '../shared/planReader/planBridge'
import type { ParsedPlan } from '../shared/planReader/planEngineTypes'
import Proph3tChat from '../shared/components/Proph3tChat'
import EntityPanel from '../shared/components/EntityPanel'
import ToolbarButton from '../shared/components/ToolbarButton'
import ScoreGauge from '../shared/components/ScoreGauge'
// DXFImportModal removed — use PlanImportsSection (unified pipeline) instead
import Model3DImportModal from './components/Model3DImportModal'
import { useCascade } from './hooks/useCascade'
import SaveStatusIndicator, { type SaveStatus } from '../shared/components/SaveStatusIndicator'
import {
  ATLAS_STUDIO_GROUP_META,
  ATLAS_STUDIO_DEFAULT_TAB,
} from '../shared/components/atlasStudioNav'
import { useActiveProjectId } from '../../../hooks/useActiveProject'
import { savePlanImageFromUrl, loadAllPlanImages, clearAllPlanImages } from '../shared/stores/planImageCache'
import { cacheImportedZones, getAllCachedZones, hasAnyCachedZones } from '../shared/stores/importedZonesCache'

import type { ClippingConfig, ClippingAxis, NavMode } from './components/FloorPlan3D'

const FloorPlan3D = lazy(() => import('./components/FloorPlan3D'))
const Vol3DModuleEmbed = lazy(() => import('../vol-3d/Vol3DModule'))
const AnalyseSectionLazy = lazy(() => import('./sections/AnalyseSection'))
const RapportSectionLazy = lazy(() => import('./sections/RapportSection'))
const ChatSectionLazy = lazy(() => import('./sections/ChatSection'))
const SimulationSectionLazy = lazy(() => import('./sections/SimulationSection'))
const BudgetSectionLazy = lazy(() => import('./sections/BudgetSection'))
const IntroSectionLazy = lazy(() => import('./sections/IntroSection'))
const KpisSectionLazy = lazy(() => import('./sections/KpisSection'))
const PerimetreSectionLazy = lazy(() => import('./sections/PerimetreSection'))
const AccesSectionLazy = lazy(() => import('./sections/AccesSection'))
const VideoSectionLazy = lazy(() => import('./sections/VideoSection'))
const IncendieSectionLazy = lazy(() => import('./sections/IncendieSection'))
const ProceduresSectionLazy = lazy(() => import('./sections/ProceduresSection'))
const OrganigrammeSectionLazy = lazy(() => import('./sections/OrganigrammeSection'))
const ControlRoomLazy = lazy(() => import('./sections/ControlRoom'))
const IncidentWorkflowLazy = lazy(() => import('./sections/IncidentWorkflow'))
const RiskMatrixViewLazy = lazy(() => import('./sections/RiskMatrixView'))
const WhatIfSecuriteLazy = lazy(() => import('./sections/WhatIfSecurite'))
const StaffingPlannerLazy = lazy(() => import('./sections/StaffingPlanner'))
const RondePlannerLazy = lazy(() => import('./sections/RondePlanner'))
const ComplianceTrackerLazy = lazy(() => import('./sections/ComplianceTracker'))
const AuditExistantLazy = lazy(() => import('./sections/AuditExistant'))
const VmsIntegrationLazy = lazy(() => import('./sections/VmsIntegration'))
const PlanImportsSectionLazy = lazy(() => import('../shared/components/PlanImportsSection'))
const View3DSectionLazy = lazy(() => import('../shared/view3d/View3DSection'))

type Vol2Tab = 'plan' | 'analyse' | 'rapport' | 'simulation' | 'budget' | 'chat' | 'introduction' | 'kpis' | 'perimetre' | 'acces' | 'video' | 'incendie' | 'procedures' | 'organigramme' | 'control_room' | 'incidents' | 'risk_matrix' | 'whatif' | 'staffing' | 'rondes' | 'compliance' | 'audit_existant' | 'vms' | 'plan_imports'

// ─── Sidebar nav definition ─────────────────────────────────

interface NavItem {
  id: Vol2Tab
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

// Factory: defers cross-chunk ATLAS_STUDIO_GROUP_META access to render time.
// See Vol3Module for rationale (chunk TDZ avoidance).
const buildNavGroups = (): NavGroup[] => [
  {
    ...ATLAS_STUDIO_GROUP_META,
    items: [
      { id: 'plan_imports', label: 'Plans importés', icon: Upload },
      { id: 'plan', label: 'Plan interactif', icon: Map },
      { id: 'analyse', label: 'Analyse Proph3t', icon: BarChart2 },
      { id: 'simulation', label: 'Simulation', icon: Play },
      { id: 'budget', label: 'Budget CAPEX', icon: DollarSign },
      { id: 'rapport', label: 'Rapport', icon: FileText },
      { id: 'chat', label: 'Proph3t Chat', icon: MessageSquare },
    ],
  },
  {
    key: 'vue',
    label: "VUE D'ENSEMBLE",
    icon: Shield,
    color: '#38bdf8',
    separator: true,
    items: [
      { id: 'introduction', label: 'Introduction', icon: Info },
      { id: 'kpis', label: 'KPIs', icon: BarChart2 },
    ],
  },
  {
    key: 'dispositif',
    label: 'DISPOSITIF PAR ZONE',
    icon: Lock,
    color: '#38bdf8',
    items: [
      { id: 'perimetre', label: 'Périmétrique', icon: Eye },
      { id: 'acces', label: "Contrôle d'accès", icon: KeyRound },
      { id: 'video', label: 'Vidéosurveillance', icon: CameraIcon },
      { id: 'incendie', label: 'Sécurité incendie', icon: Flame, dot: true },
      { id: 'procedures', label: 'Procédures & formation', icon: ClipboardList },
    ],
  },
  {
    key: 'organisation',
    label: 'ORGANISATION',
    icon: Users,
    color: '#38bdf8',
    items: [
      { id: 'organigramme', label: 'Organigramme', icon: Users },
    ],
  },
  {
    key: 'controle',
    label: 'CONTRÔLE',
    icon: Monitor,
    color: '#ef4444',
    separator: true,
    items: [
      { id: 'control_room', label: 'Salle de contrôle', icon: Monitor, dot: true },
      { id: 'incidents', label: 'Incidents & workflow', icon: AlertTriangle },
      { id: 'risk_matrix', label: 'Matrice des risques', icon: Grid3x3 },
      { id: 'whatif', label: 'Simulation what-if', icon: FlaskConical },
      { id: 'staffing', label: 'Planning effectifs', icon: Users },
      { id: 'rondes', label: 'Planning rondes', icon: Footprints },
      { id: 'compliance', label: 'Conformité APSAD', icon: CheckSquare },
      { id: 'audit_existant', label: 'Audit existant', icon: ClipboardList },
      { id: 'vms', label: 'Intégration VMS', icon: Monitor },
    ],
  },
]

// ─── Helpers ────────────────────────────────────────────────

// Scale factor matching FloorPlanCanvas viewBox (1 unit = S px)
const S = 4

/** Build an SVG arc path for a camera cone (scaled to viewBox). */
function cameraConeArc(cam: Camera): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = cam.x * S
  const cy = cam.y * S
  const r = cam.range * S
  const halfFov = cam.fov / 2
  const startAngle = cam.angle - halfFov
  const endAngle = cam.angle + halfFov

  if (cam.fov >= 360) {
    return [
      `M ${cx + r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`,
      `A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
      'Z',
    ].join(' ')
  }

  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = cam.fov > 180 ? 1 : 0

  return [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z',
  ].join(' ')
}

/** Return a colour based on camera priority. */
function priorityColor(priority: Camera['priority']): string {
  switch (priority) {
    case 'critique':
      return '#EF4444' // red-500
    case 'haute':
      return '#F59E0B' // amber-500
    default:
      return '#3B82F6' // blue-500
  }
}

/** Transition icon character based on type. */
function transitionIcon(type: TransitionNode['type']): string {
  switch (type) {
    case 'escalator_montant':
      return '↑'
    case 'escalator_descendant':
      return '↓'
    case 'ascenseur':
      return '⇅'
    case 'rampe_pmr':
      return '♿'
    case 'escalier_secours':
      return '⚠'
    default:
      return '↕'
  }
}


// ═══ MAIN COMPONENT ═════════════════════════════════════════

export default function Vol2Module() {
  const navigate = useNavigate()
  const NAV_GROUPS = useMemo(() => buildNavGroups(), [])

  // ── Hydrate from Supabase on mount / project switch ──────
  const projectId = useActiveProjectId()
  const hydrateFromSupabase = useVol2Store((s) => s.hydrateFromSupabase)
  const isHydrating = useVol2Store((s) => s.isHydrating)

  useEffect(() => {
    void hydrateFromSupabase(projectId)
  }, [hydrateFromSupabase, projectId])

  // Restore plan images from IndexedDB on mount
  const setPlanImageUrl = useVol2Store((s) => s.setPlanImageUrl)
  useEffect(() => {
    void loadAllPlanImages().then(urls => {
      for (const [floorId, url] of Object.entries(urls)) {
        setPlanImageUrl(floorId, url)
      }
    })
  }, [setPlanImageUrl])

  // Restore imported zones from localStorage on mount
  const setZones = useVol2Store((s) => s.setZones)
  useEffect(() => {
    if (!hasAnyCachedZones()) return
    const cached = getAllCachedZones()
    const restoredZones = cached.flatMap(c => c.zones as import('../shared/proph3t/types').Zone[])
    if (restoredZones.length > 0) {
      // Merge: keep current zones that aren't on imported floors, add imported
      const importedFloorIds = new Set(cached.map(c => c.floorId))
      const currentZones = useVol2Store.getState().zones
      const keptZones = currentZones.filter(z => !importedFloorIds.has(z.floorId))
      setZones([...keptZones, ...restoredZones])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hydrationError = useVol2Store((s) => s.hydrationError)
  const saveStatus: SaveStatus = isHydrating ? 'saving' : hydrationError ? 'offline' : 'saved'

  // ── Store selectors ──────────────────────────────────────
  const floors = useVol2Store((s) => s.floors)
  const activeFloorId = useVol2Store((s) => s.activeFloorId)
  const zones = useVol2Store((s) => s.zones)
  const cameras = useVol2Store((s) => s.cameras)
  const doors = useVol2Store((s) => s.doors)
  const blindSpots = useVol2Store((s) => s.blindSpots)
  const transitions = useVol2Store((s) => s.transitions)
  const score = useVol2Store((s) => s.score)
  const coverageByFloor = useVol2Store((s) => s.coverageByFloor)
  const evacResult = useVol2Store((s) => s.evacResult)
  const showFov = useVol2Store((s) => s.showFov)
  const showBlindSpots = useVol2Store((s) => s.showBlindSpots)
  const showHeatmap = useVol2Store((s) => s.showHeatmap)
  const showTransitions = useVol2Store((s) => s.showTransitions)
  const chatMessages = useVol2Store((s) => s.chatMessages)
  const selectedEntityId = useVol2Store((s) => s.selectedEntityId)
  const selectedEntityType = useVol2Store((s) => s.selectedEntityType)
  const libraryOpen = useVol2Store((s) => s.libraryOpen)
  const isSimulating = useVol2Store((s) => s.isSimulating)
  const planImageUrls = useVol2Store((s) => s.planImageUrls)

  // Plan engine store — real imported plan data
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)

  const setActiveFloor = useVol2Store((s) => s.setActiveFloor)
  const selectEntity = useVol2Store((s) => s.selectEntity)
  const toggleFov = useVol2Store((s) => s.toggleFov)
  const toggleBlindSpots = useVol2Store((s) => s.toggleBlindSpots)
  const toggleHeatmap = useVol2Store((s) => s.toggleHeatmap)
  const toggleTransitions = useVol2Store((s) => s.toggleTransitions)
  const addChatMessage = useVol2Store((s) => s.addChatMessage)
  const clearChat = useVol2Store((s) => s.clearChat)
  const setIsSimulating = useVol2Store((s) => s.setIsSimulating)
  const setLibraryOpen = useVol2Store((s) => s.setLibraryOpen)
  const addCamera = useVol2Store((s) => s.addCamera)
  const addDoor = useVol2Store((s) => s.addDoor)
  const addZone = useVol2Store((s) => s.addZone)
  const updateCamera = useVol2Store((s) => s.updateCamera)
  const updateDoor = useVol2Store((s) => s.updateDoor)
  const updateZone = useVol2Store((s) => s.updateZone)
  const deleteCamera = useVol2Store((s) => s.deleteCamera)
  const deleteDoor = useVol2Store((s) => s.deleteDoor)
  const deleteZone = useVol2Store((s) => s.deleteZone)

  // ── Auto-cascade: recalcule score + angles morts quand les entites changent ──
  useCascade()

  // ── Placement tool state ──────────────────────────────
  type PlaceTool = null | 'camera' | 'door' | 'zone'
  const [placeTool, setPlaceTool] = useState<PlaceTool>(null)

  const handleCanvasClick = useCallback((x: number, y: number) => {
    if (!placeTool) return
    const id = `${placeTool}-${Date.now()}`
    if (placeTool === 'camera') {
      addCamera({
        id, floorId: activeFloorId, label: `Cam ${cameras.length + 1}`,
        model: 'XNV-8080R', x, y, angle: 180, fov: 109, range: 80, rangeM: 12,
        color: '#3b82f6', priority: 'normale', capexFcfa: 850_000, autoPlaced: false,
      })
    } else if (placeTool === 'door') {
      addDoor({
        id, floorId: activeFloorId, label: `Porte ${doors.length + 1}`,
        x, y, zoneType: 'commerce', isExit: false, hasBadge: false, hasBiometric: false, hasSas: false,
        ref: 'DORMA ES200', normRef: 'NF EN 16005', note: '', widthM: 0.9, capexFcfa: 380_000,
      })
    } else if (placeTool === 'zone') {
      addZone({
        id, floorId: activeFloorId, label: `Zone ${zones.length + 1}`,
        type: 'commerce', x, y, w: 30, h: 20, niveau: 2, color: '#FFF3E0', surfaceM2: 600,
      })
    }
    selectEntity(id, placeTool === 'zone' ? 'zone' : placeTool)
    setPlaceTool(null)
  }, [placeTool, activeFloorId, cameras.length, doors.length, zones.length, addCamera, addDoor, addZone, selectEntity])

  const handleEntityUpdate = useCallback((id: string, updates: Record<string, unknown>) => {
    if (selectedEntityType === 'camera') updateCamera(id, updates)
    else if (selectedEntityType === 'door') updateDoor(id, updates)
    else if (selectedEntityType === 'zone') updateZone(id, updates)
  }, [selectedEntityType, updateCamera, updateDoor, updateZone])

  const handleEntityDelete = useCallback((id: string) => {
    if (selectedEntityType === 'camera') deleteCamera(id)
    else if (selectedEntityType === 'door') deleteDoor(id)
    else if (selectedEntityType === 'zone') deleteZone(id)
    selectEntity(null, null)
  }, [selectedEntityType, deleteCamera, deleteDoor, deleteZone, selectEntity])

  // ── View mode state ─────────────────────────────────────
  const [viewMode, setViewMode] = useState<'2d' | '3d' | '3d-advanced'>('2d')
  const [showAllFloors, setShowAllFloors] = useState(false)
  const [activeTab, setActiveTab] = useState<Vol2Tab>(ATLAS_STUDIO_DEFAULT_TAB as Vol2Tab)
  const [show3DImport, setShow3DImport] = useState(false)
  const [clipping, setClipping] = useState<ClippingConfig>({
    enabled: false,
    axis: 'x',
    position: 0.5,
    showHelper: true,
  })
  const [navMode, setNavMode] = useState<NavMode>('orbit')

  // ── Sidebar accordion state ─────────────────────────────
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    vue: true,
    dispositif: true,
    organisation: true,
    studio: false,
  })

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ── Derived data ─────────────────────────────────────────

  // Si vol2Store.floors est vide MAIS parsedPlan a détecté des étages → synthétise
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
    // Fallback : un seul étage RDC basé sur le parsedPlan
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

  // ── Compute real camera coverage + blind spots from placed cameras ──
  const coverageResult = useMemo(() => {
    if (!parsedPlan || !parsedPlan.spaces.length || !cameras.length) return null
    const pw = parsedPlan.bounds.width || 200
    const ph = parsedPlan.bounds.height || 140
    return computeCoverage(
      cameras.filter(c => !c.autoPlaced).map(c => ({
        id: c.id,
        floorId: c.floorId,
        x: c.x > 1 ? c.x : c.x * pw,
        y: c.y > 1 ? c.y : c.y * ph,
        angle: c.angle,
        fov: c.fov,
        rangeM: c.rangeM || c.range || 10,
        priority: c.priority,
      })),
      parsedPlan.spaces.map(s => ({
        id: s.id,
        polygon: s.polygon,
        areaSqm: s.areaSqm,
        floorId: s.floorId,
        type: s.type,
      })),
      activeFloorId,
      { width: pw, height: ph },
    )
  }, [cameras, parsedPlan, activeFloorId])

  // Compliance report — runs only when cameras/doors/parsedPlan change
  const complianceReport = useMemo(() => {
    if (!parsedPlan || !parsedPlan.spaces.length) return null
    const pw = parsedPlan.bounds.width || 200
    const ph = parsedPlan.bounds.height || 140

    // Build coverage per detected floor
    const detFloors = parsedPlan.detectedFloors ?? [{
      id: activeFloorId,
      label: activeFloor?.level ?? 'RDC',
      bounds: { minX: 0, minY: 0, maxX: pw, maxY: ph, width: pw, height: ph },
      entityCount: 0,
      stackOrder: 0,
    }]

    const camerasMetric = cameras.filter(c => !c.autoPlaced).map(c => ({
      id: c.id,
      floorId: c.floorId,
      x: c.x > 1 ? c.x : c.x * pw,
      y: c.y > 1 ? c.y : c.y * ph,
      angle: c.angle,
      fov: c.fov,
      rangeM: c.rangeM || c.range || 10,
      priority: c.priority,
    }))
    const doorsMetric = doors.map(d => ({
      id: d.id,
      floorId: d.floorId,
      x: d.x > 1 ? d.x : d.x * pw,
      y: d.y > 1 ? d.y : d.y * ph,
      isExit: d.isExit,
      hasBadge: d.hasBadge,
    }))
    const spacesForEngine = parsedPlan.spaces.map(s => ({
      id: s.id,
      polygon: s.polygon,
      areaSqm: s.areaSqm,
      floorId: s.floorId,
      type: s.type,
    }))

    const coverage: Record<string, ReturnType<typeof computeCoverage>> = {}
    for (const f of detFloors) {
      coverage[f.id] = computeCoverage(camerasMetric, spacesForEngine, f.id, { width: pw, height: ph })
    }

    return runCompliance({
      cameras: camerasMetric,
      doors: doorsMetric,
      spaces: spacesForEngine,
      floors: detFloors.map(f => ({
        id: f.id,
        label: f.label,
        totalAreaSqm: f.bounds.width * f.bounds.height,
      })),
      coverage,
      erpType: 'shopping-mall',
    })
  }, [cameras, doors, parsedPlan, activeFloorId, activeFloor?.level])

  const floorZones = useMemo(
    () => zones.filter((z) => z.floorId === activeFloorId),
    [zones, activeFloorId],
  )

  const floorCameras = useMemo(
    () => cameras.filter((c) => c.floorId === activeFloorId),
    [cameras, activeFloorId],
  )

  const floorBlindSpots = useMemo(
    () => blindSpots.filter((b) => b.floorId === activeFloorId),
    [blindSpots, activeFloorId],
  )

  const floorTransitions = useMemo(
    () =>
      transitions.filter(
        (t) =>
          t.fromFloor === activeFloor?.level || t.toFloor === activeFloor?.level,
      ),
    [transitions, activeFloor],
  )

  const totalCameras = cameras.length
  const totalBlindSpots = blindSpots.length
  const activeCoverage = coverageByFloor[activeFloorId] ?? 0
  const scoreTotal = score?.total ?? 0

  // ── Selected entity lookup ───────────────────────────────

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId || !selectedEntityType) return null
    switch (selectedEntityType) {
      case 'camera':
        return cameras.find((c) => c.id === selectedEntityId) ?? null
      case 'zone':
        return zones.find((z) => z.id === selectedEntityId) ?? null
      case 'door':
        return doors.find((d) => d.id === selectedEntityId) ?? null
      case 'transition':
        return transitions.find((t) => t.id === selectedEntityId) ?? null
      default:
        return null
    }
  }, [selectedEntityId, selectedEntityType, cameras, zones, doors, transitions])

  // ── Chat handler ─────────────────────────────────────────

  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      addChatMessage(userMsg)

      try {
        const ctx: FullProjectContext = {
          floors,
          activeFloorId,
          cameras,
          doors,
          zones,
          transitions,
          blindSpots,
          score,
          pois: [],
          signageItems: [],
          parcours: [],
          memory: useVol2Store.getState().memory,
          volume: 'vol2',
        }
        const answer = proph3tAnswer(text, ctx)
        addChatMessage({
          id: `msg-${Date.now()}-ans`,
          role: 'proph3t',
          content: answer.text,
          timestamp: new Date().toISOString(),
          references: answer.references,
        })
      } catch {
        addChatMessage({
          id: `msg-${Date.now()}-err`,
          role: 'proph3t',
          content: 'Erreur lors du traitement de votre question.',
          timestamp: new Date().toISOString(),
        })
      }
    },
    [addChatMessage, floors, activeFloorId, cameras, doors, zones, transitions, blindSpots, score],
  )

  // ── Simulation toggle ────────────────────────────────────

  const handleSimulate = useCallback(() => {
    if (isSimulating) {
      setIsSimulating(false)
    } else {
      setIsSimulating(true)
      // Auto-stop after 5 seconds
      setTimeout(() => setIsSimulating(false), 5000)
    }
  }, [isSimulating, setIsSimulating])

  // ═══ RENDER ═══════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col bg-surface-0 text-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex-none h-14 border-b border-white/[0.04] bg-surface-1/80 backdrop-blur-md flex items-center px-4 gap-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/projects/cosmos-angre')}
          className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>

        <div className="w-px h-6 bg-white/[0.06]" />

        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-glow-blue">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight tracking-tight">Vol.2 <span className="text-gradient-blue">Sécuritaire</span></h1>
            <p className="text-[10px] text-gray-500 font-medium">Cosmos Angré</p>
          </div>
        </div>

        {/* Score badge */}
        {score && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            scoreTotal >= 70 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : scoreTotal >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <ShieldAlert className="w-3 h-3" />
            {scoreTotal}/100
          </div>
        )}

        {/* Floor tabs — only shown when plan is active */}
        {activeTab === 'plan' && (
          <div className="flex items-center gap-1 ml-6">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setActiveFloor(floor.id)}
                className={`
                  px-3 py-1.5 rounded text-xs font-medium transition-colors
                  ${
                    floor.id === activeFloorId
                      ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                {floor.level}
              </button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle — only shown when plan is active */}
        {activeTab === 'plan' && (
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => { setViewMode('2d'); setNavMode('orbit') }}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '2d'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Grid3x3 className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '3d'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Box className="w-3 h-3" />
              3D
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
              <Sparkles className="w-3 h-3" />
              3D+
            </button>
          </div>
        )}

        {/* Plan layer selector — superposition de plans */}
        {activeTab === 'plan' && viewMode === '2d' && activeFloor && (
          <PlanLayerSelector
            floorId={activeFloor.id}
            onPrimaryPlanChange={(url) => setPlanImageUrl(activeFloor.id, url)}
          />
        )}

        {/* Show all floors (3D + plan only) */}
        {activeTab === 'plan' && viewMode === '3d' && (
          <button
            onClick={() => setShowAllFloors(!showAllFloors)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              showAllFloors
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Layers className="w-3 h-3" />
            Multi-etages
          </button>
        )}

        {/* Clipping / Section cut (3D + plan only) */}
        {activeTab === 'plan' && viewMode === '3d' && (
          <button
            onClick={() => setClipping(c => ({ ...c, enabled: !c.enabled }))}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              clipping.enabled
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Scissors className="w-3 h-3" />
            Coupe
          </button>
        )}

        {/* FPS navigation (3D + plan only) */}
        {activeTab === 'plan' && viewMode === '3d' && (
          <button
            onClick={() => setNavMode(m => m === 'orbit' ? 'fps' : 'orbit')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
              navMode === 'fps'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Footprints className="w-3 h-3" />
            Pieton
          </button>
        )}

        {/* Import 3D model — plan only */}
        {activeTab === 'plan' && (
          <button
            onClick={() => setShow3DImport(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium hover:bg-emerald-600/25 transition-colors"
          >
            <Box className="w-3 h-3" />
            IFC/3D
          </button>
        )}

        {/* Exports PDF + CSV — plan tab with a real parsedPlan + compliance */}
        {activeTab === 'plan' && parsedPlan && complianceReport && (
          <>
            <button
              onClick={async () => {
                const mod = await import('../shared/engines/pdfReportEngine')
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                const mkCameras = () => cameras.filter(c => !c.autoPlaced).map(c => ({
                  id: c.id, label: c.label, floorId: c.floorId,
                  floorLabel: floors.find(f => f.id === c.floorId)?.level,
                  model: c.model,
                  x: c.x > 1 ? c.x : c.x * pw,
                  y: c.y > 1 ? c.y : c.y * ph,
                  angle: c.angle, fov: c.fov, rangeM: c.rangeM || c.range || 10,
                  priority: c.priority, capexFcfa: c.capexFcfa,
                }))
                const mkDoors = () => doors.map(d => ({
                  id: d.id, label: d.label, floorId: d.floorId,
                  floorLabel: floors.find(f => f.id === d.floorId)?.level,
                  x: d.x > 1 ? d.x : d.x * pw,
                  y: d.y > 1 ? d.y : d.y * ph,
                  isExit: d.isExit, hasBadge: d.hasBadge, capexFcfa: d.capexFcfa,
                }))
                const pdfBlob = await mod.generateSecurityReportPDF({
                  projectName: 'Cosmos Angre · Plan Securitaire',
                  orgName: 'Vol.2 Securitaire',
                  erpType: 'shopping-mall',
                  compliance: complianceReport,
                  cameras: mkCameras(),
                  doors: mkDoors(),
                })
                const stamp = new Date().toISOString().slice(0, 10)
                mod.downloadPDF(pdfBlob, `rapport-securitaire-${stamp}.pdf`)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] font-medium hover:bg-blue-600/30 transition-colors"
              title="Exporter le rapport securitaire complet en PDF"
            >
              📄 PDF
            </button>
            <button
              onClick={async () => {
                const mod = await import('../shared/engines/pdfReportEngine')
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                const csv = mod.generateEquipmentCSV({
                  cameras: cameras.filter(c => !c.autoPlaced).map(c => ({
                    id: c.id, label: c.label, floorId: c.floorId,
                    floorLabel: floors.find(f => f.id === c.floorId)?.level,
                    model: c.model,
                    x: c.x > 1 ? c.x : c.x * pw,
                    y: c.y > 1 ? c.y : c.y * ph,
                    angle: c.angle, fov: c.fov, rangeM: c.rangeM || c.range || 10,
                    priority: c.priority, capexFcfa: c.capexFcfa,
                  })),
                  doors: doors.map(d => ({
                    id: d.id, label: d.label, floorId: d.floorId,
                    floorLabel: floors.find(f => f.id === d.floorId)?.level,
                    x: d.x > 1 ? d.x : d.x * pw,
                    y: d.y > 1 ? d.y : d.y * ph,
                    isExit: d.isExit, hasBadge: d.hasBadge, capexFcfa: d.capexFcfa,
                  })),
                })
                const stamp = new Date().toISOString().slice(0, 10)
                mod.downloadCSV(csv, `nomenclature-equipements-${stamp}.csv`)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-medium hover:bg-emerald-600/30 transition-colors"
              title="Exporter la nomenclature equipements en CSV"
            >
              📊 CSV
            </button>
            {/* M09 — Optim couverture caméras (greedy submodulaire) */}
            <button
              onClick={async () => {
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                const { optimizeCoverage } = await import('../shared/engines/coverageOptimizer')
                const floorSpaces = (parsedPlan.spaces ?? [])
                  .filter(s => !activeFloor || !s.floorId || s.floorId === activeFloor)
                  .map(s => ({ id: s.id, type: s.type ?? 'commerce', polygon: s.polygon as [number, number][] }))
                const existingCams = cameras
                  .filter(c => !c.autoPlaced && (!activeFloor || c.floorId === activeFloor))
                  .map(c => ({
                    x: c.x > 1 ? c.x : c.x * pw,
                    y: c.y > 1 ? c.y : c.y * ph,
                    angle: c.angle, fov: c.fov, rangeM: c.rangeM || c.range || 10,
                  }))
                const budget = Math.max(1, Math.round((pw * ph) / 200)) // ~1 caméra / 200 m²
                const res = optimizeCoverage({
                  planWidth: pw, planHeight: ph,
                  spaces: floorSpaces,
                  budget,
                  existing: existingCams,
                  defaultRangeM: 12, defaultFovDeg: 90, gridStepM: 1.0,
                  priorityByType: { commerce: 2, restauration: 2, circulation: 3, parking: 1 },
                })
                alert(`Optim caméras (greedy): +${res.proposed.length} caméras proposées · couverture finale ${res.finalCoveragePct.toFixed(1)}% · ${res.elapsedMs.toFixed(0)}ms`)
                console.log('[CoverageOptim]', res)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-300 text-[10px] font-medium hover:bg-amber-600/30 transition-colors"
              title="Optimiser placement caméras (greedy submodulaire)"
            >
              🎯 Optim
            </button>
            {/* M25 — Rapport directeur consolidé (cross-volume) */}
            <ConsolidatedReportButton
              projectName="Cosmos Angré"
              orgName="Centre commercial · Abidjan"
              executiveNote="Rapport généré depuis Vol.2 Sécuritaire. Consolide les analyses Commercial, Sécurité, Parcours par étage."
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
                  cameras: cameras.filter(c => !c.autoPlaced).map(c => {
                    const p = scaleXY(c.x, c.y)
                    return { id: c.id, floorId: c.floorId, x: p.x, y: p.y, angle: c.angle, fov: c.fov, rangeM: c.rangeM || c.range || 10 }
                  }),
                  doors: doors.map(d => {
                    const p = scaleXY(d.x, d.y)
                    return { id: d.id, floorId: d.floorId, x: p.x, y: p.y, isExit: d.isExit, hasBadge: d.hasBadge }
                  }),
                  commercialSpaces: (parsedPlan.spaces ?? []).map(s => ({
                    id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm,
                    floorId: s.floorId, polygon: s.polygon as [number, number][],
                  })),
                  tenants: [],
                  pois: [],
                  signage: [],
                  moments: [],
                  spaces: (parsedPlan.spaces ?? []).map(s => ({
                    id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm,
                    polygon: s.polygon as [number, number][], floorId: s.floorId,
                  })),
                }
              }}
            />
          </>
        )}

        {/* Proph3t badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/8 border border-purple-500/15">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-semibold text-purple-300/80">Proph3t</span>
        </div>
      </header>

      {/* ── Main body ───────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* ── Sidebar navigation — always visible ──────────── */}
        <aside className="flex-none w-60 border-r border-white/[0.04] bg-surface-1 overflow-y-auto">
          {/* Sidebar header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
            <div className="text-[12px] font-bold text-white tracking-tight">Cosmos Angré</div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5 tracking-wider">VOL. 2 — PLAN SÉCURITAIRE</div>
          </div>

          {/* Navigation groups */}
          <nav className="py-2 px-2">
            {NAV_GROUPS.map((group) => (
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
                          style={isActive ? { boxShadow: `inset 2px 0 0 ${group.color}` } : undefined}
                        >
                          <item.icon className="w-3.5 h-3.5 flex-none" style={isActive ? { color: group.color } : undefined} />
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
            ))}
          </nav>

          {/* Save status */}
          <div className="px-4 py-2 border-t border-white/[0.04]">
            <SaveStatusIndicator status={saveStatus} />
          </div>
        </aside>

        {/* ── Content area ─────────────────────────────────── */}
        {activeTab === 'plan' ? (<>
        {/* ── Left sidebar (toolbar) ────────────────────────── */}
        <aside className="flex-none w-12 border-r border-gray-800 bg-gray-900/50 flex flex-col items-center py-3 gap-1">
          {/* ── PLACEMENT TOOLS ── */}
          <div className="text-[8px] text-gray-600 font-mono mb-1">PLACER</div>
          <ToolbarButton
            icon={CameraIcon}
            label="+ Camera"
            active={placeTool === 'camera'}
            onClick={() => setPlaceTool(placeTool === 'camera' ? null : 'camera')}
            activeColor="text-blue-400"
          />
          <ToolbarButton
            icon={Square}
            label="+ Porte"
            active={placeTool === 'door'}
            onClick={() => setPlaceTool(placeTool === 'door' ? null : 'door')}
            activeColor="text-green-400"
          />
          <ToolbarButton
            icon={CircleDot}
            label="+ Zone"
            active={placeTool === 'zone'}
            onClick={() => setPlaceTool(placeTool === 'zone' ? null : 'zone')}
            activeColor="text-amber-400"
          />

          <div className="w-6 h-px bg-gray-800 my-1" />
          <div className="text-[8px] text-gray-600 font-mono mb-1">VUE</div>

          {/* FOV toggle */}
          <ToolbarButton icon={showFov ? Eye : EyeOff} label="FOV" active={showFov} onClick={toggleFov} />
          <ToolbarButton icon={ShieldAlert} label="Angles morts" active={showBlindSpots} onClick={toggleBlindSpots} />
          <ToolbarButton icon={Flame} label="Heatmap" active={showHeatmap} onClick={toggleHeatmap} />
          <ToolbarButton icon={ArrowUpDown} label="Transitions" active={showTransitions} onClick={toggleTransitions} />

          <div className="flex-1" />

          <ToolbarButton icon={Library} label="Bibliotheque" active={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)} />
          <ToolbarButton
            icon={isSimulating ? Loader2 : Play}
            label="Simuler"
            active={isSimulating}
            onClick={handleSimulate}
            className={isSimulating ? 'animate-pulse' : ''}
          />
        </aside>

        {/* Placement indicator */}
        {placeTool && (
          <div className="absolute top-16 left-16 z-20 bg-blue-900/90 border border-blue-500/40 text-blue-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
            <span className="animate-pulse w-2 h-2 rounded-full bg-blue-400" />
            Cliquez sur le plan pour placer {placeTool === 'camera' ? 'une camera' : placeTool === 'door' ? 'une porte' : 'une zone'}
            <button onClick={() => setPlaceTool(null)} className="ml-2 text-blue-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Center — 2D/3D View ─────────────────────────── */}
        <main className="flex-1 relative min-w-0">
          {/* When a real DXF plan is imported, PlanCanvasV2 handles all view modes (2D/3D/3D+) */}
          {parsedPlan?.dxfBlobUrl ? (
            <PlanCanvasV2
              plan={parsedPlan}
              planImageUrl={activeFloor ? (planImageUrls[activeFloor.id] || usePlanImportStore.getState().getActivePlanUrl(activeFloor.id)) : undefined}
              viewMode={viewMode === '3d-advanced' ? '3d-advanced' : viewMode === '3d' ? '3d' : '2d'}
              cameras={cameras.filter(c => !c.autoPlaced || false).map(c => {
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                return {
                  id: c.id, floorId: c.floorId, label: c.label,
                  // If coords are already in metres (>1 typically), use as-is; otherwise scale from 0-1
                  x: c.x > 1 ? c.x : c.x * pw,
                  y: c.y > 1 ? c.y : c.y * ph,
                  angle: c.angle, fov: c.fov,
                  rangeM: c.rangeM || c.range || 10,
                  color: c.color,
                  priority: c.priority,
                }
              })}
              doors={doors.map(d => {
                const pw = parsedPlan.bounds.width || 200
                const ph = parsedPlan.bounds.height || 140
                return {
                  id: d.id, floorId: d.floorId, label: d.label,
                  x: d.x > 1 ? d.x : d.x * pw,
                  y: d.y > 1 ? d.y : d.y * ph,
                  isExit: d.isExit, hasBadge: d.hasBadge,
                }
              })}
              blindSpots={coverageResult?.blindSpots.map(b => ({
                id: b.id, floorId: b.floorId,
                x: b.x, y: b.y, w: b.w, h: b.h,
                severity: b.severity,
              })) ?? []}
              placeMode={placeTool === 'camera' ? 'camera' : placeTool === 'door' ? 'door' : null}
              onPlace={(kind, x, y, floorId) => {
                const id = `${kind}-${Date.now()}`
                if (kind === 'camera') {
                  addCamera({
                    id, floorId: floorId || activeFloorId, label: `Cam ${cameras.length + 1}`,
                    model: 'XNV-8080R', x, y, angle: 180, fov: 109, range: 80, rangeM: 12,
                    color: '#3b82f6', priority: 'normale', capexFcfa: 850_000, autoPlaced: false,
                  })
                } else if (kind === 'door') {
                  addDoor({
                    id, floorId: floorId || activeFloorId, label: `Porte ${doors.length + 1}`,
                    x, y, zoneType: 'commerce', isExit: false, hasBadge: false, hasBiometric: false, hasSas: false,
                    ref: 'DORMA ES200', normRef: 'NF EN 16005', note: '', widthM: 0.9, capexFcfa: 380_000,
                  })
                }
                selectEntity(id, kind)
                setPlaceTool(null)
              }}
              onEntityUpdate={(kind, id, updates) => {
                if (kind === 'camera') updateCamera(id, updates)
                else if (kind === 'door') updateDoor(id, updates)
              }}
              onEntityDelete={(kind, id) => {
                if (kind === 'camera') deleteCamera(id)
                else if (kind === 'door') deleteDoor(id)
              }}
              compliance={complianceReport ? {
                scorePct: complianceReport.scorePct,
                issues: complianceReport.issues.map(i => ({ severity: i.severity, title: i.title })),
                summary: complianceReport.summary,
                floorStats: complianceReport.floorStats.map(fs => ({
                  floorId: fs.floorId,
                  coveragePct: fs.coveragePct,
                  camerasCount: fs.camerasCount,
                  exitsCount: fs.exitsCount,
                })),
              } : undefined}
            />
          ) : viewMode === '3d-advanced' ? (
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
          ) : viewMode === '2d' ? (
            parsedPlan ? (
            <PlanCanvasV2
              plan={parsedPlan}
              planImageUrl={activeFloor ? (planImageUrls[activeFloor.id] || usePlanImportStore.getState().getActivePlanUrl(activeFloor.id)) : undefined}
            />
            ) : (
            <FloorPlanCanvas
              floor={activeFloor}
              zones={floorZones}
              showHeatmap={showHeatmap}
              onEntityClick={(id: string, type: 'camera' | 'door' | 'zone' | 'transition') => selectEntity(id, type)}
              onCanvasClick={placeTool ? handleCanvasClick : undefined}
              cursorMode={placeTool ? 'place' : 'select'}
              selectedId={selectedEntityId}
              className="w-full h-full"
              planImageUrl={activeFloor ? (planImageUrls[activeFloor.id] || usePlanImportStore.getState().getActivePlanUrl(activeFloor.id)) : undefined}
              overlayLayers={activeFloor ? usePlanImportStore.getState().getVisibleLayers(activeFloor.id) : undefined}
            >
              {/* Camera FOV cones (inside FloorPlanCanvas SVG viewBox) */}
              {showFov &&
                floorCameras.map((cam) => (
                  <g key={`fov-${cam.id}`}>
                    <path
                      d={cameraConeArc(cam)}
                      fill={priorityColor(cam.priority)}
                      fillOpacity={0.15}
                      stroke={priorityColor(cam.priority)}
                      strokeOpacity={0.4}
                      strokeWidth={0.5}
                      className="cursor-pointer"
                      onClick={() => selectEntity(cam.id, 'camera')}
                    />
                  </g>
                ))}

              {/* Camera markers */}
              {floorCameras.map((cam) => (
                <g key={`cam-${cam.id}`} className="cursor-pointer" onClick={() => selectEntity(cam.id, 'camera')}>
                  <circle cx={cam.x * S} cy={cam.y * S} r={5} fill={cam.color} stroke="#fff" strokeWidth={1.2} />
                  <circle cx={cam.x * S} cy={cam.y * S} r={2} fill="#fff" fillOpacity={0.9} />
                  {selectedEntityId === cam.id && (
                    <circle
                      cx={cam.x * S} cy={cam.y * S} r={9}
                      fill="none" stroke="#a855f7" strokeWidth={1.8} strokeDasharray="4 2"
                    />
                  )}
                  <text x={cam.x * S} y={cam.y * S - 8} textAnchor="middle" fill={cam.color} fontSize={8} fontFamily="system-ui">
                    {cam.label}
                  </text>
                </g>
              ))}

              {/* Blind spots */}
              {showBlindSpots &&
                floorBlindSpots.map((spot) => (
                  <rect
                    key={spot.id}
                    x={spot.x * S} y={spot.y * S}
                    width={spot.w * S} height={spot.h * S}
                    fill={spot.severity === 'critique' ? '#EF4444' : spot.severity === 'elevee' ? '#F59E0B' : '#FB923C'}
                    fillOpacity={0.25}
                    stroke={spot.severity === 'critique' ? '#EF4444' : spot.severity === 'elevee' ? '#F59E0B' : '#FB923C'}
                    strokeOpacity={0.6} strokeWidth={1} strokeDasharray="6 3" rx={2}
                    className="cursor-pointer"
                    onClick={() => selectEntity(spot.id, 'zone')}
                  />
                ))}

              {/* Door markers */}
              {doors.filter(d => d.floorId === activeFloorId).map((door) => (
                <g key={door.id} className="cursor-pointer" onClick={() => selectEntity(door.id, 'door')}>
                  <rect
                    x={door.x * S - 5} y={door.y * S - 3}
                    width={10} height={6} rx={1}
                    fill={door.isExit ? '#22c55e' : door.hasBadge ? '#3b82f6' : '#94a3b8'}
                    fillOpacity={0.8}
                    stroke={selectedEntityId === door.id ? '#a855f7' : '#fff'}
                    strokeWidth={selectedEntityId === door.id ? 1.5 : 0.5}
                  />
                  <text x={door.x * S} y={door.y * S - 6} textAnchor="middle" fill="#94a3b8" fontSize={6} fontFamily="system-ui">
                    {door.label}
                  </text>
                </g>
              ))}

              {/* Transitions */}
              {showTransitions &&
                floorTransitions.map((tr) => (
                  <g key={tr.id} className="cursor-pointer" onClick={() => selectEntity(tr.id, 'transition')}>
                    <circle
                      cx={tr.x * S} cy={tr.y * S} r={10}
                      fill={tr.pmr ? '#8B5CF6' : '#6366F1'} fillOpacity={0.7}
                      stroke="#fff" strokeWidth={1}
                    />
                    <text
                      x={tr.x * S} y={tr.y * S + 1}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#fff" fontSize={9} fontWeight="bold"
                    >
                      {transitionIcon(tr.type)}
                    </text>
                    <text x={tr.x * S} y={tr.y * S - 14} textAnchor="middle" fill="#A5B4FC" fontSize={7} fontFamily="system-ui">
                      {tr.label}
                    </text>
                    {selectedEntityId === tr.id && (
                      <circle cx={tr.x * S} cy={tr.y * S} r={14} fill="none" stroke="#A5B4FC" strokeWidth={1.5} strokeDasharray="4 2" />
                    )}
                  </g>
                ))}
            </FloorPlanCanvas>
            )
          ) : (
            <div className="relative w-full h-full">
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-950">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement de la vue 3D...
                  </div>
                </div>
              }>
                <FloorPlan3D
                  floors={floors}
                  activeFloorId={activeFloorId}
                  zones={parsedPlan ? parsedPlan.spaces.map((sp) => ({
                    id: sp.id, floorId: activeFloorId, label: sp.label, type: sp.type as any,
                    x: sp.bounds.minX, y: sp.bounds.minY, w: sp.bounds.width, h: sp.bounds.height,
                    niveau: 2 as any, color: sp.color ?? '#3b82f6', surfaceM2: sp.areaSqm,
                  })) : zones}
                  cameras={cameras}
                  doors={doors}
                  blindSpots={blindSpots}
                  transitions={transitions}
                  showFov={showFov}
                  showBlindSpots={showBlindSpots}
                  showTransitions={showTransitions}
                  selectedEntityId={selectedEntityId}
                  onEntityClick={(id, type) => selectEntity(id, type)}
                  showAllFloors={showAllFloors}
                  clipping={clipping}
                  navMode={navMode}
                />
              </Suspense>

              {/* Clipping controls overlay */}
              {clipping.enabled && (
                <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-xl p-4 space-y-3 backdrop-blur-sm w-64">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs font-medium text-white">Vue en coupe</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <input
                        type="checkbox"
                        checked={clipping.showHelper}
                        onChange={(e) => setClipping(c => ({ ...c, showHelper: e.target.checked }))}
                        className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-purple-500"
                      />
                      Plan visible
                    </label>
                  </div>

                  {/* Axis selector */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Axe de coupe</label>
                    <div className="flex gap-1">
                      {(['x', 'y', 'z'] as ClippingAxis[]).map(ax => (
                        <button
                          key={ax}
                          onClick={() => setClipping(c => ({ ...c, axis: ax }))}
                          className={`flex-1 px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-colors ${
                            clipping.axis === ax
                              ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          {ax === 'x' ? 'X (largeur)' : ax === 'y' ? 'Y (hauteur)' : 'Z (profondeur)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Position slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-gray-500">Position</label>
                      <span className="text-[10px] font-mono text-rose-300">{Math.round(clipping.position * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(clipping.position * 100)}
                      onChange={(e) => setClipping(c => ({ ...c, position: Number(e.target.value) / 100 }))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── Right panel ───────────────────────────────────── */}
        <aside className="flex-none w-80 border-l border-gray-800 bg-gray-900/40 flex flex-col min-h-0">
          {selectedEntity ? (
            <EntityPanel
              entity={selectedEntity}
              entityType={selectedEntityType!}
              onClose={() => selectEntity(null, null)}
              onUpdate={handleEntityUpdate}
              onDelete={handleEntityDelete}
            />
          ) : (
            <Proph3tChat
              messages={chatMessages}
              onSend={handleSendMessage}
              onClear={clearChat}
            />
          )}
        </aside>
        </>) : (
          <main className="flex-1 min-w-0 overflow-y-auto" style={{ background: '#080c14' }}>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}>
              {activeTab === 'introduction' && <IntroSectionLazy />}
              {activeTab === 'kpis' && <KpisSectionLazy />}
              {activeTab === 'perimetre' && <PerimetreSectionLazy />}
              {activeTab === 'acces' && <AccesSectionLazy />}
              {activeTab === 'video' && <VideoSectionLazy />}
              {activeTab === 'incendie' && <IncendieSectionLazy />}
              {activeTab === 'procedures' && <ProceduresSectionLazy />}
              {activeTab === 'organigramme' && <OrganigrammeSectionLazy />}
              {activeTab === 'analyse' && <AnalyseSectionLazy />}
              {activeTab === 'rapport' && <RapportSectionLazy />}
              {activeTab === 'chat' && <ChatSectionLazy />}
              {activeTab === 'simulation' && <SimulationSectionLazy />}
              {activeTab === 'budget' && <BudgetSectionLazy />}
              {activeTab === 'introduction' && <IntroSectionLazy />}
              {activeTab === 'kpis' && <KpisSectionLazy />}
              {activeTab === 'perimetre' && <PerimetreSectionLazy />}
              {activeTab === 'acces' && <AccesSectionLazy />}
              {activeTab === 'video' && <VideoSectionLazy />}
              {activeTab === 'incendie' && <IncendieSectionLazy />}
              {activeTab === 'procedures' && <ProceduresSectionLazy />}
              {activeTab === 'organigramme' && <OrganigrammeSectionLazy />}
              {activeTab === 'control_room' && <ControlRoomLazy />}
              {activeTab === 'incidents' && <IncidentWorkflowLazy />}
              {activeTab === 'risk_matrix' && <RiskMatrixViewLazy />}
              {activeTab === 'whatif' && <WhatIfSecuriteLazy />}
              {activeTab === 'staffing' && <StaffingPlannerLazy />}
              {activeTab === 'rondes' && <RondePlannerLazy />}
              {activeTab === 'compliance' && <ComplianceTrackerLazy />}
              {activeTab === 'audit_existant' && <AuditExistantLazy />}
              {activeTab === 'vms' && <VmsIntegrationLazy />}
              {activeTab === 'plan_imports' && (
                <PlanImportsSectionLazy
                  volumeColor="#38bdf8"
                  volumeLabel="VOL. 2 — PLAN SÉCURITAIRE"
                  floors={floors}
                  activeFloorId={floors.find(f => f.level === activeFloor)?.id ?? floors[0]?.id ?? ''}
                  onImportComplete={(zones, dims, calibration, floorId, planImageUrl, _fileInfo, parsedPlan, importId) => {
                    const s = useVol2Store.getState()
                    const newZones = zones.map((z, i) => ({
                      id: z.id ?? `import-${Date.now()}-${i}`,
                      floorId: z.floorId ?? floorId,
                      label: z.label ?? `Zone ${i + 1}`,
                      type: (z.type ?? 'commerce') as any,
                      x: z.x ?? 0, y: z.y ?? 0, w: z.w ?? 0.1, h: z.h ?? 0.1,
                      niveau: (z.niveau ?? 2) as any,
                      color: z.color ?? '#0a2a15',
                    }))
                    // Replace ALL zones and clear old plan images
                    const otherFloorZones = s.zones.filter(z => z.floorId !== floorId)
                    s.setZones([...otherFloorZones, ...newZones])
                    // Clear stale plan image URLs for all floors
                    for (const fid of Object.keys(s.planImageUrls)) {
                      if (fid !== floorId) s.setPlanImageUrl(fid, '')
                    }
                    // Persist imported zones in localStorage so they survive refresh
                    cacheImportedZones(floorId, newZones, 'import')
                    // Set plan image URL synchronously FIRST
                    if (planImageUrl) {
                      s.setPlanImageUrl(floorId, planImageUrl)
                      // Also persist to IndexedDB for page refresh
                      void clearAllPlanImages().then(() => {
                        void savePlanImageFromUrl(floorId, planImageUrl, 'plan-import.png')
                      })
                    }
                    // Store ParsedPlan in engine store — ensure planImageUrl is attached
                    const plan = parsedPlan ?? buildParsedPlanFromImport(zones, dims, calibration)
                    if (planImageUrl && !plan.planImageUrl) {
                      plan.planImageUrl = planImageUrl
                    }
                    usePlanEngineStore.getState().setParsedPlan(plan)
                    usePlanEngineStore.getState().setSpaces(plan.spaces)
                    usePlanEngineStore.getState().setLayers(plan.layers)
                    if (importId) usePlanEngineStore.getState().storeParsedPlan(importId, plan)
                  }}
                />
              )}
            </Suspense>
          </main>
        )}
      </div>

      {/* ── Bottom status bar ───────────────────────────────── */}
      <footer className="flex-none h-10 border-t border-gray-800 bg-gray-900/60 flex items-center px-4 gap-6 text-xs text-gray-400">
        {/* Score */}
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-red-400" />
          <span>Score:</span>
          <span className={`font-semibold ${scoreTotal >= 70 ? 'text-green-400' : scoreTotal >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {scoreTotal > 0 ? `${scoreTotal}/100` : '--'}
          </span>
        </div>

        {/* Coverage */}
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-blue-400" />
          <span>Couverture ({activeFloor?.level}):</span>
          <span className={`font-semibold ${activeCoverage >= 80 ? 'text-green-400' : activeCoverage >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
            {activeCoverage}%
          </span>
        </div>

        {/* Camera count */}
        <div className="flex items-center gap-1.5">
          <CameraIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span>Cameras:</span>
          <span className="font-semibold text-white">{totalCameras}</span>
        </div>

        {/* Blind spots */}
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Angles morts:</span>
          <span className={`font-semibold ${totalBlindSpots === 0 ? 'text-green-400' : 'text-amber-400'}`}>
            {totalBlindSpots}
          </span>
        </div>

        {/* Evacuation time */}
        {evacResult && (
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Evac:</span>
            <span className={`font-semibold ${evacResult.conformNFS61938 ? 'text-green-400' : 'text-red-400'}`}>
              {Math.floor(evacResult.totalTimeSec / 60)}m {evacResult.totalTimeSec % 60}s
            </span>
            {!evacResult.conformNFS61938 && (
              <span className="text-red-400 text-[10px]">(non conforme)</span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Floor indicator */}
        <span className="font-mono text-gray-500">
          {activeFloor?.level} &middot; {activeFloor?.widthM}x{activeFloor?.heightM}m
        </span>
      </footer>

      <Model3DImportModal open={show3DImport} onClose={() => setShow3DImport(false)} />

      {/* Panneau PROPH3T dockable — présent en permanence pour suggestions / évaluations / audit */}
      {parsedPlan && <Vol2Proph3tPanel parsedPlan={parsedPlan} cameras={cameras} doors={doors} />}
    </div>
  )
}

// Panneau isolé → callback buildInput stable (évite re-render infini du VolumePanel)
const Vol2Proph3tPanel = React.memo(function Vol2Proph3tPanel({
  parsedPlan, cameras, doors,
}: {
  parsedPlan: NonNullable<ReturnType<typeof usePlanEngineStore.getState>['parsedPlan']>
  cameras: ReturnType<typeof useVol2Store.getState>['cameras']
  doors: ReturnType<typeof useVol2Store.getState>['doors']
}) {
  const buildInput = useCallback(() => ({
    planWidth: parsedPlan.bounds.width || 200,
    planHeight: parsedPlan.bounds.height || 140,
    spaces: (parsedPlan.spaces ?? []).map(s => ({
      id: s.id, type: s.type as string | undefined, areaSqm: s.areaSqm,
      polygon: s.polygon as [number, number][], floorId: s.floorId,
      label: s.label,
    })),
    cameras: cameras.filter(c => !c.autoPlaced).map(c => ({
      id: c.id, floorId: c.floorId,
      x: c.x > 1 ? c.x : c.x * (parsedPlan.bounds.width || 200),
      y: c.y > 1 ? c.y : c.y * (parsedPlan.bounds.height || 140),
      angle: c.angle, fov: c.fov, rangeM: c.rangeM || c.range || 10,
    })),
    doors: doors.map(d => ({
      id: d.id, floorId: d.floorId,
      x: d.x > 1 ? d.x : d.x * (parsedPlan.bounds.width || 200),
      y: d.y > 1 ? d.y : d.y * (parsedPlan.bounds.height || 140),
      isExit: d.isExit, hasBadge: d.hasBadge,
    })),
    floors: (parsedPlan.detectedFloors ?? [{ id: 'RDC', label: 'RDC', bounds: { width: parsedPlan.bounds.width, height: parsedPlan.bounds.height } }]).map(f => ({
      id: f.id, label: f.label, bounds: { width: f.bounds.width, height: f.bounds.height },
    })),
  }), [parsedPlan, cameras, doors])

  return <Proph3tVolumePanel volume="security" buildInput={buildInput} />
})
