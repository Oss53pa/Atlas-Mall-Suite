// ═══ SPACE EDIT PANEL — Right sidebar for editing a selected space ═══

import type { DetectedSpace, SpaceState, SpaceStatus } from '../planReader/planEngineTypes'
import { usePlanEngineStore } from '../stores/planEngineStore'

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
  '#ec4899', '#f97316', '#14b8a6', '#84cc16', '#64748b', '#a855f7',
]

interface SpaceEditPanelProps {
  space: DetectedSpace
  onClose: () => void
  onOpenObjectLibrary?: (spaceId: string) => void
}

export function SpaceEditPanel({ space, onClose, onOpenObjectLibrary }: SpaceEditPanelProps) {
  const spaceStates = usePlanEngineStore(s => s.spaceStates)
  const setSpaceState = usePlanEngineStore(s => s.setSpaceState)

  const state: SpaceState = spaceStates[space.id] ?? {
    color: null,
    label: space.label,
    notes: '',
    status: 'vacant' as SpaceStatus,
    objects: [],
  }

  const update = (updates: Partial<SpaceState>) => {
    setSpaceState(space.id, updates)
  }

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-700 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white truncate">{state.label || space.label}</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-gray-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Nom du local */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nom du local</label>
          <input
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
            value={state.label || space.label}
            onChange={e => update({ label: e.target.value })}
            placeholder="Nom du local..."
          />
        </div>

        {/* Couleur */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Couleur</label>
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: state.color === color ? 'white' : 'transparent',
                }}
                onClick={() => update({ color })}
              />
            ))}
          </div>
          <input
            type="color"
            className="mt-2 w-full h-8 rounded cursor-pointer bg-gray-800 border border-gray-700"
            value={state.color ?? '#3b82f6'}
            onChange={e => update({ color: e.target.value })}
          />
          {state.color && (
            <button
              onClick={() => update({ color: null })}
              className="mt-1 text-xs text-gray-500 hover:text-gray-300"
            >
              Reinitialiser la couleur
            </button>
          )}
        </div>

        {/* Statut */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Statut</label>
          <select
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
            value={state.status}
            onChange={e => update({ status: e.target.value as SpaceStatus })}
          >
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupe</option>
            <option value="reserved">Reserve</option>
            <option value="works">En travaux</option>
          </select>
        </div>

        {/* Surface (read-only) */}
        <div className="bg-gray-800 rounded px-3 py-2 border border-gray-700">
          <span className="text-xs text-gray-400">Surface : </span>
          <span className="text-white font-mono text-sm">{space.areaSqm} m²</span>
        </div>

        {/* Type detecte */}
        <div className="bg-gray-800 rounded px-3 py-2 border border-gray-700">
          <span className="text-xs text-gray-400">Type : </span>
          <span className="text-white text-sm capitalize">{space.type}</span>
        </div>

        {/* Calque */}
        <div className="bg-gray-800 rounded px-3 py-2 border border-gray-700">
          <span className="text-xs text-gray-400">Calque : </span>
          <span className="text-gray-300 text-xs font-mono">{space.layer}</span>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notes</label>
          <textarea
            className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm h-20 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none"
            value={state.notes}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Notes..."
          />
        </div>

        {/* Add objects button */}
        {onOpenObjectLibrary && (
          <button
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded py-2 text-sm font-medium transition-colors"
            onClick={() => onOpenObjectLibrary(space.id)}
          >
            + Ajouter des objets
          </button>
        )}

        {/* Placed objects list */}
        {state.objects.length > 0 && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Objets ({state.objects.length})
            </label>
            <div className="space-y-1">
              {state.objects.map(obj => (
                <div key={obj.id} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1.5 text-xs text-gray-300">
                  <span>{obj.label ?? obj.type}</span>
                  <button
                    onClick={() => {
                      update({
                        objects: state.objects.filter(o => o.id !== obj.id),
                      })
                    }}
                    className="text-gray-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
