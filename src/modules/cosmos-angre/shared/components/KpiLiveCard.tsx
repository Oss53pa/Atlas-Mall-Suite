import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface KpiLiveCardProps {
  label: string
  value: string | number
  previousValue?: string | number
  unit?: string
  icon: LucideIcon
  color: string
  trend?: 'up' | 'down' | 'stable'
  flashOnChange?: boolean
}

export default function KpiLiveCard({
  label, value, previousValue, unit, icon: Icon, color, trend, flashOnChange = true,
}: KpiLiveCardProps) {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (flashOnChange && previousValue !== undefined && String(value) !== String(previousValue)) {
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 800)
      return () => clearTimeout(timer)
    }
  }, [value, previousValue, flashOnChange])

  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#6b7280'

  return (
    <div
      className="rounded-xl p-4 transition-all duration-300"
      style={{
        background: flash ? `${color}15` : '#141e2e',
        border: `1px solid ${flash ? `${color}40` : '#1e2a3a'}`,
        boxShadow: flash ? `0 0 16px ${color}20` : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium" style={{ color: '#6b7280' }}>{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white">{value}</span>
        {unit && <span className="text-[11px]" style={{ color: '#6b7280' }}>{unit}</span>}
        {trend && (
          <span className="text-[12px] font-semibold" style={{ color: trendColor }}>
            {trendArrow}
          </span>
        )}
      </div>
    </div>
  )
}
