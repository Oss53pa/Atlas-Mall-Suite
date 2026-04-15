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

interface DxfViewerCanvasProps {
  dxfUrl: string
  planImageUrl?: string
  viewMode?: '2d' | '3d' | '3d-advanced'
  wallSegments?: WallSeg[]
  spaces?: Space3D[]
  planBounds?: { width: number; height: number }
  detectedFloors?: DetectedFloor3D[]
  className?: string
}

export function DxfViewerCanvas({ dxfUrl, planImageUrl, viewMode = '2d', wallSegments = [], spaces = [], planBounds, detectedFloors, className = '' }: DxfViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<DxfViewer | null>(null)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ phase: '', percent: 0 })
  const [error, setError] = useState<string | null>(null)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())

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
              {layers.map(l => (
                <button key={l.name} onClick={() => toggleLayer(l.name)}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-left text-[10px] hover:bg-gray-800 ${hiddenLayers.has(l.name) ? 'text-gray-600' : 'text-gray-200'}`}>
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: hiddenLayers.has(l.name) ? 'transparent' : `#${l.color.toString(16).padStart(6, '0')}`,
                      border: `1px solid ${hiddenLayers.has(l.name) ? '#4b5563' : `#${l.color.toString(16).padStart(6, '0')}`}` }} />
                  <span className="truncate">{l.displayName || l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
