import { memo } from 'react'
import type { Zone } from '../../shared/proph3t/types'

interface ZoneLayerProps {
  zones: Zone[]
  scale: number
  showHeatmap: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}

const ZoneLayer = memo(function ZoneLayer({ zones, scale, showHeatmap, selectedId, onSelect }: ZoneLayerProps) {
  return (
    <g>
      {zones.map((zone) => {
        const isSelected = zone.id === selectedId
        return (
          <g key={zone.id} className="cursor-pointer" onClick={() => onSelect(zone.id)}>
            <rect
              x={zone.x * scale}
              y={zone.y * scale}
              width={zone.w * scale}
              height={zone.h * scale}
              fill={zone.color}
              fillOpacity={showHeatmap ? 0.4 : 0.2}
              stroke={isSelected ? '#a855f7' : zone.color}
              strokeWidth={isSelected ? 2 : 1}
              strokeDasharray={isSelected ? '6 3' : undefined}
              rx={2}
            />
            <text
              x={(zone.x + zone.w / 2) * scale}
              y={(zone.y + zone.h / 2) * scale}
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
                x={(zone.x + zone.w / 2) * scale}
                y={(zone.y + zone.h / 2) * scale + 14}
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
              cx={(zone.x + zone.w) * scale - 8}
              cy={zone.y * scale + 8}
              r={6}
              fill={zone.niveau >= 4 ? '#ef4444' : zone.niveau >= 3 ? '#f97316' : '#22c55e'}
              fillOpacity={0.85}
            />
            <text
              x={(zone.x + zone.w) * scale - 8}
              y={zone.y * scale + 8}
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
    </g>
  )
})

export default ZoneLayer
