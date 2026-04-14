// ═══ DXF VIEWER CANVAS — WebGL DXF renderer using dxf-viewer library ═══
// Renders DXF files with full support for INSERT blocks, HATCH fills,
// layers, ACI colors, text, dimensions — like a real CAD viewer.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DxfViewer } from 'dxf-viewer'
import type { LayerInfo } from 'dxf-viewer'
import * as THREE from 'three'

interface DxfViewerCanvasProps {
  /** Blob URL of the DXF file to render */
  dxfUrl: string
  /** Optional class name for the container */
  className?: string
}

export function DxfViewerCanvas({ dxfUrl, className = '' }: DxfViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<DxfViewer | null>(null)
  const [layers, setLayers] = useState<LayerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ phase: '', percent: 0 })
  const [error, setError] = useState<string | null>(null)
  const [layerPanelOpen, setLayerPanelOpen] = useState(false)
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())

  // Initialize viewer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clean up previous viewer
    if (viewerRef.current) {
      viewerRef.current.Destroy()
      viewerRef.current = null
    }

    const viewer = new DxfViewer(container, {
      clearColor: new THREE.Color('#0a0a0f'),
      autoResize: true,
      antialias: true,
      colorCorrection: true,
      blackWhiteInversion: true,
      sceneOptions: {
        arcTessellationAngle: 6,
        minArcTessellationSubdivisions: 8,
      },
    })
    viewerRef.current = viewer

    // Load DXF
    setLoading(true)
    setError(null)

    viewer.Load({
      url: dxfUrl,
      progressCbk: (phase, processedSize, totalSize) => {
        const percent = totalSize > 0 ? Math.round((processedSize / totalSize) * 100) : 0
        setProgress({ phase, percent })
      },
    }).then(() => {
      setLoading(false)
      // Get layers
      const layerList: LayerInfo[] = []
      for (const layer of viewer.GetLayers()) {
        layerList.push(layer)
      }
      setLayers(layerList)

      // Fit view to content
      const bounds = viewer.GetBounds()
      if (bounds) {
        viewer.FitView(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, 20)
      }
    }).catch((err: Error) => {
      setLoading(false)
      setError(err.message || 'Erreur de chargement DXF')
      console.error('[DxfViewer] Load error:', err)
    })

    return () => {
      viewer.Destroy()
      viewerRef.current = null
    }
  }, [dxfUrl])

  // Toggle layer visibility
  const toggleLayer = useCallback((name: string) => {
    const viewer = viewerRef.current
    if (!viewer) return
    setHiddenLayers(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        viewer.ShowLayer(name, true)
      } else {
        next.add(name)
        viewer.ShowLayer(name, false)
      }
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

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gray-950 ${className}`}>
      {/* WebGL container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
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
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Calques DXF</span>
                <div className="flex gap-1">
                  <button onClick={showAll} className="text-[9px] text-blue-400 hover:text-blue-300 px-1">Tout</button>
                  <button onClick={hideAll} className="text-[9px] text-gray-500 hover:text-gray-300 px-1">Rien</button>
                </div>
              </div>
              {layers.map(l => (
                <button
                  key={l.name}
                  onClick={() => toggleLayer(l.name)}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-left text-[10px] transition-colors hover:bg-gray-800 ${
                    hiddenLayers.has(l.name) ? 'text-gray-600' : 'text-gray-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: hiddenLayers.has(l.name) ? 'transparent' : `#${l.color.toString(16).padStart(6, '0')}`,
                      border: `1px solid ${hiddenLayers.has(l.name) ? '#4b5563' : `#${l.color.toString(16).padStart(6, '0')}`}`,
                    }}
                  />
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
