// ═══ SPACE EDITOR CANVAS ═══
//
// Canvas SVG interactif pour dessiner / éditer les espaces du plan Vol.3.
// 5 modes de dessin (spec PROPH3T Vol.3) :
//   - select : sélection + drag vertex + insert on edge + delete on dblclick
//   - poly   : clic points, double-clic pour fermer
//   - rect   : drag rectangle, snap grid
//   - curve  : clic points + smoothing Catmull-Rom automatique
//   - wall   : tracer ligne → polygone rectangulaire épais (épaisseur configurable)
//
// Opérations avancées :
//   - Fusion (union) de plusieurs polygones
//   - Découpe (split) d'un polygone par ligne
//   - Duplication (Ctrl+D)
//   - Supprimer (Del/Backspace)
//   - Escape : annule l'opération en cours

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MousePointer, Hexagon, Square, Spline, MoveHorizontal,
  Merge, Scissors, Copy, Trash2, RotateCcw, Grid3X3, Check,
  AlertTriangle,
} from 'lucide-react'
import * as Geo from '../engines/plan-analysis/spaceGeometryEngine'
import {
  SPACE_TYPE_META, SPACE_TYPES_BY_CATEGORY, SPACE_CATEGORY_META, FLOOR_LEVEL_META,
  type SpaceTypeKey, type SpaceTypeCategory, type FloorLevelKey,
  autoDetectSpaceType, checkSurfaceAnomaly,
} from '../proph3t/libraries/spaceTypeLibrary'

// ─── Types ─────────────────────────────────────────

export type DrawMode = 'select' | 'poly' | 'rect' | 'curve' | 'wall'

export interface EditableSpace {
  id: string
  name: string
  type: SpaceTypeKey
  polygon: Geo.Polygon
  floorLevel: FloorLevelKey
  validated: boolean
  notes?: string
}

interface Props {
  /** Bounds du plan en mètres. */
  planBounds: { width: number; height: number }
  /** Spaces actuels. */
  spaces: EditableSpace[]
  /** Callback changement de spaces. */
  onSpacesChange: (spaces: EditableSpace[]) => void
  /** Image/plan de fond (URL blob/img data). */
  backgroundUrl?: string
  /** Niveau actif. */
  activeFloor: FloorLevelKey
  /** Callback pour changer le niveau actif. */
  onFloorChange: (floor: FloorLevelKey) => void
}

const GRID_STEP_M = 0.5       // pas de grille de 50 cm
const VERTEX_HIT_PX = 10       // tolérance de hit-test vertex en px
const EDGE_HIT_PX = 8          // tolérance edge

// ─── Composant principal ─────────────────────────

export function SpaceEditorCanvas({
  planBounds, spaces, onSpacesChange, backgroundUrl, activeFloor, onFloorChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<DrawMode>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hoveredVertex, setHoveredVertex] = useState<{ spaceId: string; idx: number } | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<{ spaceId: string; idx: number; point: Geo.Point } | null>(null)
  const [draftPoints, setDraftPoints] = useState<Geo.Point[]>([])
  const [dragStart, setDragStart] = useState<Geo.Point | null>(null)
  const [draggingVertex, setDraggingVertex] = useState<{ spaceId: string; idx: number } | null>(null)
  const [splitLine, setSplitLine] = useState<[Geo.Point, Geo.Point] | null>(null)
  const [viewport, setViewport] = useState({ scale: 4, offsetX: 20, offsetY: 20 })
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [wallThicknessCm, setWallThicknessCm] = useState(20)
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null)
  const [showOnlyActiveFloor, setShowOnlyActiveFloor] = useState(true)

  // Filtré par niveau
  const visibleSpaces = useMemo(
    () => showOnlyActiveFloor ? spaces.filter(s => s.floorLevel === activeFloor) : spaces,
    [spaces, activeFloor, showOnlyActiveFloor],
  )

  // ─── Conversion screen ↔ monde ────────────────

  const screenToWorld = useCallback((sx: number, sy: number): Geo.Point => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = (sx - rect.left - viewport.offsetX) / viewport.scale
    const y = (sy - rect.top - viewport.offsetY) / viewport.scale
    return snapEnabled ? Geo.snapToGrid({ x, y }, GRID_STEP_M) : { x, y }
  }, [viewport, snapEnabled])

  const worldToScreen = useCallback((x: number, y: number): Geo.Point => ({
    x: x * viewport.scale + viewport.offsetX,
    y: y * viewport.scale + viewport.offsetY,
  }), [viewport])

  // ─── Gestion clavier ──────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraftPoints([])
        setDragStart(null)
        setSplitLine(null)
        setDraggingVertex(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateSelected()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && !editingSpaceId) {
          e.preventDefault()
          onSpacesChange(spaces.filter(s => !selectedIds.has(s.id)))
          setSelectedIds(new Set())
        }
      }
      if (e.key === 'm' && !editingSpaceId) mergeSelected()
      if (e.key === 'x' && !editingSpaceId && selectedIds.size === 1) {
        // Active split mode
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, spaces, editingSpaceId])

  // ─── Wheel zoom ───────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.max(0.5, Math.min(40, viewport.scale * (1 + delta)))
    setViewport(v => ({ ...v, scale: newScale }))
  }, [viewport.scale])

  // ─── Événements souris ───────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const world = screenToWorld(e.clientX, e.clientY)

    if (mode === 'select') {
      // Clic sur un vertex ?
      for (const s of visibleSpaces) {
        const pt = screenToWorld(e.clientX, e.clientY)
        const vi = Geo.findClosestVertex(s.polygon, pt, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) {
          setDraggingVertex({ spaceId: s.id, idx: vi })
          return
        }
      }
      // Clic sur une edge pour insérer un vertex
      for (const s of visibleSpaces) {
        const hit = Geo.findClosestEdge(s.polygon, world, EDGE_HIT_PX / viewport.scale)
        if (hit) {
          const newPoly = Geo.insertVertex(s.polygon, hit.edgeIdx, hit.point)
          updateSpace(s.id, { polygon: newPoly })
          setDraggingVertex({ spaceId: s.id, idx: hit.edgeIdx + 1 })
          return
        }
      }
      // Clic sur un polygone = sélection
      for (const s of visibleSpaces) {
        if (Geo.pointInPolygon(world.x, world.y, s.polygon)) {
          if (e.shiftKey) {
            setSelectedIds(sel => {
              const next = new Set(sel)
              if (next.has(s.id)) next.delete(s.id)
              else next.add(s.id)
              return next
            })
          } else {
            setSelectedIds(new Set([s.id]))
          }
          return
        }
      }
      setSelectedIds(new Set())
      return
    }

    if (mode === 'poly' || mode === 'curve') {
      setDraftPoints([...draftPoints, world])
      return
    }

    if (mode === 'rect') {
      setDragStart(world)
      return
    }

    if (mode === 'wall') {
      if (!dragStart) {
        setDragStart(world)
      } else {
        // Produit le polygone wall
        const snapped = e.shiftKey ? Geo.snapAngle(dragStart, world, 45) : world
        const poly = Geo.wallSegmentToPoly(dragStart, snapped, wallThicknessCm / 100)
        createSpace(poly)
        setDragStart(null)
      }
      return
    }
  }, [mode, visibleSpaces, viewport.scale, screenToWorld, draftPoints, dragStart, wallThicknessCm])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY)

    // Dragging vertex
    if (draggingVertex) {
      const s = spaces.find(sp => sp.id === draggingVertex.spaceId)
      if (s) {
        updateSpace(s.id, { polygon: Geo.moveVertex(s.polygon, draggingVertex.idx, world) })
      }
      return
    }

    // Hover detection en mode select
    if (mode === 'select') {
      let foundVertex: typeof hoveredVertex = null
      let foundEdge: typeof hoveredEdge = null
      for (const s of visibleSpaces) {
        const vi = Geo.findClosestVertex(s.polygon, world, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) { foundVertex = { spaceId: s.id, idx: vi }; break }
        const eh = Geo.findClosestEdge(s.polygon, world, EDGE_HIT_PX / viewport.scale)
        if (eh) { foundEdge = { spaceId: s.id, idx: eh.edgeIdx, point: eh.point }; break }
      }
      setHoveredVertex(foundVertex)
      setHoveredEdge(foundEdge)
    }

    // Split line preview (si split en cours)
    if (splitLine) {
      setSplitLine([splitLine[0], world])
    }
  }, [draggingVertex, mode, visibleSpaces, viewport.scale, screenToWorld, spaces, splitLine])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingVertex) {
      setDraggingVertex(null)
      return
    }
    if (mode === 'rect' && dragStart) {
      const end = screenToWorld(e.clientX, e.clientY)
      const minX = Math.min(dragStart.x, end.x), maxX = Math.max(dragStart.x, end.x)
      const minY = Math.min(dragStart.y, end.y), maxY = Math.max(dragStart.y, end.y)
      if ((maxX - minX) > 0.5 && (maxY - minY) > 0.5) {
        createSpace([
          { x: minX, y: minY }, { x: maxX, y: minY },
          { x: maxX, y: maxY }, { x: minX, y: maxY },
        ])
      }
      setDragStart(null)
    }
  }, [draggingVertex, mode, dragStart, screenToWorld])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'select') {
      // Double-clic sur un vertex = suppression
      const world = screenToWorld(e.clientX, e.clientY)
      for (const s of visibleSpaces) {
        const vi = Geo.findClosestVertex(s.polygon, world, VERTEX_HIT_PX / viewport.scale)
        if (vi !== null) {
          updateSpace(s.id, { polygon: Geo.removeVertex(s.polygon, vi) })
          return
        }
      }
      // Double-clic sur un espace = ouvre éditeur métadata
      for (const s of visibleSpaces) {
        if (Geo.pointInPolygon(world.x, world.y, s.polygon)) {
          setEditingSpaceId(s.id)
          return
        }
      }
    }
    if (mode === 'poly' && draftPoints.length >= 3) {
      createSpace(draftPoints)
      setDraftPoints([])
    }
    if (mode === 'curve' && draftPoints.length >= 3) {
      const smoothed = Geo.catmullRomSmooth(draftPoints, 8, 0.5)
      createSpace(smoothed)
      setDraftPoints([])
    }
  }, [mode, draftPoints, visibleSpaces, viewport.scale, screenToWorld])

  // ─── Operations ──────────────────────────────

  const createSpace = (poly: Geo.Polygon) => {
    const normalized = Geo.normalizePolygon(poly)
    if (normalized.length < 3) return
    const id = `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const autoType = autoDetectSpaceType('Nouveau espace')
    const newSpace: EditableSpace = {
      id,
      name: `Nouveau espace ${spaces.length + 1}`,
      type: autoType,
      polygon: normalized,
      floorLevel: activeFloor,
      validated: false,
    }
    onSpacesChange([...spaces, newSpace])
    setSelectedIds(new Set([id]))
    setEditingSpaceId(id)
  }

  const updateSpace = (id: string, changes: Partial<EditableSpace>) => {
    onSpacesChange(spaces.map(s => s.id === id ? { ...s, ...changes } : s))
  }

  const duplicateSelected = () => {
    const toDuplicate = spaces.filter(s => selectedIds.has(s.id))
    const copies: EditableSpace[] = toDuplicate.map(s => ({
      ...s,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${s.name} (copie)`,
      validated: false,
      polygon: Geo.duplicatePolygon(s.polygon, 2, 2),
    }))
    onSpacesChange([...spaces, ...copies])
    setSelectedIds(new Set(copies.map(c => c.id)))
  }

  const mergeSelected = () => {
    const toMerge = spaces.filter(s => selectedIds.has(s.id))
    if (toMerge.length < 2) return
    const merged = Geo.unionPolygons(toMerge.map(s => s.polygon), 20)
    if (merged.length === 0) return
    const main = toMerge[0]
    const newPoly = merged[0] // garder la 1re composante
    const newSpace: EditableSpace = {
      ...main,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${main.name} (fusion)`,
      polygon: newPoly,
      validated: false,
    }
    const remaining = spaces.filter(s => !selectedIds.has(s.id))
    onSpacesChange([...remaining, newSpace])
    setSelectedIds(new Set([newSpace.id]))
  }

  const splitSelected = () => {
    if (selectedIds.size !== 1) return
    // Active le mode split : le prochain trait dessiné coupera le polygone
    const id = Array.from(selectedIds)[0]
    const s = spaces.find(sp => sp.id === id)
    if (!s) return
    setSplitLine([{ x: 0, y: 0 }, { x: 0, y: 0 }])
    // On attend 2 clics pour définir la ligne de coupe
    const handler = (e: MouseEvent) => {
      const w1 = screenToWorld(e.clientX, e.clientY)
      const handler2 = (e2: MouseEvent) => {
        const w2 = screenToWorld(e2.clientX, e2.clientY)
        const split = Geo.splitPolygonByLine(s.polygon, w1, w2)
        setSplitLine(null)
        window.removeEventListener('click', handler2)
        if (split) {
          const [left, right] = split
          const newSpaces: EditableSpace[] = [
            { ...s, polygon: left, id: `sp-${Date.now()}-l`, name: `${s.name} (A)`, validated: false },
            { ...s, polygon: right, id: `sp-${Date.now()}-r`, name: `${s.name} (B)`, validated: false },
          ]
          onSpacesChange([...spaces.filter(sp => sp.id !== s.id), ...newSpaces])
        }
      }
      window.addEventListener('click', handler2, { once: true })
      window.removeEventListener('click', handler)
    }
    window.addEventListener('click', handler, { once: true })
  }

  // ─── Rendu SVG ────────────────────────────────

  const cursor = mode === 'select'
    ? (draggingVertex ? 'grabbing' : hoveredVertex ? 'grab' : 'default')
    : mode === 'wall' && dragStart ? 'crosshair'
    : 'crosshair'

  const screenPlanW = planBounds.width * viewport.scale
  const screenPlanH = planBounds.height * viewport.scale

  const gridLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  if (showGrid) {
    const gridMeters = 5
    for (let x = 0; x <= planBounds.width; x += gridMeters) {
      gridLines.push({
        x1: x * viewport.scale + viewport.offsetX, y1: viewport.offsetY,
        x2: x * viewport.scale + viewport.offsetX, y2: screenPlanH + viewport.offsetY,
      })
    }
    for (let y = 0; y <= planBounds.height; y += gridMeters) {
      gridLines.push({
        x1: viewport.offsetX, y1: y * viewport.scale + viewport.offsetY,
        x2: screenPlanW + viewport.offsetX, y2: y * viewport.scale + viewport.offsetY,
      })
    }
  }

  const editingSpace = editingSpaceId ? spaces.find(s => s.id === editingSpaceId) : null

  return (
    <div className="h-full w-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-slate-900">
        {/* Mode selectors */}
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-950 rounded">
          {([
            { m: 'select', icon: MousePointer, label: 'Sélection' },
            { m: 'poly',   icon: Hexagon,      label: 'Polygone (dble-clic ferme)' },
            { m: 'rect',   icon: Square,       label: 'Rectangle' },
            { m: 'curve',  icon: Spline,       label: 'Courbe (dble-clic ferme)' },
            { m: 'wall',   icon: MoveHorizontal,label: `Mur (${wallThicknessCm} cm)` },
          ] as Array<{ m: DrawMode; icon: any; label: string }>).map(o => (
            <button key={o.m}
              onClick={() => { setMode(o.m); setDraftPoints([]); setDragStart(null); setSplitLine(null) }}
              className={`p-1.5 rounded text-[11px] flex items-center gap-1.5 ${
                mode === o.m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title={o.label}
            >
              <o.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        {mode === 'wall' && (
          <select
            value={wallThicknessCm}
            onChange={(e) => setWallThicknessCm(Number(e.target.value))}
            className="bg-slate-950 text-[10px] text-slate-300 rounded px-1.5 py-1 border border-white/10"
          >
            <option value={15}>15 cm</option>
            <option value={20}>20 cm</option>
            <option value={30}>30 cm</option>
          </select>
        )}

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Opérations avancées */}
        <button
          onClick={mergeSelected}
          disabled={selectedIds.size < 2}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1"
          title="Fusionner zones sélectionnées (M)"
        >
          <Merge className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={splitSelected}
          disabled={selectedIds.size !== 1}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          title="Découper (X) — 2 clics pour tracer la ligne de coupe"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={duplicateSelected}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
          title="Dupliquer (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (selectedIds.size === 0) return
            onSpacesChange(spaces.filter(s => !selectedIds.has(s.id)))
            setSelectedIds(new Set())
          }}
          disabled={selectedIds.size === 0}
          className="p-1.5 rounded text-[11px] text-red-400 hover:text-red-300 hover:bg-red-950/40 disabled:opacity-30"
          title="Supprimer (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Options */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded ${showGrid ? 'text-indigo-400' : 'text-slate-500'}`}
          title="Afficher grille"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${snapEnabled ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
          title="Snap grille 50 cm"
        >
          SNAP
        </button>

        <div className="flex-1" />

        {/* Niveau actif */}
        <select
          value={activeFloor}
          onChange={(e) => onFloorChange(e.target.value as FloorLevelKey)}
          className="bg-slate-950 text-[11px] text-slate-300 rounded px-2 py-1 border border-white/10"
        >
          {(Object.keys(FLOOR_LEVEL_META) as FloorLevelKey[])
            .sort((a, b) => FLOOR_LEVEL_META[a].order - FLOOR_LEVEL_META[b].order)
            .map(f => (
              <option key={f} value={f}>{FLOOR_LEVEL_META[f].label}</option>
            ))}
        </select>
        <button
          onClick={() => setShowOnlyActiveFloor(!showOnlyActiveFloor)}
          className={`px-2 py-1 rounded text-[10px] font-bold ${showOnlyActiveFloor ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          title="Filtrer sur niveau actif"
        >
          {showOnlyActiveFloor ? '◉ Niv actif' : '◎ Tous niv.'}
        </button>

        <span className="text-[10px] text-slate-500 tabular-nums">
          Zoom {(viewport.scale).toFixed(1)}× · {visibleSpaces.length} espace(s)
        </span>
      </div>

      {/* Canvas SVG */}
      <div className="flex-1 overflow-hidden relative">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor, background: '#0f172a' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
        >
          {/* Background plan */}
          {backgroundUrl && (
            <image
              href={backgroundUrl}
              x={viewport.offsetX}
              y={viewport.offsetY}
              width={screenPlanW}
              height={screenPlanH}
              opacity={0.4}
              preserveAspectRatio="none"
            />
          )}

          {/* Grille */}
          {showGrid && gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#1e293b" strokeWidth={0.5} />
          ))}

          {/* Contour plan */}
          <rect
            x={viewport.offsetX} y={viewport.offsetY}
            width={screenPlanW} height={screenPlanH}
            fill="none" stroke="#334155" strokeWidth={1} strokeDasharray="4 2"
          />

          {/* Espaces */}
          {visibleSpaces.map(s => {
            const meta = SPACE_TYPE_META[s.type]
            const isSelected = selectedIds.has(s.id)
            const screenPts = s.polygon.map(p => worldToScreen(p.x, p.y))
            const d = screenPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

            // Centroid pour le label
            let cx = 0, cy = 0
            for (const p of screenPts) { cx += p.x; cy += p.y }
            cx /= screenPts.length; cy /= screenPts.length

            const areaSqm = Geo.polyArea(s.polygon)
            const anomaly = checkSurfaceAnomaly(s.type, areaSqm)

            return (
              <g key={s.id}>
                <path
                  d={d}
                  fill={meta.color}
                  fillOpacity={s.validated ? 0.25 : 0.15}
                  stroke={isSelected ? '#fff' : meta.color}
                  strokeWidth={isSelected ? 2.5 : 1.2}
                  strokeDasharray={s.validated ? 'none' : '4 2'}
                />
                {/* Vertices en mode select */}
                {mode === 'select' && isSelected && screenPts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y} r={5}
                    fill={hoveredVertex?.spaceId === s.id && hoveredVertex.idx === i ? '#fff' : meta.color}
                    stroke="#fff" strokeWidth={1.5}
                  />
                ))}
                {/* Edge insert indicator */}
                {mode === 'select' && isSelected && hoveredEdge?.spaceId === s.id && (
                  <circle
                    cx={worldToScreen(hoveredEdge.point.x, hoveredEdge.point.y).x}
                    cy={worldToScreen(hoveredEdge.point.x, hoveredEdge.point.y).y}
                    r={4} fill="#fff" opacity={0.6}
                  />
                )}
                {/* Label */}
                <g transform={`translate(${cx}, ${cy})`} style={{ pointerEvents: 'none' }}>
                  <rect x={-40} y={-12} width={80} height={24} fill="rgba(15,23,42,0.85)" rx={3} />
                  <text textAnchor="middle" fontSize={10} fontWeight="bold" fill="#fff" y={0}>
                    {meta.icon} {s.name.length > 12 ? s.name.slice(0, 11) + '…' : s.name}
                  </text>
                  <text textAnchor="middle" fontSize={8} fill="#94a3b8" y={8}>
                    {areaSqm.toFixed(0)} m² · {meta.label}
                  </text>
                </g>
                {/* Warning si surface aberrante */}
                {anomaly.aberrant && (
                  <g transform={`translate(${cx + 30}, ${cy - 12})`}>
                    <circle r={6} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
                    <text textAnchor="middle" fontSize={9} fill="#000" y={3} fontWeight="bold">!</text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Draft poly/curve en cours */}
          {draftPoints.length > 0 && (
            <g>
              <polyline
                points={draftPoints.map(p => worldToScreen(p.x, p.y)).map(s => `${s.x},${s.y}`).join(' ')}
                fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 2"
              />
              {draftPoints.map((p, i) => {
                const s = worldToScreen(p.x, p.y)
                return <circle key={i} cx={s.x} cy={s.y} r={3} fill="#818cf8" />
              })}
            </g>
          )}

          {/* Draft rectangle en cours */}
          {mode === 'rect' && dragStart && (
            <rect
              x={Math.min(worldToScreen(dragStart.x, 0).x,
                Math.min(...[0]))
              }
              y={0}
              width={10}
              height={10}
              fill="none" stroke="#818cf8" strokeWidth={1.5} strokeDasharray="4 2"
            />
          )}

          {/* Draft wall en cours */}
          {mode === 'wall' && dragStart && (
            <circle
              cx={worldToScreen(dragStart.x, dragStart.y).x}
              cy={worldToScreen(dragStart.x, dragStart.y).y}
              r={5} fill="#818cf8"
            />
          )}

          {/* Split line preview */}
          {splitLine && (
            <line
              x1={worldToScreen(splitLine[0].x, splitLine[0].y).x}
              y1={worldToScreen(splitLine[0].x, splitLine[0].y).y}
              x2={worldToScreen(splitLine[1].x, splitLine[1].y).x}
              y2={worldToScreen(splitLine[1].x, splitLine[1].y).y}
              stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3"
            />
          )}
        </svg>

        {/* Panel édition espace */}
        {editingSpace && (
          <SpaceMetadataPanel
            space={editingSpace}
            onSave={(changes) => {
              updateSpace(editingSpace.id, changes)
              setEditingSpaceId(null)
            }}
            onClose={() => setEditingSpaceId(null)}
            onDelete={() => {
              onSpacesChange(spaces.filter(s => s.id !== editingSpace.id))
              setSelectedIds(new Set())
              setEditingSpaceId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Panel metadata ───────────────────────────────

function SpaceMetadataPanel({
  space, onSave, onClose, onDelete,
}: {
  space: EditableSpace
  onSave: (changes: Partial<EditableSpace>) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(space.name)
  const [type, setType] = useState<SpaceTypeKey>(space.type)
  const [floorLevel, setFloorLevel] = useState<FloorLevelKey>(space.floorLevel)
  const [notes, setNotes] = useState(space.notes ?? '')
  const [validated, setValidated] = useState(space.validated)

  const areaSqm = Geo.polyArea(space.polygon)
  const anomaly = checkSurfaceAnomaly(type, areaSqm)

  return (
    <div className="absolute right-4 top-4 w-[340px] bg-slate-900 border border-white/10 rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-white">Éditer espace</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Nom */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Nom précis
          </label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="ex: Entrée principale Nord, Local A12 Restauration"
            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/10 text-sm text-white"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Type sémantique
          </label>
          <div className="space-y-2 max-h-52 overflow-y-auto bg-slate-950 rounded border border-white/5 p-2">
            {(Object.keys(SPACE_TYPES_BY_CATEGORY) as SpaceTypeCategory[]).map(cat => {
              const catMeta = SPACE_CATEGORY_META[cat]
              return (
                <div key={cat}>
                  <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: catMeta.color }}>
                    {catMeta.icon} {catMeta.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {SPACE_TYPES_BY_CATEGORY[cat].map(k => {
                      const meta = SPACE_TYPE_META[k]
                      return (
                        <button
                          key={k}
                          onClick={() => setType(k)}
                          className={`text-left px-2 py-1 rounded text-[10px] border ${
                            type === k
                              ? 'border-white bg-white/10 text-white'
                              : 'border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <span className="mr-1" style={{ color: meta.color }}>{meta.icon}</span>
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-1">{SPACE_TYPE_META[type].description}</p>
        </div>

        {/* Niveau */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Niveau
          </label>
          <select
            value={floorLevel}
            onChange={(e) => setFloorLevel(e.target.value as FloorLevelKey)}
            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/10 text-sm text-white"
          >
            {(Object.keys(FLOOR_LEVEL_META) as FloorLevelKey[])
              .sort((a, b) => FLOOR_LEVEL_META[a].order - FLOOR_LEVEL_META[b].order)
              .map(f => (
                <option key={f} value={f}>{FLOOR_LEVEL_META[f].label}</option>
              ))}
          </select>
        </div>

        {/* Surface */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="px-2 py-1.5 rounded bg-slate-950 border border-white/5">
            <div className="text-[9px] text-slate-600 uppercase">Surface</div>
            <div className="text-white font-bold tabular-nums">{areaSqm.toFixed(1)} m²</div>
          </div>
          <div className="px-2 py-1.5 rounded bg-slate-950 border border-white/5">
            <div className="text-[9px] text-slate-600 uppercase">Vertex</div>
            <div className="text-white font-bold tabular-nums">{space.polygon.length}</div>
          </div>
        </div>

        {/* Anomalie */}
        {anomaly.aberrant && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-950/40 border border-amber-900/50 text-[11px] text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
            {anomaly.reason}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Notes
          </label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Informations complémentaires…"
            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-white/10 text-xs text-white resize-none"
          />
        </div>

        {/* Validated */}
        <label className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer bg-slate-950 border border-white/5">
          <input
            type="checkbox"
            checked={validated}
            onChange={(e) => setValidated(e.target.checked)}
            className="accent-emerald-500"
          />
          <span className="text-[11px] text-slate-300">
            <Check className="w-3 h-3 inline mr-1" />
            Valider pour PROPH3T
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/40">
        <button onClick={onDelete}
          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 rounded text-[11px] text-slate-400 hover:text-white">
            Annuler
          </button>
          <button
            onClick={() => onSave({ name, type, floorLevel, notes, validated })}
            className="px-4 py-1.5 rounded text-[11px] font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-90"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
