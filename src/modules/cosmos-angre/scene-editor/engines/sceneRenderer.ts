// ═══ Scene Editor — Moteur de rendu Three.js ═══
// Gere la scene 3D interactive : placement d'objets, gizmo, eclairage, export PNG

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { SceneData, SceneObject, AmbianceTime } from '../store/sceneEditorTypes'

// ── Eclairage par ambiance ──

const LIGHTING_PRESETS: Record<AmbianceTime, {
  ambient: { color: number; intensity: number }
  directional: { color: number; intensity: number; position: [number, number, number] }
  fog?: { color: number; near: number; far: number }
}> = {
  morning: {
    ambient: { color: 0xfff5e6, intensity: 0.6 },
    directional: { color: 0xffeedd, intensity: 0.9, position: [30, 40, 20] },
  },
  afternoon: {
    ambient: { color: 0xffffff, intensity: 0.7 },
    directional: { color: 0xffffff, intensity: 1.0, position: [50, 60, 30] },
  },
  evening: {
    ambient: { color: 0xffe4c4, intensity: 0.4 },
    directional: { color: 0xff9944, intensity: 0.6, position: [-20, 30, -10] },
    fog: { color: 0x1a1020, near: 20, far: 80 },
  },
  night: {
    ambient: { color: 0x334466, intensity: 0.15 },
    directional: { color: 0x6688aa, intensity: 0.3, position: [0, 50, 0] },
    fog: { color: 0x0a0a1a, near: 10, far: 60 },
  },
}

// ── Classe principale ──

export class SceneRenderer {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  orbitControls: OrbitControls
  transformControls: TransformControls
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()
  groundPlane: THREE.Mesh
  gltfLoader = new GLTFLoader()

  private objectMeshMap = new Map<string, THREE.Object3D>()
  private lightGroup = new THREE.Group()

  onObjectSelected?: (objectId: string | null) => void
  onObjectTransformed?: (objectId: string, position: THREE.Vector3, rotation: THREE.Euler) => void

  constructor(canvas: HTMLCanvasElement) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // pour export PNG
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    // Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0f1a)

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500)
    this.camera.position.set(15, 12, 15)
    this.camera.lookAt(0, 0, 0)

    // Controls
    this.orbitControls = new OrbitControls(this.camera, canvas)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.08
    this.orbitControls.maxPolarAngle = Math.PI / 2.1

    this.transformControls = new TransformControls(this.camera, canvas)
    this.transformControls.addEventListener('dragging-changed', (e) => {
      this.orbitControls.enabled = !e.value
    })
    this.transformControls.addEventListener('objectChange', () => {
      const obj = this.transformControls.object
      if (!obj?.userData.sceneObjectId) return
      this.onObjectTransformed?.(
        obj.userData.sceneObjectId,
        obj.position.clone(),
        obj.rotation.clone()
      )
    })
    // three@0.183 : TransformControls étend Object3D mais le type resolu est
    // `unknown` selon la version de @types/three. Cast explicite.
    this.scene.add(this.transformControls as unknown as THREE.Object3D)

    // Sol
    const groundGeo = new THREE.PlaneGeometry(100, 100)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.0,
    })
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat)
    this.groundPlane.rotation.x = -Math.PI / 2
    this.groundPlane.receiveShadow = true
    this.groundPlane.userData.isGround = true
    this.scene.add(this.groundPlane)

    // Grid
    const grid = new THREE.GridHelper(100, 100, 0x222244, 0x111122)
    grid.position.y = 0.01
    this.scene.add(grid)

    // Lights
    this.scene.add(this.lightGroup)
    this.applyLighting('afternoon')

    // Click handler
    canvas.addEventListener('pointerdown', this.handleClick)
  }

  // ── Eclairage ──

  applyLighting(time: AmbianceTime) {
    this.lightGroup.clear()

    const preset = LIGHTING_PRESETS[time]

    const ambient = new THREE.AmbientLight(preset.ambient.color, preset.ambient.intensity)
    this.lightGroup.add(ambient)

    const dir = new THREE.DirectionalLight(preset.directional.color, preset.directional.intensity)
    dir.position.set(...preset.directional.position)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.left = -40
    dir.shadow.camera.right = 40
    dir.shadow.camera.top = 40
    dir.shadow.camera.bottom = -40
    this.lightGroup.add(dir)

    if (preset.fog) {
      this.scene.fog = new THREE.Fog(preset.fog.color, preset.fog.near, preset.fog.far)
    } else {
      this.scene.fog = null
    }
  }

  // ── Gestion des objets ──

  async addObjectToScene(obj: SceneObject): Promise<void> {
    let mesh: THREE.Object3D

    // Tenter de charger le GLB, fallback sur primitive
    try {
      const gltf = await this.gltfLoader.loadAsync(`/assets/3d/${obj.catalogId}.glb`)
      mesh = gltf.scene
      mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).castShadow = true
          ;(child as THREE.Mesh).receiveShadow = true
        }
      })
    } catch {
      // Fallback : primitive placeholder coloree
      const geo = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({
        color: obj.type === 'character' ? 0x4488ff : obj.type === 'decoration' ? 0x44aa66 : 0xaa6633,
        roughness: 0.6,
      })
      mesh = new THREE.Mesh(geo, mat)
      ;(mesh as THREE.Mesh).castShadow = true
    }

    mesh.position.set(obj.position.x, obj.position.y, obj.position.z)
    mesh.rotation.set(obj.rotation.x, obj.rotation.y, obj.rotation.z)
    mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z)
    mesh.userData.sceneObjectId = obj.id
    mesh.userData.catalogId = obj.catalogId

    this.scene.add(mesh)
    this.objectMeshMap.set(obj.id, mesh)
  }

  removeObjectFromScene(objectId: string) {
    const mesh = this.objectMeshMap.get(objectId)
    if (!mesh) return
    if (this.transformControls.object === mesh) {
      this.transformControls.detach()
    }
    this.scene.remove(mesh)
    this.objectMeshMap.delete(objectId)
  }

  selectMesh(objectId: string | null) {
    if (!objectId) {
      this.transformControls.detach()
      return
    }
    const mesh = this.objectMeshMap.get(objectId)
    if (mesh) {
      this.transformControls.attach(mesh)
    }
  }

  setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
    this.transformControls.setMode(mode)
  }

  // ── Raycasting (selection par clic) ──

  private handleClick = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)

    const meshes = Array.from(this.objectMeshMap.values())
    const allMeshes: THREE.Object3D[] = []
    meshes.forEach(m => m.traverse(child => { if ((child as THREE.Mesh).isMesh) allMeshes.push(child) }))

    const hits = this.raycaster.intersectObjects(allMeshes, false)
    if (hits.length > 0) {
      let target = hits[0].object
      while (target.parent && !target.userData.sceneObjectId) {
        target = target.parent
      }
      if (target.userData.sceneObjectId) {
        this.onObjectSelected?.(target.userData.sceneObjectId)
        return
      }
    }
    this.onObjectSelected?.(null)
  }

  // ── Placement par drag (drop sur le sol) ──

  getDropPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObject(this.groundPlane)
    return hits.length > 0 ? hits[0].point : null
  }

  // ── Resize ──

  resize(width: number, height: number) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  // ── Animation loop ──

  private animationId = 0

  startLoop() {
    const loop = () => {
      this.animationId = requestAnimationFrame(loop)
      this.orbitControls.update()
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  stopLoop() {
    cancelAnimationFrame(this.animationId)
  }

  // ── Export PNG ──

  exportPNG(width = 1920, height = 1080): string {
    const prevW = this.renderer.domElement.width
    const prevH = this.renderer.domElement.height

    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)

    const dataUrl = this.renderer.domElement.toDataURL('image/png')

    // Restaurer
    this.renderer.setSize(prevW, prevH)
    this.camera.aspect = prevW / prevH
    this.camera.updateProjectionMatrix()

    return dataUrl
  }

  // ── Cleanup ──

  dispose() {
    this.stopLoop()
    this.renderer.domElement.removeEventListener('pointerdown', this.handleClick)
    this.transformControls.dispose()
    this.orbitControls.dispose()
    this.renderer.dispose()
    this.objectMeshMap.clear()
  }
}
