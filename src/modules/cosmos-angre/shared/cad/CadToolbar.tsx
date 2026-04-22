// ═══ CAD TOOLBAR — Drawing tools, layers, snap controls ═══

import React, { useState } from 'react'
import {
  MousePointer2, Hand, Minus, SeparatorVertical, Square, Pentagon,
  Ruler, Move, Scan, Type, ArrowUpRight, Eraser,
  Eye, EyeOff, Lock, Unlock, Undo2, Redo2, Copy, Clipboard, Trash2,
  Grid3X3, Magnet, Layers, ChevronDown, DoorOpen,
  Unlink, Plus, Pencil, AlertTriangle,
} from 'lucide-react'
import { useCadStore } from './cadStore'
import type { CadLayer } from './cadTypes'
import { TOOL_CONFIGS } from './cadTypes'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
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
    <div className="flex flex-col h-full w-11 bg-surface-1/80 border-r border-white/[0.04] py-2 gap-0.5 overflow-y-auto">
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
                    isActive ? 'bg-atlas-500/20 text-atlas-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
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
        className={`w-full flex items-center justify-center py-1.5 ${showLayers ? 'text-atlas-400' : 'text-gray-500 hover:text-gray-300'}`}
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
  const entities = useCadStore(s => s.entities)
  const toggleVis = useCadStore(s => s.toggleLayerVisibility)
  const setOpacity = useCadStore(s => s.setLayerOpacity)
  const toggleLock = useCadStore(s => s.toggleLayerLock)
  const addLayer = useCadStore(s => s.addLayer)
  const renameLayer = useCadStore(s => s.renameLayer)
  const dissociateLayer = useCadStore(s => s.dissociateLayer)
  const deleteLayer = useCadStore(s => s.deleteLayer)

  const [confirmDelete, setConfirmDelete] = useState<CadLayer | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // Compte d'entités par calque
  const countByLayer = layers.reduce<Record<string, number>>((acc, l) => {
    acc[l.id] = entities.filter(e => e.layer === l.id).length
    return acc
  }, {})

  const handleAdd = () => {
    const name = prompt('Nom du nouveau calque :', 'Calque ' + (layers.length + 1))
    if (!name) return
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#b38a5a', '#06b6d4', '#ec4899', '#eab308']
    const color = palette[layers.length % palette.length]
    addLayer({ name, color })
  }

  const startRename = (l: CadLayer) => {
    setRenamingId(l.id)
    setRenameValue(l.name)
    setMenuOpenId(null)
  }

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameLayer(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  const handleDissociate = (l: CadLayer) => {
    const count = dissociateLayer(l.id)
    setMenuOpenId(null)
    if (count === 0) {

      console.info(`[LayersPanel] Calque "${l.name}" : aucune entité à dissocier.`)
    }
  }

  return (
    <div className="absolute left-12 bottom-4 z-50 w-72 rounded-lg bg-surface-1 border border-white/10 shadow-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-white tracking-wider">
          CALQUES ({layers.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAdd}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
            title="Nouveau calque"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
        {layers.map(l => {
          const count = countByLayer[l.id] ?? 0
          const isMenu = menuOpenId === l.id
          const isProtected = l.id === 'plan'
          return (
            <div
              key={l.id}
              className="relative rounded border border-transparent hover:border-white/10 px-1.5 py-1"
            >
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleVis(l.id)} className="flex-shrink-0" title="Afficher/masquer">
                  {l.visible ? <Eye size={12} className="text-green-400" /> : <EyeOff size={12} className="text-gray-600" />}
                </button>
                <button onClick={() => toggleLock(l.id)} className="flex-shrink-0" title="Verrouiller">
                  {l.locked ? <Lock size={11} className="text-amber-400" /> : <Unlock size={11} className="text-gray-600" />}
                </button>
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />

                {renamingId === l.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                    }}
                    className="flex-1 min-w-0 bg-slate-800 text-white text-[11px] rounded px-1.5 py-0.5 border border-atlas-500 outline-none"
                  />
                ) : (
                  <span
                    onDoubleClick={() => !isProtected && startRename(l)}
                    className={`text-[11px] flex-1 truncate ${l.visible ? 'text-gray-300' : 'text-gray-600'}`}
                    title={isProtected ? 'Calque protégé (plan importé)' : 'Double-clic pour renommer'}
                  >
                    {l.name}
                  </span>
                )}

                <span className="text-[9px] text-slate-500 tabular-nums min-w-[24px] text-right">
                  {count}
                </span>

                <button
                  onClick={() => setMenuOpenId(isMenu ? null : l.id)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-white"
                  title="Plus d'options"
                >
                  <ChevronDown size={11} />
                </button>
              </div>

              <input
                type="range" min={0} max={1} step={0.05} value={l.opacity}
                onChange={e => setOpacity(l.id, parseFloat(e.target.value))}
                className="w-full h-1 mt-1 accent-atlas-500"
                title={`Opacité : ${Math.round(l.opacity * 100)}%`}
              />

              {/* Menu contextuel */}
              {isMenu && (
                <div
                  className="absolute right-1 top-7 z-10 w-44 rounded-md bg-slate-800 border border-white/10 shadow-lg py-1"
                  onMouseLeave={() => setMenuOpenId(null)}
                >
                  <button
                    onClick={() => startRename(l)}
                    disabled={isProtected}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Pencil size={11} /> Renommer
                  </button>
                  <button
                    onClick={() => handleDissociate(l)}
                    disabled={count === 0}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Déplace les entités de ce calque vers un autre"
                  >
                    <Unlink size={11} /> Dissocier les entités
                    {count > 0 && (
                      <span className="ml-auto text-[9px] text-amber-400">({count})</span>
                    )}
                  </button>
                  <div className="my-0.5 border-t border-white/5" />
                  <button
                    onClick={() => { setMenuOpenId(null); setConfirmDelete(l) }}
                    disabled={isProtected}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={11} /> Supprimer le calque
                  </button>
                  {isProtected && (
                    <div className="px-3 py-1 text-[9px] text-slate-500 italic border-t border-white/5">
                      Calque protégé (plan importé)
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {layers.length === 0 && (
        <div className="text-center py-6 text-[11px] text-slate-500">
          Aucun calque.
          <button onClick={handleAdd} className="block mx-auto mt-1 text-atlas-400 hover:text-atlas-300">
            + Créer un calque
          </button>
        </div>
      )}

      {/* Modale de confirmation suppression */}
      {confirmDelete && (
        <DeleteLayerDialog
          layer={confirmDelete}
          entityCount={countByLayer[confirmDelete.id] ?? 0}
          availableTargets={layers.filter(l => l.id !== confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={(mode, targetId) => {
            deleteLayer(confirmDelete.id, mode, targetId)
            setConfirmDelete(null)
          }}
        />
      )}
    </div>
  )
}

// ── Delete confirmation dialog ───────────────────────────────

function DeleteLayerDialog({
  layer, entityCount, availableTargets, onCancel, onConfirm,
}: {
  layer: CadLayer
  entityCount: number
  availableTargets: CadLayer[]
  onCancel: () => void
  onConfirm: (mode: 'purge' | 'dissociate', targetId?: string) => void
}) {
  const [mode, setMode] = useState<'purge' | 'dissociate'>(
    entityCount > 0 ? 'dissociate' : 'purge'
  )
  const [targetId, setTargetId] = useState<string>(
    availableTargets.find(l => l.id === 'default')?.id ?? availableTargets[0]?.id ?? ''
  )

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface-0/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[440px] max-w-[92vw] rounded-lg bg-surface-1 border border-red-900/50 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="text-sm font-bold text-white m-0">Supprimer le calque « {layer.name} »</h3>
        </div>

        <div className="p-5 space-y-3">
          {entityCount > 0 ? (
            <>
              <p className="text-[12px] text-slate-300 m-0">
                Ce calque contient <strong className="text-white">{entityCount} entité{entityCount > 1 ? 's' : ''}</strong>.
                Que faire ?
              </p>
              <label className="flex items-start gap-2 p-2.5 rounded border border-white/10 hover:border-amber-500/40 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === 'dissociate'}
                  onChange={() => setMode('dissociate')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[12px] text-amber-300 font-semibold">
                    Dissocier puis supprimer <span className="text-[10px] text-slate-500 font-normal">(recommandé)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Les entités sont déplacées vers un autre calque, puis le calque est supprimé.
                    Aucune perte de données.
                  </div>
                  {mode === 'dissociate' && (
                    <select
                      value={targetId}
                      onChange={e => setTargetId(e.target.value)}
                      className="mt-2 w-full bg-slate-800 border border-white/10 text-[11px] text-white px-2 py-1 rounded"
                    >
                      {availableTargets.map(t => (
                        <option key={t.id} value={t.id}>Vers : {t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
              <label className="flex items-start gap-2 p-2.5 rounded border border-white/10 hover:border-red-500/40 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === 'purge'}
                  onChange={() => setMode('purge')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-[12px] text-red-300 font-semibold">Purger (destructif)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Supprime définitivement le calque <strong>et toutes ses entités</strong>.
                    Cette action peut être annulée (Ctrl+Z).
                  </div>
                </div>
              </label>
            </>
          ) : (
            <p className="text-[12px] text-slate-300 m-0">
              Le calque est vide — il sera simplement supprimé.
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-[11px] text-slate-400 hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(mode, mode === 'dissociate' ? targetId : undefined)}
            className={`px-4 py-1.5 text-[11px] font-semibold rounded text-white ${
              mode === 'purge' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            {mode === 'purge' ? 'Purger' : 'Dissocier & supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
