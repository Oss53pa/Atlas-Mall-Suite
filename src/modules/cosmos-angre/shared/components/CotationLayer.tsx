import React from 'react'
import type { CotationSpec } from '../planReader/planReaderTypes'
import { CANVAS_SCALE } from './canvasConstants'

interface CotationLayerProps {
  specs: CotationSpec[]
  canvasWidth: number
  canvasHeight: number
  visible: boolean
}

export default function CotationLayer({ specs, canvasWidth, canvasHeight, visible }: CotationLayerProps) {
  if (!visible || specs.length === 0) return null

  return (
    <g className="cotation-layer">
      {specs.map(spec => {
        const x1 = spec.point1[0] * canvasWidth
        const y1 = spec.point1[1] * canvasHeight
        const x2 = spec.point2[0] * canvasWidth
        const y2 = spec.point2[1] * canvasHeight

        const color = spec.color

        if (spec.type === 'area') {
          return (
            <g key={spec.id}>
              <rect
                x={x1 - 30} y={y1 - 8}
                width={60} height={16}
                fill="#0a0a0f" fillOpacity={0.7} rx={3}
              />
              <text
                x={x1} y={y1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={spec.textSizePt + 2}
                fontFamily="system-ui"
                fontWeight="500"
              >
                {spec.displayText}
              </text>
            </g>
          )
        }

        const dx = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) return null

        const offset = spec.offsetPx
        const nx = -dy / len * offset
        const ny = dx / len * offset
        const midX = (x1 + x2) / 2 + nx
        const midY = (y1 + y2) / 2 + ny

        const tickLen = 3
        const tx = (dy / len) * tickLen
        const ty = (-dx / len) * tickLen

        return (
          <g key={spec.id}>
            {/* Extension lines */}
            <line x1={x1} y1={y1} x2={x1 + nx} y2={y1 + ny}
              stroke={color} strokeWidth={0.4} strokeOpacity={0.5} />
            <line x1={x2} y1={y2} x2={x2 + nx} y2={y2 + ny}
              stroke={color} strokeWidth={0.4} strokeOpacity={0.5} />

            {/* Dimension line */}
            <line
              x1={x1 + nx} y1={y1 + ny}
              x2={x2 + nx} y2={y2 + ny}
              stroke={color} strokeWidth={0.8}
            />

            {/* End markers */}
            {spec.arrowStyle === 'tick' && (
              <>
                <line
                  x1={x1 + nx - tx} y1={y1 + ny - ty}
                  x2={x1 + nx + tx} y2={y1 + ny + ty}
                  stroke={color} strokeWidth={0.8}
                />
                <line
                  x1={x2 + nx - tx} y1={y2 + ny - ty}
                  x2={x2 + nx + tx} y2={y2 + ny + ty}
                  stroke={color} strokeWidth={0.8}
                />
              </>
            )}

            {spec.arrowStyle === 'arrow' && (
              <>
                <ArrowHead x={x1 + nx} y={y1 + ny} tx={x2 + nx} ty={y2 + ny} color={color} />
                <ArrowHead x={x2 + nx} y={y2 + ny} tx={x1 + nx} ty={y1 + ny} color={color} />
              </>
            )}

            {/* Text background */}
            <rect
              x={midX - 22} y={midY - 7}
              width={44} height={14}
              fill="#0a0a0f" fillOpacity={0.8} rx={2}
            />

            {/* Text */}
            <text
              x={midX} y={midY}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={spec.textSizePt + 2}
              fontFamily="system-ui"
            >
              {spec.displayText}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function ArrowHead({ x, y, tx, ty, color }: { x: number; y: number; tx: number; ty: number; color: string }) {
  const angle = Math.atan2(ty - y, tx - x)
  const size = 5
  const a1X = x + size * Math.cos(angle + Math.PI * 0.85)
  const a1Y = y + size * Math.sin(angle + Math.PI * 0.85)
  const a2X = x + size * Math.cos(angle - Math.PI * 0.85)
  const a2Y = y + size * Math.sin(angle - Math.PI * 0.85)

  return (
    <>
      <line x1={x} y1={y} x2={a1X} y2={a1Y} stroke={color} strokeWidth={0.6} />
      <line x1={x} y1={y} x2={a2X} y2={a2Y} stroke={color} strokeWidth={0.6} />
    </>
  )
}
