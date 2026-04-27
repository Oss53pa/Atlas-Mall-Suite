// ═══ <GLBOrFallback> — Charge un GLB ou rend un fallback procédural ═══
//
// Permet de migrer progressivement vers des assets photo-réalistes :
//   • Si MaterialDef.modelUrl est fourni → on tente useGLTF
//   • Si l'URL est manquante ou le chargement échoue → fallback procédural
//
// Pour utiliser :
//   const mat = getMaterial('car_paint')
//   <GLBOrFallback url={mat.modelUrl} scale={mat.modelScale}>
//     <ProceduralCarMeshes />  // affiché si pas de GLB
//   </GLBOrFallback>
//
// Bibliothèques recommandées (CC0) pour peupler MaterialRegistry.modelUrl :
//   • Polyhaven Models : https://polyhaven.com/models
//   • Sketchfab CC0 : filtre "License: CC0"
//   • Quaternius : https://quaternius.com/ (low-poly CC0)
//   • Kenney : https://kenney.nl/assets (CC0 game-ready)

import { Suspense, useState, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'

interface Props {
  readonly url?: string
  readonly scale?: number
  readonly position?: [number, number, number]
  readonly rotation?: [number, number, number]
  /** Fallback procédural rendu si url manquante OU échec de chargement. */
  readonly children: React.ReactNode
}

function GLBLoaded({ url, scale, position, rotation }: { url: string; scale: number; position: [number, number, number]; rotation: [number, number, number] }) {
  const { scene } = useGLTF(url)
  // Clone pour éviter de partager les mêmes meshes entre instances
  const cloned = scene.clone(true)
  return (
    <primitive
      object={cloned}
      scale={scale}
      position={position}
      rotation={rotation}
    />
  )
}

export function GLBOrFallback({ url, scale = 1, position = [0, 0, 0], rotation = [0, 0, 0], children }: Props) {
  const [hasError, setHasError] = useState(false)

  // Reset l'erreur si l'URL change
  useEffect(() => { setHasError(false) }, [url])

  if (!url || hasError) {
    return <>{children}</>
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <ErrorBoundary onError={() => setHasError(true)}>
        <GLBLoaded url={url} scale={scale} position={position} rotation={rotation} />
      </ErrorBoundary>
    </Suspense>
  )
}

// ─── ErrorBoundary minimal pour catch les Suspense throw ──

import { Component, type ReactNode } from 'react'

interface BoundaryProps { children: ReactNode; onError: () => void }
interface BoundaryState { hasError: boolean }

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false }
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }
  componentDidCatch(): void {
    this.props.onError()
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}
