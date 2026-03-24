// ═══ EXPORT SIGNALÉTIQUE PDF A1 ═══

import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import type { Vol3ExportData } from '../cosmos-angre/shared/proph3t/types'

function hexRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 0, 0]
}

export async function exportSignaletiquePDF(data: Vol3ExportData, svgElement: SVGSVGElement | null): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [841, 594] })

  // Cartouche
  const cx = 640, cy = 500, cw = 190, ch = 85
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(cx, cy, cw, ch)
  doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text('PLAN DE SIGNALÉTIQUE', cx + cw / 2, cy + 8, { align: 'center' })
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  const lines = [`Projet : ${data.projectName}`, `Date : ${data.generatedAt}`, `POI : ${data.pois.length}`, `Signalétique : ${data.signageItems.length} éléments`, 'Version : 1.0']
  lines.forEach((l, i) => doc.text(l, cx + 5, cy + 18 + i * 8))

  if (svgElement) {
    const cloned = svgElement.cloneNode(true) as SVGSVGElement
    await (doc as any).svg(cloned, { x: 10, y: 10, width: 620, height: 540 })
  }

  // Legend
  doc.setFontSize(10); doc.setFont('helvetica', 'bold')
  doc.text('LÉGENDE SIGNALÉTIQUE', 645, 18)
  doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  const types = [
    { l: 'Enseigne', c: '#F59E0B' }, { l: 'Sortie', c: '#10B981' }, { l: 'Sortie secours', c: '#EF4444' },
    { l: 'Toilettes', c: '#6366F1' }, { l: 'Ascenseur', c: '#3B82F6' }, { l: 'Escalator', c: '#8B5CF6' },
    { l: 'Parking', c: '#64748B' }, { l: 'Restauration', c: '#EC4899' }, { l: 'Totem', c: '#F97316' },
    { l: 'Service client', c: '#14B8A6' },
  ]
  types.forEach((t, i) => {
    const [r, g, b] = hexRgb(t.c); doc.setFillColor(r, g, b)
    doc.circle(650, 30 + i * 10, 3, 'F'); doc.text(t.l, 658, 32 + i * 10)
  })

  return doc.output('blob')
}
