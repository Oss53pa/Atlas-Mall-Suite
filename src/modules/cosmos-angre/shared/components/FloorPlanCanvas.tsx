import React, { useMemo } from 'react'
import type { Floor, Zone } from '../proph3t/types'

export const CANVAS_SCALE = 4

interface FloorPlanCanvasProps {
  floor: Floor
  zones: Zone[]
  showHeatmap?: boolean
  heatmapContent?: React.ReactNode
  onEntityClick?: (id: string, type: 'camera' | 'door' | 'zone' | 'transition') => void
  selectedId?: string | null
  children?: React.ReactNode
  className?: string
}

const SCALE = 4

export default function FloorPlanCanvas({
  floor, zones, showHeatmap, heatmapContent, onEntityClick, selectedId, children, className = ''
}: FloorPlanCanvasProps) {
  const floorZones = useMemo(() => zones.filter(z => z.floorId === floor.id), [zones, floor.id])

  const SCALE = CANVAS_SCALE
  const width = floor.widthM * SCALE
  const height = floor.heightM * SCALE

  return (
    <div className={`relative overflow-auto bg-gray-950 ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ minWidth: 600 }}
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
        <rect width={width} height={height} fill="#0a0a0f" />
        <rect width={width} height={height} fill="url(#grid-sm)" />
        <rect width={width} height={height} fill="url(#grid-lg)" />

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

        {/* Overlays (cameras, blind spots, transitions) rendered by parent */}
        {children}
      </svg>
    </div>
  )
}
