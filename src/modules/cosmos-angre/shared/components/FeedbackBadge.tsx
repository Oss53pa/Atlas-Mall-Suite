import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Clock } from 'lucide-react'

interface FeedbackBadgeProps {
  recommendationId: string
  ruleId: string
  onFeedback: (recommendationId: string, ruleId: string, feedback: 'accepted' | 'rejected' | 'deferred') => void
  size?: 'sm' | 'md'
}

export default function FeedbackBadge({ recommendationId, ruleId, onFeedback, size = 'sm' }: FeedbackBadgeProps) {
  const [chosen, setChosen] = useState<'accepted' | 'rejected' | 'deferred' | null>(null)

  const handleClick = (fb: 'accepted' | 'rejected' | 'deferred') => {
    setChosen(fb)
    onFeedback(recommendationId, ruleId, fb)
  }

  const iconSize = size === 'sm' ? 12 : 16
  const btnClass = size === 'sm'
    ? 'p-1 rounded-md transition-all'
    : 'p-1.5 rounded-lg transition-all'

  if (chosen) {
    const config = {
      accepted: { icon: ThumbsUp, color: '#22c55e', label: 'Accepte' },
      rejected: { icon: ThumbsDown, color: '#ef4444', label: 'Rejete' },
      deferred: { icon: Clock, color: '#f59e0b', label: 'Differe' },
    }[chosen]
    const Icon = config.icon
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
        style={{ background: `${config.color}15`, color: config.color }}
      >
        <Icon size={10} /> {config.label}
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => handleClick('accepted')}
        className={btnClass}
        style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e' }}
        title="Accepter"
      >
        <ThumbsUp size={iconSize} />
      </button>
      <button
        onClick={() => handleClick('rejected')}
        className={btnClass}
        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
        title="Rejeter"
      >
        <ThumbsDown size={iconSize} />
      </button>
      <button
        onClick={() => handleClick('deferred')}
        className={btnClass}
        style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}
        title="Differer"
      >
        <Clock size={iconSize} />
      </button>
    </div>
  )
}
