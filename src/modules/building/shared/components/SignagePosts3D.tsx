// ═══ <SignagePosts3D> — Rendu 3D de la signalétique placée ═══
//
// Pour chaque PlacedSign du store : crée un mât vertical + une plaque
// orientée caméra (billboard sprite-like). Les dimensions et hauteur de
// pose sont lues depuis SIGNAGE_CATALOG (heightCm, dimensions).
//
// Pour les types « interdiction » (SEC-INT, etc.), un cercle barré rouge
// est superposé. Les types ERP obligatoires émettent une petite halo
// rouge pour les rendre visibles.

import { useMemo } from 'react'
import * as THREE from 'three'
import { useSignagePlacementStore } from '../stores/signagePlacementStore'
import { resolveSignageKind } from '../proph3t/libraries/signageCatalog'

interface Props {
  readonly projectId: string
  /** Pas utilisé — le parent <group> translate déjà la scène par -bounds.min. */
  readonly planMinX?: number
  readonly planMinY?: number
}

export function SignagePosts3D({ projectId }: Props) {
  const allSigns = useSignagePlacementStore(s => s.signs)
  const signs = useMemo(
    () => allSigns.filter(s => s.projectId === projectId),
    [allSigns, projectId],
  )

  if (signs.length === 0) return null

  return (
    <group>
      {signs.map(s => {
        const def = resolveSignageKind(s.kind)
        const postH = (def.heightCm.default / 100) // m
        const panelW = def.dimensions.widthCm / 100
        const panelH = def.dimensions.heightCm / 100
        // Le parent <group> applique déjà l'offset bounds.min → on utilise
        // directement les coords plan.
        const wx = s.x
        const wz = s.y

        const panelY = postH

        return (
          <group key={s.id} position={[wx, 0, wz]}>
            {/* Mât (sauf pour signalétique au sol type DIR-SOL, COM-VIT) */}
            {postH > 0.1 && (
              <mesh position={[0, postH / 2, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, postH, 8]} />
                <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.7} />
              </mesh>
            )}

            {/* Plaque (panneau) */}
            <mesh
              position={[0, postH > 0.1 ? panelY : panelH / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[panelW, panelH, 0.04]} />
              <meshStandardMaterial
                color={def.color}
                roughness={0.5}
                metalness={0.1}
                emissive={def.color}
                emissiveIntensity={0.15}
              />
            </mesh>

            {/* Pictogramme (canvas texture) */}
            <PictoPlane
              icon={def.icon}
              fgColor="#ffffff"
              w={panelW * 0.8}
              h={panelH * 0.8}
              y={postH > 0.1 ? panelY : panelH / 2}
              z={0.025}
            />

            {/* Indicateur ERP : pulse rouge au sol */}
            {def.erpRequired && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.45, 0.55, 24]} />
                <meshBasicMaterial color="#dc2626" transparent opacity={0.6} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Halo "à valider" : ring orange dashed (proxy par triple ring) */}
            {s.needsReview && !s.reviewed && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
                <ringGeometry args={[0.6, 0.75, 32]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

// ─── Sub : plaque texturée avec pictogramme ──────────────

function PictoPlane({
  icon, fgColor, w, h, y, z,
}: {
  icon: string
  fgColor: string
  w: number
  h: number
  y: number
  z: number
}) {
  const tex = useMemo(() => makeIconTexture(icon, fgColor), [icon, fgColor])
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

const TEX_CACHE = new Map<string, THREE.Texture>()

function makeIconTexture(icon: string, fgColor: string): THREE.Texture {
  const cacheKey = `${icon}|${fgColor}`
  const cached = TEX_CACHE.get(cacheKey)
  if (cached) return cached

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = fgColor
  ctx.font = `bold ${size * 0.7}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(icon, size / 2, size / 2 + size * 0.05)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  TEX_CACHE.set(cacheKey, tex)
  return tex
}
