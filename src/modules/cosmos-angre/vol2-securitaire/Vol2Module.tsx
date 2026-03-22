// ═══ VOL.2 SECURITAIRE — Main Module Component ═══

import React, { useCallback, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'

import { useVol2Store } from './store/vol2Store'
import type { ChatMessage, Camera, BlindSpot, TransitionNode } from '../shared/proph3t/types'
import { proph3tAnswer } from '../shared/proph3t/chatEngine'
import type { FullProjectContext } from '../shared/proph3t/chatEngine'

import FloorPlanCanvas from '../shared/components/FloorPlanCanvas'
import Proph3tChat from '../shared/components/Proph3tChat'
import EntityPanel from '../shared/components/EntityPanel'
import ToolbarButton from '../shared/components/ToolbarButton'
import ScoreGauge from '../shared/components/ScoreGauge'
import DXFImportModal from './components/DXFImportModal'
import Model3DImportModal from './components/Model3DImportModal'
import { useCascade } from './hooks/useCascade'

import type { ClippingConfig, ClippingAxis } from './components/FloorPlan3D'

const FloorPlan3D = lazy(() => import('./components/FloorPlan3D'))
const AnalyseSectionLazy = lazy(() => import('./sections/AnalyseSection'))
const RapportSectionLazy = lazy(() => import('./sections/RapportSection'))
const ChatSectionLazy = lazy(() => import('./sections/ChatSection'))
const SimulationSectionLazy = lazy(() => import('./sections/SimulationSection'))
const BudgetSectionLazy = lazy(() => import('./sections/BudgetSection'))

type Vol2Tab = 'plan' | 'analyse' | 'rapport' | 'simulation' | 'budget' | 'chat'

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
      return '\u2191'
    case 'escalator_descendant':
      return '\u2193'
    case 'ascenseur':
      return '\u21C5'
    case 'rampe_pmr':
      return '\u267F'
    case 'escalier_secours':
      return '\u26A0'
    default:
      return '\u2195'
  }
}


// ═══ MAIN COMPONENT ═════════════════════════════════════════

export default function Vol2Module() {
  const navigate = useNavigate()

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

  // ── Auto-cascade: recalcule score + angles morts quand les entites changent ──
  useCascade()

  // ── View mode state ─────────────────────────────────────
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [showAllFloors, setShowAllFloors] = useState(false)
  const [showDXFImport, setShowDXFImport] = useState(false)
  const [activeTab, setActiveTab] = useState<Vol2Tab>('plan')
  const [show3DImport, setShow3DImport] = useState(false)
  const [clipping, setClipping] = useState<ClippingConfig>({
    enabled: false,
    axis: 'x',
    position: 0.5,
    showHelper: true,
  })

  // ── Derived data ─────────────────────────────────────────

  const activeFloor = useMemo(
    () => floors.find((f) => f.id === activeFloorId) ?? floors[0],
    [floors, activeFloorId],
  )

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
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex-none h-14 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm flex items-center px-4 gap-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/cosmos-angre')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Retour</span>
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">Vol.2 Securitaire</h1>
            <p className="text-[10px] text-gray-500">Cosmos Angre</p>
          </div>
        </div>

        {/* Floor tabs */}
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

        {/* Section tabs */}
        <div className="flex items-center gap-0.5 ml-4 bg-gray-800/60 rounded-lg p-0.5">
          {([
            ['plan', 'Plan'],
            ['analyse', 'Analyse'],
            ['simulation', 'Simulation'],
            ['budget', 'Budget'],
            ['rapport', 'Rapport'],
            ['chat', 'Proph3t IA'],
          ] as [Vol2Tab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-red-600/20 text-red-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('2d')}
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
        </div>

        {/* Show all floors (3D only) */}
        {viewMode === '3d' && (
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

        {/* Clipping / Section cut (3D only) */}
        {viewMode === '3d' && (
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

        {/* Import DXF/DWG */}
        <button
          onClick={() => setShowDXFImport(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-300 text-[10px] font-medium hover:bg-blue-600/25 transition-colors"
        >
          <Upload className="w-3 h-3" />
          DXF/DWG
        </button>

        {/* Import 3D model */}
        <button
          onClick={() => setShow3DImport(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium hover:bg-emerald-600/25 transition-colors"
        >
          <Box className="w-3 h-3" />
          IFC/3D
        </button>

        {/* Proph3t badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-900/30 border border-purple-700/30">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-mono text-purple-300">Proph3t</span>
        </div>
      </header>

      {/* ── Main body ───────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {activeTab !== 'plan' ? (
          <main className="flex-1 min-w-0 bg-gray-950">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}>
              {activeTab === 'analyse' && <AnalyseSectionLazy />}
              {activeTab === 'rapport' && <RapportSectionLazy />}
              {activeTab === 'chat' && <ChatSectionLazy />}
              {activeTab === 'simulation' && <SimulationSectionLazy />}
              {activeTab === 'budget' && <BudgetSectionLazy />}
            </Suspense>
          </main>
        ) : (<>
        {/* ── Left sidebar (toolbar) ────────────────────────── */}
        <aside className="flex-none w-12 border-r border-gray-800 bg-gray-900/50 flex flex-col items-center py-3 gap-1">
          {/* FOV toggle */}
          <ToolbarButton
            icon={showFov ? Eye : EyeOff}
            label="FOV"
            active={showFov}
            onClick={toggleFov}
          />

          {/* Blind Spots toggle */}
          <ToolbarButton
            icon={ShieldAlert}
            label="Angles morts"
            active={showBlindSpots}
            onClick={toggleBlindSpots}
          />

          {/* Heatmap toggle */}
          <ToolbarButton
            icon={Flame}
            label="Heatmap"
            active={showHeatmap}
            onClick={toggleHeatmap}
          />

          {/* Transitions toggle */}
          <ToolbarButton
            icon={ArrowUpDown}
            label="Transitions"
            active={showTransitions}
            onClick={toggleTransitions}
          />

          <div className="flex-1" />

          {/* Library */}
          <ToolbarButton
            icon={Library}
            label="Bibliotheque"
            active={libraryOpen}
            onClick={() => setLibraryOpen(!libraryOpen)}
          />

          {/* Simulate */}
          <ToolbarButton
            icon={isSimulating ? Loader2 : Play}
            label="Simuler"
            active={isSimulating}
            onClick={handleSimulate}
            className={isSimulating ? 'animate-pulse' : ''}
          />
        </aside>

        {/* ── Center — 2D/3D View ─────────────────────────── */}
        <main className="flex-1 relative min-w-0">
          {viewMode === '2d' ? (
            <FloorPlanCanvas
              floor={activeFloor}
              zones={floorZones}
              showHeatmap={showHeatmap}
              onEntityClick={(id: string, type: 'camera' | 'door' | 'zone' | 'transition') => selectEntity(id, type)}
              selectedId={selectedEntityId}
              className="w-full h-full"
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
                  zones={zones}
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
            />
          ) : (
            <Proph3tChat
              messages={chatMessages}
              onSend={handleSendMessage}
              onClear={clearChat}
            />
          )}
        </aside>
        </>)}
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

      {/* ── DXF Import Modal ────────────────────────────────── */}
      <DXFImportModal open={showDXFImport} onClose={() => setShowDXFImport(false)} />
      <Model3DImportModal open={show3DImport} onClose={() => setShow3DImport(false)} />
    </div>
  )
}
