// ═══ SKILL — Audit signalétique placée par l'utilisateur ═══
//
// Évalue la qualité d'un placement signalétique (manuel ou auto-implémenté) :
//   • Couverture % des circulations
//   • Densité (panneaux/100m²) vs benchmark ERP (1-2/100m²)
//   • Signs en zone non-circulation (placement douteux)
//   • Signs sans POI accessible (orphelins)
//   • Goulots / zones mortes non couvertes
//   • Recommandations chiffrées : ajouts, déplacements, suppressions

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import { enrichWithNarrative } from '../narrativeEnricher'

export type AuditedSignKind = 'direction' | 'you-are-here' | 'zone-entrance'

export interface AuditedSign {
  id: string
  x: number
  y: number
  kind: AuditedSignKind
  source: 'proph3t-auto' | 'manual'
}

export interface AuditSignageInput {
  planWidth: number
  planHeight: number
  spaces: Array<{
    id: string
    label: string
    type?: string
    areaSqm: number
    polygon: [number, number][]
  }>
  pois: Array<{ id: string; label: string; x: number; y: number; priority?: 1 | 2 | 3 }>
  placedSigns: AuditedSign[]
  /** Rayon visibilité en mètres (défaut 15). */
  visibilityRadiusM?: number
}

export interface AuditSignagePayload {
  totalSigns: number
  manualSigns: number
  autoSigns: number
  coveragePct: number
  densityPer100Sqm: number
  circulationSqm: number
  signsInNonCirculation: AuditedSign[]
  orphanSigns: AuditedSign[]
  uncoveredZones: Array<{ x: number; y: number; areaSqm: number }>
  benchmarkDensity: { min: number; max: number; current: number; status: 'sous' | 'ok' | 'sur' }
  scoreBreakdown: {
    coverage: number      // /40
    density: number       // /20
    placement: number     // /20
    orphans: number       // /20
  }
}

const CIRC_RE = /circul|hall|mall|mail|couloir|passage|piet|piéton|voie|parvis|entr|access|porte/i

// Types catalogue qui sont LÉGITIMEMENT placés HORS circulation par design :
// enseignes au-dessus des locaux, vitrophanie sur vitres, totems extérieurs,
// extincteurs/RIA fixés aux murs (parfois hors circulation stricte), accueil
// physique, écran dynamique, plan d'évacuation mural, BAES sortie de secours
// (placés au-dessus des portes des locaux).
const PLACEMENT_OUT_OF_CIRC_OK = new Set<string>([
  'ENS', 'COM-VIT', 'COM-LED', 'TOT-EXT', 'COM-KAK',
  'SEC-EXT', 'SEC-RIA', 'SEC-EVA', 'SEC-BAES',
  'SRV-ACC', 'COM-ECR', 'LOT-N', 'WAY-BLE',
])
/** Tolérance de placement (m) autour du polygone de circulation —
 *  un sign à <2m d'un polygone de circulation est considéré comme valide. */
const PLACEMENT_TOLERANCE_M = 2

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Distance signée d'un point à un polygone (négatif si dedans, positif sinon). */
function distanceToPolygon(px: number, py: number, poly: [number, number][]): number {
  let minDist = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[i][0], y1 = poly[i][1]
    const x2 = poly[j][0], y2 = poly[j][1]
    // Distance segment-point
    const dx = x2 - x1, dy = y2 - y1
    const len2 = dx * dx + dy * dy
    let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0
    t = Math.max(0, Math.min(1, t))
    const cx = x1 + t * dx, cy = y1 + t * dy
    const d = Math.hypot(px - cx, py - cy)
    if (d < minDist) minDist = d
  }
  return pointInPolygon(px, py, poly) ? -minDist : minDist
}

export async function auditSignage(input: AuditSignageInput): Promise<Proph3tResult<AuditSignagePayload>> {
  const t0 = performance.now()
  const visRadius = input.visibilityRadiusM ?? 15
  const signs = input.placedSigns

  // Espaces de circulation (filtre élargi)
  const circulations = input.spaces.filter(s =>
    CIRC_RE.test(String(s.type ?? '')) || CIRC_RE.test(String(s.label ?? '')),
  )
  const circulationSqm = circulations.reduce((sum, s) => sum + s.areaSqm, 0)

  // 1. Cellules de circulation (grille 2×2m)
  const cellStep = 2
  const cellArea = cellStep * cellStep
  const cells: Array<{ x: number; y: number; covered: boolean }> = []
  for (const c of circulations) {
    const xs = c.polygon.map(p => p[0])
    const ys = c.polygon.map(p => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    for (let x = minX; x <= maxX; x += cellStep) {
      for (let y = minY; y <= maxY; y += cellStep) {
        if (pointInPolygon(x, y, c.polygon)) cells.push({ x, y, covered: false })
      }
    }
  }
  // Marque cellules couvertes par signs
  for (const cell of cells) {
    cell.covered = signs.some(s => Math.hypot(s.x - cell.x, s.y - cell.y) <= visRadius)
  }
  const coveredCells = cells.filter(c => c.covered).length
  const coveragePct = cells.length > 0 ? (coveredCells / cells.length) * 100 : 0

  // 2. Densité
  const density = circulationSqm > 0 ? (signs.length / circulationSqm) * 100 : 0

  // 3. Signs en zone non-circulation (placement douteux)
  // Règles d'exception :
  //   • Tolérance 2m autour des polygones de circulation
  //   • Certains types (enseignes, vitrophanie, totems, extincteurs)
  //     sont légitimement placés hors circulation
  const signsInNonCirculation: AuditedSign[] = signs.filter(s => {
    if (PLACEMENT_OUT_OF_CIRC_OK.has(s.kind)) return false
    // Distance signée au polygone le plus proche
    let minDistOutside = Infinity
    for (const c of circulations) {
      const d = distanceToPolygon(s.x, s.y, c.polygon)
      if (d < minDistOutside) minDistOutside = d
    }
    // Si on est dedans (négatif) ou à <2m, OK
    return minDistOutside > PLACEMENT_TOLERANCE_M
  })

  // 4. Signs orphelins (aucun POI accessible dans 4×visRadius)
  const orphanSigns: AuditedSign[] = signs.filter(s => {
    if (s.kind === 'you-are-here') return false // les "you-are-here" ont pas besoin de POI
    const hasPoi = input.pois.some(p => distance([s.x, s.y], [p.x, p.y]) <= visRadius * 4)
    return !hasPoi
  })

  // 5. Zones non couvertes (cellules orphelines agglomérées)
  const uncovered = cells.filter(c => !c.covered)
  // Agglomération naïve : on regroupe par bins de 30×30m
  const binSize = 30
  const bins = new Map<string, { x: number; y: number; count: number }>()
  for (const cell of uncovered) {
    const bx = Math.floor(cell.x / binSize)
    const by = Math.floor(cell.y / binSize)
    const key = `${bx},${by}`
    const existing = bins.get(key)
    if (existing) {
      existing.x = (existing.x * existing.count + cell.x) / (existing.count + 1)
      existing.y = (existing.y * existing.count + cell.y) / (existing.count + 1)
      existing.count++
    } else {
      bins.set(key, { x: cell.x, y: cell.y, count: 1 })
    }
  }
  const uncoveredZones = [...bins.values()]
    .filter(b => b.count >= 5) // au moins 20m² non couverts
    .map(b => ({ x: b.x, y: b.y, areaSqm: b.count * cellArea }))
    .sort((a, b) => b.areaSqm - a.areaSqm)
    .slice(0, 10)

  // 6. Benchmark densité ERP : plage acceptable 0.7-2.5/100m² (cible 1.5)
  const benchmarkDensity = {
    min: 0.7, max: 2.5, current: density,
    status: density < 0.7 ? 'sous' : density > 2.5 ? 'sur' : 'ok',
  } as const

  // 7. Score breakdown
  const coverageScore = Math.round((coveragePct / 100) * 40)

  // ─── Densité : barème continu (cible 0.7 à 2.5/100m²) ───
  // Une cloche autour du sweet spot 1.5/100m². Hors plage extrême reste 8.
  let densityScore: number
  if (density >= 0.7 && density <= 2.5) {
    densityScore = 20
  } else if (density >= 0.4 && density < 0.7) {
    // Linear ramp 14 → 20 entre 0.4 et 0.7
    densityScore = Math.round(14 + ((density - 0.4) / 0.3) * 6)
  } else if (density > 2.5 && density <= 3.5) {
    densityScore = Math.round(20 - ((density - 2.5) / 1) * 6)
  } else if (density >= 0.2 && density < 0.4) {
    densityScore = Math.round(8 + ((density - 0.2) / 0.2) * 6) // 8 → 14
  } else if (density > 3.5 && density <= 5) {
    densityScore = Math.round(14 - ((density - 3.5) / 1.5) * 6) // 14 → 8
  } else {
    densityScore = 8 // très loin de la cible mais pas zéro
  }

  // ─── Placement : avec exceptions par type ───
  // Le ratio est calculé sur les signs SOUMIS à l'évaluation
  // (on retire les types légitimement hors circulation du dénominateur).
  const evaluableForPlacement = signs.filter(s => !PLACEMENT_OUT_OF_CIRC_OK.has(s.kind))
  const placementScore = evaluableForPlacement.length === 0
    ? 20
    : Math.round(20 * (1 - Math.min(1, signsInNonCirculation.length / evaluableForPlacement.length)))

  const orphansScore = Math.round(20 * (1 - Math.min(1, orphanSigns.length / Math.max(1, signs.length))))
  const totalScore = coverageScore + densityScore + placementScore + orphansScore

  // 8. Findings
  const findings: Proph3tFinding[] = []
  if (coveragePct < 70) {
    findings.push({
      id: 'audit-coverage',
      severity: 'warning',
      title: `Couverture insuffisante : ${coveragePct.toFixed(0)}%`,
      description: `${cells.length - coveredCells} cellules de circulation (sur ${cells.length}) hors rayon de visibilité 15 m. Cible ERP : ≥ 90%.`,
      sources: [citeAlgo('audit-signage', 'Grille 2×2m + rayon visibilité')],
      confidence: confidence(0.9, 'Calcul géométrique déterministe'),
      metric: { name: 'coverage', value: coveragePct, unit: '%' },
      affectedIds: [],
    })
  }
  if (signsInNonCirculation.length > 0) {
    findings.push({
      id: 'audit-non-circ',
      severity: 'warning',
      title: `${signsInNonCirculation.length} panneau(x) hors zone de circulation`,
      description: `Placés dans des espaces non-circulation (commerce, parking, etc.). Inutiles pour la signalétique directionnelle — déplacer dans les mails/couloirs.`,
      sources: [citeAlgo('audit-signage', 'Point-in-polygon sur circulations')],
      confidence: confidence(0.95, 'Test géométrique exact'),
      affectedIds: signsInNonCirculation.map(s => s.id),
    })
  }
  if (orphanSigns.length > 0) {
    findings.push({
      id: 'audit-orphans',
      severity: 'info',
      title: `${orphanSigns.length} panneau(x) sans POI accessible`,
      description: `Aucun POI dans un rayon de ${visRadius * 4}m. Soit ajouter des POIs proches, soit changer le type en "Vous êtes ici", soit retirer.`,
      sources: [citeAlgo('audit-signage', 'Distance euclidienne POI')],
      confidence: confidence(0.85, 'Heuristique distance'),
      affectedIds: orphanSigns.map(s => s.id),
    })
  }
  if (benchmarkDensity.status === 'sous' && density < 0.4) {
    findings.push({
      id: 'audit-density-low',
      severity: 'info',
      title: `Densité faible : ${density.toFixed(2)} / 100 m²`,
      description: `Plage cible : 0,7 à 2,5 panneaux / 100 m² de circulation (cible 1,5). Pour atteindre 0,7 il faudrait ajouter ~${Math.max(0, Math.ceil(circulationSqm * 0.7 / 100 - signs.length))} panneau(x). Acceptable selon configuration du mall.`,
      sources: [citeAlgo('audit-signage', 'Benchmark ERP signalétique')],
      confidence: confidence(0.6, 'Norme indicative — flexible'),
      metric: { name: 'density', value: density, unit: '/100m²' },
      affectedIds: [],
    })
  } else if (benchmarkDensity.status === 'sur' && density > 3) {
    findings.push({
      id: 'audit-density-high',
      severity: 'info',
      title: `Densité sur-dimensionnée : ${density.toFixed(2)} / 100 m²`,
      description: `Au-dessus de 2,5 panneaux / 100 m² — risque de pollution visuelle. Envisager retrait des doublons.`,
      sources: [citeAlgo('audit-signage', 'Benchmark ERP')],
      confidence: confidence(0.65, 'Norme indicative'),
      affectedIds: [],
    })
  }
  if (uncoveredZones.length > 0) {
    findings.push({
      id: 'audit-deadzones',
      severity: 'warning',
      title: `${uncoveredZones.length} zone(s) morte(s) détectée(s)`,
      description: `Zones de circulation sans signalétique visible. Cumul : ${uncoveredZones.reduce((s, z) => s + z.areaSqm, 0).toFixed(0)} m². À couvrir en priorité.`,
      sources: [citeAlgo('audit-signage', 'Bins 30×30m sur cellules non couvertes')],
      confidence: confidence(0.8, 'Agglomération géométrique'),
      affectedIds: [],
    })
  }
  if (signs.length === 0) {
    findings.push({
      id: 'audit-empty',
      severity: 'critical',
      title: 'Aucune signalétique placée',
      description: 'Aucun panneau sur le plan. Lance « Suggérer signalétique » dans Proph3t puis « Implémenter » pour démarrer.',
      sources: [citeAlgo('audit-signage', 'État initial')],
      confidence: confidence(1, 'Absence absolue'),
      affectedIds: [],
    })
  }

  // 9. Actions
  const actions: Proph3tAction[] = []
  let aid = 0
  const nextId = () => `audit-sign-${++aid}`

  for (const orphan of orphanSigns.slice(0, 3)) {
    actions.push({
      id: nextId(),
      verb: 'note',
      targetId: orphan.id,
      label: `Retirer ou requalifier le panneau orphelin à (${orphan.x.toFixed(0)}, ${orphan.y.toFixed(0)})`,
      rationale: 'Aucun POI accessible — ce panneau directionnel ne pointe vers rien.',
      payload: { signId: orphan.id, action: 'remove-or-requalify' },
      severity: 'info',
      confidence: confidence(0.75, 'Distance POI'),
      sources: [citeAlgo('audit-signage', 'Audit orphelins')],
    })
  }
  for (const z of uncoveredZones.slice(0, 3)) {
    actions.push({
      id: nextId(),
      verb: 'add-signage',
      label: `Ajouter signalétique en zone morte (${z.x.toFixed(0)}, ${z.y.toFixed(0)}) — ${z.areaSqm.toFixed(0)} m²`,
      rationale: `Zone de circulation sans panneau dans 15 m. Couverture +${(z.areaSqm / Math.max(1, circulationSqm) * 100).toFixed(1)} pts.`,
      payload: { x: z.x, y: z.y, kind: 'direction', targets: [] },
      severity: 'warning',
      confidence: confidence(0.85, 'Bins zones non couvertes'),
      sources: [citeAlgo('audit-signage', 'Détection zones mortes')],
      estimatedCostFcfa: 250_000,
      estimatedDelayDays: 14,
      estimatedImpact: { metric: 'Couverture signalétique', after: '+5-10%', unit: '%' },
    })
  }
  for (const out of signsInNonCirculation.slice(0, 3)) {
    actions.push({
      id: nextId(),
      verb: 'note',
      targetId: out.id,
      label: `Déplacer le panneau en zone de circulation (actuel : ${out.x.toFixed(0)}, ${out.y.toFixed(0)})`,
      rationale: 'Placé hors circulation — invisible pour les visiteurs en transit.',
      payload: { signId: out.id, action: 'relocate' },
      severity: 'warning',
      confidence: confidence(0.95, 'Point-in-polygon'),
      sources: [citeAlgo('audit-signage', 'Test inclusion circulation')],
    })
  }

  const payload: AuditSignagePayload = {
    totalSigns: signs.length,
    manualSigns: signs.filter(s => s.source === 'manual').length,
    autoSigns: signs.filter(s => s.source === 'proph3t-auto').length,
    coveragePct,
    densityPer100Sqm: density,
    circulationSqm,
    signsInNonCirculation,
    orphanSigns,
    uncoveredZones,
    benchmarkDensity,
    scoreBreakdown: {
      coverage: coverageScore,
      density: densityScore,
      placement: placementScore,
      orphans: orphansScore,
    },
  }

  const summary = signs.length === 0
    ? `Aucune signalétique — score 0/100. Implémente d'abord la signalétique optimisée Proph3t.`
    : `${signs.length} panneaux audités · couverture ${coveragePct.toFixed(0)}% · densité ${density.toFixed(2)}/100m² (${benchmarkDensity.status === 'ok' ? 'conforme' : benchmarkDensity.status}) · ${uncoveredZones.length} zones mortes · ${orphanSigns.length} orphelins.`

  const overlays = [
    // Marque les signs problématiques en rouge
    ...signsInNonCirculation.map(s => ({
      kind: 'highlight' as const, coords: [s.x, s.y] as [number, number],
      color: '#dc2626', label: 'Hors circulation',
    })),
    ...orphanSigns.map(s => ({
      kind: 'highlight' as const, coords: [s.x, s.y] as [number, number],
      color: '#f59e0b', label: 'Orphelin',
    })),
    // Et les zones mortes en heatmap
    ...uncoveredZones.map(z => ({
      kind: 'heatmap' as const, coords: [z.x, z.y] as [number, number],
      color: '#dc2626', intensity: Math.min(100, z.areaSqm / 5), label: 'Zone morte',
    })),
  ]

  const baseResult: Proph3tResult<AuditSignagePayload> = {
    skill: 'auditSignage',
    timestamp: new Date().toISOString(),
    qualityScore: totalScore,
    executiveSummary: summary,
    findings,
    actions,
    overlays,
    payload,
    source: 'algo',
    confidence: confidence(0.85, 'Audit géométrique déterministe + benchmarks ERP'),
    elapsedMs: performance.now() - t0,
  }

  return await enrichWithNarrative(baseResult, { audience: 'operations' })
}
