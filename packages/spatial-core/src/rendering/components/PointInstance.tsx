// ═══ <PointInstance> — Mobilier ponctuel ═══
//
// Box simple aux dimensions du polygone (ou 1m x 1m si point pur).
// Utilisé pour mobilier (banc, lampadaire, ATM, signalétique générique).

import type { SpatialEntity } from '../../domain/SpatialEntity'
import { isPoint, isPolygon } from '../../domain/SpatialEntity'
import { getMaterial } from '../../domain/MaterialRegistry'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function PointInstance({ entity, height, baseElevation }: Props) {
  const mat = getMaterial(entity.material)
  let cx = 0, cz = 0, w = 1, d = 1
  if (isPoint(entity.geometry)) {
    cx = entity.geometry.point.x
    cz = entity.geometry.point.y
  } else if (isPolygon(entity.geometry)) {
    const outer = entity.geometry.outer
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const p of outer) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minZ) minZ = p.y
      if (p.y > maxZ) maxZ = p.y
    }
    cx = (minX + maxX) / 2
    cz = (minZ + maxZ) / 2
    w = maxX - minX
    d = maxZ - minZ
  }

  return (
    <mesh position={[cx, baseElevation + height / 2, cz]} castShadow receiveShadow>
      <boxGeometry args={[Math.max(0.3, w), height, Math.max(0.3, d)]} />
      <meshStandardMaterial
        color={mat.baseColor}
        metalness={mat.metalness}
        roughness={mat.roughness}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emissive={mat.emissive ?? ('#000000' as any)}
        emissiveIntensity={mat.emissiveIntensity ?? 0}
      />
    </mesh>
  )
}
