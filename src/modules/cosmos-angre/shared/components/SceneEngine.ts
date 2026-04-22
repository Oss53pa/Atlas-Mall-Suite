// ═══ SCENE ENGINE — 3D extrusion from 2D plan data ═══
// Builds Three.js scenes from ParsedPlan: walls, floors, colored spaces.
// Supports: perspective, isometric, north/east views, guided tour.

import type { ParsedPlan } from '../planReader/planEngineTypes'

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  orthographic?: boolean
  orthoScale?: number
}

export type SceneViewPreset = '2d-top' | '3d-perspective' | 'isometric' | 'north' | 'east' | 'south' | 'west'

export class SceneEngine {
  private scene: import('three').Scene | null = null
  private renderer: import('three').WebGLRenderer | null = null
  private camera: import('three').PerspectiveCamera | null = null
  private _orthoCamera: import('three').OrthographicCamera | null = null
  private controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls | null = null
  private container: HTMLElement | null = null
  private animFrameId = 0
  private disposed = false
  private plan: ParsedPlan | null = null

  async init(container: HTMLElement): Promise<void> {
    const THREE = await import('three')
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

    this.container = container
    const w = container.clientWidth
    const h = container.clientHeight

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#0f172a')

    // Perspective camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000)
    this.camera.position.set(100, 60, 100)
    this.camera.lookAt(0, 0, 0)

    // Orthographic camera (for isometric)
    const aspect = w / h
    const frustumSize = 100
    this.orthoCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2,
      0.1, 5000
    )

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    container.appendChild(this.renderer.domElement)

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI * 0.85
    this.controls.minDistance = 5
    this.controls.maxDistance = 500

    // Resize handler
    const onResize = () => {
      if (!this.renderer || !this.camera || !container) return
      const rw = container.clientWidth
      const rh = container.clientHeight
      this.camera.aspect = rw / rh
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(rw, rh)
    }
    window.addEventListener('resize', onResize)

    // Render loop
    const animate = () => {
      if (this.disposed) return
      this.animFrameId = requestAnimationFrame(animate)
      this.controls?.update()
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera)
      }
    }
    animate()
  }

  async buildFromPlan(plan: ParsedPlan, wallHeight = 3.5, spaceColors?: Record<string, string>): Promise<void> {
    const THREE = await import('three')
    if (!this.scene) return
    this.plan = plan
    this.scene.clear()

    const { bounds, spaces, wallSegments } = plan
    const cx = bounds.width / 2
    const cz = bounds.height / 2

    // ── FLOOR ──
    const floorGeom = new THREE.PlaneGeometry(bounds.width, bounds.height)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf0ede8,
      roughness: 0.8,
      metalness: 0.1,
    })
    const floorMesh = new THREE.Mesh(floorGeom, floorMat)
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(cx, 0, cz)
    floorMesh.receiveShadow = true
    this.scene.add(floorMesh)

    // ── WALLS from wall segments ──
    for (const seg of wallSegments) {
      const dx = seg.x2 - seg.x1
      const dz = seg.y2 - seg.y1
      const length = Math.sqrt(dx * dx + dz * dz)
      if (length < 0.1) continue

      const thickness = seg.thickness ?? 0.2
      const wallGeom = new THREE.BoxGeometry(length, wallHeight, thickness)
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.6,
      })
      const wallMesh = new THREE.Mesh(wallGeom, wallMat)

      wallMesh.position.set(
        (seg.x1 + seg.x2) / 2,
        wallHeight / 2,
        (seg.y1 + seg.y2) / 2
      )
      wallMesh.rotation.y = -Math.atan2(dz, dx)
      wallMesh.castShadow = true
      wallMesh.receiveShadow = true
      this.scene.add(wallMesh)
    }

    // ── SPACES as colored floor tiles ──
    for (const space of spaces) {
      if (space.polygon.length < 3) continue

      const shape = new THREE.Shape()
      space.polygon.forEach(([x, y], i) => {
        if (i === 0) shape.moveTo(x, y)
        else shape.lineTo(x, y)
      })
      shape.closePath()

      const color = spaceColors?.[space.id] ?? space.color ?? this.spaceTypeToColor(space.type)
      const spaceGeom = new THREE.ShapeGeometry(shape)
      const spaceMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        opacity: 0.6,
        transparent: true,
        roughness: 0.5,
      })
      const spaceMesh = new THREE.Mesh(spaceGeom, spaceMat)
      spaceMesh.rotation.x = -Math.PI / 2
      spaceMesh.position.y = 0.01
      spaceMesh.userData.spaceId = space.id
      spaceMesh.userData.label = space.label
      this.scene.add(spaceMesh)

      // Space label (3D text sprite)
      const sprite = this.createTextSprite(space.label, color)
      sprite.position.set(space.bounds.centerX, 0.5, space.bounds.centerY)
      sprite.scale.set(Math.max(2, space.bounds.width * 0.3), 1, 1)
      this.scene.add(sprite)
    }

    // ── LIGHTING ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(cx + 50, 100, cz + 50)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -bounds.width
    sun.shadow.camera.right = bounds.width
    sun.shadow.camera.top = bounds.height
    sun.shadow.camera.bottom = -bounds.height
    this.scene.add(sun)

    const hemi = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.3)
    this.scene.add(hemi)

    // ── Center controls target ──
    if (this.controls) {
      this.controls.target.set(cx, 0, cz)
      this.controls.update()
    }
    if (this.camera) {
      const d = Math.max(bounds.width, bounds.height)
      this.camera.position.set(cx + d * 0.7, d * 0.5, cz + d * 0.7)
      this.camera.lookAt(cx, 0, cz)
    }
  }

  setView(view: SceneViewPreset): void {
    if (!this.camera || !this.controls || !this.plan) return
    const { bounds } = this.plan
    const cx = bounds.width / 2
    const cz = bounds.height / 2
    const d = Math.max(bounds.width, bounds.height)

    const views: Record<SceneViewPreset, CameraState> = {
      '2d-top': { position: [cx, d * 1.5, cz], target: [cx, 0, cz], fov: 45 },
      '3d-perspective': { position: [cx - d * 0.5, d * 0.6, cz + d * 0.8], target: [cx, 0, cz], fov: 45 },
      'isometric': { position: [cx + d, d, cz + d], target: [cx, 0, cz], fov: 45, orthographic: true, orthoScale: d * 0.6 },
      'north': { position: [cx, d * 0.3, cz - d], target: [cx, 0, cz], fov: 45 },
      'east': { position: [cx + d, d * 0.3, cz], target: [cx, 0, cz], fov: 45 },
      'south': { position: [cx, d * 0.3, cz + d], target: [cx, 0, cz], fov: 45 },
      'west': { position: [cx - d, d * 0.3, cz], target: [cx, 0, cz], fov: 45 },
    }

    const vs = views[view]
    if (!vs) return

    this.camera.position.set(...vs.position)
    this.controls.target.set(...vs.target)
    this.camera.fov = vs.fov
    this.camera.updateProjectionMatrix()
    this.controls.update()
  }

  async startGuidedTour(path: [number, number][]): Promise<void> {
    if (!this.camera || !this.controls || path.length < 2) return

    // Disable orbit controls during tour
    this.controls.enabled = false
    const eyeHeight = 1.65

    for (let i = 0; i < path.length - 1; i++) {
      const [x1, z1] = path[i]
      const [x2, z2] = path[i + 1]
      const steps = 120 // ~2 seconds at 60fps

      for (let s = 0; s < steps; s++) {
        if (this.disposed) return
        const t = s / steps
        const px = x1 + (x2 - x1) * t
        const pz = z1 + (z2 - z1) * t
        this.camera.position.set(px, eyeHeight, pz)
        this.camera.lookAt(x2, eyeHeight, z2)
        await new Promise(r => requestAnimationFrame(r))
      }
    }

    // Re-enable controls
    this.controls.enabled = true
  }

  private spaceTypeToColor(type: string): string {
    const colors: Record<string, string> = {
      parking: '#64748b', restauration: '#f59e0b', commerce: '#3b82f6',
      services: '#14b8a6', loisirs: '#06b6d4', technique: '#ef4444',
      backoffice: '#a77d4c', financier: '#dc2626', sortie_secours: '#22c55e',
      circulation: '#e5e7eb', hotel: '#b38a5a', exterieur: '#84cc16',
    }
    return colors[type] ?? '#3b82f6'
  }

  private createTextSprite(text: string, _color: string): import('three').Sprite {
    // Dynamic import workaround: use sync THREE reference from the scene
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 64
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, 256, 64)
    ctx.font = 'bold 20px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.substring(0, 30), 128, 32)

    // We need THREE for the texture — use the cached module
    const THREE = (this.scene as unknown as { __THREE?: typeof import('three') })?.__THREE
    if (!THREE) {
      // Fallback: return a minimal sprite-like object
      const tempObj = new (Object.getPrototypeOf(this.scene!).constructor as typeof import('three').Object3D)()
      return tempObj as unknown as import('three').Sprite
    }

    const tex = new THREE.CanvasTexture(canvas)
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
    return new THREE.Sprite(mat)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.animFrameId)
    this.controls?.dispose()
    this.renderer?.dispose()
    if (this.renderer?.domElement && this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
    this.scene = null
    this.renderer = null
    this.camera = null
    this.controls = null
  }
}
