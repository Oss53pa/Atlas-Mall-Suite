// ═══ UNDO/REDO — History Panel ═══

import { Undo2, Redo2, Clock } from 'lucide-react'
import { useUndoRedo } from './useUndoRedo'
import type { UndoRedoManager } from './undoRedoManager'

export default function HistoryPanel({ manager }: { manager: UndoRedoManager }) {
  const { canUndo, canRedo, recentHistory, undo, redo } = useUndoRedo(manager)

  const timeAgo = (ts: number) => {
    const sec = Math.floor((Date.now() - ts) / 1000)
    if (sec < 60) return `${sec}s`
    if (sec < 3600) return `${Math.floor(sec / 60)}min`
    return `${Math.floor(sec / 3600)}h`
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center gap-1.5">
          <Clock size={14} /> Historique
        </h3>
        <div className="flex gap-1">
          <button onClick={undo} disabled={!canUndo}
            className="p-1.5 rounded bg-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-600 disabled:hover:bg-slate-700">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} disabled={!canRedo}
            className="p-1.5 rounded bg-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-600 disabled:hover:bg-slate-700">
            <Redo2 size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {recentHistory.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">Aucune action</p>
        )}
        {[...recentHistory].reverse().map((cmd, i) => (
          <div key={i} className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${i === 0 ? 'bg-blue-900/30 text-blue-300' : 'text-slate-400 hover:bg-slate-700/50'}`}>
            <span className="truncate">{cmd.description}</span>
            <span className="text-slate-500 ml-2 shrink-0">{timeAgo(cmd.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
