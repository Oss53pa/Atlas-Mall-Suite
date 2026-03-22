// ═══ FLOOR PLAN 3D — Vue Three.js des etages ═══

import { useRef, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Camera, Zone, Door, BlindSpot, TransitionNode, Floor } from '../../shared/proph3t/types'
import { getImported3DModels, subscribeImported3DModels } from '../store/imported3DModel'

export type NavMode = 'orbit' | 'fps'

export type ClippingAxis = 'x' | 'y' | 'z'

export interface ClippingConfig {
  enabled: boolean
  axis: ClippingAxis
  position: number // 0.0 → 1.0 relative to building bounds
  showHelper: boolean
}

interface FloorPlan3DProps {
  floors: Floor[]
  activeFloorId: string
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  blindSpots: BlindSpot[]
  transitions: TransitionNode[]
  showFov: boolean
  showBlindSpots: boolean
  showTransitions: boolean
  selectedEntityId: string | null
  onEntityClick?: (id: string, type: 'camera' | 'door' | 'zone' | 'transition') => void
  showAllFloors?: boolean
  clipping?: ClippingConfig
  navMode?: NavMode
}

// ─── Materials ───────────────────────────────────────────────

const ZONE_TYPE_COLORS: Record<string, number> = {
  parking: 0x64748b,
  commerce: 0x3b82f6,
  restauration: 0xf59e0b,
  circulation: 0x94a3b8,
  technique: 0xef4444,
  backoffice: 0x8b5cf6,
  financier: 0xdc2626,
  sortie_secours: 0x22c55e,
  loisirs: 0x06b6d4,
  services: 0x14b8a6,
  hotel: 0xa855f7,
  bureaux: 0x6366f1,
  exterieur: 0x84cc16,
}

const FLOOR_GAP = 8 // vertical spacing between floors in 3D
const FLOOR_THICKNESS = 0.3
const WALL_HEIGHT = 3.5
const CAMERA_RADIUS = 0.8

function getFloorYOffset(floors: Floor[], floorId: string): number {
  const floor = floors.find(f => f.id === floorId)
  if (!floor) return 0
  return floor.order * FLOOR_GAP
}

// ─── Scene Builder ──────────────────────────────────────────

function buildScene(
  scene: THREE.Scene,
  props: FloorPlan3DProps,
  entityMap: Map<THREE.Object3D, { id: string; type: 'camera' | 'door' | 'zone' | 'transition' }>,
  imported3DModels?: ReturnType<typeof getImported3DModels>
) {
  // Clear previous
  while (scene.children.length > 0) scene.remove(scene.children[0])
  entityMap.clear()

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(50, 80, 30)
  dirLight.castShadow = true
  scene.add(dirLight)

  const pointLight = new THREE.PointLight(0x8b5cf6, 0.3, 200)
  pointLight.position.set(0, 50, 0)
  scene.add(pointLight)

  // Determine which floors to render
  const floorsToRender = props.showAllFloors
    ? props.floors
    : props.floors.filter(f => f.id === props.activeFloorId)

  for (const floor of floorsToRender) {
    const yOffset = getFloorYOffset(props.floors, floor.id)
    const floorZones = props.zones.filter(z => z.floorId === floor.id)
    const floorCameras = props.cameras.filter(c => c.floorId === floor.id)
    const floorDoors = props.doors.filter(d => d.floorId === floor.id)
    const floorBlindSpots = props.blindSpots.filter(b => b.floorId === floor.id)

    // ── Floor slab ──
    const slabGeo = new THREE.BoxGeometry(floor.widthM, FLOOR_THICKNESS, floor.heightM)
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
    })
    const slab = new THREE.Mesh(slabGeo, slabMat)
    slab.position.set(floor.widthM / 2, yOffset - FLOOR_THICKNESS / 2, floor.heightM / 2)
    slab.receiveShadow = true
    scene.add(slab)

    // ── Grid on floor ──
    const gridHelper = new THREE.GridHelper(Math.max(floor.widthM, floor.heightM), 20, 0x333355, 0x222244)
    gridHelper.position.set(floor.widthM / 2, yOffset + 0.01, floor.heightM / 2)
    scene.add(gridHelper)

    // ── Floor label ──
    // (Use a sprite for the label)
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx2d = canvas.getContext('2d')!
    ctx2d.fillStyle = '#a855f7'
    ctx2d.font = 'bold 28px sans-serif'
    ctx2d.textAlign = 'center'
    ctx2d.fillText(floor.level, 128, 40)
    const labelTexture = new THREE.CanvasTexture(canvas)
    const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true })
    const labelSprite = new THREE.Sprite(labelMat)
    labelSprite.position.set(-5, yOffset + 2, floor.heightM / 2)
    labelSprite.scale.set(12, 3, 1)
    scene.add(labelSprite)

    // ── Zones ──
    for (const zone of floorZones) {
      const color = ZONE_TYPE_COLORS[zone.type] ?? 0x94a3b8
      const height = 0.5 + zone.niveau * 0.4
      const isSelected = zone.id === props.selectedEntityId

      // Zone block
      const zoneGeo = new THREE.BoxGeometry(zone.w, height, zone.h)
      const zoneMat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: isSelected ? 0.7 : 0.35,
        roughness: 0.7,
      })
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat)
      zoneMesh.position.set(zone.x + zone.w / 2, yOffset + height / 2, zone.y + zone.h / 2)
      zoneMesh.castShadow = true
      scene.add(zoneMesh)
      entityMap.set(zoneMesh, { id: zone.id, type: 'zone' })

      // Zone wireframe
      const wireGeo = new THREE.EdgesGeometry(zoneGeo)
      const wireMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0xa855f7 : color,
        linewidth: isSelected ? 2 : 1,
      })
      const wireframe = new THREE.LineSegments(wireGeo, wireMat)
      wireframe.position.copy(zoneMesh.position)
      scene.add(wireframe)

      // Zone label
      const zCanvas = document.createElement('canvas')
      zCanvas.width = 512
      zCanvas.height = 64
      const zCtx = zCanvas.getContext('2d')!
      zCtx.fillStyle = '#ffffff'
      zCtx.font = '24px sans-serif'
      zCtx.textAlign = 'center'
      zCtx.fillText(zone.label, 256, 40)
      const zTexture = new THREE.CanvasTexture(zCanvas)
      const zSpriteMat = new THREE.SpriteMaterial({ map: zTexture, transparent: true, opacity: 0.8 })
      const zSprite = new THREE.Sprite(zSpriteMat)
      zSprite.position.set(zone.x + zone.w / 2, yOffset + height + 1.5, zone.y + zone.h / 2)
      zSprite.scale.set(Math.min(zone.w, 20), 2, 1)
      scene.add(zSprite)
    }

    // ── Cameras ──
    for (const cam of floorCameras) {
      const isSelected = cam.id === props.selectedEntityId

      // Camera body (sphere)
      const camGeo = new THREE.SphereGeometry(CAMERA_RADIUS, 16, 12)
      const camMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(cam.color),
        emissive: new THREE.Color(cam.color),
        emissiveIntensity: isSelected ? 0.5 : 0.2,
        metalness: 0.8,
        roughness: 0.2,
      })
      const camMesh = new THREE.Mesh(camGeo, camMat)
      camMesh.position.set(cam.x, yOffset + WALL_HEIGHT, cam.y)
      camMesh.castShadow = true
      scene.add(camMesh)
      entityMap.set(camMesh, { id: cam.id, type: 'camera' })

      // Camera mount pole
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, WALL_HEIGHT, 8)
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.set(cam.x, yOffset + WALL_HEIGHT / 2, cam.y)
      scene.add(pole)

      // Selection ring
      if (isSelected) {
        const ringGeo = new THREE.TorusGeometry(CAMERA_RADIUS + 0.4, 0.08, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.copy(camMesh.position)
        ring.rotation.x = Math.PI / 2
        scene.add(ring)
      }

      // FOV cone
      if (props.showFov) {
        const rangeWorld = cam.rangeM
        const fovRad = (cam.fov * Math.PI) / 180

        if (cam.fov >= 360) {
          // Full circle
          const circleGeo = new THREE.CircleGeometry(rangeWorld, 32)
          const circleMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(cam.color),
            transparent: true,
            opacity: 0.08,
            side: THREE.DoubleSide,
          })
          const circle = new THREE.Mesh(circleGeo, circleMat)
          circle.rotation.x = -Math.PI / 2
          circle.position.set(cam.x, yOffset + 0.05, cam.y)
          scene.add(circle)
        } else {
          // Cone shape on ground
          const segments = 24
          const shape = new THREE.Shape()
          shape.moveTo(0, 0)
          const halfFov = fovRad / 2
          const startA = ((cam.angle - cam.fov / 2) * Math.PI) / 180
          for (let i = 0; i <= segments; i++) {
            const a = startA + (fovRad * i) / segments
            shape.lineTo(Math.cos(a) * rangeWorld, Math.sin(a) * rangeWorld)
          }
          shape.lineTo(0, 0)

          const shapeGeo = new THREE.ShapeGeometry(shape)
          const shapeMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(cam.color),
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
          })
          const fovMesh = new THREE.Mesh(shapeGeo, shapeMat)
          fovMesh.rotation.x = -Math.PI / 2
          fovMesh.position.set(cam.x, yOffset + 0.05, cam.y)
          scene.add(fovMesh)
        }
      }
    }

    // ── Doors ──
    for (const door of floorDoors) {
      const doorColor = door.isExit ? 0x22c55e : door.hasBadge ? 0x3b82f6 : 0x94a3b8
      const doorGeo = new THREE.BoxGeometry(door.widthM || 1.2, WALL_HEIGHT * 0.7, 0.2)
      const doorMat = new THREE.MeshStandardMaterial({
        color: doorColor,
        transparent: true,
        opacity: 0.6,
        metalness: 0.3,
      })
      const doorMesh = new THREE.Mesh(doorGeo, doorMat)
      doorMesh.position.set(door.x, yOffset + WALL_HEIGHT * 0.35, door.y)
      scene.add(doorMesh)
      entityMap.set(doorMesh, { id: door.id, type: 'door' })
    }

    // ── Blind spots ──
    if (props.showBlindSpots) {
      for (const bs of floorBlindSpots) {
        const bsColor = bs.severity === 'critique' ? 0xef4444 : bs.severity === 'elevee' ? 0xf59e0b : 0xfbbf24
        const bsGeo = new THREE.PlaneGeometry(bs.w, bs.h)
        const bsMat = new THREE.MeshBasicMaterial({
          color: bsColor,
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        })
        const bsMesh = new THREE.Mesh(bsGeo, bsMat)
        bsMesh.rotation.x = -Math.PI / 2
        bsMesh.position.set(bs.x + bs.w / 2, yOffset + 0.08, bs.y + bs.h / 2)
        scene.add(bsMesh)

        // Pulsing ring for critique
        if (bs.severity === 'critique') {
          const ringGeo = new THREE.RingGeometry(Math.max(bs.w, bs.h) / 2 - 0.3, Math.max(bs.w, bs.h) / 2, 32)
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
          })
          const ringMesh = new THREE.Mesh(ringGeo, ringMat)
          ringMesh.rotation.x = -Math.PI / 2
          ringMesh.position.set(bs.x + bs.w / 2, yOffset + 0.1, bs.y + bs.h / 2)
          scene.add(ringMesh)
        }
      }
    }

    // ── Transitions ──
    if (props.showTransitions) {
      const floorTransitions = props.transitions.filter(
        t => t.fromFloor === floor.level || t.toFloor === floor.level
      )
      for (const tr of floorTransitions) {
        const trColor = tr.pmr ? 0x8b5cf6 : 0x6366f1
        const trGeo = new THREE.CylinderGeometry(1.5, 1.5, FLOOR_GAP - 1, 12, 1, true)
        const trMat = new THREE.MeshBasicMaterial({
          color: trColor,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        })
        const trMesh = new THREE.Mesh(trGeo, trMat)
        trMesh.position.set(tr.x, yOffset + (FLOOR_GAP - 1) / 2, tr.y)
        scene.add(trMesh)
        entityMap.set(trMesh, { id: tr.id, type: 'transition' })

        // Arrow
        const arrowGeo = new THREE.ConeGeometry(0.8, 2, 8)
        const arrowMat = new THREE.MeshStandardMaterial({ color: trColor, emissive: trColor, emissiveIntensity: 0.3 })
        const arrow = new THREE.Mesh(arrowGeo, arrowMat)
        arrow.position.set(tr.x, yOffset + FLOOR_GAP - 1.5, tr.y)
        scene.add(arrow)
      }
    }

    // ── Imported 3D Models ──
    if (imported3DModels) {
      const floorModels = imported3DModels.filter(m => m.floorId === floor.id)
      for (const entry of floorModels) {
        const modelClone = entry.scene.clone()

        // Auto-scale and position the model to fit the floor
        const box = new THREE.Box3().setFromObject(modelClone)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        // Scale to match floor dimensions
        const maxModelDim = Math.max(size.x, size.z)
        const maxFloorDim = Math.max(floor.widthM, floor.heightM)
        if (maxModelDim > 0) {
          const scale = maxFloorDim / maxModelDim
          modelClone.scale.setScalar(scale)
        }

        // Recompute bounding box after scaling
        const scaledBox = new THREE.Box3().setFromObject(modelClone)
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
        const scaledSize = scaledBox.getSize(new THREE.Vector3())

        // Center on floor slab
        modelClone.position.set(
          floor.widthM / 2 - scaledCenter.x,
          yOffset - scaledBox.min.y,
          floor.heightM / 2 - scaledCenter.z
        )

        scene.add(modelClone)
      }
    }
  }
}

// ─── Main Component ─────────────────────────────────────────

export default function FloorPlan3D(props: FloorPlan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef(new THREE.Scene())
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const entityMapRef = useRef(new Map<THREE.Object3D, { id: string; type: 'camera' | 'door' | 'zone' | 'transition' }>())
  const rafRef = useRef(0)
  const clippingPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0))
  const clipHelperRef = useRef<THREE.PlaneHelper | null>(null)
  const fpsKeysRef = useRef<Record<string, boolean>>({})
  const fpsLockedRef = useRef(false)
  const fpsEulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const fpsClockRef = useRef(new THREE.Clock(false))

  // Subscribe to imported 3D models
  const imported3DModels = useSyncExternalStore(subscribeImported3DModels, getImported3DModels)

  // Initialize Three.js
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x0a0a0f, 1)
    renderer.localClippingEnabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(120, 80, 120)
    camera.lookAt(100, 0, 70)
    cameraRef.current = camera

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 20
    controls.maxDistance = 400
    controls.maxPolarAngle = Math.PI / 2.05
    controls.target.set(100, 0, 70)
    controlsRef.current = controls

    // Scene background
    sceneRef.current.fog = new THREE.Fog(0x0a0a0f, 200, 500)

    // Animate
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(sceneRef.current, camera)
    }
    animate()

    // Resize
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Rebuild scene on data change
  useEffect(() => {
    buildScene(sceneRef.current, props, entityMapRef.current, imported3DModels)
  }, [
    props.floors, props.activeFloorId, props.zones, props.cameras,
    props.doors, props.blindSpots, props.transitions,
    props.showFov, props.showBlindSpots, props.showTransitions,
    props.selectedEntityId, props.showAllFloors, imported3DModels,
  ])

  // Clipping plane management
  useEffect(() => {
    const renderer = rendererRef.current
    const scene = sceneRef.current
    if (!renderer) return

    // Remove old helper if present
    if (clipHelperRef.current) {
      scene.remove(clipHelperRef.current)
      clipHelperRef.current = null
    }

    if (!props.clipping?.enabled) {
      // Disable clipping
      renderer.clippingPlanes = []
      return
    }

    const { axis, position } = props.clipping

    // Compute building bounds from floors
    const floorsToRender = props.showAllFloors
      ? props.floors
      : props.floors.filter(f => f.id === props.activeFloorId)

    let minX = 0, maxX = 0, minY = -1, maxY = 0, minZ = 0, maxZ = 0
    for (const floor of floorsToRender) {
      const yOff = getFloorYOffset(props.floors, floor.id)
      maxX = Math.max(maxX, floor.widthM)
      maxZ = Math.max(maxZ, floor.heightM)
      maxY = Math.max(maxY, yOff + WALL_HEIGHT + 2)
      minY = Math.min(minY, yOff - FLOOR_THICKNESS)
    }

    // Set clipping plane normal and constant based on axis
    const plane = clippingPlaneRef.current
    const range = { x: maxX - minX, y: maxY - minY, z: maxZ - minZ }
    const absPos = { x: minX, y: minY, z: minZ }

    switch (axis) {
      case 'x':
        plane.normal.set(-1, 0, 0)
        plane.constant = absPos.x + position * range.x
        break
      case 'y':
        plane.normal.set(0, -1, 0)
        plane.constant = absPos.y + position * range.y
        break
      case 'z':
        plane.normal.set(0, 0, -1)
        plane.constant = absPos.z + position * range.z
        break
    }

    renderer.clippingPlanes = [plane]

    // Apply clipping to all materials in scene
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const mat of mats) {
          mat.clippingPlanes = [plane]
          mat.clipShadows = true
        }
      }
    })

    // Add visual helper for the clipping plane
    if (props.clipping.showHelper) {
      const helperSize = Math.max(range.x, range.y, range.z) * 1.2
      const helper = new THREE.PlaneHelper(plane, helperSize, 0xa855f7)
      scene.add(helper)
      clipHelperRef.current = helper
    }
  }, [
    props.clipping?.enabled, props.clipping?.axis,
    props.clipping?.position, props.clipping?.showHelper,
    props.floors, props.activeFloorId, props.showAllFloors,
  ])

  // FPS navigation mode
  useEffect(() => {
    const container = containerRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    const renderer = rendererRef.current
    if (!container || !camera || !renderer) return

    const isFps = props.navMode === 'fps'

    if (!isFps) {
      // Restore orbit controls
      if (controls) controls.enabled = true
      fpsLockedRef.current = false
      fpsClockRef.current.stop()
      document.exitPointerLock?.()
      return
    }

    // Disable orbit controls in FPS mode
    if (controls) controls.enabled = false

    // Set camera to eye level
    const activeFloor = props.floors.find(f => f.id === props.activeFloorId)
    const yOffset = activeFloor ? getFloorYOffset(props.floors, activeFloor.id) : 0
    camera.position.set(
      (activeFloor?.widthM ?? 100) / 2,
      yOffset + 1.7, // eye height
      (activeFloor?.heightM ?? 70) / 2
    )
    camera.rotation.set(0, 0, 0)
    fpsEulerRef.current.set(0, 0, 0, 'YXZ')

    const keys = fpsKeysRef.current

    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true }
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }

    const onMouseMove = (e: MouseEvent) => {
      if (!fpsLockedRef.current) return
      const euler = fpsEulerRef.current
      euler.y -= e.movementX * 0.002
      euler.x -= e.movementY * 0.002
      euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x))
      camera.quaternion.setFromEuler(euler)
    }

    const onPointerLockChange = () => {
      fpsLockedRef.current = document.pointerLockElement === renderer.domElement
    }

    const onClick = () => {
      if (!fpsLockedRef.current) {
        renderer.domElement.requestPointerLock()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    renderer.domElement.addEventListener('click', onClick)

    // FPS movement loop
    fpsClockRef.current.start()
    const moveSpeed = 15 // meters per second

    const direction = new THREE.Vector3()
    const right = new THREE.Vector3()
    const forward = new THREE.Vector3()

    let fpsRaf = 0
    const fpsTick = () => {
      fpsRaf = requestAnimationFrame(fpsTick)
      if (!fpsLockedRef.current) {
        renderer.render(sceneRef.current, camera)
        return
      }

      const delta = Math.min(fpsClockRef.current.getDelta(), 0.1)

      // Compute movement direction from keys
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      right.crossVectors(forward, camera.up).normalize()

      direction.set(0, 0, 0)
      if (keys['KeyW'] || keys['ArrowUp']) direction.add(forward)
      if (keys['KeyS'] || keys['ArrowDown']) direction.sub(forward)
      if (keys['KeyD'] || keys['ArrowRight']) direction.add(right)
      if (keys['KeyA'] || keys['ArrowLeft']) direction.sub(right)

      if (direction.lengthSq() > 0) {
        direction.normalize()
        camera.position.addScaledVector(direction, moveSpeed * delta)
      }

      // Lock Y to eye height
      camera.position.y = yOffset + 1.7

      renderer.render(sceneRef.current, camera)
    }
    fpsRaf = requestAnimationFrame(fpsTick)

    return () => {
      cancelAnimationFrame(fpsRaf)
      fpsClockRef.current.stop()
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      renderer.domElement.removeEventListener('click', onClick)
      // Clear all keys
      for (const key in keys) keys[key] = false
      fpsLockedRef.current = false
      document.exitPointerLock?.()
      // Re-enable orbit controls
      if (controls) controls.enabled = true
    }
  }, [props.navMode, props.floors, props.activeFloorId])

  // Click picking
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!props.onEntityClick || !containerRef.current || !cameraRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, cameraRef.current)

    const meshes = Array.from(entityMapRef.current.keys())
    const intersects = raycaster.intersectObjects(meshes, false)

    if (intersects.length > 0) {
      const hit = entityMapRef.current.get(intersects[0].object)
      if (hit) props.onEntityClick(hit.id, hit.type)
    }
  }, [props.onEntityClick])

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onClick={props.navMode !== 'fps' ? handleClick : undefined}
      style={{ cursor: props.navMode === 'fps' ? 'crosshair' : 'grab' }}
    >
      {/* FPS mode overlay hint */}
      {props.navMode === 'fps' && !fpsLockedRef.current && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-gray-900/80 border border-gray-600 rounded-xl px-6 py-4 text-center backdrop-blur-sm pointer-events-auto">
            <p className="text-sm text-white font-medium mb-1">Vue pieton</p>
            <p className="text-xs text-gray-400">
              Cliquez pour activer · <span className="font-mono text-emerald-400">WASD</span> pour bouger · <span className="font-mono text-gray-300">Echap</span> pour quitter
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
