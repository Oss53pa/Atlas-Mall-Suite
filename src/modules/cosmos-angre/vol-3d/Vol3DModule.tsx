import React, { lazy, Suspense, useEffect, useMemo } from 'react'
import { useVol3DStore } from './store/vol3dStore'
import { useVol2Store } from '../vol2-securitaire/store/vol2Store'
import { useVol3Store } from '../vol3-parcours/store/vol3Store'
import { usePlanEngineStore } from '../shared/stores/planEngineStore'
import ModeSwitch from './components/ModeSwitch'
import LayerControls from './components/LayerControls'
import ExportPanel3D from './components/ExportPanel3D'
import LightingControls from './components/LightingControls'
import HeightEditor from './components/HeightEditor'
import FloorStackControls from './components/FloorStackControls'
import CameraControls3D from './components/CameraControls3D'
import { resolveZoneHeights, resolveFloorElevations } from './engines/heightResolver'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Box } from 'lucide-react'

const IsometricView = lazy(() => import('./modes/IsometricView'))
const PerspectiveView = lazy(() => import('./modes/PerspectiveView'))
const RealisticView = lazy(() => import('./modes/RealisticView'))

export default function Vol3DModule() {
  const navigate = useNavigate()
  const config = useVol3DStore(s => s.config)
  const setFloorStack = useVol3DStore(s => s.setFloorStack)
  const setZoneHeights = useVol3DStore(s => s.setZoneHeights)
  const userOvrd = useVol3DStore(s => s.userHeightOverrides)
  const isBuilding = useVol3DStore(s => s.isBuilding)
  const lastBuildMs = useVol3DStore(s => s.lastBuildMs)

  const floors = useVol2Store(s => s.floors)
  const storeZones = useVol2Store(s => s.zones)
  const cameras = useVol2Store(s => s.cameras)
  const doors = useVol2Store(s => s.doors)
  const transitions = useVol2Store(s => s.transitions)
  const pois = useVol3Store(s => s.pois)
  const signageItems = useVol3Store(s => s.signageItems)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)

  // When a real plan is imported, convert ParsedPlan spaces → Zone format for 3D
  const zones = useMemo(() => {
    if (!parsedPlan || parsedPlan.spaces.length === 0) return storeZones
    return parsedPlan.spaces.map((sp, i) => ({
      id: sp.id,
      floorId: floors[0]?.id ?? 'floor-rdc',
      label: sp.label,
      type: sp.type as any,
      x: sp.bounds.minX,
      y: sp.bounds.minY,
      w: sp.bounds.width,
      h: sp.bounds.height,
      niveau: 2 as any,
      color: sp.color ?? '#3b82f6',
      surfaceM2: sp.areaSqm,
    }))
  }, [parsedPlan, storeZones, floors])

  // Use parsed plan dimensions for floor size when available
  const effectiveFloors = useMemo(() => {
    if (!parsedPlan || floors.length === 0) return floors
    return floors.map(f => ({
      ...f,
      widthM: parsedPlan.bounds.width || f.widthM,
      heightM: parsedPlan.bounds.height || f.heightM,
    }))
  }, [floors, parsedPlan])

  useEffect(() => {
    if (effectiveFloors.length === 0) return
    const elevations = resolveFloorElevations(effectiveFloors.map(f => ({ id: f.id, level: f.level, order: f.order })))
    setFloorStack(effectiveFloors.map(f => ({ floorId: f.id, level: f.level, baseElevationM: elevations[f.id] ?? 0, visible: true, opacity: 1 })))
    setZoneHeights(resolveZoneHeights(zones, null, userOvrd))
  }, [effectiveFloors, zones])

  const viewProps = { floors: effectiveFloors, zones, cameras, doors, pois, signageItems, transitions, config }

  return (
    <div className="flex h-full" style={{ background: '#080c14', color: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/10 flex flex-col overflow-y-auto" style={{ background: '#0b1120' }}>
        <button onClick={() => navigate('/projects/cosmos-angre')} className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 hover:text-white border-b border-white/5">
          <ArrowLeft size={14} /> Atlas Mall Suite
        </button>
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Box size={16} style={{ color: '#a78bfa' }} />
            <span className="text-[11px] tracking-[0.15em] font-semibold" style={{ color: '#a78bfa' }}>VUE 3D</span>
          </div>
          <p className="text-[10px] text-slate-500">Isometrique · Perspective · Semi-realiste</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ModeSwitch />
          {config.mode !== 'isometric' && <CameraControls3D />}
          <LightingControls />
          <FloorStackControls floors={effectiveFloors} />
          <LayerControls />
          <HeightEditor zones={zones} />
        </div>
        <div className="p-3 border-t border-white/5">
          <ExportPanel3D />
        </div>
        {/* Build indicator */}
        <div className="px-4 py-2 text-[10px] text-white/20 border-t border-white/5">
          {isBuilding ? 'Construction 3D...' : `Build: ${lastBuildMs.toFixed(0)}ms`} · {zones.length} zones · {cameras.length} cameras
        </div>
      </aside>

      {/* Render area */}
      <main className="flex-1 relative overflow-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-white/40 text-sm">Chargement du moteur 3D...</div></div>}>
          {config.mode === 'isometric' && <IsometricView {...viewProps} />}
          {config.mode === 'perspective' && <PerspectiveView {...viewProps} />}
          {config.mode === 'realistic' && <RealisticView {...viewProps} />}
        </Suspense>
      </main>
    </div>
  )
}
