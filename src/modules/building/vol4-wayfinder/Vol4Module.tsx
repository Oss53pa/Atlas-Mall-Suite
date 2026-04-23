// ═══ VOL.4 WAYFINDER — Main Module Component ═══
//
// GPS intérieur du The Mall : mobile, web, bornes.
// Reprend le pattern Vol.1/2/3 : Atlas Studio Phase 0 + section métier propres.

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Navigation,
  User,
  Monitor,
  BarChart2,
  Upload,
  Map as MapIcon,
  Wifi,
  Smartphone,
  Globe,
  Loader2,
  Sparkles,
  Workflow,
  History,
  Send,
} from 'lucide-react'
import SaveStatusIndicator from '../shared/components/SaveStatusIndicator'
import { PlanModelSelector } from '../shared/components/PlanModelSelector'
import {
  ATLAS_STUDIO_GROUP_META,
  ATLAS_STUDIO_CORE_ITEMS,
  ATLAS_STUDIO_DEFAULT_TAB,
} from '../shared/components/atlasStudioNav'
import { useVol4Store } from './store/vol4Store'
import { usePlanEngineStore } from '../shared/stores/planEngineStore'
import { buildParsedPlanFromImport } from '../shared/planReader/planBridge'
import { savePlanImageFromUrl, loadAllPlanImages } from '../shared/stores/planImageCache'
import { buildWayfinderCatalog, buildWayfinderGraph } from './engines/wayfinderBridge'
import { buildSearchIndex } from './engines/searchEngine'
import { useAutoSnapshot } from '../shared/hooks/useAutoSnapshot'
import { Proph3tVolumePanel } from '../shared/proph3t/components/Proph3tVolumePanel'
import type { WayfinderAnalyzeInput } from '../shared/proph3t/skills/analyzeWayfinder'

// Sections lazy-loaded (avoid cross-chunk TDZ)
const RouteSearchSectionLazy = lazy(() => import('./sections/RouteSearchSection'))
const PositioningSectionLazy = lazy(() => import('./sections/PositioningSection'))
const PersonaSectionLazy = lazy(() => import('./sections/PersonaSection'))
const KioskSectionLazy = lazy(() => import('./sections/KioskSection'))
const Proph3tWayfinderSectionLazy = lazy(() => import('./sections/Proph3tWayfinderSection'))
const WayfinderMapViewLazy = lazy(() => import('./components/WayfinderMapView'))
const MapViewerShellLazy   = lazy(() => import('../shared/map-viewer/MapViewerShell'))
const PlanImportsSectionLazy = lazy(() => import('../shared/components/PlanImportsSection'))
const OrchestrationPanelLazy = lazy(() =>
  import('../proph3t-core/components/OrchestrationPanel').then(m => ({ default: m.OrchestrationPanel }))
)
const VolumeHistoryTabLazy = lazy(() => import('../shared/components/VolumeHistoryTab'))
const VolumeReportsTabLazy = lazy(() => import('../shared/components/VolumeReportsTab'))
const GodModeSignageHostLazy = lazy(() => import('./sections/GodModeSignageHost'))

// Wayfinder Designer (CDC complet)
const WayfinderDesignerViewLazy = lazy(() => import('../wayfinder-designer/components/WayfinderDesignerView'))
import { isDesignerEnabled } from '../wayfinder-designer/types'
import { Palette as PaletteIcon } from 'lucide-react'

type Vol4Tab =
  | 'plan_imports' | 'plan' | 'proph3t' | 'rapport' | 'chat' // Atlas Studio core
  | 'search' | 'positioning' | 'persona' | 'kiosk' | 'designer'
  | 'orchestration'
  | 'history' | 'reports' | 'god_mode_signage'

interface NavItem {
  id: Vol4Tab
  label: string
  icon: React.ComponentType<any>
}

interface NavGroup {
  key: string
  label: string
  icon: React.ComponentType<any>
  color: string
  items: NavItem[]
  separator?: boolean
}

// Factory pattern (évite TDZ cross-chunk — cf. Vol1Module)
const buildNavGroups = (): NavGroup[] => [
  {
    ...ATLAS_STUDIO_GROUP_META,
    items: [
      { id: 'plan_imports', label: 'Plans importés', icon: Upload },
      { id: 'plan', label: 'Plan interactif', icon: MapIcon },
      { id: 'proph3t', label: 'Analyse Proph3t', icon: BarChart2 },
      { id: 'rapport', label: 'Rapport', icon: Sparkles },
    ],
  },
  {
    key: 'wayfinder',
    label: 'WAYFINDER',
    icon: Navigation,
    color: '#0ea5e9',
    separator: true,
    items: [
      { id: 'search', label: 'Recherche & itinéraire', icon: Navigation },
      { id: 'positioning', label: 'Positionnement', icon: Wifi },
      { id: 'persona', label: 'Persona & préférences', icon: User },
      { id: 'kiosk', label: 'Bornes interactives', icon: Monitor },
      ...(isDesignerEnabled() ? [
        { id: 'designer' as Vol4Tab, label: 'Wayfinder Designer', icon: PaletteIcon },
      ] : []),
    ],
  },
  {
    key: 'proph3t-core',
    label: 'PROPH3T',
    icon: Sparkles,
    color: '#b38a5a',
    separator: true,
    items: [
      { id: 'orchestration', label: 'Orchestrateur 4 vol.', icon: Workflow },
      { id: 'god_mode_signage', label: 'GOD MODE signalétique', icon: Sparkles },
    ],
  },
  {
    key: 'collaboration',
    label: 'COLLABORATION',
    icon: Send,
    color: '#c9a068',
    separator: true,
    items: [
      { id: 'history', label: 'Historique du plan', icon: History },
      { id: 'reports', label: 'Rapports & partage', icon: Send },
    ],
  },
]
// Sanity: contrat Atlas Studio respecté
void ATLAS_STUDIO_CORE_ITEMS

const Loading = () => (
  <div className="flex items-center justify-center h-96">
    <Loader2 className="animate-spin text-slate-500" size={24} />
  </div>
)

export default function Vol4Module() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Vol4Tab>(ATLAS_STUDIO_DEFAULT_TAB as Vol4Tab)
  const [planSubView, setPlanSubView] = useState<'wayfinder' | 'carte'>('wayfinder')
  const NAV_GROUPS = useMemo(() => buildNavGroups(), [])

  const {
    activePlatform, setPlatform,
    setCatalog, setSearchIndex,
  } = useVol4Store()

  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const routeHistory = useVol4Store(s => s.routeHistory)
  const catalogItems = useVol4Store(s => s.catalogItems)

  // Auto-snapshot : capture automatique des versions majeures
  useAutoSnapshot({ volumeId: 'vol4' })

  // ─── Proph3t Vol.4 — build input pour skill analyzeWayfinder ───
  const buildWayfinderInput = useCallback((): WayfinderAnalyzeInput | null => {
    if (!parsedPlan) return null
    const { graph } = buildWayfinderGraph({ parsedPlan })
    return {
      navGraph: graph,
      usageLogs: routeHistory,
      allRefIds: catalogItems.map(c => c.id),
    }
  }, [parsedPlan, routeHistory, catalogItems])

  // Rehydrate plan image backgrounds (pattern Vol.1)
  useEffect(() => {
    void loadAllPlanImages()
  }, [])

  // Construire catalogue & index quand le ParsedPlan change
  useEffect(() => {
    if (!parsedPlan) {
      setCatalog([])
      setSearchIndex(null)
      return
    }
    const items = buildWayfinderCatalog({ parsedPlan })
    setCatalog(items)
    setSearchIndex(buildSearchIndex(items))
  }, [parsedPlan, setCatalog, setSearchIndex])

  return (
    <div className="flex h-full" style={{ background: '#080c14', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r overflow-y-auto"
        style={{ background: '#0b1120', borderColor: '#1e2a3a' }}>
        {/* Back button */}
        <button
          onClick={() => navigate('/projects/cosmos-angre')}
          className="flex items-center gap-2 px-4 py-3 text-[12px] text-slate-400 hover:text-white transition-colors border-b"
          style={{ borderColor: '#1e2a3a' }}
        >
          <ArrowLeft size={14} />
          Atlas BIM
        </button>

        {/* Volume header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#1e2a3a' }}>
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={16} style={{ color: '#0ea5e9' }} />
            <span className="text-[11px] tracking-[0.15em] font-semibold" style={{ color: '#0ea5e9' }}>VOL. 4</span>
          </div>
          <h2 className="text-white font-bold text-[15px]">Wayfinder</h2>
          <p className="text-[10px] text-slate-500 mt-0.5">GPS intérieur · Mobile · Web · Bornes</p>
        </div>

        {/* Platform switcher */}
        <div className="px-3 py-3 border-b" style={{ borderColor: '#1e2a3a' }}>
          <div className="text-[9px] text-slate-500 tracking-wider uppercase mb-1.5">Plateforme</div>
          <div className="flex gap-1 bg-surface-0/40 rounded-lg p-1">
            {([
              { id: 'mobile', icon: Smartphone, label: 'Mobile' },
              { id: 'web',    icon: Globe, label: 'Web' },
              { id: 'kiosk',  icon: Monitor, label: 'Borne' },
            ] as const).map(p => {
              const Icon = p.icon
              const active = activePlatform === p.id
              return (
                <button key={p.id} onClick={() => setPlatform(p.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded text-[9px] font-medium transition ${
                    active ? 'bg-sky-500/20 text-sky-300' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={p.label}
                >
                  <Icon size={12} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-2 space-y-3 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon
            return (
              <div
                key={group.key}
                className={group.separator ? 'pt-3 border-t' : ''}
                style={group.separator ? { borderColor: '#1e2a3a' } : undefined}
              >
                <div className="flex items-center gap-1.5 px-2 mb-1.5">
                  <GroupIcon size={11} style={{ color: group.color }} />
                  <span className="text-[9px] tracking-[0.15em] font-semibold" style={{ color: group.color }}>
                    {group.label}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                        style={{
                          background: isActive ? `${group.color}12` : 'transparent',
                          color: isActive ? group.color : '#4a5568',
                          border: `1px solid ${isActive ? `${group.color}30` : 'transparent'}`,
                        }}
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Plan model selector (commun aux volumes) */}
        <div className="px-3 py-2 border-t" style={{ borderColor: '#1e2a3a' }}>
          <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1.5">Modèle de plan</p>
          <PlanModelSelector projectId="cosmos-angre" accentColor="#0ea5e9" />
        </div>

        {/* Save status */}
        <div className="px-4 py-2 border-t" style={{ borderColor: '#1e2a3a' }}>
          <SaveStatusIndicator status="saved" />
        </div>

        {/* Proph3t badge */}
        <div className="p-3 m-2 rounded-lg"
          style={{ background: 'rgba(179,138,90,0.06)', border: '1px solid rgba(179,138,90,0.15)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={12} className="text-atlas-400" />
            <span className="text-[10px] font-medium text-atlas-300">Proph3t Wayfinder</span>
          </div>
          <p className="text-[9px] text-slate-500">
            A* bidirectionnel · EKF WiFi+BLE+PDR · CUSUM flux
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Suspense fallback={<Loading />}>
          {activeTab === 'plan_imports' && (
            <div className="h-full overflow-y-auto">
              <PlanImportsSectionLazy
                volumeColor="#0ea5e9"
                volumeLabel="VOL. 4 — WAYFINDER"
                floors={[
                  { id: 'floor-b1',  level: 'B1'  as any, order: 0, widthM: 180, heightM: 120, zones: [], transitions: [] },
                  { id: 'floor-rdc', level: 'RDC' as any, order: 1, widthM: 200, heightM: 140, zones: [], transitions: [] },
                  { id: 'floor-r1',  level: 'R+1' as any, order: 2, widthM: 200, heightM: 140, zones: [], transitions: [] },
                ]}
                activeFloorId="floor-rdc"
                onImportComplete={(importedZones, dims, calibration, floorId, planImageUrl, _fileInfo, parsedPlanFromImport, importId) => {
                  const plan = parsedPlanFromImport ?? buildParsedPlanFromImport(importedZones, dims, calibration)
                  usePlanEngineStore.getState().setParsedPlan(plan)
                  usePlanEngineStore.getState().setSpaces(plan.spaces)
                  usePlanEngineStore.getState().setLayers(plan.layers)
                  if (planImageUrl) void savePlanImageFromUrl(floorId, planImageUrl, 'plan-import.png')
                  if (importId) usePlanEngineStore.getState().storeParsedPlan(importId, plan)
                }}
              />
            </div>
          )}

          {activeTab === 'plan' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-3 border-b border-white/[0.05] flex items-center gap-3">
                <div className="flex-1">
                  <h2 className="text-white text-sm font-semibold">Plan interactif</h2>
                  <p className="text-[10px] text-slate-500">
                    {planSubView === 'wayfinder'
                      ? 'Itinéraire en temps réel · position · bornes'
                      : 'Carte unifiée — 2D · 3D · AR · Annotations · Visites guidées'}
                  </p>
                </div>

                {/* Sub-view toggle */}
                <div className="flex items-center gap-0.5 bg-surface-1 border border-white/[0.08] rounded-lg p-0.5">
                  <button
                    onClick={() => setPlanSubView('wayfinder')}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all',
                      planSubView === 'wayfinder'
                        ? 'bg-sky-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white',
                    ].join(' ')}
                  >
                    <Navigation size={11} /> Wayfinder
                  </button>
                  <button
                    onClick={() => setPlanSubView('carte')}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-medium transition-all',
                      planSubView === 'carte'
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white',
                    ].join(' ')}
                  >
                    <MapIcon size={11} /> Carte
                  </button>
                </div>

                <PlatformBadge platform={activePlatform} />
              </div>
              <div className="flex-1 min-h-0">
                {planSubView === 'wayfinder' && <WayfinderMapViewLazy />}
                {planSubView === 'carte'     && <MapViewerShellLazy className="h-full" />}
              </div>
            </div>
          )}

          {activeTab === 'search' && <RouteSearchSectionLazy />}
          {activeTab === 'positioning' && <PositioningSectionLazy />}
          {activeTab === 'persona' && <PersonaSectionLazy />}
          {activeTab === 'kiosk' && <KioskSectionLazy />}
          {activeTab === 'designer' && <WayfinderDesignerViewLazy />}
          {activeTab === 'orchestration' && (
            <OrchestrationPanelLazy projetId="cosmos-angre" parsedPlan={parsedPlan} />
          )}
          {activeTab === 'proph3t' && <Proph3tWayfinderSectionLazy />}
          {activeTab === 'rapport' && <Proph3tWayfinderSectionLazy />}
          {activeTab === 'chat' && <Proph3tWayfinderSectionLazy />}
          {activeTab === 'god_mode_signage' && <GodModeSignageHostLazy />}
          {activeTab === 'history' && (
            <VolumeHistoryTabLazy volumeId="vol4" volumeColor="#0ea5e9" volumeName="Wayfinder" />
          )}
          {activeTab === 'reports' && (
            <VolumeReportsTabLazy
              volumeId="vol4"
              volumeColor="#0ea5e9"
              volumeName="Wayfinder"
              projectName="The Mall"
            />
          )}
        </Suspense>
      </main>

      {/* Proph3t Vol.4 docked panel (bouton "Analyser" → runSkill('analyzeWayfinder')) */}
      <Proph3tVolumePanel
        volume="wayfinder"
        buildInput={buildWayfinderInput}
        title="PROPH3T · Vol.4 Wayfinder"
        position="right"
      />
    </div>
  )
}

function PlatformBadge({ platform }: { platform: 'mobile' | 'web' | 'kiosk' }) {
  const meta = {
    mobile: { icon: Smartphone, label: 'Mobile (iOS/Android)', color: '#34d399' },
    web:    { icon: Globe, label: 'Web responsive', color: '#38bdf8' },
    kiosk:  { icon: Monitor, label: 'Borne interactive', color: '#c084fc' },
  }[platform]
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]"
      style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}>
      <Icon size={11} />
      {meta.label}
    </div>
  )
}
