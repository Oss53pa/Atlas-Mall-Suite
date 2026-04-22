import { useEffect, useRef } from 'react'
import { AtlasMallScene } from '../engines/threeSceneBuilder'
import { useVol3DStore } from '../store/vol3dStore'
import type { Floor, Zone, Camera, POI, SignageItem, TransitionNode } from '../../shared/proph3t/types'
import type { SceneConfig } from '../store/vol3dTypes'

interface Props {
  floors: Floor[]; zones: Zone[]; cameras: Camera[]; doors: any[]
  pois: POI[]; signageItems: SignageItem[]; transitions: TransitionNode[]; config: SceneConfig
}

export default function RealisticView({ floors, zones, cameras, pois, signageItems, transitions, config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<AtlasMallScene | null>(null)
  const setBuilding = useVol3DStore(s => s.setBuilding)

  useEffect(() => {
    if (!canvasRef.current) return
    sceneRef.current = new AtlasMallScene(canvasRef.current)
    return () => { sceneRef.current?.dispose(); sceneRef.current = null }
  }, [])

  useEffect(() => {
    if (!sceneRef.current) return
    setBuilding(true)
    sceneRef.current.buildFromData({ floors, zones, cameras, pois, signageItems, transitions, floorStack: config.floorStack, zoneHeights: config.zoneHeights, mode: 'realistic', config })
    setBuilding(false)
  }, [floors, zones, cameras, pois, signageItems, transitions, config])

  useEffect(() => { sceneRef.current?.setViewAngle(config.viewAngle) }, [config.viewAngle])

  useEffect(() => {
    const el = canvasRef.current?.parentElement
    if (!el) return
    const ro = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; sceneRef.current?.resize(width, height) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />
}
