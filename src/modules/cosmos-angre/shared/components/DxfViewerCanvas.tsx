// ═══ DXF VIEWER CANVAS — WebGL DXF renderer using dxf-viewer library ═══
// 2D mode: uses dxf-viewer (Three.js 0.161) for full CAD rendering
// 3D modes: captures the 2D render as texture, projects on a separate Three.js scene

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DxfViewer } from 'dxf-viewer'
import type { LayerInfo } from 'dxf-viewer'

interface DxfViewerCanvasProps {
  dxfUrl: string
  viewMode?: '2d' | '3d' | '3d-advanced'
  className?: string
}

export function DxfViewerCanvas({ dxfUrl, viewMode = '2d', className = '' }: DxfViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const container3dRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<DxfViewer | null>(null)
  const cleanup3dRef = useRef<(() => void) | null>(null)
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

  // 3D mode — separate Three.js scene with plan texture
  useEffect(() => {
    // Cleanup previous 3D
    if (cleanup3dRef.current) { cleanup3dRef.current(); cleanup3dRef.current = null }

    if (viewMode === '2d' || loading || !viewerRef.current) return

    const viewer = viewerRef.current
    const container3d = container3dRef.current
    if (!container3d) return

    const bounds = viewer.GetBounds()
    if (!bounds) return

    // Force a render of the 2D viewer and capture its canvas
    viewer.Render()
    const canvas2d = viewer.GetCanvas()
    if (!canvas2d) return

    // Dynamic import to use project's Three.js
    import('three').then(async (THREE) => {
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

      const w = container3d.clientWidth || 800
      const h = container3d.clientHeight || 600

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x0a0a0f)
      container3d.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const planW = bounds.maxX - bounds.minX
      const planH = bounds.maxY - bounds.minY
      const diagonal = Math.sqrt(planW * planW + planH * planH)
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2
      const WALL_H = planW * 0.015 // wall height proportional to plan

      // Camera
      const camera = new THREE.PerspectiveCamera(50, w / h, diagonal * 0.001, diagonal * 10)
      if (viewMode === '3d') {
        camera.position.set(centerX, centerY - planH * 0.6, diagonal * 0.4)
      } else {
        const d = diagonal * 0.35
        camera.position.set(centerX + d, centerY - d, d * 0.9)
      }
      camera.lookAt(centerX, centerY, 0)

      // ── Plan as textured ground plane ──
      const texture = new THREE.CanvasTexture(canvas2d)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter

      // Slight elevation for the plan slab
      const SLAB_H = diagonal * 0.002

      // Floor slab (thin box with plan texture on top)
      const slabGeo = new THREE.BoxGeometry(planW, planH, SLAB_H)
      const slabTopMat = new THREE.MeshBasicMaterial({ map: texture })
      const slabSideMat = new THREE.MeshBasicMaterial({ color: 0x2a3a5c })
      const slabBottomMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e })
      const slab = new THREE.Mesh(slabGeo, [
        slabSideMat, slabSideMat,  // +x, -x
        slabSideMat, slabSideMat,  // +y, -y
        slabTopMat, slabBottomMat, // +z (top with texture), -z
      ])
      slab.position.set(centerX, centerY, 0)
      scene.add(slab)

      // Ground grid below the slab
      const gridHelper = new THREE.GridHelper(diagonal * 1.5, 30, 0x1a1a3a, 0x111128)
      gridHelper.rotation.x = Math.PI / 2
      gridHelper.position.set(centerX, centerY, -SLAB_H)
      scene.add(gridHelper)

      // Outer boundary walls (frame around the plan)
      const FRAME_H = diagonal * 0.008
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x4a6fa5, transparent: true, opacity: 0.5 })
      const createFrame = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        const thick = diagonal * 0.003
        const geo = new THREE.BoxGeometry(len, thick, FRAME_H)
        const mesh = new THREE.Mesh(geo, frameMat)
        mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, FRAME_H / 2 + SLAB_H / 2)
        mesh.rotation.z = Math.atan2(dy, dx)
        scene.add(mesh)
      }
      createFrame(bounds.minX, bounds.minY, bounds.maxX, bounds.minY)
      createFrame(bounds.maxX, bounds.minY, bounds.maxX, bounds.maxY)
      createFrame(bounds.maxX, bounds.maxY, bounds.minX, bounds.maxY)
      createFrame(bounds.minX, bounds.maxY, bounds.minX, bounds.minY)

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 1.2))

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(centerX, centerY, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.maxPolarAngle = Math.PI / 2.1
      controls.update()

      let running = true
      const animate = () => {
        if (!running) return
        requestAnimationFrame(animate)
        // Update ground texture from 2D viewer
        texture.needsUpdate = true
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        const nw = container3d.clientWidth || 800
        const nh = container3d.clientHeight || 600
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        renderer.setSize(nw, nh)
      }
      window.addEventListener('resize', onResize)

      cleanup3dRef.current = () => {
        running = false
        controls.dispose()
        renderer.dispose()
        window.removeEventListener('resize', onResize)
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement)
        }
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose()
          if ((obj as THREE.Mesh).material) {
            const m = (obj as THREE.Mesh).material
            if (m instanceof THREE.Material) m.dispose()
          }
        })
      }
    })
  }, [viewMode, loading])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (cleanup3dRef.current) cleanup3dRef.current() }
  }, [])

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
      {/* 2D DXF viewer — always mounted and rendered (behind 3D canvas when in 3D mode) */}
      <div ref={containerRef} className="w-full h-full absolute inset-0" style={{ zIndex: is3D ? 0 : 1 }} />

      {/* 3D canvas — above the 2D canvas */}
      {is3D && <div ref={container3dRef} className="w-full h-full absolute inset-0" style={{ zIndex: 2 }} />}

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
