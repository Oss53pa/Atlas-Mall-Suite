// ═══ <WayfinderInstance> — Totem / panneau directionnel ═══
//
// Mât vertical + tête (rectangle ou cylindre selon type). Pour les types
// `WAYFINDER_FLOOR_MARKER` qui sont à plat, on délègue à FlatSurface
// (le dispatcher s'en charge).

import type { SpatialEntity } from '../../domain/SpatialEntity'
import { isPoint, isPolygon } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function WayfinderInstance({ entity, height, baseElevation }: Props) {
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

  const isTotem = entity.type === 'WAYFINDER_TOTEM' || entity.type === 'YOU_ARE_HERE_POINT'
  const headW = isTotem ? 0.45 : 0.6
  const headH = isTotem ? Math.max(1.2, height * 0.6) : 0.4
  const mastH = height - headH

  return (
    <group position={[cx, baseElevation, cz]}>
      {/* Mât */}
      <mesh position={[0, mastH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, mastH, 8]} />
        <meshStandardMaterial color={mat.baseColor} metalness={mat.metalness} roughness={mat.roughness} />
      </mesh>
      {/* Tête */}
      <mesh position={[0, mastH + headH / 2, 0]} castShadow>
        <boxGeometry args={[headW, headH, 0.08]} />
        <meshStandardMaterial
          color={mat.baseColor}
          metalness={mat.metalness}
          roughness={mat.roughness}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          emissive={(mat.emissive ?? '#1a3a5a') as any}
          emissiveIntensity={mat.emissiveIntensity ?? 0.15}
        />
      </mesh>
    </group>
  )
}
