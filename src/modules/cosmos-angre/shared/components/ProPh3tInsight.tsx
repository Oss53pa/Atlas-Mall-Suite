import { Sparkles, Info, AlertTriangle, AlertOctagon, Lightbulb, Activity, Eye, X } from 'lucide-react'

export type InsightType = 'critique' | 'attention' | 'info' | 'recommandation' | 'simulation'

export interface ProPh3tInsightData {
  id: string
  text: string
  type: InsightType
  entityId?: string
  zoneId?: string
}

interface ProPh3tInsightProps {
  text: string
  type: InsightType
  onDismiss?: () => void
  onView?: () => void
}

const CONFIG: Record<InsightType, { icon: typeof Info; accent: string; bg: string; border: string; label: string }> = {
  critique: {
    icon: AlertOctagon,
    accent: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    label: 'Critique',
  },
  attention: {
    icon: AlertTriangle,
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.18)',
    label: 'Attention',
  },
  info: {
    icon: Info,
    accent: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.06)',
    border: 'rgba(59, 130, 246, 0.18)',
    label: 'Info',
  },
  recommandation: {
    icon: Lightbulb,
    accent: '#10b981',
    bg: 'rgba(16, 185, 129, 0.06)',
    border: 'rgba(16, 185, 129, 0.18)',
    label: 'Recommandation',
  },
  simulation: {
    icon: Activity,
    accent: '#a78bfa',
    bg: 'rgba(139, 92, 246, 0.06)',
    border: 'rgba(139, 92, 246, 0.18)',
    label: 'Simulation',
  },
}

export default function ProPh3tInsight({ text, type, onDismiss, onView }: ProPh3tInsightProps) {
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
        <p className="text-[13px] leading-relaxed text-gray-300 max-w-[280px]">{text}</p>
        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2">
          {onView && (
            <button
              onClick={onView}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors hover:bg-white/10"
              style={{ color: cfg.accent, border: `1px solid ${cfg.accent}40` }}
            >
              <Eye size={10} />
              Voir
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Ignorer
            </button>
          )}
        </div>
      </div>

      {/* Close */}
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
