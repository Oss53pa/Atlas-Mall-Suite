import React, { useMemo } from 'react'
import type { DimEntity, CalibrationResult } from '../planReader/planReaderTypes'
import { CANVAS_SCALE } from './canvasConstants'

interface DimOverlayProps {
  dims: DimEntity[]
  calibration: CalibrationResult | null
  canvasWidth: number
  canvasHeight: number
  planBounds: { minX: number; minY: number; maxX: number; maxY: number }
  visible: boolean
  onDimClick?: (dim: DimEntity) => void
}

export default function DimOverlay({
  dims, calibration, canvasWidth, canvasHeight, planBounds, visible, onDimClick,
}: DimOverlayProps) {
  if (!visible || dims.length === 0) return null

  const SCALE = CANVAS_SCALE
  const planW = planBounds.maxX - planBounds.minX || 1
  const planH = planBounds.maxY - planBounds.minY || 1

  const toSvgX = (x: number) => ((x - planBounds.minX) / planW) * canvasWidth
  const toSvgY = (y: number) => ((y - planBounds.minY) / planH) * canvasHeight

  return (
    <g className="dim-overlay">
      {dims.map(dim => {
        const x1 = toSvgX(dim.defPoint1[0])
        const y1 = toSvgY(dim.defPoint1[1])
        const x2 = toSvgX(dim.defPoint2[0])
        const y2 = toSvgY(dim.defPoint2[1])
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2

        // Color by confidence
        const color = dim.confidence >= 0.8
          ? '#38bdf8'
          : dim.confidence >= 0.5
            ? '#f59e0b'
            : '#ef4444'

        // Extension line offset
        const dx = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 2) return null

        const nx = -dy / len * 8
        const ny = dx / len * 8

        // Tick marks
        const tickLen = 4
        const tx = (dy / len) * tickLen
        const ty = (-dx / len) * tickLen

        return (
          <g
            key={dim.id}
            className="cursor-pointer"
            onClick={() => onDimClick?.(dim)}
          >
            {/* Extension lines */}
            <line x1={x1} y1={y1} x2={x1 + nx} y2={y1 + ny}
              stroke={color} strokeWidth={0.5} strokeOpacity={0.6} />
            <line x1={x2} y1={y2} x2={x2 + nx} y2={y2 + ny}
              stroke={color} strokeWidth={0.5} strokeOpacity={0.6} />

            {/* Main dimension line */}
            <line
              x1={x1 + nx} y1={y1 + ny}
              x2={x2 + nx} y2={y2 + ny}
              stroke={color} strokeWidth={1}
            />

            {/* Ticks */}
            <line
              x1={x1 + nx - tx} y1={y1 + ny - ty}
              x2={x1 + nx + tx} y2={y1 + ny + ty}
              stroke={color} strokeWidth={1}
            />
            <line
              x1={x2 + nx - tx} y1={y2 + ny - ty}
              x2={x2 + nx + tx} y2={y2 + ny + ty}
              stroke={color} strokeWidth={1}
            />

            {/* Text background */}
            <rect
              x={midX + nx - 25}
              y={midY + ny - 8}
              width={50}
              height={14}
              fill="#0a0a0f"
              fillOpacity={0.8}
              rx={2}
            />

            {/* Text */}
            <text
              x={midX + nx}
              y={midY + ny}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={11}
              fontFamily="system-ui"
            >
              {dim.valueText}
            </text>

            {/* Tooltip on hover */}
            <title>
              {`Type: ${dim.type} | Valeur: ${dim.value.toFixed(2)}m | Unite: ${dim.unit} | Confiance: ${Math.round(dim.confidence * 100)}% | Calque: ${dim.layer}`}
            </title>
          </g>
        )
      })}
    </g>
  )
}
