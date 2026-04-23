// ═══ PDF SECURITY REPORT ENGINE ═══
// Generates a multi-page PDF report of the security plan with:
// - Cover page (project info, date, score)
// - Compliance summary (issues by severity)
// - Per-floor stats (coverage, cameras, exits, blind spots)
// - Equipment list (cameras + doors)
// - Optional: plan screenshot embedded

import jsPDF from 'jspdf'
import type { ComplianceReport } from './complianceEngine'

export interface ReportInput {
  projectName: string
  orgName?: string
  erpType?: string
  compliance: ComplianceReport
  cameras: Array<{
    id: string
    label: string
    floorId: string
    floorLabel?: string
    model?: string
    x: number
    y: number
    angle: number
    fov: number
    rangeM: number
    priority?: string
    capexFcfa?: number
  }>
  doors: Array<{
    id: string
    label: string
    floorId: string
    floorLabel?: string
    x: number
    y: number
    isExit?: boolean
    hasBadge?: boolean
    capexFcfa?: number
  }>
  planScreenshots?: Array<{ title: string; dataUrl: string }>
}

const COLORS = {
  primary: [37, 99, 235] as [number, number, number],    // blue-600
  success: [5, 150, 105] as [number, number, number],    // emerald-600
  warning: [245, 158, 11] as [number, number, number],   // amber-500
  critical: [220, 38, 38] as [number, number, number],   // red-600
  gray: [71, 85, 105] as [number, number, number],       // slate-600
  lightGray: [226, 232, 240] as [number, number, number],// slate-200
}

function fmtFCFA(n: number | undefined): string {
  if (!n) return '—'
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export async function generateSecurityReportPDF(input: ReportInput): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 15 // margin

  const drawHeader = (pageNum: number, totalPages?: number) => {
    pdf.setFillColor(...COLORS.primary)
    pdf.rect(0, 0, W, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text(input.projectName, M, 6.5)
    pdf.text(`Rapport Securitaire · ${fmtDateTime(input.compliance.timestamp)}`, W - M, 6.5, { align: 'right' })
    // Footer
    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(7)
    pdf.text(`Page ${pageNum}${totalPages ? '/' + totalPages : ''}`, W / 2, H - 5, { align: 'center' })
  }

  const addTitle = (text: string, size = 18) => {
    pdf.setTextColor(...COLORS.primary)
    pdf.setFontSize(size)
    pdf.setFont('helvetica', 'bold')
    pdf.text(text, M, 24)
    pdf.setDrawColor(...COLORS.primary)
    pdf.setLineWidth(0.6)
    pdf.line(M, 27, W - M, 27)
  }

  let pageNum = 1

  // ─── PAGE 1: Cover ───
  drawHeader(pageNum++)
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(32)
  pdf.setFont('helvetica', 'bold')
  pdf.text('RAPPORT DE', M, 60)
  pdf.text('CONFORMITE', M, 75)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Plan securitaire · Vol. 2', M, 85)

  // Big score
  const score = input.compliance.scorePct
  const scoreColor: [number, number, number] = score >= 80 ? COLORS.success : score >= 60 ? COLORS.warning : COLORS.critical
  pdf.setFillColor(...scoreColor)
  pdf.roundedRect(W - M - 80, 45, 80, 60, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(60)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(Math.round(score)), W - M - 40, 82, { align: 'center' })
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('/ 100 score', W - M - 40, 95, { align: 'center' })

  // Project info box
  pdf.setFillColor(248, 250, 252) // slate-50
  pdf.roundedRect(M, 130, W - 2 * M, 55, 2, 2, 'F')
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PROJET', M + 5, 140)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(30, 41, 59)
  pdf.text(input.projectName, M + 5, 148)
  if (input.orgName) {
    pdf.setFontSize(9)
    pdf.setTextColor(...COLORS.gray)
    pdf.text(input.orgName, M + 5, 155)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('TYPE ERP', M + 85, 140)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(30, 41, 59)
  pdf.text(input.erpType ?? 'shopping-mall', M + 85, 148)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(...COLORS.gray)
  pdf.text('EDITE LE', M + 140, 140)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 41, 59)
  pdf.text(fmtDateTime(input.compliance.timestamp), M + 140, 148)

  // Stats pills at bottom
  pdf.setFontSize(8)
  const pillY = 210
  const pillW = (W - 2 * M - 10) / 4
  const drawPill = (x: number, label: string, value: string, color: [number, number, number]) => {
    pdf.setFillColor(...color)
    pdf.roundedRect(x, pillY, pillW, 22, 2, 2, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.text(value, x + pillW / 2, pillY + 11, { align: 'center' })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.text(label, x + pillW / 2, pillY + 18, { align: 'center' })
  }
  drawPill(M, 'CAMERAS', String(input.cameras.length), COLORS.primary)
  drawPill(M + pillW + 3, 'PORTES/SORTIES', String(input.doors.length), [99, 102, 241])
  drawPill(M + 2 * (pillW + 3), 'CRITIQUES', String(input.compliance.summary.critical), COLORS.critical)
  drawPill(M + 3 * (pillW + 3), 'AVERTISSEMENTS', String(input.compliance.summary.warning), COLORS.warning)

  // ─── PAGE 2: Compliance ───
  pdf.addPage()
  drawHeader(pageNum++)
  addTitle('1 · Synthese conformite')

  let y = 40
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text(
    `${input.compliance.issues.length} probleme(s) detecte(s) au total:`,
    M, y,
  )
  y += 7
  pdf.setFillColor(...COLORS.critical)
  pdf.circle(M + 2, y - 1.5, 1.5, 'F')
  pdf.setTextColor(30, 41, 59)
  pdf.text(`${input.compliance.summary.critical} critique(s)`, M + 6, y)
  pdf.setFillColor(...COLORS.warning)
  pdf.circle(M + 50, y - 1.5, 1.5, 'F')
  pdf.text(`${input.compliance.summary.warning} avertissement(s)`, M + 54, y)
  pdf.setFillColor(...COLORS.primary)
  pdf.circle(M + 110, y - 1.5, 1.5, 'F')
  pdf.text(`${input.compliance.summary.info} info(s)`, M + 114, y)
  y += 10

  // Per-floor stats table
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...COLORS.primary)
  pdf.text('Par etage', M, y)
  y += 5

  const colX = [M, M + 30, M + 80, M + 110, M + 140]
  pdf.setFillColor(...COLORS.lightGray)
  pdf.rect(M, y, W - 2 * M, 7, 'F')
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Etage', colX[0] + 2, y + 5)
  pdf.text('Couverture', colX[1] + 2, y + 5)
  pdf.text('Cameras', colX[2] + 2, y + 5)
  pdf.text('Sorties', colX[3] + 2, y + 5)
  pdf.text('Angles morts', colX[4] + 2, y + 5)
  y += 9

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  for (const fs of input.compliance.floorStats) {
    pdf.text(fs.label ?? fs.floorId, colX[0] + 2, y)
    // Coverage with bar
    const barW = 40
    pdf.setFillColor(...COLORS.lightGray)
    pdf.rect(colX[1] + 2, y - 3, barW, 3, 'F')
    const pct = Math.min(100, fs.coveragePct)
    const col = pct >= 70 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.critical
    pdf.setFillColor(...col)
    pdf.rect(colX[1] + 2, y - 3, (barW * pct) / 100, 3, 'F')
    pdf.text(`${pct.toFixed(0)}%`, colX[1] + 2 + barW + 3, y)
    pdf.text(String(fs.camerasCount), colX[2] + 2, y)
    pdf.text(String(fs.exitsCount), colX[3] + 2, y)
    pdf.text(`${fs.blindSpotsCount} (${fs.blindSpotsAreaSqm.toFixed(0)} m²)`, colX[4] + 2, y)
    y += 6
  }
  y += 5

  // Issue list
  if (input.compliance.issues.length > 0) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(...COLORS.primary)
    pdf.text('Non-conformites detaillees', M, y)
    y += 6

    for (const iss of input.compliance.issues) {
      if (y > H - 30) { pdf.addPage(); drawHeader(pageNum++); y = 25 }
      const color = iss.severity === 'critical' ? COLORS.critical
        : iss.severity === 'warning' ? COLORS.warning : COLORS.primary

      pdf.setFillColor(...color)
      pdf.circle(M + 2, y - 1, 1.3, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(30, 41, 59)
      const title = `[${iss.code}] ${iss.title}`
      pdf.text(title, M + 6, y, { maxWidth: W - 2 * M - 6 })
      y += 4
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...COLORS.gray)
      const descLines = pdf.splitTextToSize(iss.description, W - 2 * M - 6)
      for (const line of descLines) {
        if (y > H - 20) { pdf.addPage(); drawHeader(pageNum++); y = 25 }
        pdf.text(line, M + 6, y)
        y += 3.5
      }
      if (iss.recommendation) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...color)
        const recLines = pdf.splitTextToSize(`→ ${iss.recommendation}`, W - 2 * M - 6)
        for (const line of recLines) {
          if (y > H - 20) { pdf.addPage(); drawHeader(pageNum++); y = 25 }
          pdf.text(line, M + 6, y)
          y += 3.5
        }
      }
      if (iss.normRef) {
        pdf.setFontSize(7)
        pdf.setTextColor(...COLORS.gray)
        pdf.text(`Reference: ${iss.normRef}`, M + 6, y)
        y += 3
      }
      y += 3
    }
  }

  // ─── PAGE: Plan screenshots (if provided) ───
  if (input.planScreenshots && input.planScreenshots.length > 0) {
    for (const shot of input.planScreenshots) {
      pdf.addPage()
      drawHeader(pageNum++)
      addTitle(shot.title)
      const imgW = W - 2 * M
      const imgH = (H - 50) * 0.9
      try {
        pdf.addImage(shot.dataUrl, 'PNG', M, 35, imgW, imgH, undefined, 'MEDIUM')
      } catch (err) {
        pdf.setTextColor(...COLORS.gray)
        pdf.text(`Erreur chargement image: ${String(err).slice(0, 80)}`, M, 50)
      }
    }
  }

  // ─── PAGE: Equipment list ───
  pdf.addPage()
  drawHeader(pageNum++)
  addTitle('2 · Nomenclature equipements')

  y = 40
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...COLORS.primary)
  pdf.text(`Cameras CCTV (${input.cameras.length})`, M, y)
  y += 6

  if (input.cameras.length > 0) {
    const cCols = [M, M + 35, M + 55, M + 80, M + 105, M + 125, M + 150]
    pdf.setFillColor(...COLORS.lightGray)
    pdf.rect(M, y, W - 2 * M, 6, 'F')
    pdf.setFontSize(7)
    pdf.setTextColor(...COLORS.gray)
    pdf.text('Reference', cCols[0] + 1, y + 4)
    pdf.text('Etage', cCols[1] + 1, y + 4)
    pdf.text('Priorite', cCols[2] + 1, y + 4)
    pdf.text('Modele', cCols[3] + 1, y + 4)
    pdf.text('Position (m)', cCols[4] + 1, y + 4)
    pdf.text('FOV · Portee', cCols[5] + 1, y + 4)
    pdf.text('CAPEX', cCols[6] + 1, y + 4)
    y += 7

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(30, 41, 59)
    let capexTotal = 0
    for (const c of input.cameras) {
      if (y > H - 25) { pdf.addPage(); drawHeader(pageNum++); y = 25 }
      pdf.text(c.label, cCols[0] + 1, y)
      pdf.text(c.floorLabel ?? c.floorId, cCols[1] + 1, y)
      pdf.text(c.priority ?? '—', cCols[2] + 1, y)
      pdf.text(c.model ?? '—', cCols[3] + 1, y)
      pdf.text(`${c.x.toFixed(1)}, ${c.y.toFixed(1)}`, cCols[4] + 1, y)
      pdf.text(`${c.fov}° · ${c.rangeM}m`, cCols[5] + 1, y)
      pdf.text(fmtFCFA(c.capexFcfa), cCols[6] + 1, y)
      if (c.capexFcfa) capexTotal += c.capexFcfa
      y += 5
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.primary)
    pdf.text(`Total CAPEX cameras: ${fmtFCFA(capexTotal)}`, W - M, y + 3, { align: 'right' })
    y += 10
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...COLORS.primary)
  pdf.text(`Portes & sorties (${input.doors.length})`, M, y)
  y += 6

  if (input.doors.length > 0) {
    const dCols = [M, M + 40, M + 60, M + 80, M + 100, M + 130]
    pdf.setFillColor(...COLORS.lightGray)
    pdf.rect(M, y, W - 2 * M, 6, 'F')
    pdf.setFontSize(7)
    pdf.setTextColor(...COLORS.gray)
    pdf.text('Reference', dCols[0] + 1, y + 4)
    pdf.text('Etage', dCols[1] + 1, y + 4)
    pdf.text('Type', dCols[2] + 1, y + 4)
    pdf.text('Badge', dCols[3] + 1, y + 4)
    pdf.text('Position (m)', dCols[4] + 1, y + 4)
    pdf.text('CAPEX', dCols[5] + 1, y + 4)
    y += 7

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(30, 41, 59)
    let doorCapex = 0
    for (const d of input.doors) {
      if (y > H - 25) { pdf.addPage(); drawHeader(pageNum++); y = 25 }
      pdf.text(d.label, dCols[0] + 1, y)
      pdf.text(d.floorLabel ?? d.floorId, dCols[1] + 1, y)
      pdf.text(d.isExit ? 'Sortie' : 'Porte', dCols[2] + 1, y)
      pdf.text(d.hasBadge ? 'Oui' : 'Non', dCols[3] + 1, y)
      pdf.text(`${d.x.toFixed(1)}, ${d.y.toFixed(1)}`, dCols[4] + 1, y)
      pdf.text(fmtFCFA(d.capexFcfa), dCols[5] + 1, y)
      if (d.capexFcfa) doorCapex += d.capexFcfa
      y += 5
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(...COLORS.primary)
    pdf.text(`Total CAPEX portes: ${fmtFCFA(doorCapex)}`, W - M, y + 3, { align: 'right' })
  }

  return pdf.output('blob')
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Nomenclature CSV export (equipment list only, for procurement) */
export function generateEquipmentCSV(input: Pick<ReportInput, 'cameras' | 'doors'>): string {
  const lines: string[] = []
  lines.push('Type;Reference;Etage;Priorite/Role;Modele/Ref;X (m);Y (m);Angle;FOV;Portee (m);Badge;Sortie;CAPEX (FCFA)')

  for (const c of input.cameras) {
    lines.push([
      'Camera',
      c.label,
      c.floorLabel ?? c.floorId,
      c.priority ?? '',
      c.model ?? '',
      c.x.toFixed(2),
      c.y.toFixed(2),
      String(c.angle),
      String(c.fov),
      String(c.rangeM),
      '',
      '',
      String(c.capexFcfa ?? ''),
    ].join(';'))
  }
  for (const d of input.doors) {
    lines.push([
      'Porte',
      d.label,
      d.floorLabel ?? d.floorId,
      d.isExit ? 'Sortie' : 'Normale',
      '',
      d.x.toFixed(2),
      d.y.toFixed(2),
      '',
      '',
      '',
      d.hasBadge ? 'Oui' : 'Non',
      d.isExit ? 'Oui' : 'Non',
      String(d.capexFcfa ?? ''),
    ].join(';'))
  }
  return lines.join('\n')
}

export function downloadCSV(csv: string, filename: string) {
  // Add BOM for Excel compatibility with accents
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
