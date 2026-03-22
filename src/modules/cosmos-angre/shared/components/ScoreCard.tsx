import React from 'react'
import { TrendingUp, type LucideIcon } from 'lucide-react'

interface ScoreCardProps {
  label: string
  value: number
  max?: number
  color?: string
  icon?: LucideIcon
}

export default function ScoreCard({
  label,
  value,
  max = 100,
  color = '#818cf8',
  icon: Icon,
}: ScoreCardProps) {
  const pct = Math.min(value / max, 1)
  const size = 64
  const strokeWidth = 5
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      {/* Circular progress */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {Icon ? (
            <Icon size={18} style={{ color }} />
          ) : (
            <span className="text-sm font-bold text-white">{Math.round(value)}</span>
          )}
        </div>
      </div>

      {/* Text content */}
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold text-white">{Math.round(value)}</span>
          {max !== 100 && (
            <span className="text-xs text-gray-600">/ {max}</span>
          )}
        </div>
        {/* Trend indicator */}
        <div className="mt-0.5 flex items-center gap-1">
          <TrendingUp size={10} style={{ color }} />
          <span className="text-[10px]" style={{ color }}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
