// ═══ OBJ LOADER — Import OBJ + MTL models into Three.js ═══

import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'

export interface OBJLoadResult {
  scene: THREE.Group
  meshCount: number
  materialCount: number
  boundingBox: THREE.Box3
}

export async function loadOBJ(
  objFile: File,
  mtlFile?: File,
  onProgress?: (percent: number) => void
): Promise<OBJLoadResult> {
  const objLoader = new OBJLoader()

  // Load MTL first if provided
  if (mtlFile) {
    const mtlUrl = URL.createObjectURL(mtlFile)
    try {
      const mtlLoader = new MTLLoader()
      const materials = await mtlLoader.loadAsync(mtlUrl)
      materials.preload()
      objLoader.setMaterials(materials)
    } finally {
      URL.revokeObjectURL(mtlUrl)
    }
  }

  const objUrl = URL.createObjectURL(objFile)
  try {
    const group = await objLoader.loadAsync(objUrl, (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    // Count meshes and materials, enable shadows
    let meshCount = 0
    const materials = new Set<THREE.Material>()
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++
        const mesh = child as THREE.Mesh
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => materials.add(m))
        } else {
          materials.add(mesh.material)
        }
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    // Apply default material if none loaded from MTL
    if (!mtlFile) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.6,
            metalness: 0.2,
          })
        }
      })
    }

    const boundingBox = new THREE.Box3().setFromObject(group)

    return {
      scene: group,
      meshCount,
      materialCount: materials.size,
      boundingBox,
    }
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}

export function disposeOBJ(group: THREE.Group) {
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
