import React from 'react'
import { Sparkles, Info, AlertTriangle, Activity, X } from 'lucide-react'

type InsightType = 'info' | 'alerte' | 'simulation'

interface ProPh3tInsightProps {
  text: string
  type: InsightType
  onDismiss?: () => void
}

const CONFIG: Record<InsightType, { icon: typeof Info; accent: string; bg: string; border: string; label: string }> = {
  info: {
    icon: Info,
    accent: '#a78bfa',
    bg: 'rgba(139, 92, 246, 0.06)',
    border: 'rgba(139, 92, 246, 0.18)',
    label: 'Insight',
  },
  alerte: {
    icon: AlertTriangle,
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.18)',
    label: 'Alerte',
  },
  simulation: {
    icon: Activity,
    accent: '#a78bfa',
    bg: 'rgba(139, 92, 246, 0.06)',
    border: 'rgba(139, 92, 246, 0.18)',
    label: 'Simulation',
  },
}

export default function ProPh3tInsight({ text, type, onDismiss }: ProPh3tInsightProps) {
  const cfg = CONFIG[type]
  const TypeIcon = cfg.icon

  return (
    <div
      className="relative flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {/* Icon cluster */}
      <div className="flex-shrink-0 pt-0.5">
        <div
          className="relative flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: `${cfg.accent}20` }}
        >
          <TypeIcon size={16} style={{ color: cfg.accent }} />
          <Sparkles
            size={10}
            className="absolute -right-0.5 -top-0.5"
            style={{ color: cfg.accent }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.accent }}>
            Proph3t &middot; {cfg.label}
          </span>
        </div>
        <p className="text-[13px] leading-relaxed text-gray-300">{text}</p>
      </div>

      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-400"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
