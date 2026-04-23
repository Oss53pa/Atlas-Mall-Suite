// ═══ SceneToolbar — Outils de transformation ═══

import { MousePointer2, Move, RotateCw, Maximize2, Trash2, Copy, Undo2 } from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'
import type { SceneTool } from '../store/sceneEditorTypes'

const TOOLS: { id: SceneTool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Selection', shortcut: 'V' },
  { id: 'move',   icon: Move,          label: 'Deplacer',  shortcut: 'G' },
  { id: 'rotate', icon: RotateCw,      label: 'Rotation',  shortcut: 'R' },
  { id: 'scale',  icon: Maximize2,     label: 'Echelle',   shortcut: 'S' },
  { id: 'delete', icon: Trash2,        label: 'Supprimer', shortcut: 'Del' },
]

export function SceneToolbar() {
  const activeTool = useSceneEditorStore(s => s.activeTool)
  const setTool = useSceneEditorStore(s => s.setTool)
  const selectedObjectId = useSceneEditorStore(s => s.selectedObjectId)
  const duplicateObject = useSceneEditorStore(s => s.duplicateObject)
  const removeObject = useSceneEditorStore(s => s.removeObject)
  const resetScene = useSceneEditorStore(s => s.resetScene)

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.06] bg-surface-1">
      {TOOLS.map(tool => (
        <button
          key={tool.id}
          onClick={() => {
            if (tool.id === 'delete' && selectedObjectId) {
              removeObject(selectedObjectId)
            } else {
              setTool(tool.id)
            }
          }}
          title={`${tool.label} (${tool.shortcut})`}
          className={`p-2 rounded-lg transition-colors ${
            activeTool === tool.id
              ? 'bg-atlas-700 text-white'
              : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <tool.icon size={16} />
        </button>
      ))}

      <div className="w-px h-5 bg-white/[0.06] mx-1" />

      <button
        onClick={() => selectedObjectId && duplicateObject(selectedObjectId)}
        disabled={!selectedObjectId}
        title="Dupliquer (Ctrl+D)"
        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
      >
        <Copy size={16} />
      </button>

      <button
        onClick={() => resetScene()}
        title="Reinitialiser la scene"
        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.04] transition-colors"
      >
        <Undo2 size={16} />
      </button>

      <div className="flex-1" />

      <span className="text-[10px] text-slate-600">
        {useSceneEditorStore.getState().scene.objects.length} objets
      </span>
    </div>
  )
}
