// F-004 : sous-panel "Moment cle detaille" extrait de Vol3Module.tsx.
// Aucun changement de comportement.

import React from 'react'
import { X, Star, AlertTriangle, Lightbulb, Crown } from 'lucide-react'
import type { MomentCle } from '../../shared/proph3t/types'

export function MomentDetail({
  moment,
  onClose,
}: {
  moment: MomentCle
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
            {moment.number}
          </span>
          {moment.name}
        </h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* KPI */}
        <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-3">
          <div className="text-xs text-emerald-500 font-mono mb-1 flex items-center gap-1">
            <Star className="w-3 h-3" /> KPI
          </div>
          <p className="text-gray-200">{moment.kpi}</p>
        </div>

        {/* Friction */}
        <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-3">
          <div className="text-xs text-amber-500 font-mono mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Friction
          </div>
          <p className="text-gray-200">{moment.friction}</p>
        </div>

        {/* Recommendation */}
        <div className="rounded-lg bg-blue-950/30 border border-blue-800/40 p-3">
          <div className="text-xs text-blue-400 font-mono mb-1 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Recommandation
          </div>
          <p className="text-gray-200">{moment.recommendation}</p>
        </div>

        {/* Cosmos Club Action */}
        {moment.cosmosClubAction && (
          <div className="rounded-lg bg-purple-950/30 border border-purple-800/40 p-3">
            <div className="text-xs text-purple-400 font-mono mb-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Cosmos Club
            </div>
            <p className="text-gray-200">{moment.cosmosClubAction}</p>
          </div>
        )}

        {/* Linked Signage */}
        {moment.signageItems.length > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 font-mono mb-2">Signalétique liée</div>
            <div className="flex flex-wrap gap-1">
              {moment.signageItems.map((sid) => (
                <span
                  key={sid}
                  className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300 font-mono"
                >
                  {sid}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
