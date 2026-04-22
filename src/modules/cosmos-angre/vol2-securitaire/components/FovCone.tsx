import { memo } from 'react'
import type { Camera } from '../../shared/proph3t/types'

interface FovConeProps {
  camera: Camera
  scale: number
  onClick: () => void
}

function priorityColor(priority: Camera['priority']): string {
  switch (priority) {
    case 'critique': return '#EF4444'
    case 'haute': return '#F59E0B'
    default: return '#3B82F6'
  }
}

function buildArcPath(cam: Camera, scale: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = cam.x * scale
  const cy = cam.y * scale
  const r = cam.range * scale
  const halfFov = cam.fov / 2
  const startAngle = cam.angle - halfFov
  const endAngle = cam.angle + halfFov

  if (cam.fov >= 360) {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`
  }

  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = cam.fov > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

const FovCone = memo(function FovCone({ camera, scale, onClick }: FovConeProps) {
  const color = priorityColor(camera.priority)
  return (
    <path
      d={buildArcPath(camera, scale)}
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeOpacity={0.4}
      strokeWidth={0.5}
      className="cursor-pointer"
      onClick={onClick}
    />
  )
})

export default FovCone
