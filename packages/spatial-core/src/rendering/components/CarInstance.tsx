// ═══ <CarInstance> — Voiture stylisée procédurale ═══
//
// 4 boîtes : châssis bas + cabine haute + 4 cylindres roues. Coloris
// pseudo-aléatoire stable basé sur l'ID (palette gris/blanc/noir/rouge).

import { useMemo } from 'react'
import type { SpatialEntity } from '../../domain/SpatialEntity'
import { isPoint, isPolygon } from '../../domain/SpatialEntity'

const COLORS = ['#1f2937', '#4b5563', '#94a3b8', '#e5e7eb', '#dc2626', '#1e40af', '#0f172a']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface Props {
  readonly entity: SpatialEntity
}

export function CarInstance({ entity }: Props) {
  let cx = 0, cz = 0, rotation = 0
  if (isPoint(entity.geometry)) {
    cx = entity.geometry.point.x
    cz = entity.geometry.point.y
  } else if (isPolygon(entity.geometry)) {
    const outer = entity.geometry.outer
    let sx = 0, sy = 0
    for (const p of outer) { sx += p.x; sy += p.y }
    cx = sx / outer.length
    cz = sy / outer.length
    // Orientation : segment plus long du polygone détermine l'axe
    if (outer.length >= 2) {
      const dx = outer[1].x - outer[0].x
      const dy = outer[1].y - outer[0].y
      rotation = Math.atan2(dy, dx)
    }
  }

  const color = useMemo(() => {
    const h = hashStr(entity.id)
    return COLORS[h % COLORS.length]
  }, [entity.id])

  // Dimensions standard voiture compacte : 4.5 × 1.8 × 1.5 m
  const L = 4.5, W = 1.8, Hbody = 0.9, Hcabin = 0.55

  return (
    <group position={[cx, 0, cz]} rotation={[0, -rotation, 0]}>
      {/* Châssis */}
      <mesh position={[0, Hbody / 2 + 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, Hbody, W]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Cabine */}
      <mesh position={[0, Hbody + Hcabin / 2 + 0.25, 0]} castShadow>
        <boxGeometry args={[L * 0.55, Hcabin, W * 0.92]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Vitres latérales (transparent foncé) */}
      <mesh position={[0, Hbody + Hcabin / 2 + 0.25, 0]}>
        <boxGeometry args={[L * 0.55 - 0.05, Hcabin - 0.1, W * 0.95]} />
        <meshStandardMaterial color="#0c0c10" metalness={0.1} roughness={0.05} opacity={0.7} transparent />
      </mesh>
      {/* 4 roues — cylindres horizontaux */}
      {[
        [L * 0.32, -W * 0.45], [L * 0.32, W * 0.45],
        [-L * 0.32, -W * 0.45], [-L * 0.32, W * 0.45],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.27, dz]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.27, 0.27, 0.18, 14]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}
