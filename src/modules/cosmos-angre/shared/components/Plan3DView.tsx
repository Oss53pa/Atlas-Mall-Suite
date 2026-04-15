// ═══ PLAN 3D VIEW — Standalone Three.js 3D renderer for architectural plans ═══
// Takes parsed plan data (wall segments, spaces, bounds) and renders
// a fully volumetric 3D scene with walls, floor slabs, and zones.

import React, { useEffect, useRef, useState } from 'react'

interface WallSeg { x1: number; y1: number; x2: number; y2: number; layer: string; floorId?: string }
interface Space3D {
  id: string
  label: string
  type: string
  bounds: { minX: number; minY: number; width: number; height: number; maxX?: number; maxY?: number; centerX?: number; centerY?: number }
  areaSqm: number
  color: string | null
  floorId?: string
}
interface DetectedFloor3D {
  id: string
  label: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  entityCount: number
  stackOrder: number
}

interface Dim3D {
  id: string
  p1: [number, number]
  p2: [number, number]
  textPos: [number, number]
  valueM: number
  text: string
  floorId?: string
}

interface Plan3DViewProps {
  wallSegments: WallSeg[]
  spaces: Space3D[]
  planBounds: { width: number; height: number }
  mode: '3d' | '3d-advanced'
  detectedFloors?: DetectedFloor3D[]
  dimensions?: Dim3D[]
  activeFloorId?: string | 'all'
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

export function Plan3DView({
  wallSegments, spaces, planBounds, mode,
  detectedFloors = [], dimensions = [], activeFloorId = 'all',
  className = '',
}: Plan3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fitViewRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('Initialisation...')
  const [currentFloor, setCurrentFloor] = useState<string | 'all'>(activeFloorId)
  const [showDimensions, setShowDimensions] = useState(false) // OFF by default — dimensions are noisy
  const [showLabels, setShowLabels] = useState(true)

  // Filter walls/spaces by selected floor
  const filteredWalls = React.useMemo(() => {
    if (currentFloor === 'all' || !detectedFloors.length) return wallSegments
    return wallSegments.filter(w => !w.floorId || w.floorId === currentFloor)
  }, [wallSegments, currentFloor, detectedFloors.length])

  const filteredSpaces = React.useMemo(() => {
    if (currentFloor === 'all' || !detectedFloors.length) return spaces
    return spaces.filter(s => !s.floorId || s.floorId === currentFloor)
  }, [spaces, currentFloor, detectedFloors.length])

  const filteredDims = React.useMemo(() => {
    if (!showDimensions) return []
    if (currentFloor === 'all' || !detectedFloors.length) return dimensions
    return dimensions.filter(d => !d.floorId || d.floorId === currentFloor)
  }, [dimensions, currentFloor, detectedFloors.length, showDimensions])

  // Per-floor bounds (for better framing when a single floor is selected)
  const effectiveBounds = React.useMemo(() => {
    if (currentFloor === 'all' || !detectedFloors.length) return planBounds
    const f = detectedFloors.find(f => f.id === currentFloor)
    if (!f) return planBounds
    return { width: f.bounds.width, height: f.bounds.height, offsetX: f.bounds.minX, offsetY: f.bounds.minY }
  }, [currentFloor, detectedFloors, planBounds])

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

        // ── Plan dimensions (use effective bounds when floor is filtered) ──
        const offsetX = (effectiveBounds as { offsetX?: number }).offsetX ?? 0
        const offsetY = (effectiveBounds as { offsetY?: number }).offsetY ?? 0
        const pw = effectiveBounds.width || 100
        const ph = effectiveBounds.height || 100
        const cx = offsetX + pw / 2
        const cy = offsetY + ph / 2
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

        // ── Zone floor slabs + floating labels ──
        // Helper: create a text sprite from a label
        const makeTextSprite = (label: string, surface: number, colorHex: string) => {
          const canvas = document.createElement('canvas')
          canvas.width = 512
          canvas.height = 160
          const ctx = canvas.getContext('2d')
          if (!ctx) return null

          // Rounded background
          ctx.fillStyle = 'rgba(10, 14, 26, 0.92)'
          const r = 20
          ctx.beginPath()
          ctx.moveTo(r, 0)
          ctx.lineTo(canvas.width - r, 0)
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r)
          ctx.lineTo(canvas.width, canvas.height - r)
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height)
          ctx.lineTo(r, canvas.height)
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r)
          ctx.lineTo(0, r)
          ctx.quadraticCurveTo(0, 0, r, 0)
          ctx.closePath()
          ctx.fill()

          // Left colored bar (zone color)
          ctx.fillStyle = colorHex
          ctx.fillRect(0, 0, 12, canvas.height)

          // Label text
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 52px system-ui, sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          const maxLabelLen = 22
          const displayLabel = label.length > maxLabelLen ? label.slice(0, maxLabelLen - 1) + '…' : label
          ctx.fillText(displayLabel, 28, 55)

          // Surface text
          ctx.fillStyle = '#9ca3af'
          ctx.font = '500 36px system-ui, sans-serif'
          ctx.fillText(`${surface.toFixed(0)} m²`, 28, 115)

          const texture = new THREE.CanvasTexture(canvas)
          texture.minFilter = THREE.LinearFilter
          texture.magFilter = THREE.LinearFilter
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
          const sprite = new THREE.Sprite(material)
          // Scale sprite: width ≈ 6% of plan width (readable but not overpowering)
          const sw = pw * 0.06
          const sh = sw * (canvas.height / canvas.width)
          sprite.scale.set(sw, sh, 1)
          sprite.renderOrder = 999 // Always on top
          return sprite
        }

        let slabCount = 0
        let labelCount = 0
        for (const sp of filteredSpaces) {
          const sw = sp.bounds.width
          const sh = sp.bounds.height
          if (!sw || !sh || sw < 0.5 || sh < 0.5) continue

          const colorHex = sp.color || ZONE_COLORS[sp.type] || '#3b82f6'
          const color = new THREE.Color(colorHex)

          const zoneGeo = new THREE.BoxGeometry(sw, sh, 0.15)
          const zoneMat = new THREE.MeshLambertMaterial({
            color,
            transparent: true,
            opacity: 0.5,
          })
          const zone = new THREE.Mesh(zoneGeo, zoneMat)
          const zx = sp.bounds.minX + sw / 2
          const zy = sp.bounds.minY + sh / 2
          zone.position.set(zx, zy, 0.08)
          zone.userData = { spaceId: sp.id, spaceLabel: sp.label }
          scene.add(zone)
          slabCount++

          // Floating label sprite — only if labels enabled and zone is big enough
          if (showLabels && sp.label && sp.label !== `Zone ${slabCount}` && sw * sh > pw * ph * 0.0003) {
            const sprite = makeTextSprite(sp.label, sp.areaSqm, colorHex)
            if (sprite) {
              sprite.position.set(zx, zy, wallHeight + pw * 0.015)
              scene.add(sprite)
              labelCount++
            }
          }
        }
        console.log(`[Plan3D] ${labelCount} labels flottants rendus`)

        // ── Walls (use InstancedMesh for performance with many walls) ──
        // Colors by layer type
        const wallColorByLayer = (layer: string): number => {
          const l = layer.toLowerCase()
          if (/mur|wall|struct|beton|facade|maconn/.test(l)) return 0xd4dae8 // structural = light
          if (/clois|partition/.test(l)) return 0xaab4cc // partitions = medium
          if (/porte|door|fenetre|window/.test(l)) return 0x88a8cc // openings = blue-tint
          if (/escalier|stair|ascens/.test(l)) return 0xb8a088 // stairs = warm
          return 0xa0a8b8 // default
        }

        // Group walls by color for instanced rendering
        const wallsByColor = new Map<number, Array<{ x: number; y: number; len: number; angle: number }>>()
        for (const seg of filteredWalls) {
          const dx = seg.x2 - seg.x1
          const dy = seg.y2 - seg.y1
          const len = Math.sqrt(dx * dx + dy * dy)
          if (len < 0.05) continue

          const color = wallColorByLayer(seg.layer)
          if (!wallsByColor.has(color)) wallsByColor.set(color, [])
          wallsByColor.get(color)!.push({
            x: (seg.x1 + seg.x2) / 2,
            y: (seg.y1 + seg.y2) / 2,
            len,
            angle: Math.atan2(dy, dx),
          })
        }

        let wallCount = 0
        for (const [color, walls] of wallsByColor.entries()) {
          const mat = new THREE.MeshLambertMaterial({ color })
          // Unit box (1x1x1) that we'll scale per instance
          const baseGeo = new THREE.BoxGeometry(1, 1, 1)
          const instancedMesh = new THREE.InstancedMesh(baseGeo, mat, walls.length)

          const dummy = new THREE.Object3D()
          for (let i = 0; i < walls.length; i++) {
            const w = walls[i]
            dummy.position.set(w.x, w.y, wallHeight / 2)
            dummy.rotation.set(0, 0, w.angle)
            dummy.scale.set(w.len, wallThick, wallHeight)
            dummy.updateMatrix()
            instancedMesh.setMatrixAt(i, dummy.matrix)
          }
          instancedMesh.instanceMatrix.needsUpdate = true
          scene.add(instancedMesh)
          wallCount += walls.length
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

        // ── Dimensions (cotations) — rendered ABOVE walls, discreet + on their own plane ──
        let dimCount = 0
        if (filteredDims.length > 0) {
          // Place dimensions well above walls so they don't overlap geometry
          const dimZ = wallHeight * 1.4
          const dimColor = 0xfbbf24 // amber (more discreet than red)
          const dimMat = new THREE.LineBasicMaterial({
            color: dimColor,
            transparent: true,
            opacity: 0.5,
          })

          // Collect all line points into a single geometry for performance (1 draw call)
          const linePoints: number[] = []

          const makeDimLabel = (text: string) => {
            const canvas = document.createElement('canvas')
            canvas.width = 256
            canvas.height = 64
            const ctx = canvas.getContext('2d')
            if (!ctx) return null
            // Subtle rounded background
            ctx.fillStyle = 'rgba(10, 14, 26, 0.75)'
            const r = 8
            ctx.beginPath()
            ctx.roundRect(0, 0, canvas.width, canvas.height, r)
            ctx.fill()
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
            ctx.lineWidth = 1.5
            ctx.stroke()
            // Amber text
            ctx.fillStyle = '#fbbf24'
            ctx.font = '500 36px monospace'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, canvas.width / 2, canvas.height / 2)
            const texture = new THREE.CanvasTexture(canvas)
            texture.minFilter = THREE.LinearFilter
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85, depthTest: false })
            const sprite = new THREE.Sprite(mat)
            const sw = pw * 0.025 // Smaller labels (was 0.035)
            sprite.scale.set(sw, sw * (canvas.height / canvas.width), 1)
            sprite.renderOrder = 1001
            return sprite
          }

          for (const dim of filteredDims) {
            const [x1, y1] = dim.p1
            const [x2, y2] = dim.p2
            const [tx, ty] = dim.textPos
            if (dim.valueM < 0.1 || dim.valueM > Math.max(pw, ph) * 1.5) continue

            // Dimension line
            linePoints.push(x1, y1, dimZ, x2, y2, dimZ)

            // Tick marks (smaller)
            const dx = x2 - x1, dy = y2 - y1
            const len = Math.sqrt(dx * dx + dy * dy)
            if (len > 0.01) {
              const nx = -dy / len, ny = dx / len
              const tick = pw * 0.0025 // Smaller (was 0.004)
              linePoints.push(x1 - nx * tick, y1 - ny * tick, dimZ, x1 + nx * tick, y1 + ny * tick, dimZ)
              linePoints.push(x2 - nx * tick, y2 - ny * tick, dimZ, x2 + nx * tick, y2 + ny * tick, dimZ)
            }

            // Label sprite
            const sprite = makeDimLabel(dim.text)
            if (sprite) {
              sprite.position.set(tx || (x1 + x2) / 2, ty || (y1 + y2) / 2, dimZ + pw * 0.003)
              scene.add(sprite)
            }
            dimCount++
            if (dimCount > 500) break
          }

          // Single LineSegments for all dimension lines (massive perf boost)
          if (linePoints.length > 0) {
            const geo = new THREE.BufferGeometry()
            geo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3))
            const allLines = new THREE.LineSegments(geo, dimMat)
            allLines.renderOrder = 1000
            scene.add(allLines)
          }
        }

        console.log(`[Plan3D] Built scene: ${slabCount} zones, ${wallCount} walls, ${labelCount} labels, ${dimCount} dims, ${pw.toFixed(0)}×${ph.toFixed(0)}m`)
        setStatus(`${wallCount} murs · ${slabCount} zones · ${labelCount} labels · ${dimCount} cotes`)

        // ── OrbitControls with smooth pan/zoom ──
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.target.set(cx, cy, 0)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.maxPolarAngle = Math.PI / 2.05
        controls.minDistance = diag * 0.01
        controls.maxDistance = diag * 10
        controls.screenSpacePanning = true  // Pan parallel to screen (more intuitive)
        controls.panSpeed = 1.5
        controls.zoomSpeed = 1.5
        controls.rotateSpeed = 0.8
        controls.enablePan = true
        controls.enableZoom = true
        controls.enableRotate = true
        // Mouse buttons: LEFT = rotate, MIDDLE = zoom, RIGHT = pan
        controls.mouseButtons = {
          LEFT: 0, // ROTATE
          MIDDLE: 1, // DOLLY
          RIGHT: 2, // PAN
        }
        // Touch: ONE = rotate, TWO = pan
        controls.touches = {
          ONE: 2, // ROTATE
          TWO: 1, // DOLLY_PAN
        }
        // Keyboard pan
        controls.keys = {
          LEFT: 'ArrowLeft',
          UP: 'ArrowUp',
          RIGHT: 'ArrowRight',
          BOTTOM: 'ArrowDown',
        }
        controls.keyPanSpeed = 50
        controls.listenToKeyEvents(window)
        controls.update()
        cleanupFns.push(() => controls.dispose())

        // Fit view function (resets camera + target)
        const fitView = () => {
          if (mode === '3d-advanced') {
            const d = diag * 0.7
            camera.position.set(cx + d, cy - d, d * 0.9)
          } else {
            camera.position.set(cx, cy - ph * 0.8, diag * 0.5)
          }
          camera.lookAt(cx, cy, 0)
          controls.target.set(cx, cy, 0)
          controls.update()
        }
        fitViewRef.current = fitView

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

        // ── Resize (robust — uses ResizeObserver + requestAnimationFrame) ──
        let resizeRaf = 0
        const onResize = () => {
          if (!container || disposed) return
          cancelAnimationFrame(resizeRaf)
          resizeRaf = requestAnimationFrame(() => {
            const nw = container.clientWidth
            const nh = container.clientHeight
            if (nw === 0 || nh === 0) return
            camera.aspect = nw / nh
            camera.updateProjectionMatrix()
            renderer.setSize(nw, nh, false)
            renderer.domElement.style.width = '100%'
            renderer.domElement.style.height = '100%'
          })
        }
        window.addEventListener('resize', onResize)
        const resizeObserver = new ResizeObserver(onResize)
        resizeObserver.observe(container)
        onResize() // Initial sizing
        cleanupFns.push(() => {
          cancelAnimationFrame(resizeRaf)
          window.removeEventListener('resize', onResize)
          resizeObserver.disconnect()
        })

        // ── Shift+Left-click for pan (alternative to right-click) ──
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Shift') {
            controls.mouseButtons.LEFT = 2 // PAN
          }
        }
        const onKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'Shift') {
            controls.mouseButtons.LEFT = 0 // ROTATE
          }
        }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        cleanupFns.push(() => {
          window.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('keyup', onKeyUp)
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
  }, [filteredWalls, filteredSpaces, filteredDims, effectiveBounds, mode, showLabels])

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: '#0a0a14' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Status overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
        <div className="px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-400">
          {mode === '3d' ? 'Perspective 3D' : 'Vue Isométrique'} — {status}
        </div>
        <button
          onClick={() => fitViewRef.current?.()}
          className="px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 border border-blue-500 text-[10px] text-white font-medium transition-colors"
        >
          Recentrer
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
            showLabels ? 'bg-emerald-600/80 hover:bg-emerald-600 border-emerald-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          Labels
        </button>
        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-3 py-1.5 rounded-lg border text-[10px] font-medium transition-colors ${
            showDimensions ? 'bg-red-600/80 hover:bg-red-600 border-red-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}
        >
          Cotes
        </button>
      </div>

      {/* Floor selector — top right */}
      {detectedFloors.length > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-gray-900/90 border border-white/[0.08] rounded-lg p-1">
          <span className="text-[9px] text-gray-500 px-2 uppercase tracking-wider">Etage</span>
          <button
            onClick={() => setCurrentFloor('all')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              currentFloor === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Tous
          </button>
          {[...detectedFloors].sort((a, b) => a.stackOrder - b.stackOrder).map(f => (
            <button
              key={f.id}
              onClick={() => setCurrentFloor(f.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                currentFloor === f.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {f.label}
              <span className="ml-1 text-[8px] opacity-60">({f.entityCount})</span>
            </button>
          ))}
        </div>
      )}

      {/* Navigation hint */}
      <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-gray-900/80 border border-white/[0.08] text-[10px] text-gray-500 pointer-events-none">
        Glisser: rotation · Molette: zoom · Clic droit / Shift+glisser: pan · Fleches: pan
      </div>
    </div>
  )
}
