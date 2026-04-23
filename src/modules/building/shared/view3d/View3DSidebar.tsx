// ═══ VIEW 3D SIDEBAR — Layers, lighting, floor stack + Phase 2 isolation/explosion ═══

import { useState } from 'react'
import type { View3DConfig, View3DData, LightingPreset, UsageContext } from './types/view3dTypes'

interface Props {
  config: View3DConfig
  data: View3DData
  onToggleLayer: (key: keyof View3DConfig) => void
  onSetFloorVisible: (floorId: string, v: boolean) => void
  onSetFloorOpacity: (floorId: string, v: number) => void
  onSetZoneHeight: (zoneId: string, h: number) => void
  onSetLighting: (l: LightingPreset) => void
  onSetViewAngle: (v: View3DConfig['viewAngle']) => void
  onSetContext: (c: UsageContext) => void
  /** Isolate a floor (null = clear isolation). */
  onIsolateFloor: (floorId: string | null) => void
  /** Set explosion level 0–1. */
  onSetExplodeLevel: (v: number) => void
}

const LIGHTINGS: { id: LightingPreset; label: string }[] = [
  { id: 'day_natural',        label: 'Jour naturel' },
  { id: 'day_overcast',       label: 'Jour couvert' },
  { id: 'evening_commercial', label: 'Soir commercial' },
  { id: 'night_security',     label: 'Nuit sécurité' },
  { id: 'presentation',       label: 'Présentation' },
]

interface LayerToggle { key: keyof View3DConfig; label: string; vol?: 'vol1' | 'vol2' | 'vol3' }

const LAYERS: LayerToggle[] = [
  { key: 'showZones',             label: 'Zones' },
  { key: 'showFloorLabels',       label: 'Labels' },
  { key: 'showTransitions',       label: 'Transitions' },
  { key: 'showDimensions',        label: 'Cotes' },
  { key: 'showOccupancyColors',   label: 'Couleurs occupancy',  vol: 'vol1' },
  { key: 'showTenantNames',       label: 'Noms enseignes',      vol: 'vol1' },
  { key: 'showVacantHighlight',   label: 'Cellules vacantes',   vol: 'vol1' },
  { key: 'showCameras',           label: 'Caméras',             vol: 'vol2' },
  { key: 'showCameraFOV',         label: 'Cônes FOV',           vol: 'vol2' },
  { key: 'showBlindSpots',        label: 'Angles morts',        vol: 'vol2' },
  { key: 'showDoors',             label: 'Portes',              vol: 'vol2' },
  { key: 'showPOI',               label: 'POI',                 vol: 'vol3' },
  { key: 'showSignage',           label: 'Signalétique',        vol: 'vol3' },
  { key: 'showMoments',           label: '7 moments clés',      vol: 'vol3' },
  { key: 'showWayfinding',        label: 'Wayfinding',          vol: 'vol3' },
]

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title, children, defaultOpen = true,
}: {
  title: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors"
      >
        <span>{title}</span>
        <span className="text-[9px] opacity-60">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

// ── Main sidebar ───────────────────────────────────────────────────────────

export default function View3DSidebar({
  config, data,
  onToggleLayer, onSetFloorVisible, onSetFloorOpacity,
  onSetLighting, onIsolateFloor, onSetExplodeLevel,
}: Props) {
  const visibleLayers = LAYERS.filter((l) => !l.vol || l.vol === data.sourceVolume)
  const isIsolated = config.isolatedFloorId !== null
  const isExploded = config.explodeLevel > 0

  return (
    <aside className="w-60 flex-shrink-0 border-r border-white/10 bg-[#0b1120] overflow-y-auto text-xs">

      {/* Lighting */}
      <Section title="Éclairage">
        <div className="space-y-0.5">
          {LIGHTINGS.map((l) => (
            <button
              key={l.id}
              onClick={() => onSetLighting(l.id)}
              className={[
                'w-full text-left px-2 py-1.5 rounded transition-colors text-xs',
                config.lighting === l.id
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5',
              ].join(' ')}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Layers */}
      <Section title="Calques">
        <div className="space-y-0.5">
          {visibleLayers.map((l) => (
            <label
              key={l.key}
              className="flex items-center gap-2 cursor-pointer py-1 hover:bg-white/5 rounded px-1"
            >
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
      </Section>

      {/* Floor stack ─ enhanced with isolation + explosion */}
      <Section title="Étages">

        {/* Explosion slider */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-white/40">Dépliage</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition-colors ${
              isExploded ? 'bg-violet-500/20 text-violet-300' : 'text-white/20'
            }`}>
              {isExploded ? `${Math.round(config.explodeLevel * 100)}%` : 'empilé'}
            </span>
          </div>
          <input
            type="range" min={0} max={100}
            value={Math.round(config.explodeLevel * 100)}
            onChange={(e) => onSetExplodeLevel(Number(e.target.value) / 100)}
            className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex gap-1 text-[10px]">
            <button
              onClick={() => onSetExplodeLevel(0)}
              className={`flex-1 py-0.5 rounded border transition-colors ${
                !isExploded
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
                  : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
              }`}
            >
              Empilé
            </button>
            <button
              onClick={() => onSetExplodeLevel(0.5)}
              className={`flex-1 py-0.5 rounded border transition-colors ${
                config.explodeLevel === 0.5
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
                  : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
              }`}
            >
              Mi-déplié
            </button>
            <button
              onClick={() => onSetExplodeLevel(1)}
              className={`flex-1 py-0.5 rounded border transition-colors ${
                config.explodeLevel === 1
                  ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
                  : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'
              }`}
            >
              Éclaté
            </button>
          </div>
        </div>

        {/* Isolation clear button */}
        {isIsolated && (
          <button
            onClick={() => onIsolateFloor(null)}
            className="w-full mb-2 py-1 text-[11px] rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            ✕ Annuler l'isolation
          </button>
        )}

        {/* Per-floor rows */}
        <div className="space-y-2">
          {config.floorStack.map((fs) => {
            const isThisIsolated = config.isolatedFloorId === fs.floorId
            const isFaded = isIsolated && !isThisIsolated
            return (
              <div
                key={fs.floorId}
                className={`rounded-lg border p-2 space-y-1.5 transition-all ${
                  isThisIsolated
                    ? 'border-amber-500/40 bg-amber-500/8'
                    : isFaded
                      ? 'border-white/5 opacity-40'
                      : 'border-white/8'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={fs.visible}
                    onChange={() => onSetFloorVisible(fs.floorId, !fs.visible)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className={`flex-1 font-medium ${isThisIsolated ? 'text-amber-300' : 'text-white/70'}`}>
                    {fs.level}
                  </span>
                  <span className="text-white/20 text-[10px]">{fs.baseElevationM.toFixed(1)}m</span>
                  {/* Isolation (solo) button */}
                  <button
                    title={isThisIsolated ? 'Annuler isolation' : 'Isoler cet étage'}
                    onClick={() => onIsolateFloor(isThisIsolated ? null : fs.floorId)}
                    className={[
                      'w-5 h-5 rounded text-[9px] transition-all border flex-shrink-0 flex items-center justify-center',
                      isThisIsolated
                        ? 'bg-amber-500/25 border-amber-500/60 text-amber-300'
                        : 'border-white/15 text-white/30 hover:border-white/30 hover:text-white/60',
                    ].join(' ')}
                  >
                    S
                  </button>
                </div>
                {/* Opacity slider */}
                {fs.visible && (
                  <input
                    type="range" min={10} max={100}
                    value={Math.round(fs.opacity * 100)}
                    onChange={(e) => onSetFloorOpacity(fs.floorId, Number(e.target.value) / 100)}
                    className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer accent-blue-500"
                  />
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Stats */}
      <div className="p-3 text-white/20 text-[11px] space-y-0.5">
        <div>{data.zones.length} zones · {config.floorStack.filter((f) => f.visible).length}/{config.floorStack.length} étages visibles</div>
        {data.cameras  && <div>{data.cameras.length} caméras</div>}
        {data.pois     && <div>{data.pois.length} POI</div>}
        {isIsolated    && <div className="text-amber-400/60">Étage isolé : {config.floorStack.find(f => f.floorId === config.isolatedFloorId)?.level}</div>}
        {isExploded    && <div className="text-violet-400/60">Dépliage : {Math.round(config.explodeLevel * 100)}%</div>}
      </div>
    </aside>
  )
}
