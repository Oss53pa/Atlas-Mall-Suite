// ═══ EXPORT PDF APSAD R82 — A1 Vectoriel ═══

import { jsPDF } from 'jspdf'
import 'svg2pdf.js'
import type { Vol2ExportData } from '../cosmos-angre/shared/proph3t/types'
import type { ASPADCartouche } from './exportTypes'
import type { CotationSpec, CalibrationResult } from '../cosmos-angre/shared/planReader/planReaderTypes'
import { renderCotationsOnPDF } from '../cosmos-angre/shared/planReader/cotationEngine'
import { registerPDFFonts, setHeadingFont, setBodyFont } from './pdfFonts'

function hexRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 0, 0]
}

export async function exportASPADPDF(
  data: Vol2ExportData,
  svgElement: SVGSVGElement | null,
  cartouche: ASPADCartouche,
  cotationSpecs?: CotationSpec[],
  calibration?: CalibrationResult | null,
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [841, 594] })
  await registerPDFFonts(doc)

  // Cartouche
  const cx = 640, cy = 500, cw = 190, ch = 85
  doc.setDrawColor(0); doc.setLineWidth(0.5); doc.rect(cx, cy, cw, ch)
  setHeadingFont(doc, 12)
  doc.text('PLAN DE SÉCURITÉ — APSAD R82', cx + cw / 2, cy + 8, { align: 'center' })
  setBodyFont(doc, 8)
  const lines = [
    `Établissement : ${cartouche.projectName}`, `Adresse : ${cartouche.address}`,
    `Type : ${cartouche.establishmentType}`, `Surface : ${cartouche.surface_m2.toLocaleString()} m²`,
    `Date : ${cartouche.date}`, `N° rapport : ${cartouche.reportNumber}`,
    `Version : ${cartouche.version}`, `Auteur : ${cartouche.author}`,
    `Norme : ${cartouche.norm}`, `Visa : ${cartouche.visaResponsable}`,
  ]
  lines.forEach((l, i) => doc.text(l, cx + 5, cy + 18 + i * 6))

  // Legend
  setHeadingFont(doc, 10)
  doc.text('LÉGENDE', cx + cw / 2, 18, { align: 'center' })
  setBodyFont(doc, 7)
  const syms = [
    { l: 'Caméra dôme', c: '#2196F3' }, { l: 'Caméra PTZ', c: '#FF9800' },
    { l: 'Caméra bullet', c: '#4CAF50' }, { l: 'Porte contrôle accès', c: '#F44336' },
    { l: 'Sortie de secours', c: '#4CAF50' }, { l: 'Zone critique (N5)', c: '#FFCDD2' },
    { l: 'Cône de vision', c: '#BBDEFB' }, { l: 'Zone aveugle', c: '#EF9A9A' },
  ]
  syms.forEach((s, i) => {
    const [r, g, b] = hexRgb(s.c); doc.setFillColor(r, g, b)
    doc.circle(cx + 8, 28 + i * 10, 3, 'F'); doc.text(s.l, cx + 18, 30 + i * 10)
  })

  // SVG plan
  if (svgElement) {
    const cloned = svgElement.cloneNode(true) as SVGSVGElement
    await (doc as any).svg(cloned, { x: 10, y: 10, width: 620, height: 540 })
  }

  // Cotation layer on the plan
  if (cotationSpecs && cotationSpecs.length > 0) {
    renderCotationsOnPDF(doc, cotationSpecs, 620, 540)
  }

  // Calibration cartouche
  if (calibration) {
    setBodyFont(doc, 6)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Echelle : 1:${Math.round(1 / (calibration.scaleFactorX || 0.001))} | ` +
      `Calibration : ${calibration.method} | ` +
      `Confiance : ${Math.round(calibration.confidence * 100)}%`,
      10, 555
    )
    doc.setTextColor(0, 0, 0)
  }

  // Camera table
  setHeadingFont(doc, 8)
  doc.text('RÉCAPITULATIF CAMÉRAS', 10, 450)
  setBodyFont(doc, 6)
  const hdrs = ['ID', 'Modèle', 'Étage', 'FOV°', 'Portée(m)', 'Priorité']
  const cws = [30, 50, 25, 20, 25, 25]
  let px = 10
  hdrs.forEach((h, i) => { doc.text(h, px, 458); px += cws[i] })
  data.cameras.slice(0, 40).forEach((cam, row) => {
    px = 10; const ry = 464 + row * 5
    const vals = [cam.id, cam.model, cam.floorId, String(cam.fov), String(cam.rangeM), cam.priority]
    vals.forEach((v, i) => { doc.text(String(v).substring(0, 15), px, ry); px += cws[i] })
  })

  return doc.output('blob')
}
