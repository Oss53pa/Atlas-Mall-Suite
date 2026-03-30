// ═══ StatCard — Carte KPI reutilisable ═══
// Utilise dans les dashboards vol1, vol2, vol3

import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color: string
  sub?: string
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export function StatCard({ label, value, icon: Icon, color, sub, className = '' }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-5 border border-white/[0.06] bg-surface-2 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon size={20} style={{ color }} />
      </div>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      <p className="text-[12px] text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-[10px] mt-2 text-gray-600">{sub}</p>}
    </div>
  )
}

interface StatCardGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4
}

export function StatCardGrid({ children, columns = 4 }: StatCardGridProps) {
  const colClass = columns === 2
    ? 'grid-cols-1 sm:grid-cols-2'
    : columns === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-2 lg:grid-cols-4'
  return <div className={`grid ${colClass} gap-4`}>{children}</div>
}
