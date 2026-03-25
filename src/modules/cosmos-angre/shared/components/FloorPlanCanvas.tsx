import React, { useCallback, useMemo, useRef } from 'react'
import type { Floor, Zone } from '../proph3t/types'
import type { DimEntity, CalibrationResult, CotationSpec } from '../planReader/planReaderTypes'
import DimOverlay from './DimOverlay'
import CotationLayer from './CotationLayer'

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
  // Plan reader props
  dims?: DimEntity[]
  calibration?: CalibrationResult | null
  showDims?: boolean
  onDimClick?: (dim: DimEntity) => void
  cotationSpecs?: CotationSpec[]
  showCotations?: boolean
  planBounds?: { minX: number; minY: number; maxX: number; maxY: number }
  /** Image de fond du plan (blob URL ou data URL) */
  planImageUrl?: string
}

export default function FloorPlanCanvas({
  floor, zones, showHeatmap, heatmapContent, onEntityClick, onCanvasClick, selectedId, children, className = '',
  cursorMode = 'select',
  dims, calibration, showDims = false, onDimClick, cotationSpecs, showCotations = false, planBounds,
  planImageUrl,
}: FloorPlanCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const floorZones = useMemo(() => zones.filter(z => z.floorId === floor.id), [zones, floor.id])

  const SCALE = CANVAS_SCALE
  const width = floor.widthM * SCALE
  const height = floor.heightM * SCALE

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!onCanvasClick || !svgRef.current) return
    // Only handle clicks on the background, not on entities
    if ((e.target as Element).tagName !== 'rect' || !(e.target as Element).classList.contains('canvas-bg')) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse())
    // Convert from SVG coords to floor coords (divide by SCALE)
    onCanvasClick(svgPt.x / SCALE, svgPt.y / SCALE)
  }, [onCanvasClick, SCALE])

  return (
    <div className={`relative overflow-auto bg-gray-950 ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-full ${cursorMode === 'place' ? 'cursor-crosshair' : ''}`}
        style={{ minWidth: 600 }}
        onClick={handleSvgClick}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid-sm" width={SCALE * 10} height={SCALE * 10} patternUnits="userSpaceOnUse">
            <path d={`M ${SCALE * 10} 0 L 0 0 0 ${SCALE * 10}`} fill="none" stroke="#1f2937" strokeWidth="0.5" />
          </pattern>
          <pattern id="grid-lg" width={SCALE * 50} height={SCALE * 50} patternUnits="userSpaceOnUse">
            <path d={`M ${SCALE * 50} 0 L 0 0 0 ${SCALE * 50}`} fill="none" stroke="#374151" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="#0a0a0f" className="canvas-bg" />
        {planImageUrl && (
          <image href={planImageUrl} x={0} y={0} width={width} height={height} preserveAspectRatio="xMidYMid meet" opacity={0.85} />
        )}
        {!planImageUrl && <rect width={width} height={height} fill="url(#grid-sm)" />}
        {!planImageUrl && <rect width={width} height={height} fill="url(#grid-lg)" />}

        {/* Zones */}
        {floorZones.map(zone => {
          const isSelected = zone.id === selectedId
          return (
            <g
              key={zone.id}
              onClick={() => onEntityClick?.(zone.id, 'zone')}
              className="cursor-pointer"
            >
              <rect
                x={zone.x * SCALE}
                y={zone.y * SCALE}
                width={zone.w * SCALE}
                height={zone.h * SCALE}
                fill={zone.color}
                fillOpacity={showHeatmap ? 0.4 : 0.2}
                stroke={isSelected ? '#a855f7' : zone.color}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isSelected ? '6 3' : undefined}
                rx={2}
              />
              <text
                x={(zone.x + zone.w / 2) * SCALE}
                y={(zone.y + zone.h / 2) * SCALE}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#e5e7eb"
                fontSize={10}
                fontFamily="system-ui"
              >
                {zone.label}
              </text>
              {zone.surfaceM2 && (
                <text
                  x={(zone.x + zone.w / 2) * SCALE}
                  y={(zone.y + zone.h / 2) * SCALE + 14}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#9ca3af"
                  fontSize={8}
                  fontFamily="system-ui"
                >
                  {zone.surfaceM2} m²
                </text>
              )}
              {/* Criticality badge */}
              <circle
                cx={(zone.x + zone.w) * SCALE - 8}
                cy={zone.y * SCALE + 8}
                r={6}
                fill={zone.niveau >= 4 ? '#ef4444' : zone.niveau >= 3 ? '#f97316' : '#22c55e'}
                fillOpacity={0.85}
              />
              <text
                x={(zone.x + zone.w) * SCALE - 8}
                y={zone.y * SCALE + 8}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={7}
                fontWeight="bold"
              >
                {zone.niveau}
              </text>
            </g>
          )
        })}

        {/* Heatmap overlay (rendered between zones and other overlays) */}
        {showHeatmap && heatmapContent}

        {/* Dim overlay (cotes DXF) */}
        {showDims && dims && dims.length > 0 && (
          <DimOverlay
            dims={dims}
            calibration={calibration ?? null}
            canvasWidth={width}
            canvasHeight={height}
            planBounds={planBounds ?? { minX: 0, minY: 0, maxX: floor.widthM, maxY: floor.heightM }}
            visible={showDims}
            onDimClick={onDimClick}
          />
        )}

        {/* Cotation layer (cotes sur exports) */}
        {showCotations && cotationSpecs && cotationSpecs.length > 0 && (
          <CotationLayer
            specs={cotationSpecs}
            canvasWidth={width}
            canvasHeight={height}
            visible={showCotations}
          />
        )}

        {/* Overlays (cameras, blind spots, transitions) rendered by parent */}
        {children}
      </svg>

      {/* Calibration status bar */}
      {calibration && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-950/80 px-3 py-1.5 flex items-center gap-4 text-[10px]">
          <span className="text-gray-400">
            Calibration : {calibration.realWidthM.toFixed(1)}m x {calibration.realHeightM.toFixed(1)}m
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
            <span className="text-gray-400">
              {dims.length} cote(s)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
