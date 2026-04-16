import type { POI, Floor } from '../../proph3t/types'
import type { IsoEntity, FloorStackConfig, View3DConfig } from '../types/view3dTypes'
import { worldToIso } from './isoCoords'

export function buildPOIEntities(
  pois: POI[], floors: Floor[],
  floorStack: FloorStackConfig[], scale: number, config: View3DConfig
): IsoEntity[] {
  if (!config.showPOI) return []
  return pois.map(poi => {
    const floor = floors.find(f => f.id === poi.floorId)
    const stack = floorStack.find(s => s.floorId === poi.floorId)
    if (!floor || !stack) return null
    const [iX, iY] = worldToIso(
      poi.x * floor.widthM, stack.baseElevationM + 0.1, poi.y * floor.heightM, scale
    )
    return { id: poi.id, type: 'poi' as const, isoX: iX, isoY: iY, elevation: 0, label: poi.label, color: poi.color }
  }).filter((e): e is IsoEntity => e !== null)
}

export function buildMomentEntities(
  moments: { id: string; x: number; y: number; floorId: string; number: number; name: string }[],
  floors: Floor[], floorStack: FloorStackConfig[], scale: number, config: View3DConfig
): IsoEntity[] {
  if (!config.showMoments) return []
  return moments.map(m => {
    const floor = floors.find(f => f.id === m.floorId)
    const stack = floorStack.find(s => s.floorId === m.floorId)
    if (!floor || !stack) return null
    const [iX, iY] = worldToIso(
      m.x * floor.widthM, stack.baseElevationM + 3.0, m.y * floor.heightM, scale
    )
    return { id: m.id, type: 'moment' as const, isoX: iX, isoY: iY, elevation: 3.0, label: `${m.number}`, color: '#f59e0b' }
  }).filter((e): e is IsoEntity => e !== null)
}

export function buildWayfindingPathsSVG(
  paths: { id: string; path: [number, number][]; floorId: string; color: string }[],
  floors: Floor[], floorStack: FloorStackConfig[], scale: number, config: View3DConfig
): string {
  if (!config.showWayfinding) return ''
  return paths.map(wp => {
    const floor = floors.find(f => f.id === wp.floorId)
    const stack = floorStack.find(s => s.floorId === wp.floorId)
    if (!floor || !stack) return ''
    const pts = wp.path.map(([nx, ny]) =>
      worldToIso(nx * floor.widthM, stack.baseElevationM + 0.15, ny * floor.heightM, scale)
    )
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    return `<path d="${d}" fill="none" stroke="${wp.color}" stroke-width="2" stroke-dasharray="4,3" stroke-linecap="round" opacity="0.8"/>`
  }).join('\n')
}
