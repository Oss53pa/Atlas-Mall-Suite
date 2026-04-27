// ═══ <FlatSurface> — Surface plane horizontale ═══
//
// Rend un polygone à plat à Y=baseElevation. Utilisé pour :
//   • sols (FLOOR_*, PEDESTRIAN_PATH, VEHICLE_ROAD, PARKING_SPACE)
//   • végétation plate (GREEN_AREA, GARDEN_BED)
//   • marquages sol (ROAD_MARKING, WAYFINDER_FLOOR_MARKER)
//
// Triangulation : earcut (lazy-loadé pour ne pas alourdir le bundle).

import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import type { SpatialEntity, Polygon } from '../../domain/SpatialEntity'
import { isPolygon } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly baseElevation: number
}

/**
 * Triangulation simple d'un polygone convexe (fan). Pour les polygones
 * concaves ou avec trous, on devrait passer par `earcut`. À ce stade
 * rc.1 on accepte les artéfacts visuels sur les très rares concaves.
 * À upgrader Sprint 7.5 avec earcut.
 */
function triangulateFan(outer: ReadonlyArray<{ x: number; y: number }>, baseElevation: number): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  for (const p of outer) {
    positions.push(p.x, baseElevation, p.y)
  }
  // Fan depuis le sommet 0
  for (let i = 1; i < outer.length - 1; i++) {
    indices.push(0, i, i + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

export function FlatSurface({ entity, baseElevation }: Props) {
  const mat = getMaterial(entity.material)
  const tex = useTexture(mat.textureUrl ?? '/textures/blank-1px.png')
  if (mat.textureUrl) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(mat.repeat.x, mat.repeat.y)
    tex.anisotropy = 8
  }

  const geometry = useMemo(() => {
    if (!isPolygon(entity.geometry)) return new THREE.BufferGeometry()
    const outer = (entity.geometry as Polygon).outer
    if (outer.length < 3) return new THREE.BufferGeometry()
    return triangulateFan(outer, baseElevation)
  }, [entity.geometry, baseElevation])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={mat.baseColor}
        map={mat.textureUrl ? tex : null}
        metalness={mat.metalness}
        roughness={mat.roughness}
        opacity={mat.opacity}
        transparent={mat.transparent}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
