// ═══ CAD ENGINE — Types ═══

export interface Point {
  x: number
  y: number
}

// ── Drawing entities ─────────────────────────────────────────

export type CadEntityType = 'wall' | 'cloison' | 'zone' | 'rect_zone' | 'cotation' | 'text' | 'arrow' | 'door' | 'camera'

export interface CadEntity {
  id: string
  type: CadEntityType
  layer: string
  points: Point[]          // vertices — 2 for wall/line, N for polyline zone
  closed?: boolean         // true for zones
  label?: string
  color: string
  lineWidth: number
  fillColor?: string
  fillOpacity?: number
  // Metadata
  wallThickness?: number   // metres, for walls/cloisons
  surfaceM2?: number       // computed for zones
  textContent?: string     // for text annotations
  arrowEnd?: boolean       // for arrows
  dimValue?: number        // for cotation (distance in metres)
  locked?: boolean
  visible?: boolean
}

// ── Tools ────────────────────────────────────────────────────

export type CadTool =
  | 'select'
  | 'pan'
  | 'wall'
  | 'cloison'
  | 'zone_rect'
  | 'zone_poly'
  | 'cotation'
  | 'measure_distance'
  | 'measure_area'
  | 'text'
  | 'arrow'
  | 'door'
  | 'camera'
  | 'eraser'

export interface ToolConfig {
  id: CadTool
  label: string
  icon: string   // lucide icon name
  group: 'select' | 'draw' | 'measure' | 'annotate' | 'place'
  shortcut?: string
  cursor: string
}

export const TOOL_CONFIGS: ToolConfig[] = [
  // Select & pan
  { id: 'select',           label: 'Selectionner',      icon: 'MousePointer2', group: 'select', shortcut: 'V', cursor: 'default' },
  { id: 'pan',              label: 'Deplacer la vue',    icon: 'Hand',          group: 'select', shortcut: 'H', cursor: 'grab' },
  // Draw
  { id: 'wall',             label: 'Mur',                icon: 'Minus',         group: 'draw',   shortcut: 'W', cursor: 'crosshair' },
  { id: 'cloison',          label: 'Cloison',            icon: 'SeparatorVertical', group: 'draw', shortcut: 'C', cursor: 'crosshair' },
  { id: 'zone_rect',        label: 'Zone rectangle',     icon: 'Square',        group: 'draw',   shortcut: 'R', cursor: 'crosshair' },
  { id: 'zone_poly',        label: 'Zone polygone',      icon: 'Pentagon',      group: 'draw',   shortcut: 'P', cursor: 'crosshair' },
  { id: 'door',             label: 'Porte',              icon: 'DoorOpen',      group: 'place',  shortcut: 'D', cursor: 'crosshair' },
  // Measure
  { id: 'cotation',         label: 'Cotation',           icon: 'Ruler',         group: 'measure', shortcut: 'T', cursor: 'crosshair' },
  { id: 'measure_distance', label: 'Distance',           icon: 'Move',          group: 'measure', shortcut: 'M', cursor: 'crosshair' },
  { id: 'measure_area',     label: 'Surface',            icon: 'Scan',          group: 'measure', shortcut: 'A', cursor: 'crosshair' },
  // Annotate
  { id: 'text',             label: 'Texte',              icon: 'Type',          group: 'annotate', shortcut: 'X', cursor: 'text' },
  { id: 'arrow',            label: 'Fleche',             icon: 'ArrowUpRight',  group: 'annotate', cursor: 'crosshair' },
  // Other
  { id: 'eraser',           label: 'Supprimer',          icon: 'Eraser',        group: 'select',  shortcut: 'E', cursor: 'crosshair' },
]

// ── Layers ───────────────────────────────────────────────────

export interface CadLayer {
  id: string
  name: string
  color: string
  visible: boolean
  opacity: number
  locked: boolean
}

export const DEFAULT_LAYERS: CadLayer[] = [
  { id: 'walls',       name: 'Murs',           color: '#e5e7eb', visible: true, opacity: 1,    locked: false },
  { id: 'cloisons',    name: 'Cloisons',       color: '#9ca3af', visible: true, opacity: 1,    locked: false },
  { id: 'zones',       name: 'Zones',          color: '#3b82f6', visible: true, opacity: 0.3,  locked: false },
  { id: 'cameras',     name: 'Cameras',        color: '#22c55e', visible: true, opacity: 1,    locked: false },
  { id: 'doors',       name: 'Portes',         color: '#f59e0b', visible: true, opacity: 1,    locked: false },
  { id: 'cotations',   name: 'Cotations',      color: '#ef4444', visible: true, opacity: 0.8,  locked: false },
  { id: 'annotations', name: 'Annotations',    color: '#a855f7', visible: true, opacity: 1,    locked: false },
  { id: 'plan',        name: 'Plan importe',   color: '#ffffff', visible: true, opacity: 0.85, locked: true },
]

// ── Snap ─────────────────────────────────────────────────────

export interface SnapResult {
  point: Point
  type: 'grid' | 'vertex' | 'midpoint' | 'intersection' | 'none'
  sourceEntityId?: string
}

export interface SnapConfig {
  enabled: boolean
  gridSize: number       // in canvas units
  gridVisible: boolean
  snapToGrid: boolean
  snapToVertex: boolean
  snapToMidpoint: boolean
  snapRadius: number     // pixels
}

export const DEFAULT_SNAP: SnapConfig = {
  enabled: true,
  gridSize: 50,
  gridVisible: true,
  snapToGrid: true,
  snapToVertex: true,
  snapToMidpoint: true,
  snapRadius: 15,
}
