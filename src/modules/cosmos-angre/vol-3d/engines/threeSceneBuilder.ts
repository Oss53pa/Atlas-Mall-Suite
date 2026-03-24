import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import type { Zone, Camera, POI, SignageItem, Floor, TransitionNode } from '../../shared/proph3t/types'
import type { ZoneHeight, FloorStackConfig, SceneConfig, RenderMode, ViewAnglePreset } from '../store/vol3dTypes'
import { getMaterial } from './materialsLibrary'
import { applyLighting } from './lightingEngine'
import { defaultHeightForType } from './isometricEngine'

export class AtlasMallScene {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private animFrameId: number | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#080c14')
    this.scene.fog = new THREE.Fog('#080c14', 80, 200)

    this.camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 500)
    this.camera.position.set(60, 50, 60)

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 200
    this.controls.maxPolarAngle = Math.PI / 2.1

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: '#0a0f1a', roughness: 0.9 }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    this.startRenderLoop()
  }

  buildFromData(input: { floors: Floor[]; zones: Zone[]; cameras: Camera[]; pois: POI[]; signageItems: SignageItem[]; transitions: TransitionNode[]; floorStack: FloorStackConfig[]; zoneHeights: ZoneHeight[]; mode: RenderMode; config: SceneConfig }) {
    // Clear previous objects (keep ground + lights will be replaced)
    const toRemove: THREE.Object3D[] = []
    this.scene.traverse(obj => { if (obj.userData.atlas3d) toRemove.push(obj) })
    toRemove.forEach(o => this.scene.remove(o))

    const { floors, zones, cameras, pois, signageItems, transitions, floorStack, zoneHeights, mode, config } = input

    for (const stackCfg of floorStack.filter(s => s.visible)) {
      const floor = floors.find(f => f.id === stackCfg.floorId)
      if (!floor) continue

      // Floor slab
      if (stackCfg.baseElevationM >= 0) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(floor.widthM, 0.3, floor.heightM), new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.8 }))
        slab.position.set(floor.widthM / 2, stackCfg.baseElevationM - 0.15, floor.heightM / 2)
        slab.receiveShadow = true
        slab.userData.atlas3d = true
        this.scene.add(slab)
      }

      for (const zone of zones.filter(z => z.floorId === floor.id)) {
        const hCfg = zoneHeights.find(h => h.zoneId === zone.id) ?? { zoneId: zone.id, heightM: defaultHeightForType(zone.type), floorThicknessM: 0.3, hasGlazing: false, roofType: 'flat' as const }
        const w = zone.w * floor.widthM, h = hCfg.heightM, d = zone.h * floor.heightM
        const mat = getMaterial(zone.type, mode, hCfg.hasGlazing)
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
        mesh.position.set((zone.x + zone.w / 2) * floor.widthM, stackCfg.baseElevationM + h / 2, (zone.y + zone.h / 2) * floor.heightM)
        mesh.castShadow = true; mesh.receiveShadow = true
        mesh.userData = { atlas3d: true, zoneId: zone.id, zoneType: zone.type, glazing: hCfg.hasGlazing }
        this.scene.add(mesh)
      }

      // Cameras
      if (config.showCameras) {
        for (const cam of cameras.filter(c => c.floorId === floor.id)) {
          const g = new THREE.Group(); g.userData.atlas3d = true
          const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: '#1a1a2e', metalness: 0.8, roughness: 0.3 }))
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.15, 12), new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.9, roughness: 0.1 }))
          lens.rotation.x = Math.PI / 2; lens.position.z = 0.15
          g.add(body, lens)
          if (config.showCameraFOV) {
            const fovRad = (cam.fov * Math.PI) / 180, fovR = cam.rangeM ?? cam.range * floor.widthM
            const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(fovRad / 2) * fovR, fovR, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: mode === 'realistic' ? 0.08 : 0.15, side: THREE.DoubleSide, depthWrite: false }))
            cone.rotation.x = Math.PI / 2; cone.position.z = fovR / 2; g.add(cone)
          }
          g.position.set(cam.x * floor.widthM, stackCfg.baseElevationM + 2.8, cam.y * floor.heightM)
          g.rotation.y = -(cam.angle * Math.PI) / 180
          this.scene.add(g)
        }
      }

      // POIs
      if (config.showPOI) {
        for (const poi of pois.filter(p => p.floorId === floor.id)) {
          const g = new THREE.Group(); g.userData.atlas3d = true
          g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), new THREE.MeshStandardMaterial({ color: '#2a2a2a' })))
          const sp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: new THREE.Color(poi.color), emissive: new THREE.Color(poi.color), emissiveIntensity: 0.3 }))
          sp.position.y = 1.65; g.children[0].position.y = 0.75; g.add(sp)
          g.position.set(poi.x * floor.widthM, stackCfg.baseElevationM, poi.y * floor.heightM)
          this.scene.add(g)
        }
      }

      // Signage
      if (config.showSignage) {
        for (const s of signageItems.filter(si => si.floorId === floor.id)) {
          const g = new THREE.Group(); g.userData.atlas3d = true
          const ph = s.poseHeightM ?? 2.5
          if (s.type.includes('totem')) {
            g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ph, 8), new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.7 })))
            g.children[0].position.y = ph / 2
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: '#1a3a6a', emissive: '#0a1a3a', emissiveIntensity: 0.5, roughness: 0.3 }))
            panel.position.y = ph + 0.4; g.add(panel)
          } else {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: '#1a3a6a' }))
            panel.position.y = ph; g.add(panel)
          }
          g.position.set(s.x * floor.widthM, stackCfg.baseElevationM, s.y * floor.heightM)
          g.rotation.y = -(s.orientationDeg * Math.PI) / 180
          this.scene.add(g)
        }
      }
    }

    applyLighting(this.scene, config.lighting)
    this.fitCameraToScene()
  }

  setViewAngle(preset: ViewAnglePreset) {
    const t = this.controls.target.clone()
    const presets: Record<string, THREE.Vector3> = {
      iso_standard: new THREE.Vector3(60, 50, 60), iso_north_west: new THREE.Vector3(-60, 50, 60),
      iso_north_east: new THREE.Vector3(60, 50, -60), bird_eye: new THREE.Vector3(0, 100, 0.1),
      entrance: new THREE.Vector3(0, 15, 120), food_court: new THREE.Vector3(0, 30, 0),
    }
    const pos = presets[preset]
    if (!pos) return
    this.camera.position.copy(t.clone().add(pos))
    this.camera.lookAt(t)
    this.controls.update()
  }

  private fitCameraToScene() {
    const box = new THREE.Box3().setFromObject(this.scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const dist = maxDim / (2 * Math.tan((this.camera.fov * Math.PI / 180) / 2)) * 1.5
    this.camera.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist * 0.6)
    this.camera.lookAt(center)
    this.controls.target.copy(center)
    this.controls.update()
  }

  private startRenderLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  exportPNG(resolution: '1080p' | '4K'): Promise<Blob> {
    const [w, h] = resolution === '4K' ? [3840, 2160] : [1920, 1080]
    return new Promise((resolve, reject) => {
      const origW = this.renderer.domElement.clientWidth, origH = this.renderer.domElement.clientHeight
      this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix()
      this.renderer.render(this.scene, this.camera)
      this.renderer.domElement.toBlob(blob => {
        this.renderer.setSize(origW, origH); this.camera.aspect = origW / origH; this.camera.updateProjectionMatrix()
        blob ? resolve(blob) : reject(new Error('Export PNG failed'))
      }, 'image/png')
    })
  }

  exportGLB(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter()
      exporter.parse(this.scene, (result) => {
        if (result instanceof ArrayBuffer) resolve(result)
        else reject(new Error('GLB export: unexpected format'))
      }, (error) => reject(error), { binary: true })
    })
  }

  dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
    this.controls.dispose()
    this.renderer.dispose()
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
  }
}
