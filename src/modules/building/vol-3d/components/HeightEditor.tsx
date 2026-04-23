import { useVol3DStore } from '../store/vol3dStore'
import type { Zone } from '../../shared/proph3t/types'

interface Props { zones: Zone[] }

export default function HeightEditor({ zones }: Props) {
  const zoneHeights = useVol3DStore(s => s.config.zoneHeights)
  const setZoneHeight = useVol3DStore(s => s.setZoneHeight)
  const resetHeights = useVol3DStore(s => s.resetHeights)

  if (zoneHeights.length === 0) return null

  // Show only first 10 zones to keep the panel manageable
  const displayed = zoneHeights.slice(0, 10)

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/40 uppercase tracking-wider">Hauteurs</p>
        <button onClick={resetHeights} className="text-[10px] text-blue-400/60 hover:text-blue-400">Reset</button>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {displayed.map(h => {
          const zone = zones.find(z => z.id === h.zoneId)
          return (
            <div key={h.zoneId} className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 w-20 truncate" title={zone?.label}>{zone?.label ?? h.zoneId}</span>
              <input type="range" min={1} max={12} step={0.5} value={h.heightM}
                onChange={e => setZoneHeight(h.zoneId, parseFloat(e.target.value))}
                className="flex-1 h-1 accent-blue-500" />
              <span className="text-[10px] text-white/60 w-8 text-right">{h.heightM}m</span>
            </div>
          )
        })}
      </div>
      {zoneHeights.length > 10 && <p className="text-[9px] text-white/20 mt-1">+{zoneHeights.length - 10} zones masquees</p>}
    </div>
  )
}
