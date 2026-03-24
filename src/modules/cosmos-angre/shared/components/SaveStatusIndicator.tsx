// ═══ QUAL-04 — Indicateur de sauvegarde ═══

import React from 'react'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'offline'

interface SaveStatusIndicatorProps {
  status: SaveStatus
}

const config: Record<SaveStatus, { label: string; color: string; dot: string }> = {
  saved:   { label: 'Sauvegarde', color: 'text-green-400',  dot: 'bg-green-400' },
  saving:  { label: 'Synchronisation...', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  unsaved: { label: 'Non sauvegarde', color: 'text-amber-400', dot: 'bg-amber-400' },
  offline: { label: 'Hors ligne', color: 'text-red-400', dot: 'bg-red-400' },
}

export default function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const cfg = config[status]
  return (
    <div className={`flex items-center gap-2 text-xs ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  )
}
