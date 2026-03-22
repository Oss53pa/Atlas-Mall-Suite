import React from 'react'

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
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold text-white">{Math.round(value)}</span>
      </div>
      <span className="text-xs text-gray-400 text-center mt-1">{label}</span>
    </div>
  )
}
