import { useVol3DStore } from '../store/vol3dStore'

const LAYERS: { key: 'showZones' | 'showCameras' | 'showCameraFOV' | 'showPOI' | 'showSignage' | 'showTransitions' | 'showFloorLabels'; label: string; color: string }[] = [
  { key: 'showZones', label: 'Zones', color: '#22c55e' },
  { key: 'showCameras', label: 'Cameras', color: '#3b82f6' },
  { key: 'showCameraFOV', label: 'Cones FOV', color: '#60a5fa' },
  { key: 'showPOI', label: 'Points interet', color: '#f59e0b' },
  { key: 'showSignage', label: 'Signaletique', color: '#06b6d4' },
  { key: 'showTransitions', label: 'Transitions', color: '#b38a5a' },
  { key: 'showFloorLabels', label: 'Labels', color: '#94a3b8' },
]

export default function LayerControls() {
  const config = useVol3DStore(s => s.config)
  const toggle = useVol3DStore(s => s.toggleLayer)

  return (
    <div className="p-3">
      <p className="text-xs text-white/40 mb-2 uppercase tracking-wider">Calques</p>
      <div className="space-y-1">
        {LAYERS.map(l => (
          <button key={l.key} onClick={() => toggle(l.key)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-white/5">
            <div className="w-3 h-3 rounded-sm border" style={{ background: config[l.key] ? l.color : 'transparent', borderColor: l.color + '60' }} />
            <span style={{ color: config[l.key] ? '#e2e8f0' : '#4a5568' }}>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
