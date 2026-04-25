// ═══ <TreeInstance> — Arbre stylisé ═══
//
// Tronc cylindrique + feuillage sphérique. À upgrader avec un asset GLB
// si performance acceptable (>500 arbres = instancedMesh recommandé).

import type { SpatialEntity, PointGeometry } from '../../domain/SpatialEntity'
import { isPoint } from '../../domain/SpatialEntity'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
}

export function TreeInstance({ entity, height }: Props) {
  // L'arbre est représenté par un PointGeometry (planté à un endroit précis)
  // ou par le centroid d'un polygone (zone de plantation).
  let cx = 0, cz = 0
  if (isPoint(entity.geometry)) {
    cx = (entity.geometry as PointGeometry).point.x
    cz = (entity.geometry as PointGeometry).point.y
  } else if ('outer' in entity.geometry) {
    const outer = entity.geometry.outer
    let sx = 0, sy = 0
    for (const p of outer) { sx += p.x; sy += p.y }
    cx = sx / outer.length
    cz = sy / outer.length
  }

  const trunkH = height * 0.35
  const crownR = Math.max(0.8, height * 0.25)
  const crownY = trunkH + crownR * 0.7

  return (
    <group position={[cx, 0, cz]}>
      {/* Tronc */}
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, trunkH, 8]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.95} />
      </mesh>
      {/* Feuillage */}
      <mesh position={[0, crownY, 0]} castShadow>
        <sphereGeometry args={[crownR, 12, 8]} />
        <meshStandardMaterial color="#2d5016" roughness={0.9} />
      </mesh>
    </group>
  )
}
