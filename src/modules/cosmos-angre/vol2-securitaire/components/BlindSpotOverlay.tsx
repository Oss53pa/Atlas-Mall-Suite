import type { BlindSpot } from '../../shared/proph3t/types'

interface BlindSpotOverlayProps {
  blindSpots: BlindSpot[]
  scale: number
  onSelect: (id: string) => void
}

function severityColor(severity: BlindSpot['severity']): string {
  switch (severity) {
    case 'critique': return '#EF4444'
    case 'elevee': return '#F59E0B'
    default: return '#FB923C'
  }
}

export default function BlindSpotOverlay({ blindSpots, scale, onSelect }: BlindSpotOverlayProps) {
  return (
    <g>
      {blindSpots.map((spot) => {
        const color = severityColor(spot.severity)
        return (
          <g key={spot.id}>
            <rect
              x={spot.x * scale}
              y={spot.y * scale}
              width={spot.w * scale}
              height={spot.h * scale}
              fill={color}
              fillOpacity={0.25}
              stroke={color}
              strokeOpacity={0.6}
              strokeWidth={1}
              strokeDasharray="6 3"
              rx={2}
              className="cursor-pointer"
              onClick={() => onSelect(spot.id)}
            />
            {spot.severity === 'critique' && (
              <text
                x={(spot.x + spot.w / 2) * scale}
                y={(spot.y + spot.h / 2) * scale}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                fontSize={8}
                fontWeight="bold"
              >
                !
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
