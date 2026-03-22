// ═══ IFC LOADER — Import IFC (Industry Foundation Classes) models ═══
//
// Uses web-ifc-three for browser-based IFC parsing.
// IFC files contain rich BIM metadata (IfcSpace, IfcDoor, IfcWall, etc.)
// which can be mapped to our Zone/Door types.

import * as THREE from 'three'
import { IFCLoader } from 'web-ifc-three'

export interface IFCLoadResult {
  scene: THREE.Group
  meshCount: number
  boundingBox: THREE.Box3
  ifcSpaces: IFCSpace[]
  ifcDoors: IFCDoor[]
}

export interface IFCSpace {
  expressId: number
  name: string
  longName?: string
  area?: number
  floorIndex?: number
}

export interface IFCDoor {
  expressId: number
  name: string
  width?: number
  height?: number
}

export async function loadIFC(
  file: File,
  onProgress?: (percent: number) => void
): Promise<IFCLoadResult> {
  const loader = new IFCLoader()

  // Set WASM path — web-ifc requires the WASM files to be accessible
  // They are bundled with the web-ifc npm package
  try {
    await loader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.44/')
  } catch {
    // Fallback: try node_modules path (dev mode)
    await loader.ifcManager.setWasmPath('/node_modules/web-ifc/')
  }

  const url = URL.createObjectURL(file)

  try {
    const model = await loader.loadAsync(url, (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    // Wrap in a group
    const scene = new THREE.Group()
    scene.add(model)

    // Count meshes
    let meshCount = 0
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++
        const mesh = child as THREE.Mesh
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    const boundingBox = new THREE.Box3().setFromObject(scene)

    // Extract IFC metadata if available
    const ifcSpaces: IFCSpace[] = []
    const ifcDoors: IFCDoor[] = []

    try {
      const ifcManager = loader.ifcManager
      const modelID = model.modelID ?? 0

      // Try to extract IfcSpace entities (type 3856911033)
      const IFCSPACE = 3856911033
      const spaceIds = await ifcManager.getAllItemsOfType(modelID, IFCSPACE, false)
      for (const id of spaceIds) {
        try {
          const props = await ifcManager.getItemProperties(modelID, id)
          ifcSpaces.push({
            expressId: id,
            name: props.Name?.value ?? props.LongName?.value ?? `Space ${id}`,
            longName: props.LongName?.value,
            area: props.GrossFloorArea?.value,
          })
        } catch {
          // Skip malformed entities
        }
      }

      // Try to extract IfcDoor entities (type 395920057)
      const IFCDOOR = 395920057
      const doorIds = await ifcManager.getAllItemsOfType(modelID, IFCDOOR, false)
      for (const id of doorIds) {
        try {
          const props = await ifcManager.getItemProperties(modelID, id)
          ifcDoors.push({
            expressId: id,
            name: props.Name?.value ?? `Door ${id}`,
            width: props.OverallWidth?.value,
            height: props.OverallHeight?.value,
          })
        } catch {
          // Skip malformed entities
        }
      }
    } catch {
      // IFC metadata extraction is best-effort
      console.warn('IFC metadata extraction skipped — model loaded visually only')
    }

    return {
      scene,
      meshCount,
      boundingBox,
      ifcSpaces,
      ifcDoors,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function disposeIFC(group: THREE.Group) {
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
