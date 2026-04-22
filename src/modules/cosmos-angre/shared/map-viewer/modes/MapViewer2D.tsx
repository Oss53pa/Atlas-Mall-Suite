// ═══ MAP VIEWER 2D — Westfield/Alderwood-style read-only plan ═══
//
// • Colored filled polygons at 0.7 fill opacity
// • Centered tenant label (icon + name) on each space
// • Parking spaces rendered in neutral grey
// • Door/wall types rendered as lines (no fill)
// • Panning via drag, zoom via wheel / pinch
// • Reads from editableSpaceStore (same data as the editor)
// • Annotation overlay optional (from annotationsStore)

import React, {
  useRef, useState, useCallback, useEffect, useMemo,
} from 'react'
import { useEditableSpaceStore }  from '../../stores/editableSpaceStore'
import { AnnotationsLayer }       from '../../components/AnnotationsLayer'
import { useMapViewerStore }      from '../stores/mapViewerStore'
import { useTourStore }           from '../../guided-tour/stores/tourStore'
import TourPlayer                 from '../../guided-tour/TourPlayer'
import TourPathOverlay            from '../../guided-tour/TourPathOverlay'
import {
  SPACE_TYPE_META,
  FLOOR_LEVEL_META,
  type FloorLevelKey,
} from '../../proph3t/libraries/spaceTypeLibrary'
import type { EditableSpace } from '../../components/SpaceEditorCanvas'

// ── Helpers ──────────────────────────────────────────────────────────────────

function isDoorType(type: string): boolean {
  return type.startsWith('porte_') || type === 'sortie_secours'
}

function isParkingType(type: string): boolean {
  return type === 'parking' || type === 'parking_ext' || type === 'parking_silo'
    || type === 'parking_velo' || type === 'parking_moto'
    || type === 'voie_acces' || type === 'terre_plein'
}

/** Converts polygon points (metres) to SVG path string in screen-space. */
function polyToPath(
  pts: { x: number; y: number }[],
  toScreen: (x: number, y: number) => { x: number; y: number },
): string {
  if (pts.length < 2) return ''
  const mapped = pts.map((p) => toScreen(p.x, p.y))
  return mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'
}

/** Centroid in screen space. */
function screenCentroid(
  pts: { x: number; y: number }[],
  toScreen: (x: number, y: number) => { x: number; y: number },
): { x: number; y: number } {
  if (!pts.length) return { x: 0, y: 0 }
  const sum = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 })
  const cx = sum.x / pts.length
  const cy = sum.y / pts.length
  return toScreen(cx, cy)
}

/** Screen-space bounding box width of a polygon (used to clamp label). */
function screenPolyWidth(
  pts: { x: number; y: number }[],
  toScreen: (x: number, y: number) => { x: number; y: number },
): number {
  if (!pts.length) return 0
  const xs = pts.map((p) => toScreen(p.x, p.y).x)
  return Math.max(...xs) - Math.min(...xs)
}

// ── Door line symbol (same logic as SpaceEditorCanvas) ────────────────────

function DoorLine({
  pts,
  color,
  strokeWidth,
  toScreen,
}: {
  pts: { x: number; y: number }[]
  color: string
  strokeWidth: number
  toScreen: (x: number, y: number) => { x: number; y: number }
}) {
  if (pts.length < 2) return null
  const screen = pts.map((p) => toScreen(p.x, p.y))
  let maxLen = 0; let bestI = 0
  for (let i = 0; i < screen.length; i++) {
    const j = (i + 1) % screen.length
    const d = Math.hypot(screen[j].x - screen[i].x, screen[j].y - screen[i].y)
    if (d > maxLen) { maxLen = d; bestI = i }
  }
  const p1 = screen[bestI]
  const p2 = screen[(bestI + 1) % screen.length]
  if (maxLen < 1) return null
  const ux = (p2.x - p1.x) / maxLen
  const uy = (p2.y - p1.y) / maxLen
  const jambLen = 5
  const nx = -uy * jambLen; const ny = ux * jambLen
  return (
    <g>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={p1.x - nx} y1={p1.y - ny} x2={p1.x + nx} y2={p1.y + ny}
        stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" />
      <line x1={p2.x - nx} y1={p2.y - ny} x2={p2.x + nx} y2={p2.y + ny}
        stroke={color} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" />
    </g>
  )
}

// ── Floor pill selector ────────────────────────────────────────────────────

const FLOOR_ORDER: FloorLevelKey[] = ['b2', 'b1', 'rdc', 'r1', 'r2', 'r3', 'terrasse']

function FloorSelector({
  activeFloor, spaces, onChange,
}: {
  activeFloor: FloorLevelKey
  spaces: EditableSpace[]
  onChange: (f: FloorLevelKey) => void
}) {
  const floorsWithSpaces = useMemo(() => {
    const s = new Set(spaces.map((sp) => sp.floorLevel))
    return FLOOR_ORDER.filter((f) => s.has(f))
  }, [spaces])

  if (floorsWithSpaces.length <= 1) return null

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 bg-[#111827]/90 backdrop-blur rounded-full px-2 py-1.5 shadow-xl border border-white/10 z-20">
      {floorsWithSpaces.map((f) => {
        const meta = FLOOR_LEVEL_META[f]
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={[
              'px-3 py-0.5 rounded-full text-xs font-semibold transition-all',
              activeFloor === f
                ? 'bg-white text-[#111827]'
                : 'text-white/50 hover:text-white hover:bg-white/10',
            ].join(' ')}
          >
            {meta?.label ?? f.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface MapViewer2DProps {
  /** Override active floor (controlled). If omitted uses store. */
  floorLevel?: FloorLevelKey
  /**
   * When set, a click on the plan will call this with world coordinates
   * instead of the normal pan-drag behaviour. Used for tour-step placement.
   */
  onAddTourStep?: (x: number, y: number) => void
  className?: string
}

export default function MapViewer2D({ floorLevel: floorProp, onAddTourStep, className = '' }: MapViewer2DProps) {
  const allSpaces       = useEditableSpaceStore((s) => s.spaces)
  const storeFloor      = useMapViewerStore((s) => s.activeFloor)
  const setStoreFloor   = useMapViewerStore((s) => s.setActiveFloor)
  const showAnnotations = useMapViewerStore((s) => s.showAnnotations)
  const showUtilities   = useMapViewerStore((s) => s.showUtilities)
  const showParking     = useMapViewerStore((s) => s.showParking)
  const zoom2d          = useMapViewerStore((s) => s.zoom2d)
  const setZoom2d       = useMapViewerStore((s) => s.setZoom2d)

  const activeFloor = floorProp ?? storeFloor

  // ── Viewport ──────────────────────────────────────────────────────────────
  const svgRef   = useRef<SVGSVGElement>(null)
  const [pan, setPan] = useState({ x: 20, y: 20 })       // screen offset in px
  const panRef   = useRef(pan)
  const zoomRef  = useRef(zoom2d)
  const dragging = useRef<{ startX: number; startY: number; origPan: { x: number; y: number } } | null>(null)

  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { zoomRef.current = zoom2d }, [zoom2d])

  const toScreen = useCallback((mx: number, my: number) => ({
    x: mx * zoomRef.current + panRef.current.x,
    y: my * zoomRef.current + panRef.current.y,
  }), [])

  const toWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - panRef.current.x) / zoomRef.current,
    y: (sy - panRef.current.y) / zoomRef.current,
  }), [])

  // ── Filter spaces for active floor ────────────────────────────────────────
  const visibleSpaces = useMemo(() => {
    return allSpaces.filter((s) => {
      if (s.floorLevel !== activeFloor) return false
      const meta = SPACE_TYPE_META[s.type]
      if (!meta) return false
      if (!showUtilities && meta.category === 'techniques-securite') return false
      if (!showParking && isParkingType(s.type)) return false
      return true
    })
  }, [allSpaces, activeFloor, showUtilities, showParking])

  // ── Auto-fit on floor change (skipped while tour is playing — panToWorld takes precedence) ──
  useEffect(() => {
    if (isTourPlaying) return   // tour player controls the viewport
    if (!visibleSpaces.length || !svgRef.current) return
    const svg = svgRef.current
    const { width, height } = svg.getBoundingClientRect()
    if (!width || !height) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    visibleSpaces.forEach((s) => {
      s.polygon.forEach((p) => {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
      })
    })
    const pw = maxX - minX || 10
    const ph = maxY - minY || 10
    const pad = 60
    const z = Math.min((width - pad * 2) / pw, (height - pad * 2) / ph, 40)
    const nx = (width  - pw * z) / 2 - minX * z
    const ny = (height - ph * z) / 2 - minY * z
    setZoom2d(z)
    setPan({ x: nx, y: ny })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFloor])

  // ── Pointer drag / tap ───────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = { startX: e.clientX, startY: e.clientY, origPan: { ...panRef.current } }
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return
    // Skip tiny moves so tap-to-place still works when in addTourStep mode
    const dx = e.clientX - dragging.current.startX
    const dy = e.clientY - dragging.current.startY
    if (onAddTourStep && Math.hypot(dx, dy) < 4) return
    const np = { x: dragging.current.origPan.x + dx, y: dragging.current.origPan.y + dy }
    panRef.current = np
    setPan(np)
  }
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragging.current
    dragging.current = null
    // If we have an addTourStep handler and the pointer barely moved → treat as a tap/click
    if (onAddTourStep && d) {
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (Math.hypot(dx, dy) < 4) {
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const wx = (sx - panRef.current.x) / zoomRef.current
        const wy = (sy - panRef.current.y) / zoomRef.current
        onAddTourStep(wx, wy)
      }
    }
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const wBefore = toWorld(mx, my)
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const nz = Math.max(1, Math.min(50, zoomRef.current * factor))
    const np = {
      x: mx - wBefore.x * nz,
      y: my - wBefore.y * nz,
    }
    zoomRef.current = nz
    panRef.current  = np
    setZoom2d(nz)
    setPan(np)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  // Derive the screen-space toScreen from current state (not refs) for render
  const toScreenState = useCallback((mx: number, my: number) => ({
    x: mx * zoom2d + pan.x,
    y: my * zoom2d + pan.y,
  }), [zoom2d, pan])

  const toWorldState = useCallback((sx: number, sy: number) => ({
    x: (sx - pan.x) / zoom2d,
    y: (sy - pan.y) / zoom2d,
  }), [zoom2d, pan])

  // Annotation helpers forwarded to AnnotationsLayer
  const worldToScreen = useCallback((x: number, y: number) => toScreenState(x, y), [toScreenState])
  const screenToWorld = useCallback((x: number, y: number) => toWorldState(x, y), [toWorldState])

  const activeFloorId = `floor-${activeFloor}`   // stable id per floor

  // ── Tour integration ──────────────────────────────────────────────────────
  const tourPlayer    = useTourStore((s) => s.player)
  const isTourPlaying = tourPlayer.isPlaying
  const tours         = useTourStore((s) => s.tours)
  const goToStep      = useTourStore((s) => s.goToStep)
  const activeTour    = tours.find((t) => t.id === tourPlayer.activeTourId)

  /** Smooth pan so that world point (wx, wy) is centred in the viewport. */
  const panToWorld = useCallback((wx: number, wy: number, targetZoom?: number) => {
    const svg = svgRef.current
    if (!svg) return
    const { width, height } = svg.getBoundingClientRect()
    const nz = targetZoom ? Math.max(1, Math.min(50, targetZoom)) : zoomRef.current
    const np = {
      x: width  / 2 - wx * nz,
      y: height / 2 - wy * nz,
    }
    zoomRef.current = nz
    panRef.current  = np
    setZoom2d(nz)
    setPan(np)
  }, [setZoom2d])

  return (
    <div className={`relative flex-1 overflow-hidden bg-[#0f172a] ${className}`}>

      {/* SVG canvas */}
      {/* Crosshair hint when in tour step placement mode */}
      {onAddTourStep && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-start justify-center pt-4">
          <div className="px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-medium">
            Cliquez sur le plan pour placer l'étape
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: onAddTourStep ? 'crosshair' : dragging.current ? 'grabbing' : 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { dragging.current = null }}
        onWheel={onWheel}
      >
        {/* Grid — subtle 10m grid */}
        <GridLayer zoom={zoom2d} pan={pan} />

        {/* Spaces */}
        {visibleSpaces.map((s) => {
          const meta = SPACE_TYPE_META[s.type]
          if (!meta) return null
          const pts = s.polygon
          const isParking = isParkingType(s.type)
          const color = isParking ? '#334155' : meta.color
          const fillColor = isParking ? '#1e293b' : meta.color
          const isDoor = isDoorType(s.type)

          if (isDoor) {
            return (
              <DoorLine
                key={s.id}
                pts={pts}
                color={color}
                strokeWidth={2}
                toScreen={toScreenState}
              />
            )
          }

          const d = polyToPath(pts, toScreenState)
          const cen = screenCentroid(pts, toScreenState)
          const pw = screenPolyWidth(pts, toScreenState)
          const label = s.vacant ? 'Disponible' : (s.tenant || s.name)
          const icon = meta.icon ?? ''
          const showLabel = pw > 24   // only when space is large enough on screen

          return (
            <g key={s.id}>
              {/* Filled polygon */}
              <path
                d={d}
                fill={fillColor}
                fillOpacity={isParking ? 0.5 : 0.68}
                stroke={color}
                strokeWidth={0.75}
                strokeOpacity={0.7}
              />
              {/* Vacant overlay — diagonal hatch pattern */}
              {s.vacant && !isParking && (
                <path
                  d={d}
                  fill="url(#vacantHatch)"
                  fillOpacity={0.15}
                />
              )}
              {/* Label */}
              {showLabel && (
                <g>
                  {icon && (
                    <text
                      x={cen.x} y={cen.y - 7}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.max(8, Math.min(14, zoom2d * 0.7))}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {icon}
                    </text>
                  )}
                  <text
                    x={cen.x} y={cen.y + (icon ? 7 : 0)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#fff"
                    fillOpacity={0.9}
                    fontSize={Math.max(6, Math.min(11, zoom2d * 0.55))}
                    fontWeight={s.tenant ? 600 : 400}
                    fontFamily="system-ui, sans-serif"
                    clipPath={`url(#clip-${s.id})`}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                  {/* Local number badge */}
                  {s.localNumber && zoom2d >= 8 && (
                    <text
                      x={cen.x} y={cen.y + (icon ? 18 : 10)}
                      textAnchor="middle" dominantBaseline="middle"
                      fill={color} fillOpacity={0.8}
                      fontSize={Math.max(5, Math.min(9, zoom2d * 0.45))}
                      fontFamily="system-ui, sans-serif"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      #{s.localNumber}
                    </text>
                  )}
                </g>
              )}
            </g>
          )
        })}

        {/* Defs */}
        <defs>
          {/* Vacant hatching */}
          <pattern id="vacantHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" strokeWidth="1.5" />
          </pattern>
          {/* Per-space clip paths for labels */}
          {visibleSpaces.map((s) => {
            const pts = s.polygon
            const cen = screenCentroid(pts, toScreenState)
            const pw = screenPolyWidth(pts, toScreenState)
            return (
              <clipPath key={`clip-${s.id}`} id={`clip-${s.id}`}>
                <rect x={cen.x - pw * 0.45} y={cen.y - 20} width={pw * 0.9} height={40} />
              </clipPath>
            )
          })}
        </defs>
      </svg>

      {/* Annotation overlay */}
      {showAnnotations && (
        <AnnotationsLayer
          floorId={activeFloorId}
          worldToScreen={worldToScreen}
          screenToWorld={screenToWorld}
          addMode={false}
          className="pointer-events-none"
        />
      )}

      {/* Tour path overlay */}
      {activeTour && (
        <TourPathOverlay
          steps={activeTour.steps}
          activeIndex={tourPlayer.currentStepIndex}
          worldToScreen={worldToScreen}
          activeFloor={activeFloor}
          onStepClick={(i) => {
            goToStep(i)
            const step = activeTour.steps[i]
            if (step) panToWorld(step.x, step.y, step.zoomLevel)
          }}
        />
      )}

      {/* Tour player */}
      {activeTour && (
        <TourPlayer
          onFloorChange={(floor) => setStoreFloor(floor)}
          onStepChange={(x, y, zoom) => panToWorld(x, y, zoom)}
        />
      )}

      {/* Floor selector */}
      <FloorSelector
        activeFloor={activeFloor}
        spaces={allSpaces}
        onChange={(f) => setStoreFloor(f)}
      />

      {/* Zoom controls — centre-anchored */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-20">
        {[{ label: '+', factor: 1.3 }, { label: '−', factor: 1 / 1.3 }].map(({ label, factor }) => (
          <button
            key={label}
            onClick={() => {
              const svg = svgRef.current
              if (!svg) return
              const { width, height } = svg.getBoundingClientRect()
              const cx = width / 2; const cy = height / 2
              const wc = toWorld(cx, cy)
              const nz = Math.max(1, Math.min(50, zoomRef.current * factor))
              const np = { x: cx - wc.x * nz, y: cy - wc.y * nz }
              zoomRef.current = nz; panRef.current = np
              setZoom2d(nz); setPan(np)
            }}
            className="w-8 h-8 rounded-lg bg-[#1e293b]/90 border border-white/10 text-white/70 hover:text-white flex items-center justify-center text-lg font-light select-none"
          >{label}</button>
        ))}
        {/* Reset fit */}
        <button
          onClick={() => {
            const svg = svgRef.current
            if (!visibleSpaces.length || !svg) return
            const { width, height } = svg.getBoundingClientRect()
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            visibleSpaces.forEach((s) => s.polygon.forEach((p) => {
              minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
              minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
            }))
            const pad = 40
            const nz = Math.min((width - pad * 2) / (maxX - minX || 10), (height - pad * 2) / (maxY - minY || 10), 40)
            const np = { x: (width - (maxX - minX) * nz) / 2 - minX * nz, y: (height - (maxY - minY) * nz) / 2 - minY * nz }
            zoomRef.current = nz; panRef.current = np
            setZoom2d(nz); setPan(np)
          }}
          className="w-8 h-8 rounded-lg bg-[#1e293b]/90 border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-xs select-none"
          title="Recadrer"
        >⊡</button>
      </div>

      {/* Scale ruler — bottom-left */}
      <ScaleRuler zoom={zoom2d} />

      {/* Empty state */}
      {!visibleSpaces.length && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/25 gap-3 pointer-events-none">
          <span className="text-4xl">🗺</span>
          <p className="text-sm">Aucun espace sur {FLOOR_LEVEL_META[activeFloor]?.label ?? activeFloor.toUpperCase()}</p>
          <p className="text-xs">Dessinez des espaces dans l'éditeur pour les visualiser ici.</p>
        </div>
      )}
    </div>
  )
}

// ── Grid layer ────────────────────────────────────────────────────────────

// ── Scale ruler ───────────────────────────────────────────────────────────
// Picks a "nice" length (1m / 5m / 10m / 20m / 50m / 100m) that maps to
// 60–150 px on screen, then draws a segmented bar.

const NICE_LENGTHS = [1, 2, 5, 10, 20, 50, 100, 200, 500]

function ScaleRuler({ zoom }: { zoom: number }) {
  // Find the best world length
  const worldLen = NICE_LENGTHS.find((l) => l * zoom >= 60 && l * zoom <= 160) ?? NICE_LENGTHS[NICE_LENGTHS.length - 1]
  const pxLen = worldLen * zoom

  const label = worldLen >= 1000 ? `${worldLen / 1000} km` : `${worldLen} m`

  return (
    <div
      className="absolute bottom-14 left-4 flex flex-col items-start gap-0.5 z-20 pointer-events-none"
    >
      {/* Bar */}
      <div
        className="flex h-1.5 rounded overflow-hidden"
        style={{ width: pxLen }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1"
            style={{ background: i % 2 === 0 ? '#94a3b8' : '#334155' }}
          />
        ))}
      </div>
      {/* Tick marks */}
      <div className="flex justify-between" style={{ width: pxLen }}>
        <span className="text-[9px] text-white/40 font-mono">0</span>
        <span className="text-[9px] text-white/40 font-mono">{label}</span>
      </div>
    </div>
  )
}

// ── Grid layer ────────────────────────────────────────────────────────────

function GridLayer({ zoom, pan }: { zoom: number; pan: { x: number; y: number } }) {
  // Only draw grid when zoomed in enough to be useful
  if (zoom < 4) return null
  const gridM = zoom >= 10 ? 5 : 10   // 5m or 10m grid
  const step = gridM * zoom

  // Use SVG pattern for infinite tiling grid
  return (
    <g opacity={0.12}>
      <defs>
        <pattern
          id="mv2d-grid"
          x={(pan.x % step + step) % step}
          y={(pan.y % step + step) % step}
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
        >
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke="#94a3b8" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect x={0} y={0} width="100%" height="100%" fill="url(#mv2d-grid)" />
    </g>
  )
}
