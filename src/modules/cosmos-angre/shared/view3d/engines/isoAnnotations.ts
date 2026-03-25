// ═══ ISO ANNOTATIONS — Numbered zone labels with leader lines ═══

import type { Zone, Floor } from '../../../proph3t/types'
import type { FloorStackConfig } from '../types/view3dTypes'
import { worldToIso } from './isometricEngine'

export interface ZoneAnnotation {
  zoneId: string
  number: number
  title: string
  subtitle?: string
  side: 'left' | 'right'
}

export function autoGenerateAnnotations(zones: Zone[]): ZoneAnnotation[] {
  return zones.slice(0, 8).map((zone, i) => ({
    zoneId: zone.id,
    number: i + 1,
    title: zone.label,
    subtitle: zone.surfaceM2 ? `${Math.round(zone.surfaceM2)} m\u00B2` : zone.type,
    side: i % 2 === 0 ? 'left' as const : 'right' as const,
  }))
}

export function generateAnnotationsSVG(
  zones: Zone[],
  annotations: ZoneAnnotation[],
  floors: Floor[],
  floorStack: FloorStackConfig[],
  viewBox: { x: number; y: number; w: number; h: number },
  scale: number,
): string {
  if (annotations.length === 0) return ''

  const svg: string[] = []

  for (const ann of annotations) {
    const zone = zones.find(z => z.id === ann.zoneId)
    if (!zone) continue

    const floor = floors.find(f => f.id === zone.floorId)
    if (!floor) continue

    const stack = floorStack.find(s => s.floorId === floor.id)
    if (!stack || !stack.visible) continue

    // Zone center projected to isometric (on top face)
    const cx = (zone.x + zone.w / 2) * floor.widthM
    const cz = (zone.y + zone.h / 2) * floor.heightM
    const fy = stack.baseElevationM + (stack.heightM ?? 4) + 1  // slightly above zone
    const [iX, iY] = worldToIso(cx, fy, cz, scale)

    // Circle position (offset from zone center)
    const circX = iX
    const circY = iY - 8

    // Annotation text position
    const textX = ann.side === 'left' ? viewBox.x + 25 : viewBox.x + viewBox.w - 25
    const anchor = ann.side === 'left' ? 'start' : 'end'
    const textY = circY

    // Leader line
    const lineEndX = ann.side === 'left' ? textX + 60 : textX - 60
    svg.push(`<line x1="${circX.toFixed(1)}" y1="${circY.toFixed(1)}" x2="${lineEndX.toFixed(1)}" y2="${textY.toFixed(1)}" stroke="#222" stroke-width="0.8" stroke-dasharray="3,2"/>`)

    // Numbered circle
    svg.push(`<circle cx="${circX.toFixed(1)}" cy="${circY.toFixed(1)}" r="11" fill="#222"/>`)
    svg.push(`<text x="${circX.toFixed(1)}" y="${(circY + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="white" font-family="system-ui,sans-serif">${ann.number}</text>`)

    // Title + subtitle
    svg.push(`<text x="${textX}" y="${(textY - 4).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="#ddd" font-family="system-ui,sans-serif">${ann.title}</text>`)
    if (ann.subtitle) {
      svg.push(`<text x="${textX}" y="${(textY + 10).toFixed(1)}" text-anchor="${anchor}" font-size="9" fill="#888" font-family="system-ui,sans-serif">${ann.subtitle}</text>`)
    }
  }

  return svg.join('\n')
}
