// ═══ <SpatialCoreScene> — Vue 3D propulsée par @atlas-studio/spatial-core ═══
//
// Wrapper R3F qui :
//   1. Convertit le modeledPlan (DetectedSpace[]) en SpatialEntity[]
//   2. Monte un Canvas R3F avec caméra + lumières + sol
//   3. Délègue au <SceneRenderer> du spatial-core qui dispatche par type
//
// Avantages vs le Vol3DModule existant :
//   • Source unique de vérité : extrusion/matériau/visibilité 3D dérivés
//     de ENTITY_TYPE_METADATA, plus de table heightResolver à maintenir
//   • Marquages sol restent à plat, volumes bâtis s'élèvent (correct)
//   • Palette MallMap2D unifiée
//   • Composants R3F testés (TreeInstance, WayfinderInstance, etc.)

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, Environment } from '@react-three/drei'
import * as THREE from 'three'
import type { ParsedPlan } from '../planReader/planEngineTypes'
import { detectedSpacesToSpatialEntities } from '../engines/geometry/editableSpaceAdapter'
import { SceneRenderer } from '../../../../../packages/spatial-core/src/rendering/components/SceneRenderer'

interface Props {
  readonly plan: ParsedPlan
  readonly projectId: string
  readonly className?: string
}

function GroundPlane({ width, depth }: { width: number; depth: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width * 1.5, depth * 1.5]} />
      <meshStandardMaterial color="#fafaf6" roughness={0.95} />
    </mesh>
  )
}

function FitCamera({ width, depth }: { width: number; depth: number }) {
  const { camera } = useThree()
  const initialized = useRef(false)
  if (!initialized.current && camera instanceof THREE.PerspectiveCamera) {
    const dist = Math.max(width, depth) * 0.9
    camera.position.set(width / 2 + dist * 0.6, dist * 0.7, depth / 2 + dist * 0.8)
    camera.lookAt(width / 2, 0, depth / 2)
    camera.updateProjectionMatrix()
    initialized.current = true
  }
  return null
}

export function SpatialCoreScene({ plan, projectId, className }: Props) {
  const entities = useMemo(
    () => detectedSpacesToSpatialEntities(plan.spaces, projectId),
    [plan.spaces, projectId],
  )

  const w = plan.bounds.width || 200
  const d = plan.bounds.height || 140
  const cx = plan.bounds.minX + w / 2
  const cz = plan.bounds.minY + d / 2

  return (
    <div className={`w-full h-full relative ${className ?? ''}`} style={{ background: '#cfd8dc' }}>
      <Canvas
        shadows
        camera={{ fov: 45, near: 0.1, far: 5000, position: [cx + 100, 80, cz + 120] }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
      >
        <FitCamera width={w} depth={d} />

        {/* Lights */}
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[cx + 80, 120, cz + 80]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-w}
          shadow-camera-right={w}
          shadow-camera-top={d}
          shadow-camera-bottom={-d}
          shadow-camera-near={0.1}
          shadow-camera-far={500}
        />

        {/* Background */}
        <Sky distance={4500} sunPosition={[100, 60, 100]} inclination={0.45} azimuth={0.25} />

        {/* Ground reference */}
        <GroundPlane width={w} depth={d} />

        {/* Center the scene's origin on its bounds */}
        <group position={[-plan.bounds.minX, 0, -plan.bounds.minY]}>
          <Suspense fallback={null}>
            <SceneRenderer entities={entities} />
          </Suspense>
        </group>

        {/* Camera control */}
        <OrbitControls
          target={[cx, 0, cz]}
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI / 2 - 0.05}
          minDistance={5}
          maxDistance={Math.max(w, d) * 3}
        />

        {/* PBR env light (subtle) */}
        <Environment preset="city" />
      </Canvas>

      {/* Watermark */}
      <div
        className="absolute bottom-3 left-3 px-2 py-1 rounded text-[10px] font-mono"
        style={{ background: 'rgba(15,23,42,0.7)', color: '#cbd5e1' }}
      >
        spatial-core v2.0.0 · {entities.length} entités
      </div>
    </div>
  )
}
