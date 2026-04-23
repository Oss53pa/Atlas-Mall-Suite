import { useVol3DStore } from '../store/vol3dStore'
import type { Floor } from '../../shared/proph3t/types'

interface Props { floors: Floor[] }

export default function FloorStackControls({ floors }: Props) {
  const floorStack = useVol3DStore(s => s.config.floorStack)
  const setFloorVisible = useVol3DStore(s => s.setFloorVisible)
  const setFloorOpacity = useVol3DStore(s => s.setFloorOpacity)

  if (floorStack.length === 0) return null

  return (
    <div className="p-3">
      <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Etages</p>
      <div className="space-y-2">
        {floorStack.map(s => (
          <div key={s.floorId} className="flex items-center gap-2">
            <button onClick={() => setFloorVisible(s.floorId, !s.visible)}
              className={`w-6 h-6 rounded border text-[10px] flex items-center justify-center transition-colors ${s.visible ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' : 'border-white/10 text-white/20'}`}>
              {s.visible ? '\u2713' : ''}
            </button>
            <span className="text-xs text-white/70 w-10">{s.level}</span>
            <input type="range" min={0.1} max={1} step={0.1} value={s.opacity}
              onChange={e => setFloorOpacity(s.floorId, parseFloat(e.target.value))}
              className="flex-1 h-1 accent-blue-500" disabled={!s.visible} />
            <span className="text-[10px] text-white/40 w-6 text-right">{Math.round(s.opacity * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
