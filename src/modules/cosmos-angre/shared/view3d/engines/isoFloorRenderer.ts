// ═══ ISO FLOOR RENDERER — Floor slab with tile joints ═══

import type { Floor } from '../../../proph3t/types'
import type { FloorStackConfig } from '../types/view3dTypes'
import { worldToIso } from './isoCoords'

export function generateFloorTilesSVG(
  floor: Floor,
  stack: FloorStackConfig,
  scale: number,
  tileSize = 2.0,
  floorColor = '#e8e6e0',
  jointColor = '#d0cec8',
): string {
  const svg: string[] = []
  const baseY = stack.baseElevationM

  // Main floor polygon
  const corners = [
    worldToIso(0, baseY, 0, scale),
    worldToIso(floor.widthM, baseY, 0, scale),
    worldToIso(floor.widthM, baseY, floor.heightM, scale),
    worldToIso(0, baseY, floor.heightM, scale),
  ]
  const pts = corners.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  svg.push(`<polygon points="${pts}" fill="${floorColor}" stroke="${jointColor}" stroke-width="0.3"/>`)

  // Tile joint lines along X axis
  for (let z = tileSize; z < floor.heightM; z += tileSize) {
    const p1 = worldToIso(0, baseY, z, scale)
    const p2 = worldToIso(floor.widthM, baseY, z, scale)
    svg.push(`<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${jointColor}" stroke-width="0.4" opacity="0.5"/>`)
  }

  // Tile joint lines along Z axis
  for (let x = tileSize; x < floor.widthM; x += tileSize) {
    const p1 = worldToIso(x, baseY, 0, scale)
    const p2 = worldToIso(x, baseY, floor.heightM, scale)
    svg.push(`<line x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}" stroke="${jointColor}" stroke-width="0.4" opacity="0.5"/>`)
  }

  return svg.join('\n')
}
