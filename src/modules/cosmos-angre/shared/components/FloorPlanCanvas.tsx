// ═══ UNIVERSAL PLAN CANVAS — Image background + SVG zone overlay + zoom/pan ═══
// The imported plan image IS the canvas. Zones are SVG overlays in 0-1 coordinates.
// Works with any format: DWG, DXF, PDF, PNG, JPG — everything becomes an image + zones.

import React, { useCallback, useMemo, useRef, useState, useEffect, lazy, Suspense } from 'react'
import type { Floor, Zone } from '../proph3t/types'
import type { DimEntity, CalibrationResult, CotationSpec } from '../planReader/planReaderTypes'
import DimOverlay from './DimOverlay'
import CotationLayer from './CotationLayer'
import { useCadStore, CadRenderer, CadToolbar, useCadInteraction } from '../cad'
import { CANVAS_SCALE } from './canvasConstants'

// Re-export for backwards compatibility with external consumers
// (e.g. Vol3Module imports CANVAS_SCALE from this file).
export { CANVAS_SCALE }

const View3DSection = lazy(() => import('../view3d/View3DSection'))

interface FloorPlanCanvasProps {
  floor: Floor
  zones: Zone[]
  showHeatmap?: boolean
  heatmapContent?: React.ReactNode
  onEntityClick?: (id: string, type: 'camera' | 'door' | 'zone' | 'transition') => void
  onCanvasClick?: (x: number, y: number) => void
  selectedId?: string | null
  children?: React.ReactNode
  className?: string
  cursorMode?: 'select' | 'place'
  dims?: DimEntity[]
  calibration?: CalibrationResult | null
  showDims?: boolean | undefined
  onDimClick?: (dim: DimEntity) => void
  cotationSpecs?: CotationSpec[]
  showCotations?: boolean | undefined
  planBounds?: { minX: number; minY: number; maxX: number; maxY: number }
  planImageUrl?: string
  /** Plans superposes avec opacite individuelle */
  overlayLayers?: Array<{ planImageUrl: string; opacity: number }>
  /** Zone editing callbacks */
  onZoneUpdate?: (zoneId: string, updates: Partial<Zone>) => void
}

// ── Zoom/pan state ───────────────────────────────────────────

interface ViewState {
  zoom: number
  panX: number
  panY: number
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 5
const ZOOM_STEP = 0.1

// ── Component ────────────────────────────────────────────────

export default function FloorPlanCanvas({
  floor, zones, showHeatmap, heatmapContent, onEntityClick, onCanvasClick, selectedId, children, className = '',
  cursorMode = 'select',
  dims, calibration, showDims: showDimsProp, onDimClick, cotationSpecs, showCotations: showCotationsProp, planBounds,
  planImageUrl,
  overlayLayers,
  onZoneUpdate,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const floorId = floor?.id ?? ''
  const floorZones = useMemo(() => zones.filter(z => z.floorId === floorId), [zones, floorId])

  // ── View mode (2D / 3D) ──────
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')

  // ── Zone editing state ──────
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null)
  const editingZone = editingZoneId ? zones.find(z => z.id === editingZoneId) : null

  // ── Dims/cotations toggle (auto-enable when data available) ──────
  const [showDimsLocal, setShowDimsLocal] = useState(true)
  const [showCotationsLocal, setShowCotationsLocal] = useState(true)
  const showDims = showDimsProp ?? (dims && dims.length > 0 ? showDimsLocal : false)
  const showCotations = showCotationsProp ?? (cotationSpecs && cotationSpecs.length > 0 ? showCotationsLocal : false)

  // ── Image dimensions (detected from loaded image) ──────
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

  // État local : URL effective (vidée si blob mort, pour éviter erreurs GET répétées)
  const [effectiveImageUrl, setEffectiveImageUrl] = useState<string | undefined>(planImageUrl)

  useEffect(() => {
    if (!planImageUrl) {
      setImgSize(null)
      setEffectiveImageUrl(undefined)
      return
    }
    setEffectiveImageUrl(planImageUrl)
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => {
      // Blob mort ou URL invalide → purge pour éviter ré-utilisation dans <image href>
      console.warn('[FloorPlanCanvas] planImageUrl invalide (blob mort ?) — purge')
      setImgSize(null)
      setEffectiveImageUrl(undefined)
    }
    img.src = planImageUrl
  }, [planImageUrl])

  // ── CAD engine ──────────────────────────────────────────
  const cadEntities = useCadStore(s => s.entities)
  const cadLayers = useCadStore(s => s.layers)
  const cadSelectedIds = useCadStore(s => s.selectedIds)
  const cadActiveTool = useCadStore(s => s.activeTool)
  const cadIsDrawing = useCadStore(s => s.isDrawing)
  const cadDrawPoints = useCadStore(s => s.drawPoints)
  const cadSnapIndicator = useCadStore(s => s.snapIndicator)
  const cadMeasureResult = useCadStore(s => s.measureResult)
  const cadSelect = useCadStore(s => s.select)
  const cadSnap = useCadStore(s => s.snap)

  // ── Canvas dimensions ──────────────────────────────────
  // When plan image exists: viewBox = image dimensions (pixel-perfect)
  // When no image: viewBox = floor metres × SCALE (legacy behavior)
  const hasImage = !!effectiveImageUrl && !!imgSize
  const canvasW = hasImage ? imgSize!.w : (floor?.widthM ?? 200) * CANVAS_SCALE
  const canvasH = hasImage ? imgSize!.h : (floor?.heightM ?? 140) * CANVAS_SCALE

  // ── CAD interaction hook ───────────────────────────────
  const { handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasDoubleClick } = useCadInteraction(canvasW, canvasH)

  const svgPointFromEvent = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    if (!svgRef.current) return null
    const pt = svgRef.current.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse())
    return { x: svgPt.x, y: svgPt.y }
  }, [])

  // ── Zoom / Pan ─────────────────────────────────────────
  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  // Auto-fit zoom when plan changes
  // SVG viewBox + w-full h-full already handles fitting to container.
  // We just reset zoom to 1 (= natural fit). User zooms in/out from there.
  useEffect(() => {
    setView({ zoom: 1, panX: 0, panY: 0 })
  }, [planImageUrl, floorId, canvasW, canvasH])

  // Wheel zoom — cursor-centered: zoom towards mouse position
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      setView(v => {
        const factor = e.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor))
        const scale = newZoom / v.zoom
        // Adjust pan so the point under the cursor stays fixed
        const newPanX = mx - scale * (mx - v.panX)
        const newPanY = my - scale * (my - v.panY)
        return { zoom: newZoom, panX: newPanX, panY: newPanY }
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Pan with: middle-click, Alt+click, Space+click, or left-click when pan/select tool
    const isMiddle = e.button === 1
    const isAltClick = e.button === 0 && e.altKey
    const isSpaceClick = e.button === 0 && spaceHeld
    const isSpacePan = e.button === 0 && cadActiveTool === 'pan'
    const isLeftPan = e.button === 0 && (cadActiveTool === 'select' || cadActiveTool === 'pan') && !cadIsDrawing
    if (isMiddle || isAltClick || isSpaceClick || isSpacePan || isLeftPan) {
      isPanning.current = true
      panStart.current = { x: e.clientX - view.panX, y: e.clientY - view.panY }
      e.preventDefault()
    }
  }, [view.panX, view.panY, cadActiveTool, cadIsDrawing])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    setView(v => ({ ...v, panX: e.clientX - panStart.current.x, panY: e.clientY - panStart.current.y }))
  }, [])

  const wasPanning = useRef(false)
  const handleMouseUp = useCallback(() => {
    wasPanning.current = isPanning.current
    isPanning.current = false
  }, [])

  // ── Space key → temporary pan mode ──
  const [spaceHeld, setSpaceHeld] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !e.repeat) { setSpaceHeld(true); e.preventDefault() } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ── Touch gestures: pinch-to-zoom + two-finger pan ──
  const lastTouches = useRef<{ x1: number; y1: number; x2: number; y2: number; dist: number; cx: number; cy: number } | null>(null)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        lastTouches.current = {
          x1: t0.clientX, y1: t0.clientY, x2: t1.clientX, y2: t1.clientY,
          dist, cx: (t0.clientX + t1.clientX) / 2, cy: (t0.clientY + t1.clientY) / 2,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouches.current) {
        e.preventDefault()
        const t0 = e.touches[0], t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
        const cx = (t0.clientX + t1.clientX) / 2
        const cy = (t0.clientY + t1.clientY) / 2
        const prev = lastTouches.current
        const scaleFactor = dist / prev.dist

        setView(v => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * scaleFactor))
          const s = newZoom / v.zoom
          const rect = el.getBoundingClientRect()
          const mx = cx - rect.left, my = cy - rect.top
          return {
            zoom: newZoom,
            panX: mx - s * (mx - v.panX) + (cx - prev.cx),
            panY: my - s * (my - v.panY) + (cy - prev.cy),
          }
        })

        lastTouches.current = { x1: t0.clientX, y1: t0.clientY, x2: t1.clientX, y2: t1.clientY, dist, cx, cy }
      }
    }

    const handleTouchEnd = () => { lastTouches.current = null }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  // ── Click handler (converts screen coords to 0-1 plan coords) ──
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Don't trigger click after a pan drag
    if (wasPanning.current) { wasPanning.current = false; return }
    if (!onCanvasClick || !svgRef.current) return
    const target = e.target as Element
    if (target.tagName !== 'rect' || !target.classList.contains('canvas-bg')) return

    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    // Return coordinates as 0-1 relative to canvas
    if (hasImage) {
      onCanvasClick(svgPt.x / canvasW, svgPt.y / canvasH)
    } else {
      // Legacy: return in floor metres
      onCanvasClick(svgPt.x / CANVAS_SCALE, svgPt.y / CANVAS_SCALE)
    }
  }, [onCanvasClick, hasImage, canvasW, canvasH])

  // ── Guard ──────────────────────────────────────────────
  if (!floor) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-950 text-center p-8 ${className}`}>
        <div className="text-gray-300 text-sm mb-2 font-medium">Aucun plan chargé</div>
        <div className="text-gray-500 text-xs max-w-md leading-relaxed">
          Importez un plan DXF ou DWG depuis l'onglet <strong className="text-purple-400">Plans importés</strong>.
          Le plan sera ensuite disponible dans tous les volumes (Commercial, Sécurité, Parcours).
        </div>
      </div>
    )
  }

  // ── Zone coordinate conversion ─────────────────────────
  // Zones may be in:
  // - Normalized 0-1 coords (from import) → multiply by canvasW/canvasH
  // - Floor metre coords (legacy mock data) → multiply by CANVAS_SCALE
  const zoneToSvg = (z: Zone) => {
    if (hasImage) {
      // Zones from import are in 0-1 → scale to image pixels
      const isNormalized = z.x <= 1 && z.y <= 1 && z.w <= 1 && z.h <= 1
      if (isNormalized) {
        return { x: z.x * canvasW, y: z.y * canvasH, w: z.w * canvasW, h: z.h * canvasH }
      }
      // Legacy metre coords → scale proportionally to image
      return {
        x: (z.x / (floor.widthM || 200)) * canvasW,
        y: (z.y / (floor.heightM || 140)) * canvasH,
        w: (z.w / (floor.widthM || 200)) * canvasW,
        h: (z.h / (floor.heightM || 140)) * canvasH,
      }
    }
    // No image → legacy SCALE multiplication
    return { x: z.x * CANVAS_SCALE, y: z.y * CANVAS_SCALE, w: z.w * CANVAS_SCALE, h: z.h * CANVAS_SCALE }
  }

  // Determine cursor based on CAD tool and state
  const cadCursor = spaceHeld ? (isPanning.current ? 'grabbing' : 'grab')
    : cadActiveTool === 'select' ? (isPanning.current ? 'grabbing' : 'default')
    : cadActiveTool === 'pan' ? (isPanning.current ? 'grabbing' : 'grab')
    : cadActiveTool === 'eraser' ? 'crosshair'
    : cadActiveTool === 'text' ? 'text'
    : 'crosshair'

  // ── 3D view data (built from current floor/zones) ──
  const view3DData = useMemo(() => ({
    sourceVolume: 'vol1' as const,
    floors: floor ? [floor] : [],
    zones: floorZones,
    transitions: [],
  }), [floor, floorZones])

  // ── 3D MODE: render View3DSection fullscreen ──
  if (viewMode === '3d') {
    return (
      <div ref={containerRef} className={`relative overflow-hidden bg-gray-950 flex flex-col ${className}`}>
        {/* 2D/3D toggle */}
        <div className="absolute top-3 right-3 z-20 flex gap-1">
          <button
            onClick={() => setViewMode('2d')}
            className="px-3 py-1.5 rounded bg-gray-800/90 text-gray-300 text-[11px] font-medium hover:bg-gray-700 transition-colors"
          >2D</button>
          <button
            className="px-3 py-1.5 rounded bg-blue-600/90 text-white text-[11px] font-medium"
          >3D</button>
        </div>
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Chargement 3D...</div>
        }>
          <View3DSection data={view3DData} />
        </Suspense>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-950 flex ${className}`}
    >
      {/* CAD Toolbar (left side) */}
      <CadToolbar />

      {/* Canvas area */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => {
          handleMouseMove(e)
          const pt = svgPointFromEvent(e)
          if (pt) handleCanvasMouseMove(pt)
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
      {/* Zoom controls + view mode toggle */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        {/* 2D/3D toggle */}
        <div className="flex gap-0.5 mb-1">
          <button
            className="flex-1 px-1.5 py-1 rounded-l bg-blue-600/80 text-white text-[9px] font-bold"
          >2D</button>
          <button
            onClick={() => setViewMode('3d')}
            className="flex-1 px-1.5 py-1 rounded-r bg-gray-800/80 text-gray-400 text-[9px] font-bold hover:bg-gray-700"
          >3D</button>
        </div>
        <button
          onClick={() => setView(v => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + 0.2) }))}
          className="w-7 h-7 rounded bg-gray-800/80 text-white text-sm font-bold hover:bg-gray-700 flex items-center justify-center"
        >+</button>
        <button
          onClick={() => setView(v => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - 0.2) }))}
          className="w-7 h-7 rounded bg-gray-800/80 text-white text-sm font-bold hover:bg-gray-700 flex items-center justify-center"
        >-</button>
        <button
          onClick={() => setView({ zoom: 1, panX: 0, panY: 0 })}
          className="w-7 h-7 rounded bg-gray-800/80 text-gray-400 text-[9px] hover:bg-gray-700 flex items-center justify-center"
          title="Recentrer (zoom 100%)"
        >Fit</button>
        {/* Dims toggle */}
        {dims && dims.length > 0 && (
          <button
            onClick={() => setShowDimsLocal(v => !v)}
            className={`w-7 h-7 rounded text-[9px] font-bold flex items-center justify-center ${showDims ? 'bg-red-600/80 text-white' : 'bg-gray-800/80 text-gray-500'}`}
            title={showDims ? 'Masquer les cotes' : 'Afficher les cotes'}
          >D</button>
        )}
        {/* Cotations toggle */}
        {cotationSpecs && cotationSpecs.length > 0 && (
          <button
            onClick={() => setShowCotationsLocal(v => !v)}
            className={`w-7 h-7 rounded text-[9px] font-bold flex items-center justify-center ${showCotations ? 'bg-blue-600/80 text-white' : 'bg-gray-800/80 text-gray-500'}`}
            title={showCotations ? 'Masquer les cotations' : 'Afficher les cotations'}
          >C</button>
        )}
      </div>

      {/* Zoom info */}
      <div className="absolute bottom-2 left-2 z-10 text-[9px] text-gray-600 font-mono">
        {Math.round(view.zoom * 100)}% {hasImage ? `· ${imgSize!.w}×${imgSize!.h}px` : `· ${floor.widthM}×${floor.heightM}m`}
      </div>

      {/* SVG Canvas — viewBox handles auto-fit, transform handles zoom/pan */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{
          cursor: cadCursor,
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          transformOrigin: '0 0',
        }}
        onClick={(e) => {
          handleSvgClick(e)
          const pt = svgPointFromEvent(e)
          if (pt) handleCanvasMouseDown(pt, e)
        }}
        onDoubleClick={(e) => {
          const pt = svgPointFromEvent(e)
          if (pt) handleCanvasDoubleClick(pt)
        }}
      >
        {/* Background */}
        <rect width={canvasW} height={canvasH} fill="#0a0a0f" className="canvas-bg" />

        {/* Plan image principal (full size, pixel-perfect) */}
        {hasImage && (
          <image
            href={effectiveImageUrl}
            x={0} y={0}
            width={canvasW} height={canvasH}
            preserveAspectRatio="none"
            onError={(e) => {
              (e.target as SVGImageElement).style.display = 'none'
              setEffectiveImageUrl(undefined)
            }}
          />
        )}

        {/* Plans superposes (overlay layers) */}
        {overlayLayers?.map((layer, i) => (
          <image
            key={`overlay-${i}`}
            href={layer.planImageUrl}
            x={0} y={0}
            width={canvasW} height={canvasH}
            preserveAspectRatio="none"
            onError={(e) => { (e.target as SVGImageElement).style.display = 'none' }}
            opacity={layer.opacity}
            style={{ mixBlendMode: 'screen' }}
          />
        ))}

        {/* Grid (only when no plan image) */}
        {!hasImage && (
          <>
            <defs>
              <pattern id="grid-sm" width={CANVAS_SCALE * 10} height={CANVAS_SCALE * 10} patternUnits="userSpaceOnUse">
                <path d={`M ${CANVAS_SCALE * 10} 0 L 0 0 0 ${CANVAS_SCALE * 10}`} fill="none" stroke="#1f2937" strokeWidth="0.5" />
              </pattern>
              <pattern id="grid-lg" width={CANVAS_SCALE * 50} height={CANVAS_SCALE * 50} patternUnits="userSpaceOnUse">
                <path d={`M ${CANVAS_SCALE * 50} 0 L 0 0 0 ${CANVAS_SCALE * 50}`} fill="none" stroke="#374151" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width={canvasW} height={canvasH} fill="url(#grid-sm)" />
            <rect width={canvasW} height={canvasH} fill="url(#grid-lg)" />
          </>
        )}

        {/* Zone overlays */}
        {floorZones.map(zone => {
          const isSelected = zone.id === selectedId
          const { x, y, w, h } = zoneToSvg(zone)
          const fontSize = hasImage ? Math.max(10, Math.min(16, Math.sqrt(w * h) / 8)) : 10
          return (
            <g
              key={zone.id}
              onClick={(e) => {
                e.stopPropagation()
                onEntityClick?.(zone.id, 'zone')
                if (onZoneUpdate) setEditingZoneId(zone.id === editingZoneId ? null : zone.id)
              }}
              className="cursor-pointer"
            >
              <rect
                x={x} y={y} width={w} height={h}
                fill={zone.color}
                fillOpacity={showHeatmap ? 0.4 : hasImage ? 0.25 : 0.2}
                stroke={isSelected ? '#a855f7' : zone.color}
                strokeWidth={isSelected ? 3 : hasImage ? 2 : 1}
                strokeDasharray={isSelected ? '8 4' : undefined}
                rx={hasImage ? 4 : 2}
              />
              <text
                x={x + w / 2} y={y + h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffffff"
                fontSize={fontSize}
                fontFamily="system-ui"
                fontWeight={600}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {zone.label}
              </text>
              {zone.surfaceM2 && (
                <text
                  x={x + w / 2} y={y + h / 2 + fontSize + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#9ca3af"
                  fontSize={fontSize * 0.75}
                  fontFamily="system-ui"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {zone.surfaceM2} m²
                </text>
              )}
              {/* Criticality badge */}
              <circle
                cx={x + w - 10}
                cy={y + 10}
                r={hasImage ? 8 : 6}
                fill={zone.niveau >= 4 ? '#ef4444' : zone.niveau >= 3 ? '#f97316' : '#22c55e'}
                fillOpacity={0.85}
              />
              <text
                x={x + w - 10} y={y + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={hasImage ? 9 : 7}
                fontWeight="bold"
              >
                {zone.niveau}
              </text>
            </g>
          )
        })}

        {/* Heatmap overlay */}
        {showHeatmap && heatmapContent}

        {/* Dim overlay (cotes DXF) */}
        {showDims && dims && dims.length > 0 && (
          <DimOverlay
            dims={dims}
            calibration={calibration ?? null}
            canvasWidth={canvasW}
            canvasHeight={canvasH}
            planBounds={planBounds ?? { minX: 0, minY: 0, maxX: floor?.widthM ?? 200, maxY: floor?.heightM ?? 140 }}
            visible={showDims}
            onDimClick={onDimClick}
          />
        )}

        {/* Cotation layer */}
        {showCotations && cotationSpecs && cotationSpecs.length > 0 && (
          <CotationLayer
            specs={cotationSpecs}
            canvasWidth={canvasW}
            canvasHeight={canvasH}
            visible={showCotations}
          />
        )}

        {/* ═══ CAD LAYER ═══ */}

        {/* CAD entities (walls, zones, cotations, annotations) */}
        <CadRenderer
          entities={cadEntities}
          layers={cadLayers}
          selectedIds={cadSelectedIds}
          onEntityClick={(id) => cadSelect(id)}
        />

        {/* Drawing preview (rubber-band while drawing) */}
        {cadIsDrawing && cadDrawPoints.length > 0 && (
          <g className="cad-draw-preview" opacity={0.6}>
            {cadActiveTool === 'zone_rect' && cadDrawPoints.length === 1 && (
              <rect
                x={cadDrawPoints[0].x} y={cadDrawPoints[0].y}
                width={0} height={0}
                fill="#3b82f6" fillOpacity={0.1}
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
              />
            )}
            {(cadActiveTool === 'wall' || cadActiveTool === 'cloison' || cadActiveTool === 'cotation' || cadActiveTool === 'arrow') && (
              <polyline
                points={cadDrawPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={cadActiveTool === 'cotation' ? '#ef4444' : '#e5e7eb'}
                strokeWidth={cadActiveTool === 'wall' ? 4 : 2}
                strokeDasharray="6 3"
              />
            )}
            {cadActiveTool === 'zone_poly' && cadDrawPoints.length >= 2 && (
              <polyline
                points={cadDrawPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="#3b82f6" fillOpacity={0.08}
                stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3"
              />
            )}
            {/* Vertex dots for active draw */}
            {cadDrawPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4} fill="#a855f7" stroke="#fff" strokeWidth={1} />
            ))}
          </g>
        )}

        {/* Snap indicator */}
        {cadSnapIndicator && cadSnapIndicator.type !== 'none' && (
          <g className="cad-snap-indicator">
            <circle
              cx={cadSnapIndicator.point.x} cy={cadSnapIndicator.point.y}
              r={6} fill="none"
              stroke={cadSnapIndicator.type === 'grid' ? '#f59e0b' : cadSnapIndicator.type === 'vertex' ? '#22c55e' : '#38bdf8'}
              strokeWidth={2}
            />
            {cadSnapIndicator.type === 'vertex' && (
              <rect
                x={cadSnapIndicator.point.x - 4} y={cadSnapIndicator.point.y - 4}
                width={8} height={8} fill="none" stroke="#22c55e" strokeWidth={1.5}
                transform={`rotate(45, ${cadSnapIndicator.point.x}, ${cadSnapIndicator.point.y})`}
              />
            )}
          </g>
        )}

        {/* Measurement result overlay */}
        {cadMeasureResult && (
          <g className="cad-measure">
            {cadMeasureResult.type === 'distance' && cadMeasureResult.points.length >= 2 && (
              <>
                <line
                  x1={cadMeasureResult.points[0].x} y1={cadMeasureResult.points[0].y}
                  x2={cadMeasureResult.points[1].x} y2={cadMeasureResult.points[1].y}
                  stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                />
                <text
                  x={(cadMeasureResult.points[0].x + cadMeasureResult.points[1].x) / 2}
                  y={(cadMeasureResult.points[0].y + cadMeasureResult.points[1].y) / 2 - 12}
                  textAnchor="middle" fill="#f59e0b" fontSize={14} fontWeight={700}
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                >
                  {cadMeasureResult.value.toFixed(1)} {cadMeasureResult.unit}
                </text>
              </>
            )}
            {cadMeasureResult.type === 'area' && cadMeasureResult.points.length >= 3 && (
              <>
                <polygon
                  points={cadMeasureResult.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="#f59e0b" fillOpacity={0.1} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3"
                />
                <text
                  x={cadMeasureResult.points.reduce((s, p) => s + p.x, 0) / cadMeasureResult.points.length}
                  y={cadMeasureResult.points.reduce((s, p) => s + p.y, 0) / cadMeasureResult.points.length}
                  textAnchor="middle" fill="#f59e0b" fontSize={14} fontWeight={700}
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                >
                  {cadMeasureResult.value.toFixed(0)} {cadMeasureResult.unit}
                </text>
              </>
            )}
          </g>
        )}

        {/* Snap grid overlay */}
        {cadSnap.enabled && cadSnap.gridVisible && !hasImage && (
          <g className="cad-snap-grid" opacity={0.15}>
            {Array.from({ length: Math.ceil(canvasW / cadSnap.gridSize) }, (_, i) => (
              <line key={`vg${i}`} x1={i * cadSnap.gridSize} y1={0} x2={i * cadSnap.gridSize} y2={canvasH} stroke="#3b82f6" strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.ceil(canvasH / cadSnap.gridSize) }, (_, i) => (
              <line key={`hg${i}`} x1={0} y1={i * cadSnap.gridSize} x2={canvasW} y2={i * cadSnap.gridSize} stroke="#3b82f6" strokeWidth={0.5} />
            ))}
          </g>
        )}

        {/* Overlays (cameras, doors, transitions, FOV cones) rendered by parent */}
        {children}
      </svg>

      {/* Calibration status bar */}
      {calibration && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-950/80 px-3 py-1.5 flex items-center gap-4 text-[10px] z-10">
          <span className="text-gray-400">
            Calibration : {calibration.realWidthM.toFixed(1)}m × {calibration.realHeightM.toFixed(1)}m
          </span>
          <span className="text-gray-400">
            Methode : {calibration.method}
          </span>
          <span className={`font-medium ${
            calibration.confidence >= 0.8 ? 'text-emerald-400' :
            calibration.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
          }`}>
            Confiance : {Math.round(calibration.confidence * 100)}%
          </span>
          {dims && dims.length > 0 && (
            <span className="text-gray-400">{dims.length} cote(s)</span>
          )}
        </div>
      )}

      {/* ═══ ZONE EDITOR PANEL ═══ */}
      {editingZone && onZoneUpdate && (
        <div className="absolute top-3 left-14 z-20 w-64 bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-[11px] font-bold text-white truncate">{editingZone.label || 'Zone sans nom'}</span>
            <button onClick={() => setEditingZoneId(null)} className="text-gray-500 hover:text-white text-sm">&times;</button>
          </div>
          <div className="p-3 space-y-3">
            {/* Zone name */}
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-1">Nom</label>
              <input
                type="text"
                value={editingZone.label}
                onChange={(e) => onZoneUpdate(editingZone.id, { label: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[12px] text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            {/* Zone color */}
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-1">Couleur</label>
              <div className="flex gap-1.5 flex-wrap">
                {['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#ec4899', '#6366f1', '#64748b', '#84cc16', '#06b6d4', '#dc2626'].map(c => (
                  <button
                    key={c}
                    onClick={() => onZoneUpdate(editingZone.id, { color: c })}
                    className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: editingZone.color === c ? '#fff' : 'transparent',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={editingZone.color || '#3b82f6'}
                  onChange={(e) => onZoneUpdate(editingZone.id, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border border-gray-600"
                  title="Couleur personnalisee"
                />
              </div>
            </div>
            {/* Zone type */}
            <div>
              <label className="text-[9px] uppercase tracking-wider text-gray-500 block mb-1">Type</label>
              <select
                value={editingZone.type || 'commerce'}
                onChange={(e) => onZoneUpdate(editingZone.id, { type: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-[12px] text-white"
              >
                <option value="commerce">Commerce</option>
                <option value="restauration">Restauration</option>
                <option value="services">Services</option>
                <option value="loisirs">Loisirs</option>
                <option value="circulation">Circulation</option>
                <option value="technique">Technique</option>
                <option value="backoffice">Back-office</option>
                <option value="parking">Parking</option>
                <option value="financier">Securite / Finance</option>
                <option value="sortie_secours">Sortie de secours</option>
                <option value="exterieur">Exterieur</option>
              </select>
            </div>
            {/* Surface */}
            {editingZone.surfaceM2 && (
              <div className="text-[10px] text-gray-500">
                Surface : {editingZone.surfaceM2} m²
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
