import React, { memo } from 'react'
import type { Camera } from '../../shared/proph3t/types'

interface CameraEntityProps {
  camera: Camera
  scale: number
  isSelected: boolean
  onClick: () => void
}

function priorityColor(priority: Camera['priority']): string {
  switch (priority) {
    case 'critique': return '#EF4444'
    case 'haute': return '#F59E0B'
    default: return '#3B82F6'
  }
}

const CameraEntity = memo(function CameraEntity({ camera, scale, isSelected, onClick }: CameraEntityProps) {
  const cx = camera.x * scale
  const cy = camera.y * scale

  return (
    <g className="cursor-pointer" onClick={onClick}>
      <circle cx={cx} cy={cy} r={5} fill={camera.color} stroke="#fff" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={2} fill="#fff" fillOpacity={0.9} />
      {isSelected && (
        <circle cx={cx} cy={cy} r={9} fill="none" stroke="#a855f7" strokeWidth={1.8} strokeDasharray="4 2" />
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={camera.color} fontSize={8} fontFamily="system-ui">
        {camera.label}
      </text>
      {camera.autoPlaced && (
        <text x={cx + 7} y={cy - 5} fill="#a855f7" fontSize={6} fontFamily="system-ui">A</text>
      )}
    </g>
  )
})

export default CameraEntity
