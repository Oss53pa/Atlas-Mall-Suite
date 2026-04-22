// ═══ VOL.4 WAYFINDER — PROPH3T INTELLIGENCE ═══
//
// PROPH3T n'affiche rien dans le Wayfinder : il produit du JSON structuré
// consommé par les 3 interfaces (mobile / web / borne) et par les autres
// volumes (Vol.1, Vol.2, Vol.3).
//
// Rôles clés :
//   1. Optimisation du graphe     → calibration hebdo des poids selon ABM + footfall
//   2. Personnalisation           → ajustement des poids selon persona détecté
//   3. Détection d'anomalies      → CUSUM sur positions agrégées → zones congestionnées
//   4. Réponse aux alertes Vol.2  → suppression d'arêtes + recalcul
//   5. Analyse d'usage            → rapport hebdo : top paires A→B, zones jamais traversées
//
// Ces fonctions sont PURES (pas d'effets de bord) : elles consomment des données
// et produisent des rapports JSON sérialisables.

import type { NavGraph } from '../../shared/engines/plan-analysis/navGraphEngine'

// ─── 1. OPTIMISATION DU GRAPHE ───────────────────────────

export interface GraphCalibrationInput {
  graph: NavGraph
  /** Trafic piéton observé par arête (passages/jour). */
  footfallByEdge: Map<string, number>
  /** Temps de traversée moyen observé par arête (s). */
  traversalTimeByEdge?: Map<string, number>
  /** Score d'attractivité commerciale par zone (CA/m²). */
  attractivenessByNode?: Map<string, number>
}

export interface GraphCalibrationResult {
  updatedEdges: Array<{ edgeId: string; oldWeight: number; newWeight: number }>
  avgCongestionFactor: number
  topCongested: Array<{ edgeId: string; footfall: number; congestion: number }>
}

/**
 * Recalibre les poids du graphe à partir des données observées.
 * Congestion = footfall / capacité théorique (2 pers./m²/s × largeur × 1.2 m/s).
 */
export function calibrateGraphWeights(input: GraphCalibrationInput): GraphCalibrationResult {
  const updated: GraphCalibrationResult['updatedEdges'] = []
  const congestionValues: number[] = []
  const topCongested: GraphCalibrationResult['topCongested'] = []

  // Capacité théorique d'un couloir = ~2 personnes/m²/s × largeur × vitesse
  const theoreticalCapacityPerSecond = (widthM: number) => 2 * widthM * 1.2

  for (const edge of input.graph.edges) {
    const footfall = input.footfallByEdge.get(edge.id) ?? 0
    if (footfall === 0) continue

    // Conversion : passages/jour → passages/sec (10h d'activité)
    const perSec = footfall / (10 * 3600)
    const width = (edge as any).widthM ?? 3.0
    const cap = theoreticalCapacityPerSecond(width)
    const congestion = Math.max(1.0, Math.min(3.0, perSec / Math.max(0.1, cap)))

    const oldW = edge.weight
    const newW = edge.lengthM * congestion * edge.attractiveness
    edge.congestion = congestion
    edge.weight = newW

    updated.push({ edgeId: edge.id, oldWeight: oldW, newWeight: newW })
    congestionValues.push(congestion)
    if (congestion > 1.5) topCongested.push({ edgeId: edge.id, footfall, congestion })
  }

  topCongested.sort((a, b) => b.congestion - a.congestion)

  return {
    updatedEdges: updated,
    avgCongestionFactor: congestionValues.length
      ? congestionValues.reduce((a, b) => a + b) / congestionValues.length : 1,
    topCongested: topCongested.slice(0, 10),
  }
}

// ─── 2. PERSONNALISATION PAR PERSONA ─────────────────────

export type Persona = 'shopper' | 'family' | 'foodie' | 'business' | 'tourist' | 'teen' | 'senior' | 'generic'

export interface PersonaRoutingBoost {
  persona: Persona
  /** Categories boostées (poids -20 % sur les arêtes passant à proximité). */
  boostedCategories: string[]
  /** Categories évitées (poids +50 %). */
  avoidedCategories: string[]
}

export const PERSONA_PROFILES: Record<Persona, PersonaRoutingBoost> = {
  shopper: {
    persona: 'shopper',
    boostedCategories: ['mode', 'beaute', 'accessoires'],
    avoidedCategories: [],
  },
  family: {
    persona: 'family',
    boostedCategories: ['loisirs', 'jouets', 'restauration', 'sanitaires'],
    avoidedCategories: [],
  },
  foodie: {
    persona: 'foodie',
    boostedCategories: ['restauration', 'epicerie', 'food-court'],
    avoidedCategories: [],
  },
  business: {
    persona: 'business',
    boostedCategories: ['services', 'tech', 'pressing'],
    avoidedCategories: ['loisirs'],
  },
  tourist: {
    persona: 'tourist',
    boostedCategories: ['souvenirs', 'artisanat', 'services'],
    avoidedCategories: [],
  },
  teen: {
    persona: 'teen',
    boostedCategories: ['mode', 'tech', 'loisirs', 'food-court'],
    avoidedCategories: [],
  },
  senior: {
    persona: 'senior',
    boostedCategories: ['sante', 'services', 'sanitaires'],
    avoidedCategories: ['escalators-only'],
  },
  generic: {
    persona: 'generic',
    boostedCategories: [],
    avoidedCategories: [],
  },
}

/**
 * Calcule les overrides de poids pour un graphe et un persona donné.
 * Les arêtes à proximité (≤ 8 m) d'un commerce boosté voient leur poids -20 %.
 */
export function personaEdgeOverrides(
  graph: NavGraph,
  persona: Persona,
  spacesByCategory: Map<string, Array<{ polygon: [number, number][] }>>,
): Map<string, number> {
  const profile = PERSONA_PROFILES[persona]
  const overrides = new Map<string, number>()
  if (!profile || profile.boostedCategories.length === 0) return overrides

  for (const edge of graph.edges) {
    const fromNode = graph.nodes[graph._nodeIndex.get(edge.fromId)!]
    const toNode = graph.nodes[graph._nodeIndex.get(edge.toId)!]
    if (!fromNode || !toNode) continue
    const cx = (fromNode.x + toNode.x) / 2
    const cy = (fromNode.y + toNode.y) / 2

    let boost = 0
    for (const cat of profile.boostedCategories) {
      const spaces = spacesByCategory.get(cat) ?? []
      for (const s of spaces) {
        const d = pointToPolygonDistance(cx, cy, s.polygon)
        if (d < 8) boost += 1 - d / 8
      }
    }
    if (boost > 0) {
      const factor = Math.max(0.6, 1 - 0.2 * Math.min(1, boost))
      overrides.set(edge.id, edge.weight * factor)
    }
  }
  return overrides
}

function pointToPolygonDistance(px: number, py: number, poly: [number, number][]): number {
  let minD = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[i][0], y1 = poly[i][1]
    const x2 = poly[j][0], y2 = poly[j][1]
    const dx = x2 - x1, dy = y2 - y1
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)))
    const qx = x1 + dx * t, qy = y1 + dy * t
    const d = Math.hypot(px - qx, py - qy)
    if (d < minD) minD = d
  }
  return minD
}

// ─── 3. DÉTECTION D'ANOMALIES DE FLUX (CUSUM) ────────────

export interface CusumAnomalyInput {
  /** Série temporelle d'occupation agrégée par cellule 5×5 m. */
  series: number[]
  /** Moyenne historique. */
  mean: number
  /** Écart-type historique. */
  stdev: number
  /** Seuil de détection (défaut k=0.5σ, h=5σ). */
  k?: number
  h?: number
}

export interface CusumAlert {
  index: number
  direction: 'up' | 'down'
  value: number
  threshold: number
}

/** CUSUM bidirectionnel : détecte les écarts à la moyenne. */
export function cusumAnomalyDetect(input: CusumAnomalyInput): CusumAlert[] {
  const { series, mean, stdev } = input
  const k = (input.k ?? 0.5) * stdev
  const h = (input.h ?? 5) * stdev
  const alerts: CusumAlert[] = []
  let sHi = 0, sLo = 0
  for (let i = 0; i < series.length; i++) {
    sHi = Math.max(0, sHi + series[i] - mean - k)
    sLo = Math.max(0, sLo + mean - series[i] - k)
    if (sHi > h) { alerts.push({ index: i, direction: 'up', value: series[i], threshold: h + mean }); sHi = 0 }
    if (sLo > h) { alerts.push({ index: i, direction: 'down', value: series[i], threshold: mean - h }); sLo = 0 }
  }
  return alerts
}

// ─── 4. RÉPONSE AUX ALERTES SÉCURITAIRES ─────────────────

export interface SecurityZoneBlock {
  /** ID de la zone Vol.2 bloquée. */
  zoneId: string
  /** Polygone de la zone. */
  polygon: [number, number][]
  floorId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  reason: string
}

export interface EdgeBlockingResult {
  blockedEdgeIds: Set<string>
  affectedNodes: string[]
  rationale: string
}

/**
 * Filtre les arêtes du graphe qui traversent la zone bloquée → toutes les
 * recalculer comme "infinies" dans le router.
 */
export function blockEdgesInZone(
  graph: NavGraph,
  zone: SecurityZoneBlock,
): EdgeBlockingResult {
  const blocked = new Set<string>()
  const affected = new Set<string>()
  for (const edge of graph.edges) {
    const from = graph.nodes[graph._nodeIndex.get(edge.fromId)!]
    const to = graph.nodes[graph._nodeIndex.get(edge.toId)!]
    if (!from || !to) continue
    if (pointInPolygon(from.x, from.y, zone.polygon) || pointInPolygon(to.x, to.y, zone.polygon)) {
      blocked.add(edge.id)
      affected.add(from.id); affected.add(to.id)
    }
  }
  return {
    blockedEdgeIds: blocked,
    affectedNodes: [...affected],
    rationale: `Zone « ${zone.zoneId} » bloquée (${zone.severity}) : ${zone.reason}`,
  }
}

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// ─── 5. RAPPORT D'USAGE HEBDOMADAIRE ─────────────────────

export interface UsageLog {
  /** Paire origine → destination anonyme. */
  fromRefId: string
  toRefId: string
  mode: string
  distanceM: number
  durationS: number
  /** A recalculé en cours de route (= confusion/déviation) ? */
  recalculated: boolean
  timestamp: number
}

export interface UsageReport {
  generatedAt: string
  totalRoutes: number
  avgDistanceM: number
  avgDurationS: number
  recalculationRate: number
  topDestinations: Array<{ refId: string; count: number }>
  topPairs: Array<{ from: string; to: string; count: number }>
  modeDistribution: Record<string, number>
  /** Nœuds du graphe jamais traversés (opportunité commerciale / signalétique). */
  untouchedNodeIds: string[]
  /** Alertes : zones où > 20 % de recalculs → problème signalétique physique. */
  signageAlerts: Array<{ around: string; recalcRate: number; message: string }>
}

export function buildUsageReport(
  logs: UsageLog[],
  allRefIds: string[],
): UsageReport {
  if (logs.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      totalRoutes: 0, avgDistanceM: 0, avgDurationS: 0, recalculationRate: 0,
      topDestinations: [], topPairs: [], modeDistribution: {},
      untouchedNodeIds: allRefIds, signageAlerts: [],
    }
  }
  const avgDist = logs.reduce((s, l) => s + l.distanceM, 0) / logs.length
  const avgDur = logs.reduce((s, l) => s + l.durationS, 0) / logs.length
  const recalcRate = logs.filter(l => l.recalculated).length / logs.length

  // Top destinations
  const destCount = new Map<string, number>()
  for (const l of logs) destCount.set(l.toRefId, (destCount.get(l.toRefId) ?? 0) + 1)
  const topDestinations = [...destCount.entries()]
    .map(([refId, count]) => ({ refId, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  // Top paires
  const pairCount = new Map<string, number>()
  for (const l of logs) {
    const k = `${l.fromRefId}→${l.toRefId}`
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1)
  }
  const topPairs = [...pairCount.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('→')
      return { from, to, count }
    })
    .sort((a, b) => b.count - a.count).slice(0, 10)

  // Mode distribution
  const modeDist: Record<string, number> = {}
  for (const l of logs) modeDist[l.mode] = (modeDist[l.mode] ?? 0) + 1

  // Nœuds jamais visités
  const touched = new Set<string>()
  for (const l of logs) { touched.add(l.fromRefId); touched.add(l.toRefId) }
  const untouched = allRefIds.filter(id => !touched.has(id))

  // Alerte signalétique : zones où le recalc rate > 20 %
  const zoneRecalc = new Map<string, { total: number; recalc: number }>()
  for (const l of logs) {
    const z = zoneRecalc.get(l.toRefId) ?? { total: 0, recalc: 0 }
    z.total += 1; if (l.recalculated) z.recalc += 1
    zoneRecalc.set(l.toRefId, z)
  }
  const signageAlerts: UsageReport['signageAlerts'] = []
  for (const [refId, stat] of zoneRecalc) {
    if (stat.total < 5) continue
    const rate = stat.recalc / stat.total
    if (rate > 0.2) {
      signageAlerts.push({
        around: refId,
        recalcRate: rate,
        message: `${Math.round(rate * 100)}% des trajets vers « ${refId} » ont nécessité un recalcul → signalétique physique à revoir.`,
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalRoutes: logs.length,
    avgDistanceM: avgDist,
    avgDurationS: avgDur,
    recalculationRate: recalcRate,
    topDestinations, topPairs,
    modeDistribution: modeDist,
    untouchedNodeIds: untouched,
    signageAlerts,
  }
}

// ─── 6. RAPPORT DE QUALITÉ DU GRAPHE ─────────────────────

export interface GraphQualityReport {
  generatedAt: string
  totalNodes: number
  totalEdges: number
  totalLengthM: number
  /** % de surface mall couverte (estimé). */
  coveragePct: number
  orphanNodeIds: string[]
  longEdgeIds: Array<{ id: string; lengthM: number }>
  disconnectedComponents: number
}

export function analyzeGraphQuality(graph: NavGraph, mallAreaM2?: number): GraphQualityReport {
  const totalLen = graph.edges.reduce((s, e) => s + e.lengthM, 0)

  // Nœuds orphelins = sans arête
  const withEdges = new Set<string>()
  for (const e of graph.edges) { withEdges.add(e.fromId); withEdges.add(e.toId) }
  const orphans = graph.nodes.filter(n => !withEdges.has(n.id)).map(n => n.id)

  // Arêtes > 20 m (trop longues → manque de nœud intermédiaire)
  const longEdges = graph.edges
    .filter(e => e.lengthM > 20)
    .map(e => ({ id: e.id, lengthM: e.lengthM }))
    .sort((a, b) => b.lengthM - a.lengthM)

  // Composantes connexes
  const visited = new Set<string>()
  let components = 0
  for (const n of graph.nodes) {
    if (visited.has(n.id) || !withEdges.has(n.id)) continue
    components++
    const stack = [n.id]
    while (stack.length) {
      const u = stack.pop()!
      if (visited.has(u)) continue
      visited.add(u)
      for (const nb of graph._adj.get(u) ?? []) stack.push(nb.to)
    }
  }

  // Couverture : totalLen × 3m (largeur moyenne couloir) / surface mall
  const coveragePct = mallAreaM2 ? Math.min(100, (totalLen * 3 / mallAreaM2) * 100) : -1

  return {
    generatedAt: new Date().toISOString(),
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    totalLengthM: totalLen,
    coveragePct,
    orphanNodeIds: orphans,
    longEdgeIds: longEdges.slice(0, 20),
    disconnectedComponents: components,
  }
}
