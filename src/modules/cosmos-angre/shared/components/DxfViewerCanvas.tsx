// ═══ DXF VIEWER CANVAS — WebGL DXF renderer using dxf-viewer library ═══
// 2D mode: uses dxf-viewer (Three.js 0.161) for full CAD rendering
// 3D modes: captures the 2D render as texture, projects on a separate Three.js scene

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { DxfViewer } from 'dxf-viewer'
import type { LayerInfo } from 'dxf-viewer'

interface WallSeg { x1: number; y1: number; x2: number; y2: number; layer: string }
interface Space3D { id: string; label: string; type: string; bounds: { minX: number; minY: number; width: number; height: number }; areaSqm: number; color: string | null }

interface DxfViewerCanvasProps {
  dxfUrl: string
  planImageUrl?: string
  viewMode?: '2d' | '3d' | '3d-advanced'
  /** Wall segments for 3D extrusion (from parsedPlan.wallSegments) */
  wallSegments?: WallSeg[]
  /** Detected spaces for 3D floor slabs (from parsedPlan.spaces) */
  spaces?: Space3D[]
  /** Plan bounds in metres */
  planBounds?: { width: number; height: number }
  className?: string
}

export function DxfViewerCanvas({ dxfUrl, planImageUrl, viewMode = '2d', wallSegments = [], spaces = [], planBounds, className = '' }: DxfViewerCanvasProps) {
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

    if (viewMode === '2d' || loading || !viewerRef.current) {
      console.log('[3D] Skip:', { viewMode, loading, hasViewer: !!viewerRef.current })
      return
    }

    const viewer = viewerRef.current
    const container3d = container3dRef.current
    if (!container3d) {
      console.log('[3D] No container3d ref — retrying in 50ms')
      const t = setTimeout(() => {}, 50) // dummy to prevent warning
      clearTimeout(t)
      return
    }

    const bounds = viewer.GetBounds()
    if (!bounds) {
      console.log('[3D] No bounds from viewer')
      return
    }
    console.log('[3D] Init:', { viewMode, bounds, wallCount: wallSegments.length, spaceCount: spaces.length, planBounds })

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
      const pw2 = planBounds?.width || planW
      const ph2 = planBounds?.height || planH
      const cx = pw2 / 2, cy = ph2 / 2

      // Camera
      const camera = new THREE.PerspectiveCamera(50, w / h, diagonal * 0.001, diagonal * 10)
      if (viewMode === '3d') {
        camera.position.set(cx, cy - ph2 * 0.7, diagonal * 0.45)
      } else {
        const d = diagonal * 0.4
        camera.position.set(cx + d * 0.6, cy - d * 0.6, d * 0.7)
      }
      camera.lookAt(cx, cy, 0)

      const pw = planBounds?.width || planW
      const ph = planBounds?.height || planH
      const WALL_H = Math.max(pw, ph) * 0.02 // Wall height ~2% of plan size
      const WALL_THICK = Math.max(pw, ph) * 0.002 // Wall thickness

      // ── 1. Ground plane (try texture, fallback to solid color) ──
      let groundMat: THREE.Material = new THREE.MeshLambertMaterial({ color: 0x1a2035 })
      const imgUrl = planImageUrl || ''
      if (imgUrl && !imgUrl.startsWith('blob:')) {
        // Only try loading if not a blob URL (blob URLs may be revoked)
        try {
          const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            const loader = new THREE.TextureLoader()
            const timeout = setTimeout(() => reject(new Error('texture timeout')), 3000)
            loader.load(imgUrl,
              (t) => { clearTimeout(timeout); resolve(t) },
              undefined,
              (e) => { clearTimeout(timeout); reject(e) }
            )
          })
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          groundMat = new THREE.MeshLambertMaterial({ map: texture })
          console.log('[3D] Texture loaded successfully')
        } catch (e) {
          console.warn('[3D] Texture failed, using solid color:', e)
        }
      } else if (imgUrl) {
        // Blob URL — try loading via Image element instead (more reliable)
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('image timeout')), 3000)
            img.onload = () => { clearTimeout(timeout); resolve() }
            img.onerror = (e) => { clearTimeout(timeout); reject(e) }
            img.src = imgUrl
          })
          const texture = new THREE.Texture(img)
          texture.needsUpdate = true
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          groundMat = new THREE.MeshLambertMaterial({ map: texture })
          console.log('[3D] Blob texture loaded via Image')
        } catch (e) {
          console.warn('[3D] Blob texture failed, using solid color:', e)
        }
      }

      const groundGeo = new THREE.PlaneGeometry(pw, ph)
      const ground = new THREE.Mesh(groundGeo, groundMat)
      ground.position.set(pw / 2, ph / 2, 0)
      scene.add(ground)

      // Grid below
      const gridHelper = new THREE.GridHelper(diagonal * 1.5, 30, 0x1a1a3a, 0x111128)
      gridHelper.rotation.x = Math.PI / 2
      gridHelper.position.set(pw / 2, ph / 2, -0.1)
      scene.add(gridHelper)

      // ── 2. Extrude wall segments into 3D ──
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x6b8cba })
      const wallMatDark = new THREE.MeshLambertMaterial({ color: 0x4a6fa5 })
      let wallCount = 0
      for (const seg of wallSegments) {
        const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.1) continue

        const geo = new THREE.BoxGeometry(len, WALL_THICK, WALL_H)
        const wall = new THREE.Mesh(geo, wallCount % 2 === 0 ? wallMat : wallMatDark)
        wall.position.set((seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, WALL_H / 2)
        wall.rotation.z = Math.atan2(dy, dx)
        scene.add(wall)
        wallCount++
      }

      // ── 3. Zone floor slabs (slightly elevated, colored by type) ──
      const typeColors: Record<string, number> = {
        commerce: 0x3b82f6, restauration: 0xf59e0b, parking: 0x64748b,
        technique: 0xef4444, services: 0x14b8a6, circulation: 0x94a3b8,
        loisirs: 0x06b6d4, backoffice: 0x8b5cf6, sortie_secours: 0x22c55e,
      }
      for (const sp of spaces) {
        const color = sp.color ? parseInt(sp.color.replace('#', ''), 16) : (typeColors[sp.type] ?? 0x3b82f6)
        const slabGeo = new THREE.BoxGeometry(sp.bounds.width, sp.bounds.height, WALL_H * 0.1)
        const slabMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.4 })
        const slab = new THREE.Mesh(slabGeo, slabMat)
        slab.position.set(
          sp.bounds.minX + sp.bounds.width / 2,
          sp.bounds.minY + sp.bounds.height / 2,
          WALL_H * 0.05,
        )
        scene.add(slab)
      }

      // ── 4. Lighting ──
      scene.add(new THREE.AmbientLight(0x606080, 0.8))
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
      dirLight.position.set(pw * 0.5, -ph * 0.3, diagonal * 0.5)
      scene.add(dirLight)
      const hemiLight = new THREE.HemisphereLight(0x8899bb, 0x1a1a2e, 0.5)
      scene.add(hemiLight)

      console.log(`[3D] Scene built: ${wallCount} walls, ${spaces.length} zones, plan=${pw.toFixed(0)}x${ph.toFixed(0)}m`)

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(cx, cy, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.maxPolarAngle = Math.PI / 2.1
      controls.update()

      let running = true
      const animate = () => {
        if (!running) return
        requestAnimationFrame(animate)
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

      {/* 3D canvas — always mounted, shown only in 3D modes */}
      <div
        ref={container3dRef}
        className="w-full h-full absolute inset-0"
        style={{ zIndex: 2, display: is3D ? 'block' : 'none' }}
      />

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
