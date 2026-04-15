// ═══ PARCOURS CLIENT ENGINE — Vol.3 ═══
// Analyzes customer journey, POI placement, signage density, accessibility,
// and wayfinding quality.

import jsPDF from 'jspdf'

export interface POI {
  id: string
  floorId: string
  label: string
  x: number  // metres
  y: number  // metres
  category?: string  // 'wc', 'info', 'atm', 'rest', etc.
  accessible?: boolean
}

export interface SignageItem {
  id: string
  floorId: string
  ref: string
  x: number
  y: number
  type: 'directionnel' | 'identifiant' | 'info' | 'reglementaire'
  content?: string
  dimensionsText?: string
  normRef?: string
}

export interface JourneyMoment {
  id: string
  floorId: string
  number: number
  name: string
  x: number
  y: number
  description?: string
}

export interface SpaceForParcours {
  id: string
  floorId?: string
  type?: string
  polygon: [number, number][]
  areaSqm: number
  label: string
}

export interface ParcoursReport {
  timestamp: string
  scorePct: number
  totals: {
    pois: number
    signage: number
    moments: number
    floors: number
  }
  signageDensity: Array<{
    floorId: string
    signCount: number
    areaSqm: number
    signPer100m2: number
  }>
  poiCoverage: Array<{
    category: string
    count: number
    averageDistanceM: number  // avg distance between POIs of this type
  }>
  journeyLengthM: number  // total length of default journey
  accessibility: {
    accessiblePois: number
    totalPois: number
    accessiblePct: number
  }
  wayfindingScore: number  // 0-100 — based on signage coverage + distances
  issues: Array<{
    severity: 'info' | 'warning' | 'critical'
    code: string
    title: string
    description: string
    recommendation?: string
  }>
  summary: { info: number; warning: number; critical: number }
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function polygonCenter(poly: [number, number][]): [number, number] {
  if (!poly.length) return [0, 0]
  let sx = 0, sy = 0
  for (const [x, y] of poly) { sx += x; sy += y }
  return [sx / poly.length, sy / poly.length]
}

export function runParcoursAnalysis(input: {
  pois: POI[]
  signage: SignageItem[]
  moments: JourneyMoment[]
  spaces: SpaceForParcours[]
  floors: Array<{ id: string; label: string; areaSqm?: number }>
}): ParcoursReport {
  const { pois, signage, moments, spaces, floors } = input
  const issues: ParcoursReport['issues'] = []
  let issueCount = 0
  const nextId = () => `par-${++issueCount}`

  // ── Signage density per floor ──
  const signageDensity = floors.map(f => {
    const floorSigns = signage.filter(s => s.floorId === f.id)
    const floorSpaces = spaces.filter(s => !s.floorId || s.floorId === f.id)
    const area = f.areaSqm ?? floorSpaces.reduce((acc, s) => acc + s.areaSqm, 0)
    return {
      floorId: f.id,
      signCount: floorSigns.length,
      areaSqm: area,
      signPer100m2: area > 0 ? (floorSigns.length / area) * 100 : 0,
    }
  })

  // ── POI categorization + average distance ──
  const categories: Record<string, POI[]> = {}
  for (const p of pois) {
    const cat = p.category ?? p.label.split(' ')[0].toLowerCase()
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(p)
  }
  const poiCoverage: ParcoursReport['poiCoverage'] = Object.entries(categories).map(([cat, list]) => {
    let totalDist = 0
    let pairs = 0
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        totalDist += dist(list[i].x, list[i].y, list[j].x, list[j].y)
        pairs++
      }
    }
    return {
      category: cat,
      count: list.length,
      averageDistanceM: pairs > 0 ? totalDist / pairs : 0,
    }
  })

  // ── Journey length (sum of distances between consecutive moments) ──
  const sortedMoments = [...moments].sort((a, b) => a.number - b.number)
  let journeyLengthM = 0
  for (let i = 1; i < sortedMoments.length; i++) {
    journeyLengthM += dist(
      sortedMoments[i - 1].x, sortedMoments[i - 1].y,
      sortedMoments[i].x, sortedMoments[i].y,
    )
  }

  // ── Accessibility ──
  const accessiblePois = pois.filter(p => p.accessible !== false).length
  const accessibility = {
    accessiblePois,
    totalPois: pois.length,
    accessiblePct: pois.length > 0 ? (accessiblePois / pois.length) * 100 : 100,
  }

  // ── Wayfinding score: based on signage-per-100m² + avg signage distance ──
  const totalArea = floors.reduce((s, f) => s + (f.areaSqm ?? 0), 0)
  const globalSignDensity = totalArea > 0 ? (signage.length / totalArea) * 100 : 0
  // Target: 0.3-0.5 signs per 100m² → score 100; below 0.1 → 0; above 1 → 70 (saturated)
  let wayfindingScore = 0
  if (globalSignDensity >= 0.3 && globalSignDensity <= 0.5) wayfindingScore = 100
  else if (globalSignDensity < 0.3) wayfindingScore = (globalSignDensity / 0.3) * 100
  else wayfindingScore = Math.max(60, 100 - (globalSignDensity - 0.5) * 50)

  // ── RULES ──
  if (pois.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO-POI',
      title: 'Aucun POI place',
      description: 'Aucun point d\'interet n\'est place sur le plan.',
      recommendation: 'Placer WC, information, DAB, food courts, parkings pour guider les visiteurs.',
    })
  }
  if (signage.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'NO-SIGNAGE',
      title: 'Aucune signaletique',
      description: 'Le plan ne comporte aucun panneau de signaletique.',
      recommendation: 'Installer au minimum 0.3 panneaux / 100 m² (signaletique directionnelle).',
    })
  }
  if (moments.length === 0) {
    issues.push({
      severity: 'info',
      code: 'NO-JOURNEY',
      title: 'Aucun parcours client defini',
      description: 'Aucun moment cle n\'a ete place pour structurer le parcours client.',
      recommendation: 'Definir 5-7 moments cles (entree, attraction, restauration, services, sortie).',
    })
  }
  for (const f of signageDensity) {
    if (f.signCount === 0 && f.areaSqm > 500) {
      issues.push({
        severity: 'warning',
        code: `NO-SIGN-${f.floorId}`,
        title: `Etage sans signaletique: ${floors.find(fl => fl.id === f.floorId)?.label ?? f.floorId}`,
        description: `L'etage (${f.areaSqm.toFixed(0)} m²) n'a aucun panneau.`,
      })
    } else if (f.signPer100m2 < 0.15 && f.areaSqm > 500) {
      issues.push({
        severity: 'info',
        code: `LOW-SIGN-${f.floorId}`,
        title: `Signaletique faible: ${floors.find(fl => fl.id === f.floorId)?.label ?? f.floorId}`,
        description: `Seulement ${f.signPer100m2.toFixed(2)} panneaux / 100 m². Cible: 0.3-0.5.`,
      })
    }
  }
  if (accessibility.totalPois > 0 && accessibility.accessiblePct < 80) {
    issues.push({
      severity: 'warning',
      code: 'LOW-ACCESSIBILITY',
      title: `Accessibilite POIs insuffisante (${accessibility.accessiblePct.toFixed(0)}%)`,
      description: `Moins de 80% des POIs sont accessibles PMR. Norme: 100%.`,
      recommendation: 'Verifier l\'accessibilite de chaque POI selon loi 2005-102.',
    })
  }

  // Check for WC coverage
  const wcPois = pois.filter(p => /wc|toilette|sanitaire/i.test(p.category ?? p.label))
  if (wcPois.length === 0 && pois.length > 0) {
    issues.push({
      severity: 'critical',
      code: 'NO-WC',
      title: 'Aucun WC identifie',
      description: 'Aucun WC/sanitaire n\'est indique dans les POIs.',
      recommendation: 'Au moins 1 WC par 1000 m² (ERP categorie commerce).',
    })
  }

  const summary = {
    info: issues.filter(i => i.severity === 'info').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    critical: issues.filter(i => i.severity === 'critical').length,
  }

  const score = Math.max(0, Math.round(
    wayfindingScore * 0.4 +
    accessibility.accessiblePct * 0.3 +
    (pois.length > 0 ? 30 : 0)
    - summary.critical * 15 - summary.warning * 5
  ))

  return {
    timestamp: new Date().toISOString(),
    scorePct: Math.min(100, score),
    totals: { pois: pois.length, signage: signage.length, moments: moments.length, floors: floors.length },
    signageDensity,
    poiCoverage,
    journeyLengthM,
    accessibility,
    wayfindingScore: Math.round(wayfindingScore),
    issues,
    summary,
  }
}

// ── PDF Report ──

export async function generateParcoursReportPDF(input: {
  projectName: string
  pois: POI[]
  signage: SignageItem[]
  moments: JourneyMoment[]
  floors: Array<{ id: string; label: string }>
  report: ParcoursReport
}): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 15

  const COLORS = {
    primary: [16, 185, 129] as [number, number, number], // emerald-500
    success: [5, 150, 105] as [number, number, number],
    warning: [245, 158, 11] as [number, number, number],
    critical: [220, 38, 38] as [number, number, number],
    gray: [71, 85, 105] as [number, number, number],
    lightGray: [226, 232, 240] as [number, number, number],
  }

  let page = 1
  const header = () => {
    pdf.setFillColor(...COLORS.primary)
    pdf.rect(0, 0, W, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text(input.projectName, M, 6.5)
    pdf.text(`Rapport Parcours Client · ${new Date(input.report.timestamp).toLocaleDateString('fr-FR')}`, W - M, 6.5, { align: 'right' })
    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(7)
    pdf.text(`Page ${page}`, W / 2, H - 5, { align: 'center' })
  }

  header()
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(32)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PARCOURS', M, 60)
  pdf.text('CLIENT', M, 75)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text('POIs · Signaletique · Accessibilite · Wayfinding', M, 85)

  const score = input.report.scorePct
  const sc: [number, number, number] = score >= 70 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.critical
  pdf.setFillColor(...sc)
  pdf.roundedRect(W - M - 80, 45, 80, 60, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(60)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(Math.round(score)), W - M - 40, 82, { align: 'center' })
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('score parcours', W - M - 40, 95, { align: 'center' })

  // KPIs
  const kpiY = 130
  const kpiW = (W - 2 * M - 9) / 4
  const drawKpi = (x: number, label: string, value: string, sub?: string) => {
    pdf.setFillColor(248, 250, 252)
    pdf.roundedRect(x, kpiY, kpiW, 30, 2, 2, 'F')
    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(7)
    pdf.setFont('helvetica', 'normal')
    pdf.text(label.toUpperCase(), x + 3, kpiY + 6)
    pdf.setTextColor(30, 41, 59)
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, x + 3, kpiY + 18)
    if (sub) {
      pdf.setFontSize(7)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...COLORS.gray)
      pdf.text(sub, x + 3, kpiY + 25)
    }
  }
  drawKpi(M, 'POIs', String(input.report.totals.pois))
  drawKpi(M + kpiW + 3, 'Signaletique', String(input.report.totals.signage))
  drawKpi(M + 2 * (kpiW + 3), 'Moments', String(input.report.totals.moments), `${input.report.journeyLengthM.toFixed(0)} m parcours`)
  drawKpi(M + 3 * (kpiW + 3), 'Accessibilite', `${input.report.accessibility.accessiblePct.toFixed(0)}%`, 'PMR')

  let y = 175
  pdf.setTextColor(...COLORS.primary)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('Densite signaletique par etage', M, y)
  pdf.setDrawColor(...COLORS.primary)
  pdf.line(M, y + 2, W - M, y + 2)
  y += 8

  for (const fd of input.report.signageDensity) {
    const floorLabel = input.floors.find(f => f.id === fd.floorId)?.label ?? fd.floorId
    pdf.setTextColor(30, 41, 59)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(floorLabel, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...COLORS.gray)
    pdf.text(`${fd.signCount} panneaux / ${fd.areaSqm.toFixed(0)} m² · ${fd.signPer100m2.toFixed(2)} / 100m²`, M + 40, y)
    const col: [number, number, number] = fd.signPer100m2 >= 0.3 ? COLORS.success : fd.signPer100m2 >= 0.15 ? COLORS.warning : COLORS.critical
    pdf.setFillColor(...COLORS.lightGray)
    pdf.rect(M + 110, y - 2.5, 60, 3, 'F')
    pdf.setFillColor(...col)
    pdf.rect(M + 110, y - 2.5, Math.min(60, (fd.signPer100m2 / 0.5) * 60), 3, 'F')
    y += 5
  }

  // Issues
  if (input.report.issues.length > 0) {
    y += 5
    pdf.setTextColor(...COLORS.primary)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Recommandations', M, y)
    y += 5
    for (const iss of input.report.issues) {
      if (y > H - 25) { pdf.addPage(); page++; header(); y = 25 }
      const c: [number, number, number] = iss.severity === 'critical' ? COLORS.critical : iss.severity === 'warning' ? COLORS.warning : [100, 116, 139]
      pdf.setFillColor(...c)
      pdf.circle(M + 2, y - 1, 1.3, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(30, 41, 59)
      pdf.text(iss.title, M + 6, y, { maxWidth: W - 2 * M - 6 })
      y += 4
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(7)
      pdf.setTextColor(...COLORS.gray)
      const lns = pdf.splitTextToSize(iss.description, W - 2 * M - 6)
      for (const ln of lns) {
        if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
        pdf.text(ln, M + 6, y); y += 3
      }
      if (iss.recommendation) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...c)
        const lns2 = pdf.splitTextToSize(`→ ${iss.recommendation}`, W - 2 * M - 6)
        for (const ln of lns2) {
          if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
          pdf.text(ln, M + 6, y); y += 3
        }
      }
      y += 3
    }
  }

  // Nomenclature page
  pdf.addPage(); page++; header()
  y = 25
  pdf.setTextColor(...COLORS.primary)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Nomenclature POIs & Signaletique', M, y)
  pdf.setDrawColor(...COLORS.primary)
  pdf.line(M, y + 3, W - M, y + 3)
  y += 10

  // POIs table
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 41, 59)
  pdf.text(`Points d'interet (${input.pois.length})`, M, y)
  y += 5
  const poiCols = [M, M + 35, M + 55, M + 90, M + 115, M + 140]
  pdf.setFillColor(...COLORS.lightGray)
  pdf.rect(M, y, W - 2 * M, 6, 'F')
  pdf.setFontSize(7)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Label', poiCols[0] + 1, y + 4)
  pdf.text('Etage', poiCols[1] + 1, y + 4)
  pdf.text('Categorie', poiCols[2] + 1, y + 4)
  pdf.text('X (m)', poiCols[3] + 1, y + 4)
  pdf.text('Y (m)', poiCols[4] + 1, y + 4)
  pdf.text('PMR', poiCols[5] + 1, y + 4)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(30, 41, 59)
  for (const p of input.pois) {
    if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
    pdf.text(p.label, poiCols[0] + 1, y)
    pdf.text(input.floors.find(f => f.id === p.floorId)?.label ?? p.floorId, poiCols[1] + 1, y)
    pdf.text(p.category ?? '—', poiCols[2] + 1, y)
    pdf.text(p.x.toFixed(1), poiCols[3] + 1, y)
    pdf.text(p.y.toFixed(1), poiCols[4] + 1, y)
    pdf.text(p.accessible !== false ? 'Oui' : 'Non', poiCols[5] + 1, y)
    y += 4.5
  }

  y += 5
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(30, 41, 59)
  pdf.text(`Signaletique (${input.signage.length})`, M, y)
  y += 5

  const sigCols = [M, M + 35, M + 65, M + 100, M + 130]
  pdf.setFillColor(...COLORS.lightGray)
  pdf.rect(M, y, W - 2 * M, 6, 'F')
  pdf.setFontSize(7)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Ref', sigCols[0] + 1, y + 4)
  pdf.text('Etage', sigCols[1] + 1, y + 4)
  pdf.text('Type', sigCols[2] + 1, y + 4)
  pdf.text('X (m)', sigCols[3] + 1, y + 4)
  pdf.text('Y (m)', sigCols[4] + 1, y + 4)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(30, 41, 59)
  for (const s of input.signage) {
    if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
    pdf.text(s.ref, sigCols[0] + 1, y)
    pdf.text(input.floors.find(f => f.id === s.floorId)?.label ?? s.floorId, sigCols[1] + 1, y)
    pdf.text(s.type, sigCols[2] + 1, y)
    pdf.text(s.x.toFixed(1), sigCols[3] + 1, y)
    pdf.text(s.y.toFixed(1), sigCols[4] + 1, y)
    y += 4.5
  }

  return pdf.output('blob')
}

export function generateParcoursCSV(input: { pois: POI[]; signage: SignageItem[]; moments: JourneyMoment[] }): string {
  const lines: string[] = []
  lines.push('Type;Ref;Etage;Categorie/TypePanneau;X (m);Y (m);PMR;Numero moment')
  for (const p of input.pois) {
    lines.push([
      'POI', p.label, p.floorId, p.category ?? '',
      p.x.toFixed(2), p.y.toFixed(2),
      p.accessible !== false ? 'Oui' : 'Non', '',
    ].join(';'))
  }
  for (const s of input.signage) {
    lines.push([
      'Signaletique', s.ref, s.floorId, s.type,
      s.x.toFixed(2), s.y.toFixed(2), '', '',
    ].join(';'))
  }
  for (const m of input.moments) {
    lines.push([
      'Moment', m.name, m.floorId, '',
      m.x.toFixed(2), m.y.toFixed(2), '', String(m.number),
    ].join(';'))
  }
  return lines.join('\n')
}
