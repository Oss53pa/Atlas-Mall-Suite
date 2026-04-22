// ═══ VOL.1 EXPORT SERVICE — XLSX + PDF + PPTX + DXF ═══

import type { Tenant, CommercialSpace, OccupancyStats } from '../store/vol1Types'
import type { Phase } from './phasingEngine'
import { computePhaseMetrics } from './phasingEngine'

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const fmtFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

// ═══ XLSX — Tableau de commercialisation ═══
export async function exportToXLSX(
  tenants: Tenant[], spaces: CommercialSpace[],
  _occupancy: OccupancyStats, phases: Phase[], mallName: string
) {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Atlas Mall Suite Vol.1'
  wb.created = new Date()

  // Sheet 1: Commercialisation
  const s1 = wb.addWorksheet('Commercialisation', { views: [{ state: 'frozen' as const, ySplit: 1 }] })
  s1.columns = [
    { header: 'Cellule', key: 'ref', width: 12 },
    { header: 'Étage', key: 'floor', width: 8 },
    { header: 'Aile', key: 'wing', width: 14 },
    { header: 'Surface (m²)', key: 'area', width: 14 },
    { header: 'Preneur', key: 'tenant', width: 22 },
    { header: 'Secteur', key: 'sector', width: 14 },
    { header: 'Loyer/m²/an (FCFA)', key: 'rent', width: 20 },
    { header: 'Loyer annuel (FCFA)', key: 'annual', width: 22 },
    { header: 'Statut', key: 'status', width: 14 },
    { header: 'Début bail', key: 'start', width: 14 },
    { header: 'Fin bail', key: 'end', width: 14 },
  ]
  const hdr = s1.getRow(1)
  hdr.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  hdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } }

  for (const sp of spaces) {
    const t = tenants.find(t2 => t2.id === sp.tenantId)
    s1.addRow({
      ref: sp.reference, floor: sp.floorLevel, wing: sp.wing, area: sp.areaSqm,
      tenant: t?.brandName ?? '— VACANT —', sector: t?.sector ?? '',
      rent: t?.baseRentFcfa ?? '', annual: t ? t.baseRentFcfa * sp.areaSqm : '',
      status: sp.status === 'occupied' ? 'Occupé' : sp.status === 'vacant' ? 'Vacant' : sp.status === 'reserved' ? 'Réservé' : 'En travaux',
      start: t?.leaseStart ?? '', end: t?.leaseEnd ?? '',
    })
  }

  // Sheet 2: Cellules vacantes
  const s2 = wb.addWorksheet('Cellules vacantes')
  s2.columns = [
    { header: 'Cellule', key: 'ref', width: 12 },
    { header: 'Étage', key: 'floor', width: 8 },
    { header: 'Aile', key: 'wing', width: 14 },
    { header: 'Surface (m²)', key: 'area', width: 14 },
  ]
  s2.getRow(1).font = { bold: true }
  spaces.filter(s => s.status === 'vacant').forEach(sp => {
    s2.addRow({ ref: sp.reference, floor: sp.floorLevel, wing: sp.wing, area: sp.areaSqm })
  })

  // Sheet 3: Synthèse par phase
  const s3 = wb.addWorksheet('Phases')
  s3.addRow(['Phase', 'Date cible', 'Objectif (%)', 'Cellules occupées', 'GLA (m²)', 'Taux (%)', 'Revenu projeté (FCFA)'])
  s3.getRow(1).font = { bold: true }
  for (const phase of phases) {
    const m = computePhaseMetrics(phase, spaces, tenants)
    s3.addRow([phase.name, phase.date, phase.targetOccupancyRate, m.occupiedSpaces, m.occupiedGla, m.occupancyRate, m.revenueFcfa])
  }

  const buf = await wb.xlsx.writeBuffer()
  downloadFile(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `PlanCommercial_${mallName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

// ═══ PDF — Dossier de présentation ═══
export async function exportToPDF(
  tenants: Tenant[], spaces: CommercialSpace[],
  occupancy: OccupancyStats, mallName: string
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Page 1: Synthèse
  doc.setFontSize(22)
  doc.setTextColor(30, 58, 95)
  doc.text(`Plan Commercial — ${mallName}`, 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Document de planification — ${new Date().toLocaleDateString('fr-CI')} — Atlas Mall Suite Vol.1`, 14, 30)

  // KPI boxes
  const kpis = [
    { label: 'Taux d\'occupation', value: `${occupancy.occupancyRate}%` },
    { label: 'Preneurs actifs', value: `${tenants.filter(t => t.status === 'actif').length}` },
    { label: 'GLA occupée', value: `${fmtFcfa(occupancy.occupiedGla)} m²` },
    { label: 'Revenu annuel projeté', value: `${fmtFcfa(occupancy.totalCollectedRent)} FCFA` },
  ]
  kpis.forEach((kpi, i) => {
    const x = 14 + i * 68
    doc.setFillColor(240, 245, 255)
    doc.rect(x, 36, 62, 20, 'F')
    doc.setFontSize(16); doc.setTextColor(30, 58, 95)
    doc.text(kpi.value, x + 31, 47, { align: 'center' })
    doc.setFontSize(8); doc.setTextColor(120, 120, 120)
    doc.text(kpi.label, x + 31, 53, { align: 'center' })
  })

  // Tableau
  autoTable(doc, {
    startY: 62,
    head: [['Cellule', 'Preneur', 'Secteur', 'Surface', 'Loyer/m²/an', 'Loyer annuel', 'Statut']],
    body: spaces.map(sp => {
      const t = tenants.find(t2 => t2.id === sp.tenantId)
      return [
        sp.reference, t?.brandName ?? 'VACANT', t?.sector ?? '—',
        `${sp.areaSqm} m²`,
        t ? `${fmtFcfa(t.baseRentFcfa)} FCFA` : '—',
        t ? `${fmtFcfa(t.baseRentFcfa * sp.areaSqm)} FCFA` : '—',
        sp.status === 'occupied' ? 'Occupé' : sp.status === 'vacant' ? 'Vacant' : sp.status === 'reserved' ? 'Réservé' : 'Travaux',
      ]
    }),
    headStyles: { fillColor: [30, 58, 95], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7); doc.setTextColor(160, 160, 160)
    doc.text(`Généré par Atlas Mall Suite — Proph3t Engine — Page ${i}/${pageCount}`, 14, 205)
  }

  doc.save(`PlanCommercial_${mallName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ═══ PPTX — Présentation DG ═══
export async function exportToPPTX(
  tenants: Tenant[], spaces: CommercialSpace[],
  occupancy: OccupancyStats, phases: Phase[], mallName: string
) {
  const pptxgenjs = await import('pptxgenjs')
  const PptxGenJS = pptxgenjs.default
  const pptx = new PptxGenJS()
  pptx.author = 'Atlas Mall Suite'
  pptx.title = `Plan Commercial — ${mallName}`

  // Slide 1: Title + KPIs
  const s1 = pptx.addSlide()
  s1.background = { fill: '0a1021' }
  s1.addText(`Plan Commercial\n${mallName}`, { x: 0.5, y: 0.5, w: 9, h: 1.5, fontSize: 28, color: 'FFFFFF', fontFace: 'Arial', bold: true })
  s1.addText(`${new Date().toLocaleDateString('fr-CI')} — Atlas Mall Suite Vol.1`, { x: 0.5, y: 2, w: 5, fontSize: 11, color: '808080' })

  const kpiData = [
    { label: 'Occupation', value: `${occupancy.occupancyRate}%` },
    { label: 'Preneurs', value: `${tenants.filter(t => t.status === 'actif').length}` },
    { label: 'GLA', value: `${fmtFcfa(occupancy.occupiedGla)} m²` },
    { label: 'Revenu/an', value: `${(occupancy.totalCollectedRent / 1e6).toFixed(0)}M FCFA` },
  ]
  kpiData.forEach((kpi, i) => {
    const x = 0.5 + i * 2.4
    s1.addShape('rect' as any, { x, y: 3, w: 2.1, h: 1.2, fill: { color: '141e2e' }, line: { color: '1e3a5f', width: 1 }, rectRadius: 0.1 })
    s1.addText(kpi.value, { x, y: 3.1, w: 2.1, h: 0.6, fontSize: 20, color: 'FFFFFF', bold: true, align: 'center' })
    s1.addText(kpi.label, { x, y: 3.7, w: 2.1, h: 0.4, fontSize: 9, color: '808080', align: 'center' })
  })

  // Slide 2: Tenant table
  const s2 = pptx.addSlide()
  s2.background = { fill: '0a1021' }
  s2.addText('Tableau de commercialisation', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 18, color: 'FFFFFF', bold: true })

  const rows: any[][] = [
    [{ text: 'Cellule', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } },
     { text: 'Preneur', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } },
     { text: 'Secteur', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } },
     { text: 'Surface', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } },
     { text: 'Loyer annuel', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } },
     { text: 'Statut', options: { bold: true, color: 'FFFFFF', fill: { color: '1e3a5f' } } }],
  ]
  for (const sp of spaces.slice(0, 16)) {
    const t = tenants.find(t2 => t2.id === sp.tenantId)
    rows.push([
      sp.reference, t?.brandName ?? 'VACANT', t?.sector ?? '—',
      `${sp.areaSqm} m²`, t ? `${fmtFcfa(t.baseRentFcfa * sp.areaSqm)} F` : '—',
      sp.status === 'occupied' ? 'Occupé' : 'Vacant',
    ])
  }
  s2.addTable(rows, { x: 0.5, y: 1, w: 9, fontSize: 8, color: 'CCCCCC', border: { type: 'solid', color: '1e3a5f', pt: 0.5 } })

  // Slide 3: Phases
  const s3 = pptx.addSlide()
  s3.background = { fill: '0a1021' }
  s3.addText('Avancement par phase', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 18, color: 'FFFFFF', bold: true })
  phases.forEach((phase, i) => {
    const m = computePhaseMetrics(phase, spaces, tenants)
    const y = 1.2 + i * 1.4
    s3.addText(phase.name, { x: 0.5, y, w: 3, h: 0.4, fontSize: 14, color: phase.color.replace('#', ''), bold: true })
    s3.addText(`Objectif : ${phase.targetOccupancyRate}% — Actuel : ${m.occupancyRate}% — ${m.occupiedSpaces}/${m.totalSpaces} cellules`, {
      x: 0.5, y: y + 0.4, w: 8, h: 0.3, fontSize: 10, color: '808080' })
    // Progress bar
    s3.addShape('rect' as any, { x: 0.5, y: y + 0.8, w: 8, h: 0.25, fill: { color: '141e2e' }, rectRadius: 0.05 })
    s3.addShape('rect' as any, { x: 0.5, y: y + 0.8, w: 8 * (m.occupancyRate / 100), h: 0.25, fill: { color: phase.color.replace('#', '') }, rectRadius: 0.05 })
  })

  await pptx.writeFile({ fileName: `PlanCommercial_${mallName}_${new Date().toISOString().slice(0, 10)}.pptx` })
}

// ═══ DXF — Plan technique ═══
export function exportToDXF(spaces: CommercialSpace[], tenants: Tenant[], mallName: string) {
  const lines: string[] = []
  const SCALE = 100 // 1 unit = 1m

  // DXF header
  lines.push('0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC')

  // Tables (layers)
  lines.push('0', 'SECTION', '2', 'TABLES')
  lines.push('0', 'TABLE', '2', 'LAYER')
  const layers = [
    { name: 'CELLULES_OCCUPEES', color: 3 },   // green
    { name: 'CELLULES_VACANTES', color: 1 },    // red
    { name: 'CELLULES_RESERVEES', color: 40 },  // orange
    { name: 'LABELS_ENSEIGNES', color: 7 },     // white
    { name: 'COTES', color: 8 },                // gray
  ]
  for (const l of layers) {
    lines.push('0', 'LAYER', '2', l.name, '70', '0', '62', String(l.color), '6', 'CONTINUOUS')
  }
  lines.push('0', 'ENDTAB', '0', 'ENDSEC')

  // Entities
  lines.push('0', 'SECTION', '2', 'ENTITIES')
  for (const sp of spaces) {
    const layer = sp.status === 'occupied' ? 'CELLULES_OCCUPEES' : sp.status === 'vacant' ? 'CELLULES_VACANTES' : 'CELLULES_RESERVEES'
    const x = sp.x * SCALE / 4
    const y = sp.y * SCALE / 4
    const w = sp.w * SCALE / 4
    const h = sp.h * SCALE / 4

    // Rectangle (LWPOLYLINE)
    lines.push('0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1')
    lines.push('10', String(x), '20', String(y))
    lines.push('10', String(x + w), '20', String(y))
    lines.push('10', String(x + w), '20', String(y + h))
    lines.push('10', String(x), '20', String(y + h))

    // Label
    const t = tenants.find(t2 => t2.id === sp.tenantId)
    const label = t ? `${t.brandName} (${sp.areaSqm}m²)` : `${sp.reference} — VACANT (${sp.areaSqm}m²)`
    lines.push('0', 'TEXT', '8', 'LABELS_ENSEIGNES', '10', String(x + w / 2), '20', String(y + h / 2), '40', '1.5', '1', label, '72', '1', '11', String(x + w / 2), '21', String(y + h / 2))

    // Dimension text
    lines.push('0', 'TEXT', '8', 'COTES', '10', String(x + w / 2), '20', String(y - 1), '40', '0.8', '1', `${sp.areaSqm} m²`)
  }
  lines.push('0', 'ENDSEC', '0', 'EOF')

  const content = lines.join('\n')
  downloadFile(new Blob([content], { type: 'application/dxf' }),
    `PlanCommercial_${mallName}_${new Date().toISOString().slice(0, 10)}.dxf`)
}
