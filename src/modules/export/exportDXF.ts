// ═══ EXPORT DXF ANNOTÉ ═══

import type { Vol2ExportData } from '../building/shared/proph3t/types'

export function exportAnnotatedDXF(data: Vol2ExportData): Blob {
  let dxf = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1027\n0\nENDSEC\n'
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n'
  const layers = [
    { name: 'ATLAS_CAMERAS', color: 5 }, { name: 'ATLAS_DOORS', color: 1 },
    { name: 'ATLAS_ZONES', color: 3 }, { name: 'ATLAS_FOV', color: 4 },
    { name: 'ATLAS_BLINDSPOTS', color: 6 },
  ]
  for (const l of layers) dxf += `0\nLAYER\n2\n${l.name}\n70\n0\n62\n${l.color}\n6\nCONTINUOUS\n`
  dxf += '0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'

  for (const cam of data.cameras) {
    dxf += `0\nCIRCLE\n8\nATLAS_CAMERAS\n10\n${cam.x}\n20\n${cam.y}\n30\n0\n40\n1.5\n`
    dxf += `0\nTEXT\n8\nATLAS_CAMERAS\n10\n${cam.x + 2}\n20\n${cam.y + 2}\n30\n0\n40\n0.8\n1\n${cam.label} (${cam.model})\n`
  }
  for (const door of data.doors) {
    const hw = (door.widthM || 1) / 2
    dxf += `0\nLWPOLYLINE\n8\nATLAS_DOORS\n90\n4\n70\n1\n10\n${door.x - hw}\n20\n${door.y - 0.5}\n10\n${door.x + hw}\n20\n${door.y - 0.5}\n10\n${door.x + hw}\n20\n${door.y + 0.5}\n10\n${door.x - hw}\n20\n${door.y + 0.5}\n`
  }
  for (const z of data.zones) {
    dxf += `0\nLWPOLYLINE\n8\nATLAS_ZONES\n90\n4\n70\n1\n10\n${z.x}\n20\n${z.y}\n10\n${z.x + z.w}\n20\n${z.y}\n10\n${z.x + z.w}\n20\n${z.y + z.h}\n10\n${z.x}\n20\n${z.y + z.h}\n`
    dxf += `0\nTEXT\n8\nATLAS_ZONES\n10\n${z.x + z.w / 2}\n20\n${z.y + z.h / 2}\n30\n0\n40\n1.0\n1\n${z.label}\n`
  }
  for (const bs of data.blindSpots) {
    dxf += `0\nLWPOLYLINE\n8\nATLAS_BLINDSPOTS\n90\n4\n70\n1\n10\n${bs.x}\n20\n${bs.y}\n10\n${bs.x + bs.w}\n20\n${bs.y}\n10\n${bs.x + bs.w}\n20\n${bs.y + bs.h}\n10\n${bs.x}\n20\n${bs.y + bs.h}\n`
  }
  dxf += '0\nENDSEC\n0\nEOF\n'
  return new Blob([dxf], { type: 'application/dxf' })
}
