// ═══ CAD TOOLBAR — Drawing tools, layers, snap controls ═══

import React, { useState } from 'react'
import {
  MousePointer2, Hand, Minus, SeparatorVertical, Square, Pentagon,
  Ruler, Move, Scan, Type, ArrowUpRight, Eraser,
  Eye, EyeOff, Lock, Unlock, Undo2, Redo2, Copy, Clipboard, Trash2,
  Grid3X3, Magnet, Layers, ChevronDown, DoorOpen,
} from 'lucide-react'
import { useCadStore } from './cadStore'
import type { CadTool, CadLayer } from './cadTypes'
import { TOOL_CONFIGS } from './cadTypes'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  MousePointer2, Hand, Minus, SeparatorVertical, Square, Pentagon,
  Ruler, Move, Scan, Type, ArrowUpRight, Eraser, DoorOpen,
}

// ── Main Toolbar ─────────────────────────────────────────────

export default function CadToolbar() {
  const activeTool = useCadStore(s => s.activeTool)
  const setTool = useCadStore(s => s.setTool)
  const undo = useCadStore(s => s.undo)
  const redo = useCadStore(s => s.redo)
  const undoStack = useCadStore(s => s.undoStack)
  const redoStack = useCadStore(s => s.redoStack)
  const deleteSelected = useCadStore(s => s.deleteSelected)
  const copySelected = useCadStore(s => s.copySelected)
  const paste = useCadStore(s => s.paste)
  const selectedIds = useCadStore(s => s.selectedIds)
  const snap = useCadStore(s => s.snap)
  const setSnapConfig = useCadStore(s => s.setSnapConfig)

  const [showLayers, setShowLayers] = useState(false)

  const groups = ['select', 'draw', 'measure', 'annotate', 'place'] as const
  const groupLabels: Record<string, string> = {
    select: 'SELECTION', draw: 'DESSIN', measure: 'MESURE', annotate: 'ANNOTATION', place: 'PLACEMENT',
  }

  return (
    <div className="flex flex-col h-full w-11 bg-gray-900/80 border-r border-white/[0.04] py-2 gap-0.5 overflow-y-auto">
      {/* Tool groups */}
      {groups.map(group => {
        const tools = TOOL_CONFIGS.filter(t => t.group === group)
        if (tools.length === 0) return null
        return (
          <div key={group}>
            <div className="text-[7px] text-gray-600 text-center font-semibold tracking-widest mt-1.5 mb-0.5">
              {groupLabels[group]}
            </div>
            {tools.map(tool => {
              const Icon = ICON_MAP[tool.icon] ?? Square
              const isActive = activeTool === tool.id
              return (
                <button
                  key={tool.id}
                  onClick={() => setTool(tool.id)}
                  className={`w-full flex items-center justify-center py-1.5 transition-colors ${
                    isActive ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }`}
                  title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                >
                  <Icon size={15} />
                </button>
              )
            })}
          </div>
        )
      })}

      {/* Separator */}
      <div className="border-t border-white/[0.04] mx-2 my-1" />

      {/* Undo / Redo */}
      <button onClick={undo} disabled={undoStack.length === 0}
        className={`w-full flex items-center justify-center py-1.5 ${undoStack.length > 0 ? 'text-gray-400 hover:text-white' : 'text-gray-700'}`}
        title="Annuler (Ctrl+Z)">
        <Undo2 size={14} />
      </button>
      <button onClick={redo} disabled={redoStack.length === 0}
        className={`w-full flex items-center justify-center py-1.5 ${redoStack.length > 0 ? 'text-gray-400 hover:text-white' : 'text-gray-700'}`}
        title="Retablir (Ctrl+Y)">
        <Redo2 size={14} />
      </button>

      {/* Separator */}
      <div className="border-t border-white/[0.04] mx-2 my-1" />

      {/* Copy / Paste / Delete */}
      <button onClick={copySelected} disabled={selectedIds.size === 0}
        className={`w-full flex items-center justify-center py-1.5 ${selectedIds.size > 0 ? 'text-gray-400 hover:text-white' : 'text-gray-700'}`}
        title="Copier (Ctrl+C)">
        <Copy size={14} />
      </button>
      <button onClick={() => paste()}
        className="w-full flex items-center justify-center py-1.5 text-gray-400 hover:text-white"
        title="Coller (Ctrl+V)">
        <Clipboard size={14} />
      </button>
      <button onClick={deleteSelected} disabled={selectedIds.size === 0}
        className={`w-full flex items-center justify-center py-1.5 ${selectedIds.size > 0 ? 'text-red-400 hover:text-red-300' : 'text-gray-700'}`}
        title="Supprimer (Suppr)">
        <Trash2 size={14} />
      </button>

      {/* Separator */}
      <div className="border-t border-white/[0.04] mx-2 my-1" />

      {/* Snap toggle */}
      <button
        onClick={() => setSnapConfig({ enabled: !snap.enabled })}
        className={`w-full flex items-center justify-center py-1.5 ${snap.enabled ? 'text-amber-400' : 'text-gray-600'}`}
        title={snap.enabled ? 'Accrochage actif' : 'Accrochage desactive'}
      >
        <Magnet size={14} />
      </button>

      {/* Grid toggle */}
      <button
        onClick={() => setSnapConfig({ gridVisible: !snap.gridVisible })}
        className={`w-full flex items-center justify-center py-1.5 ${snap.gridVisible ? 'text-blue-400' : 'text-gray-600'}`}
        title="Grille">
        <Grid3X3 size={14} />
      </button>

      {/* Layers panel toggle */}
      <button
        onClick={() => setShowLayers(!showLayers)}
        className={`w-full flex items-center justify-center py-1.5 ${showLayers ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
        title="Calques">
        <Layers size={14} />
      </button>

      {/* Layers panel (floating) */}
      {showLayers && <LayersPanel onClose={() => setShowLayers(false)} />}
    </div>
  )
}

// ── Layers Panel ─────────────────────────────────────────────

function LayersPanel({ onClose }: { onClose: () => void }) {
  const layers = useCadStore(s => s.layers)
  const toggleVis = useCadStore(s => s.toggleLayerVisibility)
  const setOpacity = useCadStore(s => s.setLayerOpacity)
  const toggleLock = useCadStore(s => s.toggleLayerLock)

  return (
    <div className="absolute left-12 bottom-4 z-50 w-56 rounded-lg bg-gray-900 border border-white/10 shadow-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-white tracking-wider">CALQUES</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">✕</button>
      </div>
      <div className="space-y-1.5">
        {layers.map(l => (
          <div key={l.id} className="flex items-center gap-2">
            <button onClick={() => toggleVis(l.id)} className="flex-shrink-0">
              {l.visible ? <Eye size={12} className="text-green-400" /> : <EyeOff size={12} className="text-gray-600" />}
            </button>
            <button onClick={() => toggleLock(l.id)} className="flex-shrink-0">
              {l.locked ? <Lock size={11} className="text-amber-400" /> : <Unlock size={11} className="text-gray-600" />}
            </button>
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
            <span className={`text-[11px] flex-1 truncate ${l.visible ? 'text-gray-300' : 'text-gray-600'}`}>
              {l.name}
            </span>
            <input
              type="range" min={0} max={1} step={0.05} value={l.opacity}
              onChange={e => setOpacity(l.id, parseFloat(e.target.value))}
              className="w-14 h-1 accent-indigo-500"
              title={`Opacite: ${Math.round(l.opacity * 100)}%`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
