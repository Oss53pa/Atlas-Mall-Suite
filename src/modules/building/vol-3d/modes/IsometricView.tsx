import { useMemo } from 'react'
import { buildIsoScene, generateIsoSVG } from '../engines/isometricEngine'
import { useVol3DStore } from '../store/vol3dStore'
import type { Floor, Zone, Camera, POI, SignageItem, TransitionNode } from '../../shared/proph3t/types'
import type { SceneConfig } from '../store/vol3dTypes'

interface Props {
  floors: Floor[]; zones: Zone[]; cameras: Camera[]; doors: any[]
  pois: POI[]; signageItems: SignageItem[]; transitions: TransitionNode[]; config: SceneConfig
}

export default function IsometricView({ floors, zones, cameras, pois, signageItems, transitions, config }: Props) {
  const setBuilding = useVol3DStore(s => s.setBuilding)
  const setBuildTime = useVol3DStore(s => s.setBuildTime)

  const scene = useMemo(() => {
    const t0 = performance.now()
    setBuilding(true)
    try {
      return buildIsoScene({ floors, zones, cameras, pois, signageItems, transitions, floorStack: config.floorStack, zoneHeights: config.zoneHeights, scale: 60 })
    } finally {
      setBuildTime(performance.now() - t0)
      setBuilding(false)
    }
  }, [floors, zones, cameras, pois, signageItems, transitions, config.floorStack, config.zoneHeights])

  const svgContent = useMemo(() => generateIsoSVG(scene, config), [scene, config])

  return (
    <div className="w-full h-full overflow-hidden relative" id="iso-scene">
      <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: svgContent }} />
      <div className="absolute bottom-3 right-3 text-xs text-white/20">
        Isometrique · {zones.length} zones · {config.zoneHeights.length} hauteurs
      </div>
    </div>
  )
}
