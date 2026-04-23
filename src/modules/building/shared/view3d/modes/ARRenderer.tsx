// ═══ AR RENDERER — @react-three/fiber + @react-three/xr ═══
//
// Refactored from the imperative Three.js version to a declarative
// react-three-fiber scene, using @react-three/xr v5 for WebXR integration.
//
// Benefits over the imperative version:
//   • No manual renderer / scene / camera / animation-loop wiring
//   • <XR> context takes care of session attachment, XR camera, frame loop
//   • useXR() / useHitTest() hooks replace manual requestHitTestSource
//   • Declarative JSX : scene tree is React, not imperative mutations
//   • useFrame() replaces setAnimationLoop and disposes automatically
//
// Design:
//   <Canvas> hosts the WebGL context.
//   <XR sessionInit={...}> drives the immersive-ar session (attached via useARStore).
//   <ARScene> contains the reticle (driven by useHitTest) and the floor plan group.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { XR, useXR, useHitTest } from '@react-three/xr'
import type { EditableSpace } from '../../components/SpaceEditorCanvas'
import {
  buildARFloorPlanGroup,
  disposeARGroup,
} from '../../map-viewer/ar/ARFloorPlanScene'

// ── Props ──────────────────────────────────────────────────────────────────

interface ARRendererProps {
  /** Existing XR session (kept for backward compat with MapViewerAR). */
  session: XRSession
  /** Spaces to render on the floor. */
  spaces: EditableSpace[]
  /** Called when the user first taps → plan is placed. */
  onPlacementChange?: (placed: boolean) => void
  /** Toggling this prop resets the anchor to the current reticle. */
  resetAnchor?: boolean
  /** (Unused with r3f/xr — kept for prop-compat with the old imperative version). */
  hitTestSource?: XRHitTestSource | null
}

// ── Reticle (hit-test surface indicator) ───────────────────────────────────

interface ReticleProps {
  visible: boolean
  onPositionChange?: (pos: THREE.Matrix4) => void
}

/**
 * Hit-test reticle. Uses @react-three/xr's useHitTest hook, which hides the
 * requestHitTestSource/getHitTestResults boilerplate entirely.
 */
function Reticle({ visible, onPositionChange }: ReticleProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const lastPoseRef = useRef<THREE.Matrix4 | null>(null)

  useHitTest((hitMatrix /*, hit */) => {
    if (!meshRef.current) return
    meshRef.current.visible = visible
    hitMatrix.decompose(
      meshRef.current.position,
      meshRef.current.quaternion,
      meshRef.current.scale,
    )
    // Cache the pose so parent can request it on tap
    if (!lastPoseRef.current) lastPoseRef.current = new THREE.Matrix4()
    lastPoseRef.current.copy(hitMatrix)
    onPositionChange?.(hitMatrix)
  })

  return (
    <mesh ref={meshRef} visible={false} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.08, 0.12, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
    </mesh>
  )
}

// ── Floor plan (wraps the imperative builder via <primitive />) ───────────

interface FloorPlanProps {
  spaces: EditableSpace[]
  placedMatrix: THREE.Matrix4 | null
  visible: boolean
}

/**
 * Renders the plan as a THREE.Group (built by `buildARFloorPlanGroup`)
 * wrapped in a <primitive> so we keep the proven geometry builder while
 * moving the container to r3f. Position driven by the XR anchor matrix.
 */
function FloorPlan({ spaces, placedMatrix, visible }: FloorPlanProps) {
  // Rebuild the THREE.Group only when `spaces` changes.
  const group = useMemo(
    () => buildARFloorPlanGroup(spaces, {
      showLabels: true,
      showEdges: true,
      labelHeight: 0.4,
    }),
    [spaces],
  )

  // Dispose old group geometry when we swap groups / unmount.
  useEffect(() => {
    return () => disposeARGroup(group)
  }, [group])

  // Apply the anchor pose every frame once placed (keeps the plan locked to
  // the real-world position even if the renderer updates its world transform).
  useFrame(() => {
    if (!placedMatrix) return
    group.matrix.copy(placedMatrix)
    group.matrix.decompose(group.position, group.quaternion, group.scale)
    group.matrixAutoUpdate = false
  })

  return <primitive object={group} visible={visible} />
}

// ── Ambient light (AR light-estimation handled by r3f/xr if available) ──

function ARLights() {
  return <ambientLight intensity={1.0} color="#ffffff" />
}

// ── Scene (must be inside <XR> to use useHitTest / useXR) ──────────────────

interface ARSceneProps {
  spaces: EditableSpace[]
  onPlacementChange?: (placed: boolean) => void
  resetAnchor: boolean
}

function ARScene({ spaces, onPlacementChange, resetAnchor }: ARSceneProps) {
  const { isPresenting } = useXR()
  const [placedMatrix, setPlacedMatrix] = useState<THREE.Matrix4 | null>(null)
  const lastReticleRef = useRef<THREE.Matrix4 | null>(null)

  const onReticleChange = useCallback((mat: THREE.Matrix4) => {
    if (!lastReticleRef.current) lastReticleRef.current = new THREE.Matrix4()
    lastReticleRef.current.copy(mat)
  }, [])

  // Place the plan : first tap commits the current reticle pose as anchor.
  const placeAtReticle = useCallback(() => {
    if (!lastReticleRef.current) return
    const anchor = new THREE.Matrix4().copy(lastReticleRef.current)
    setPlacedMatrix(anchor)
    onPlacementChange?.(true)
  }, [onPlacementChange])

  // React to the parent's reset-anchor toggle — rebind to current reticle.
  const prevResetRef = useRef(resetAnchor)
  useEffect(() => {
    if (resetAnchor !== prevResetRef.current) {
      prevResetRef.current = resetAnchor
      if (lastReticleRef.current) placeAtReticle()
    }
  }, [resetAnchor, placeAtReticle])

  // Listen to select events from the XR controller / screen tap.
  // @react-three/xr surfaces tap through the canvas onClick when immersive-ar is presenting.
  return (
    <group onClick={placeAtReticle}>
      <ARLights />
      <Reticle visible={isPresenting && placedMatrix === null} onPositionChange={onReticleChange} />
      <FloorPlan spaces={spaces} placedMatrix={placedMatrix} visible={placedMatrix !== null} />
    </group>
  )
}

// ── Entry component ────────────────────────────────────────────────────────

export default function ARRenderer({
  session,
  spaces,
  onPlacementChange,
  resetAnchor = false,
}: ARRendererProps) {
  // Bridge: r3f-xr v5 owns session lifecycle via its own `<XR>` context, but
  // MapViewerAR already requested the session via useARSession. We attach it
  // to the r3f renderer through <XR session={...}> (v5 API accepts this).
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.01, far: 100 }}
      onCreated={({ gl }) => {
        gl.xr.enabled = true
        // Attach the externally-acquired XR session to the r3f renderer.
        // v5 expects `setSession(session)` on the renderer's xr manager.
        void gl.xr.setSession(session as XRSession)
      }}
    >
      <XR>
        <ARScene
          spaces={spaces}
          onPlacementChange={onPlacementChange}
          resetAnchor={resetAnchor}
        />
      </XR>
    </Canvas>
  )
}
