import React from 'react'
import { Flag, ExternalLink } from 'lucide-react'
import type { CockpitMilestone } from '../../shared/proph3t/types'

interface CockpitLinkProps {
  milestone?: CockpitMilestone
}

function statusConfig(status: CockpitMilestone['status']) {
  switch (status) {
    case 'a_venir': return { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-800/30', label: 'A venir' }
    case 'en_cours': return { color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/30', label: 'En cours' }
    case 'termine': return { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800/30', label: 'Termine' }
    case 'en_retard': return { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800/30', label: 'En retard' }
  }
}

export default function CockpitLink({ milestone }: CockpitLinkProps) {
  if (!milestone) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-400">Aucun jalon COCKPIT lie</span>
        </div>
      </div>
    )
  }

  const cfg = statusConfig(milestone.status)

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Flag className={`w-4 h-4 ${cfg.color}`} />
          <span className="text-xs font-semibold text-gray-300">COCKPIT</span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      <div className="text-xs text-white mb-1">{milestone.label}</div>
      <div className="text-[11px] text-gray-400">
        Echeance : {new Date(milestone.dueDate).toLocaleDateString('fr-FR')}
      </div>

      <button className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
        <ExternalLink className="w-3 h-3" /> Voir dans COCKPIT
      </button>
    </div>
  )
}
