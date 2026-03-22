import React from 'react'
import { Star, AlertTriangle, Lightbulb, Crown, Signpost } from 'lucide-react'
import type { MomentCle } from '../../shared/proph3t/types'
import ScoreGauge from '../../shared/components/ScoreGauge'

interface ParcoursSectionProps {
  moments: MomentCle[]
  totalPois: number
  totalSignage: number
  onSelectMoment: (id: string) => void
}

export default function ParcoursSection({ moments, totalPois, totalSignage, onSelectMoment }: ParcoursSectionProps) {
  const addressed = moments.filter((m) => m.signageItems.length > 0).length
  const experienceScore = Math.min(95, 45 + totalPois * 3 + moments.length * 4)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-bold text-emerald-400">Les 7 Moments-Cles</h2>
        <p className="text-[10px] text-gray-500 mt-0.5">Parcours visiteur Cosmos Angre</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + Progress */}
        <div className="flex items-center gap-6">
          <ScoreGauge value={experienceScore} max={100} size={70} />
          <div>
            <div className="text-xl font-bold text-white">{experienceScore}<span className="text-sm text-gray-500">/100</span></div>
            <div className="text-xs text-gray-500">Score Experience</div>
            <div className="text-[10px] text-emerald-400 mt-1">
              {addressed}/{moments.length} moments adresses
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-emerald-400">{totalPois}</div>
            <div className="text-[10px] text-gray-500">POI</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400">{totalSignage}</div>
            <div className="text-[10px] text-gray-500">Signaletique</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-400">{moments.length}</div>
            <div className="text-[10px] text-gray-500">Moments</div>
          </div>
        </div>

        {/* Moment Cards */}
        <div className="space-y-2">
          {moments.sort((a, b) => a.number - b.number).map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMoment(m.id)}
              className="w-full text-left bg-gray-900/50 border border-gray-800 rounded-lg p-3 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
                  {m.number}
                </span>
                <span className="text-xs font-semibold text-white flex-1">{m.name}</span>
                {m.signageItems.length > 0 && (
                  <Signpost className="w-3 h-3 text-amber-400" />
                )}
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <Star className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-gray-400">{m.kpi}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-gray-400">{m.friction}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-gray-400">{m.recommendation}</span>
                </div>
                {m.cosmosClubAction && (
                  <div className="flex items-start gap-1.5">
                    <Crown className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                    <span className="text-gray-400">{m.cosmosClubAction}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
