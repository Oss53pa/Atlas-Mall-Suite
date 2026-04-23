// ═══ VIRTUAL TOUR ENGINE — Three.js vanilla (comme FloorPlan3D) ═══
// FPS Walkthrough + Orbite + Visite guidée — 4 contextes

import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ── Types ──
export type TourContext = 'vol1' | 'vol2' | 'vol3' | 'standalone'
export type TourMode = 'orbit' | 'fps' | 'guided'
export type ScenarioRole = 'investisseur' | 'enseigne' | 'fm'

export interface Waypoint {
  id: string
  position: [number, number, number]
  lookAt: [number, number, number]
  label: string
  description: string
  scenario: ScenarioRole[]
  order: number
}

export interface TourZone {
  id: string; name: string
  polygon: [number, number][]
  height: number; color: string; type: string
  tenantName?: string; rentPerSqm?: number; status?: string
  securityType?: string; touchpoint?: string; footfall?: number
}

interface Props {
  context: TourContext
  zones: TourZone[]
  waypoints: Waypoint[]
  floorWidth: number
  floorDepth: number
  scenarioRole?: ScenarioRole
  onWaypointReached?: (wp: Waypoint) => void
  onZoneClick?: (zone: TourZone) => void
}

export default function VirtualTourEngine({
  zones, waypoints, floorWidth, floorDepth,
  scenarioRole, onWaypointReached, onZoneClick: _onZoneClick, context,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls; animId: number } | null>(null)
  const keysRef = useRef<Record<string, boolean>>({})

  const [mode, setMode] = useState<TourMode>('orbit')
  const [activeWP, setActiveWP] = useState(0)
  const [showPanel, _setShowPanel] = useState(true)

  const filteredWP = useMemo(() =>
    waypoints.filter(wp => !scenarioRole || wp.scenario.includes(scenarioRole)).sort((a, b) => a.order - b.order),
    [waypoints, scenarioRole]
  )

  // ── Init Three.js ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a0f1a')
    scene.fog = new THREE.Fog('#0a0f1a', 80, 200)

    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 500)
    camera.position.set(floorWidth / 2, 20, floorDepth + 15)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(floorWidth / 2, 0, floorDepth / 2)
    controls.maxPolarAngle = Math.PI / 2.1
    controls.update()

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7)
    dirLight.position.set(30, 40, 20)
    dirLight.castShadow = true
    scene.add(dirLight)
    scene.add(new THREE.PointLight(0xe8d5b7, 0.3, 100).translateX(floorWidth / 2).translateY(8).translateZ(floorDepth / 2))

    // Floor
    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorDepth, 32, 32)
    const floorMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.8 })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(floorWidth / 2, 0, floorDepth / 2)
    floorMesh.receiveShadow = true
    scene.add(floorMesh)

    // Grid
    const grid = new THREE.GridHelper(Math.max(floorWidth, floorDepth), 40, 0x333355, 0x222244)
    grid.position.set(floorWidth / 2, 0.01, floorDepth / 2)
    scene.add(grid)

    // Zones
    for (const z of zones) {
      if (z.polygon.length < 3) continue
      const shape = new THREE.Shape()
      shape.moveTo(z.polygon[0][0], z.polygon[0][1])
      for (let i = 1; i < z.polygon.length; i++) shape.lineTo(z.polygon[i][0], z.polygon[i][1])
      shape.closePath()
      const geo = new THREE.ExtrudeGeometry(shape, { depth: z.height, bevelEnabled: false })
      const mat = new THREE.MeshStandardMaterial({ color: z.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = 0
      mesh.castShadow = true
      mesh.userData = { zoneId: z.id }
      scene.add(mesh)

      // Label sprite
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.roundRect(0, 0, 256, 64, 8); ctx.fill()
      ctx.font = 'bold 18px system-ui'; ctx.fillStyle = '#fff'
      ctx.fillText(z.name, 10, 25)
      if (z.tenantName) { ctx.font = '14px system-ui'; ctx.fillStyle = '#999'; ctx.fillText(z.tenantName, 10, 48) }
      const tex = new THREE.CanvasTexture(canvas)
      const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true })
      const sprite = new THREE.Sprite(spriteMat)
      const cx = z.polygon.reduce((a, p) => a + p[0], 0) / z.polygon.length
      const cz = z.polygon.reduce((a, p) => a + p[1], 0) / z.polygon.length
      sprite.position.set(cx, z.height + 1, cz)
      sprite.scale.set(8, 2, 1)
      scene.add(sprite)
    }

    // Waypoint markers
    for (const wp of filteredWP) {
      const geo = new THREE.OctahedronGeometry(0.4, 0)
      const mat = new THREE.MeshStandardMaterial({ color: '#c9a068', emissive: '#c9a068', emissiveIntensity: 0.5 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...wp.position)
      mesh.userData = { waypointId: wp.id }
      scene.add(mesh)
    }

    // Resize
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // Animate
    let animId = 0
    const clock = new THREE.Clock()
    const animate = () => {
      animId = requestAnimationFrame(animate)
      const dt = clock.getDelta()

      // FPS movement
      if (mode === 'fps') {
        controls.enabled = false
        const speed = 8 * dt
        const dir = new THREE.Vector3()
        camera.getWorldDirection(dir)
        dir.y = 0; dir.normalize()
        const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0))
        const k = keysRef.current
        if (k['KeyW'] || k['KeyZ'] || k['ArrowUp']) camera.position.addScaledVector(dir, speed)
        if (k['KeyS'] || k['ArrowDown']) camera.position.addScaledVector(dir, -speed)
        if (k['KeyD'] || k['ArrowRight']) camera.position.addScaledVector(right, speed)
        if (k['KeyA'] || k['KeyQ'] || k['ArrowLeft']) camera.position.addScaledVector(right, -speed)
        camera.position.y = 1.7
      } else {
        controls.enabled = true
        controls.update()
      }

      // Rotate waypoint markers
      scene.traverse(obj => {
        if (obj.userData?.waypointId && obj instanceof THREE.Mesh) {
          obj.rotation.y += dt * 0.8
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = { scene, camera, renderer, controls, animId }

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true }
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // FPS mouse look
    const onMouseMove = (e: MouseEvent) => {
      if (mode !== 'fps' || !document.pointerLockElement) return
      const euler = new THREE.Euler(0, 0, 0, 'YXZ')
      euler.setFromQuaternion(camera.quaternion)
      euler.y -= e.movementX * 0.002
      euler.x -= e.movementY * 0.002
      euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x))
      camera.quaternion.setFromEuler(euler)
    }
    const onClick = () => { if (mode === 'fps') renderer.domElement.requestPointerLock() }
    renderer.domElement.addEventListener('click', onClick)
    document.addEventListener('mousemove', onMouseMove)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      renderer.domElement.removeEventListener('click', onClick)
      document.removeEventListener('mousemove', onMouseMove)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [zones, filteredWP, floorWidth, floorDepth]) // eslint-disable-line

  // Update mode ref for animate loop
  useEffect(() => {
    const s = sceneRef.current
    if (!s) return
    if (mode === 'fps') {
      s.controls.enabled = false
      s.camera.position.y = 1.7
    } else {
      s.controls.enabled = true
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [mode])

  const goToWaypoint = useCallback((idx: number) => {
    setActiveWP(idx)
    const wp = filteredWP[idx]
    if (!wp || !sceneRef.current) return
    const { camera, controls } = sceneRef.current
    camera.position.set(...wp.position)
    controls.target.set(...wp.lookAt)
    controls.update()
    onWaypointReached?.(wp)
  }, [filteredWP, onWaypointReached])

  const contextLabel = context === 'vol1' ? 'Commercial' : context === 'vol2' ? 'Sécurité' : context === 'vol3' ? 'Parcours' : 'Présentation'

  return (
    <div className="flex h-full" style={{ background: '#1a1d23' }}>
      {/* 3D viewport */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />

        {/* Mode toolbar */}
        <div className="absolute top-3 left-3 flex gap-1 bg-surface-0/60 backdrop-blur-sm rounded-lg p-1">
          {([['orbit', 'Orbite'], ['fps', 'FPS (ZQSD)'], ['guided', 'Guidée']] as [TourMode, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                mode === m ? 'bg-atlas-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-surface-0/60 backdrop-blur-sm text-[10px] font-semibold text-atlas-300">
          Visite {contextLabel}
        </div>

        {mode === 'fps' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface-0/70 backdrop-blur-sm rounded-lg px-4 py-2 text-[11px] text-gray-300">
            ZQSD/Flèches pour se déplacer · Clic pour capturer la souris · Échap pour libérer
          </div>
        )}

        {mode === 'guided' && filteredWP.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-surface-0/60 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-400">Étape {activeWP + 1}/{filteredWP.length}</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-atlas-500 rounded-full transition-all" style={{ width: `${((activeWP + 1) / filteredWP.length) * 100}%` }} />
              </div>
              <span className="text-[10px] text-white font-medium">{filteredWP[activeWP]?.label}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => goToWaypoint(Math.max(0, activeWP - 1))} disabled={activeWP === 0}
                className="px-3 py-1 rounded text-[10px] bg-white/10 text-gray-300 hover:text-white disabled:opacity-30">Précédent</button>
              <button onClick={() => goToWaypoint(Math.min(filteredWP.length - 1, activeWP + 1))} disabled={activeWP >= filteredWP.length - 1}
                className="px-3 py-1 rounded text-[10px] bg-atlas-500 text-white hover:bg-atlas-500 disabled:opacity-30">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      {showPanel && (
        <div className="w-72 flex-shrink-0 border-l border-white/[0.05] overflow-y-auto" style={{ background: '#0a0f1a' }}>
          <div className="p-4 border-b border-white/[0.04]">
            <h3 className="text-sm font-semibold text-white mb-1">Visite virtuelle</h3>
            <p className="text-[10px] text-gray-500">{filteredWP.length} points d'intérêt · {zones.length} zones</p>
          </div>
          <div className="p-2 space-y-1">
            {filteredWP.map((wp, i) => (
              <button key={wp.id} onClick={() => goToWaypoint(i)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  i === activeWP ? 'bg-atlas-500/10 border border-atlas-500/20' : 'hover:bg-white/[0.03]'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    i === activeWP ? 'bg-atlas-500 text-white' : 'bg-white/10 text-gray-500'}`}>
                    {wp.order}
                  </span>
                  <span className="text-[11px] font-medium text-white">{wp.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1 ml-7">{wp.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
