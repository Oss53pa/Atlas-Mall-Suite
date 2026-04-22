import { useVol3DStore } from '../store/vol3dStore'
import type { ViewAnglePreset } from '../store/vol3dTypes'

const PRESETS: { id: ViewAnglePreset; label: string }[] = [
  { id: 'iso_standard', label: 'Standard' },
  { id: 'iso_north_west', label: 'Nord-Ouest' },
  { id: 'iso_north_east', label: 'Nord-Est' },
  { id: 'bird_eye', label: 'Vue aerienne' },
  { id: 'entrance', label: 'Entree' },
  { id: 'food_court', label: 'Food Court' },
]

export default function CameraControls3D() {
  const viewAngle = useVol3DStore(s => s.config.viewAngle)
  const setViewAngle = useVol3DStore(s => s.setViewAngle)

  return (
    <div className="p-3">
      <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Angle de vue</p>
      <div className="grid grid-cols-2 gap-1">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setViewAngle(p.id)}
            className={`px-2 py-1.5 rounded text-[10px] transition-colors ${viewAngle === p.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'hover:bg-white/5 text-white/50 border border-transparent'}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
