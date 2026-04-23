// ═══ PROPH3T REPORT ENGINE — Rapport PDF détaillé multi-skills + evidence ═══
// Combine Phase A + B + C + Vol.1 commercial dans un livrable directeur
// avec : score global, narratifs, actions priorisées, plan(s) joint(s), sources citées.

import jsPDF from 'jspdf'
import type { Proph3tResult, Proph3tAction, Severity } from './orchestrator.types'

export interface Proph3tReportInput {
  projectName: string
  orgName?: string
  /** Date du rapport. */
  date?: string
  /** Résultats de chaque skill (clé = skillId). */
  results: Record<string, Proph3tResult<unknown>>
  /** Capture(s) du plan en data URL (PNG). */
  planScreenshots?: Array<{ label: string; dataUrl: string }>
  /** Note exécutive du directeur. */
  executiveNote?: string
  /** Logo URL data:image/...;base64,... (optionnel). */
  logoDataUrl?: string
}

const SEVERITY_COLOR: Record<Severity, [number, number, number]> = {
  critical: [239, 68, 68],
  warning: [245, 158, 11],
  info: [59, 130, 246],
}

const SCORE_COLOR = (n: number): [number, number, number] => {
  if (n >= 75) return [16, 185, 129]
  if (n >= 50) return [245, 158, 11]
  return [239, 68, 68]
}

function formatFcfa(n: number | undefined): string {
  if (!n || n <= 0) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Md FCFA`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M FCFA`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} k FCFA`
  return `${Math.round(n)} FCFA`
}

function formatDelay(d: number | undefined): string {
  if (!d) return '—'
  if (d < 7) return `${d} j`
  if (d < 60) return `${Math.round(d / 7)} sem.`
  return `${Math.round(d / 30)} mois`
}

export function generateProph3tReport(input: Proph3tReportInput): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = 210, H = 297
  const margin = 15
  const date = input.date ?? new Date().toISOString()

  const skills = Object.values(input.results).sort((a, b) => a.skill.localeCompare(b.skill))
  const overallScore = skills.length > 0
    ? Math.round(skills.reduce((s, r) => s + (r.qualityScore ?? 0), 0) / skills.length)
    : 0

  // ═══ PAGE 1 : COUVERTURE ═══
  pdf.setFillColor(11, 15, 25)
  pdf.rect(0, 0, W, H, 'F')

  pdf.setTextColor(168, 85, 247) // purple-500
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  pdf.text('PROPH3T · RAPPORT INTELLIGENT', margin, 18)

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(28)
  pdf.text(input.projectName, margin, 46)
  if (input.orgName) {
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(180, 190, 205)
    pdf.text(input.orgName, margin, 54)
  }

  pdf.setFontSize(10)
  pdf.setTextColor(150, 160, 175)
  pdf.text(`Analyse : ${new Date(date).toLocaleString('fr-FR')}`, margin, 68)
  pdf.text(`${skills.length} skill(s) PROPH3T exécutée(s)`, margin, 74)

  // Score global central
  const [r, g, b] = SCORE_COLOR(overallScore)
  pdf.setFillColor(r, g, b)
  pdf.roundedRect(margin, 90, 90, 60, 5, 5, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(56)
  pdf.text(`${overallScore}`, margin + 8, 130)
  pdf.setFontSize(11)
  pdf.text('SCORE GLOBAL /100', margin + 8, 142)

  // Mini scores par skill
  let sy = 90
  for (const r of skills) {
    if (sy > 145) break
    const sc = r.qualityScore ?? 0
    const [sr, sg, sb] = SCORE_COLOR(sc)
    pdf.setFillColor(20, 28, 45)
    pdf.roundedRect(margin + 95, sy, 95, 17, 2, 2, 'F')
    pdf.setTextColor(sr, sg, sb)
    pdf.setFontSize(18)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${sc}`, margin + 99, sy + 12)
    pdf.setTextColor(220, 230, 245)
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'bold')
    pdf.text(r.skill, margin + 117, sy + 7)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(150, 160, 175)
    pdf.text(`source: ${r.source}`, margin + 117, sy + 13)
    sy += 20
  }

  // Note exec
  if (input.executiveNote) {
    pdf.setTextColor(180, 190, 205)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('NOTE EXÉCUTIVE', margin, 175)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(220, 230, 245)
    const wrapped = pdf.splitTextToSize(input.executiveNote, W - 2 * margin)
    pdf.text(wrapped, margin, 183)
  }

  // Synthèse stats
  const totalActions = skills.reduce((s, r) => s + r.actions.length, 0)
  const criticalActions = skills.reduce((s, r) => s + r.actions.filter(a => a.severity === 'critical').length, 0)
  const totalBudget = skills.reduce((s, r) => s + r.actions.reduce((b, a) => b + (a.estimatedCostFcfa ?? 0), 0), 0)

  pdf.setTextColor(168, 85, 247)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.text('SYNTHÈSE ACTIONS', margin, 220)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(220, 230, 245)
  pdf.text(`${totalActions} action(s) recommandée(s) — ${criticalActions} critique(s)`, margin, 228)
  pdf.text(`Budget estimé total : ${formatFcfa(totalBudget)}`, margin, 234)

  // Footer page 1
  pdf.setTextColor(120, 130, 145)
  pdf.setFontSize(7)
  pdf.text(
    `PROPH3T tourne en local (Ollama) avec fallback transparent · Toutes recommandations citent leurs sources`,
    margin, H - 15,
  )

  // ═══ PAGES 2+ : UNE SECTION PAR SKILL ═══
  for (const result of skills) {
    pdf.addPage()
    renderSkillSection(pdf, result, W, H, margin)
  }

  // ═══ DERNIÈRE PAGE : PLAN(S) JOINT(S) ═══
  if (input.planScreenshots && input.planScreenshots.length > 0) {
    for (const shot of input.planScreenshots) {
      pdf.addPage()
      pdf.setFillColor(255, 255, 255)
      pdf.rect(0, 0, W, H, 'F')
      pdf.setTextColor(25, 35, 55)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(14)
      pdf.text(`Plan : ${shot.label}`, margin, 20)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(120, 130, 145)
      pdf.text(`Capture du plan analysé par PROPH3T (référence visuelle des recommandations)`, margin, 26)

      try {
        // Insère l'image dans le reste de la page
        const imgY = 32
        const maxW = W - 2 * margin
        const maxH = H - imgY - 18
        // Mesure ratio via canvas ad-hoc — mais jsPDF accepte les data URLs PNG
        pdf.addImage(shot.dataUrl, 'PNG', margin, imgY, maxW, maxH, undefined, 'MEDIUM')
      } catch (err) {
        pdf.setTextColor(200, 50, 50)
        pdf.text(`Erreur d'embed image : ${err instanceof Error ? err.message : String(err)}`, margin, 50)
      }
    }
  }

  // ═══ DERNIÈRE PAGE : PLAN D'ACTION CONSOLIDÉ ═══
  pdf.addPage()
  renderActionPlanGantt(pdf, skills, W, H, margin)

  // Footer toutes pages
  const pageCount = pdf.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7)
    pdf.setTextColor(150, 160, 175)
    pdf.setFont('helvetica', 'normal')
    pdf.text(
      `${input.projectName} · PROPH3T · Page ${i}/${pageCount}`,
      W - margin, H - 8, { align: 'right' },
    )
  }

  return pdf
}

// ─── Section par skill ────────────────────────────────────

function renderSkillSection(pdf: jsPDF, result: Proph3tResult<unknown>, W: number, H: number, margin: number): void {
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, W, H, 'F')

  // Header skill
  const sc = result.qualityScore ?? 0
  const [r, g, b] = SCORE_COLOR(sc)
  pdf.setFillColor(r, g, b)
  pdf.roundedRect(margin, 18, 22, 22, 3, 3, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text(`${sc}`, margin + 4, 33)

  pdf.setTextColor(25, 35, 55)
  pdf.setFontSize(15)
  pdf.text(skillTitle(result.skill), margin + 28, 28)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(100, 115, 130)
  pdf.text(`Source : ${result.source} · confiance ${(result.confidence.score * 100).toFixed(0)}% · ${result.elapsedMs.toFixed(0)} ms`, margin + 28, 34)
  pdf.text(`${new Date(result.timestamp).toLocaleString('fr-FR')}`, margin + 28, 39)

  // Résumé exécutif
  let y = 50
  pdf.setTextColor(50, 60, 80)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text('Résumé exécutif', margin, y)
  y += 5
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(60, 70, 90)
  const wrapped = pdf.splitTextToSize(result.executiveSummary, W - 2 * margin)
  pdf.text(wrapped, margin, y)
  y += wrapped.length * 4 + 4

  // Findings
  if (result.findings.length > 0) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(50, 60, 80)
    pdf.text(`Diagnostic (${result.findings.length})`, margin, y)
    y += 6
    for (const f of result.findings) {
      if (y > H - 30) { pdf.addPage(); y = 25 }
      const [fr, fg, fb] = SEVERITY_COLOR[f.severity]
      pdf.setFillColor(fr, fg, fb)
      pdf.circle(margin + 2, y, 1.5, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(25, 35, 55)
      pdf.text(f.title, margin + 6, y + 1)
      y += 4
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(80, 90, 110)
      const desc = pdf.splitTextToSize(f.description, W - 2 * margin - 6)
      pdf.text(desc, margin + 6, y)
      y += desc.length * 3.5 + 1
      // Sources
      if (f.sources.length > 0) {
        pdf.setFontSize(7)
        pdf.setTextColor(140, 150, 170)
        const srcText = `Sources : ${f.sources.map(s => `${s.kind}/${s.label}`).join(' · ')}`
        const srcLines = pdf.splitTextToSize(srcText, W - 2 * margin - 6)
        pdf.text(srcLines, margin + 6, y)
        y += srcLines.length * 3 + 3
      }
    }
  }

  // Actions recommandées
  if (result.actions.length > 0) {
    if (y > H - 30) { pdf.addPage(); y = 25 }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(50, 60, 80)
    pdf.text(`Actions recommandées (${result.actions.length})`, margin, y)
    y += 6
    // En-tête tableau
    pdf.setFillColor(240, 245, 250)
    pdf.rect(margin, y - 4, W - 2 * margin, 6, 'F')
    pdf.setFontSize(7)
    pdf.setTextColor(60, 70, 90)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SEV', margin + 2, y)
    pdf.text('ACTION', margin + 14, y)
    pdf.text('CONFIANCE', margin + 110, y)
    pdf.text('BUDGET', margin + 138, y)
    pdf.text('DÉLAI', margin + 168, y)
    y += 4

    for (const a of result.actions) {
      if (y > H - 25) { pdf.addPage(); y = 25 }
      const [ar, ag, ab] = SEVERITY_COLOR[a.severity]
      pdf.setFillColor(ar, ag, ab)
      pdf.circle(margin + 4, y + 1, 1.5, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(25, 35, 55)
      const labelLines = pdf.splitTextToSize(a.label, 92)
      pdf.text(labelLines, margin + 14, y + 1)
      const linesUsed = labelLines.length
      // Confiance
      pdf.setFontSize(8)
      pdf.text(`${(a.confidence.score * 100).toFixed(0)}%`, margin + 110, y + 1)
      // Budget
      pdf.text(formatFcfa(a.estimatedCostFcfa), margin + 138, y + 1)
      // Délai
      pdf.text(formatDelay(a.estimatedDelayDays), margin + 168, y + 1)
      // Rationale (italique petit)
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(7)
      pdf.setTextColor(100, 115, 130)
      const rat = pdf.splitTextToSize(a.rationale, W - 2 * margin - 14)
      pdf.text(rat, margin + 14, y + 1 + linesUsed * 3.5)
      y += linesUsed * 3.5 + rat.length * 3 + 5

      // Sources en pills
      if (a.sources.length > 0) {
        pdf.setFontSize(6)
        pdf.setTextColor(140, 150, 170)
        const srcText = a.sources.map(s => `[${s.kind}] ${s.label}${s.reference ? ' — ' + s.reference : ''}`).join(' · ')
        const srcLines = pdf.splitTextToSize(srcText, W - 2 * margin - 14)
        pdf.text(srcLines, margin + 14, y)
        y += srcLines.length * 2.5 + 2
      }
      y += 1
    }
  }
}

function skillTitle(id: string): string {
  switch (id) {
    case 'analyzePlanAtImport': return 'Phase A — Analyse du plan à l\'import'
    case 'auditSecurity': return 'Phase B — Audit sécurité ERP'
    case 'analyzeParcours': return 'Phase C — Parcours client'
    case 'analyzeCommercialMix': return 'Vol.1 — Mix enseignes & finance'
    default: return id
  }
}

// ─── Plan d'action consolidé Gantt ────────────────────────

function renderActionPlanGantt(pdf: jsPDF, skills: Proph3tResult<unknown>[], W: number, H: number, margin: number): void {
  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, W, H, 'F')
  pdf.setTextColor(25, 35, 55)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('Plan d\'action consolidé', margin, 20)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 115, 130)
  pdf.text('Toutes skills · classement par criticité × confiance × budget', margin, 26)

  // Aggregate + sort all actions by priority score
  const allActions: Array<Proph3tAction & { skillId: string }> = []
  for (const r of skills) {
    for (const a of r.actions) allActions.push({ ...a, skillId: r.skill })
  }
  const sevWeight: Record<Severity, number> = { critical: 100, warning: 50, info: 10 }
  allActions.sort((a, b) => {
    const pa = sevWeight[a.severity] * a.confidence.score
    const pb = sevWeight[b.severity] * b.confidence.score
    return pb - pa
  })

  // Top 25 actions affichées
  const topActions = allActions.slice(0, 25)
  const totalBudget = allActions.reduce((s, a) => s + (a.estimatedCostFcfa ?? 0), 0)
  const maxDelay = Math.max(7, ...topActions.map(a => a.estimatedDelayDays ?? 0))

  let y = 38
  pdf.setFontSize(8)
  pdf.setTextColor(80, 90, 110)
  pdf.text(`${allActions.length} actions au total · ${topActions.length} prioritaires affichées · budget cumulé : ${formatFcfa(totalBudget)}`, margin, y)
  y += 8

  // Gantt simple : chaque ligne = 1 action, barre proportionnelle au délai
  const colNum = 12
  const colSkill = 24
  const colLabel = 50
  const colSev = 110
  const colGantt = 130
  const colEnd = W - margin

  for (const a of topActions) {
    if (y > H - 18) { pdf.addPage(); y = 25 }
    pdf.setFontSize(7)
    pdf.setTextColor(120, 130, 145)
    pdf.text(`${topActions.indexOf(a) + 1}`, colNum, y)
    pdf.setFont('helvetica', 'bold')
    pdf.text(a.skillId.slice(0, 12), colSkill, y)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(25, 35, 55)
    const lab = pdf.splitTextToSize(a.label, colSev - colLabel - 2)
    pdf.text(lab[0] ?? '', colLabel, y)
    // Sev pill
    const [sr, sg, sb] = SEVERITY_COLOR[a.severity]
    pdf.setFillColor(sr, sg, sb)
    pdf.roundedRect(colSev, y - 3, 16, 4, 1, 1, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(6)
    pdf.text(a.severity, colSev + 2, y)
    // Gantt bar
    const delayDays = a.estimatedDelayDays ?? 0
    const ganttW = colEnd - colGantt
    const barW = (delayDays / maxDelay) * ganttW
    pdf.setFillColor(200, 220, 240)
    pdf.rect(colGantt, y - 2.5, ganttW, 3, 'F')
    pdf.setFillColor(sr, sg, sb)
    pdf.rect(colGantt, y - 2.5, Math.max(1, barW), 3, 'F')
    pdf.setTextColor(60, 70, 90)
    pdf.setFontSize(6)
    pdf.text(formatDelay(delayDays), colGantt + ganttW + 1, y, { align: 'right' })
    y += 6
  }

  // Bilan budget
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.setTextColor(25, 35, 55)
  if (y < H - 25) {
    y += 5
    pdf.text(`Budget total estimé : ${formatFcfa(totalBudget)}`, margin, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 115, 130)
    pdf.text(`Réparti sur ${maxDelay} jours · ${allActions.filter(a => a.severity === 'critical').length} actions critiques à traiter en priorité`, margin, y)
  }
}

// ─── Helper de download ───────────────────────────────────

export function downloadProph3tReport(input: Proph3tReportInput): void {
  const pdf = generateProph3tReport(input)
  const safe = input.projectName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
  pdf.save(`proph3t-rapport-${safe}-${Date.now()}.pdf`)
}
