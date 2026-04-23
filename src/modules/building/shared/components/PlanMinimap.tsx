// ═══ PLAN MINIMAP — Bottom-right overview showing viewport position ═══

import React, { useCallback, useRef } from 'react'
import type { ParsedPlan, ViewportState } from '../planReader/planEngineTypes'
import { spaceTypeColor } from '../planReader/spaceDetector'

interface PlanMinimapProps {
  plan: ParsedPlan
  viewport: ViewportState
  onViewportChange: (vp: ViewportState) => void
  canvasW: number
  canvasH: number
}

const MINIMAP_W = 180
const MINIMAP_H = 130

export function PlanMinimap({ plan, viewport, onViewportChange, canvasW, canvasH }: PlanMinimapProps) {
  const ref = useRef<SVGSVGElement>(null)
  const { bounds, spaces } = plan

  if (bounds.width <= 0 || bounds.height <= 0) return null

  // Scale plan to fit minimap
  const scaleX = MINIMAP_W / bounds.width
  const scaleY = MINIMAP_H / bounds.height
  const mmScale = Math.min(scaleX, scaleY) * 0.9
  const mmOffX = (MINIMAP_W - bounds.width * mmScale) / 2
  const mmOffY = (MINIMAP_H - bounds.height * mmScale) / 2

  // Viewport rect in minimap coordinates
  const vpWorldX = -viewport.offsetX / viewport.scale
  const vpWorldY = -viewport.offsetY / viewport.scale
  const vpWorldW = canvasW / viewport.scale
  const vpWorldH = canvasH / viewport.scale

  const vpRectX = vpWorldX * mmScale + mmOffX
  const vpRectY = vpWorldY * mmScale + mmOffY
  const vpRectW = vpWorldW * mmScale
  const vpRectH = vpWorldH * mmScale

  // Click minimap → move viewport
  const handleMinimapClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = ref.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Convert minimap click to world coordinates
    const worldX = (mx - mmOffX) / mmScale
    const worldY = (my - mmOffY) / mmScale

    // Center viewport on clicked point
    onViewportChange({
      ...viewport,
      offsetX: canvasW / 2 - worldX * viewport.scale,
      offsetY: canvasH / 2 - worldY * viewport.scale,
    })
  }, [viewport, mmScale, mmOffX, mmOffY, canvasW, canvasH, onViewportChange])

  return (
    <div className="absolute bottom-8 right-3 z-20 bg-surface-1/90 border border-gray-700 rounded-lg overflow-hidden shadow-xl">
      <svg
        ref={ref}
        width={MINIMAP_W}
        height={MINIMAP_H}
        onClick={handleMinimapClick}
        style={{ cursor: 'crosshair' }}
      >
        <rect width={MINIMAP_W} height={MINIMAP_H} fill="#2a2d33" />

        {/* Simplified plan entities */}
        <g transform={`translate(${mmOffX}, ${mmOffY}) scale(${mmScale})`}>
          {/* Spaces as colored polygons */}
          {spaces.map(space => (
            <polygon
              key={space.id}
              points={space.polygon.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={space.color ?? spaceTypeColor(space.type)}
              fillOpacity={0.5}
              stroke="#475569"
              strokeWidth={0.5 / mmScale}
            />
          ))}
        </g>

        {/* Viewport rectangle */}
        <rect
          x={Math.max(0, vpRectX)}
          y={Math.max(0, vpRectY)}
          width={Math.min(MINIMAP_W, vpRectW)}
          height={Math.min(MINIMAP_H, vpRectH)}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={1.5}
          rx={1}
        />
      </svg>
    </div>
  )
}
