import { create } from 'zustand'
import type { RenderMode, LightingPreset, ViewAnglePreset, SceneConfig, ZoneHeight, FloorStackConfig } from './vol3dTypes'

interface Vol3DStore {
  config: SceneConfig
  isBuilding: boolean
  lastBuildMs: number
  userHeightOverrides: Record<string, number>
  setMode: (mode: RenderMode) => void
  setLighting: (preset: LightingPreset) => void
  setViewAngle: (preset: ViewAnglePreset) => void
  toggleLayer: (layer: 'showZones' | 'showCameras' | 'showCameraFOV' | 'showPOI' | 'showSignage' | 'showTransitions' | 'showFloorLabels' | 'showDimensions') => void
  setFloorStack: (stack: FloorStackConfig[]) => void
  setFloorVisible: (floorId: string, visible: boolean) => void
  setFloorOpacity: (floorId: string, opacity: number) => void
  setZoneHeight: (zoneId: string, heightM: number) => void
  resetHeights: () => void
  setZoneHeights: (heights: ZoneHeight[]) => void
  toggleShadows: () => void
  toggleSSAO: () => void
  setBuilding: (v: boolean) => void
  setBuildTime: (ms: number) => void
}

export const useVol3DStore = create<Vol3DStore>((set) => ({
  config: {
    mode: 'isometric', lighting: 'presentation', viewAngle: 'iso_standard',
    showZones: true, showCameras: true, showCameraFOV: true, showPOI: true,
    showSignage: true, showTransitions: true, showFloorLabels: true, showDimensions: false,
    floorStack: [], zoneHeights: [], shadowsEnabled: true, ssaoEnabled: false, backgroundColor: '#080c14',
  },
  isBuilding: false, lastBuildMs: 0, userHeightOverrides: {},

  setMode: (mode) => set(s => ({ config: { ...s.config, mode } })),
  setLighting: (lighting) => set(s => ({ config: { ...s.config, lighting } })),
  setViewAngle: (viewAngle) => set(s => ({ config: { ...s.config, viewAngle } })),
  toggleLayer: (layer) => set(s => ({ config: { ...s.config, [layer]: !s.config[layer] } })),
  setFloorStack: (floorStack) => set(s => ({ config: { ...s.config, floorStack } })),
  setZoneHeights: (zoneHeights) => set(s => ({ config: { ...s.config, zoneHeights } })),
  setFloorVisible: (floorId, visible) => set(s => ({ config: { ...s.config, floorStack: s.config.floorStack.map(f => f.floorId === floorId ? { ...f, visible } : f) } })),
  setFloorOpacity: (floorId, opacity) => set(s => ({ config: { ...s.config, floorStack: s.config.floorStack.map(f => f.floorId === floorId ? { ...f, opacity } : f) } })),
  setZoneHeight: (zoneId, heightM) => set(s => ({ userHeightOverrides: { ...s.userHeightOverrides, [zoneId]: heightM }, config: { ...s.config, zoneHeights: s.config.zoneHeights.map(h => h.zoneId === zoneId ? { ...h, heightM } : h) } })),
  resetHeights: () => set({ userHeightOverrides: {} }),
  toggleShadows: () => set(s => ({ config: { ...s.config, shadowsEnabled: !s.config.shadowsEnabled } })),
  toggleSSAO: () => set(s => ({ config: { ...s.config, ssaoEnabled: !s.config.ssaoEnabled } })),
  setBuilding: (v) => set({ isBuilding: v }),
  setBuildTime: (ms) => set({ lastBuildMs: ms }),
}))
