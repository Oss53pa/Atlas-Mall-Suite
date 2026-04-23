
interface RiskHeatmapProps {
  matrix: number[][] // 5x5 grid, [probability][impact]
  scenarios?: { name: string; probability: number; impact: number }[]
  size?: number
}

const COLORS = [
  '#22c55e', // 1-4: green
  '#84cc16', // 5-8: lime
  '#f59e0b', // 9-12: amber
  '#f97316', // 13-16: orange
  '#ef4444', // 17-25: red
]

function getCellColor(prob: number, impact: number): string {
  const score = prob * impact
  if (score >= 17) return COLORS[4]
  if (score >= 13) return COLORS[3]
  if (score >= 9) return COLORS[2]
  if (score >= 5) return COLORS[1]
  return COLORS[0]
}

export default function RiskHeatmap({ matrix, scenarios = [], size = 320 }: RiskHeatmapProps) {
  const cellSize = (size - 40) / 5
  const offsetX = 40
  const offsetY = 10

  return (
    <div className="inline-block rounded-lg p-4" style={{ background: '#0f1729', border: '1px solid #1e2a3a' }}>
      <svg width={size} height={size + 20} className="select-none">
        {/* Y axis label */}
        <text x={4} y={size / 2} fill="#6b7280" fontSize={10} transform={`rotate(-90, 10, ${size / 2})`} textAnchor="middle">
          Probabilite
        </text>
        {/* X axis label */}
        <text x={offsetX + (cellSize * 5) / 2} y={size + 14} fill="#6b7280" fontSize={10} textAnchor="middle">
          Impact
        </text>

        {/* Grid cells */}
        {[5, 4, 3, 2, 1].map((prob, pi) =>
          [1, 2, 3, 4, 5].map((impact, ii) => {
            const x = offsetX + ii * cellSize
            const y = offsetY + pi * cellSize
            const count = matrix[prob - 1]?.[impact - 1] ?? 0
            const color = getCellColor(prob, impact)

            return (
              <g key={`${prob}-${impact}`}>
                <rect
                  x={x} y={y} width={cellSize} height={cellSize}
                  fill={count > 0 ? color : `${color}20`}
                  stroke="#1e2a3a" strokeWidth={1} rx={2}
                  opacity={count > 0 ? 0.9 : 0.3}
                />
                {count > 0 && (
                  <text x={x + cellSize / 2} y={y + cellSize / 2 + 4} fill="white" fontSize={12} fontWeight="bold" textAnchor="middle">
                    {count}
                  </text>
                )}
              </g>
            )
          })
        )}

        {/* Y axis numbers */}
        {[5, 4, 3, 2, 1].map((prob, pi) => (
          <text key={`y-${prob}`} x={offsetX - 6} y={offsetY + pi * cellSize + cellSize / 2 + 4} fill="#6b7280" fontSize={10} textAnchor="end">
            {prob}
          </text>
        ))}

        {/* X axis numbers */}
        {[1, 2, 3, 4, 5].map((impact, ii) => (
          <text key={`x-${impact}`} x={offsetX + ii * cellSize + cellSize / 2} y={offsetY + 5 * cellSize + 14} fill="#6b7280" fontSize={10} textAnchor="middle">
            {impact}
          </text>
        ))}

        {/* Scenario dots */}
        {scenarios.map((s, i) => {
          const row = 5 - s.probability
          const col = s.impact - 1
          const cx = offsetX + col * cellSize + cellSize / 2
          const cy = offsetY + row * cellSize + cellSize / 2
          return (
            <circle key={i} cx={cx} cy={cy} r={4} fill="white" stroke="#0f1729" strokeWidth={1.5} opacity={0.9}>
              <title>{s.name}</title>
            </circle>
          )
        })}
      </svg>
    </div>
  )
}
