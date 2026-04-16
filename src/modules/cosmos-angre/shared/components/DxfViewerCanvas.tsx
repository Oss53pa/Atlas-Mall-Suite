// ═══ DXF VIEWER CANVAS — WebGL DXF renderer using dxf-viewer library ═══
// 2D mode: uses dxf-viewer (Three.js 0.161) for full CAD rendering
// 3D modes: captures the 2D render as texture, projects on a separate Three.js scene

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DxfViewer } from 'dxf-viewer'
import type { LayerInfo } from 'dxf-viewer'
import { Plan3DView } from './Plan3DView'

interface WallSeg { x1: number; y1: number; x2: number; y2: number; layer: string; floorId?: string }
interface Space3D { id: string; label: string; type: string; bounds: { minX: number; minY: number; width: number; height: number }; areaSqm: number; color: string | null; floorId?: string }
interface DetectedFloor3D {
  id: string
  label: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  entityCount: number
  stackOrder: number
}
interface Dim3DProp {
  id: string
  p1: [number, number]
  p2: [number, number]
  textPos: [number, number]
  valueM: number
  text: string
  floorId?: string
}
interface Camera3DProp { id: string; floorId: string; label: string; x: number; y: number; angle: number; fov: number; rangeM: number; color: string; priority?: 'normale' | 'haute' | 'critique' }
interface Door3DProp { id: string; floorId: string; label: string; x: number; y: number; isExit?: boolean; hasBadge?: boolean }
interface BlindSpot3DProp { id: string; floorId: string; x: number; y: number; w: number; h: number; severity?: 'normal' | 'elevee' | 'critique' }
interface POI3DProp { id: string; floorId: string; label: string; x: number; y: number; icon?: string; color: string }
interface Signage3DProp { id: string; floorId: string; ref: string; x: number; y: number; type: 'directionnel' | 'identifiant' | 'info' | 'reglementaire'; content?: string }
interface Moment3DProp { id: string; floorId: string; number: number; name: string; x: number; y: number }
interface JourneyPath3DProp { id: string; floorId: string; points: Array<{ x: number; y: number }>; color?: string }

interface DxfViewerCanvasProps {
  dxfUrl: string
  planImageUrl?: string
  viewMode?: '2d' | '3d' | '3d-advanced'
  wallSegments?: WallSeg[]
  spaces?: Space3D[]
  planBounds?: { width: number; height: number }
  detectedFloors?: DetectedFloor3D[]
  dimensions?: Dim3DProp[]
  cameras?: Camera3DProp[]
  doors?: Door3DProp[]
  blindSpots?: BlindSpot3DProp[]
  pois?: POI3DProp[]
  signage?: Signage3DProp[]
  moments?: Moment3DProp[]
  journeys?: JourneyPath3DProp[]
  placeMode?: 'camera' | 'door' | 'poi' | 'signage' | 'moment' | null
  onPlace?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', x: number, y: number, floorId?: string) => void
  onEntityUpdate?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', id: string, updates: Record<string, unknown>) => void
  onEntityDelete?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', id: string) => void
  compliance?: {
    scorePct: number
    issues: Array<{ severity: 'info' | 'warning' | 'critical'; title: string }>
    summary: { info: number; warning: number; critical: number }
    floorStats?: Array<{ floorId: string; coveragePct: number; camerasCount: number; exitsCount: number }>
  }
  className?: string
}

export function DxfViewerCanvas({ dxfUrl, planImageUrl, viewMode = '2d', wallSegments = [], spaces = [], planBounds, detectedFloors, dimensions, cameras, doors, blindSpots, pois, signage, moments, journeys, placeMode, onPlace, onEntityUpdate, onEntityDelete, compliance, className = '' }: DxfViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<DxfViewer | null>(null)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ phase: '', percent: 0 })
  const [error, setError] = useState<string | null>(null)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())
  const [excludedLayers, setExcludedLayers] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cosmos-excluded-layers') ?? '[]')) }
    catch { return new Set() }
  })
  // Persiste les exclusions par DXF (clé stable par dxfUrl)
  useEffect(() => {
    localStorage.setItem('cosmos-excluded-layers', JSON.stringify(Array.from(excludedLayers)))
  }, [excludedLayers])

  // Initialize 2D viewer
  useEffect(() => {
    const container = containerRef.current
    if (!container || !dxfUrl) return

    if (viewerRef.current) {
      try { viewerRef.current.Destroy() } catch { /* ignore */ }
      viewerRef.current = null
    }

    let viewer: DxfViewer | null = null
    let cancelled = false

    const init = async () => {
      try {
        // dxf-viewer uses its own Three.js 0.161 internally
        const THREE_DXF = await import('three')
        viewer = new DxfViewer(container, {
          clearColor: new THREE_DXF.Color('#0a0a0f'),
          autoResize: true,
          antialias: true,
          colorCorrection: true,
          blackWhiteInversion: true,
          preserveDrawingBuffer: true,
          sceneOptions: {
            arcTessellationAngle: 6,
            minArcTessellationSubdivisions: 8,
          },
        })
        viewerRef.current = viewer
        setLoading(true)
        setError(null)

        await viewer.Load({
          url: dxfUrl,
          progressCbk: (phase, processedSize, totalSize) => {
            if (cancelled) return
            const percent = totalSize > 0 ? Math.round((processedSize / totalSize) * 100) : 0
            setProgress({ phase, percent })
          },
        })

        if (cancelled) return
        setLoading(false)

        const layerList: LayerInfo[] = []
        for (const layer of viewer.GetLayers()) layerList.push(layer)
        setLayers(layerList)
        // Applique les exclusions persistées
        for (const name of excludedLayers) {
          try { viewer.ShowLayer(name, false) } catch { /* layer absent */ }
        }
        if (excludedLayers.size > 0) viewer.Render()

        const bounds = viewer.GetBounds()
        if (bounds) viewer.FitView(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, 20)
      } catch (err) {
        if (cancelled) return
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
        console.error('[DxfViewer] Error:', err)
      }
    }

    init()
    return () => {
      cancelled = true
      if (viewer) { try { viewer.Destroy() } catch { /* */ } }
      viewerRef.current = null
    }
  }, [dxfUrl])

  // 3D mode is now handled by the separate Plan3DView component (rendered below)

  // Layer controls
  const toggleLayer = useCallback((name: string) => {
    const viewer = viewerRef.current
    if (!viewer) return
    setHiddenLayers(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name); viewer.ShowLayer(name, true) }
      else { next.add(name); viewer.ShowLayer(name, false) }
      viewer.Render()
      return next
    })
  }, [])

  const showAll = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    for (const l of layers) viewer.ShowLayer(l.name, true)
    viewer.Render()
    setHiddenLayers(new Set())
  }, [layers])

  const hideAll = useCallback(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    for (const l of layers) viewer.ShowLayer(l.name, false)
    viewer.Render()
    setHiddenLayers(new Set(layers.map(l => l.name)))
  }, [layers])

  /** Exclusion permanente d'un calque (persiste en localStorage). */
  const excludeLayer = useCallback((name: string) => {
    const viewer = viewerRef.current
    if (!viewer) return
    setExcludedLayers(prev => {
      const next = new Set(prev)
      next.add(name)
      return next
    })
    setHiddenLayers(prev => {
      const next = new Set(prev)
      next.add(name)
      return next
    })
    try { viewer.ShowLayer(name, false) } catch { /* */ }
    viewer.Render()
  }, [])

  const restoreLayer = useCallback((name: string) => {
    const viewer = viewerRef.current
    if (!viewer) return
    setExcludedLayers(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    setHiddenLayers(prev => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    try { viewer.ShowLayer(name, true) } catch { /* */ }
    viewer.Render()
  }, [])

  const is3D = viewMode !== '2d'

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-950 ${className}`}>
      {/* 2D DXF viewer — always mounted (hidden in 3D mode) */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ zIndex: 1, display: is3D ? 'none' : 'block' }} />

      {/* 3D view — fully volumetric, using parsed wall/space data */}
      {is3D && planBounds && (
        <div className="absolute inset-0" style={{ zIndex: 2 }}>
          <Plan3DView
            wallSegments={wallSegments}
            spaces={spaces}
            planBounds={planBounds}
            mode={viewMode as '3d' | '3d-advanced'}
            detectedFloors={detectedFloors}
            dimensions={dimensions}
            cameras={cameras}
            doors={doors}
            blindSpots={blindSpots}
            pois={pois}
            signage={signage}
            moments={moments}
            journeys={journeys}
            placeMode={placeMode}
            onPlace={onPlace}
            onEntityUpdate={onEntityUpdate}
            onEntityDelete={onEntityDelete}
            compliance={compliance}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300">Chargement du plan DXF...</p>
            <p className="text-xs text-gray-500 mt-1">
              {progress.phase === 'fetch' && `Lecture: ${progress.percent}%`}
              {progress.phase === 'parse' && `Analyse: ${progress.percent}%`}
              {progress.phase === 'prepare' && `Preparation: ${progress.percent}%`}
              {progress.phase === 'font' && `Polices: ${progress.percent}%`}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-10">
          <div className="text-center max-w-md">
            <p className="text-red-400 text-sm mb-2">Erreur de rendu DXF</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      )}

      {/* Layer panel */}
      {!loading && layers.length > 0 && (
        <div className="absolute bottom-3 left-3 z-20">
          <button
            onClick={() => setLayerPanelOpen(!layerPanelOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/90 border border-white/[0.08] hover:bg-gray-700/90 text-[10px] text-gray-300"
          >
            Calques ({layers.length - hiddenLayers.size}/{layers.length})
          </button>
          {layerPanelOpen && (
            <div className="absolute bottom-10 left-0 w-60 max-h-80 overflow-y-auto rounded-lg bg-gray-900 border border-white/[0.08] shadow-xl">
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-gray-500">Calques DXF</span>
                <div className="flex gap-1">
                  <button onClick={showAll} className="text-[9px] text-blue-400 px-1">Tout</button>
                  <button onClick={hideAll} className="text-[9px] text-gray-500 px-1">Rien</button>
                </div>
              </div>
              {layers.map(l => {
                const excluded = excludedLayers.has(l.name)
                const hidden = hiddenLayers.has(l.name)
                return (
                  <div key={l.name}
                    className={`flex items-center gap-2 px-3 py-1 hover:bg-gray-800 ${excluded ? 'bg-red-950/30' : ''}`}>
                    <button onClick={() => toggleLayer(l.name)}
                      disabled={excluded}
                      className={`flex items-center gap-2 flex-1 text-left text-[10px] ${excluded ? 'text-red-500/60 line-through' : hidden ? 'text-gray-600' : 'text-gray-200'}`}>
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: hidden || excluded ? 'transparent' : `#${l.color.toString(16).padStart(6, '0')}`,
                          border: `1px solid ${hidden || excluded ? '#4b5563' : `#${l.color.toString(16).padStart(6, '0')}`}` }} />
                      <span className="truncate">{l.displayName || l.name}</span>
                    </button>
                    {excluded ? (
                      <button onClick={() => restoreLayer(l.name)}
                        className="text-[9px] text-emerald-400 hover:text-emerald-300 px-1"
                        title="Restaurer ce calque">↺</button>
                    ) : (
                      <button onClick={() => excludeLayer(l.name)}
                        className="text-[10px] text-gray-600 hover:text-red-400 px-1"
                        title="Supprimer définitivement (persistant)">🗑</button>
                    )}
                  </div>
                )
              })}
              {excludedLayers.size > 0 && (
                <div className="px-3 py-1.5 border-t border-white/[0.06] text-[9px] text-red-400/70">
                  {excludedLayers.size} calque(s) exclu(s) — persistance locale
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
