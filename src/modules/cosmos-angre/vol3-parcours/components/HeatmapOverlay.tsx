import React from 'react'

interface HeatmapOverlayProps {
  data: number[][]
  width: number
  height: number
}

function densityColor(value: number): string {
  if (value >= 0.8) return '#EF4444'
  if (value >= 0.6) return '#F97316'
  if (value >= 0.4) return '#EAB308'
  if (value >= 0.2) return '#22C55E'
  return '#3B82F6'
}

export default function HeatmapOverlay({ data, width, height }: HeatmapOverlayProps) {
  if (!data.length || !data[0].length) return null

  const rows = data.length
  const cols = data[0].length
  const cellW = width / cols
  const cellH = height / rows

  return (
    <g>
      {data.map((row, r) =>
        row.map((value, c) => {
          if (value <= 0.05) return null
          return (
            <rect
              key={`hm-${r}-${c}`}
              x={c * cellW}
              y={r * cellH}
              width={cellW}
              height={cellH}
              fill={densityColor(value)}
              fillOpacity={value * 0.4}
            />
          )
        })
      )}
    </g>
  )
}
