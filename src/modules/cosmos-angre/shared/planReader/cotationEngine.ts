// ═══ MOTEUR DE COTATION POUR EXPORTS PDF ═══

import type { CotationSpec } from './planReaderTypes'
import type { Zone, Camera, Door, SignageItem, Floor } from '../proph3t/types'
import jsPDF from 'jspdf'

// ─── GÉNÉRATION AUTOMATIQUE DES COTES ───

export function generateCotationSpecs(
  floor: Floor,
  zones: Zone[],
  cameras: Camera[],
  doors: Door[],
  _signageItems: SignageItem[],
  options: {
    cotateZones?: boolean
    cotateCameras?: boolean
    cotateDoors?: boolean
    cotateSignage?: boolean
    showSurfaces?: boolean
    showDistances?: boolean
  } = {}
): CotationSpec[] {
  const specs: CotationSpec[] = []
  const {
    cotateZones = true,
    cotateCameras = false,
    cotateDoors = true,
    showSurfaces = true,
  } = options

  const W = floor.widthM
  const H = floor.heightM

  // ─ Cotes de zones ─
  if (cotateZones) {
    for (const zone of zones) {
      const zoneW = zone.w * W
      const zoneH = zone.h * H

      if (zoneW > 2) {
        specs.push({
          id: `cot-zone-w-${zone.id}`,
          type: 'linear',
          point1: [zone.x, zone.y],
          point2: [zone.x + zone.w, zone.y],
          valueM: Math.round(zoneW * 10) / 10,
          displayText: `${Math.round(zoneW * 10) / 10} m`,
          offsetPx: -20,
          textSizePt: 7,
          color: '#38bdf8',
          arrowStyle: 'tick',
          entityType: 'zone',
          entityId: zone.id,
          linkedFloorId: floor.id,
        })
      }

      if (zoneH > 2) {
        specs.push({
          id: `cot-zone-h-${zone.id}`,
          type: 'linear',
          point1: [zone.x + zone.w, zone.y],
          point2: [zone.x + zone.w, zone.y + zone.h],
          valueM: Math.round(zoneH * 10) / 10,
          displayText: `${Math.round(zoneH * 10) / 10} m`,
          offsetPx: 20,
          textSizePt: 7,
          color: '#38bdf8',
          arrowStyle: 'tick',
          entityType: 'zone',
          entityId: zone.id,
          linkedFloorId: floor.id,
        })
      }

      if (showSurfaces) {
        const surface = Math.round(zoneW * zoneH)
        specs.push({
          id: `cot-zone-surf-${zone.id}`,
          type: 'area',
          point1: [zone.x + zone.w / 2, zone.y + zone.h / 2],
          point2: [zone.x + zone.w / 2, zone.y + zone.h / 2],
          valueM: surface,
          displayText: `${surface} m²`,
          offsetPx: 0,
          textSizePt: 8,
          color: '#94a3b8',
          arrowStyle: 'dot',
          entityType: 'zone',
          entityId: zone.id,
          linkedFloorId: floor.id,
        })
      }
    }
  }

  // ─ Cotes de portes ─
  if (cotateDoors) {
    for (const door of doors) {
      specs.push({
        id: `cot-door-${door.id}`,
        type: 'linear',
        point1: [door.x - door.widthM / (2 * W), door.y],
        point2: [door.x + door.widthM / (2 * W), door.y],
        valueM: door.widthM,
        displayText: `${door.widthM * 100} cm`,
        offsetPx: -15,
        textSizePt: 6,
        color: door.isExit ? '#ef4444' : '#f59e0b',
        arrowStyle: 'arrow',
        entityType: 'door',
        entityId: door.id,
        linkedFloorId: floor.id,
      })
    }
  }

  // ─ Distances cameras ─
  if (cotateCameras) {
    for (const cam of cameras) {
      specs.push({
        id: `cot-cam-range-${cam.id}`,
        type: 'linear',
        point1: [cam.x, cam.y],
        point2: [
          cam.x + cam.range * Math.cos(cam.angle * Math.PI / 180),
          cam.y + cam.range * Math.sin(cam.angle * Math.PI / 180),
        ],
        valueM: cam.rangeM,
        displayText: `Portee ${cam.rangeM}m`,
        offsetPx: 10,
        textSizePt: 6,
        color: '#06b6d4',
        arrowStyle: 'arrow',
        entityType: 'camera',
        entityId: cam.id,
        linkedFloorId: floor.id,
      })
    }
  }

  return specs
}

// ─── RENDU DES COTES SUR PDF ───

export function renderCotationsOnPDF(
  pdf: jsPDF,
  specs: CotationSpec[],
  pdfWidthPt: number,
  pdfHeightPt: number
): void {
  const scaleX = pdfWidthPt
  const scaleY = pdfHeightPt

  for (const spec of specs) {
    const x1 = spec.point1[0] * scaleX
    const y1 = spec.point1[1] * scaleY
    const x2 = spec.point2[0] * scaleX
    const y2 = spec.point2[1] * scaleY

    const [r, g, b] = hexToRGB(spec.color)
    pdf.setDrawColor(r, g, b)
    pdf.setTextColor(r, g, b)
    pdf.setFontSize(spec.textSizePt)

    if (spec.type === 'area') {
      pdf.text(spec.displayText, x1, y1, { align: 'center' })
      continue
    }

    const dx = x2 - x1, dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) continue

    const nx = -dy / len * spec.offsetPx
    const ny = dx / len * spec.offsetPx

    // Extension lines
    pdf.setLineWidth(0.3)
    pdf.line(x1, y1, x1 + nx, y1 + ny)
    pdf.line(x2, y2, x2 + nx, y2 + ny)

    // Dimension line
    pdf.setLineWidth(0.5)
    pdf.line(x1 + nx, y1 + ny, x2 + nx, y2 + ny)

    // Arrows / ticks
    if (spec.arrowStyle === 'tick') {
      const tickLen = 3
      const tx = (dy / len) * tickLen, ty = (-dx / len) * tickLen
      pdf.line(x1 + nx - tx, y1 + ny - ty, x1 + nx + tx, y1 + ny + ty)
      pdf.line(x2 + nx - tx, y2 + ny - ty, x2 + nx + tx, y2 + ny + ty)
    } else if (spec.arrowStyle === 'arrow') {
      drawArrowhead(pdf, x1 + nx, y1 + ny, x2 + nx, y2 + ny, 4)
      drawArrowhead(pdf, x2 + nx, y2 + ny, x1 + nx, y1 + ny, 4)
    }

    // Text
    const midX = (x1 + x2) / 2 + nx
    const midY = (y1 + y2) / 2 + ny
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    pdf.text(spec.displayText, midX, midY - 2, {
      align: 'center',
      angle: Math.abs(angle) > 90 ? angle + 180 : angle,
    })
  }
}

function drawArrowhead(pdf: jsPDF, fromX: number, fromY: number, toX: number, toY: number, size: number): void {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const a1X = fromX + size * Math.cos(angle + Math.PI * 0.85)
  const a1Y = fromY + size * Math.sin(angle + Math.PI * 0.85)
  const a2X = fromX + size * Math.cos(angle - Math.PI * 0.85)
  const a2Y = fromY + size * Math.sin(angle - Math.PI * 0.85)
  pdf.setLineWidth(0.4)
  pdf.line(fromX, fromY, a1X, a1Y)
  pdf.line(fromX, fromY, a2X, a2Y)
}

function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}
