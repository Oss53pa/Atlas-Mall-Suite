import React, { useEffect, useRef } from 'react'
import type { View3DData, View3DConfig } from '../types/view3dTypes'
import { buildThreeScene } from '../engines/threeSceneBuilder'

interface Props { data: View3DData; config: View3DConfig }

export default function PhotoRenderer({ data, config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const disposeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current || !data.zones.length) return
    let cancelled = false

    buildThreeScene(containerRef.current, data, {
      ...config, ssaoEnabled: true, bloomEnabled: true, shadowsEnabled: true,
    }).then(async result => {
      if (cancelled) { result.dispose(); return }
      // Add bloom post-processing if available
      try {
        const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js')
        const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js')
        const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js')
        const THREE = await import('three')

        const composer = new EffectComposer(result.renderer)
        composer.addPass(new RenderPass(result.scene, result.camera))
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(containerRef.current!.clientWidth, containerRef.current!.clientHeight),
          0.3, 0.4, 0.85
        )
        composer.addPass(bloomPass)
      } catch {
        // Bloom not available — continue without it
      }
      disposeRef.current = result.dispose
    })

    return () => {
      cancelled = true
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [data.zones.length, data.floors.length, config.lighting])

  return <div ref={containerRef} className="w-full h-full" />
}
