// ═══ TOUR STEP CARD — One step in the player ═══
// Shows title, description, optional media, numbered badge.

import type { TourStep } from './stores/tourStore'

interface TourStepCardProps {
  step: TourStep
  index: number
  total: number
  /** Whether auto-play is running */
  autoPlay?: boolean
  /** Seconds remaining before auto-advance */
  countdown?: number
  compact?: boolean
}

export default function TourStepCard({
  step, index, total, autoPlay, countdown, compact,
}: TourStepCardProps) {
  const progress = autoPlay && step.duration > 0
    ? ((step.duration - (countdown ?? step.duration)) / step.duration) * 100
    : 0

  return (
    <div className="w-full">
      {/* Media */}
      {!compact && step.mediaUrl && (
        <div className="w-full h-36 rounded-lg overflow-hidden mb-3 bg-[#0f172a]">
          <img
            src={step.mediaUrl}
            alt={step.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}

      {/* Step counter badge + title */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white/70">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white leading-tight truncate">{step.title}</h3>
          {!compact && step.description && (
            <p className="mt-1.5 text-xs text-white/60 leading-relaxed line-clamp-3">
              {step.description}
            </p>
          )}
        </div>
        {/* Step counter */}
        <span className="flex-shrink-0 text-[11px] text-white/30 mt-0.5">{index + 1}/{total}</span>
      </div>

      {/* Auto-play progress bar */}
      {autoPlay && (
        <div className="mt-3 h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 rounded-full transition-all ease-linear"
            style={{
              width: `${progress}%`,
              transitionDuration: '1s',
            }}
          />
        </div>
      )}
    </div>
  )
}
