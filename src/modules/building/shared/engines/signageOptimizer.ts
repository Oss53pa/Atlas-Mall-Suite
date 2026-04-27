// ═══ SIGNAGE OPTIMIZER — Auto-placement signalétique (M10) ═══
// Propose des positions de signalétique directionnelle aux nœuds de décision
// (intersections de circulations, entrées de zones, changements d'axe).

export interface CirculationSpace {
  id: string
  polygon: [number, number][]
  /** Doit être de type 'circulation' | 'hall' | 'couloir' pour être considéré. */
  type: string
  areaSqm: number
}

export interface POI {
  id: string
  label: string
  x: number
  y: number
  /** Priorité (1 = ancre, 3 = secondaire). */
  priority?: 1 | 2 | 3
}

export interface ProposedSign {
  id: string
  x: number
  y: number
  kind: 'direction' | 'you-are-here' | 'zone-entrance'
  /** POIs pointés par ce panneau (3 max). */
  targets: string[]
  reason: string
  /** Confiance algorithmique 0..1 (POIs proches, qualité géométrique du nœud, gain couverture). */
  confidence: number
  /** True si Proph3t hésite — placement à valider par humain. */
  needsReview: boolean
  /** Raison de l'hésitation (affichée dans le walkthrough). */
  reviewReason?: string
}

export interface SignageOptimizerInput {
  circulations: CirculationSpace[]
  pois: POI[]
  planBounds: { width: number; height: number }
  /** Densité cible panneaux/100m² de circulation (défaut 1). */
  targetDensityPer100Sqm?: number
  /** Rayon de "couverture" visuelle d'un panneau en mètres (défaut 15). */
  visibilityRadiusM?: number
}

export interface SignageOptimizerResult {
  proposed: ProposedSign[]
  totalCirculationSqm: number
  coveragePct: number
  elapsedMs: number
}

// ─── Centroid + bbox helpers ──────────────────────────────

function polygonCentroid(poly: [number, number][]): [number, number] {
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return [cx / poly.length, cy / poly.length]
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

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

// ─── Node detection ───────────────────────────────────────

/** Détecte les nœuds de décision + échantillonne densément les longues circulations. */
function detectDecisionNodes(
  circs: CirculationSpace[],
  sampleEveryM: number,
): Array<{ x: number; y: number; fromCircId: string }> {
  const nodes: Array<{ x: number; y: number; fromCircId: string }> = []
  for (const c of circs) {
    const [cx, cy] = polygonCentroid(c.polygon)
    nodes.push({ x: cx, y: cy, fromCircId: c.id })

    // Tous les points médians des côtés (pas seulement les 2 plus longs)
    for (let i = 0; i < c.polygon.length; i++) {
      const [x1, y1] = c.polygon[i]
      const [x2, y2] = c.polygon[(i + 1) % c.polygon.length]
      const len = Math.hypot(x2 - x1, y2 - y1)
      if (len < 4) continue // côtés très courts ignorés
      nodes.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, fromCircId: c.id })

      // Échantillonnage le long des côtés longs (couloirs longitudinaux)
      if (len > sampleEveryM * 1.5) {
        const steps = Math.floor(len / sampleEveryM)
        for (let k = 1; k < steps; k++) {
          const t = k / steps
          nodes.push({
            x: x1 + (x2 - x1) * t,
            y: y1 + (y2 - y1) * t,
            fromCircId: c.id,
          })
        }
      }
    }

    // Échantillonnage grille interne pour grandes zones (mails, parvis)
    if (c.areaSqm > 200) {
      const xs = c.polygon.map(p => p[0])
      const ys = c.polygon.map(p => p[1])
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      for (let x = minX + sampleEveryM / 2; x < maxX; x += sampleEveryM) {
        for (let y = minY + sampleEveryM / 2; y < maxY; y += sampleEveryM) {
          if (pointInPolygon(x, y, c.polygon)) {
            nodes.push({ x, y, fromCircId: c.id })
          }
        }
      }
    }
  }
  return nodes
}

// ─── Optimizer ────────────────────────────────────────────

export function optimizeSignage(input: SignageOptimizerInput): SignageOptimizerResult {
  const t0 = performance.now()
  const visRadius = input.visibilityRadiusM ?? 15

  // Filtre élargi : circulations + voiries piétonnes + entrées + parvis + halls.
  // Inclut aussi les espaces explicitement "passage piéton" (voies piétonnes).
  const TYPE_RE = /circul|couloir|hall|mall|mail|passage|piet|piéton|voie|parvis|entr|access|porte/i
  const circs = input.circulations.filter(c => TYPE_RE.test(c.type))
  const totalCirculationSqm = circs.reduce((s, c) => s + c.areaSqm, 0)

  if (circs.length === 0 || totalCirculationSqm === 0) {
    return { proposed: [], totalCirculationSqm: 0, coveragePct: 0, elapsedMs: performance.now() - t0 }
  }

  // 1. Candidats denses (échantillonnage tous les visRadius mètres = aucun trou)
  const sampleEvery = visRadius // 1 candidat / 15m → couvrira tout en greedy
  const candidates = detectDecisionNodes(circs, sampleEvery)

  // 2. Construit la grille de couverture (cellules 2×2m sur les circulations)
  const cellStep = 2
  const cells: Array<{ x: number; y: number; covered: boolean }> = []
  for (const c of circs) {
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
  const cellArea = cellStep * cellStep
  const totalCells = cells.length

  // 3. Score initial de chaque candidat = (POIs accessibles pondérés) + (cellules nouvellement couvertes / 5)
  const scoreCandidate = (cx: number, cy: number) => {
    const nearby = input.pois
      .map(p => ({ p, d: distance([cx, cy], [p.x, p.y]) }))
      .filter(x => x.d <= visRadius * 4)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
    const poiWeight = nearby.reduce((sum, x) => sum + (4 - (x.p.priority ?? 2)), 0)
    let coverGain = 0
    for (const cell of cells) {
      if (!cell.covered && Math.hypot(cell.x - cx, cell.y - cy) <= visRadius) coverGain++
    }
    return { score: poiWeight * 5 + coverGain, nearby, coverGain }
  }

  // 4. Greedy : place panneaux jusqu'à ≥ 90% couverture OU plus de gain significatif
  const proposed: ProposedSign[] = []
  const targetCoverage = 0.9
  const minCoverGain = Math.max(3, Math.floor((visRadius * visRadius * 0.25) / cellArea)) // ≥ 25% du disque
  const maxSigns = 200 // hard cap pour mall géant

  const remaining = candidates.slice() // copie mutable
  while (proposed.length < maxSigns) {
    const coveredCells = cells.filter(c => c.covered).length
    if (coveredCells / Math.max(1, totalCells) >= targetCoverage) break
    if (remaining.length === 0) break

    // Cherche le meilleur candidat
    let bestIdx = -1
    let bestScored: ReturnType<typeof scoreCandidate> | null = null
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i]
      const s = scoreCandidate(cand.x, cand.y)
      if (!bestScored || s.score > bestScored.score) {
        bestScored = s
        bestIdx = i
      }
    }
    if (!bestScored || bestScored.coverGain < minCoverGain) break

    const winner = remaining.splice(bestIdx, 1)[0]
    // Marque les cellules désormais couvertes
    for (const cell of cells) {
      if (!cell.covered && Math.hypot(cell.x - winner.x, cell.y - winner.y) <= visRadius) cell.covered = true
    }

    // Type + raison
    let kind: ProposedSign['kind'] = 'direction'
    let reason = `${bestScored.nearby.length} POI(s) accessible(s) · couvre ${bestScored.coverGain * cellArea} m²`
    if (bestScored.nearby.length === 0) {
      kind = 'you-are-here'
      reason = `Nœud d'orientation — couverture +${bestScored.coverGain * cellArea} m²`
    } else if (bestScored.nearby.some(x => (x.p.priority ?? 2) === 1)) {
      kind = 'zone-entrance'
      reason = `Accès ancre : ${bestScored.nearby.find(x => (x.p.priority ?? 2) === 1)!.p.label}`
    }

    // ─── Confiance algorithmique 0..1 ───
    // Composantes pondérées :
    //   • Nb POIs proches (0 = doute pour direction/zone-entrance, ok pour you-are-here)
    //   • Distance au POI le plus proche (proche = bon)
    //   • Gain de couverture (gros = bon)
    //   • Distance au bord du polygone (centre = bon, bord = doute)
    const poiCountConf = kind === 'you-are-here'
      ? 0.85 // les "you-are-here" ne nécessitent pas de POI
      : Math.min(1, bestScored.nearby.length / 2) // 2+ POIs = pleine confiance
    const closestPoi = bestScored.nearby[0]
    const distConf = closestPoi
      ? Math.max(0.3, 1 - closestPoi.d / (visRadius * 4))
      : 0.5
    const coverGainConf = Math.min(1, bestScored.coverGain / Math.max(1, minCoverGain * 3))

    // Test "centre du polygone" : approximé par distance au centroïde de la circulation parente
    const parentCirc = circs.find(c => c.id === winner.fromCircId)
    let centerConf = 0.7
    if (parentCirc) {
      const [pcx, pcy] = polygonCentroid(parentCirc.polygon)
      const distToCenter = Math.hypot(winner.x - pcx, winner.y - pcy)
      const xs = parentCirc.polygon.map(p => p[0])
      const ys = parentCirc.polygon.map(p => p[1])
      const halfDiag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2
      centerConf = halfDiag > 0 ? Math.max(0.4, 1 - (distToCenter / halfDiag) * 0.5) : 0.6
    }

    const conf = (poiCountConf * 0.4 + distConf * 0.25 + coverGainConf * 0.2 + centerConf * 0.15)

    let reviewReason: string | undefined
    const needsReview = conf < 0.55
    if (needsReview) {
      const reasons: string[] = []
      if (poiCountConf < 0.5) reasons.push('peu/pas de POI proche')
      if (distConf < 0.5) reasons.push('POI le plus proche éloigné')
      if (coverGainConf < 0.4) reasons.push('faible gain couverture')
      if (centerConf < 0.55) reasons.push('proche du bord de la circulation')
      reviewReason = `Doute : ${reasons.join(' · ')}`
    }

    proposed.push({
      id: `sign-auto-${proposed.length + 1}`,
      x: winner.x,
      y: winner.y,
      kind,
      targets: bestScored.nearby.map(n => n.p.id),
      reason,
      confidence: conf,
      needsReview,
      reviewReason,
    })
  }

  const finalCovered = cells.filter(c => c.covered).length
  const coveragePct = totalCells > 0 ? (finalCovered / totalCells) * 100 : 0

  return {
    proposed,
    totalCirculationSqm,
    coveragePct,
    elapsedMs: performance.now() - t0,
  }
}
