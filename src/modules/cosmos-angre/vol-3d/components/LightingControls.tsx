import { useVol3DStore } from '../store/vol3dStore'
import type { LightingPreset } from '../store/vol3dTypes'

const PRESETS: { id: LightingPreset; label: string; icon: string }[] = [
  { id: 'day_natural', label: 'Jour naturel', icon: '\u2600\uFE0F' },
  { id: 'day_overcast', label: 'Jour couvert', icon: '\u2601\uFE0F' },
  { id: 'evening_commercial', label: 'Soir commercial', icon: '\uD83C\uDF06' },
  { id: 'night_security', label: 'Nuit securite', icon: '\uD83C\uDF19' },
  { id: 'presentation', label: 'Presentation', icon: '\uD83D\uDCA1' },
]

export default function LightingControls() {
  const lighting = useVol3DStore(s => s.config.lighting)
  const setLighting = useVol3DStore(s => s.setLighting)

  return (
    <div className="p-3">
      <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Eclairage</p>
      <div className="space-y-1">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => setLighting(p.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${lighting === p.id ? 'bg-amber-500/15 text-amber-300' : 'hover:bg-white/5 text-white/50'}`}>
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
