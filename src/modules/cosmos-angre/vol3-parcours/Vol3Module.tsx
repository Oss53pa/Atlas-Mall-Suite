// ═══ VOL.3 PARCOURS CLIENT — Main Module ═══

import React, { useCallback, useMemo, useState, lazy, Suspense } from 'react'
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
  Star,
  AlertTriangle,
  Lightbulb,
  Crown,
  X,
  Loader2,
  Bell,
  PlayCircle,
} from 'lucide-react'
import { useVol3Store } from './store/vol3Store'
import FloorPlanCanvas, { CANVAS_SCALE } from '../shared/components/FloorPlanCanvas'
import Proph3tChat from '../shared/components/Proph3tChat'
import EntityPanel from '../shared/components/EntityPanel'
import ToolbarButton from '../shared/components/ToolbarButton'
import ScoreGauge from '../shared/components/ScoreGauge'
import HeatmapOverlay, { type ZoneHeatData } from './components/HeatmapOverlay'
import GeoNotificationPanel, { type GeoNotification } from './components/GeoNotificationPanel'
import VisitReplay, { type VisitPath } from './components/VisitReplay'
import type { ChatMessage, MomentCle, POI, SignageItem } from '../shared/proph3t/types'

const ParcoursSectionLazy = lazy(() => import('./sections/ParcoursSection'))
const WayfindingSectionLazy = lazy(() => import('./sections/WayfindingSection'))
const SignaleticsSectionLazy = lazy(() => import('./sections/SignaleticsSection'))
const HeatmapSectionLazy = lazy(() => import('./sections/HeatmapSection'))
const RapportSectionLazy = lazy(() => import('./sections/RapportSection'))
const ChatSectionLazy = lazy(() => import('./sections/ChatSection'))

type Vol3Tab = 'plan' | 'parcours' | 'wayfinding' | 'signaletique' | 'heatmap' | 'rapport' | 'chat'

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
  const [activeTab, setActiveTab] = useState<Vol3Tab>('plan')
  const [heatmapHour, setHeatmapHour] = useState(14) // default 2pm
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
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* ═══ Header ═══ */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cosmos-angre')}
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-tight">
                Vol.3 — Parcours Client
              </h1>
              <p className="text-[10px] text-gray-500">
                Cosmos Angré &middot; Signalétique &middot; Wayfinding &middot; Moments-clés
              </p>
            </div>
          </div>
        </div>

        {/* Floor selector + profile selector */}
        <div className="flex items-center gap-3">
          {/* Floor tabs */}
          <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-0.5">
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => store.setActiveFloor(f.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  f.id === activeFloorId
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {f.level}
              </button>
            ))}
          </div>

          {/* Profile selector */}
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

          {/* Proph3t badge */}
          <span className="px-2 py-1 rounded bg-purple-900/40 text-purple-400 text-[10px] font-mono border border-purple-700/30">
            Proph3t
          </span>

          {/* Section tabs */}
          <div className="flex items-center gap-0.5 ml-2 bg-gray-800/60 rounded-lg p-0.5">
            {([
              ['plan', 'Plan'],
              ['parcours', 'Parcours'],
              ['wayfinding', 'Wayfinding'],
              ['signaletique', 'Signal.'],
              ['heatmap', 'Heatmap'],
              ['rapport', 'Rapport'],
              ['chat', 'Proph3t IA'],
            ] as [Vol3Tab, string][]).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ═══ Main Area ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab !== 'plan' ? (
          <main className="flex-1 min-w-0 bg-gray-950">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-500" /></div>}>
              {activeTab === 'parcours' && <ParcoursSectionLazy />}
              {activeTab === 'wayfinding' && <WayfindingSectionLazy />}
              {activeTab === 'signaletique' && <SignaleticsSectionLazy />}
              {activeTab === 'heatmap' && <HeatmapSectionLazy />}
              {activeTab === 'rapport' && <RapportSectionLazy />}
              {activeTab === 'chat' && <ChatSectionLazy />}
            </Suspense>
          </main>
        ) : (<>
        {/* ── Left Sidebar: Toggle Buttons ── */}
        <aside className="w-12 border-r border-gray-800 bg-gray-950 flex flex-col items-center py-3 gap-2 shrink-0">
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

        {/* ── Center: Floor Plan Canvas ── */}
        <main className="flex-1 relative overflow-hidden bg-gray-900/50">
          <FloorPlanCanvas
            floor={activeFloor}
            zones={floorZones}
            showHeatmap={showHeatmap}
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
        </main>

        {/* ── Right Panel ── */}
        <aside className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col shrink-0 overflow-hidden">
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
        </>)}
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
            Étage: <span className="text-gray-400">{activeFloor.level}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
