import React from 'react'
import type { View3DConfig, View3DData, LightingPreset, ViewAnglePreset, UsageContext } from './types/view3dTypes'

interface Props {
  config: View3DConfig
  data: View3DData
  onToggleLayer: (key: keyof View3DConfig) => void
  onSetFloorVisible: (floorId: string, v: boolean) => void
  onSetFloorOpacity: (floorId: string, v: number) => void
  onSetZoneHeight: (zoneId: string, h: number) => void
  onSetLighting: (l: LightingPreset) => void
  onSetViewAngle: (v: ViewAnglePreset) => void
  onSetContext: (c: UsageContext) => void
}

const LIGHTINGS: { id: LightingPreset; label: string }[] = [
  { id: 'day_natural', label: 'Jour naturel' },
  { id: 'day_overcast', label: 'Jour couvert' },
  { id: 'evening_commercial', label: 'Soir commercial' },
  { id: 'night_security', label: 'Nuit sécurité' },
  { id: 'presentation', label: 'Présentation' },
]

interface LayerToggle { key: keyof View3DConfig; label: string; vol?: 'vol1' | 'vol2' | 'vol3' }

const LAYERS: LayerToggle[] = [
  { key: 'showZones', label: 'Zones' },
  { key: 'showFloorLabels', label: 'Labels' },
  { key: 'showTransitions', label: 'Transitions' },
  { key: 'showDimensions', label: 'Cotes' },
  { key: 'showOccupancyColors', label: 'Couleurs occupancy', vol: 'vol1' },
  { key: 'showTenantNames', label: 'Noms enseignes', vol: 'vol1' },
  { key: 'showVacantHighlight', label: 'Cellules vacantes', vol: 'vol1' },
  { key: 'showCameras', label: 'Caméras', vol: 'vol2' },
  { key: 'showCameraFOV', label: 'Cônes FOV', vol: 'vol2' },
  { key: 'showBlindSpots', label: 'Angles morts', vol: 'vol2' },
  { key: 'showDoors', label: 'Portes', vol: 'vol2' },
  { key: 'showPOI', label: 'POI', vol: 'vol3' },
  { key: 'showSignage', label: 'Signalétique', vol: 'vol3' },
  { key: 'showMoments', label: '7 moments clés', vol: 'vol3' },
  { key: 'showWayfinding', label: 'Wayfinding', vol: 'vol3' },
]

export default function View3DSidebar({
  config, data, onToggleLayer, onSetFloorVisible, onSetFloorOpacity, onSetLighting,
}: Props) {
  const visibleLayers = LAYERS.filter(l => !l.vol || l.vol === data.sourceVolume)

  return (
    <aside className="w-56 flex-shrink-0 border-r border-white/10 bg-[#0b1120] overflow-y-auto text-xs">
      {/* Lighting */}
      <div className="p-3 border-b border-white/5">
        <h4 className="text-white/50 uppercase tracking-wider text-[10px] mb-2">Éclairage</h4>
        <div className="space-y-1">
          {LIGHTINGS.map(l => (
            <button key={l.id} onClick={() => onSetLighting(l.id)}
              className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                config.lighting === l.id
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layers */}
      <div className="p-3 border-b border-white/5">
        <h4 className="text-white/50 uppercase tracking-wider text-[10px] mb-2">Calques</h4>
        <div className="space-y-1">
          {visibleLayers.map(l => (
            <label key={l.key} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-white/5 rounded px-1">
              <input
                type="checkbox"
                checked={config[l.key] as boolean}
                onChange={() => onToggleLayer(l.key)}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 w-3.5 h-3.5"
              />
              <span className="text-white/60">{l.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Floor stack */}
      <div className="p-3 border-b border-white/5">
        <h4 className="text-white/50 uppercase tracking-wider text-[10px] mb-2">Étages</h4>
        <div className="space-y-2">
          {config.floorStack.map(fs => (
            <div key={fs.floorId} className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fs.visible}
                  onChange={() => onSetFloorVisible(fs.floorId, !fs.visible)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500 w-3.5 h-3.5"
                />
                <span className="text-white/60">{fs.level}</span>
                <span className="text-white/20 ml-auto">{fs.baseElevationM.toFixed(1)}m</span>
              </label>
              {fs.visible && (
                <input
                  type="range" min={10} max={100}
                  value={Math.round(fs.opacity * 100)}
                  onChange={e => onSetFloorOpacity(fs.floorId, Number(e.target.value) / 100)}
                  className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 text-white/20">
        {data.zones.length} zones · {config.floorStack.filter(f => f.visible).length}/{config.floorStack.length} étages
        {data.cameras && <span> · {data.cameras.length} cam</span>}
        {data.pois && <span> · {data.pois.length} POI</span>}
      </div>
    </aside>
  )
}
