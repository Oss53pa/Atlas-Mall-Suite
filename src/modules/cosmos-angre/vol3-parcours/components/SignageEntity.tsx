import { memo, useState } from 'react'
import type { SignageItem } from '../../shared/proph3t/types'

interface SignageEntityProps {
  signage: SignageItem
  selected: boolean
  scale: number
  onClick: () => void
}

function typeColor(type: string): string {
  if (type.includes('totem')) return '#06b6d4'
  if (type.includes('panneau') || type.includes('banniere')) return '#3b82f6'
  if (type.includes('sortie') || type.includes('bloc') || type.includes('plan_evacuation')) return '#ef4444'
  if (type.includes('borne')) return '#8b5cf6'
  if (type.includes('pmr')) return '#a855f7'
  if (type.includes('marquage')) return '#f59e0b'
  return '#94a3b8'
}

const SignageEntity = memo(function SignageEntity({ signage, selected, scale, onClick }: SignageEntityProps) {
  const [hovered, setHovered] = useState(false)
  const cx = signage.x * scale
  const cy = signage.y * scale
  const color = typeColor(signage.type)
  const size = 5

  return (
    <g
      className="cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Diamond shape */}
      <polygon
        points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
        fill={color}
        fillOpacity={0.7}
        stroke={selected ? '#fff' : color}
        strokeWidth={selected ? 1.5 : 0.8}
      />

      {/* Selection ring */}
      {selected && (
        <circle
          cx={cx}
          cy={cy}
          r={size + 4}
          fill="none"
          stroke="#a855f7"
          strokeWidth={1.5}
          strokeDasharray="3 2"
        />
      )}

      {/* Hover tooltip */}
      {hovered && (
        <g>
          <rect
            x={cx + 10}
            y={cy - 30}
            width={120}
            height={44}
            rx={4}
            fill="#1f2937"
            stroke="#374151"
            strokeWidth={0.5}
          />
          <text x={cx + 15} y={cy - 17} fill="#d1d5db" fontSize={7} fontFamily="system-ui">
            {signage.type.replace(/_/g, ' ')}
          </text>
          <text x={cx + 15} y={cy - 7} fill="#9ca3af" fontSize={6} fontFamily="system-ui">
            H:{signage.poseHeightM}m | Txt:{signage.textHeightMm}mm | Lect:{signage.maxReadingDistanceM}m
          </text>
          <text x={cx + 15} y={cy + 3} fill="#6b7280" fontSize={6} fontFamily="system-ui">
            {signage.normRef} | {signage.capexFcfa.toLocaleString('fr-FR')} FCFA
          </text>
        </g>
      )}
    </g>
  )
})

export default SignageEntity
