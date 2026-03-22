import React from 'react'
import { Wrench, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react'
import type { WiseFMLink as WiseFMLinkType } from '../../shared/proph3t/types'

interface WiseFMLinkProps {
  entityId: string
  entityType: 'camera' | 'door'
  wisefmLink?: WiseFMLinkType
}

function statusConfig(status: WiseFMLinkType['status']) {
  switch (status) {
    case 'operationnel': return { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-800/30', icon: CheckCircle, label: 'Operationnel' }
    case 'maintenance': return { color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/30', icon: Clock, label: 'Maintenance' }
    case 'panne': return { color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800/30', icon: AlertCircle, label: 'Panne' }
    case 'a_installer': return { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-800/30', icon: Wrench, label: 'A installer' }
  }
}

export default function WiseFMLinkComponent({ entityId, entityType, wisefmLink }: WiseFMLinkProps) {
  if (!wisefmLink) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">WiseFM</span>
        </div>
        <p className="text-[11px] text-gray-500">Equipement non lie a WiseFM</p>
        <button className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          <ExternalLink className="w-3 h-3" /> Lier dans WiseFM
        </button>
      </div>
    )
  }

  const cfg = statusConfig(wisefmLink.status)
  const StatusIcon = cfg.icon

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Wrench className={`w-4 h-4 ${cfg.color}`} />
          <span className="text-xs font-semibold text-gray-300">WiseFM</span>
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-medium ${cfg.color}`}>
          <StatusIcon className="w-3 h-3" /> {cfg.label}
        </span>
      </div>

      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-500">ID WiseFM</span>
          <span className="text-gray-300 font-mono">{wisefmLink.wisefmId}</span>
        </div>
        {wisefmLink.lastMaintenance && (
          <div className="flex justify-between">
            <span className="text-gray-500">Derniere maint.</span>
            <span className="text-gray-300">{new Date(wisefmLink.lastMaintenance).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
        {wisefmLink.nextMaintenance && (
          <div className="flex justify-between">
            <span className="text-gray-500">Prochaine maint.</span>
            <span className="text-gray-300">{new Date(wisefmLink.nextMaintenance).toLocaleDateString('fr-FR')}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button className="flex-1 text-[10px] text-center py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
          Creer OT
        </button>
        <button className="flex-1 text-[10px] text-center py-1.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors flex items-center justify-center gap-1">
          <ExternalLink className="w-3 h-3" /> Historique
        </button>
      </div>
    </div>
  )
}
