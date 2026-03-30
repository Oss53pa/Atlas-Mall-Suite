// ═══ SceneInspector — Panneau droit, proprietes objet selectionne ═══

import { Trash2, Copy, X } from 'lucide-react'
import { useSceneEditorStore } from '../store/sceneEditorStore'

export function SceneInspector() {
  const scene = useSceneEditorStore(s => s.scene)
  const selectedObjectId = useSceneEditorStore(s => s.selectedObjectId)
  const selectObject = useSceneEditorStore(s => s.selectObject)
  const updateObject = useSceneEditorStore(s => s.updateObject)
  const removeObject = useSceneEditorStore(s => s.removeObject)
  const duplicateObject = useSceneEditorStore(s => s.duplicateObject)

  const obj = scene.objects.find(o => o.id === selectedObjectId)

  if (!obj) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-slate-600 text-center mt-8">
          Selectionnez un objet pour voir ses proprietes
        </p>
      </div>
    )
  }

  const setPos = (axis: 'x' | 'y' | 'z', value: number) => {
    updateObject(obj.id, { position: { ...obj.position, [axis]: value } })
  }
  const setRot = (axis: 'x' | 'y' | 'z', value: number) => {
    updateObject(obj.id, { rotation: { ...obj.rotation, [axis]: value } })
  }
  const setScale = (axis: 'x' | 'y' | 'z', value: number) => {
    updateObject(obj.id, { scale: { ...obj.scale, [axis]: value } })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <p className="text-[12px] font-semibold text-white truncate">{obj.name}</p>
        <button onClick={() => selectObject(null)} className="text-slate-500 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Type */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Type</label>
          <p className="text-[12px] text-slate-300 mt-0.5">{obj.type}</p>
        </div>

        {/* Name */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Nom</label>
          <input
            type="text"
            value={obj.name}
            onChange={e => updateObject(obj.id, { name: e.target.value })}
            className="input-dark text-[12px] mt-1"
          />
        </div>

        {/* Position */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Position (m)</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis}>
                <span className="text-[9px] text-slate-600 uppercase">{axis}</span>
                <input
                  type="number"
                  step={0.1}
                  value={obj.position[axis].toFixed(1)}
                  onChange={e => setPos(axis, parseFloat(e.target.value) || 0)}
                  className="input-dark text-[11px] py-1 mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Rotation (deg)</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis}>
                <span className="text-[9px] text-slate-600 uppercase">{axis}</span>
                <input
                  type="number"
                  step={15}
                  value={Math.round(obj.rotation[axis] * (180 / Math.PI))}
                  onChange={e => setRot(axis, (parseFloat(e.target.value) || 0) * (Math.PI / 180))}
                  className="input-dark text-[11px] py-1 mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Echelle</label>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {(['x', 'y', 'z'] as const).map(axis => (
              <div key={axis}>
                <span className="text-[9px] text-slate-600 uppercase">{axis}</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={obj.scale[axis].toFixed(1)}
                  onChange={e => setScale(axis, Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="input-dark text-[11px] py-1 mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => duplicateObject(obj.id)}
            className="btn-ghost flex-1 text-[11px]"
          >
            <Copy size={12} /> Dupliquer
          </button>
          <button
            onClick={() => { removeObject(obj.id); selectObject(null) }}
            className="btn-ghost flex-1 text-[11px] text-red-400 hover:text-red-300"
          >
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}
