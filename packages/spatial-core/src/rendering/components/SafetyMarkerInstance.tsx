// ═══ <SafetyMarkerInstance> — RIA / extincteur / caméra / etc ═══
//
// Boîte simple avec emissive (pictogramme rouge/vert) si défini dans le
// matériau. À enrichir avec des assets GLB Sprint 7.5.

import type { SpatialEntity } from '../../domain/SpatialEntity'
import { isPoint, isPolygon } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function SafetyMarkerInstance({ entity, height, baseElevation }: Props) {
  const mat = getMaterial(entity.material)
  let cx = 0, cz = 0
  if (isPoint(entity.geometry)) {
    cx = entity.geometry.point.x
    cz = entity.geometry.point.y
  } else if (isPolygon(entity.geometry)) {
    const outer = entity.geometry.outer
    let sx = 0, sz = 0
    for (const p of outer) { sx += p.x; sz += p.y }
    cx = sx / outer.length
    cz = sz / outer.length
  }

  const w = 0.35, d = 0.2
  const h = Math.max(0.3, height)

  return (
    <mesh position={[cx, baseElevation + h / 2, cz]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={mat.baseColor}
        metalness={mat.metalness}
        roughness={mat.roughness}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emissive={(mat.emissive ?? mat.baseColor) as any}
        emissiveIntensity={mat.emissiveIntensity ?? 0.4}
      />
    </mesh>
  )
}
