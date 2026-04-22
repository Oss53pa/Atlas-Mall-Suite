import { Star, AlertTriangle, Lightbulb, Crown, Signpost } from 'lucide-react'
import type { MomentCle } from '../../shared/proph3t/types'

interface MomentCardProps {
  moment: MomentCle
  isSelected: boolean
  onClick: () => void
}

export default function MomentCard({ moment, isSelected, onClick }: MomentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 transition-colors ${
        isSelected
          ? 'bg-emerald-950/30 border border-emerald-500/40'
          : 'bg-gray-900/50 border border-gray-800 hover:border-emerald-500/20'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
          {moment.number}
        </span>
        <span className="text-xs font-semibold text-white flex-1">{moment.name}</span>
        {moment.signageItems.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
            <Signpost className="w-3 h-3" /> {moment.signageItems.length}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-start gap-1.5">
          <Star className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-gray-400">{moment.kpi}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-gray-400">{moment.friction}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <Lightbulb className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
          <span className="text-gray-400">{moment.recommendation}</span>
        </div>
        {moment.cosmosClubAction && (
          <div className="flex items-start gap-1.5">
            <Crown className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
            <span className="text-gray-400">{moment.cosmosClubAction}</span>
          </div>
        )}
      </div>
    </button>
  )
}
