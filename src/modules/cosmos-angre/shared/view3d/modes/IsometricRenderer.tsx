import React, { useMemo } from 'react'
import type { View3DData, View3DConfig } from '../types/view3dTypes'
import { buildIsoScene, generateIsoSVG } from '../engines/isometricEngine'

interface Props { data: View3DData; config: View3DConfig }

export default function IsometricRenderer({ data, config }: Props) {
  const svgString = useMemo(() => {
    if (!config.floorStack.length || !data.zones.length) return ''
    const scene = buildIsoScene(data, config, 60)
    return generateIsoSVG(scene, data, config)
  }, [data, config])

  if (!svgString) {
    return <div className="flex items-center justify-center h-full text-white/30 text-sm">Aucune zone à afficher</div>
  }

  return (
    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
      <div dangerouslySetInnerHTML={{ __html: svgString }} className="max-w-full max-h-full" />
    </div>
  )
}
