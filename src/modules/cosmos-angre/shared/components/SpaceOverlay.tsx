// ═══ SPACE OVERLAY — Interactive polygon spaces on the plan ═══

import React, { useMemo } from 'react'
import type { DetectedSpace, SpaceState, ViewportState } from '../planReader/planEngineTypes'
import { statusColor, spaceTypeColor } from '../planReader/spaceDetector'

interface SpaceOverlayProps {
  spaces: DetectedSpace[]
  spaceStates: Record<string, SpaceState>
  selectedId: string | null
  onSpaceClick: (space: DetectedSpace) => void
  viewport: ViewportState
  showLabels: boolean
}

function SpaceOverlayInner({
  spaces, spaceStates, selectedId, onSpaceClick, viewport, showLabels,
}: SpaceOverlayProps) {
  return (
    <g className="space-overlay">
      {spaces.map(space => {
        const state = spaceStates[space.id]
        const points = space.polygon.map(([x, y]) => `${x},${y}`).join(' ')
        const fill = state?.color ?? (state?.status ? statusColor(state.status) : spaceTypeColor(space.type))
        const isSelected = space.id === selectedId
        const displayLabel = state?.label || space.label
        const invScale = 1 / Math.max(viewport.scale, 0.01)

        return (
          <g
            key={space.id}
            onClick={(e) => { e.stopPropagation(); onSpaceClick(space) }}
            style={{ cursor: 'pointer' }}
          >
            {/* Filled polygon — very light fill, visible border */}
            <polygon
              points={points}
              fill={fill}
              fillOpacity={isSelected ? 0.3 : 0.08}
              stroke={isSelected ? '#ffffff' : fill}
              strokeWidth={isSelected ? 2.5 * invScale : 1 * invScale}
              strokeOpacity={isSelected ? 1 : 0.6}
              vectorEffect="non-scaling-stroke"
            />

            {/* Labels — always shown for identified spaces */}
            {showLabels && (
              <>
                {/* Background rect for readability */}
                <rect
                  x={space.bounds.centerX - displayLabel.length * 0.35 * invScale}
                  y={space.bounds.centerY - 1 * invScale}
                  width={displayLabel.length * 0.7 * invScale}
                  height={1.5 * invScale}
                  rx={0.3 * invScale}
                  fill="#000000"
                  fillOpacity={0.6}
                  pointerEvents="none"
                />
                <text
                  x={space.bounds.centerX}
                  y={space.bounds.centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(0.3, 1.1 * invScale)}
                  fill="#ffffff"
                  fontWeight={700}
                  fontFamily="system-ui"
                  pointerEvents="none"
                >
                  {displayLabel}
                </text>

                <text
                  x={space.bounds.centerX}
                  y={space.bounds.centerY + 1.5 * invScale}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(0.2, 0.8 * invScale)}
                  fill="#e2e8f0"
                  fontFamily="monospace"
                  fontWeight={600}
                  pointerEvents="none"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.9)' }}
                >
                  {space.areaSqm} m²
                </text>
              </>
            )}
          </g>
        )
      })}
    </g>
  )
}

export const SpaceOverlay = React.memo(SpaceOverlayInner)
