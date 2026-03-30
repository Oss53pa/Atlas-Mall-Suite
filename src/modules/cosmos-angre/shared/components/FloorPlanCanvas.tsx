// ═══ UNIVERSAL PLAN CANVAS — Image background + SVG zone overlay + zoom/pan ═══
// The imported plan image IS the canvas. Zones are SVG overlays in 0-1 coordinates.
// Works with any format: DWG, DXF, PDF, PNG, JPG — everything becomes an image + zones.

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import type { Floor, Zone } from '../proph3t/types'
import type { DimEntity, CalibrationResult, CotationSpec } from '../planReader/planReaderTypes'
import DimOverlay from './DimOverlay'
import CotationLayer from './CotationLayer'
import { useCadStore, CadRenderer, CadToolbar, useCadInteraction } from '../cad'

export const CANVAS_SCALE = 4

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
  showDims?: boolean
  onDimClick?: (dim: DimEntity) => void
  cotationSpecs?: CotationSpec[]
  showCotations?: boolean
  planBounds?: { minX: number; minY: number; maxX: number; maxY: number }
  planImageUrl?: string
  /** Plans superposes avec opacite individuelle */
  overlayLayers?: Array<{ planImageUrl: string; opacity: number }>
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
  dims, calibration, showDims = false, onDimClick, cotationSpecs, showCotations = false, planBounds,
  planImageUrl,
  overlayLayers,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const floorId = floor?.id ?? ''
  const floorZones = useMemo(() => zones.filter(z => z.floorId === floorId), [zones, floorId])

  // ── Image dimensions (detected from loaded image) ──────
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!planImageUrl) { setImgSize(null); return }
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
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
  const hasImage = !!planImageUrl && !!imgSize
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

  // Reset zoom when plan changes
  useEffect(() => { setView({ zoom: 1, panX: 0, panY: 0 }) }, [planImageUrl, floorId])

  // Wheel zoom — must use non-passive listener to allow preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setView(v => ({
        ...v,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom + delta * v.zoom)),
      }))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or Alt+click → pan
      isPanning.current = true
      panStart.current = { x: e.clientX - view.panX, y: e.clientY - view.panY }
      e.preventDefault()
    }
  }, [view.panX, view.panY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return
    setView(v => ({ ...v, panX: e.clientX - panStart.current.x, panY: e.clientY - panStart.current.y }))
  }, [])

  const handleMouseUp = useCallback(() => { isPanning.current = false }, [])

  // ── Click handler (converts screen coords to 0-1 plan coords) ──
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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
      <div className={`flex items-center justify-center bg-gray-950 text-gray-600 text-sm ${className}`}>
        Chargement du plan...
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

  // Determine cursor based on CAD tool
  const cadCursor = cadActiveTool === 'select' ? 'default'
    : cadActiveTool === 'pan' ? (isPanning.current ? 'grabbing' : 'grab')
    : cadActiveTool === 'eraser' ? 'crosshair'
    : cadActiveTool === 'text' ? 'text'
    : 'crosshair'

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
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
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
          title="Reset zoom"
        >1:1</button>
      </div>

      {/* Zoom info */}
      <div className="absolute bottom-2 left-2 z-10 text-[9px] text-gray-600 font-mono">
        {Math.round(view.zoom * 100)}% {hasImage ? `· ${imgSize!.w}×${imgSize!.h}px` : `· ${floor.widthM}×${floor.heightM}m`}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${canvasW} ${canvasH}`}
        className="w-full h-full"
        style={{
          cursor: cadCursor,
          transform: `scale(${view.zoom}) translate(${view.panX / view.zoom}px, ${view.panY / view.zoom}px)`,
          transformOrigin: 'center center',
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
            href={planImageUrl}
            x={0} y={0}
            width={canvasW} height={canvasH}
            preserveAspectRatio="none"
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
              onClick={() => onEntityClick?.(zone.id, 'zone')}
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
      </div>
    </div>
  )
}
