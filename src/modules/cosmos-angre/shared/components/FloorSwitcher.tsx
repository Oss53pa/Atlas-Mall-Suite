import { Plus } from 'lucide-react'
import type { Floor } from '../proph3t/types'

interface FloorCounts {
  cameras?: number
  pois?: number
  alerts?: number
  coveragePercent?: number
}

interface FloorSwitcherProps {
  floors: Floor[]
  activeFloorId: string
  onFloorChange: (id: string) => void
  onAddFloor?: () => void
  counts?: Record<string, FloorCounts>
  accentColor?: string
}

export default function FloorSwitcher({
  floors,
  activeFloorId,
  onFloorChange,
  onAddFloor,
  counts,
  accentColor = '#3b82f6',
}: FloorSwitcherProps) {
  // Highest floor at top (descending order)
  const sorted = [...floors].sort((a, b) => b.order - a.order)

  return (
    <div className="flex flex-col items-center gap-1 py-2">
      {sorted.map((floor) => {
        const active = floor.id === activeFloorId
        const fc = counts?.[floor.id]
        const hasAlerts = fc?.alerts !== undefined && fc.alerts > 0
        return (
          <button
            key={floor.id}
            onClick={() => onFloorChange(floor.id)}
            className={`
              relative w-14 px-1 py-2 rounded-lg text-center transition-all
              ${active
                ? 'text-white border shadow-lg shadow-blue-500/10'
                : 'text-gray-500 hover:text-white hover:bg-gray-800/50'
              }
            `}
            style={active ? {
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}40`,
              color: accentColor,
            } : undefined}
            title={`${floor.level}${fc?.coveragePercent !== undefined ? ` — ${fc.coveragePercent}%` : ''}`}
          >
            {hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
            <span className="text-[11px] font-bold block">{floor.level}</span>
            {fc && (
              <div className="flex flex-col items-center gap-0.5 mt-0.5">
                {fc.coveragePercent !== undefined && (
                  <span className="text-[8px] text-gray-500">{fc.coveragePercent}%</span>
                )}
                <div className="flex items-center gap-0.5">
                  {fc.cameras !== undefined && fc.cameras > 0 && (
                    <span className="text-[7px] text-gray-600">{fc.cameras}c</span>
                  )}
                  {fc.pois !== undefined && fc.pois > 0 && (
                    <span className="text-[7px] text-gray-600">{fc.pois}p</span>
                  )}
                </div>
              </div>
            )}
          </button>
        )
      })}
      {onAddFloor && (
        <button
          onClick={onAddFloor}
          className="w-14 py-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800/50 transition-colors mt-1 flex items-center justify-center"
          title="Ajouter un étage"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}
