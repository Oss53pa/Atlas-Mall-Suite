import type { Zone, Camera, Door, POI, SignageItem, Floor, TransitionNode } from '../../shared/proph3t/types'

export type RenderMode = 'isometric' | 'perspective' | 'realistic'

export type LightingPreset = 'day_natural' | 'day_overcast' | 'evening_commercial' | 'night_security' | 'presentation'

export type ViewAnglePreset =
  | 'iso_standard'
  | 'iso_north_west'
  | 'iso_north_east'
  | 'bird_eye'
  | 'entrance'
  | 'food_court'
  | 'custom'

export interface ZoneHeight {
  zoneId: string
  heightM: number
  floorThicknessM: number
  hasGlazing: boolean
  roofType: 'flat' | 'none'
}

export interface FloorStackConfig {
  floorId: string
  level: string
  baseElevationM: number
  visible: boolean
  opacity: number
}

export interface SceneConfig {
  mode: RenderMode
  lighting: LightingPreset
  viewAngle: ViewAnglePreset
  showZones: boolean
  showCameras: boolean
  showCameraFOV: boolean
  showPOI: boolean
  showSignage: boolean
  showTransitions: boolean
  showFloorLabels: boolean
  showDimensions: boolean
  floorStack: FloorStackConfig[]
  zoneHeights: ZoneHeight[]
  shadowsEnabled: boolean
  ssaoEnabled: boolean
  backgroundColor: string
}

export interface ExtrudedZone {
  zone: Zone
  height: ZoneHeight
  vertices: {
    bottomFace: [number, number, number][]
    topFace: [number, number, number][]
    sideFaces: [number, number, number][][]
  }
  iso: {
    topFaceScreen: [number, number][]
    leftFaceScreen: [number, number][]
    rightFaceScreen: [number, number][]
    frontFaceScreen: [number, number][]
  }
  colors: {
    top: string
    left: string
    right: string
    front: string
  }
}

export interface IsoScene {
  viewBox: { x: number; y: number; w: number; h: number }
  extrudedZones: ExtrudedZone[]
  cameras3D: IsoEntity[]
  pois3D: IsoEntity[]
  signage3D: IsoEntity[]
  transitions3D: IsoEntity[]
  gridLines: [number, number][][]
  scaleFactor: number
}

export interface IsoEntity {
  id: string
  type: 'camera' | 'poi' | 'signage' | 'transition'
  isoX: number
  isoY: number
  elevation: number
  label: string
  icon: string
  color: string
}
