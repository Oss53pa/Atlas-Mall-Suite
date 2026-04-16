import type { Camera, BlindSpot, Floor } from '../../proph3t/types'
import type { IsoEntity, FloorStackConfig, View3DConfig } from '../types/view3dTypes'
import { worldToIso } from './isoCoords'

export function buildCameraEntities(
  cameras: Camera[], floors: Floor[],
  floorStack: FloorStackConfig[], scale: number, config: View3DConfig
): IsoEntity[] {
  if (!config.showCameras) return []
  return cameras.map(cam => {
    const floor = floors.find(f => f.id === cam.floorId)
    const stack = floorStack.find(s => s.floorId === cam.floorId)
    if (!floor || !stack) return null
    const [iX, iY] = worldToIso(
      cam.x * floor.widthM, stack.baseElevationM + 2.8, cam.y * floor.heightM, scale
    )
    return {
      id: cam.id, type: 'camera' as const, isoX: iX, isoY: iY, elevation: 2.8,
      label: cam.label, color: cam.priority === 'critique' ? '#ef4444' : '#3b82f6',
    }
  }).filter((e): e is IsoEntity => e !== null)
}

export function buildBlindSpotOverlaySVG(
  blindSpots: BlindSpot[], floors: Floor[],
  floorStack: FloorStackConfig[], scale: number, config: View3DConfig
): string {
  if (!config.showBlindSpots) return ''
  return blindSpots.map(bs => {
    const floor = floors.find(f => f.id === bs.floorId)
    const stack = floorStack.find(s => s.floorId === bs.floorId)
    if (!floor || !stack) return ''
    const pts = [
      worldToIso(bs.x * floor.widthM, stack.baseElevationM + 0.05, bs.y * floor.heightM, scale),
      worldToIso((bs.x + bs.w) * floor.widthM, stack.baseElevationM + 0.05, bs.y * floor.heightM, scale),
      worldToIso((bs.x + bs.w) * floor.widthM, stack.baseElevationM + 0.05, (bs.y + bs.h) * floor.heightM, scale),
      worldToIso(bs.x * floor.widthM, stack.baseElevationM + 0.05, (bs.y + bs.h) * floor.heightM, scale),
    ]
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z'
    const color = bs.severity === 'critique' ? '#ef444480' : '#f59e0b60'
    return `<path d="${d}" fill="${color}" stroke="#ef4444" stroke-width="0.5" stroke-dasharray="3,2"/>`
  }).join('\n')
}
