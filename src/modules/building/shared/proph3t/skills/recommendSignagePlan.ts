// ═══ SKILL — Plan signalétique complet (prescriptif ERP) ═══
//
// Calcule pour chaque type du SIGNAGE_CATALOG la quantité requise selon
// sa quantityRule (per-meters-path, per-local, per-extinguisher, etc.)
// et propose des emplacements concrets.
//
// Output : matrice complète "Type X → besoin Y panneaux aux positions Z"
// que l'utilisateur peut accepter en bloc ou par catégorie.

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import { SIGNAGE_CATALOG, type SignageTypeMeta } from '../libraries/signageCatalog'

// ─── Types ─────────────────────────────────────────

export interface PlanSpace {
  id: string
  label: string
  type?: string
  areaSqm: number
  polygon: [number, number][]
  floorId?: string
}

export interface PlanPoi {
  id: string
  label: string
  x: number
  y: number
  priority?: 1 | 2 | 3
}

export interface RecommendSignagePlanInput {
  planWidth: number
  planHeight: number
  spaces: PlanSpace[]
  pois: PlanPoi[]
  /** Nombre de niveaux/floors (défaut 1). */
  floorCount?: number
  /** Quantités déjà placées (par code). Utilisé pour calculer le manque. */
  alreadyPlaced?: Record<string, number>
}

export interface SignageRecommendation {
  code: string
  meta: SignageTypeMeta
  requiredQty: number
  currentQty: number
  missingQty: number
  /** Coordonnées proposées pour les panneaux manquants. */
  suggestedLocations: Array<{ x: number; y: number; reason: string }>
  /** Justification du calcul de quantité. */
  rationale: string
  /** Coût total estimé pour les manquants (FCFA). */
  costMissingFcfa: number
}

export interface RecommendSignagePlanPayload {
  recommendations: SignageRecommendation[]
  totalRequired: number
  totalCurrent: number
  totalMissing: number
  totalCostFcfa: number
  costMissingFcfa: number
  byPriority: { P1: number; P2: number; P3: number }
  erpRequiredCount: number
  /** Couverture ERP : % d'obligations ERP satisfaites. */
  erpCompliancePct: number
}

// ─── Helpers ───────────────────────────────────────

const COMMERCE_RE = /commerce|mode|restau|food|magasin|boutique|shop/i
const CIRC_RE = /circul|hall|mall|mail|couloir|passage|piet|piéton|voie|parvis|entr|access|porte/i
const ELEVATOR_RE = /ascenseur|elevator|lift/i
const ESCALATOR_RE = /escalator|escalier méca|escalator/i
const STAIRS_RE = /escalier|stair/i
const WC_RE = /sanitaire|wc|toilette|restroom/i
const PARKING_RE = /parking|stationnement/i
const EXIT_RE = /sortie|exit|évac/i
const ENTRANCE_RE = /entrée|entrance/i

function matchesType(s: PlanSpace, re: RegExp): boolean {
  return re.test(String(s.type ?? '')) || re.test(String(s.label ?? ''))
}

function polygonCentroid(poly: [number, number][]): [number, number] {
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return [cx / poly.length, cy / poly.length]
}

function polygonPerimeter(poly: [number, number][]): number {
  let p = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    p += Math.hypot(x2 - x1, y2 - y1)
  }
  return p
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

/** Échantillonne points le long du périmètre tous les `everyM` mètres. */
function sampleAlongPerimeter(poly: [number, number][], everyM: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < everyM) continue
    const steps = Math.floor(len / everyM)
    for (let k = 1; k <= steps; k++) {
      const t = k / (steps + 1)
      out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])
    }
  }
  return out
}

/** Distribue uniformément N points dans un polygone (grille puis filtre). */
function distributeInPolygon(poly: [number, number][], n: number): Array<[number, number]> {
  if (n <= 0) return []
  const xs = poly.map(p => p[0])
  const ys = poly.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const w = maxX - minX, h = maxY - minY
  // Grille cellule estimée pour avoir n points
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * w / Math.max(1, h))))
  const rows = Math.max(1, Math.ceil(n / cols))
  const out: Array<[number, number]> = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const x = minX + (j + 0.5) * (w / cols)
      const y = minY + (i + 0.5) * (h / rows)
      if (pointInPolygon(x, y, poly)) out.push([x, y])
      if (out.length >= n) return out
    }
  }
  return out
}

// ─── Caps de quantité par type (évite les surcharges visuelles) ───
// Plafond raisonnable par type pour un mall standard. Au-delà, l'utilisateur
// doit segmenter (par niveau) plutôt que de saturer le plan.
const MAX_QTY_PER_CODE: Record<string, number> = {
  'DIR-S': 40,        // directionnels suspendus — un toutes les ~30m
  'DIR-M': 25,        // muraux couloirs secondaires
  'DIR-SOL': 30,      // marquage sol — pas tous les 5m mais tous les ~25m
  'TOT-EXT': 4,
  'PLAN-M': 8,
  'LOT-N': 200,       // 1 par local — peut être beaucoup mais légitime
  'ENS': 100,
  'REP': 4,
  'SEC-IS': 80,       // BAES sortie de secours — 1 / 30m sur évac
  'SEC-EXT': 40,
  'SEC-RIA': 20,
  'SEC-EVA': 10,
  'SEC-BAES': 60,
  'SEC-INT': 15,
  'SRV-WC': 10,
  'SRV-ASC': 8,
  'SRV-PKG': 6,
  'SRV-HOR': 6,
  'SRV-ACC': 2,
  'PMR': 30,
  'COM-ECR': 8,
  'COM-KAK': 0,       // événementiel — pas placé auto
  'COM-VIT': 50,
  'COM-LED': 1,
  'WAY-BOR': 6,
  'WAY-QR': 30,
  'WAY-BLE': 40,
}

const DEFAULT_MAX = 50

function applyCap(code: string, qty: number): number {
  const cap = MAX_QTY_PER_CODE[code] ?? DEFAULT_MAX
  return Math.min(qty, cap)
}

// ─── Calcul de quantité par règle ──────────────────

function computeQuantityForRule(
  meta: SignageTypeMeta,
  ctx: {
    spaces: PlanSpace[]
    pois: PlanPoi[]
    totalAreaSqm: number
    circulationSqm: number
    circulationSpaces: PlanSpace[]
    commerceCount: number
    elevatorCount: number
    escalatorCount: number
    stairCount: number
    wcBlockCount: number
    parkingEntranceCount: number
    vehicleAccessCount: number
    entranceCount: number
    exitCount: number
    decisionNodeCount: number
    floorCount: number
    promenadeMeters: number
    carrefourCount: number
    secondaryCorridorCount: number
  },
): { qty: number; rationale: string } {
  const r = meta.quantityRule
  switch (r.kind) {
    case 'per-decision-node':
      return { qty: ctx.decisionNodeCount, rationale: `${ctx.decisionNodeCount} nœuds de décision détectés (carrefours + têtes d'escalator + entrées de zone)` }
    case 'per-entrance':
      return { qty: Math.max(1, ctx.entranceCount), rationale: `${ctx.entranceCount} entrée(s) principale(s) détectée(s)` }
    case 'per-exit':
      return { qty: Math.max(1, ctx.exitCount), rationale: `${ctx.exitCount} sortie(s) détectée(s)` }
    case 'per-local':
      return { qty: ctx.commerceCount, rationale: `${ctx.commerceCount} locaux commerciaux` }
    case 'per-elevator':
      return { qty: ctx.elevatorCount, rationale: `${ctx.elevatorCount} ascenseur(s)` }
    case 'per-escalator':
      return { qty: ctx.escalatorCount, rationale: `${ctx.escalatorCount} escalator(s)` }
    case 'per-stair':
      return { qty: ctx.stairCount, rationale: `${ctx.stairCount} escalier(s)` }
    case 'per-wc-block':
      return { qty: Math.max(1, ctx.wcBlockCount), rationale: `${ctx.wcBlockCount} bloc(s) sanitaires` }
    case 'per-meters-path': {
      // Multiplier par 1.5 pour éviter perimeter-counting double (intérieur+extérieur)
      const effectiveMeters = ctx.promenadeMeters / 1.5
      const qty = Math.ceil(effectiveMeters / r.everyM)
      return { qty, rationale: `${qty} panneaux pour couvrir ~${effectiveMeters.toFixed(0)}m de parcours d'évacuation (1 tous les ${r.everyM}m)` }
    }
    case 'per-area-sqm': {
      const qty = Math.max(1, Math.ceil(ctx.totalAreaSqm / r.everySqm))
      return { qty, rationale: `${qty} pour ${ctx.totalAreaSqm.toFixed(0)}m² (1 par ${r.everySqm}m²)` }
    }
    case 'per-parking-entrance':
      return { qty: Math.max(1, ctx.parkingEntranceCount), rationale: `${ctx.parkingEntranceCount} entrée(s) parking` }
    case 'per-extinguisher': {
      const extQty = Math.max(r.defaultCount, Math.ceil(ctx.totalAreaSqm / 200))
      return { qty: extQty, rationale: `${extQty} extincteurs estimés (1 / 200m² selon arrêté ERP)` }
    }
    case 'per-floor-zone': {
      const qty = ctx.floorCount * Math.max(1, Math.ceil(ctx.totalAreaSqm / ctx.floorCount / r.zoneSqm))
      return { qty, rationale: `${qty} pour ${ctx.floorCount} niveau(x) × zones de ${r.zoneSqm}m²` }
    }
    case 'per-vehicle-access':
      return { qty: Math.max(1, ctx.vehicleAccessCount), rationale: `${ctx.vehicleAccessCount} accès véhicule` }
    case 'fixed':
      return { qty: r.count, rationale: `Quantité fixe : ${r.count}` }
    case 'per-secondary-corridor':
      return { qty: ctx.secondaryCorridorCount, rationale: `${ctx.secondaryCorridorCount} couloir(s) secondaire(s) > ${r.minLengthM}m` }
    case 'per-promenade-meter': {
      // Marquage au sol : 1 tous les 25m (pas 5 — ça flooderait le plan)
      const qty = Math.ceil((ctx.promenadeMeters / 1.5) / 25)
      return { qty, rationale: `Marquage au sol tous les 25m (~${qty} sur ${(ctx.promenadeMeters / 1.5).toFixed(0)}m de promenade)` }
    }
    case 'per-carrefour-promenade':
      return { qty: Math.max(1, Math.ceil(ctx.carrefourCount / r.divisor)), rationale: `${ctx.carrefourCount} carrefours / ${r.divisor}` }
    case 'custom-event':
      return { qty: 0, rationale: 'Événementiel — quantité variable selon planning' }
  }
}

// ─── Calcul d'emplacements ─────────────────────────

function computeLocationsForType(
  meta: SignageTypeMeta,
  qty: number,
  ctx: Parameters<typeof computeQuantityForRule>[1],
): Array<{ x: number; y: number; reason: string }> {
  if (qty <= 0) return []
  const out: Array<{ x: number; y: number; reason: string }> = []
  const r = meta.quantityRule

  // Cas 1 : par espace (commerce, ascenseur, etc.) — centroïde de chaque espace
  let targetSpaces: PlanSpace[] | null = null
  if (r.kind === 'per-local') targetSpaces = ctx.spaces.filter(s => COMMERCE_RE.test(s.type ?? '') || COMMERCE_RE.test(s.label ?? ''))
  else if (r.kind === 'per-elevator') targetSpaces = ctx.spaces.filter(s => matchesType(s, ELEVATOR_RE))
  else if (r.kind === 'per-escalator') targetSpaces = ctx.spaces.filter(s => matchesType(s, ESCALATOR_RE))
  else if (r.kind === 'per-stair') targetSpaces = ctx.spaces.filter(s => matchesType(s, STAIRS_RE))
  else if (r.kind === 'per-wc-block') targetSpaces = ctx.spaces.filter(s => matchesType(s, WC_RE))
  if (targetSpaces && targetSpaces.length > 0) {
    for (const s of targetSpaces.slice(0, qty)) {
      const [cx, cy] = polygonCentroid(s.polygon)
      out.push({ x: cx, y: cy, reason: `${meta.label} pour "${s.label}" (${s.id})` })
    }
    return out
  }

  // Cas 2 : par POI (entrée, sortie, parking)
  let targetPois: PlanPoi[] | null = null
  if (r.kind === 'per-entrance') targetPois = ctx.pois.filter(p => ENTRANCE_RE.test(p.label) || p.priority === 1)
  else if (r.kind === 'per-exit') targetPois = ctx.pois.filter(p => EXIT_RE.test(p.label))
  else if (r.kind === 'per-parking-entrance' || r.kind === 'per-vehicle-access') targetPois = ctx.pois.filter(p => PARKING_RE.test(p.label))
  if (targetPois && targetPois.length > 0) {
    for (const p of targetPois.slice(0, qty)) {
      out.push({ x: p.x, y: p.y, reason: `${meta.label} à "${p.label}"` })
    }
    return out
  }

  // Cas 3 : per-meters-path / per-promenade-meter — échantillonne le long des périmètres
  if (r.kind === 'per-meters-path' || r.kind === 'per-promenade-meter') {
    const everyM = r.kind === 'per-meters-path' ? r.everyM : 5
    let placed = 0
    for (const c of ctx.circulationSpaces) {
      const samples = sampleAlongPerimeter(c.polygon, everyM)
      for (const [x, y] of samples) {
        if (placed >= qty) break
        out.push({ x, y, reason: `${meta.label} sur ${c.label || c.id} (tous les ${everyM}m)` })
        placed++
      }
      if (placed >= qty) break
    }
    return out
  }

  // Cas 4 : per-decision-node — centroïdes + médians
  if (r.kind === 'per-decision-node') {
    const nodes = computeDecisionNodes(ctx.circulationSpaces).slice(0, qty)
    for (const n of nodes) {
      out.push({ x: n.x, y: n.y, reason: `${meta.label} au nœud de décision ${n.fromCircId}` })
    }
    return out
  }

  // Cas 5 : per-area-sqm / per-floor-zone / per-extinguisher — distribué uniformément dans la circulation
  if (r.kind === 'per-area-sqm' || r.kind === 'per-floor-zone' || r.kind === 'per-extinguisher' || r.kind === 'per-secondary-corridor') {
    // Combine toutes les circulations en un seul polygone bbox approximatif
    if (ctx.circulationSpaces.length === 0) return []
    // Distribue qty points proportionnellement à l'aire de chaque circulation
    const totalA = ctx.circulationSpaces.reduce((s, c) => s + c.areaSqm, 0)
    let placed = 0
    for (const c of ctx.circulationSpaces) {
      const share = totalA > 0 ? Math.ceil((c.areaSqm / totalA) * qty) : 1
      const pts = distributeInPolygon(c.polygon, share)
      for (const [x, y] of pts) {
        if (placed >= qty) break
        out.push({ x, y, reason: `${meta.label} dans ${c.label || c.id}` })
        placed++
      }
      if (placed >= qty) break
    }
    return out
  }

  // Cas 6 : fixed / carrefour-promenade — placement central + dispersion
  // Au moins 1 au centre du plan
  out.push({
    x: ctx.spaces.length > 0 ? polygonCentroid(ctx.spaces[0].polygon)[0] : 0,
    y: ctx.spaces.length > 0 ? polygonCentroid(ctx.spaces[0].polygon)[1] : 0,
    reason: `${meta.label} (placement par défaut au centre du plan)`,
  })
  return out
}

function computeDecisionNodes(circs: PlanSpace[]): Array<{ x: number; y: number; fromCircId: string }> {
  const nodes: Array<{ x: number; y: number; fromCircId: string }> = []
  for (const c of circs) {
    const [cx, cy] = polygonCentroid(c.polygon)
    nodes.push({ x: cx, y: cy, fromCircId: c.id })
    // Points médians des arêtes longues
    for (let i = 0; i < c.polygon.length; i++) {
      const [x1, y1] = c.polygon[i]
      const [x2, y2] = c.polygon[(i + 1) % c.polygon.length]
      const len = Math.hypot(x2 - x1, y2 - y1)
      if (len > 8) {
        nodes.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, fromCircId: c.id })
      }
    }
  }
  return nodes
}

// ─── Skill principale ──────────────────────────────

export async function recommendSignagePlan(
  input: RecommendSignagePlanInput,
): Promise<Proph3tResult<RecommendSignagePlanPayload>> {
  const t0 = performance.now()

  // ─── Analyse géométrique du plan ───
  const totalAreaSqm = input.spaces.reduce((s, sp) => s + sp.areaSqm, 0)
  const circulationSpaces = input.spaces.filter(s => matchesType(s, CIRC_RE))
  const circulationSqm = circulationSpaces.reduce((s, sp) => s + sp.areaSqm, 0)

  const commerceCount = input.spaces.filter(s => COMMERCE_RE.test(s.type ?? '') || COMMERCE_RE.test(s.label ?? '')).length
  const elevatorCount = input.spaces.filter(s => matchesType(s, ELEVATOR_RE)).length
  const escalatorCount = input.spaces.filter(s => matchesType(s, ESCALATOR_RE)).length
  const stairCount = input.spaces.filter(s => matchesType(s, STAIRS_RE)).length
  const wcBlockCount = Math.max(1, input.spaces.filter(s => matchesType(s, WC_RE)).length)
  const parkingEntranceCount = Math.max(1, input.pois.filter(p => PARKING_RE.test(p.label)).length)
  const vehicleAccessCount = parkingEntranceCount
  const entranceCount = Math.max(1, input.pois.filter(p => ENTRANCE_RE.test(p.label) || p.priority === 1).length)
  const exitCount = Math.max(2, input.pois.filter(p => EXIT_RE.test(p.label)).length)

  const decisionNodes = computeDecisionNodes(circulationSpaces)
  const decisionNodeCount = decisionNodes.length
  const floorCount = input.floorCount ?? 1

  // Périmètre cumulé des circulations (proxy pour distance d'évacuation)
  const promenadeMeters = circulationSpaces.reduce((s, c) => s + polygonPerimeter(c.polygon), 0)
  const carrefourCount = decisionNodeCount
  const secondaryCorridorCount = circulationSpaces.filter(c => {
    const xs = c.polygon.map(p => p[0])
    const ys = c.polygon.map(p => p[1])
    const longest = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    return longest > 15 && c.areaSqm < 200
  }).length

  const ctx = {
    spaces: input.spaces,
    pois: input.pois,
    totalAreaSqm,
    circulationSqm,
    circulationSpaces,
    commerceCount,
    elevatorCount,
    escalatorCount,
    stairCount,
    wcBlockCount,
    parkingEntranceCount,
    vehicleAccessCount,
    entranceCount,
    exitCount,
    decisionNodeCount,
    floorCount,
    promenadeMeters,
    carrefourCount,
    secondaryCorridorCount,
  }

  // ─── Calcul recommandation par type ───
  const recommendations: SignageRecommendation[] = []
  for (const [code, meta] of Object.entries(SIGNAGE_CATALOG)) {
    const { qty: rawQty, rationale: rawRationale } = computeQuantityForRule(meta, ctx)
    if (rawQty <= 0) continue // skip types non applicables (custom-event sans planning)
    // Plafond pour éviter saturation visuelle
    const qty = applyCap(code, rawQty)
    const rationale = qty < rawQty
      ? `${rawRationale} · plafonné à ${qty} pour lisibilité du plan (théorique : ${rawQty})`
      : rawRationale
    const currentQty = input.alreadyPlaced?.[code] ?? 0
    const missingQty = Math.max(0, qty - currentQty)
    const rawLocations = missingQty > 0
      ? computeLocationsForType(meta, missingQty, ctx)
      : []
    // ─── Espacement minimum 8m entre placements proposés ───
    const MIN_SPACING_M = 8
    const suggestedLocations: typeof rawLocations = []
    for (const loc of rawLocations) {
      const tooClose = suggestedLocations.some(other =>
        Math.hypot(loc.x - other.x, loc.y - other.y) < MIN_SPACING_M,
      )
      if (!tooClose) suggestedLocations.push(loc)
    }
    // Si l'espacement a réduit, on ajuste missingQty au nombre réel de positions valides
    const effectiveMissingQty = Math.min(missingQty, suggestedLocations.length || missingQty)
    recommendations.push({
      code,
      meta,
      requiredQty: qty,
      currentQty,
      missingQty: effectiveMissingQty,
      suggestedLocations,
      rationale,
      costMissingFcfa: effectiveMissingQty * meta.priceFcfa,
    })
  }

  // ─── Totaux ───
  const totalRequired = recommendations.reduce((s, r) => s + r.requiredQty, 0)
  const totalCurrent = recommendations.reduce((s, r) => s + r.currentQty, 0)
  const totalMissing = recommendations.reduce((s, r) => s + r.missingQty, 0)
  const totalCostFcfa = recommendations.reduce((s, r) => s + r.requiredQty * r.meta.priceFcfa, 0)
  const costMissingFcfa = recommendations.reduce((s, r) => s + r.costMissingFcfa, 0)
  const byPriority = {
    P1: recommendations.filter(r => r.meta.priority === 'P1').reduce((s, r) => s + r.requiredQty, 0),
    P2: recommendations.filter(r => r.meta.priority === 'P2').reduce((s, r) => s + r.requiredQty, 0),
    P3: recommendations.filter(r => r.meta.priority === 'P3').reduce((s, r) => s + r.requiredQty, 0),
  }
  const erpReqs = recommendations.filter(r => r.meta.erpRequired)
  const erpRequiredCount = erpReqs.length
  const erpRequiredTotal = erpReqs.reduce((s, r) => s + r.requiredQty, 0)
  const erpCurrentTotal = erpReqs.reduce((s, r) => s + r.currentQty, 0)
  const erpCompliancePct = erpRequiredTotal > 0 ? (erpCurrentTotal / erpRequiredTotal) * 100 : 100

  // ─── Findings ───
  const findings: Proph3tFinding[] = []
  if (erpCompliancePct < 100) {
    const missingErpTypes = erpReqs.filter(r => r.missingQty > 0).map(r => r.code)
    findings.push({
      id: 'erp-non-compliance',
      severity: missingErpTypes.length > 5 ? 'critical' : 'warning',
      title: `Conformité ERP : ${erpCompliancePct.toFixed(0)}% — ${missingErpTypes.length} type(s) à compléter`,
      description: `Manque réglementaire pour : ${missingErpTypes.join(', ')}. Obligation arrêté ERP 25 juin 1980 + ISO 7010.`,
      sources: [citeAlgo('recommend-signage', 'Catalogue ERP + règles arrêté ERP'), citeAlgo('iso-7010', 'Pictogrammes sécurité ISO 7010')],
      confidence: confidence(0.95, 'Calcul déterministe sur règles catalogue'),
      affectedIds: missingErpTypes,
      metric: { name: 'compliance', value: erpCompliancePct, unit: '%' },
    })
  }
  if (totalMissing > 0) {
    findings.push({
      id: 'plan-incomplete',
      severity: 'info',
      title: `Plan incomplet : ${totalMissing} panneau(x) à ajouter pour le plan complet`,
      description: `${totalCurrent} placés / ${totalRequired} requis selon les règles métier. Coût restant : ${(costMissingFcfa / 1_000_000).toFixed(2)} M FCFA.`,
      sources: [citeAlgo('recommend-signage', 'Quantités catalogue × géométrie plan')],
      confidence: confidence(0.85, 'Heuristiques quantité par type'),
      affectedIds: [],
    })
  }

  // ─── Actions : top 5 types prioritaires manquants ───
  const actions: Proph3tAction[] = []
  let aid = 0
  const nextId = () => `recplan-${++aid}`
  const topMissing = [...recommendations]
    .filter(r => r.missingQty > 0)
    .sort((a, b) => {
      // ERP > P1 > P2 > P3
      if (a.meta.erpRequired !== b.meta.erpRequired) return a.meta.erpRequired ? -1 : 1
      const prio = { P1: 0, P2: 1, P3: 2 }
      return prio[a.meta.priority] - prio[b.meta.priority]
    })
    .slice(0, 5)
  for (const rec of topMissing) {
    actions.push({
      id: nextId(),
      verb: 'add-signage',
      label: `Placer ${rec.missingQty} × ${rec.meta.label} (${rec.code})${rec.meta.erpRequired ? ' — ERP' : ''}`,
      rationale: `${rec.rationale}. Coût : ${rec.costMissingFcfa.toLocaleString('fr-FR')} FCFA. ${rec.meta.standards.join(', ')}.`,
      payload: { code: rec.code, qty: rec.missingQty, locations: rec.suggestedLocations },
      severity: rec.meta.erpRequired ? 'warning' : 'info',
      confidence: confidence(0.8, 'Quantité par règle catalogue'),
      sources: [citeAlgo('recommend-signage', `Règle : ${rec.meta.quantityRule.kind}`)],
      estimatedCostFcfa: rec.costMissingFcfa,
      estimatedDelayDays: rec.meta.priority === 'P1' ? 7 : rec.meta.priority === 'P2' ? 21 : 60,
      estimatedImpact: { metric: 'Conformité plan', after: '+', unit: '%' },
    })
  }

  const summary = totalMissing === 0
    ? `Plan signalétique complet — ${totalCurrent} panneaux conformes catalogue (${(totalCostFcfa / 1_000_000).toFixed(1)} M FCFA déployés).`
    : `Plan recommandé : ${totalRequired} panneaux (${recommendations.length} types) · ${totalCurrent} placés · ${totalMissing} manquants · ${(costMissingFcfa / 1_000_000).toFixed(1)} M FCFA à investir · Conformité ERP ${erpCompliancePct.toFixed(0)}%.`

  const payload: RecommendSignagePlanPayload = {
    recommendations,
    totalRequired,
    totalCurrent,
    totalMissing,
    totalCostFcfa,
    costMissingFcfa,
    byPriority,
    erpRequiredCount,
    erpCompliancePct,
  }

  return {
    skill: 'recommendSignagePlan',
    timestamp: new Date().toISOString(),
    qualityScore: Math.round(erpCompliancePct * 0.5 + (totalCurrent / Math.max(1, totalRequired)) * 50),
    executiveSummary: summary,
    findings,
    actions,
    overlays: [], // pas d'overlays directs — l'UI consommera les recommandations
    payload,
    source: 'algo',
    confidence: confidence(0.85, 'Quantités déterministes catalogue + géométrie plan'),
    elapsedMs: performance.now() - t0,
  }
}
