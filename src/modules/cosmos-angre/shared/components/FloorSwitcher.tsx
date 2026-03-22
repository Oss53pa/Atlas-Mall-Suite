import React from 'react'
import type { Floor } from '../proph3t/types'

interface FloorCounts {
  cameras?: number
  pois?: number
  alerts?: number
}

interface FloorSwitcherProps {
  floors: Floor[]
  activeFloorId: string
  onFloorChange: (id: string) => void
  counts?: Record<string, FloorCounts>
  accentColor?: string
}

export default function FloorSwitcher({
  floors,
  activeFloorId,
  onFloorChange,
  counts,
  accentColor = '#3b82f6',
}: FloorSwitcherProps) {
  const sorted = [...floors].sort((a, b) => a.order - b.order)

  return (
    <div className="flex items-center gap-1">
      {sorted.map((floor) => {
        const active = floor.id === activeFloorId
        const fc = counts?.[floor.id]
        return (
          <button
            key={floor.id}
            onClick={() => onFloorChange(floor.id)}
            className={`
              relative px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${active
                ? 'text-white border'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }
            `}
            style={active ? {
              backgroundColor: `${accentColor}20`,
              borderColor: `${accentColor}50`,
              color: accentColor,
            } : undefined}
          >
            {floor.level}
            {fc && (
              <div className="flex items-center gap-1 mt-0.5">
                {fc.cameras !== undefined && fc.cameras > 0 && (
                  <span className="text-[8px] text-gray-500">{fc.cameras}c</span>
                )}
                {fc.pois !== undefined && fc.pois > 0 && (
                  <span className="text-[8px] text-gray-500">{fc.pois}p</span>
                )}
                {fc.alerts !== undefined && fc.alerts > 0 && (
                  <span className="text-[8px] text-red-400">{fc.alerts}!</span>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
