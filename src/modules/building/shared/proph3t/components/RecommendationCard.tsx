// ═══ RecommendationCard — Feedback bayesien Proph3t ═══
// Chaque recommandation Proph3t encapsulee avec boutons Accept/Reject/Modify

import { useState } from 'react'

interface RecommendationCardProps {
  ruleId: string
  ruleCategory: string
  recommendation: string
  explanation: string
  normReference?: string
  estimatedEffortMin: number
  context: Record<string, string>
  projectId: string
  onAccept?: () => void
  onReject?: () => void
  onModify?: (newValue: string) => void
  onFeedback?: (ruleId: string, action: 'accepted' | 'rejected' | 'modified', modifiedValue?: string) => void
}

export function RecommendationCard({
  ruleId,
  recommendation,
  explanation,
  normReference,
  estimatedEffortMin,
  onAccept,
  onReject,
  onFeedback,
}: RecommendationCardProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [showModifyInput, setShowModifyInput] = useState(false)
  const [modifiedValue, setModifiedValue] = useState('')

  const handleFeedback = (action: 'accepted' | 'rejected' | 'modified') => {
    onFeedback?.(ruleId, action, action === 'modified' ? modifiedValue : undefined)
    setFeedbackGiven(true)
    if (action === 'accepted') onAccept?.()
    if (action === 'rejected') onReject?.()
  }

  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/40 py-1">
        <span>Pris en compte — Proph3t memorise votre preference</span>
      </div>
    )
  }

  return (
    <div className="border border-white/10 rounded-lg p-3 space-y-2">
      <p className="text-sm text-white/80">{recommendation}</p>
      <p className="text-xs text-white/50">{explanation}</p>
      {normReference && (
        <span className="text-xs text-blue-400/70 font-mono">{normReference}</span>
      )}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-white/30">~{estimatedEffortMin} min</span>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setShowModifyInput(!showModifyInput)}
            className="px-2 py-1 text-xs text-white/40 border border-white/10 rounded hover:border-white/20 transition"
          >
            Modifier
          </button>
          <button
            onClick={() => handleFeedback('rejected')}
            className="px-2 py-1 text-xs text-red-400/70 border border-red-400/20 rounded hover:bg-red-400/10 transition"
          >
            Rejeter
          </button>
          <button
            onClick={() => handleFeedback('accepted')}
            className="px-2 py-1 text-xs text-green-400 border border-green-400/30 rounded hover:bg-green-400/10 transition"
          >
            Appliquer
          </button>
        </div>
      </div>
      {showModifyInput && (
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={modifiedValue}
            onChange={e => setModifiedValue(e.target.value)}
            placeholder="Votre valeur preferee..."
            className="flex-1 text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white/80"
          />
          <button
            onClick={() => handleFeedback('modified')}
            disabled={!modifiedValue}
            className="px-2 py-1 text-xs text-amber-400 border border-amber-400/30 rounded hover:bg-amber-400/10 disabled:opacity-40 transition"
          >
            Confirmer
          </button>
        </div>
      )}
    </div>
  )
}
