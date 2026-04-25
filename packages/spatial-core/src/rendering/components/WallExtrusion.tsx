// ═══ <WallExtrusion> — Mur extrudé verticalement ═══
//
// Rend un mur 3D à partir d'un polygone polyline :
//   • polyline → ribbon vertical de hauteur H
//   • CSG soustraction des ouvertures (DOOR_*, WINDOW) viendra Sprint 7.5
//     avec three-bvh-csg en lazy load.
//
// Pour rc.1 : extrusion simple sans CSG. Les ouvertures sont rendues
// séparément (gap visuel acceptable).

import { useMemo } from 'react'
import * as THREE from 'three'
import type { SpatialEntity, Polyline, Polygon } from '../../domain/SpatialEntity'
import { isPolygon, isPolyline } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function WallExtrusion({ entity, height, baseElevation }: Props) {
  const mat = getMaterial(entity.material)

  const geometry = useMemo(() => {
    // 2 cas : polyline (ligne brisée → mur en ruban) ou polygon (cloison fermée)
    let points: ReadonlyArray<{ x: number; y: number }> = []
    let closed = false
    if (isPolyline(entity.geometry)) {
      points = (entity.geometry as Polyline).points
      closed = (entity.geometry as Polyline).closed
    } else if (isPolygon(entity.geometry)) {
      points = (entity.geometry as Polygon).outer
      closed = true
    }
    if (points.length < 2) return new THREE.BufferGeometry()

    // Construction d'une suite de quadrilatères verticaux pour chaque segment.
    const positions: number[] = []
    const indices: number[] = []
    let baseIdx = 0
    const segCount = closed ? points.length : points.length - 1
    for (let i = 0; i < segCount; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      // 4 sommets : a-bas, b-bas, b-haut, a-haut
      positions.push(a.x, baseElevation, a.y)
      positions.push(b.x, baseElevation, b.y)
      positions.push(b.x, baseElevation + height, b.y)
      positions.push(a.x, baseElevation + height, a.y)
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3)
      baseIdx += 4
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [entity.geometry, height, baseElevation])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={mat.baseColor}
        metalness={mat.metalness}
        roughness={mat.roughness}
        opacity={mat.opacity}
        transparent={mat.transparent}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
