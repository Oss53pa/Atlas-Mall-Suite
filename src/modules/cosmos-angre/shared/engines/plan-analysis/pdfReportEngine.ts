// ═══ PDF REPORT ENGINE — rapport signalétique annoté A4 ═══
//
// Rapport livrable PDF regroupant TOUTES les analyses :
//   - Couverture : identité projet + score global
//   - Résumé exécutif
//   - Mini-plan annoté (polygones murs + entrées/sorties + panneaux + chemins)
//   - Liste signalétique (tableau)
//   - Plan de conformité ERP
//   - Analyse PMR (segments non conformes)
//   - Simulation ABM (densité par tranche horaire)
//   - Méthodologie
//
// Utilise jsPDF + jspdf-autotable. Sortie Blob téléchargeable.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FlowAnalysisResult } from './flowPathEngine'
import type { AbmResult, TimeSlot } from './abmSocialForceEngine'
import { TIME_SLOT_META } from './abmSocialForceEngine'
import type { PlacedPanel } from './signagePlacementEngine'
import type { QuantityPlan } from './signageQuantityEngine'
import { SIGNAGE_CATALOG, SIGNAGE_CATEGORY_META, PRIORITY_META } from '../../proph3t/libraries/signageCatalog'
import { FLOOR_LEVEL_META, type FloorLevelKey } from '../../proph3t/libraries/spaceTypeLibrary'

// ─── Types ─────────────────────────────────────────────

export interface PdfReportInput {
  flowResult: FlowAnalysisResult
  wallSegments: Array<{ x1: number; y1: number; x2: number; y2: number }>
  spacePolygons: Array<[number, number][]>
  planBounds: { width: number; height: number }
  projectName: string
  floorLabel: string
  abmResults?: Partial<Record<TimeSlot, AbmResult>>
}

// ─── Génération du rapport ────────────────────────────

export async function generateSignagePdfReport(input: PdfReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15

  let cursorY = margin

  // ───────────── PAGE 1 : COUVERTURE ─────────────
  renderCoverPage(doc, input, pageW, pageH)

  // ───────────── PAGE 2 : RÉSUMÉ EXÉCUTIF ─────────
  doc.addPage()
  cursorY = margin
  cursorY = renderSectionTitle(doc, '1. Résumé exécutif', cursorY, margin, '#1e3a8a')
  cursorY = renderExecutiveSummary(doc, input, cursorY, margin, pageW - 2 * margin)

  // ───────────── PAGE 3 : MINI-PLAN ANNOTÉ ─────────
  doc.addPage()
  cursorY = margin
  cursorY = renderSectionTitle(doc, '2. Plan annoté', cursorY, margin, '#7e5e3c')
  cursorY = renderAnnotatedPlan(doc, input, cursorY, margin, pageW - 2 * margin)

  // ───────────── PAGE : TABLE SIGNALÉTIQUE ─────────
  doc.addPage()
  cursorY = margin
  cursorY = renderSectionTitle(doc, '3. Plan de signalétique', cursorY, margin, '#d97706')
  cursorY = renderSignageTable(doc, input.flowResult, cursorY)

  // ───────────── PAGE : ERP ─────────────────────────
  if (input.flowResult.placement?.erp) {
    doc.addPage()
    cursorY = margin
    cursorY = renderSectionTitle(doc, '4. Conformité ERP (sortie secours)', cursorY, margin, '#dc2626')
    cursorY = renderErpSection(doc, input.flowResult, cursorY, margin, pageW - 2 * margin)
  }

  // ───────────── PAGE : PMR ─────────────────────────
  if (input.flowResult.pmr) {
    doc.addPage()
    cursorY = margin
    cursorY = renderSectionTitle(doc, '5. Accessibilité PMR', cursorY, margin, '#2563eb')
    cursorY = renderPmrSection(doc, input.flowResult, cursorY, margin, pageW - 2 * margin)
  }

  // ───────────── PAGE : ABM ─────────────────────────
  if (input.abmResults && Object.keys(input.abmResults).length > 0) {
    doc.addPage()
    cursorY = margin
    cursorY = renderSectionTitle(doc, '6. Simulation flux (ABM Social Force)', cursorY, margin, '#be185d')
    cursorY = renderAbmSection(doc, input.abmResults, cursorY, margin, pageW - 2 * margin)
  }

  // ───────────── PAGE : MÉTHODOLOGIE ────────────────
  doc.addPage()
  cursorY = margin
  cursorY = renderSectionTitle(doc, '7. Méthodologie', cursorY, margin, '#0f766e')
  cursorY = renderMethodology(doc, cursorY, margin, pageW - 2 * margin)

  // Pagination
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor('#64748b')
    doc.text(`${input.projectName} · ${input.floorLabel}`, margin, pageH - 6)
    doc.text(`Page ${i}/${total}`, pageW - margin, pageH - 6, { align: 'right' })
    doc.text('PROPH3T · Atlas Mall Suite', pageW / 2, pageH - 6, { align: 'center' })
  }

  return doc.output('blob')
}

// ─── Couverture ─────────────────────────────────────

function renderCoverPage(doc: jsPDF, input: PdfReportInput, pageW: number, pageH: number) {
  // Bande haute bleu marine
  doc.setFillColor('#0f172a')
  doc.rect(0, 0, pageW, 70, 'F')

  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('PROPH3T · RAPPORT SIGNALÉTIQUE', 15, 20)

  doc.setFontSize(28)
  doc.text('Parcours Client', 15, 40)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'normal')
  doc.text(`${input.projectName}`, 15, 50)
  doc.setFontSize(12)
  doc.text(`Niveau ${input.floorLabel} · ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 60)

  // Score géant au centre
  const coherence = input.flowResult.placement?.coherence
  if (coherence) {
    const cx = pageW / 2
    const cy = pageH / 2 + 10
    const r = 35
    doc.setFillColor('#ffffff')
    doc.setDrawColor(coherence.total >= 80 ? '#10b981' : coherence.total >= 60 ? '#f59e0b' : '#ef4444')
    doc.setLineWidth(2)
    doc.circle(cx, cy, r, 'FD')
    doc.setTextColor(coherence.total >= 80 ? '#10b981' : coherence.total >= 60 ? '#f59e0b' : '#ef4444')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(40)
    doc.text(String(coherence.total), cx, cy + 5, { align: 'center' })
    doc.setFontSize(10)
    doc.setTextColor('#334155')
    doc.text('/100', cx, cy + 15, { align: 'center' })
    doc.setFontSize(11)
    doc.text('Score de cohérence', cx, cy + 28, { align: 'center' })
  }

  // Bandeau bas
  doc.setFillColor('#f1f5f9')
  doc.rect(0, pageH - 40, pageW, 40, 'F')
  const f = input.flowResult
  doc.setTextColor('#0f172a')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SYNTHÈSE', 15, pageH - 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const stats = [
    `${f.summary.entrancesCount} entrées · ${f.summary.exitsCount} sorties`,
    `${f.summary.pathsCount} chemins tracés`,
    `${f.summary.signageCount} panneaux recommandés`,
    f.placement ? `${f.placement.summary.mandatoryPanels} panneaux ERP obligatoires` : '',
    f.pmr ? `PMR : ${f.pmr.complianceScore}/100` : '',
  ].filter(Boolean)
  stats.forEach((s, i) => doc.text('· ' + s, 15, pageH - 22 + i * 4))

  doc.setFontSize(7)
  doc.setTextColor('#64748b')
  doc.text('Rapport généré automatiquement par PROPH3T · Atlas Mall Suite · 2026', pageW / 2, pageH - 4, { align: 'center' })
}

// ─── Helpers structure ──────────────────────────────

function renderSectionTitle(doc: jsPDF, title: string, y: number, margin: number, color: string): number {
  doc.setFillColor(color)
  doc.rect(margin, y, 3, 10, 'F')
  doc.setTextColor('#0f172a')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, margin + 6, y + 7)
  return y + 15
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[]
}

// ─── Résumé exécutif ────────────────────────────────

function renderExecutiveSummary(doc: jsPDF, input: PdfReportInput, y: number, margin: number, width: number): number {
  const f = input.flowResult
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1e293b')

  const intro = `PROPH3T a analysé le plan de « ${input.projectName} » niveau ${input.floorLabel}
et calculé automatiquement les chemins de circulation entre entrées et sorties,
puis positionné la signalétique optimale sous double contrainte ERP + budget.`
  const introLines = wrapText(doc, intro, width)
  introLines.forEach(l => { doc.text(l, margin, y); y += 5 })
  y += 4

  // KPI grid 2×4
  const kpis: Array<{ label: string; value: string; color: string }> = [
    { label: 'Entrées', value: String(f.summary.entrancesCount), color: '#10b981' },
    { label: 'Sorties', value: String(f.summary.exitsCount), color: '#ef4444' },
    { label: 'Chemins', value: String(f.summary.pathsCount), color: '#3b82f6' },
    { label: 'Distance moy.', value: `${f.summary.avgDistanceM.toFixed(0)} m`, color: '#a77d4c' },
    { label: 'Panneaux', value: String(f.summary.signageCount), color: '#f59e0b' },
    { label: 'ERP critiques', value: String(f.summary.criticalSignageCount), color: '#dc2626' },
    { label: 'Nœuds décision', value: String(f.summary.decisionNodes), color: '#7e5e3c' },
    { label: 'Score cohérence', value: f.placement ? `${f.placement.coherence.total}/100` : '—', color: '#059669' },
  ]
  const cellW = width / 4
  const cellH = 16
  kpis.forEach((k, i) => {
    const col = i % 4, row = Math.floor(i / 4)
    const x = margin + col * cellW
    const cy = y + row * cellH
    doc.setFillColor('#f8fafc')
    doc.setDrawColor('#e2e8f0')
    doc.rect(x, cy, cellW - 2, cellH - 2, 'FD')
    doc.setTextColor('#64748b')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(k.label.toUpperCase(), x + 3, cy + 5)
    doc.setTextColor(k.color)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(k.value, x + 3, cy + 12)
  })
  y += 2 * cellH + 4

  // Score breakdown
  if (f.placement?.coherence) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#0f172a')
    doc.text('Score de cohérence — décomposition', margin, y)
    y += 6
    const b = f.placement.coherence.breakdown
    const bars = [
      { label: 'Couverture nœuds de décision', value: b.decisionCoverage, weight: '40%' },
      { label: 'Continuité de guidage (ERP)',  value: b.guidanceContinuity, weight: '30%' },
      { label: 'Lisibilité panneaux',          value: b.readability, weight: '20%' },
      { label: 'Accessibilité PMR',            value: b.pmrAccessibility, weight: '10%' },
    ]
    doc.setFontSize(9)
    bars.forEach(b => {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#334155')
      doc.text(`${b.label} · ${b.weight}`, margin, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${b.value}/100`, margin + width - 20, y, { align: 'right' })
      // Barre
      doc.setFillColor('#e2e8f0')
      doc.rect(margin, y + 1, width, 2, 'F')
      doc.setFillColor(b.value >= 80 ? '#10b981' : b.value >= 60 ? '#f59e0b' : '#ef4444')
      doc.rect(margin, y + 1, width * Math.min(100, b.value) / 100, 2, 'F')
      y += 7
    })
    y += 2

    // Justifications
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor('#475569')
    f.placement.coherence.justifications.forEach(j => {
      const lines = wrapText(doc, '• ' + j, width)
      lines.forEach(l => { doc.text(l, margin, y); y += 4.5 })
    })
  }

  return y
}

// ─── Mini-plan annoté ──────────────────────────────

function renderAnnotatedPlan(doc: jsPDF, input: PdfReportInput, y: number, margin: number, width: number): number {
  const planBounds = input.planBounds
  const planW = planBounds.width || 200
  const planH = planBounds.height || 140

  // Zone de dessin (paysage dans la page portrait)
  const drawH = 150
  const drawW = width
  const scale = Math.min(drawW / planW, drawH / planH) * 0.92
  const offsetX = margin + (drawW - planW * scale) / 2
  const offsetY = y + (drawH - planH * scale) / 2
  const wx = (x: number) => offsetX + x * scale
  const wy = (yy: number) => offsetY + yy * scale

  // Encadrement
  doc.setFillColor('#fafafa')
  doc.rect(margin, y, drawW, drawH, 'F')

  // Boutiques : polygones remplis gris très clair (pour distinguer circulations vs occupé)
  doc.setDrawColor('#cbd5e1')
  doc.setFillColor('#eef2f7')
  doc.setLineWidth(0.1)
  for (const poly of input.spacePolygons) {
    if (poly.length < 3) continue
    // Chemin polygonal fermé avec lines()
    const firstX = wx(poly[0][0])
    const firstY = wy(poly[0][1])
    const deltas: Array<[number, number]> = []
    for (let i = 1; i < poly.length; i++) {
      deltas.push([wx(poly[i][0]) - wx(poly[i - 1][0]), wy(poly[i][1]) - wy(poly[i - 1][1])])
    }
    // Ferme
    deltas.push([wx(poly[0][0]) - wx(poly[poly.length - 1][0]), wy(poly[0][1]) - wy(poly[poly.length - 1][1])])
    // @ts-ignore lines signature (deltas, x, y, scale, style, closed)
    doc.lines(deltas, firstX, firstY, [1, 1], 'FD', true)
  }

  // Murs : segments plus sombres
  doc.setDrawColor('#475569')
  doc.setLineWidth(0.3)
  for (const w of input.wallSegments) {
    doc.line(wx(w.x1), wy(w.y1), wx(w.x2), wy(w.y2))
  }

  // Chemins colorés par paire
  const palette = [
    '#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa',
    '#fb7185', '#22d3ee', '#facc15', '#fb923c', '#c084fc',
  ]
  const hash = (s: string): string => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
    return palette[Math.abs(h) % palette.length]
  }
  doc.setLineWidth(0.9)
  for (const p of input.flowResult.paths) {
    doc.setDrawColor(hash(`${p.from.id}→${p.to.id}`))
    for (let i = 1; i < p.waypoints.length; i++) {
      doc.line(wx(p.waypoints[i - 1].x), wy(p.waypoints[i - 1].y),
               wx(p.waypoints[i].x), wy(p.waypoints[i].y))
    }
  }

  // Entrées : triangles verts
  doc.setFillColor('#10b981')
  doc.setDrawColor('#ffffff')
  doc.setLineWidth(0.4)
  for (const e of input.flowResult.entrances) {
    const px = wx(e.x), py = wy(e.y)
    doc.triangle(px, py - 2.5, px + 2.2, py + 1.5, px - 2.2, py + 1.5, 'FD')
    doc.setFontSize(6)
    doc.setTextColor('#065f46')
    doc.text(truncate(e.label, 12), px + 3, py + 1)
  }

  // Sorties : triangles rouges inversés
  doc.setFillColor('#ef4444')
  for (const e of input.flowResult.exits) {
    const px = wx(e.x), py = wy(e.y)
    doc.triangle(px, py + 2.5, px + 2.2, py - 1.5, px - 2.2, py - 1.5, 'FD')
    doc.setFontSize(6)
    doc.setTextColor('#991b1b')
    doc.text(truncate(e.label, 12), px + 3, py - 1)
  }

  // Panneaux signalétique (points colorés par type)
  const kindColors: Record<string, string> = {
    welcome: '#10b981', directional: '#f59e0b', 'you-are-here': '#b38a5a',
    information: '#a77d4c', exit: '#ef4444', 'emergency-plan': '#059669',
    'emergency-exit': '#dc2626', 'exit-direction': '#b91c1c', 'pmr-direction': '#2563eb',
  }
  if (input.flowResult.placement) {
    for (const p of input.flowResult.placement.panels) {
      doc.setFillColor(kindColors[p.kind] ?? '#64748b')
      doc.circle(wx(p.x), wy(p.y), p.priority === 'mandatory' ? 1.4 : 1.0, 'F')
    }
  }

  // Légende
  const legendY = y + drawH - 6
  doc.setFontSize(6)
  doc.setTextColor('#475569')
  doc.setFont('helvetica', 'normal')
  doc.text('▲ entrée · ▼ sortie · ● panneau', margin + 2, legendY)

  return y + drawH + 4
}

// ─── Tableau signalétique ──────────────────────────

function renderSignageTable(doc: jsPDF, f: FlowAnalysisResult, y: number): number {
  const panels = f.placement?.panels ?? []
  if (panels.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor('#64748b')
    doc.text('Aucune signalétique positionnée.', 15, y)
    return y + 10
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Type', 'Prio', 'X (m)', 'Y (m)', 'Pose', 'Contenu', 'Norme']],
    body: panels.map((p: PlacedPanel, i: number) => [
      i + 1,
      humanKind(p.kind),
      humanPrio(p.priority),
      p.x.toFixed(1),
      p.y.toFixed(1),
      p.mount,
      truncate(p.content, 50),
      truncate(p.standard ?? '', 28),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 28 },
      2: { cellWidth: 16 },
      3: { cellWidth: 12, halign: 'right' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 14 },
    },
    margin: { left: 15, right: 15 },
  })

  // @ts-ignore accès à lastAutoTable
  return (doc.lastAutoTable?.finalY ?? y) + 6
}

// ─── Section ERP ───────────────────────────────────

function renderErpSection(doc: jsPDF, f: FlowAnalysisResult, y: number, margin: number, width: number): number {
  const erp = f.placement!.erp
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1e293b')
  const intro = `La cascade ERP (panneau sortie secours tous les 30 m sur chaque chemin, plan d'évacuation à chaque entrée) est ${erp.compliant ? 'conforme' : 'non conforme'}. ${erp.stats.emergencyPlanPanels} plans d'évacuation, ${erp.stats.emergencyExitPanels} pictogrammes sortie, ${erp.stats.exitDirectionPanels} relais directionnels.`
  wrapText(doc, intro, width).forEach(l => { doc.text(l, margin, y); y += 5 })
  y += 3

  const stats = [
    ['Plans d\'évacuation (entrées)', String(erp.stats.emergencyPlanPanels), 'Arrêté 25 juin 1980 art. MS41'],
    ['Pictogrammes sortie (ISO 7010)', String(erp.stats.emergencyExitPanels), 'ISO 7010 E001 / E002'],
    ['Relais directionnels', String(erp.stats.exitDirectionPanels), 'ISO 7010 E006'],
    ['Distance moyenne entre panneaux', `${erp.stats.averageSpacingM.toFixed(1)} m`, 'Exigence : ≤ 30 m'],
    ['Plus grand écart détecté', `${erp.stats.maxGapM.toFixed(1)} m`, erp.compliant ? '✓ conforme' : '✗ non conforme'],
  ]
  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur', 'Norme / Statut']],
    body: stats,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  })
  // @ts-ignore
  y = (doc.lastAutoTable?.finalY ?? y) + 6

  if (!erp.compliant && erp.nonCompliantPathIds.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#991b1b')
    doc.text(`⚠ ${erp.nonCompliantPathIds.length} chemin(s) non conforme(s) — action corrective prioritaire.`, margin, y)
    y += 6
  }
  return y
}

// ─── Section PMR ───────────────────────────────────

function renderPmrSection(doc: jsPDF, f: FlowAnalysisResult, y: number, margin: number, width: number): number {
  const pmr = f.pmr!
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1e293b')
  const intro = `Analyse par arête du graphe de navigation : largeur estimée (via distance aux murs) et pente. Référentiel : Arrêté 8 déc. 2014 (FR), ISO 21542 (international). Score : ${pmr.complianceScore}/100 — ${pmr.compliant ? 'conforme' : `${pmr.stats.nonCompliantEdges} segment(s) non conforme(s)`}.`
  wrapText(doc, intro, width).forEach(l => { doc.text(l, margin, y); y += 5 })
  y += 3

  // Stats
  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Arêtes analysées', String(pmr.stats.totalEdges)],
      ['Non conformes', String(pmr.stats.nonCompliantEdges)],
      ['Passages étroits (< 1,40 m)', String(pmr.stats.narrowPassages)],
      ['Pentes > 5%', String(pmr.stats.steepSlopes)],
      ['Marches sans rampe', String(pmr.stats.unrampedSteps)],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  })
  // @ts-ignore
  y = (doc.lastAutoTable?.finalY ?? y) + 6

  // Recommandations
  if (pmr.recommendations.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#1e3a8a')
    doc.text('Recommandations priorisées', margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#334155')
    pmr.recommendations.forEach(r => {
      const prefix = r.priority === 'critical' ? '● ' : r.priority === 'high' ? '◐ ' : '○ '
      const lines = wrapText(doc, `${prefix}[${r.priority.toUpperCase()}] ${r.message} (${r.edgeIds.length} segment${r.edgeIds.length > 1 ? 's' : ''})`, width)
      lines.forEach(l => { doc.text(l, margin, y); y += 5 })
      y += 1
    })
  }
  return y
}

// ─── Section ABM ───────────────────────────────────

function renderAbmSection(doc: jsPDF, abmResults: Partial<Record<TimeSlot, AbmResult>>, y: number, margin: number, width: number): number {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1e293b')
  const intro = `Simulation Social Force Model (Helbing 1995) sur 3 tranches horaires. Paramètres : vitesse 1,2 m/s, rayon interaction 2 m, pas 0,1 s, densité critique 4 pers/m².`
  wrapText(doc, intro, width).forEach(l => { doc.text(l, margin, y); y += 5 })
  y += 3

  const rows = (Object.keys(TIME_SLOT_META) as TimeSlot[])
    .filter(s => abmResults[s])
    .map(s => {
      const r = abmResults[s]!
      const meta = TIME_SLOT_META[s]
      return [
        meta.label,
        meta.hour,
        String(r.stats.agentsSimulated),
        `${r.stats.arrived}/${r.stats.agentsSimulated}`,
        `${r.stats.durationS}s`,
        `${r.stats.maxDensity.toFixed(2)} p/m²`,
        r.stats.maxDensity > 4 ? '⚠ critique' : '✓',
      ]
    })

  autoTable(doc, {
    startY: y,
    head: [['Tranche', 'Horaire', 'Agents', 'Arrivés', 'Durée', 'Pic densité', 'Statut']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [190, 24, 93], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  })
  // @ts-ignore
  y = (doc.lastAutoTable?.finalY ?? y) + 6

  // Spots de congestion
  for (const slot of ['opening', 'midday', 'closing'] as TimeSlot[]) {
    const r = abmResults[slot]
    if (!r || r.stats.congestionSpots.length === 0) continue
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor('#0f172a')
    doc.text(`Spots de congestion — ${TIME_SLOT_META[slot].label}`, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    r.stats.congestionSpots.slice(0, 3).forEach(s => {
      doc.setTextColor(s.peakDensity > 4 ? '#dc2626' : '#334155')
      doc.text(`  Point (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) — ${s.peakDensity.toFixed(2)} pers/m²`, margin, y)
      y += 4
    })
    y += 2
  }
  return y
}

// ─── Méthodologie ─────────────────────────────────

function renderMethodology(doc: jsPDF, y: number, margin: number, width: number): number {
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#1e293b')

  const sections = [
    {
      title: 'Détection entrées / sorties / transits',
      text: 'Classification par expressions régulières sur les labels DXF (« entrée », « sortie », « escalator », « ascenseur »). Corrections manuelles utilisateur prioritaires. Fallback heuristique sur les espaces de circulation aux 4 bords du plan.',
    },
    {
      title: 'Extraction du réseau de circulation',
      text: 'Rasterisation des polygones de circulation à 5 px/m (200 cm/px), fermeture morphologique (dilatation 2× puis érosion 2×) pour combler les trous, puis squelettisation par l\'algorithme de Zhang-Suen (1984). Les pixels de degré ≠ 2 deviennent des nœuds : endpoints (degré 1) ou junctions (degré ≥ 3).',
    },
    {
      title: 'Graphe de navigation et plus court chemin',
      text: 'Construction d\'un graphe pondéré à partir du squelette. Ancrage des entrées/sorties au nœud squelette le plus proche par arête synthétique. Poids = longueur × facteur congestion × facteur attractivité (bonus ≤ 30% pour arêtes proches de commerces attractifs). Plus court chemin : Dijkstra avec heap binaire.',
    },
    {
      title: 'Placement de la signalétique',
      text: 'Double contrainte : ERP prioritaire (cascade sortie secours tous les 30 m, Arrêté 25 juin 1980) puis budget utilisateur. Candidats générés aux nœuds de décision (pose plafond + mural) + tous les 40 m sur les chemins longs. Visibilité par ray-casting 2D avec portées plafond 15 m / mural 8 m / sol 3 m, angle de vue max 30°. Algorithme glouton maximisant la couverture pondérée des nœuds de décision.',
    },
    {
      title: 'Score de cohérence',
      text: 'Score = 40% × couverture nœuds de décision + 30% × continuité de guidage ERP + 20% × lisibilité panneaux (distance + angle) + 10% × accessibilité PMR. Chaque composante est calculée indépendamment et pondérée selon la spécification Atlas Mall Suite.',
    },
    {
      title: 'Accessibilité PMR',
      text: 'Analyse par arête : largeur estimée via distance aux obstacles (percentile 25 sur 5 échantillons), pente calculée entre nœuds d\'étages différents. Référentiels : Arrêté 8 décembre 2014 (FR), ISO 21542, NF P 98-350. Seuils : largeur ≥ 1,40 m, pente ≤ 5 %, zéro marche sans rampe.',
    },
    {
      title: 'Simulation de flux piétons',
      text: 'Agent-Based Model avec Social Force (Helbing 1995). Forces attractive vers waypoint (τ=0,5 s), répulsive entre agents (A=2000 N, B=0,08 m) et vis-à-vis des murs (A=1000 N, B=0,2 m). Intégration Euler semi-implicite à dt=0,1 s. Spatial hash pour accélérer les interactions. Heatmap par accumulation des positions sur grille 2 m.',
    },
    {
      title: 'Limites et perspectives',
      text: 'Les analyses reposent sur la qualité de labellisation du DXF. La corriger (« Corriger labels ») avant toute analyse améliore directement les résultats. La calibration ABM avec des données capteurs réels (WiFi, caméras comptage) est recommandée pour les projets de production. Les valeurs prix fournisseur sont indicatives (référentiel CI 2026).',
    },
  ]

  sections.forEach(s => {
    if (y > 250) { doc.addPage(); y = 15 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#0f766e')
    doc.text(s.title, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#334155')
    const lines = wrapText(doc, s.text, width)
    lines.forEach(l => { doc.text(l, margin, y); y += 4.5 })
    y += 2
  })
  return y
}

// ═══════════════════════════════════════════════════════════════════
// ║                                                                   ║
// ║  RAPPORT ENRICHI 8 PAGES (spec PROPH3T Vol.3 complète)            ║
// ║                                                                   ║
// ║  Page 1 — Synthèse par niveau (scores + KPIs)                     ║
// ║  Pages 2–5 — Plan annoté par niveau (4 niveaux)                   ║
// ║  Page 6 — Tableau exhaustif 1 ligne / panneau                     ║
// ║  Page 7 — Fiches ERP (normes citées article par article)          ║
// ║  Page 8 — Plan de déploiement P1/P2/P3 + annexes                  ║
// ║                                                                   ║
// ╚═══════════════════════════════════════════════════════════════════╝

export interface EnrichedPdfInput {
  flowResult: FlowAnalysisResult
  quantityPlan: QuantityPlan
  wallSegments: Array<{ x1: number; y1: number; x2: number; y2: number; floorLevel?: FloorLevelKey }>
  spacePolygons: Array<{ polygon: [number, number][]; floorLevel?: FloorLevelKey; type?: string; label?: string }>
  planBounds: { width: number; height: number }
  projectName: string
  abmResults?: Partial<Record<TimeSlot, AbmResult>>
  /** Niveaux à inclure (typique Cosmos: extérieur/sous-sol/RDC/R+1). */
  floors: FloorLevelKey[]
}

export async function generateEnrichedSignagePdfReport(input: EnrichedPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 12

  // ───────────── PAGE 1 : SYNTHÈSE ─────────────
  renderEnrichedCoverPage(doc, input, pageW, pageH)

  // ───────────── PAGES 2-5 : PLAN PAR NIVEAU ─────────────
  for (const level of input.floors) {
    doc.addPage()
    renderFloorPlanPage(doc, input, level, pageW, pageH, margin)
  }

  // ───────────── PAGE 6 : TABLEAU EXHAUSTIF ─────────────
  doc.addPage()
  renderExhaustiveTable(doc, input, pageW, pageH, margin)

  // ───────────── PAGE 7 : FICHES ERP ─────────────
  doc.addPage()
  renderErpSheets(doc, input, pageW, pageH, margin)

  // ───────────── PAGE 8 : DÉPLOIEMENT ─────────────
  doc.addPage()
  renderDeploymentPlan(doc, input, pageW, pageH, margin)

  // Pagination
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor('#64748b')
    doc.text(`${input.projectName} · Rapport signalétique PROPH3T`, margin, pageH - 5)
    doc.text(`${i}/${total}`, pageW - margin, pageH - 5, { align: 'right' })
  }

  return doc.output('blob')
}

// ─── Page 1 : Synthèse ────────────────────────

function renderEnrichedCoverPage(doc: jsPDF, input: EnrichedPdfInput, pageW: number, _pageH: number) {
  const margin = 12

  // Bandeau haut
  doc.setFillColor('#0f172a')
  doc.rect(0, 0, pageW, 55, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('PROPH3T · RAPPORT SIGNALÉTIQUE', margin, 15)
  doc.setFontSize(24)
  doc.text('Plan de signalisation', margin, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.text(input.projectName, margin, 42)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }), margin, 50)

  // Score global (anneau)
  const qp = input.quantityPlan
  const cx = pageW - 35, cy = 30, r = 18
  const score = qp.coverageScore
  doc.setFillColor('#ffffff')
  doc.setDrawColor(score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444')
  doc.setLineWidth(2)
  doc.circle(cx, cy, r, 'FD')
  doc.setTextColor(score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(String(score), cx, cy + 3, { align: 'center' })
  doc.setFontSize(6)
  doc.setTextColor('#334155')
  doc.text('COUVERTURE', cx, cy + 10, { align: 'center' })

  // KPI grid
  let y = 66
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Synthèse globale', margin, y)
  y += 5

  const kpis = [
    { label: 'Panneaux total', value: String(qp.totalPanels), c: '#3b82f6' },
    { label: 'Budget FCFA', value: formatFcfa(qp.totalFcfa), c: '#10b981' },
    { label: 'P1 obligatoires', value: String(qp.p1Count), c: '#dc2626' },
    { label: 'ERP', value: String(qp.erpCount), c: '#f59e0b' },
    { label: 'Catégories', value: String(qp.byCategory.filter(c => c.count > 0).length), c: '#a77d4c' },
    { label: 'Étages', value: String(input.floors.length), c: '#06b6d4' },
  ]
  const kpiW = (pageW - 2 * margin - 5 * 2) / 6
  kpis.forEach((k, i) => {
    const x = margin + i * (kpiW + 2)
    doc.setFillColor('#f8fafc')
    doc.setDrawColor('#e2e8f0')
    doc.rect(x, y, kpiW, 18, 'FD')
    doc.setTextColor('#64748b')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.text(k.label.toUpperCase(), x + 2, y + 5)
    doc.setTextColor(k.c)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(k.value, x + 2, y + 13)
  })
  y += 25

  // Répartition par catégorie
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Répartition par catégorie', margin, y)
  y += 2

  autoTable(doc, {
    startY: y + 3,
    head: [['Catégorie', 'Nombre', 'FCFA', 'P1', 'P2', 'P3', 'ERP']],
    body: qp.byCategory.filter(c => c.count > 0).map(c => {
      const meta = SIGNAGE_CATEGORY_META[c.category]
      return [
        `${meta.icon} ${meta.label}`,
        String(c.count),
        formatFcfa(c.totalFcfa),
        String(c.p1Count),
        String(c.p2Count),
        String(c.p3Count),
        String(c.erpCount),
      ]
    }),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 15, halign: 'right' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 12, halign: 'right' },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })
  // @ts-ignore
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // Répartition par niveau
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text('Répartition par niveau', margin, y)

  const byLevel: Record<string, { count: number; fcfa: number }> = {}
  for (const f of input.floors) byLevel[f] = { count: 0, fcfa: 0 }
  for (const p of qp.panels) {
    const lvl = p.floorLevel ?? 'rdc'
    if (!byLevel[lvl]) byLevel[lvl] = { count: 0, fcfa: 0 }
    byLevel[lvl].count++
    byLevel[lvl].fcfa += p.priceFcfa
  }

  autoTable(doc, {
    startY: y + 3,
    head: [['Niveau', 'Panneaux', 'Budget FCFA']],
    body: input.floors.map(f => [
      FLOOR_LEVEL_META[f].label,
      String(byLevel[f]?.count ?? 0),
      formatFcfa(byLevel[f]?.fcfa ?? 0),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  })
  // @ts-ignore
  y = (doc.lastAutoTable?.finalY ?? y) + 8

  // Note méthodologique
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor('#64748b')
  const note = `Rapport généré automatiquement par PROPH3T. Quantités calculées à partir ` +
    `des ${input.flowResult.summary.decisionNodes} nœuds de décision, ${input.flowResult.summary.entrancesCount} entrées, ` +
    `${input.flowResult.summary.exitsCount} sorties détectées sur le plan. Prix FCFA indicatifs (benchmark CI 2026).`
  doc.splitTextToSize(note, pageW - 2 * margin).forEach((l: string) => {
    doc.text(l, margin, y); y += 4
  })
}

// ─── Pages 2-5 : Plan par niveau ───────────────

function renderFloorPlanPage(
  doc: jsPDF, input: EnrichedPdfInput, level: FloorLevelKey,
  pageW: number, _pageH: number, margin: number,
) {
  const meta = FLOOR_LEVEL_META[level]
  // Titre
  doc.setFillColor('#1e3a8a')
  doc.rect(0, 0, pageW, 15, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`Niveau ${meta.label}`, margin, 10)

  const panelsAtLevel = input.quantityPlan.panels.filter(p =>
    (p.floorLevel ?? 'rdc') === level,
  )
  const wallsAtLevel = input.wallSegments.filter(w =>
    !w.floorLevel || w.floorLevel === level,
  )
  const spacesAtLevel = input.spacePolygons.filter(s =>
    !s.floorLevel || s.floorLevel === level,
  )

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#ffffff')
  doc.text(`${panelsAtLevel.length} panneau(x) · ${wallsAtLevel.length} murs · ${spacesAtLevel.length} espaces`,
    pageW - margin, 10, { align: 'right' })

  // Plan (occupe ~180mm)
  const planW = pageW - 2 * margin
  const planH = 180
  const planTop = 20
  const scale = Math.min(planW / input.planBounds.width, planH / input.planBounds.height) * 0.95
  const offsetX = margin + (planW - input.planBounds.width * scale) / 2
  const offsetY = planTop + (planH - input.planBounds.height * scale) / 2
  const wx = (x: number) => offsetX + x * scale
  const wy = (y: number) => offsetY + y * scale

  // Fond
  doc.setFillColor('#fafafa')
  doc.rect(margin, planTop, planW, planH, 'F')

  // Espaces (fond clair)
  doc.setDrawColor('#cbd5e1')
  doc.setFillColor('#eef2f7')
  doc.setLineWidth(0.1)
  for (const s of spacesAtLevel) {
    if (s.polygon.length < 3) continue
    const firstX = wx(s.polygon[0][0]), firstY = wy(s.polygon[0][1])
    const deltas: Array<[number, number]> = []
    for (let i = 1; i < s.polygon.length; i++) {
      deltas.push([
        wx(s.polygon[i][0]) - wx(s.polygon[i - 1][0]),
        wy(s.polygon[i][1]) - wy(s.polygon[i - 1][1]),
      ])
    }
    deltas.push([
      wx(s.polygon[0][0]) - wx(s.polygon[s.polygon.length - 1][0]),
      wy(s.polygon[0][1]) - wy(s.polygon[s.polygon.length - 1][1]),
    ])
    // @ts-ignore
    doc.lines(deltas, firstX, firstY, [1, 1], 'FD', true)
  }

  // Murs
  doc.setDrawColor('#334155')
  doc.setLineWidth(0.4)
  for (const w of wallsAtLevel) {
    doc.line(wx(w.x1), wy(w.y1), wx(w.x2), wy(w.y2))
  }

  // Chemins
  doc.setDrawColor('#60a5fa')
  doc.setLineWidth(0.7)
  for (const p of input.flowResult.paths) {
    for (let i = 1; i < p.waypoints.length; i++) {
      doc.line(
        wx(p.waypoints[i - 1].x), wy(p.waypoints[i - 1].y),
        wx(p.waypoints[i].x), wy(p.waypoints[i].y),
      )
    }
  }

  // Panneaux avec icône
  for (let i = 0; i < panelsAtLevel.length; i++) {
    const p = panelsAtLevel[i]
    const meta = SIGNAGE_CATALOG[p.code]
    if (!meta) continue
    const px = wx(p.x), py = wy(p.y)
    doc.setFillColor(meta.color)
    doc.setDrawColor('#000')
    doc.setLineWidth(0.1)
    const r = p.priority === 'P1' ? 1.8 : p.priority === 'P2' ? 1.3 : 1.0
    doc.circle(px, py, r, 'FD')
    // Numéro
    doc.setTextColor('#000')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.text(String(i + 1), px, py + 1, { align: 'center' })
  }

  // Entrées/sorties
  for (const e of input.flowResult.entrances) {
    const px = wx(e.x), py = wy(e.y)
    doc.setFillColor('#10b981')
    doc.setDrawColor('#fff')
    doc.setLineWidth(0.3)
    doc.triangle(px, py - 2.5, px + 2.2, py + 1.5, px - 2.2, py + 1.5, 'FD')
  }
  for (const e of input.flowResult.exits) {
    const px = wx(e.x), py = wy(e.y)
    doc.setFillColor('#ef4444')
    doc.setDrawColor('#fff')
    doc.setLineWidth(0.3)
    doc.triangle(px, py + 2.5, px + 2.2, py - 1.5, px - 2.2, py - 1.5, 'FD')
  }

  // Légende des codes en bas
  const legendTop = planTop + planH + 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor('#0f172a')
  doc.text(`Légende — panneaux du niveau ${meta.label}`, margin, legendTop)

  const codesInUse = new Set(panelsAtLevel.map(p => p.code))
  const codesArr = Array.from(codesInUse)
  const colW = (pageW - 2 * margin) / 4
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  codesArr.slice(0, 8).forEach((code, i) => {
    const col = i % 4, row = Math.floor(i / 4)
    const x = margin + col * colW
    const y = legendTop + 5 + row * 6
    const m = SIGNAGE_CATALOG[code]
    if (!m) return
    doc.setFillColor(m.color)
    doc.circle(x + 2, y - 1, 1.3, 'F')
    doc.setTextColor('#0f172a')
    doc.text(`${code} ${m.label}`, x + 5, y)
  })
}

// ─── Page 6 : Tableau exhaustif ───────────────

function renderExhaustiveTable(
  doc: jsPDF, input: EnrichedPdfInput, pageW: number, _pageH: number, margin: number,
) {
  doc.setFillColor('#d97706')
  doc.rect(0, 0, pageW, 15, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Cahier des charges signalétique — 1 ligne par panneau', margin, 10)

  const rows = input.quantityPlan.panels.map((p, i) => {
    const meta = SIGNAGE_CATALOG[p.code]
    return [
      String(i + 1),
      p.code,
      meta?.label ?? p.label,
      FLOOR_LEVEL_META[p.floorLevel ?? 'rdc'].label.slice(0, 6),
      `${p.x.toFixed(1)} · ${p.y.toFixed(1)}`,
      String(p.heightCm),
      p.model.slice(0, 9),
      p.priority,
      truncate(p.content, 28),
      formatFcfa(p.priceFcfa),
    ]
  })

  autoTable(doc, {
    startY: 20,
    head: [['#', 'Code', 'Type', 'Niv.', 'X·Y (m)', 'H (cm)', 'Modèle', 'Prio', 'Message', 'FCFA']],
    body: rows,
    styles: { fontSize: 6.5, cellPadding: 1 },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 6, halign: 'right' },
      1: { cellWidth: 14, fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 14 },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 10, halign: 'right' },
      6: { cellWidth: 16 },
      7: { cellWidth: 10 },
      8: { cellWidth: 55 },
      9: { cellWidth: 16, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })
}

// ─── Page 7 : Fiches ERP ───────────────────────

function renderErpSheets(
  doc: jsPDF, input: EnrichedPdfInput, pageW: number, pageH: number, margin: number,
) {
  doc.setFillColor('#dc2626')
  doc.rect(0, 0, pageW, 15, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Fiches ERP — Obligations réglementaires citées', margin, 10)

  const erpPanels = input.quantityPlan.panels.filter(p => p.erpRequired)
  let y = 20

  // Group par code
  const byCode = new Map<string, typeof erpPanels>()
  for (const p of erpPanels) {
    if (!byCode.has(p.code)) byCode.set(p.code, [])
    byCode.get(p.code)!.push(p)
  }

  for (const [code, list] of byCode) {
    const meta = SIGNAGE_CATALOG[code]
    if (!meta) continue

    if (y > pageH - 40) { doc.addPage(); y = 20 }

    // Bandeau catégorie
    doc.setFillColor('#fef2f2')
    doc.setDrawColor('#dc2626')
    doc.setLineWidth(0.3)
    doc.rect(margin, y, pageW - 2 * margin, 8, 'FD')
    doc.setTextColor('#dc2626')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`${code} — ${meta.label} (${list.length} panneau${list.length > 1 ? 'x' : ''})`, margin + 2, y + 5.5)
    y += 10

    // Normes citées
    doc.setTextColor('#0f172a')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Normes applicables :`, margin, y)
    y += 4
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    for (const std of meta.standards) {
      doc.text(`• ${std}`, margin + 3, y)
      y += 3.5
    }
    y += 1

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#334155')
    const desc = `${meta.description} Modèle : ${meta.defaultModel}. Hauteur de pose : ${meta.heightCm.default} cm. Priorité : ${PRIORITY_META[meta.priority].label} (${PRIORITY_META[meta.priority].poseDelay}).`
    doc.splitTextToSize(desc, pageW - 2 * margin).forEach((l: string) => {
      doc.text(l, margin, y); y += 3.5
    })
    y += 2
  }

  if (erpPanels.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor('#64748b')
    doc.setFont('helvetica', 'italic')
    doc.text('Aucune signalétique ERP dans ce projet.', margin, 30)
  }
}

// ─── Page 8 : Plan de déploiement ─────────────

function renderDeploymentPlan(
  doc: jsPDF, input: EnrichedPdfInput, pageW: number, pageH: number, margin: number,
) {
  doc.setFillColor('#0f766e')
  doc.rect(0, 0, pageW, 15, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Plan de déploiement P1 / P2 / P3', margin, 10)

  let y = 25
  const qp = input.quantityPlan

  for (const prio of ['P1', 'P2', 'P3'] as const) {
    const panels = qp.panels.filter(p => p.priority === prio)
    const total = panels.reduce((s, p) => s + p.priceFcfa, 0)
    const meta = PRIORITY_META[prio]

    doc.setFillColor(meta.color)
    doc.rect(margin, y, 3, 8, 'F')
    doc.setTextColor('#0f172a')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`Priorité ${prio} — ${meta.label} (${meta.poseDelay})`, margin + 6, y + 6)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#334155')
    doc.text(`Nombre de panneaux : ${panels.length}`, margin, y)
    doc.text(`Budget : ${formatFcfa(total)}`, pageW - margin, y, { align: 'right' })
    y += 5

    // Agrégat par code
    const byCode = new Map<string, { count: number; fcfa: number }>()
    for (const p of panels) {
      const e = byCode.get(p.code) ?? { count: 0, fcfa: 0 }
      e.count++; e.fcfa += p.priceFcfa
      byCode.set(p.code, e)
    }

    if (byCode.size > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Code', 'Libellé', 'Quantité', 'Budget FCFA']],
        body: Array.from(byCode.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .map(([code, v]) => {
            const m = SIGNAGE_CATALOG[code]
            return [code, m?.label ?? '—', String(v.count), formatFcfa(v.fcfa)]
          }),
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      })
      // @ts-ignore
      y = (doc.lastAutoTable?.finalY ?? y) + 6
    } else {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor('#94a3b8')
      doc.text('Aucun panneau à cette priorité.', margin, y)
      y += 5
    }
  }

  // Justifications
  if (y < pageH - 80) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor('#0f172a')
    doc.text('Justifications de calcul', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor('#475569')
    for (const j of qp.justifications.slice(0, 15)) {
      if (y > pageH - 20) break
      const lines = doc.splitTextToSize(`· ${j}`, pageW - 2 * margin) as string[]
      for (const l of lines) {
        doc.text(l, margin, y); y += 3
      }
    }
  }
}

// ─── Helpers ───────────────────────────────────

function formatFcfa(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Mds`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} K`
  return n.toFixed(0)
}

function truncate(s: string, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function humanKind(k: PlacedPanel['kind']): string {
  switch (k) {
    case 'welcome': return 'Accueil'
    case 'directional': return 'Directionnel'
    case 'you-are-here': return 'Vous êtes ici'
    case 'information': return 'Information'
    case 'exit': return 'Sortie'
    case 'emergency-plan': return 'Plan évac. ERP'
    case 'emergency-exit': return 'Sortie secours'
    case 'exit-direction': return 'Dir. secours'
    case 'pmr-direction': return 'Dir. PMR'
  }
}

function humanPrio(p: PlacedPanel['priority']): string {
  return p === 'mandatory' ? 'Oblig.' : p === 'critical' ? 'Critique' : p === 'high' ? 'Élevée' : p === 'medium' ? 'Moy.' : 'Faible'
}
