import type {
  Zone, Camera, Door, POI, SignageItem,
  Floor, TransitionNode, BlindSpot
} from '../../proph3t/types'

export type RenderMode     = 'isometric' | 'perspective' | 'realistic' | 'photorealistic'
export type UsageContext   = 'conception' | 'presentation'
export type LightingPreset =
  | 'day_natural' | 'day_overcast'
  | 'evening_commercial' | 'night_security' | 'presentation'
export type ViewAnglePreset =
  | 'iso_standard' | 'iso_nw' | 'iso_ne'
  | 'bird_eye' | 'entrance' | 'food_court' | 'custom'

export type SourceVolume = 'vol1' | 'vol2' | 'vol3'

export interface View3DData {
  sourceVolume: SourceVolume
  floors:       Floor[]
  zones:        Zone[]
  transitions:  TransitionNode[]
  tenants?:     TenantInfo[]
  cameras?:     Camera[]
  doors?:       Door[]
  blindSpots?:  BlindSpot[]
  pois?:        POI[]
  signageItems?: SignageItem[]
  moments?:     { id: string; x: number; y: number; floorId: string; number: number; name: string }[]
  wayfindingPaths?: { id: string; path: [number, number][]; floorId: string; color: string }[]
}

export interface TenantInfo {
  spaceId:    string
  brandName:  string
  sector:     string
  status:     'occupied' | 'vacant' | 'reserved' | 'under_works'
  surfaceM2:  number
}

export interface View3DConfig {
  mode:                 RenderMode
  context:              UsageContext
  lighting:             LightingPreset
  viewAngle:            ViewAnglePreset
  showZones:            boolean
  showFloorLabels:      boolean
  showTransitions:      boolean
  showDimensions:       boolean
  showOccupancyColors:  boolean
  showTenantNames:      boolean
  showVacantHighlight:  boolean
  showCameras:          boolean
  showCameraFOV:        boolean
  showBlindSpots:       boolean
  showDoors:            boolean
  showPOI:              boolean
  showSignage:          boolean
  showMoments:          boolean
  showWayfinding:       boolean
  floorStack:           FloorStackConfig[]
  zoneHeights:          ZoneHeight[]
  shadowsEnabled:       boolean
  ssaoEnabled:          boolean
  bloomEnabled:         boolean
  backgroundColor:      string
}

export interface ZoneHeight {
  zoneId:          string
  heightM:         number
  floorThicknessM: number
  hasGlazing:      boolean
  roofType:        'flat' | 'none'
}

export interface FloorStackConfig {
  floorId:        string
  level:          string
  baseElevationM: number
  visible:        boolean
  opacity:        number
}

export interface ExtrudedZone {
  zone:    Zone
  height:  ZoneHeight
  colors:  { top: string; left: string; right: string; front: string }
  iso: {
    topFace:   [number, number][]
    leftFace:  [number, number][]
    rightFace: [number, number][]
    frontFace: [number, number][]
  }
  label?:       string
  labelColor?:  string
}

export interface IsoScene {
  viewBox:        { x: number; y: number; w: number; h: number }
  extrudedZones:  ExtrudedZone[]
  entities:       IsoEntity[]
  gridLines:      [number, number][][]
  scaleFactor:    number
}

export interface IsoEntity {
  id:        string
  type:      'camera' | 'poi' | 'signage' | 'transition' | 'moment' | 'door' | 'blindspot'
  isoX:      number
  isoY:      number
  elevation: number
  label:     string
  color:     string
  opacity?:  number
}

export const CONCEPTION_DEFAULTS: Partial<View3DConfig> = {
  context: 'conception',
  showFloorLabels: true, showDimensions: true,
  showCameras: true, showCameraFOV: true, showBlindSpots: true, showDoors: true,
  showOccupancyColors: true, showTenantNames: true, showVacantHighlight: true,
  showPOI: true, showSignage: true, showMoments: true, showWayfinding: false,
  lighting: 'day_natural', ssaoEnabled: false, bloomEnabled: false,
}

export const PRESENTATION_DEFAULTS: Partial<View3DConfig> = {
  context: 'presentation',
  showFloorLabels: false, showDimensions: false,
  showCameras: false, showCameraFOV: false, showBlindSpots: false, showDoors: false,
  showOccupancyColors: true, showTenantNames: true, showVacantHighlight: false,
  showPOI: true, showSignage: true, showMoments: false, showWayfinding: false,
  lighting: 'evening_commercial', ssaoEnabled: true, bloomEnabled: false,
}
