// ═══ HEATMAP OVERLAY — Zone-based frequency heatmap on FloorPlanCanvas ═══

import React, { useMemo, useState } from 'react'

export interface ZoneHeatData {
  zoneId: string
  x: number
  y: number
  w: number
  h: number
  label: string
  dwellTime: number       // seconds average
  visitFrequency: number  // visits/hour
  peakHour: number        // 0-23
  congestionScore: number // 0-1
}

interface HeatmapOverlayProps {
  data: ZoneHeatData[]
  scale: number           // SCALE factor (4)
  hour?: number           // 0-23, current hour to display
  scenario?: string       // scenario name for display
  onZoneClick?: (zoneId: string) => void
}

// ═══ COLOR INTERPOLATION ═══

function heatColor(value: number): string {
  // 3-stop gradient: blue (0) → amber (0.5) → red (1.0)
  const clamped = Math.max(0, Math.min(1, value))

  if (clamped <= 0.5) {
    const t = clamped / 0.5
    // blue #3B8BD4 → amber #EF9F27
    const r = Math.round(59 + t * (239 - 59))
    const g = Math.round(139 + t * (159 - 139))
    const b = Math.round(212 + t * (39 - 212))
    return `rgb(${r},${g},${b})`
  } else {
    const t = (clamped - 0.5) / 0.5
    // amber #EF9F27 → red #E24B4A
    const r = Math.round(239 + t * (226 - 239))
    const g = Math.round(159 + t * (75 - 159))
    const b = Math.round(39 + t * (74 - 39))
    return `rgb(${r},${g},${b})`
  }
}

function hourMultiplier(hour: number, peakHour: number): number {
  // Bell curve centered on peak hour
  const diff = Math.abs(hour - peakHour)
  const wrapped = Math.min(diff, 24 - diff)
  return Math.exp(-0.5 * (wrapped / 3) ** 2)
}

export default function HeatmapOverlay({
  data, scale, hour, onZoneClick,
}: HeatmapOverlayProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  const renderedData = useMemo(() => {
    return data.map(d => {
      const hourFactor = hour !== undefined ? hourMultiplier(hour, d.peakHour) : 1
      const adjustedScore = d.congestionScore * hourFactor
      return { ...d, adjustedScore }
    })
  }, [data, hour])

  if (!data.length) return null

  // Unique filter ID to avoid SVG conflicts
  const filterId = 'heatmap-blur-filter'

  return (
    <g>
      {/* Gaussian blur filter for smoothing */}
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      {/* Blurred background layer */}
      <g filter={`url(#${filterId})`} style={{ pointerEvents: 'none' }}>
        {renderedData.map(d => (
          <rect
            key={`hm-blur-${d.zoneId}`}
            x={d.x * scale}
            y={d.y * scale}
            width={d.w * scale}
            height={d.h * scale}
            fill={heatColor(d.adjustedScore)}
            fillOpacity={Math.max(0.05, d.adjustedScore * 0.35)}
            rx={4}
          />
        ))}
      </g>

      {/* Sharp overlay for zone boundaries */}
      {renderedData.map(d => {
        const isHovered = hoveredZone === d.zoneId
        return (
          <g
            key={`hm-zone-${d.zoneId}`}
            onMouseEnter={() => setHoveredZone(d.zoneId)}
            onMouseLeave={() => setHoveredZone(null)}
            onClick={() => onZoneClick?.(d.zoneId)}
            className="cursor-pointer"
          >
            <rect
              x={d.x * scale}
              y={d.y * scale}
              width={d.w * scale}
              height={d.h * scale}
              fill={heatColor(d.adjustedScore)}
              fillOpacity={isHovered ? d.adjustedScore * 0.5 : d.adjustedScore * 0.25}
              stroke={heatColor(d.adjustedScore)}
              strokeOpacity={isHovered ? 0.8 : 0.3}
              strokeWidth={isHovered ? 1.5 : 0.5}
              rx={2}
            />

            {/* Congestion score label */}
            <text
              x={(d.x + d.w / 2) * scale}
              y={(d.y + d.h / 2) * scale + (isHovered ? -6 : 0)}
              textAnchor="middle"
              dominantBaseline="central"
              fill={d.adjustedScore > 0.5 ? '#fff' : '#e5e7eb'}
              fontSize={isHovered ? 11 : 9}
              fontWeight="bold"
              fontFamily="system-ui"
              style={{ pointerEvents: 'none' }}
            >
              {Math.round(d.adjustedScore * 100)}%
            </text>

            {/* Hover tooltip info */}
            {isHovered && (
              <>
                <text
                  x={(d.x + d.w / 2) * scale}
                  y={(d.y + d.h / 2) * scale + 8}
                  textAnchor="middle"
                  fill="#d1d5db"
                  fontSize={7}
                  fontFamily="system-ui"
                  style={{ pointerEvents: 'none' }}
                >
                  {d.visitFrequency} vis/h · {Math.round(d.dwellTime / 60)}min
                </text>
                <text
                  x={(d.x + d.w / 2) * scale}
                  y={(d.y + d.h / 2) * scale + 18}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize={6}
                  fontFamily="system-ui"
                  style={{ pointerEvents: 'none' }}
                >
                  Pic: {d.peakHour}h00
                </text>
              </>
            )}
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(12, 12)`}>
        <rect x={0} y={0} width={140} height={52} rx={6} fill="#111827" fillOpacity={0.85} stroke="#374151" strokeWidth={0.5} />

        {/* Gradient bar */}
        <defs>
          <linearGradient id="heatmap-legend-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B8BD4" />
            <stop offset="50%" stopColor="#EF9F27" />
            <stop offset="100%" stopColor="#E24B4A" />
          </linearGradient>
        </defs>
        <rect x={10} y={8} width={120} height={8} rx={4} fill="url(#heatmap-legend-grad)" />

        {/* Labels */}
        <text x={10} y={28} fill="#9ca3af" fontSize={6} fontFamily="system-ui">Peu frequente</text>
        <text x={65} y={28} textAnchor="middle" fill="#9ca3af" fontSize={6} fontFamily="system-ui">Moyen</text>
        <text x={130} y={28} textAnchor="end" fill="#9ca3af" fontSize={6} fontFamily="system-ui">Tres frequente</text>

        {/* Hour indicator */}
        {hour !== undefined && (
          <text x={70} y={42} textAnchor="middle" fill="#e5e7eb" fontSize={7} fontWeight="bold" fontFamily="system-ui">
            {hour}h00
          </text>
        )}
      </g>
    </g>
  )
}
