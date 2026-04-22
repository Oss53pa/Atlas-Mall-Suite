import { useState, useCallback, useEffect } from 'react'
import type { View3DConfig, View3DData, RenderMode, UsageContext } from '../types/view3dTypes'
import { CONCEPTION_DEFAULTS, PRESENTATION_DEFAULTS } from '../types/view3dTypes'
import { resolveZoneHeights, resolveFloorElevations } from '../engines/heightResolver'

const BASE_CONFIG: View3DConfig = {
  mode: 'isometric', context: 'conception',
  lighting: 'day_natural', viewAngle: 'iso_standard',
  showZones: true, showFloorLabels: true, showTransitions: true, showDimensions: false,
  showOccupancyColors: true, showTenantNames: true, showVacantHighlight: true,
  showCameras: true, showCameraFOV: true, showBlindSpots: true, showDoors: true,
  showPOI: true, showSignage: true, showMoments: true, showWayfinding: false,
  floorStack: [], zoneHeights: [],
  shadowsEnabled: true, ssaoEnabled: false, bloomEnabled: false,
  backgroundColor: '#080c14',
  explodeLevel: 0, isolatedFloorId: null,
  // These fields are initialised later from CONCEPTION_DEFAULTS / data
  showPeople: false, showFurniture: false, showVegetation: false,
  showAnnotationNumbers: false, showFloorTiles: false, showFacadeSigns: false,
  populationDensity: 1.0, mallName: 'COSMOS ANGRE', accentColor: '#b8d44a',
}

export function useView3D(data: View3DData) {
  const [config, setConfig] = useState<View3DConfig>(BASE_CONFIG)
  const [userHeights, setUserHeights] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!data.floors.length) return
    const elevations = resolveFloorElevations(
      data.floors.map(f => ({ id: f.id, level: f.level, order: f.order }))
    )
    setConfig(c => ({
      ...c,
      floorStack: data.floors.map(f => {
        const defaultH: Record<string, number> = { 'B2': 3.0, 'B1': 3.0, 'RDC': 5.5, 'R+1': 4.5, 'R+2': 4.0, 'R+3': 4.0 }
        return {
          floorId: f.id, level: f.level,
          baseElevationM: elevations[f.id] ?? 0,
          visible: true, opacity: 1,
          heightM: defaultH[f.level] ?? 4.0,
        }
      }),
      zoneHeights: resolveZoneHeights(data.zones, null, {}),
    }))
  }, [data.floors.length, data.zones.length])

  useEffect(() => {
    if (!data.zones.length) return
    setConfig(c => ({
      ...c,
      zoneHeights: resolveZoneHeights(data.zones, null, userHeights),
    }))
  }, [userHeights, data.zones.length])

  const setMode = useCallback((mode: RenderMode) => {
    setConfig(c => ({
      ...c, mode,
      ssaoEnabled: mode === 'realistic' || mode === 'photorealistic',
      bloomEnabled: mode === 'photorealistic',
    }))
  }, [])

  const setContext = useCallback((context: UsageContext) => {
    const defaults = context === 'conception' ? CONCEPTION_DEFAULTS : PRESENTATION_DEFAULTS
    setConfig(c => ({ ...c, ...defaults, context }))
  }, [])

  const toggleLayer = useCallback((key: keyof View3DConfig) => {
    setConfig(c => ({ ...c, [key]: !c[key] }))
  }, [])

  const setZoneHeight = useCallback((zoneId: string, h: number) => {
    setUserHeights(o => ({ ...o, [zoneId]: h }))
  }, [])

  const setFloorVisible = useCallback((floorId: string, visible: boolean) => {
    setConfig(c => ({
      ...c,
      floorStack: c.floorStack.map(f => f.floorId === floorId ? { ...f, visible } : f),
    }))
  }, [])

  const setFloorOpacity = useCallback((floorId: string, opacity: number) => {
    setConfig(c => ({
      ...c,
      floorStack: c.floorStack.map(f => f.floorId === floorId ? { ...f, opacity } : f),
    }))
  }, [])

  /**
   * Isolate a floor — fades all other floors to 0.08 opacity.
   * Pass null to clear isolation (restores all to 1.0).
   */
  const setIsolatedFloor = useCallback((floorId: string | null) => {
    setConfig(c => ({
      ...c,
      isolatedFloorId: floorId,
      floorStack: c.floorStack.map(f => ({
        ...f,
        opacity: floorId === null ? 1 : f.floorId === floorId ? 1 : 0.08,
      })),
    }))
  }, [])

  /** 0 = stacked, 1 = fully exploded. Clamped to [0, 1]. */
  const setExplodeLevel = useCallback((level: number) => {
    setConfig(c => ({ ...c, explodeLevel: Math.max(0, Math.min(1, level)) }))
  }, [])

  return {
    config, setMode, setContext, toggleLayer,
    setZoneHeight, setFloorVisible, setFloorOpacity,
    setIsolatedFloor, setExplodeLevel,
    setLighting:  (v: View3DConfig['lighting'])  => setConfig(c => ({ ...c, lighting: v })),
    setViewAngle: (v: View3DConfig['viewAngle']) => setConfig(c => ({ ...c, viewAngle: v })),
  }
}
