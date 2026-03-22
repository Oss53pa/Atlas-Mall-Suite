// ═══ GLTF/GLB LOADER — Import glTF 2.0 / GLB models into Three.js ═══

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export interface GLTFLoadResult {
  scene: THREE.Group
  meshCount: number
  materialCount: number
  boundingBox: THREE.Box3
  animations: THREE.AnimationClip[]
}

let dracoLoader: DRACOLoader | null = null

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader()
    // Use CDN-hosted Draco decoder for simplicity
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
    dracoLoader.setDecoderConfig({ type: 'js' })
  }
  return dracoLoader
}

export async function loadGLTF(
  file: File,
  onProgress?: (percent: number) => void
): Promise<GLTFLoadResult> {
  const loader = new GLTFLoader()
  loader.setDRACOLoader(getDracoLoader())

  const url = URL.createObjectURL(file)

  try {
    const gltf = await loader.loadAsync(url, (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    const scene = gltf.scene

    // Count meshes and materials
    let meshCount = 0
    const materials = new Set<THREE.Material>()
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++
        const mesh = child as THREE.Mesh
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => materials.add(m))
        } else {
          materials.add(mesh.material)
        }
        // Enable shadows
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    // Compute bounding box
    const boundingBox = new THREE.Box3().setFromObject(scene)

    return {
      scene,
      meshCount,
      materialCount: materials.size,
      boundingBox,
      animations: gltf.animations,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function disposeGLTF(group: THREE.Group) {
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  })
}
