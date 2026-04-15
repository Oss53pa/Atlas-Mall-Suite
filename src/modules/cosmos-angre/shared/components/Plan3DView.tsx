// ═══ PLAN 3D VIEW — Standalone Three.js 3D renderer for architectural plans ═══
// Takes parsed plan data (wall segments, spaces, bounds) and renders
// a fully volumetric 3D scene with walls, floor slabs, and zones.

import React, { useEffect, useRef, useState } from 'react'

interface WallSeg { x1: number; y1: number; x2: number; y2: number; layer: string }
interface Space3D {
  id: string
  label: string
  type: string
  bounds: { minX: number; minY: number; width: number; height: number; maxX?: number; maxY?: number; centerX?: number; centerY?: number }
  areaSqm: number
  color: string | null
}

interface Plan3DViewProps {
  wallSegments: WallSeg[]
  spaces: Space3D[]
  planBounds: { width: number; height: number }
  mode: '3d' | '3d-advanced'  // '3d' = perspective, '3d-advanced' = isometric
  className?: string
}

const ZONE_COLORS: Record<string, string> = {
  commerce: '#3b82f6',
  restauration: '#f59e0b',
  parking: '#64748b',
  technique: '#ef4444',
  services: '#14b8a6',
  circulation: '#94a3b8',
  loisirs: '#06b6d4',
  backoffice: '#8b5cf6',
  sortie_secours: '#22c55e',
  hotel: '#a855f7',
  financier: '#dc2626',
  exterieur: '#84cc16',
}

export function Plan3DView({ wallSegments, spaces, planBounds, mode, className = '' }: Plan3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Initialisation...')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    const cleanupFns: Array<() => void> = []

    const init = async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

        if (disposed) return

        // ── Size ──
        const w = container.clientWidth || 800
        const h = container.clientHeight || 600

        // ── Plan dimensions ──
        const pw = planBounds.width || 100
        const ph = planBounds.height || 100
        const cx = pw / 2
        const cy = ph / 2
        const diag = Math.sqrt(pw * pw + ph * ph)
        const wallHeight = diag * 0.015 // Wall height ~1.5% of diagonal
        const wallThick = Math.max(pw, ph) * 0.003

        setStatus(`Rendu 3D: ${pw.toFixed(0)}×${ph.toFixed(0)}m, ${wallSegments.length} murs, ${spaces.length} zones`)

        // ── Renderer ──
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(w, h)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setClearColor(0x0a0a14, 1)
        container.appendChild(renderer.domElement)
        cleanupFns.push(() => {
          if (renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement)
          }
          renderer.dispose()
        })

        // ── Scene ──
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0a0a14)

        // ── Camera ──
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, diag * 10)
        if (mode === '3d-advanced') {
          // Isometric angle
          const d = diag * 0.7
          camera.position.set(cx + d, cy - d, d * 0.9)
        } else {
          // Perspective tilted
          camera.position.set(cx, cy - ph * 0.8, diag * 0.5)
        }
        camera.up.set(0, 0, 1) // Z-up (architectural convention)
        camera.lookAt(cx, cy, 0)

        // ── Lighting ──
        const ambient = new THREE.AmbientLight(0xffffff, 0.7)
        scene.add(ambient)

        const dir1 = new THREE.DirectionalLight(0xffffff, 0.8)
        dir1.position.set(pw, -ph, diag * 0.8)
        scene.add(dir1)

        const dir2 = new THREE.DirectionalLight(0xaabbcc, 0.4)
        dir2.position.set(-pw * 0.5, ph * 0.8, diag * 0.5)
        scene.add(dir2)

        const hemi = new THREE.HemisphereLight(0xe0e8ff, 0x202030, 0.3)
        scene.add(hemi)

        // ── Ground plane ──
        const groundGeo = new THREE.PlaneGeometry(pw * 1.2, ph * 1.2)
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x1a1f2e })
        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.position.set(cx, cy, -0.2)
        scene.add(ground)

        // ── Plan base (slab showing the plan outline) ──
        const slabGeo = new THREE.BoxGeometry(pw, ph, 0.1)
        const slabMat = new THREE.MeshLambertMaterial({ color: 0x2a3044 })
        const slab = new THREE.Mesh(slabGeo, slabMat)
        slab.position.set(cx, cy, -0.05)
        scene.add(slab)

        // ── Grid helper ──
        const gridSize = Math.max(pw, ph) * 1.4
        const divisions = 40
        const grid = new THREE.GridHelper(gridSize, divisions, 0x333344, 0x1a1a28)
        grid.rotation.x = Math.PI / 2
        grid.position.set(cx, cy, -0.15)
        scene.add(grid)

        // ── Zone floor slabs (colored by type) ──
        let slabCount = 0
        for (const sp of spaces) {
          const sw = sp.bounds.width
          const sh = sp.bounds.height
          if (!sw || !sh || sw < 0.5 || sh < 0.5) continue

          const colorHex = sp.color || ZONE_COLORS[sp.type] || '#3b82f6'
          const color = new THREE.Color(colorHex)

          const zoneGeo = new THREE.BoxGeometry(sw, sh, 0.15)
          const zoneMat = new THREE.MeshLambertMaterial({
            color,
            transparent: true,
            opacity: 0.7,
          })
          const zone = new THREE.Mesh(zoneGeo, zoneMat)
          zone.position.set(
            sp.bounds.minX + sw / 2,
            sp.bounds.minY + sh / 2,
            0.08,
          )
          scene.add(zone)
          slabCount++
        }

        // ── Walls ──
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xc0c8d8 })
        const wallMatAlt = new THREE.MeshLambertMaterial({ color: 0x9aa4bb })

        let wallCount = 0
        for (const seg of wallSegments) {
          const dx = seg.x2 - seg.x1
          const dy = seg.y2 - seg.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len < 0.1) continue

          const wallGeo = new THREE.BoxGeometry(len, wallThick, wallHeight)
          const mat = wallCount % 2 === 0 ? wallMat : wallMatAlt
          const wall = new THREE.Mesh(wallGeo, mat)
          wall.position.set(
            (seg.x1 + seg.x2) / 2,
            (seg.y1 + seg.y2) / 2,
            wallHeight / 2,
          )
          wall.rotation.z = Math.atan2(dy, dx)
          scene.add(wall)
          wallCount++
        }

        // ── If no walls, add boundary walls so user sees SOMETHING volumetric ──
        if (wallCount === 0) {
          const boundaryMat = new THREE.MeshLambertMaterial({ color: 0x6080a0, transparent: true, opacity: 0.6 })
          const boundaryWalls = [
            { x1: 0, y1: 0, x2: pw, y2: 0 },
            { x1: pw, y1: 0, x2: pw, y2: ph },
            { x1: pw, y1: ph, x2: 0, y2: ph },
            { x1: 0, y1: ph, x2: 0, y2: 0 },
          ]
          for (const seg of boundaryWalls) {
            const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1
            const len = Math.sqrt(dx * dx + dy * dy)
            const geo = new THREE.BoxGeometry(len, wallThick * 2, wallHeight)
            const m = new THREE.Mesh(geo, boundaryMat)
            m.position.set((seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, wallHeight / 2)
            m.rotation.z = Math.atan2(dy, dx)
            scene.add(m)
          }
          wallCount = 4
        }

        console.log(`[Plan3D] Built scene: ${slabCount} zones, ${wallCount} walls, ${pw.toFixed(0)}×${ph.toFixed(0)}m, wallH=${wallHeight.toFixed(1)}m`)
        setStatus(`3D: ${wallCount} murs, ${slabCount} zones`)

        // ── OrbitControls ──
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(cx, cy, 0)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.maxPolarAngle = Math.PI / 2.05
        controls.minDistance = diag * 0.02
        controls.maxDistance = diag * 5
        controls.screenSpacePanning = false
        controls.update()
        cleanupFns.push(() => controls.dispose())

        // ── Animate ──
        let rafId = 0
        const animate = () => {
          if (disposed) return
          rafId = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()
        cleanupFns.push(() => cancelAnimationFrame(rafId))

        // ── Resize ──
        const onResize = () => {
          if (!container || disposed) return
          const nw = container.clientWidth
          const nh = container.clientHeight
          if (nw === 0 || nh === 0) return
          camera.aspect = nw / nh
          camera.updateProjectionMatrix()
          renderer.setSize(nw, nh)
        }
        window.addEventListener('resize', onResize)
        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)
        cleanupFns.push(() => {
          window.removeEventListener('resize', onResize)
          resizeObserver.disconnect()
        })

        // ── Cleanup scene geometry/materials ──
        cleanupFns.push(() => {
          scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (mesh.geometry) mesh.geometry.dispose()
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
              for (const m of mats) m.dispose()
            }
          })
        })
      } catch (err) {
        console.error('[Plan3D] Error:', err)
        setStatus(`Erreur: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    init()

    return () => {
      disposed = true
      for (let i = cleanupFns.length - 1; i >= 0; i--) {
        try { cleanupFns[i]() } catch { /* ignore */ }
      }
    }
  }, [wallSegments, spaces, planBounds, mode])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: '#0a0a14' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-400 pointer-events-none">
        {mode === '3d' ? 'Perspective 3D' : 'Vue Isométrique'} — {status}
      </div>

      {/* Navigation hint */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-500 pointer-events-none">
        Glisser: rotation · Molette: zoom · Clic droit: pan
      </div>
    </div>
  )
}
