import { memo } from 'react'
import type { Door } from '../../shared/proph3t/types'

interface DoorEntityProps {
  door: Door
  scale: number
  isSelected: boolean
  onClick: () => void
}

const DoorEntity = memo(function DoorEntity({ door, scale, isSelected, onClick }: DoorEntityProps) {
  const x = door.x * scale
  const y = door.y * scale
  const fill = door.isExit ? '#22c55e' : door.hasBadge ? '#3b82f6' : '#94a3b8'

  return (
    <g className="cursor-pointer" onClick={onClick}>
      <rect
        x={x - 5} y={y - 3}
        width={10} height={6} rx={1}
        fill={fill}
        fillOpacity={0.8}
        stroke={isSelected ? '#a855f7' : '#fff'}
        strokeWidth={isSelected ? 1.5 : 0.5}
      />
      {door.hasBiometric && (
        <circle cx={x + 7} cy={y} r={2} fill="#8b5cf6" stroke="#fff" strokeWidth={0.5} />
      )}
      {door.hasSas && (
        <rect x={x - 7} y={y - 5} width={14} height={10} rx={2} fill="none" stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="2 1" />
      )}
      <text x={x} y={y - 6} textAnchor="middle" fill="#94a3b8" fontSize={6} fontFamily="system-ui">
        {door.label}
      </text>
    </g>
  )
})

export default DoorEntity
