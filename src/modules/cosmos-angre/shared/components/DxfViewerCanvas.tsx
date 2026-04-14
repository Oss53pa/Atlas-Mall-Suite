// ═══ DXF VIEWER CANVAS — WebGL DXF renderer using dxf-viewer library ═══
// Renders DXF files with full support for INSERT blocks, HATCH fills,
// layers, ACI colors, text, dimensions — like a real CAD viewer.

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DxfViewer } from 'dxf-viewer'
import type { LayerInfo } from 'dxf-viewer'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface DxfViewerCanvasProps {
  /** Blob URL of the DXF file to render */
  dxfUrl: string
  /** View mode: 2d (top-down), 3d (perspective), 3d-advanced (isometric) */
  viewMode?: '2d' | '3d' | '3d-advanced'
  /** Optional class name for the container */
  className?: string
}

// Apply 3D camera mode to the dxf-viewer's Three.js scene
function applyViewMode(viewer: DxfViewer, mode: string) {
  const renderer = viewer.GetRenderer()
  const scene = viewer.GetScene()
  if (!renderer || !scene) return

  const bounds = viewer.GetBounds()
  if (!bounds) return

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const diagonal = Math.sqrt(width * width + height * height)

  if (mode === '2d') {
    // Default orthographic view — dxf-viewer handles this natively
    viewer.FitView(bounds.minX, bounds.maxX, bounds.minY, bounds.maxY, 20)
    viewer.Render()
    return
  }

  // For 3D modes, we need to swap to a PerspectiveCamera
  const canvas = viewer.GetCanvas()
  const aspect = canvas.width / canvas.height

  const perspCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, diagonal * 10)

  if (mode === '3d') {
    // Perspective view — tilted camera looking down at the plan
    perspCamera.position.set(centerX, centerY - diagonal * 0.3, diagonal * 0.6)
    perspCamera.lookAt(centerX, centerY, 0)
  } else {
    // Isometric view (3d-advanced)
    const iso = diagonal * 0.5
    perspCamera.position.set(centerX + iso, centerY - iso, iso)
    perspCamera.lookAt(centerX, centerY, 0)
  }

  // Add OrbitControls for rotation/pan/zoom
  const controls = new OrbitControls(perspCamera, canvas)
  controls.target.set(centerX, centerY, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.1
  controls.maxPolarAngle = Math.PI / 2.1 // Don't go below ground
  controls.update()

  // Animation loop for orbit controls
  let animating = true
  const animate = () => {
    if (!animating) return
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, perspCamera)
  }
  animate()

  // Store cleanup ref
  ;(viewer as unknown as Record<string, unknown>).__3dCleanup = () => {
    animating = false
    controls.dispose()
  }
}

export function DxfViewerCanvas({ dxfUrl, viewMode = '2d', className = '' }: DxfViewerCanvasProps) {
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
    if (!container || !dxfUrl) return

    // Clean up previous viewer
    if (viewerRef.current) {
      try { viewerRef.current.Destroy() } catch { /* ignore */ }
      viewerRef.current = null
    }

    let viewer: DxfViewer | null = null
    let cancelled = false

    const init = async () => {
      try {
        viewer = new DxfViewer(container, {
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

        // Apply 3D camera if needed
        applyViewMode(viewer, viewMode)
      } catch (err) {
        if (cancelled) return
        setLoading(false)
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || 'Erreur de chargement DXF')
        console.error('[DxfViewer] Error:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (viewer) {
        try { viewer.Destroy() } catch { /* ignore */ }
      }
      viewerRef.current = null
    }
  }, [dxfUrl])

  // React to viewMode changes
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || loading) return
    // Clean up previous 3D controls
    const cleanup = (viewer as unknown as Record<string, unknown>).__3dCleanup as (() => void) | undefined
    if (cleanup) { cleanup(); (viewer as unknown as Record<string, unknown>).__3dCleanup = undefined }
    applyViewMode(viewer, viewMode)
  }, [viewMode, loading])

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
