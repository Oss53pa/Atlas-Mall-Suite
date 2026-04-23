// ═══ CONSOLIDATED REPORT ENGINE — Rapport PDF cross-volume (M25) ═══
// Fusionne Vol.1 (Commercial), Vol.2 (Sécurité), Vol.3 (Parcours) + finance
// en un rapport directeur unique (format comité de direction / lender).

import jsPDF from 'jspdf'
import type { GlobalAnalysis } from './floorAnalysisEngine'
import type { PortfolioMetrics } from './realEstateFinance'
import { formatFcfa, formatYears } from './realEstateFinance'

export interface ConsolidatedInput {
  projectName: string
  orgName?: string
  analysisDate: string
  analysis: GlobalAnalysis
  finance?: PortfolioMetrics
  /** Screenshot du plan (data URL) — optionnel. */
  planImageDataUrl?: string
  /** Notes du directeur d'actif. */
  executiveNote?: string
}

function scoreColor(n: number): [number, number, number] {
  if (n >= 75) return [16, 185, 129] // emerald
  if (n >= 55) return [245, 158, 11] // amber
  return [239, 68, 68] // red
}

export function generateConsolidatedReportPDF(input: ConsolidatedInput): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = 210, H = 297
  const margin = 15
  const { analysis } = input

  // ─── Page 1 : Couverture ─────────────────────────────────
  pdf.setFillColor(11, 15, 25)
  pdf.rect(0, 0, W, H, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('ATLAS MALL SUITE — RAPPORT DIRECTEUR D\'ACTIF', margin, 20)

  pdf.setFontSize(28)
  pdf.text(input.projectName, margin, 50)
  if (input.orgName) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(input.orgName, margin, 58)
  }

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(150, 160, 175)
  pdf.text(`Date d'analyse : ${new Date(input.analysisDate).toLocaleDateString('fr-FR')}`, margin, 70)
  pdf.text(`${analysis.floors.length} étage(s) analysé(s)`, margin, 76)

  // Cadre score global
  const bigScore = analysis.overall.global
  const [r, g, b] = scoreColor(bigScore)
  pdf.setFillColor(r, g, b)
  pdf.roundedRect(margin, 95, 80, 50, 4, 4, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(48)
  pdf.text(`${bigScore}`, margin + 5, 128)
  pdf.setFontSize(10)
  pdf.text('SCORE GLOBAL /100', margin + 5, 140)

  // Scores par volume
  const volScores = [
    { label: 'Commercial', value: analysis.overall.commercial },
    { label: 'Sécurité', value: analysis.overall.securitaire },
    { label: 'Parcours', value: analysis.overall.parcours },
  ]
  let sy = 95
  for (const v of volScores) {
    const [vr, vg, vb] = scoreColor(v.value)
    pdf.setFillColor(20, 28, 45)
    pdf.roundedRect(margin + 90, sy, 90, 14, 2, 2, 'F')
    pdf.setTextColor(vr, vg, vb)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${v.value}`, margin + 95, sy + 10)
    pdf.setTextColor(200, 210, 225)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text(v.label, margin + 115, sy + 9)
    sy += 18
  }

  // Finance si dispo
  if (input.finance) {
    pdf.setTextColor(180, 190, 205)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('INDICATEURS FINANCIERS', margin, 170)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(220, 230, 245)
    const f = input.finance
    const lines = [
      ['GRI (loyers bruts annuels)', formatFcfa(f.griFcfa)],
      ['NOI (revenu net)', formatFcfa(f.noiFcfa)],
      ['WALE (durée baux pondérée)', formatYears(f.waleYears)],
      ['Loyer moyen FCFA/m²/an', Math.round(f.avgRentPerSqmYear).toLocaleString('fr-FR')],
      ['Top tenant concentration', `${f.topTenantConcentrationPct.toFixed(1)} %`],
    ]
    if (f.capRatePct !== undefined) lines.push(['Cap rate', `${f.capRatePct.toFixed(2)} %`])
    if (f.expiringIn12Months > 0) lines.push(['Baux expirant < 12 mois', String(f.expiringIn12Months)])

    let fy = 178
    for (const [k, v] of lines) {
      pdf.setTextColor(150, 160, 175)
      pdf.text(k, margin, fy)
      pdf.setTextColor(255, 255, 255)
      pdf.text(v, margin + 90, fy)
      fy += 6
    }
  }

  // Note exécutive
  if (input.executiveNote) {
    pdf.setTextColor(180, 190, 205)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('NOTE EXÉCUTIVE', margin, 240)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(220, 230, 245)
    const wrapped = pdf.splitTextToSize(input.executiveNote, W - 2 * margin)
    pdf.text(wrapped, margin, 248)
  }

  // ─── Page 2 : Synthèse par étage ─────────────────────────
  pdf.addPage()
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, W, H, 'F')
  pdf.setTextColor(25, 35, 55)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('Synthèse par étage', margin, 25)

  let py = 35
  for (const fl of analysis.floors) {
    if (py > H - 60) { pdf.addPage(); py = 25 }

    // Header étage avec score
    const [cr, cg, cb] = scoreColor(fl.globalScore)
    pdf.setFillColor(cr, cg, cb)
    pdf.roundedRect(margin, py, 20, 20, 2, 2, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.text(`${fl.globalScore}`, margin + 3, py + 13)

    pdf.setTextColor(25, 35, 55)
    pdf.setFontSize(13)
    pdf.text(fl.floorLabel, margin + 25, py + 8)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(100, 115, 130)
    pdf.text(`Score global`, margin + 25, py + 14)

    // Les 3 volumes en ligne
    const vols = [
      { n: 'Sécurité', s: fl.securitaire.score, sub: `${fl.securitaire.coveragePct.toFixed(0)}% couv · ${fl.securitaire.camerasCount} caméras` },
      { n: 'Commercial', s: fl.commercial.score, sub: `${fl.commercial.gla.toFixed(0)} m² · ${fl.commercial.occupancyPct.toFixed(0)}% occup.` },
      { n: 'Parcours', s: fl.parcours.score, sub: `${fl.parcours.poisCount} POI · wayfinding ${fl.parcours.wayfindingScore}%` },
    ]
    let vx = margin + 90
    for (const v of vols) {
      const [vr2, vg2, vb2] = scoreColor(v.s)
      pdf.setDrawColor(220, 225, 235)
      pdf.setLineWidth(0.2)
      pdf.rect(vx, py, 34, 20)
      pdf.setTextColor(vr2, vg2, vb2)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.text(`${v.s}`, vx + 2, py + 10)
      pdf.setTextColor(60, 70, 90)
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'bold')
      pdf.text(v.n, vx + 12, py + 7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 115, 130)
      pdf.text(v.sub, vx + 2, py + 17, { maxWidth: 32 })
      vx += 36
    }
    py += 25

    // Priorités
    if (fl.priorities.length > 0) {
      pdf.setFontSize(8)
      pdf.setTextColor(60, 70, 90)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Priorités :', margin + 25, py)
      pdf.setFont('helvetica', 'normal')
      let prioY = py + 4
      for (const p of fl.priorities.slice(0, 3)) {
        const vcol = p.volume === 'sec' ? [59, 130, 246] : p.volume === 'com' ? [245, 158, 11] : [16, 185, 129]
        pdf.setTextColor(vcol[0], vcol[1], vcol[2])
        pdf.setFont('helvetica', 'bold')
        pdf.text(p.volume.toUpperCase(), margin + 25, prioY)
        pdf.setTextColor(60, 70, 90)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`· ${p.title}`, margin + 35, prioY, { maxWidth: W - 2 * margin - 40 })
        prioY += 4
      }
      py = prioY + 2
    }
    py += 4
  }

  // ─── Page suivante : Top priorités consolidées ───────────
  if (analysis.topPriorities.length > 0) {
    pdf.addPage()
    pdf.setTextColor(25, 35, 55)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.text('Top priorités consolidées', margin, 25)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(100, 115, 130)
    pdf.text('Actions prioritaires identifiées tous volumes confondus', margin, 32)

    let tpy = 45
    for (let i = 0; i < Math.min(analysis.topPriorities.length, 20); i++) {
      if (tpy > H - 20) { pdf.addPage(); tpy = 25 }
      const p = analysis.topPriorities[i]
      const sevColor = p.severity === 'critical' ? [239, 68, 68] : p.severity === 'warning' ? [245, 158, 11] : [100, 115, 130]
      pdf.setFillColor(sevColor[0], sevColor[1], sevColor[2])
      pdf.circle(margin + 2, tpy + 2, 1.2, 'F')

      const volColor = p.volume === 'sec' ? [59, 130, 246] : p.volume === 'com' ? [245, 158, 11] : [16, 185, 129]
      pdf.setTextColor(volColor[0], volColor[1], volColor[2])
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.text(p.volume.toUpperCase(), margin + 6, tpy + 3)

      pdf.setTextColor(100, 115, 130)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.text(p.floorId, margin + 16, tpy + 3)

      pdf.setTextColor(25, 35, 55)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(p.title, margin + 28, tpy + 3, { maxWidth: W - 2 * margin - 30 })
      tpy += 6
    }
  }

  // Footer toutes pages
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7)
    pdf.setTextColor(150, 160, 175)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `${input.projectName} — Atlas BIM · Page ${i}/${pageCount}`,
      W - margin,
      H - 8,
      { align: 'right' },
    )
  }

  return pdf
}

export function downloadConsolidatedPDF(input: ConsolidatedInput): void {
  const pdf = generateConsolidatedReportPDF(input)
  const safe = input.projectName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  pdf.save(`rapport-directeur-${safe}-${Date.now()}.pdf`)
}
