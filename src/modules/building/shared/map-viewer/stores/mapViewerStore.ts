// ═══ MAP VIEWER STORE — Mode switcher 2D / 3D / AR ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FloorLevelKey } from '../../proph3t/libraries/spaceTypeLibrary'

export type MapMode = '2d' | '3d' | 'ar'

interface MapViewerState {
  /** Current visualization mode */
  mode: MapMode
  /** When set, only this floor is fully visible in 3D stack */
  isolatedFloorId: string | null
  /** True while the cross-fade transition plays */
  isTransitioning: boolean
  /** WebXR session active */
  arSessionActive: boolean
  /** AR spatial anchor confirmed */
  arAnchorSet: boolean
  /** Active floor for 2D viewer */
  activeFloor: FloorLevelKey
  /** Show annotation layer in 2D viewer */
  showAnnotations: boolean
  /** Show service/utility spaces in 2D viewer */
  showUtilities: boolean
  /** Show parking in 2D viewer */
  showParking: boolean
  /** Zoom level (pixels per metre) for 2D viewer */
  zoom2d: number

  setMode: (mode: MapMode) => void
  setIsolatedFloor: (floorId: string | null) => void
  setTransitioning: (v: boolean) => void
  setArSession: (active: boolean) => void
  setArAnchor: (anchored: boolean) => void
  setActiveFloor: (floor: FloorLevelKey) => void
  toggleAnnotations: () => void
  toggleUtilities: () => void
  toggleParking: () => void
  setZoom2d: (z: number) => void
}

export const useMapViewerStore = create<MapViewerState>()(
  persist(
    (set) => ({
      mode: '2d',
      isolatedFloorId: null,
      isTransitioning: false,
      arSessionActive: false,
      arAnchorSet: false,
      activeFloor: 'rdc',
      showAnnotations: true,
      showUtilities: false,
      showParking: true,
      zoom2d: 6,

      setMode: (mode) => set({ mode }),
      setIsolatedFloor: (isolatedFloorId) => set({ isolatedFloorId }),
      setTransitioning: (isTransitioning) => set({ isTransitioning }),
      setArSession: (arSessionActive) => set({ arSessionActive }),
      setArAnchor: (arAnchorSet) => set({ arAnchorSet }),
      setActiveFloor: (activeFloor) => set({ activeFloor }),
      toggleAnnotations: () => set((s) => ({ showAnnotations: !s.showAnnotations })),
      toggleUtilities: () => set((s) => ({ showUtilities: !s.showUtilities })),
      toggleParking: () => set((s) => ({ showParking: !s.showParking })),
      setZoom2d: (zoom2d) => set({ zoom2d: Math.max(1, Math.min(50, zoom2d)) }),
    }),
    { name: 'atlas-map-viewer-v1' },
  ),
)
