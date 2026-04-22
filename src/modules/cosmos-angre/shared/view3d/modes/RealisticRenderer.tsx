import { useEffect, useRef } from 'react'
import type { View3DData, View3DConfig } from '../types/view3dTypes'
import { buildThreeScene } from '../engines/threeSceneBuilder'

interface Props { data: View3DData; config: View3DConfig }

export default function RealisticRenderer({ data, config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const disposeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current || !data.zones.length) return
    let cancelled = false

    buildThreeScene(containerRef.current, data, { ...config, ssaoEnabled: true }).then(result => {
      if (cancelled) { result.dispose(); return }
      disposeRef.current = result.dispose
    })

    return () => {
      cancelled = true
      disposeRef.current?.()
      disposeRef.current = null
    }
  }, [data.zones.length, data.floors.length, config.lighting, config.showCameras, config.showCameraFOV, config.shadowsEnabled])

  return <div ref={containerRef} className="w-full h-full" />
}
