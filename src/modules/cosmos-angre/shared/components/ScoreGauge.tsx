
interface ScoreGaugeProps {
  value: number
  max?: number
  label: string
  color?: string
  size?: number
}

export default function ScoreGauge({ value, max = 100, label, color = '#818cf8', size = 80 }: ScoreGaugeProps) {
  const pct = Math.min(value / max, 1)
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * pct

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={5}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white tracking-tight">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-gray-500 text-center uppercase tracking-wider">{label}</span>
    </div>
  )
}
