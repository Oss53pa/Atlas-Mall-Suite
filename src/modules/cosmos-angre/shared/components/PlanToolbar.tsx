// ═══ PLAN TOOLBAR — Floating tool buttons for the plan canvas ═══

import React from 'react'
import type { PlanTool } from '../planReader/planEngineTypes'

interface PlanToolbarProps {
  activeTool: PlanTool
  onToolChange: (tool: PlanTool) => void
  onFitScreen: () => void
  showGrid: boolean
  onToggleGrid: () => void
  showDimensions: boolean
  onToggleDimensions: () => void
  showLabels: boolean
  onToggleLabels: () => void
  showZones?: boolean
  onToggleZones?: () => void
}

const TOOLS: Array<{ id: PlanTool; label: string; icon: string; shortcut?: string }> = [
  { id: 'select', label: 'Selection', icon: '⊹', shortcut: 'V' },
  { id: 'hand', label: 'Deplacer', icon: '✋', shortcut: 'H' },
  { id: 'zoom-in', label: 'Zoom +', icon: '🔍' },
  { id: 'measure', label: 'Mesurer', icon: '📏', shortcut: 'M' },
  { id: 'draw-rect', label: 'Zone rect', icon: '▭' },
  { id: 'draw-poly', label: 'Zone poly', icon: '⬠' },
  { id: 'text', label: 'Texte', icon: 'T' },
]

export function PlanToolbar({
  activeTool, onToolChange, onFitScreen,
  showGrid, onToggleGrid,
  showDimensions, onToggleDimensions,
  showLabels, onToggleLabels,
  showZones, onToggleZones,
}: PlanToolbarProps) {
  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col gap-1">
      {/* Tool buttons */}
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors
            ${activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
          title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="h-px bg-gray-700 my-1" />

      {/* Fit screen */}
      <button
        onClick={onFitScreen}
        className="w-8 h-8 rounded bg-gray-800/80 text-gray-300 text-[9px] hover:bg-gray-700 flex items-center justify-center"
        title="Ajuster a l'ecran (Ctrl+0)"
      >
        Fit
      </button>

      {/* Toggles */}
      <button
        onClick={onToggleGrid}
        className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors
          ${showGrid ? 'bg-gray-600 text-white' : 'bg-gray-800/80 text-gray-500 hover:bg-gray-700'}`}
        title="Grille"
      >
        #
      </button>
      <button
        onClick={onToggleDimensions}
        className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors
          ${showDimensions ? 'bg-gray-600 text-white' : 'bg-gray-800/80 text-gray-500 hover:bg-gray-700'}`}
        title="Cotes"
      >
        ↔
      </button>
      <button
        onClick={onToggleLabels}
        className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors
          ${showLabels ? 'bg-gray-600 text-white' : 'bg-gray-800/80 text-gray-500 hover:bg-gray-700'}`}
        title="Labels"
      >
        A
      </button>
      {onToggleZones && (
        <button
          onClick={onToggleZones}
          className={`w-8 h-8 rounded text-xs flex items-center justify-center transition-colors
            ${showZones ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-500 hover:bg-gray-700'}`}
          title="Zones / Espaces"
        >
          Z
        </button>
      )}
    </div>
  )
}
