// ═══ TYPES LECTURE DE PLANS ═══

import type { SpaceType, Zone } from '../proph3t/types'

export type PlanSourceType = 'dxf' | 'dwg' | 'ifc' | 'pdf' | 'image_raster' | 'svg'

export type DimType =
  | 'lineaire'
  | 'alignee'
  | 'angulaire'
  | 'radiale'
  | 'diametrale'
  | 'ordinatee'

export interface DimEntity {
  id: string
  type: DimType
  value: number
  valueText: string
  unit: 'mm' | 'm' | 'cm' | 'inch' | 'unknown'
  confidence: number
  defPoint1: [number, number]
  defPoint2: [number, number]
  textPosition: [number, number]
  layer: string
  measuredDistance?: number
  linkedZoneId?: string
}

export interface CalibrationResult {
  scaleFactorX: number
  scaleFactorY: number
  realWidthM: number
  realHeightM: number
  confidence: number
  method: 'dim_auto' | 'dim_manual' | 'ifc_native' | 'user_input'
  samplesUsed: number
  outlierCount: number
  issues: string[]
}

export interface PDFPlanPage {
  pageNumber: number
  width: number
  height: number
  paths: PDFPath[]
  texts: PDFText[]
  estimatedFloorLevel?: string
}

export interface PDFPath {
  id: string
  commands: PathCommand[]
  strokeColor?: string
  fillColor?: string
  lineWidth: number
  isClosed: boolean
  boundingBox: BoundingBox
  estimatedType?: 'wall' | 'zone_boundary' | 'dimension_line' | 'annotation' | 'equipment' | 'unknown'
}

export interface PDFText {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  fontName?: string
  estimatedRole?: 'room_label' | 'dimension' | 'title' | 'annotation' | 'scale' | 'unknown'
}

export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z'
  x?: number
  y?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface RasterRecognitionResult {
  zones: RecognizedZone[]
  walls: RecognizedWall[]
  doors: RecognizedDoor[]
  dimensions: RecognizedDimension[]
  scale?: RecognizedScale
  floorLevel?: string
  confidence: number
  proph3tNotes: string[]
  rawClaudeResponse: string
}

export interface RecognizedZone {
  id: string
  label: string
  estimatedType: SpaceType
  boundingBox: BoundingBox
  confidence: number
  color?: string
}

export interface RecognizedWall {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  thickness?: number
  confidence: number
}

export interface RecognizedDoor {
  id: string
  x: number
  y: number
  widthEstimated: number
  openingAngle?: number
  confidence: number
}

export interface RecognizedDimension {
  id: string
  valueText: string
  value?: number
  unit?: string
  x: number
  y: number
  confidence: number
}

export interface RecognizedScale {
  ratio: string
  value: number
  confidence: number
}

export interface CotationSpec {
  id: string
  type: 'linear' | 'aligned' | 'area' | 'radius'
  point1: [number, number]
  point2: [number, number]
  valueM: number
  displayText: string
  offsetPx: number
  textSizePt: number
  color: string
  arrowStyle: 'arrow' | 'tick' | 'dot'
  entityType: 'zone' | 'camera' | 'door' | 'signage' | 'transition'
  entityId: string
  linkedFloorId: string
}

export interface PlanImportState {
  step: 'upload' | 'detecting' | 'reviewing' | 'calibrating' | 'confirmed' | 'error'
  sourceType: PlanSourceType | null
  fileName: string
  fileSize: number
  progress: number
  currentOperation: string
  detectedZones: RecognizedZone[]
  detectedDims: DimEntity[]
  calibration: CalibrationResult | null
  pdfPages?: PDFPlanPage[]
  rasterResult?: RasterRecognitionResult
  errors: string[]
  warnings: string[]
}

export type { Zone, SpaceType }
