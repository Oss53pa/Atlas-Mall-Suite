import type { View3DData, View3DConfig, FloorStackConfig, ZoneHeight } from '../types/view3dTypes'
import type { Zone, Floor } from '../../proph3t/types'
import { getMaterialForZone, getMaterial } from './materialsLibrary'
import { getLightSetup } from './lightingEngine'
import { defaultHeightForType } from './heightResolver'

export async function buildThreeScene(
  container: HTMLElement, data: View3DData, config: View3DConfig
): Promise<{
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  renderer: import('three').WebGLRenderer
  controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls
  dispose: () => void
  exportPNG: (res: '1080p' | '4K') => Promise<Blob>
  exportGLB: () => Promise<ArrayBuffer>
}> {
  const THREE = await import('three')
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')

  const w = container.clientWidth, h = container.clientHeight
  const scene = new THREE.Scene()
  const lightSetup = getLightSetup(config.lighting)
  scene.background = new THREE.Color(lightSetup.background)

  // Camera
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000)
  camera.position.set(120, 80, 120)
  camera.lookAt(0, 0, 0)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = config.shadowsEnabled
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.appendChild(renderer.domElement)

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 5, 0)

  // Lights
  const ambient = new THREE.AmbientLight(lightSetup.ambient.color, lightSetup.ambient.intensity)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(lightSetup.directional.color, lightSetup.directional.intensity)
  dir.position.set(lightSetup.directional.x, lightSetup.directional.y, lightSetup.directional.z)
  dir.castShadow = config.shadowsEnabled
  dir.shadow.mapSize.set(2048, 2048)
  scene.add(dir)
  const hemi = new THREE.HemisphereLight(lightSetup.hemisphere.skyColor, lightSetup.hemisphere.groundColor, lightSetup.hemisphere.intensity)
  scene.add(hemi)

  // Build zones
  for (const sc of config.floorStack.filter(s => s.visible)) {
    const floor = data.floors.find(f => f.id === sc.floorId)
    if (!floor) continue
    const floorZones = data.zones.filter(z => z.floorId === floor.id)

    // Floor slab
    const slabMat = getMaterial('floor_slab')
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(floor.widthM, 0.3, floor.heightM),
      new THREE.MeshStandardMaterial({ color: slabMat.color, metalness: slabMat.metalness, roughness: slabMat.roughness })
    )
    slab.position.set(floor.widthM / 2, sc.baseElevationM - 0.15, floor.heightM / 2)
    slab.receiveShadow = true
    scene.add(slab)

    for (const zone of floorZones) {
      const heightCfg = config.zoneHeights.find(h => h.zoneId === zone.id)
      const heightM = heightCfg?.heightM ?? defaultHeightForType(zone.type)

      let matDef = getMaterialForZone(zone.type)
      if (data.sourceVolume === 'vol1' && data.tenants) {
        const tenant = data.tenants.find(t => t.spaceId === zone.id)
        const status = tenant?.status ?? 'vacant'
        matDef = getMaterial(status)
      }

      const mat = new THREE.MeshStandardMaterial({
        color: matDef.color, metalness: matDef.metalness, roughness: matDef.roughness,
        transparent: matDef.opacity < 1, opacity: matDef.opacity * sc.opacity,
        ...(matDef.emissive ? { emissive: new THREE.Color(matDef.emissive), emissiveIntensity: matDef.emissiveIntensity ?? 0 } : {}),
      })

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(zone.w * floor.widthM, heightM, zone.h * floor.heightM), mat)
      mesh.position.set(
        (zone.x + zone.w / 2) * floor.widthM,
        sc.baseElevationM + heightM / 2,
        (zone.y + zone.h / 2) * floor.heightM
      )
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }

  // Vol.2 cameras
  if (data.sourceVolume === 'vol2' && data.cameras && config.showCameras) {
    for (const cam of data.cameras) {
      const floor = data.floors.find(f => f.id === cam.floorId)
      const stack = config.floorStack.find(s => s.floorId === cam.floorId)
      if (!floor || !stack) continue
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: '#1a1a2e', metalness: 0.8, roughness: 0.3 })
      )
      body.position.set(cam.x * floor.widthM, stack.baseElevationM + 2.8, cam.y * floor.heightM)
      body.castShadow = true
      scene.add(body)

      if (config.showCameraFOV) {
        const fovRad = (cam.fov * Math.PI) / 180
        const range = cam.rangeM ?? cam.range * floor.widthM
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(Math.tan(fovRad / 2) * range, range, 24, 1, true),
          new THREE.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
        )
        cone.rotation.x = Math.PI / 2
        cone.position.set(cam.x * floor.widthM, stack.baseElevationM + 2.8, cam.y * floor.heightM + range / 2)
        scene.add(cone)
      }
    }
  }

  // Animation loop
  let animId = 0
  function animate() {
    animId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // Resize handler
  const onResize = () => {
    const nw = container.clientWidth, nh = container.clientHeight
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  }
  window.addEventListener('resize', onResize)

  return {
    scene, camera, renderer, controls,
    dispose: () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
    exportPNG: async (res) => {
      const [pw, ph] = res === '4K' ? [3840, 2160] : [1920, 1080]
      renderer.setSize(pw, ph)
      renderer.render(scene, camera)
      const blob = await new Promise<Blob>((resolve, reject) => {
        renderer.domElement.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed')), 'image/png')
      })
      renderer.setSize(container.clientWidth, container.clientHeight)
      return blob
    },
    exportGLB: async () => {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
      const exporter = new GLTFExporter()
      return new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(scene, (result) => {
          if (result instanceof ArrayBuffer) resolve(result)
          else resolve(new TextEncoder().encode(JSON.stringify(result)).buffer)
        }, reject, { binary: true })
      })
    },
  }
}
