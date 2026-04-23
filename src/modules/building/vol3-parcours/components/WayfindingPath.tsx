import type { PathResult } from '../../shared/proph3t/types'

interface WayfindingPathProps {
  path: PathResult
}

export default function WayfindingPath({ path }: WayfindingPathProps) {
  if (path.path.length < 2) return null

  const first = path.path[0]
  const last = path.path[path.path.length - 1]
  const mid = path.path[Math.floor(path.path.length / 2)]

  return (
    <g>
      <polyline
        points={path.path.map((n) => `${n.x},${n.y}`).join(' ')}
        fill="none" stroke="#34D399" strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.8}
      />
      {/* Start marker */}
      <circle cx={first.x} cy={first.y} r={2.5} fill="#34D399" stroke="white" strokeWidth={0.5} />
      {/* End marker */}
      <circle cx={last.x} cy={last.y} r={2.5} fill="#F59E0B" stroke="white" strokeWidth={0.5} />
      {/* Distance label */}
      <text
        x={mid.x} y={mid.y - 4}
        textAnchor="middle" fill="#34D399" fontSize={3} fontFamily="system-ui"
        style={{ pointerEvents: 'none' }}
      >
        {path.totalDistanceM}m — {Math.ceil(path.totalTimeSec / 60)}min
      </text>
    </g>
  )
}
