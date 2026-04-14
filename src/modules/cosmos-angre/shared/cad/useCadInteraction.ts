// ═══ CAD INTERACTION HOOK — Keyboard shortcuts + mouse drawing logic ═══

import { useCallback, useEffect } from 'react'
import { useCadStore } from './cadStore'
import type { Point, CadTool } from './cadTypes'

const TOOL_SHORTCUTS: Record<string, CadTool> = {
  'v': 'select', 'h': 'pan', 'w': 'wall', 'c': 'cloison',
  'r': 'zone_rect', 'p': 'zone_poly', 't': 'cotation',
  'm': 'measure_distance', 'a': 'measure_area',
  'x': 'text', 'e': 'eraser', 'd': 'door',
}

export function useCadInteraction(canvasW: number, canvasH: number) {
  const {
    activeTool, isDrawing, drawPoints, snap,
    setTool, startDraw, addDrawPoint, finishDraw, cancelDraw,
    select, deselectAll, deleteSelected, copySelected, paste,
    undo, redo, computeSnap, setSnapIndicator, setMeasureResult,
    entities, moveSelected,
  } = useCadStore()

  // ── Keyboard shortcuts ─────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in input fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element)?.tagName)) return

      const key = e.key.toLowerCase()

      // Tool shortcuts (single letter)
      if (!e.ctrlKey && !e.metaKey && TOOL_SHORTCUTS[key]) {
        e.preventDefault()
        setTool(TOOL_SHORTCUTS[key])
        return
      }

      // Escape → cancel draw or deselect
      if (key === 'escape') {
        if (isDrawing) cancelDraw()
        else deselectAll()
        return
      }

      // Delete/Backspace → delete selected
      if (key === 'delete' || key === 'backspace') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) {
          deleteSelected()
        }
        return
      }

      // Enter → finish polygon draw
      if (key === 'enter' && isDrawing && activeTool === 'zone_poly') {
        finishDraw()
        return
      }

      // Ctrl+Z → undo
      if ((e.ctrlKey || e.metaKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl+Shift+Z or Ctrl+Y → redo
      if ((e.ctrlKey || e.metaKey) && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      // Ctrl+C → copy
      if ((e.ctrlKey || e.metaKey) && key === 'c') {
        copySelected()
        return
      }

      // Ctrl+V → paste
      if ((e.ctrlKey || e.metaKey) && key === 'v') {
        paste()
        return
      }

      // Ctrl+A → select all
      if ((e.ctrlKey || e.metaKey) && key === 'a') {
        e.preventDefault()
        useCadStore.getState().selectAll()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTool, isDrawing, setTool, cancelDraw, deselectAll, deleteSelected, finishDraw, undo, redo, copySelected, paste])

  // ── Mouse handlers for SVG canvas ──────────────────────

  const handleCanvasMouseDown = useCallback((svgPoint: Point, e: React.MouseEvent) => {
    const snapped = computeSnap(svgPoint, canvasW, canvasH)
    const point = snapped.point

    switch (activeTool) {
      case 'select': {
        // Check if clicking on an entity
        const hit = findEntityAtPoint(entities, point)
        if (hit) {
          select(hit.id, e.shiftKey)
        } else {
          deselectAll()
        }
        break
      }

      case 'wall':
      case 'cloison':
      case 'cotation':
      case 'arrow':
        if (!isDrawing) startDraw(point)
        else {
          addDrawPoint(point)
          finishDraw()
        }
        break

      case 'zone_rect':
        if (!isDrawing) startDraw(point)
        else {
          addDrawPoint(point)
          finishDraw()
        }
        break

      case 'zone_poly':
        if (!isDrawing) startDraw(point)
        else addDrawPoint(point)
        // Double-click to close polygon is handled via onDoubleClick
        break

      case 'text':
        startDraw(point)
        addDrawPoint(point)
        const textEntity = finishDraw()
        if (textEntity) {
          const text = prompt('Texte :')
          if (text) useCadStore.getState().updateEntity(textEntity.id, { textContent: text })
        }
        break

      case 'measure_distance':
        if (!isDrawing) startDraw(point)
        else {
          const p1 = drawPoints[0]
          const dist = Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2)
          setMeasureResult({ type: 'distance', value: dist, unit: 'px', points: [p1, point] })
          cancelDraw()
        }
        break

      case 'measure_area':
        if (!isDrawing) startDraw(point)
        else addDrawPoint(point)
        break

      case 'eraser': {
        const target = findEntityAtPoint(entities, point)
        if (target) useCadStore.getState().deleteEntity(target.id)
        break
      }
    }
  }, [activeTool, isDrawing, drawPoints, entities, canvasW, canvasH,
      computeSnap, select, deselectAll, startDraw, addDrawPoint, finishDraw, cancelDraw, setMeasureResult])

  const handleCanvasMouseMove = useCallback((svgPoint: Point) => {
    const snapped = computeSnap(svgPoint, canvasW, canvasH)
    setSnapIndicator(snapped.type !== 'none' ? snapped : null)
  }, [computeSnap, canvasW, canvasH, setSnapIndicator])

  const handleCanvasDoubleClick = useCallback((_svgPoint: Point) => {
    // Double click finishes polygon draw
    if (isDrawing && activeTool === 'zone_poly') {
      finishDraw()
    }
    // Double click finishes area measurement
    if (isDrawing && activeTool === 'measure_area') {
      const area = Math.abs(shoelace(drawPoints))
      setMeasureResult({ type: 'area', value: area, unit: 'px²', points: drawPoints })
      cancelDraw()
    }
  }, [isDrawing, activeTool, drawPoints, finishDraw, cancelDraw, setMeasureResult])

  return { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasDoubleClick }
}

// ── Hit testing ──────────────────────────────────────────────

function findEntityAtPoint(entities: ReturnType<typeof useCadStore.getState>['entities'], point: Point) {
  const HIT_RADIUS = 10

  // Check in reverse order (topmost entity first)
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]
    if (e.visible === false) continue

    // For zones/rects: point inside polygon
    if ((e.type === 'zone' || e.type === 'rect_zone') && e.points.length >= 3) {
      if (pointInPolygon(point, e.points)) return e
    }

    // For lines/walls: distance to line segment
    for (let j = 0; j < e.points.length - 1; j++) {
      const d = pointToSegmentDist(point, e.points[j], e.points[j + 1])
      if (d < HIT_RADIUS) return e
    }

    // For single-point entities (text)
    if (e.points.length === 1) {
      const d = Math.sqrt((point.x - e.points[0].x) ** 2 + (point.y - e.points[0].y) ** 2)
      if (d < HIT_RADIUS * 3) return e
    }
  }

  return null
}

function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if ((yi > p.y) !== (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointToSegmentDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const proj = { x: a.x + t * dx, y: a.y + t * dy }
  return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2)
}

function shoelace(pts: Point[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return area / 2
}
