// ═══ <LowVolumeExtrusion> — Volume bas ═══
//
// Comme WallExtrusion mais pour les volumes bas (terre-pleins, jardinières,
// bordures, bancs). Polygone fermé extrudé verticalement avec faces sup/inf.

import { useMemo } from 'react'
import * as THREE from 'three'
import type { SpatialEntity, Polygon } from '../../domain/SpatialEntity'
import { isPolygon } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function LowVolumeExtrusion({ entity, height, baseElevation }: Props) {
  const mat = getMaterial(entity.material)

  const geometry = useMemo(() => {
    if (!isPolygon(entity.geometry)) return new THREE.BufferGeometry()
    const outer = (entity.geometry as Polygon).outer
    if (outer.length < 3) return new THREE.BufferGeometry()

    // Construit Shape Three.js puis ExtrudeGeometry
    const shape = new THREE.Shape()
    shape.moveTo(outer[0].x, outer[0].y)
    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, outer[i].y)
    shape.closePath()

    const g = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 4,
    })
    // Three.js ExtrudeGeometry extrude sur Z. On rotate pour que ce soit Y.
    g.rotateX(-Math.PI / 2)
    g.translate(0, baseElevation, 0)
    g.computeVertexNormals()
    return g
  }, [entity.geometry, height, baseElevation])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={mat.baseColor}
        metalness={mat.metalness}
        roughness={mat.roughness}
      />
    </mesh>
  )
}
