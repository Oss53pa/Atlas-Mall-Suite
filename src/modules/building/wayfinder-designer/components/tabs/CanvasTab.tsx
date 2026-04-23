// ═══ Onglet 4 — Canvas ═══
// Preview temps réel du template sélectionné avec plan Vol.3 injecté.
// Calques + éditeur de contenu inline (CDC §03).
//
// Performance cible : preview < 200ms après changement de charte (CDC §10).

import { useMemo, useState } from 'react'
import { MonitorPlay, ZoomIn, ZoomOut, Layers, Sun, Moon } from 'lucide-react'
import { useDesignerStore } from '../../store/designerStore'
import { getTemplate } from '../../templates/registry'
import { usePlanEngineStore } from '../../../shared/stores/planEngineStore'
import type { InjectedFloor, InjectedPlanData, InjectedPoi } from '../../types'

export function CanvasTab() {
  const { config, patchConfig } = useDesignerStore()
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const [zoom, setZoom] = useState(0.5)
  const [layersOpen, setLayersOpen] = useState(false)

  const template = getTemplate(config.templateId)

  // Construction des données plan injectées depuis Vol.3
  const planData: InjectedPlanData = useMemo(() => buildPlanData(parsedPlan, config), [parsedPlan, config])

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Template introuvable. Sélectionnez un template dans l'onglet 3.
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <aside className="w-12 bg-surface-1 border-r border-white/10 flex flex-col items-center py-3 gap-1.5">
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Zoom +"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Zoom -"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => setZoom(0.5)}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 text-[9px]"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <div className="w-6 h-px bg-white/10 my-1" />
        <button
          onClick={() => setLayersOpen(v => !v)}
          className={`p-1.5 rounded ${layersOpen ? 'bg-atlas-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          title="Calques"
        >
          <Layers size={14} />
        </button>
        <button
          onClick={() => patchConfig({ previewMode: config.previewMode === 'dark' ? 'light' : 'dark' })}
          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          title="Mode clair/sombre"
        >
          {config.previewMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </aside>

      {/* Canvas central */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-surface-0 via-surface-1 to-surface-0 p-8 relative">
        <div
          className="mx-auto bg-white shadow-2xl rounded overflow-hidden"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            width: template.metadata.dimensions.unit === 'mm'
              ? `${template.metadata.dimensions.width * 4}px`   // mm × 4 ≈ scale visuel
              : `${template.metadata.dimensions.width}px`,
          }}
        >
          {template.render({
            config,
            metadata: template.metadata,
            planData,
            renderMode: 'live',
          })}
        </div>

        {/* Note dimension */}
        <div className="absolute bottom-3 right-3 bg-surface-1/80 backdrop-blur px-3 py-1.5 rounded text-[10px] text-slate-400 border border-white/5">
          {template.metadata.label} ·{' '}
          {template.metadata.dimensions.width}×{template.metadata.dimensions.height}
          {' '}{template.metadata.dimensions.unit}
        </div>
      </main>

      {/* Sidebar calques */}
      {layersOpen && (
        <aside className="w-72 bg-surface-1 border-l border-white/10 overflow-y-auto p-4">
          <h3 className="text-[12px] font-bold text-white mb-3 flex items-center gap-2">
            <Layers size={13} /> Calques plan
          </h3>
          <LayerToggle
            label="Murs"
            value={config.map.showWalls}
            onChange={v => patchConfig({ map: { ...config.map, showWalls: v } })}
          />
          <LayerToggle
            label="Espaces (couleurs)"
            value={config.map.showSpaces}
            onChange={v => patchConfig({ map: { ...config.map, showSpaces: v } })}
          />
          <LayerToggle
            label="Chemins"
            value={config.map.showPaths}
            onChange={v => patchConfig({ map: { ...config.map, showPaths: v } })}
          />
          <LayerToggle
            label="Points d'intérêt (POI)"
            value={config.map.showPOIs}
            onChange={v => patchConfig({ map: { ...config.map, showPOIs: v } })}
          />
          <LayerToggle
            label="Signalétique existante"
            value={config.map.showSignage}
            onChange={v => patchConfig({ map: { ...config.map, showSignage: v } })}
          />
          <LayerToggle
            label="Entrées"
            value={config.map.showEntrances}
            onChange={v => patchConfig({ map: { ...config.map, showEntrances: v } })}
          />
          <LayerToggle
            label="Grille"
            value={config.map.showGrid}
            onChange={v => patchConfig({ map: { ...config.map, showGrid: v } })}
          />

          <h3 className="text-[12px] font-bold text-white mt-5 mb-3 flex items-center gap-2">
            <MonitorPlay size={13} /> Chrome
          </h3>
          <LayerToggle
            label="Header (logo + titre)"
            value={config.header.enabled}
            onChange={v => patchConfig({ header: { ...config.header, enabled: v } })}
          />
          <LayerToggle
            label="Footer (échelle, nord, QR)"
            value={config.footer.enabled}
            onChange={v => patchConfig({ footer: { ...config.footer, enabled: v } })}
          />
          <LayerToggle
            label="Légende latérale"
            value={config.legend.enabled}
            onChange={v => patchConfig({ legend: { ...config.legend, enabled: v } })}
          />
          <LayerToggle
            label="Recherche (digital)"
            value={config.search.enabled}
            onChange={v => patchConfig({ search: { ...config.search, enabled: v } })}
          />
        </aside>
      )}
    </div>
  )
}

function LayerToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer group">
      <span className="text-[11px] text-slate-300 group-hover:text-white">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full relative transition-colors ${value ? 'bg-atlas-500' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`} />
      </button>
    </label>
  )
}

// ─── Construction InjectedPlanData depuis parsedPlan Vol.3 ─

function buildPlanData(parsedPlan: any, config: any): InjectedPlanData {
  if (!parsedPlan) {
    return {
      projectName: config.project.siteName,
      floors: [],
      pois: [],
      entrances: [],
      exits: [],
    }
  }

  // Group spaces by floor
  const floorMap = new Map<string, InjectedFloor>()
  for (const s of (parsedPlan.spaces ?? [])) {
    const fid = s.floorId ?? 'default'
    if (!floorMap.has(fid)) {
      floorMap.set(fid, {
        id: fid,
        label: fid,
        order: 0,
        walls: [],
        spaces: [],
        bounds: { width: parsedPlan.bounds?.width ?? 200, height: parsedPlan.bounds?.height ?? 140 },
      })
    }
    floorMap.get(fid)!.spaces.push({
      id: s.id, label: s.label, type: s.type ?? 'autre',
      polygon: s.polygon as [number, number][],
    })
  }

  // Walls
  const allWalls = (parsedPlan.wallSegments ?? []).map((w: any) => ({
    x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
  }))
  for (const f of floorMap.values()) {
    f.walls = allWalls
  }

  if (floorMap.size === 0) {
    floorMap.set('default', {
      id: 'default', label: 'RDC', order: 0,
      walls: allWalls, spaces: [],
      bounds: { width: parsedPlan.bounds?.width ?? 200, height: parsedPlan.bounds?.height ?? 140 },
    })
  }

  // POIs (extraits des spaces commerciaux)
  const pois: InjectedPoi[] = []
  for (const s of (parsedPlan.spaces ?? [])) {
    if (!['local_commerce', 'restauration', 'services', 'loisirs', 'sanitaires', 'point_information']
        .includes(s.type ?? '')) continue
    let cx = 0, cy = 0
    for (const [x, y] of (s.polygon ?? [])) { cx += x; cy += y }
    cx /= Math.max(1, s.polygon?.length ?? 1)
    cy /= Math.max(1, s.polygon?.length ?? 1)
    pois.push({
      id: s.id, label: s.label, type: s.type ?? 'autre',
      x: cx, y: cy, floorId: s.floorId,
    })
  }

  return {
    projectName: config.project.siteName,
    floors: Array.from(floorMap.values()).sort((a, b) => a.order - b.order),
    pois,
    entrances: [], // alimenté par le navGraph Vol.3 — TODO bridge
    exits: [],
  }
}
