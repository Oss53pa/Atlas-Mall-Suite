import React from 'react'
import { Sparkles, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react'

interface Suggestion {
  id: string
  title: string
  description: string
  confidence: number
  impact?: string
}

interface ProactiveSuggestionProps {
  suggestions: Suggestion[]
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  onViewDetail?: (id: string) => void
}

export default function ProactiveSuggestion({ suggestions, onAccept, onReject, onViewDetail }: ProactiveSuggestionProps) {
  if (suggestions.length === 0) return null

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(168,85,247,0.04) 100%)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={16} style={{ color: '#a855f7' }} />
        <span className="text-[11px] font-bold tracking-wider" style={{ color: '#a855f7' }}>
          PROPH3T SUGGESTIONS
        </span>
      </div>

      {suggestions.map(s => (
        <div
          key={s.id}
          className="rounded-lg p-3"
          style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white">{s.title}</p>
              <p className="text-[11px] mt-1" style={{ color: '#94a3b8' }}>{s.description}</p>
              {s.impact && (
                <p className="text-[11px] mt-1 font-medium" style={{ color: '#a855f7' }}>{s.impact}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <div className="h-1 rounded-full" style={{ width: `${s.confidence * 100}%`, maxWidth: 60, background: '#a855f7' }} />
                <span className="text-[10px]" style={{ color: '#6b7280' }}>{Math.round(s.confidence * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {onAccept && (
              <button
                onClick={() => onAccept(s.id)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
              >
                <ThumbsUp size={10} /> Appliquer
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(s.id)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                <ThumbsDown size={10} /> Ignorer
              </button>
            )}
            {onViewDetail && (
              <button
                onClick={() => onViewDetail(s.id)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ml-auto"
                style={{ color: '#a855f7' }}
              >
                Detail <ChevronRight size={10} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
