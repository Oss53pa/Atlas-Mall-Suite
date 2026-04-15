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

/** Détecte les "nœuds de décision" : centres des circulations + entrées (côtés adjacents à d'autres polygones). */
function detectDecisionNodes(circs: CirculationSpace[]): Array<{ x: number; y: number; fromCircId: string }> {
  const nodes: Array<{ x: number; y: number; fromCircId: string }> = []
  for (const c of circs) {
    // Centroïde = nœud principal
    const [cx, cy] = polygonCentroid(c.polygon)
    nodes.push({ x: cx, y: cy, fromCircId: c.id })
    // Nœuds secondaires : points médians des 2 côtés les plus longs (approx. entrées)
    const edges: Array<{ mx: number; my: number; len: number }> = []
    for (let i = 0; i < c.polygon.length; i++) {
      const [x1, y1] = c.polygon[i]
      const [x2, y2] = c.polygon[(i + 1) % c.polygon.length]
      edges.push({ mx: (x1 + x2) / 2, my: (y1 + y2) / 2, len: Math.hypot(x2 - x1, y2 - y1) })
    }
    edges.sort((a, b) => b.len - a.len)
    for (const e of edges.slice(0, 2)) {
      nodes.push({ x: e.mx, y: e.my, fromCircId: c.id })
    }
  }
  return nodes
}

// ─── Optimizer ────────────────────────────────────────────

export function optimizeSignage(input: SignageOptimizerInput): SignageOptimizerResult {
  const t0 = performance.now()
  const visRadius = input.visibilityRadiusM ?? 15
  const density = input.targetDensityPer100Sqm ?? 1

  const circs = input.circulations.filter(c => /circul|couloir|hall|mail|passage/i.test(c.type))
  const totalCirculationSqm = circs.reduce((s, c) => s + c.areaSqm, 0)
  const targetCount = Math.max(1, Math.round((totalCirculationSqm / 100) * density))

  // 1. Candidats : nœuds de décision
  const candidates = detectDecisionNodes(circs)

  // 2. Filtre : retire les doublons proches (< visRadius/2)
  const filtered: typeof candidates = []
  for (const c of candidates) {
    const tooClose = filtered.some(f => Math.hypot(c.x - f.x, c.y - f.y) < visRadius / 2)
    if (!tooClose) filtered.push(c)
  }

  // 3. Score chaque candidat par nombre de POIs proches pondéré par priorité
  const scored = filtered.map(node => {
    const nearby = input.pois
      .map(p => ({ p, d: distance([node.x, node.y], [p.x, p.y]) }))
      .filter(x => x.d <= visRadius * 4) // POI visible depuis ce nœud (ligne de vue approx.)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
    const weight = nearby.reduce((sum, x) => sum + (4 - (x.p.priority ?? 2)), 0)
    return { node, nearby, weight }
  }).sort((a, b) => b.weight - a.weight)

  // 4. Prend les top N (limité par budget cible)
  const topN = scored.slice(0, targetCount)

  // 5. Déduit le type et la raison
  const proposed: ProposedSign[] = topN.map((s, i) => {
    let kind: ProposedSign['kind'] = 'direction'
    let reason = `${s.nearby.length} POI accessible(s) depuis ce nœud`
    if (s.nearby.length === 0) {
      kind = 'you-are-here'
      reason = "Nœud central — plan 'Vous êtes ici'"
    } else if (s.nearby.some(x => (x.p.priority ?? 2) === 1)) {
      kind = 'zone-entrance'
      reason = `Accès ancre : ${s.nearby.find(x => (x.p.priority ?? 2) === 1)!.p.label}`
    }
    return {
      id: `sign-auto-${i + 1}`,
      x: s.node.x,
      y: s.node.y,
      kind,
      targets: s.nearby.map(n => n.p.id),
      reason,
    }
  })

  // 6. Couverture : % de la circulation dans visRadius d'un panneau
  let coveredSqm = 0
  const step = 2
  for (const c of circs) {
    const xs = c.polygon.map(p => p[0])
    const ys = c.polygon.map(p => p[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    for (let x = minX; x <= maxX; x += step) {
      for (let y = minY; y <= maxY; y += step) {
        if (!pointInPolygon(x, y, c.polygon)) continue
        const covered = proposed.some(p => Math.hypot(p.x - x, p.y - y) <= visRadius)
        if (covered) coveredSqm += step * step
      }
    }
  }
  const coveragePct = totalCirculationSqm > 0 ? (coveredSqm / totalCirculationSqm) * 100 : 0

  return { proposed, totalCirculationSqm, coveragePct, elapsedMs: performance.now() - t0 }
}
