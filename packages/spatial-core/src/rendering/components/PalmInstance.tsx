// ═══ <PalmInstance> — Palmier stylisé ═══
// Tronc cylindrique + 6 palmes en cônes inclinés en couronne.

import type { SpatialEntity } from '../../domain/SpatialEntity'
import { isPoint, isPolygon } from '../../domain/SpatialEntity'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
}

export function PalmInstance({ entity, height }: Props) {
  let cx = 0, cz = 0
  if (isPoint(entity.geometry)) {
    cx = entity.geometry.point.x
    cz = entity.geometry.point.y
  } else if (isPolygon(entity.geometry)) {
    const outer = entity.geometry.outer
    let sx = 0, sy = 0
    for (const p of outer) { sx += p.x; sy += p.y }
    cx = sx / outer.length
    cz = sy / outer.length
  }

  const trunkH = height * 0.85
  const fronds = 6
  const frondL = height * 0.35

  return (
    <group position={[cx, 0, cz]}>
      {/* Tronc */}
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, trunkH, 8]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.95} />
      </mesh>
      {/* Couronne de palmes — cônes inclinés ~45° */}
      {Array.from({ length: fronds }).map((_, i) => {
        const angle = (i / fronds) * Math.PI * 2
        const tilt = -Math.PI / 4
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * frondL * 0.4, trunkH + frondL * 0.3, Math.sin(angle) * frondL * 0.4]}
            rotation={[tilt * Math.cos(angle), -angle, tilt * Math.sin(angle)]}
            castShadow
          >
            <coneGeometry args={[0.3, frondL, 6]} />
            <meshStandardMaterial color="#3a6b1f" roughness={0.85} />
          </mesh>
        )
      })}
    </group>
  )
}
