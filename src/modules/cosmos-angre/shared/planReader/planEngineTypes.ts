// ═══ PLAN ENGINE — Core types for the vectorial plan system ═══
// Used by: PlanCanvas, SpaceOverlay, SpaceEditPanel, ObjectPlacer, SceneEngine

import type { SpaceType } from '../proph3t/types'

// ─── GEOMETRY ─────────────────────────────────────────────

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface ViewportState {
  scale: number
  offsetX: number
  offsetY: number
  rotation: number
}

export type LODLevel = 'minimal' | 'medium' | 'full' | 'ultra'

// ─── PLAN ENTITIES (parsed from DWG/DXF/PDF) ─────────────

export type PlanEntityType =
  | 'LINE'
  | 'LWPOLYLINE'
  | 'POLYLINE2D'
  | 'CIRCLE'
  | 'ARC'
  | 'ELLIPSE'
  | 'TEXT'
  | 'MTEXT'
  | 'DIMENSION'
  | 'HATCH'
  | 'INSERT'
  | 'SPLINE'

export interface PlanEntity {
  id: string
  type: PlanEntityType
  layer: string
  geometry: PlanGeometry
  bounds: Bounds
  visible: boolean
  color?: string
}

export type PlanGeometry =
  | LineGeometry
  | PolylineGeometry
  | CircleGeometry
  | ArcGeometry
  | TextGeometry
  | DimensionGeometry
  | HatchGeometry
  | InsertGeometry

export interface LineGeometry {
  kind: 'line'
  x1: number; y1: number
  x2: number; y2: number
}

export interface PolylineGeometry {
  kind: 'polyline'
  vertices: Array<{ x: number; y: number; bulge?: number }>
  closed: boolean
}

export interface CircleGeometry {
  kind: 'circle'
  cx: number; cy: number
  radius: number
}

export interface ArcGeometry {
  kind: 'arc'
  cx: number; cy: number
  radius: number
  startAngle: number // degrees
  endAngle: number   // degrees
}

export interface TextGeometry {
  kind: 'text'
  x: number; y: number
  text: string
  height: number
  rotation?: number
}

export interface DimensionGeometry {
  kind: 'dimension'
  defPoint1: [number, number]
  defPoint2: [number, number]
  textPosition: [number, number]
  measurement: number // in drawing units
  text?: string
}

export interface HatchGeometry {
  kind: 'hatch'
  boundaries: HatchBoundary[]
  patternName?: string
}

export interface HatchBoundary {
  type: 'polyline' | 'edges'
  vertices: Array<{ x: number; y: number }>
  closed: boolean
}

export interface InsertGeometry {
  kind: 'insert'
  blockName: string
  x: number; y: number
  scaleX: number; scaleY: number
  rotation: number
}

// ─── PLAN LAYER ───────────────────────────────────────────

export interface PlanLayer {
  name: string
  visible: boolean
  locked: boolean
  color?: string
  category: LayerCategory
}

export type LayerCategory =
  | 'structure'    // murs, poteaux, dalles
  | 'partition'    // cloisons, portes, fenetres
  | 'space'        // locaux, zones
  | 'dimension'    // cotes
  | 'text'         // annotations, labels
  | 'equipment'    // mobilier, technique
  | 'hatch'        // hachures
  | 'other'

// ─── DETECTED SPACE (polygon-based) ──────────────────────

export interface DetectedSpace {
  id: string
  polygon: [number, number][]  // vertices in metres (normalized)
  areaSqm: number
  label: string
  layer: string
  type: SpaceType
  bounds: Bounds
  color: string | null
  metadata: Record<string, unknown>
}

// ─── SPACE STATE (user edits) ─────────────────────────────

export type SpaceStatus = 'vacant' | 'occupied' | 'reserved' | 'works'

export interface SpaceState {
  color: string | null
  label: string
  tenantId?: string
  objects: PlacedObject[]
  notes: string
  status: SpaceStatus
}

// ─── PLACED OBJECTS ───────────────────────────────────────

export type ObjectCategory =
  | 'mobilier'
  | 'securite'
  | 'signaletique'
  | 'vegetation'
  | 'equipement'
  | 'custom'

export interface PlacedObject {
  id: string
  spaceId: string
  category: ObjectCategory
  type: string
  worldX: number
  worldY: number
  rotation: number
  scaleX: number
  scaleY: number
  color?: string
  label?: string
  metadata: Record<string, unknown>
}

export interface ObjectDefinition {
  id: string
  category: ObjectCategory
  label: string
  w: number  // metres
  h: number  // metres
  svg: string
}

// ─── PARSED PLAN (complete result) ────────────────────────

export interface ParsedPlan {
  entities: PlanEntity[]
  layers: PlanLayer[]
  spaces: DetectedSpace[]
  bounds: Bounds
  unitScale: number  // multiplier to convert drawing units → metres
  detectedUnit: 'mm' | 'cm' | 'm' | 'ft' | 'in' | 'unknown'
  wallSegments: WallSegment[]
  /** Rendered plan image URL (SVG/PNG blob from import pipeline) */
  planImageUrl?: string
  /** Blob URL of raw DXF file for WebGL DxfViewer rendering */
  dxfBlobUrl?: string
}

export interface WallSegment {
  x1: number; y1: number
  x2: number; y2: number
  thickness?: number
  layer: string
}

// ─── TOOLS ────────────────────────────────────────────────

export type PlanTool =
  | 'select'
  | 'hand'
  | 'zoom-in'
  | 'zoom-out'
  | 'measure'
  | 'draw-rect'
  | 'draw-poly'
  | 'place-object'
  | 'eraser'
  | 'text'

// ─── VIEW MODES ───────────────────────────────────────────

export type ViewMode = '2d' | '3d' | 'isometric' | 'tour'
