import type { EvacuationFrame } from '../../shared/proph3t/types'

interface EvacuationFlowProps {
  frames: EvacuationFrame[]
  currentFrame: number
  scale: number
}

export default function EvacuationFlow({ frames, currentFrame, scale }: EvacuationFlowProps) {
  const frame = frames[currentFrame]
  if (!frame) return null

  return (
    <g>
      {frame.agents.map((agent) => (
        <circle
          key={agent.id}
          cx={agent.x * scale}
          cy={agent.y * scale}
          r={agent.evacuated ? 1.5 : 2}
          fill={agent.evacuated ? '#22c55e' : '#3b82f6'}
          opacity={agent.evacuated ? 0.3 : 0.8}
        />
      ))}
    </g>
  )
}
