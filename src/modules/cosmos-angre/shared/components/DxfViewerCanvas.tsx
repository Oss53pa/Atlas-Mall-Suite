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

    // Capture the 2D canvas as a texture
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

      // Ground plane with captured texture
      const texture = new THREE.CanvasTexture(canvas2d)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      const groundGeo = new THREE.PlaneGeometry(planW, planH)
      const groundMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.position.set(centerX, centerY, 0)
      scene.add(ground)

      // Grid below
      const gridHelper = new THREE.GridHelper(diagonal, 40, 0x222244, 0x111133)
      gridHelper.rotation.x = Math.PI / 2
      gridHelper.position.set(centerX, centerY, -0.1)
      scene.add(gridHelper)

      // Extrude walls from the 2D canvas line data
      // Read pixel data to detect edges would be complex — instead use
      // simple wall outlines from the DXF bounds + subdivisions
      const wallMat = new THREE.MeshBasicMaterial({ color: 0x3b5998, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      const wallMat2 = new THREE.MeshBasicMaterial({ color: 0x5b7ab8, transparent: true, opacity: 0.4, side: THREE.DoubleSide })

      // Create boundary walls
      const createWall = (x1: number, y1: number, x2: number, y2: number, mat: THREE.Material) => {
        const dx = x2 - x1, dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1) return
        const geo = new THREE.BoxGeometry(len, planW * 0.002, WALL_H)
        const wall = new THREE.Mesh(geo, mat)
        wall.position.set((x1 + x2) / 2, (y1 + y2) / 2, WALL_H / 2)
        wall.rotation.z = Math.atan2(dy, dx)
        scene.add(wall)
      }

      // Outer boundary walls
      createWall(bounds.minX, bounds.minY, bounds.maxX, bounds.minY, wallMat)
      createWall(bounds.maxX, bounds.minY, bounds.maxX, bounds.maxY, wallMat)
      createWall(bounds.maxX, bounds.maxY, bounds.minX, bounds.maxY, wallMat)
      createWall(bounds.minX, bounds.maxY, bounds.minX, bounds.minY, wallMat)

      // Internal walls from scene geometry (safe — using our own Three.js)
      // Read the 2D viewer's renderer to get line positions
      const dxfRenderer = viewer.GetRenderer()
      const dxfScene = viewer.GetScene()
      if (dxfRenderer && dxfScene) {
        let wallCount = 0
        dxfScene.traverse((obj: { geometry?: { getAttribute?: (n: string) => { array: Float32Array } | null } }) => {
          if (wallCount > 3000) return
          const geo = obj.geometry
          if (!geo?.getAttribute) return
          const pos = geo.getAttribute('position')
          if (!pos) return
          const arr = pos.array
          for (let i = 0; i < arr.length - 5 && wallCount < 3000; i += 6) {
            const x1 = arr[i], y1 = arr[i + 1]
            const x2 = arr[i + 3], y2 = arr[i + 4]
            const dx = x2 - x1, dy = y2 - y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len < planW * 0.01 || len > planW * 0.5) continue
            createWall(x1, y1, x2, y2, wallCount % 2 === 0 ? wallMat : wallMat2)
            wallCount++
          }
        })
        console.log(`[3D] Extruded ${wallCount} internal walls`)
      }

      // Ambient light
      const ambient = new THREE.AmbientLight(0x606080, 1.5)
      scene.add(ambient)

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
      {/* 2D DXF viewer — always mounted (hidden in 3D mode, used as texture source) */}
      <div ref={containerRef} className="w-full h-full" style={{ display: is3D ? 'none' : 'block' }} />

      {/* 3D canvas — shown in 3D modes */}
      {is3D && <div ref={container3dRef} className="w-full h-full" />}

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
