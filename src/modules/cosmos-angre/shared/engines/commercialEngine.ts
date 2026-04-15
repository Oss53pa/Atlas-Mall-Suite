// ═══ COMMERCIAL ENGINE — Vol.1 (Plan Commercial) ═══
// Analyzes mix enseignes, occupancy, revenue potential and validates
// the commercial plan against mall-planning conventions.

export interface CommercialSpace {
  id: string
  label: string
  type?: string  // SpaceType: commerce, restauration, services, etc.
  areaSqm: number
  floorId?: string
  polygon?: [number, number][]
  /** Optional occupancy status */
  status?: 'vacant' | 'occupied' | 'reserved' | 'works' | 'negotiation'
  tenantId?: string | null
}

export interface Tenant {
  id: string
  name: string
  brand?: string
  category?: string  // 'mode', 'restauration', 'services', etc.
  anchor?: boolean   // locomotive?
  rentFcfaM2?: number
  monthlyRentFcfa?: number
  leaseStart?: string
  leaseEnd?: string
}

export interface CommercialReport {
  timestamp: string
  scorePct: number
  totalSurfaceSqm: number
  surfaceByType: Record<string, number>
  countByType: Record<string, number>
  occupancy: {
    vacant: number
    occupied: number
    reserved: number
    works: number
    negotiation: number
    totalCount: number
    occupiedPct: number
    vacantPct: number
  }
  mix: {
    mode: number        // % of GLA
    restauration: number
    services: number
    loisirs: number
    commerce: number
    autres: number
    score: number       // 0-100: balance score
  }
  anchors: {
    count: number
    totalSurfaceSqm: number
    surfacePct: number  // % of total mall GLA
  }
  averageRentFcfaM2: number
  monthlyRevenueFcfa: number
  annualRevenueFcfa: number
  issues: Array<{
    severity: 'info' | 'warning' | 'critical'
    code: string
    title: string
    description: string
    recommendation?: string
  }>
  summary: { info: number; warning: number; critical: number }
}

const IDEAL_MIX = {
  mode: { min: 30, max: 45 },           // fashion: 30-45%
  restauration: { min: 10, max: 20 },   // food: 10-20%
  services: { min: 5, max: 15 },        // services: 5-15%
  loisirs: { min: 5, max: 15 },         // leisure: 5-15%
  commerce: { min: 15, max: 30 },       // other retail: 15-30%
  autres: { min: 0, max: 10 },          // other: 0-10%
}

function categorize(type: string | undefined): keyof typeof IDEAL_MIX {
  if (!type) return 'autres'
  const t = type.toLowerCase()
  if (/mode|fashion|clothing|vetement|shoe|chaussure|accessoir|bijou|cosmetique|parfum/.test(t)) return 'mode'
  if (/restaurant|restauration|food|cafe|bar|snack|fastfood|fast.?food|cuisine|brasserie|pizza/.test(t)) return 'restauration'
  if (/services|banque|pressing|poste|sante|pharmacie|coiffeur|spa|atm/.test(t)) return 'services'
  if (/loisirs|cinema|gym|sport|bowling|arcade|gaming|jeu/.test(t)) return 'loisirs'
  if (/commerce|boutique|magasin|retail|shop|electro|high.?tech|librairie|jouet/.test(t)) return 'commerce'
  return 'autres'
}

export function runCommercialAnalysis(
  spaces: CommercialSpace[],
  tenants: Tenant[],
): CommercialReport {
  const issues: CommercialReport['issues'] = []
  let issueCount = 0
  const nextId = () => `comm-${++issueCount}`

  const totalSurface = spaces.reduce((s, sp) => s + sp.areaSqm, 0)

  // Surface and count by type
  const surfaceByType: Record<string, number> = {}
  const countByType: Record<string, number> = {}
  for (const sp of spaces) {
    const cat = categorize(sp.type)
    surfaceByType[cat] = (surfaceByType[cat] ?? 0) + sp.areaSqm
    countByType[cat] = (countByType[cat] ?? 0) + 1
  }

  // Mix as % of total surface
  const mix = {
    mode: totalSurface ? (surfaceByType.mode ?? 0) / totalSurface * 100 : 0,
    restauration: totalSurface ? (surfaceByType.restauration ?? 0) / totalSurface * 100 : 0,
    services: totalSurface ? (surfaceByType.services ?? 0) / totalSurface * 100 : 0,
    loisirs: totalSurface ? (surfaceByType.loisirs ?? 0) / totalSurface * 100 : 0,
    commerce: totalSurface ? (surfaceByType.commerce ?? 0) / totalSurface * 100 : 0,
    autres: totalSurface ? (surfaceByType.autres ?? 0) / totalSurface * 100 : 0,
    score: 0,
  }

  // Mix score: for each category, 1.0 if in range, partial otherwise
  let mixScore = 0
  const categories: Array<keyof typeof IDEAL_MIX> = ['mode', 'restauration', 'services', 'loisirs', 'commerce']
  for (const cat of categories) {
    const val = mix[cat]
    const { min, max } = IDEAL_MIX[cat]
    if (val >= min && val <= max) mixScore += 1
    else if (val < min) mixScore += val / min
    else mixScore += Math.max(0, 1 - (val - max) / max)
  }
  mix.score = (mixScore / categories.length) * 100

  // Occupancy
  const occupancyCounts = { vacant: 0, occupied: 0, reserved: 0, works: 0, negotiation: 0 }
  for (const sp of spaces) {
    const st = sp.status ?? 'vacant'
    if (st in occupancyCounts) {
      occupancyCounts[st as keyof typeof occupancyCounts]++
    }
  }
  const totalCount = spaces.length
  const occupancy = {
    ...occupancyCounts,
    totalCount,
    occupiedPct: totalCount ? (occupancyCounts.occupied / totalCount) * 100 : 0,
    vacantPct: totalCount ? (occupancyCounts.vacant / totalCount) * 100 : 0,
  }

  // Anchors
  const anchorTenants = tenants.filter(t => t.anchor)
  const anchorSpaces = spaces.filter(sp => sp.tenantId && anchorTenants.some(t => t.id === sp.tenantId))
  const anchors = {
    count: anchorTenants.length,
    totalSurfaceSqm: anchorSpaces.reduce((s, sp) => s + sp.areaSqm, 0),
    surfacePct: totalSurface ? (anchorSpaces.reduce((s, sp) => s + sp.areaSqm, 0) / totalSurface) * 100 : 0,
  }

  // Revenue
  let totalMonthly = 0
  let rentCount = 0
  let rentSum = 0
  for (const sp of spaces) {
    if (!sp.tenantId) continue
    const tenant = tenants.find(t => t.id === sp.tenantId)
    if (!tenant) continue
    const perM2 = tenant.rentFcfaM2 ?? 0
    if (perM2 > 0) {
      totalMonthly += perM2 * sp.areaSqm
      rentSum += perM2
      rentCount++
    } else if (tenant.monthlyRentFcfa) {
      totalMonthly += tenant.monthlyRentFcfa
    }
  }
  const averageRentFcfaM2 = rentCount > 0 ? rentSum / rentCount : 0
  const monthlyRevenueFcfa = totalMonthly
  const annualRevenueFcfa = totalMonthly * 12

  // ── RULES ──
  if (totalCount === 0) {
    issues.push({
      severity: 'critical',
      code: 'NO-SPACES',
      title: 'Aucun local commercial',
      description: 'Le plan ne contient aucun local commercial identifie.',
      recommendation: 'Importer un plan avec des zones fermees pour identifier les locaux.',
    })
  }
  if (occupancy.vacantPct > 30 && totalCount > 5) {
    issues.push({
      severity: 'warning',
      code: 'HIGH-VACANCY',
      title: `Taux de vacance eleve (${occupancy.vacantPct.toFixed(0)}%)`,
      description: `${occupancyCounts.vacant} sur ${totalCount} locaux sont vacants. Un taux > 30% est un signal faible.`,
      recommendation: 'Lancer une campagne commerciale ou ajuster les loyers pour ces locaux.',
    })
  }
  if (occupancy.vacantPct > 50 && totalCount > 5) {
    issues.push({
      severity: 'critical',
      code: 'VERY-HIGH-VACANCY',
      title: `Taux de vacance critique (${occupancy.vacantPct.toFixed(0)}%)`,
      description: 'Plus de la moitie des locaux sont vacants. Risque majeur sur la rentabilite.',
      recommendation: 'Revoir urgemment la strategie commerciale et le mix.',
    })
  }
  if (anchors.count === 0 && totalCount > 10) {
    issues.push({
      severity: 'warning',
      code: 'NO-ANCHOR',
      title: 'Aucune locomotive (anchor)',
      description: 'Un centre commercial sans locomotive generera peu de trafic.',
      recommendation: 'Identifier 2-3 locomotives (hypermarche, cinema, grande enseigne mode).',
    })
  }
  if (anchors.count > 0 && anchors.surfacePct < 15) {
    issues.push({
      severity: 'info',
      code: 'LOW-ANCHOR-SURFACE',
      title: `Surface des locomotives faible (${anchors.surfacePct.toFixed(0)}%)`,
      description: 'Les locomotives occupent moins de 15% de la GLA. Pour un mall majeur, viser 20-30%.',
    })
  }
  for (const cat of categories) {
    const { min, max } = IDEAL_MIX[cat]
    const val = mix[cat]
    if (val < min) {
      issues.push({
        severity: val < min / 2 ? 'warning' : 'info',
        code: `LOW-${cat.toUpperCase()}`,
        title: `Sous-representation ${cat} (${val.toFixed(0)}%)`,
        description: `La categorie ${cat} represente ${val.toFixed(0)}% de la GLA, en dessous de la fourchette ideale (${min}-${max}%).`,
      })
    } else if (val > max) {
      issues.push({
        severity: val > max * 1.5 ? 'warning' : 'info',
        code: `HIGH-${cat.toUpperCase()}`,
        title: `Sur-representation ${cat} (${val.toFixed(0)}%)`,
        description: `La categorie ${cat} represente ${val.toFixed(0)}% de la GLA, au-dessus de la fourchette ideale (${min}-${max}%).`,
      })
    }
  }

  const summary = {
    info: issues.filter(i => i.severity === 'info').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    critical: issues.filter(i => i.severity === 'critical').length,
  }

  const score = Math.max(0, Math.round(
    (mix.score * 0.4) + (occupancy.occupiedPct * 0.4) + (Math.min(anchors.surfacePct * 5, 20))
    - summary.critical * 15 - summary.warning * 5
  ))

  return {
    timestamp: new Date().toISOString(),
    scorePct: Math.min(100, score),
    totalSurfaceSqm: totalSurface,
    surfaceByType,
    countByType,
    occupancy,
    mix,
    anchors,
    averageRentFcfaM2,
    monthlyRevenueFcfa,
    annualRevenueFcfa,
    issues,
    summary,
  }
}

// ── PDF Report for Vol.1 ──

import jsPDF from 'jspdf'

export async function generateCommercialReportPDF(input: {
  projectName: string
  orgName?: string
  spaces: CommercialSpace[]
  tenants: Tenant[]
  report: CommercialReport
}): Promise<Blob> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 15

  const COLORS = {
    primary: [245, 158, 11] as [number, number, number],   // amber-500
    success: [5, 150, 105] as [number, number, number],
    warning: [245, 158, 11] as [number, number, number],
    critical: [220, 38, 38] as [number, number, number],
    gray: [71, 85, 105] as [number, number, number],
    lightGray: [226, 232, 240] as [number, number, number],
  }

  const fmtFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA'
  const fmtDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  let page = 1
  const header = () => {
    pdf.setFillColor(...COLORS.primary)
    pdf.rect(0, 0, W, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(8)
    pdf.text(input.projectName, M, 6.5)
    pdf.text(`Rapport Commercial · ${fmtDateTime(input.report.timestamp)}`, W - M, 6.5, { align: 'right' })
    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(7)
    pdf.text(`Page ${page}`, W / 2, H - 5, { align: 'center' })
  }

  // ─── Cover ───
  header()
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(32)
  pdf.setFont('helvetica', 'bold')
  pdf.text('PLAN', M, 60)
  pdf.text('COMMERCIAL', M, 75)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'normal')
  pdf.text('Mix enseignes · Occupancy · Revenue', M, 85)

  const score = input.report.scorePct
  const scoreColor: [number, number, number] = score >= 70 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.critical
  pdf.setFillColor(...scoreColor)
  pdf.roundedRect(W - M - 80, 45, 80, 60, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(60)
  pdf.setFont('helvetica', 'bold')
  pdf.text(String(Math.round(score)), W - M - 40, 82, { align: 'center' })
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.text('score commercial', W - M - 40, 95, { align: 'center' })

  // KPIs row
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
  drawKpi(M, 'GLA totale', `${input.report.totalSurfaceSqm.toFixed(0)} m²`, `${input.report.occupancy.totalCount} locaux`)
  drawKpi(M + kpiW + 3, 'Occupation', `${input.report.occupancy.occupiedPct.toFixed(0)}%`, `${input.report.occupancy.vacant} vacants`)
  drawKpi(M + 2 * (kpiW + 3), 'Loyer mensuel', fmtFCFA(input.report.monthlyRevenueFcfa))
  drawKpi(M + 3 * (kpiW + 3), 'Revenu annuel', fmtFCFA(input.report.annualRevenueFcfa))

  // Mix breakdown
  let y = 175
  pdf.setTextColor(...COLORS.primary)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Mix enseignes', M, y)
  pdf.setDrawColor(...COLORS.primary)
  pdf.line(M, y + 3, W - M, y + 3)
  y += 10

  const mixCats: Array<[keyof typeof IDEAL_MIX, string, [number, number, number]]> = [
    ['mode', 'Mode / Textile', [59, 130, 246]],
    ['restauration', 'Restauration', [245, 158, 11]],
    ['services', 'Services', [20, 184, 166]],
    ['loisirs', 'Loisirs', [6, 182, 212]],
    ['commerce', 'Commerce divers', [139, 92, 246]],
    ['autres', 'Autres', [100, 116, 139]],
  ]
  for (const [cat, label, color] of mixCats) {
    const val = input.report.mix[cat]
    const ideal = IDEAL_MIX[cat]
    pdf.setTextColor(30, 41, 59)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(label, M, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...COLORS.gray)
    pdf.setFontSize(8)
    pdf.text(`${val.toFixed(1)}% · ideal ${ideal.min}-${ideal.max}%`, M + 50, y)

    const barX = M + 100
    const barW = W - M - barX
    pdf.setFillColor(...COLORS.lightGray)
    pdf.rect(barX, y - 2.5, barW, 3, 'F')
    // Ideal range overlay (lighter)
    const idealStart = (ideal.min / 50) * barW
    const idealEnd = (ideal.max / 50) * barW
    pdf.setFillColor(...color)
    pdf.setGState(new (pdf as unknown as { GState: new (s: { opacity: number }) => unknown }).GState({ opacity: 0.25 }))
    pdf.rect(barX + idealStart, y - 3, idealEnd - idealStart, 4, 'F')
    pdf.setGState(new (pdf as unknown as { GState: new (s: { opacity: number }) => unknown }).GState({ opacity: 1 }))
    // Actual
    pdf.setFillColor(...color)
    pdf.rect(barX, y - 2.5, Math.min(barW, (val / 50) * barW), 3, 'F')
    y += 6
  }
  y += 8

  // Issues
  if (input.report.issues.length > 0) {
    pdf.setTextColor(...COLORS.primary)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Recommandations', M, y)
    y += 5
    for (const iss of input.report.issues) {
      if (y > H - 25) { pdf.addPage(); page++; header(); y = 25 }
      const c = iss.severity === 'critical' ? COLORS.critical : iss.severity === 'warning' ? COLORS.warning : [100, 116, 139] as [number, number, number]
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
      const lines = pdf.splitTextToSize(iss.description, W - 2 * M - 6)
      for (const ln of lines) {
        if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
        pdf.text(ln, M + 6, y)
        y += 3
      }
      if (iss.recommendation) {
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(...c)
        const lines2 = pdf.splitTextToSize(`→ ${iss.recommendation}`, W - 2 * M - 6)
        for (const ln of lines2) {
          if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
          pdf.text(ln, M + 6, y)
          y += 3
        }
      }
      y += 3
    }
  }

  // ─── Tenant list page ───
  pdf.addPage(); page++; header()
  y = 25
  pdf.setTextColor(...COLORS.primary)
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Nomenclature locaux et enseignes', M, y)
  pdf.setDrawColor(...COLORS.primary)
  pdf.line(M, y + 3, W - M, y + 3)
  y += 10

  // Table header
  const cols = [M, M + 32, M + 62, M + 85, M + 105, M + 130, M + 155]
  pdf.setFillColor(...COLORS.lightGray)
  pdf.rect(M, y, W - 2 * M, 6, 'F')
  pdf.setFontSize(7)
  pdf.setTextColor(...COLORS.gray)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Local', cols[0] + 1, y + 4)
  pdf.text('Enseigne', cols[1] + 1, y + 4)
  pdf.text('Categorie', cols[2] + 1, y + 4)
  pdf.text('Surface', cols[3] + 1, y + 4)
  pdf.text('Etat', cols[4] + 1, y + 4)
  pdf.text('Loyer / m²', cols[5] + 1, y + 4)
  pdf.text('Loyer mens.', cols[6] + 1, y + 4)
  y += 7

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(7)
  for (const sp of input.spaces) {
    if (y > H - 20) { pdf.addPage(); page++; header(); y = 25 }
    const tenant = sp.tenantId ? input.tenants.find(t => t.id === sp.tenantId) : null
    const cat = categorize(sp.type)
    const perM2 = tenant?.rentFcfaM2 ?? 0
    const monthly = perM2 > 0 ? perM2 * sp.areaSqm : tenant?.monthlyRentFcfa ?? 0
    pdf.text(sp.label, cols[0] + 1, y)
    pdf.text(tenant?.name ?? '—', cols[1] + 1, y)
    pdf.text(cat, cols[2] + 1, y)
    pdf.text(`${sp.areaSqm.toFixed(0)} m²`, cols[3] + 1, y)
    pdf.text(sp.status ?? 'vacant', cols[4] + 1, y)
    pdf.text(perM2 > 0 ? fmtFCFA(perM2) : '—', cols[5] + 1, y)
    pdf.text(monthly > 0 ? fmtFCFA(monthly) : '—', cols[6] + 1, y)
    y += 4.5
  }

  return pdf.output('blob')
}

export function generateCommercialCSV(input: { spaces: CommercialSpace[]; tenants: Tenant[] }): string {
  const lines: string[] = []
  lines.push('Local;Enseigne;Categorie;Surface (m²);Etat;Ancrage;Loyer FCFA/m²;Loyer mensuel FCFA;Loyer annuel FCFA')
  for (const sp of input.spaces) {
    const tenant = sp.tenantId ? input.tenants.find(t => t.id === sp.tenantId) : null
    const cat = categorize(sp.type)
    const perM2 = tenant?.rentFcfaM2 ?? 0
    const monthly = perM2 > 0 ? perM2 * sp.areaSqm : tenant?.monthlyRentFcfa ?? 0
    lines.push([
      sp.label,
      tenant?.name ?? '',
      cat,
      sp.areaSqm.toFixed(1),
      sp.status ?? 'vacant',
      tenant?.anchor ? 'Oui' : 'Non',
      perM2 > 0 ? String(Math.round(perM2)) : '',
      monthly > 0 ? String(Math.round(monthly)) : '',
      monthly > 0 ? String(Math.round(monthly * 12)) : '',
    ].join(';'))
  }
  return lines.join('\n')
}
