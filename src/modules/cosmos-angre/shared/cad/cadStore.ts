// ═══ CAD ENGINE — Zustand store with undo/redo + snap ═══

import { create } from 'zustand'
import type { CadEntity, CadTool, CadLayer, SnapConfig, SnapResult, Point } from './cadTypes'
import { DEFAULT_LAYERS, DEFAULT_SNAP } from './cadTypes'

// ── Undo/Redo ────────────────────────────────────────────────

interface HistoryEntry {
  entities: CadEntity[]
  description: string
}

const MAX_HISTORY = 50

// ── Store ────────────────────────────────────────────────────

interface CadState {
  // Entities
  entities: CadEntity[]
  selectedIds: Set<string>

  // Tool
  activeTool: CadTool
  isDrawing: boolean
  drawPoints: Point[]          // points accumulated during active draw

  // Layers
  layers: CadLayer[]

  // Snap
  snap: SnapConfig
  snapIndicator: SnapResult | null

  // Undo/Redo
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]

  // Measurement overlay
  measureResult: { type: 'distance' | 'area'; value: number; unit: string; points: Point[] } | null

  // Clipboard
  clipboard: CadEntity[]

  // ── Actions ────────────────────────────────────────────
  setTool: (tool: CadTool) => void

  // Entity CRUD
  addEntity: (entity: CadEntity) => void
  updateEntity: (id: string, updates: Partial<CadEntity>) => void
  deleteEntity: (id: string) => void
  deleteSelected: () => void

  // Selection
  select: (id: string, multi?: boolean) => void
  selectAll: () => void
  deselectAll: () => void

  // Drawing
  startDraw: (point: Point) => void
  addDrawPoint: (point: Point) => void
  finishDraw: () => CadEntity | null
  cancelDraw: () => void

  // Move/Resize
  moveSelected: (dx: number, dy: number) => void

  // Copy/Paste
  copySelected: () => void
  paste: (offset?: Point) => void

  // Undo/Redo
  undo: () => void
  redo: () => void
  pushHistory: (description: string) => void

  // Layers
  toggleLayerVisibility: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  toggleLayerLock: (layerId: string) => void
  /** Crée un nouveau calque personnalisé. */
  addLayer: (partial: Partial<CadLayer> & { name: string }) => CadLayer
  /** Renomme un calque. */
  renameLayer: (layerId: string, name: string) => void
  /**
   * Dissocie les entités d'un calque : elles sont déplacées vers un calque cible
   * (par défaut `default`). Le calque source reste existant mais vide.
   * Retourne le nombre d'entités dissociées.
   */
  dissociateLayer: (layerId: string, targetLayerId?: string) => number
  /**
   * Supprime un calque. `mode`:
   *   - 'purge'       → supprime aussi toutes les entités du calque (destructif)
   *   - 'dissociate'  → déplace d'abord les entités vers `targetLayerId` puis supprime le calque
   * Le calque `plan` (plan importé, verrouillé) ne peut pas être supprimé.
   */
  deleteLayer: (layerId: string, mode?: 'purge' | 'dissociate', targetLayerId?: string) => boolean

  // Snap
  setSnapConfig: (config: Partial<SnapConfig>) => void
  computeSnap: (raw: Point, canvasW: number, canvasH: number) => SnapResult
  setSnapIndicator: (snap: SnapResult | null) => void

  // Measurement
  setMeasureResult: (result: CadState['measureResult']) => void

  // Bulk
  setEntities: (entities: CadEntity[]) => void
  clear: () => void
}

let entityCounter = 0
function genId(type: string): string {
  return `cad-${type}-${Date.now().toString(36)}-${(entityCounter++).toString(36)}`
}

export const useCadStore = create<CadState>()((set, get) => ({
  entities: [],
  selectedIds: new Set(),
  activeTool: 'select',
  isDrawing: false,
  drawPoints: [],
  layers: DEFAULT_LAYERS,
  snap: DEFAULT_SNAP,
  snapIndicator: null,
  undoStack: [],
  redoStack: [],
  measureResult: null,
  clipboard: [],

  // ── Tool ───────────────────────────────────────────────

  setTool: (tool) => {
    get().cancelDraw()
    set({ activeTool: tool, measureResult: null })
  },

  // ── Entity CRUD ────────────────────────────────────────

  addEntity: (entity) => {
    get().pushHistory('Ajouter ' + entity.type)
    set((s) => ({ entities: [...s.entities, entity] }))
  },

  updateEntity: (id, updates) => {
    get().pushHistory('Modifier')
    set((s) => ({
      entities: s.entities.map(e => e.id === id ? { ...e, ...updates } : e),
    }))
  },

  deleteEntity: (id) => {
    get().pushHistory('Supprimer')
    set((s) => ({
      entities: s.entities.filter(e => e.id !== id),
      selectedIds: new Set([...s.selectedIds].filter(sid => sid !== id)),
    }))
  },

  deleteSelected: () => {
    const sel = get().selectedIds
    if (sel.size === 0) return
    get().pushHistory(`Supprimer ${sel.size} element(s)`)
    set((s) => ({
      entities: s.entities.filter(e => !sel.has(e.id)),
      selectedIds: new Set(),
    }))
  },

  // ── Selection ──────────────────────────────────────────

  select: (id, multi) => {
    set((s) => {
      const next = new Set(multi ? s.selectedIds : [])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    })
  },

  selectAll: () => set((s) => ({ selectedIds: new Set(s.entities.map(e => e.id)) })),
  deselectAll: () => set({ selectedIds: new Set() }),

  // ── Drawing ────────────────────────────────────────────

  startDraw: (point) => set({ isDrawing: true, drawPoints: [point] }),

  addDrawPoint: (point) => set((s) => ({
    drawPoints: [...s.drawPoints, point],
  })),

  finishDraw: () => {
    const { activeTool, drawPoints } = get()
    if (drawPoints.length < 2) { get().cancelDraw(); return null }

    const entityDefaults = getEntityDefaults(activeTool, drawPoints)
    if (!entityDefaults) { get().cancelDraw(); return null }

    const entity: CadEntity = {
      id: genId(activeTool),
      ...entityDefaults,
    }

    get().addEntity(entity)
    set({ isDrawing: false, drawPoints: [] })
    return entity
  },

  cancelDraw: () => set({ isDrawing: false, drawPoints: [] }),

  // ── Move ───────────────────────────────────────────────

  moveSelected: (dx, dy) => {
    const sel = get().selectedIds
    if (sel.size === 0) return
    get().pushHistory('Deplacer')
    set((s) => ({
      entities: s.entities.map(e => {
        if (!sel.has(e.id)) return e
        return { ...e, points: e.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
      }),
    }))
  },

  // ── Copy/Paste ─────────────────────────────────────────

  copySelected: () => {
    const sel = get().selectedIds
    const copied = get().entities.filter(e => sel.has(e.id))
    set({ clipboard: copied })
  },

  paste: (offset = { x: 20, y: 20 }) => {
    const { clipboard } = get()
    if (clipboard.length === 0) return
    get().pushHistory('Coller')
    const newEntities = clipboard.map(e => ({
      ...e,
      id: genId(e.type),
      points: e.points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y })),
    }))
    set((s) => ({
      entities: [...s.entities, ...newEntities],
      selectedIds: new Set(newEntities.map(e => e.id)),
    }))
  },

  // ── Undo/Redo ──────────────────────────────────────────

  pushHistory: (description) => {
    const snapshot: HistoryEntry = {
      entities: JSON.parse(JSON.stringify(get().entities)),
      description,
    }
    set((s) => ({
      undoStack: [...s.undoStack.slice(-MAX_HISTORY), snapshot],
      redoStack: [],
    }))
  },

  undo: () => {
    const { undoStack, entities } = get()
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, { entities: JSON.parse(JSON.stringify(entities)), description: 'redo' }],
      entities: prev.entities,
    }))
  },

  redo: () => {
    const { redoStack, entities } = get()
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, { entities: JSON.parse(JSON.stringify(entities)), description: 'undo' }],
      entities: next.entities,
    }))
  },

  // ── Layers ─────────────────────────────────────────────

  toggleLayerVisibility: (layerId) => set((s) => ({
    layers: s.layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l),
  })),

  setLayerOpacity: (layerId, opacity) => set((s) => ({
    layers: s.layers.map(l => l.id === layerId ? { ...l, opacity } : l),
  })),

  toggleLayerLock: (layerId) => set((s) => ({
    layers: s.layers.map(l => l.id === layerId ? { ...l, locked: !l.locked } : l),
  })),

  addLayer: (partial) => {
    const id = partial.id ?? `layer-${Date.now().toString(36)}`
    const layer: CadLayer = {
      id,
      name: partial.name,
      color: partial.color ?? '#64748b',
      visible: partial.visible ?? true,
      opacity: partial.opacity ?? 1,
      locked: partial.locked ?? false,
    }
    get().pushHistory(`Ajouter calque "${layer.name}"`)
    set((s) => ({ layers: [...s.layers, layer] }))
    return layer
  },

  renameLayer: (layerId, name) => {
    get().pushHistory(`Renommer calque`)
    set((s) => ({
      layers: s.layers.map(l => l.id === layerId ? { ...l, name } : l),
    }))
  },

  dissociateLayer: (layerId, targetLayerId) => {
    const state = get()
    const source = state.layers.find(l => l.id === layerId)
    if (!source) return 0
    // S'assurer qu'un calque "default" existe comme cible de repli
    let target = targetLayerId
      ? state.layers.find(l => l.id === targetLayerId)?.id
      : state.layers.find(l => l.id === 'default')?.id
    if (!target) {
      // Créer un calque `default` à la volée
      const def = get().addLayer({ id: 'default', name: 'Défaut', color: '#94a3b8' })
      target = def.id
    }
    // Compter puis déplacer
    const affected = state.entities.filter(e => e.layer === layerId)
    if (affected.length === 0) return 0
    get().pushHistory(`Dissocier ${affected.length} entité(s) du calque "${source.name}"`)
    set((s) => ({
      entities: s.entities.map(e => e.layer === layerId ? { ...e, layer: target! } : e),
    }))
    return affected.length
  },

  deleteLayer: (layerId, mode = 'dissociate', targetLayerId) => {
    const state = get()
    const layer = state.layers.find(l => l.id === layerId)
    if (!layer) return false
    // Le calque `plan` (plan importé) est protégé
    if (layerId === 'plan') {

      console.warn('[cadStore] Le calque "plan" est protégé et ne peut pas être supprimé.')
      return false
    }
    const entitiesOnLayer = state.entities.filter(e => e.layer === layerId).length
    if (mode === 'dissociate' && entitiesOnLayer > 0) {
      get().dissociateLayer(layerId, targetLayerId)
    }
    get().pushHistory(
      mode === 'purge' && entitiesOnLayer > 0
        ? `Supprimer calque "${layer.name}" + ${entitiesOnLayer} entité(s)`
        : `Supprimer calque "${layer.name}"`,
    )
    set((s) => ({
      layers: s.layers.filter(l => l.id !== layerId),
      entities: mode === 'purge'
        ? s.entities.filter(e => e.layer !== layerId)
        : s.entities,
      selectedIds: mode === 'purge'
        ? new Set([...s.selectedIds].filter(id => {
            const e = s.entities.find(x => x.id === id)
            return e ? e.layer !== layerId : false
          }))
        : s.selectedIds,
    }))
    return true
  },

  // ── Snap ───────────────────────────────────────────────

  setSnapConfig: (config) => set((s) => ({ snap: { ...s.snap, ...config } })),

  computeSnap: (raw, _canvasW, _canvasH) => {
    const { snap, entities } = get()
    if (!snap.enabled) return { point: raw, type: 'none' as const }

    let best: SnapResult = { point: raw, type: 'none' }
    let bestDist = snap.snapRadius

    // Snap to grid
    if (snap.snapToGrid) {
      const gx = Math.round(raw.x / snap.gridSize) * snap.gridSize
      const gy = Math.round(raw.y / snap.gridSize) * snap.gridSize
      const d = Math.sqrt((raw.x - gx) ** 2 + (raw.y - gy) ** 2)
      if (d < bestDist) { best = { point: { x: gx, y: gy }, type: 'grid' }; bestDist = d }
    }

    // Snap to vertices
    if (snap.snapToVertex) {
      for (const e of entities) {
        for (const p of e.points) {
          const d = Math.sqrt((raw.x - p.x) ** 2 + (raw.y - p.y) ** 2)
          if (d < bestDist) {
            best = { point: p, type: 'vertex', sourceEntityId: e.id }
            bestDist = d
          }
        }
      }
    }

    // Snap to midpoints
    if (snap.snapToMidpoint) {
      for (const e of entities) {
        for (let i = 0; i < e.points.length - 1; i++) {
          const mid = {
            x: (e.points[i].x + e.points[i + 1].x) / 2,
            y: (e.points[i].y + e.points[i + 1].y) / 2,
          }
          const d = Math.sqrt((raw.x - mid.x) ** 2 + (raw.y - mid.y) ** 2)
          if (d < bestDist) {
            best = { point: mid, type: 'midpoint', sourceEntityId: e.id }
            bestDist = d
          }
        }
      }
    }

    return best
  },

  setSnapIndicator: (snap) => set({ snapIndicator: snap }),
  setMeasureResult: (result) => set({ measureResult: result }),

  // ── Bulk ───────────────────────────────────────────────

  setEntities: (entities) => set({ entities }),
  clear: () => {
    get().pushHistory('Tout effacer')
    set({ entities: [], selectedIds: new Set() })
  },
}))

// ── Entity defaults by tool type ─────────────────────────────

function getEntityDefaults(tool: CadTool, points: Point[]): Omit<CadEntity, 'id'> | null {
  switch (tool) {
    case 'wall':
      return {
        type: 'wall', layer: 'walls', points, color: '#e5e7eb',
        lineWidth: 4, wallThickness: 0.2,
      }
    case 'cloison':
      return {
        type: 'cloison', layer: 'cloisons', points, color: '#9ca3af',
        lineWidth: 2, wallThickness: 0.1,
      }
    case 'zone_rect': {
      if (points.length < 2) return null
      const [p1, p2] = points
      const rect: Point[] = [
        { x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
        { x: Math.max(p1.x, p2.x), y: Math.min(p1.y, p2.y) },
        { x: Math.max(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
        { x: Math.min(p1.x, p2.x), y: Math.max(p1.y, p2.y) },
      ]
      const w = Math.abs(p2.x - p1.x)
      const h = Math.abs(p2.y - p1.y)
      return {
        type: 'rect_zone', layer: 'zones', points: rect, closed: true,
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15,
        lineWidth: 2, surfaceM2: Math.round(w * h),
      }
    }
    case 'zone_poly':
      return {
        type: 'zone', layer: 'zones', points, closed: true,
        color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15,
        lineWidth: 2, surfaceM2: Math.round(Math.abs(shoelace(points))),
      }
    case 'cotation':
      if (points.length < 2) return null
      return {
        type: 'cotation', layer: 'cotations', points: [points[0], points[1]],
        color: '#ef4444', lineWidth: 1,
        dimValue: Math.sqrt((points[1].x - points[0].x) ** 2 + (points[1].y - points[0].y) ** 2),
      }
    case 'text':
      return {
        type: 'text', layer: 'annotations', points: [points[0]],
        color: '#a855f7', lineWidth: 0, textContent: 'Texte',
      }
    case 'arrow':
      if (points.length < 2) return null
      return {
        type: 'arrow', layer: 'annotations', points: [points[0], points[1]],
        color: '#a855f7', lineWidth: 2, arrowEnd: true,
      }
    default:
      return null
  }
}

function shoelace(pts: Point[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return area / 2
}
