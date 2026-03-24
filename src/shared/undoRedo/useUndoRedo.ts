// ═══ UNDO/REDO — React Hook ═══

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import type { UndoRedoManager, Command } from './undoRedoManager'

export function useUndoRedo(manager: UndoRedoManager) {
  const subscribe = useCallback(
    (cb: () => void) => manager.subscribe(cb),
    [manager]
  )

  const getSnapshot = useCallback(() => ({
    canUndo: manager.canUndo(),
    canRedo: manager.canRedo(),
    undoCount: manager.getUndoStack().length,
    redoCount: manager.getRedoStack().length,
    recentHistory: manager.getRecentHistory(10),
    version: manager.getVersion(),
  }), [manager])

  const state = useSyncExternalStore(subscribe, getSnapshot)

  const undo = useCallback(() => manager.undo(), [manager])
  const redo = useCallback(() => manager.redo(), [manager])
  const execute = useCallback((cmd: Command) => manager.execute(cmd), [manager])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); manager.undo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); manager.redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); manager.redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [manager])

  return { ...state, undo, redo, execute }
}
