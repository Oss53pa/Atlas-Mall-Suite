// F-004 : Footer Vol.3 extrait de Vol3Module.tsx.

import React from 'react'

interface Vol3FooterProps {
  poiCount: number
  signageCount: number
  momentsAddressed: number
  momentsTotal: number
  activeProfileName?: string | null
  activeFloorLevel?: string | null
}

export function Vol3Footer({
  poiCount, signageCount, momentsAddressed, momentsTotal,
  activeProfileName, activeFloorLevel,
}: Vol3FooterProps) {
  return (
    <footer className="flex items-center justify-between px-4 py-1.5 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm text-xs text-gray-500 shrink-0">
      <div className="flex items-center gap-4">
        <span>
          <span className="text-emerald-400 font-semibold">{poiCount}</span> POI{poiCount !== 1 && 's'}
        </span>
        <span className="w-px h-3 bg-gray-800" />
        <span>
          <span className="text-amber-400 font-semibold">{signageCount}</span> signalétique
        </span>
        <span className="w-px h-3 bg-gray-800" />
        <span>
          Moments{' '}
          <span className="text-blue-400 font-semibold">
            {momentsAddressed}/{momentsTotal}
          </span>{' '}
          adressés
        </span>
      </div>

      <div className="flex items-center gap-3">
        {activeProfileName && (
          <span className="text-gray-600">
            Profil: <span className="text-gray-400">{activeProfileName}</span>
          </span>
        )}
        <span className="text-gray-600">
          Étage: <span className="text-gray-400">{activeFloorLevel ?? '—'}</span>
        </span>
      </div>
    </footer>
  )
}
