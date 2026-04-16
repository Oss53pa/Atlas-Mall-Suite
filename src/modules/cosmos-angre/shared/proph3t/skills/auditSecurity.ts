// ═══ SKILL Phase B — Audit sécuritaire complet ═══
// Orchestre : compliance ERP + coverage caméra + Dijkstra évacuation + risk bayésien
// Produit : findings priorisés + actions cliquables avec budget/délai estimé.

import type { Proph3tResult, Proph3tAction, Proph3tFinding } from '../orchestrator.types'
import { citeAlgo, citeErp, confidence } from '../orchestrator.types'
import { runCompliance, type ComplianceReport } from '../../engines/complianceEngine'
import { computeCoverage, type Camera as CovCamera, type Space as CovSpace } from '../../engines/cameraCoverageEngine'
import { optimizeCoverage } from '../../engines/coverageOptimizer'
import { dijkstraMultiSource, type GraphNode, type GraphEdge } from '../algorithms/dijkstraMultiSource'
import { quickRiskScore } from '../algorithms/bayesianRisk'
import { ERP_RULES } from '../../benchmarks/erpRegulations'

export interface SecurityAuditInput {
  planWidth: number
  planHeight: number
  spaces: Array<CovSpace & { type?: string; areaSqm: number; polygon: [number, number][]; floorId?: string; label: string }>
  cameras: CovCamera[]
  doors: Array<{ id: string; floorId: string; x: number; y: number; isExit?: boolean; hasBadge?: boolean; capexFcfa?: number }>
  floors: Array<{ id: string; label: string; bounds: { width: number; height: number } }>
  /** Type ERP (M par défaut). */
  erpType?: 'M' | 'N' | 'L' | 'O' | 'CTS' | 'mixed'
  /** Capex unitaire estimé caméra/porte. */
  cameraUnitCapex?: number
  doorUnitCapex?: number
}

export interface SecurityAuditPayload {
  complianceScore: number
  coveragePctGlobal: number
  riskByZone: Array<{ spaceId: string; label: string; riskScore: number; level: 'low' | 'medium' | 'high' }>
  evacuation: {
    worstNodeId?: string
    worstDistanceM?: number
    worstTimeS?: number
    averageTimeS: number
  }
  recommendedAdditions: {
    cameras: number
    doors: number
    estimatedBudgetFcfa: number
  }
  complianceReport: ComplianceReport
}

export async function auditSecurity(input: SecurityAuditInput): Promise<Proph3tResult<SecurityAuditPayload>> {
  const t0 = performance.now()
  const cameraCapex = input.cameraUnitCapex ?? 850_000
  const doorCapex = input.doorUnitCapex ?? 1_200_000

  // ─── 1. Couverture par étage ───
  const coverageMap: Record<string, ReturnType<typeof computeCoverage>> = {}
  let totalCoverArea = 0, totalSpaceArea = 0
  for (const f of input.floors) {
    const cov = computeCoverage(input.cameras, input.spaces, f.id, { width: input.planWidth, height: input.planHeight })
    coverageMap[f.id] = cov
    totalCoverArea += cov.coveredAreaSqm
    totalSpaceArea += cov.totalAreaSqm
  }
  const coveragePctGlobal = totalSpaceArea > 0 ? (totalCoverArea / totalSpaceArea) * 100 : 0

  // ─── 2. Compliance ERP ───
  const complianceReport = runCompliance({
    cameras: input.cameras,
    doors: input.doors,
    spaces: input.spaces.map(s => ({ id: s.id, floorId: s.floorId, type: s.type, areaSqm: s.areaSqm, polygon: s.polygon })),
    floors: input.floors.map(f => ({ id: f.id, label: f.label, totalAreaSqm: f.bounds.width * f.bounds.height })),
    coverage: coverageMap,
    erpType: 'shopping-mall',
  })

  // ─── 3. Risque bayésien par zone ───
  const riskByZone: SecurityAuditPayload['riskByZone'] = input.spaces.slice(0, 50).map(sp => {
    const hasCam = input.cameras.some(c => Math.hypot(c.x - centerX(sp), c.y - centerY(sp)) < (c.rangeM ?? 10))
    const exitsHere = input.doors.filter(d => d.floorId === sp.floorId && d.isExit && Math.hypot(d.x - centerX(sp), d.y - centerY(sp)) < 30).length
    const badgeHere = input.doors.some(d => d.floorId === sp.floorId && d.hasBadge && Math.hypot(d.x - centerX(sp), d.y - centerY(sp)) < 20)
    const probs = quickRiskScore({
      hasCamera: hasCam,
      hasExit: exitsHere > 0,
      hasBadge: badgeHere,
      isFloor0: !sp.floorId || /RDC|R0/i.test(sp.floorId),
      hasFire: /technique|chauffer|electr/i.test(String(sp.type ?? '')),
      hasWindowAccess: /exterieur|cour|parking/i.test(String(sp.type ?? '')),
    })
    const score = probs.risky
    const level = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low'
    return { spaceId: sp.id, label: sp.label, riskScore: score, level }
  }).sort((a, b) => b.riskScore - a.riskScore)

  // ─── 4. Évacuation Dijkstra multi-source ───
  const nodes: GraphNode[] = input.spaces.map(sp => ({
    id: `s-${sp.id}`, x: centerX(sp), y: centerY(sp),
  }))
  const edges: GraphEdge[] = []
  // Maillage léger : connecte chaque space à ses 3 plus proches voisins (proxy graph navigation)
  for (let i = 0; i < input.spaces.length; i++) {
    const a = nodes[i]
    const others = nodes.filter((_, j) => j !== i).map(n => ({ n, d: Math.hypot(n.x - a.x, n.y - a.y) }))
    others.sort((x, y) => x.d - y.d)
    for (const { n, d } of others.slice(0, 3)) {
      edges.push({ from: a.id, to: n.id, distM: d })
    }
  }
  const exitNodes = input.doors.filter(d => d.isExit).map(d => {
    // Trouve le space le plus proche pour rattacher la sortie au graph
    let best = nodes[0]; let bestD = Infinity
    for (const n of nodes) {
      const d2 = Math.hypot(n.x - d.x, n.y - d.y)
      if (d2 < bestD) { bestD = d2; best = n }
    }
    return best.id
  })
  const evac = dijkstraMultiSource(nodes, edges, exitNodes)
  const finiteTimes = Array.from(evac.evacuationTimes.values()).filter(Number.isFinite)
  const avgTime = finiteTimes.length > 0 ? finiteTimes.reduce((s, v) => s + v, 0) / finiteTimes.length : 0

  // ─── 5. Optim caméras additionnelles ───
  const optResult = optimizeCoverage({
    planWidth: input.planWidth,
    planHeight: input.planHeight,
    spaces: input.spaces.map(s => ({ id: s.id, type: s.type ?? 'commerce', polygon: s.polygon })),
    budget: Math.max(2, Math.round((input.planWidth * input.planHeight) / 250)),
    existing: input.cameras,
    defaultRangeM: 12, defaultFovDeg: 90, gridStepM: 1.5,
  })
  const recommendedCameras = optResult.proposed.length

  // ─── 6. Findings ───
  const findings: Proph3tFinding[] = []

  // Couverture
  if (coveragePctGlobal < 70) {
    findings.push({
      id: 'low-coverage', severity: coveragePctGlobal < 50 ? 'critical' : 'warning',
      title: `Couverture caméra insuffisante : ${coveragePctGlobal.toFixed(1)}%`,
      description: `Cible APSAD R82 minimum 80% pour ERP cat 1-2 — ${(80 - coveragePctGlobal).toFixed(1)} pts à combler.`,
      affectedIds: input.floors.map(f => f.id),
      sources: [citeAlgo('coverage-rasterization', 'Rasterisation 0.5m + cônes FOV'), citeErp('CCTV-01', 'APSAD R82', 'CI Loi 2013-450')],
      confidence: confidence(0.95, 'Calcul géométrique exact'),
      metric: { name: 'coverage', value: coveragePctGlobal, unit: '%' },
    })
  }

  // Compliance issues
  for (const issue of complianceReport.issues.slice(0, 5)) {
    if (issue.severity === 'info') continue
    findings.push({
      id: `compliance-${issue.code}`, severity: issue.severity,
      title: issue.title,
      description: issue.description,
      affectedIds: issue.affectedIds ?? [],
      sources: [citeErp(issue.code, issue.code, ERP_RULES.find(r => r.id === issue.code)?.reference)],
      confidence: confidence(0.9, 'Règle ERP codée'),
    })
  }

  // Évacuation
  if (evac.worstNode && evac.worstNode.distance > 40) {
    findings.push({
      id: 'evac-too-far', severity: 'critical',
      title: `Distance d'évacuation excessive : ${evac.worstNode.distance.toFixed(1)} m`,
      description: `Norme CO34 ERP M : 40 m max. Le point le plus défavorable est à ${evac.worstNode.distance.toFixed(1)} m de la sortie la plus proche.`,
      affectedIds: [evac.worstNode.id],
      sources: [citeAlgo('dijkstra-multisource', 'Dijkstra multi-source sur graphe nav'), citeErp('DEGAG-01', 'CI Art. CO34')],
      confidence: confidence(0.85, 'Graphe nav 3-NN approximatif'),
      metric: { name: 'distance', value: evac.worstNode.distance, unit: 'm' },
    })
  }

  // Zones à risque élevé sans caméra
  const highRiskUncovered = riskByZone.filter(r => r.level === 'high').slice(0, 5)
  if (highRiskUncovered.length > 0) {
    findings.push({
      id: 'high-risk-zones', severity: 'warning',
      title: `${highRiskUncovered.length} zone(s) à risque élevé non sécurisée(s)`,
      description: `Modèle bayésien identifie ces zones comme prioritaires : ${highRiskUncovered.map(r => r.label).join(', ')}.`,
      affectedIds: highRiskUncovered.map(r => r.spaceId),
      sources: [citeAlgo('naive-bayes', 'Naive Bayes + lissage Laplace')],
      confidence: confidence(0.7, 'Modèle synthétique pré-entraîné'),
    })
  }

  // ─── 7. Actions cliquables avec budget/délai ───
  const actions: Proph3tAction[] = []
  let actId = 0
  const nextId = () => `security-${++actId}`

  // Add cameras (top 5 of optim)
  for (const cam of optResult.proposed.slice(0, 5)) {
    actions.push({
      id: nextId(),
      verb: 'place-camera',
      label: `Installer caméra à (${cam.x.toFixed(0)}, ${cam.y.toFixed(0)}) m — gain ${cam.gainSqm.toFixed(0)} m²`,
      rationale: `Algorithme greedy submodulaire suggère ce point pour maximiser la nouvelle couverture (FOV ${(cam.fov * 180 / Math.PI).toFixed(0)}°, range ${cam.rangeM} m).`,
      payload: { x: cam.x, y: cam.y, angle: cam.angle, fov: cam.fov, rangeM: cam.rangeM },
      severity: 'warning',
      confidence: confidence(cam.score, 'Greedy submodulaire (≥63% optimal Nemhauser)'),
      sources: [citeAlgo('greedy-submodular', 'Optim couverture greedy')],
      estimatedCostFcfa: cameraCapex,
      estimatedDelayDays: 7,
      estimatedImpact: {
        metric: 'Surface couverte',
        before: 0, after: cam.gainSqm, unit: 'm²',
      },
    })
  }

  // Fix critical compliance issues
  for (const issue of complianceReport.issues.filter(i => i.severity === 'critical').slice(0, 3)) {
    actions.push({
      id: nextId(),
      verb: 'fix-compliance',
      label: `Conformité : ${issue.title}`,
      rationale: issue.description + (issue.recommendation ? ` Recommandation : ${issue.recommendation}` : ''),
      payload: { code: issue.code },
      severity: 'critical',
      confidence: confidence(0.95, 'Règle ERP codée'),
      sources: [citeErp(issue.code, issue.code, ERP_RULES.find(r => r.id === issue.code)?.reference)],
      estimatedCostFcfa: issue.code.startsWith('SORTIE') ? 5_000_000 : 1_500_000,
      estimatedDelayDays: 30,
    })
  }

  // Add exit if needed
  if (input.doors.filter(d => d.isExit).length < 2) {
    actions.push({
      id: nextId(),
      verb: 'add-exit',
      label: 'Ajouter sortie de secours',
      rationale: 'ERP cat 1-2 : 2 sorties min obligatoires (Art. CO38). Actuellement insuffisant.',
      payload: {},
      severity: 'critical',
      confidence: confidence(1, 'Règle réglementaire stricte'),
      sources: [citeErp('SORTIE-01', 'CI Art. CO38')],
      estimatedCostFcfa: doorCapex * 2,
      estimatedDelayDays: 60,
    })
  }

  // ─── 8. Résumé + payload ───
  const totalEstimatedBudget = actions.reduce((s, a) => s + (a.estimatedCostFcfa ?? 0), 0)

  const payload: SecurityAuditPayload = {
    complianceScore: complianceReport.scorePct,
    coveragePctGlobal,
    riskByZone,
    evacuation: {
      worstNodeId: evac.worstNode?.id,
      worstDistanceM: evac.worstNode?.distance,
      worstTimeS: evac.worstNode?.time,
      averageTimeS: avgTime,
    },
    recommendedAdditions: {
      cameras: recommendedCameras,
      doors: input.doors.filter(d => d.isExit).length < 2 ? 1 : 0,
      estimatedBudgetFcfa: totalEstimatedBudget,
    },
    complianceReport,
  }

  const summary = `Conformité ${complianceReport.scorePct}/100 · Couverture ${coveragePctGlobal.toFixed(0)}% · ${complianceReport.summary.critical} critique(s) · ${recommendedCameras} caméras à ajouter · budget estimé ${(totalEstimatedBudget / 1_000_000).toFixed(1)} M FCFA.`

  return {
    skill: 'auditSecurity',
    timestamp: new Date().toISOString(),
    qualityScore: complianceReport.scorePct,
    executiveSummary: summary,
    findings,
    actions,
    overlays: [
      ...riskByZone.filter(r => r.level === 'high').slice(0, 10).map(r => ({
        kind: 'highlight' as const, targetId: r.spaceId, color: '#ef4444', intensity: r.riskScore, label: 'Risque élevé',
      })),
      ...optResult.proposed.slice(0, 5).map(c => ({
        kind: 'badge' as const, coords: [c.x, c.y] as [number, number], color: '#10b981', label: '+ caméra',
      })),
    ],
    payload,
    source: 'algo',
    confidence: confidence(0.85, 'Compliance + Coverage + Dijkstra + Bayes'),
    elapsedMs: performance.now() - t0,
  }
}

function centerX(sp: { polygon: [number, number][] }): number {
  if (sp.polygon.length === 0) return 0
  return sp.polygon.reduce((s, p) => s + p[0], 0) / sp.polygon.length
}
function centerY(sp: { polygon: [number, number][] }): number {
  if (sp.polygon.length === 0) return 0
  return sp.polygon.reduce((s, p) => s + p[1], 0) / sp.polygon.length
}
