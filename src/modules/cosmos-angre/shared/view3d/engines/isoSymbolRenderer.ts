// ═══ ISO SYMBOL RENDERER — Projects symbols into isometric space ═══
// Renders populated symbols (people, furniture, plants) on the isometric view
// Sorts back-to-front for correct visual layering

import type { Zone, Floor } from '../../../proph3t/types'
import type { FloorStackConfig } from '../types/view3dTypes'
import type { SymbolInstance } from './isoSymbolLibrary'
import { renderSymbolSVG } from './isoSymbolLibrary'
import { worldToIso } from './isoCoords'

export function renderSymbolsSVG(
  instances: SymbolInstance[],
  zones: Zone[],
  floors: Floor[],
  floorStack: FloorStackConfig[],
  globalScale: number
): string {
  if (instances.length === 0) return ''

  // Sort back-to-front by depth (x + y in zone space)
  const sorted = [...instances].sort((a, b) => {
    const zA = zones.find(z => z.id === a.zoneId)
    const zB = zones.find(z => z.id === b.zoneId)
    if (!zA || !zB) return 0
    const depthA = (zA.x + zA.w * a.relX) + (zA.y + zA.h * a.relY)
    const depthB = (zB.x + zB.w * b.relX) + (zB.y + zB.h * b.relY)
    return depthA - depthB
  })

  return sorted.map(inst => {
    const zone = zones.find(z => z.id === inst.zoneId)
    if (!zone) return ''

    const floor = floors.find(f => f.id === zone.floorId)
    if (!floor) return ''

    const stack = floorStack.find(s => s.floorId === floor.id)
    if (!stack || !stack.visible) return ''

    // World position: zone origin + relative position within zone
    const wX = (zone.x + zone.w * inst.relX) * floor.widthM
    const wZ = (zone.y + zone.h * inst.relY) * floor.heightM
    const wY = stack.baseElevationM + stack.heightM  // Place on top of zone

    const [iX, iY] = worldToIso(wX, wY, wZ, globalScale)

    const mirrorTransform = inst.mirror ? 'scale(-1,1)' : ''
    const symbolScale = (inst.scale ?? 1) * 0.6  // Scale down for isometric view

    const svgContent = renderSymbolSVG(inst.type, inst.color, symbolScale)

    return `<g transform="translate(${iX.toFixed(1)},${iY.toFixed(1)}) ${mirrorTransform}" opacity="0.85" data-symbol="${inst.id}">
      ${svgContent}
    </g>`
  }).filter(Boolean).join('\n')
}
