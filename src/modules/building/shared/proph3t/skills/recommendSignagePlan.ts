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
  suggestedLocations: Array<{ x: number; y: number; reason: string; targetPoiId?: string; zone?: PlanZone; zoneLabel?: string }>
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
  /** Zones du plan détectées (galerie/promenade/parking/extérieur) avec aire et compteurs. */
  zoneSummary: Array<{
    zone: PlanZone
    label: string
    spaceCount: number
    areaSqm: number
    plannedSignsCount: number
    /** Top types proposés dans cette zone. */
    topTypes: Array<{ code: string; qty: number }>
  }>
  /** Inventaire détection Prophet — pour que le user vérifie avant placement. */
  detectionInventory: {
    commerces: Array<{ id: string; label: string; type?: string; areaSqm: number }>
    elevators: Array<{ id: string; label: string; type?: string; areaSqm: number }>
    escalators: Array<{ id: string; label: string; type?: string; areaSqm: number }>
    stairs: Array<{ id: string; label: string; type?: string; areaSqm: number }>
    wcs: Array<{ id: string; label: string; type?: string; areaSqm: number }>
    entrances: Array<{ id: string; label: string }>
    anchors: Array<{ id: string; label: string }>
  }
}

// ─── Helpers ───────────────────────────────────────

// Commerces : matche les SpaceTypeKey canoniques (commerce_*, local_commerce,
// restauration, food_court, loisirs, services, grande_surface, kiosque) +
// variantes labels manuels.
const COMMERCE_RE = /\b(commerce|commerces|local_commerce|restauration|restau|restaurant|food[\s_-]?court|food|loisirs|services|grande_surface|magasin|boutique|shop|retail|kiosque|stand|hotel|cinema|cinema_multiplex|salle_spectacle|big_box|market|bureau)\b/i

// POIs ancres : grands équipements qui structurent le parcours client
// (cinéma, hyper, hôtel, food court, big box, salle de spectacle).
const ANCHOR_RE = /\b(big_box|grande_surface|commerce_supermarche|cinema_multiplex|salle_spectacle|hotel|market|food_court|zone_exposition)\b/i
// Circulations INDOOR matche les SpaceTypeKey canoniques :
//   mail_central, atrium, promenade, couloir_secondaire, hall_distribution,
//   passage_pieton_couvert, couloir_service, hall, halle, galerie
// Exclut volontairement parking_voie_*, voie_*, exterieur_voie_* qui sont
// classifiés comme parking/extérieur (non-indoor).
const CIRC_RE = /\b(mail_central|mail|atrium|promenade|couloir_secondaire|couloir_service|couloir|couloirs|hall_distribution|hall|halle|passage_pieton_couvert|passage_couvert|passage|galerie|circulation|circul)\b/i
// Regexes — match strict sur les SpaceTypeKey canoniques d'Atlas Studio
// (libraries/spaceTypeLibrary.ts) + variantes FR/EN courantes pour les
// labels manuels. Word boundaries pour éviter les faux positifs.
//
// Types canoniques attendus :
//   ascenseur                    → ELEVATOR_RE
//   escalator                    → ESCALATOR_RE
//   escalier_fixe                → STAIRS_RE
//   sanitaires                   → WC_RE
const ELEVATOR_RE = /\b(ascenseur|ascenseurs|asc\.?|elevator|elevators|lift)\b/i
const ESCALATOR_RE = /\b(escalator|escalators|escalier[\s_-]?(méca|méc|roulant))\b/i
const STAIRS_RE = /\b(escalier|escalier_fixe|escaliers|staircase|stairwell|stair[\s_-]?well|stair[\s_-]?case)\b/i
const WC_RE = /\b(sanitaire|sanitaires|sanit\.?|wc|toilette|toilettes|toilet|restroom|bathroom|lavabo)\b/i
const PARKING_RE = /parking|stationnement/i
const EXIT_RE = /sortie|exit|évac/i
const ENTRANCE_RE = /entrée|entrance/i

// ─── ZONES DU PLAN ─────────────────────────────────
// Prophet doit connaître la galerie commerciale, la promenade, le parking
// pour adapter le type de signalétique à chaque endroit.
type PlanZone = 'galerie' | 'promenade' | 'parking' | 'exterior' | 'service' | 'unknown'

const PROMENADE_RE = /mail|promenade|mall|hall|rotonde|atrium/i
const EXTERIOR_RE = /parvis|exterieur|extérieur|jardin|outdoor|terrasse/i

function classifyZone(s: PlanSpace): PlanZone {
  const txt = `${s.type ?? ''} ${s.label ?? ''}`
  if (PARKING_RE.test(txt)) return 'parking'
  if (EXTERIOR_RE.test(txt)) return 'exterior'
  if (PROMENADE_RE.test(txt)) return 'promenade'
  if (COMMERCE_RE.test(txt)) return 'galerie' // les commerces font partie de la galerie
  if (CIRC_RE.test(txt)) {
    // Circulation : si grande surface (>200m²) → promenade, sinon galerie
    return s.areaSqm > 200 ? 'promenade' : 'galerie'
  }
  if (ELEVATOR_RE.test(txt) || ESCALATOR_RE.test(txt) || STAIRS_RE.test(txt) || WC_RE.test(txt)) {
    return 'service'
  }
  return 'unknown'
}

const ZONE_LABELS: Record<PlanZone, string> = {
  galerie: 'Galerie commerciale',
  promenade: 'Promenade / Mail',
  parking: 'Parking',
  exterior: 'Extérieur',
  service: 'Espace de service',
  unknown: 'Autre',
}

/** Match large : Prophet lit type ET label (OR). La défense contre les
 *  faux positifs est dans les garde-fous : regex avec word boundaries
 *  + isReasonableServiceSize + filtre zone (parking/extérieur exclus).
 *  Permet de capturer des espaces dont le type auto-détecté est imprécis
 *  mais dont le label utilisateur précise le rôle (ex: type='room' label='WC RDC'). */
function matchesType(s: PlanSpace, re: RegExp): boolean {
  return re.test(String(s.type ?? '')) || re.test(String(s.label ?? ''))
}

/** Sanity check d'aire : un sanitaire fait 2-100m², un ascenseur 2-15m², etc. */
const SERVICE_AREA_RANGES: Record<string, { min: number; max: number }> = {
  wc:        { min: 2,  max: 100 },
  elevator:  { min: 2,  max: 30 },
  escalator: { min: 5,  max: 80 },
  stair:     { min: 2,  max: 80 },
}

function isReasonableServiceSize(s: PlanSpace, kind: keyof typeof SERVICE_AREA_RANGES): boolean {
  const range = SERVICE_AREA_RANGES[kind]
  return s.areaSqm >= range.min && s.areaSqm <= range.max
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
): Array<{ x: number; y: number; reason: string; targetPoiId?: string }> {
  if (qty <= 0) return []
  const out: Array<{ x: number; y: number; reason: string; targetPoiId?: string }> = []
  const r = meta.quantityRule

  // ═══ PLACEMENT CONTEXTUEL (Prophet lit le plan + propose) ═══
  // Pour les types directionnels : trace les routes entrée → ancres et place
  // les panneaux aux nœuds de décision sur le chemin, avec target POI explicite.
  const isDirectional = meta.code === 'DIR-S' || meta.code === 'DIR-M' || meta.code === 'DIR-SOL'
  if (isDirectional) {
    const contextual = contextualRoutePlacements(meta, qty, ctx)
    if (contextual.length > 0) {
      out.push(...contextual)
      // Si pas assez via routing, complète avec décision nodes restants
      if (out.length < qty) {
        const remaining = qty - out.length
        const fallback = computeDecisionNodes(ctx.circulationSpaces)
          .filter(n => !out.some(o => Math.hypot(o.x - n.x, o.y - n.y) < 8))
          .slice(0, remaining)
        for (const n of fallback) {
          out.push({ x: n.x, y: n.y, reason: `${meta.label} au nœud de décision` })
        }
      }
      return out
    }
  }

  // Pour PLAN-M : placer aux entrées principales + 1 au centre de la plus
  // grande circulation (mail principal). Plus contextuel que distribué uniformément.
  if (meta.code === 'PLAN-M') {
    const entrances = ctx.pois.filter(p => ENTRANCE_RE.test(p.label) || p.priority === 1).slice(0, 3)
    for (const e of entrances) {
      if (out.length >= qty) break
      out.push({ x: e.x, y: e.y, reason: `${meta.label} à "${e.label}"` })
    }
    // Mail principal = plus grande circulation
    const sorted = [...ctx.circulationSpaces].sort((a, b) => b.areaSqm - a.areaSqm)
    if (sorted.length > 0 && out.length < qty) {
      const [cx, cy] = polygonCentroid(sorted[0].polygon)
      out.push({ x: cx, y: cy, reason: `${meta.label} au centre du mail principal "${sorted[0].label || sorted[0].id}"` })
    }
    return out
  }

  // Cas 1 : par espace de service — utilise placement contextuel (centre + pré-service)
  if (r.kind === 'per-elevator') {
    return contextualServicePlacements(meta, qty, ctx, ELEVATOR_RE, 'Ascenseur', 'elevator')
  }
  if (r.kind === 'per-escalator') {
    return contextualServicePlacements(meta, qty, ctx, ESCALATOR_RE, 'Escalator', 'escalator')
  }
  if (r.kind === 'per-stair') {
    return contextualServicePlacements(meta, qty, ctx, STAIRS_RE, 'Escalier', 'stair')
  }
  if (r.kind === 'per-wc-block') {
    return contextualServicePlacements(meta, qty, ctx, WC_RE, 'Sanitaires', 'wc')
  }

  // Cas 1bis : per-local (commerce) — centroïde du polygone
  if (r.kind === 'per-local') {
    const targetSpaces = ctx.spaces.filter(s => COMMERCE_RE.test(s.type ?? '') || COMMERCE_RE.test(s.label ?? ''))
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

// ─── PLACEMENT CONTEXTUEL (routes entrée→ancres) ───────
//
// Distance d'un point à un segment (utilisé pour trouver les nœuds le long
// d'un trajet entrée→ancrage).
function distancePointToSegment(
  px: number, py: number,
  a: { x: number; y: number }, b: { x: number; y: number },
): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - a.x, py - a.y)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

/**
 * Placement contextuel pour les directionnels (DIR-S, DIR-M) :
 * pour chaque (entrée × POI ancre) trace une route directe et place 1-2
 * panneaux aux nœuds de décision les plus proches de la route.
 * Chaque sign a un target POI explicite et un reason "Vers X depuis Y".
 */
function contextualRoutePlacements(
  meta: SignageTypeMeta,
  qty: number,
  ctx: Parameters<typeof computeQuantityForRule>[1],
): Array<{ x: number; y: number; reason: string; targetPoiId?: string }> {
  const out: Array<{ x: number; y: number; reason: string; targetPoiId?: string }> = []

  // Entrées : depuis POIs (labellisés "entrée" ou priority 1) ET aussi
  // depuis les espaces dont le type canonique est entree_*
  const entrancesPois = ctx.pois.filter(p =>
    ENTRANCE_RE.test(p.label) || (p.priority === 1 && !EXIT_RE.test(p.label)),
  )
  const entrancesFromSpaces = ctx.spaces
    .filter(s => /^(entree_principale|entree_secondaire|porte_entree|acces_site_pieton_principal|acces_site_pieton_secondaire)$/.test(String(s.type ?? '')))
    .map(s => {
      const [cx, cy] = polygonCentroid(s.polygon)
      return { id: `entrance-from-space-${s.id}`, label: s.label || 'Entrée', x: cx, y: cy }
    })
  const entrances = [
    ...entrancesPois,
    ...entrancesFromSpaces,
  ]

  // Ancres : POIs priority 1 + ESPACES canoniques big_box, cinema_multiplex, etc.
  const anchorsFromPois = ctx.pois.filter(p =>
    p.priority === 1 && !ENTRANCE_RE.test(p.label) && !EXIT_RE.test(p.label),
  )
  const anchorsFromSpaces = ctx.spaces
    .filter(s => ANCHOR_RE.test(String(s.type ?? '')) || ANCHOR_RE.test(String(s.label ?? '')))
    .map(s => {
      const [cx, cy] = polygonCentroid(s.polygon)
      return { id: `anchor-from-space-${s.id}`, label: s.label || s.type || 'Ancre', x: cx, y: cy }
    })
  const anchors = [
    ...anchorsFromPois,
    ...anchorsFromSpaces,
  ].slice(0, 12)

  if (entrances.length === 0 || anchors.length === 0) return out
  const nodes = computeDecisionNodes(ctx.circulationSpaces)
  if (nodes.length === 0) return out

  // Pour chaque paire (entrée × ancre), prend les 2 décision nodes les plus
  // proches de la ligne reliant entrée→ancre, en commençant par celui le plus
  // proche de l'ancre (sign le plus proche pointe vers le but).
  const pairCount = Math.min(entrances.length * anchors.length, qty * 2)
  const pairs: Array<{ ent: PlanPoi; anc: PlanPoi }> = []
  for (const ent of entrances) {
    for (const anc of anchors) {
      pairs.push({ ent, anc })
    }
  }
  // Tri : prioriser les paires avec longue distance (plus de signs nécessaires)
  pairs.sort((a, b) => {
    const da = Math.hypot(a.ent.x - a.anc.x, a.ent.y - a.anc.y)
    const db = Math.hypot(b.ent.x - b.anc.x, b.ent.y - b.anc.y)
    return db - da
  })

  for (const { ent, anc } of pairs) {
    if (out.length >= qty) break
    // Nœuds dans un corridor de 25m autour de la ligne entrée→ancre
    const onPath = nodes
      .map(n => ({
        n,
        dToLine: distancePointToSegment(n.x, n.y, ent, anc),
        dToAnchor: Math.hypot(n.x - anc.x, n.y - anc.y),
        dToEnt: Math.hypot(n.x - ent.x, n.y - ent.y),
        totalRouteLen: Math.hypot(ent.x - anc.x, ent.y - anc.y),
      }))
      .filter(o => o.dToLine < 25 && o.dToAnchor > 8 && o.dToEnt > 8)
      .filter(o => o.dToAnchor + o.dToEnt < o.totalRouteLen + 30) // sur ou très près du segment
      .sort((a, b) => a.dToAnchor - b.dToAnchor)

    if (onPath.length === 0) continue

    // Prend 1 sign proche de l'ancre + 1 à mi-parcours si distance > 30m
    const dist = Math.hypot(ent.x - anc.x, ent.y - anc.y)
    const toPlace = dist > 50 ? onPath.slice(0, 2) : onPath.slice(0, 1)
    for (const o of toPlace) {
      // Évite duplicatas (déjà un sign vers cette ancre depuis ce nœud)
      const dup = out.some(p => Math.hypot(p.x - o.n.x, p.y - o.n.y) < 6 && p.targetPoiId === anc.id)
      if (dup) continue
      out.push({
        x: o.n.x,
        y: o.n.y,
        reason: `${meta.label} → "${anc.label}" depuis "${ent.label}" (${o.dToAnchor.toFixed(0)}m)`,
        targetPoiId: anc.id,
      })
      pairCount
      if (out.length >= qty) break
    }
  }

  return out
}

/**
 * Placement contextuel pour services (SRV-WC, SRV-ASC, SRV-ESC, etc.) :
 * • 1 sign au centroïde de chaque espace de service (l'identification)
 * • 1 sign "directionnel pré-service" placé à 12-15m en amont sur la
 *   circulation la plus proche (le panneau qui guide vers le service).
 */
function contextualServicePlacements(
  meta: SignageTypeMeta,
  qty: number,
  ctx: Parameters<typeof computeQuantityForRule>[1],
  serviceMatcher: RegExp,
  serviceTypeName: string,
  areaKind?: keyof typeof SERVICE_AREA_RANGES,
): Array<{ x: number; y: number; reason: string }> {
  const out: Array<{ x: number; y: number; reason: string }> = []
  let services = ctx.spaces.filter(s => matchesType(s, serviceMatcher))
  // Filtre par taille raisonnable
  if (areaKind) {
    services = services.filter(s => isReasonableServiceSize(s, areaKind))
  }
  // Exclut tout ce qui tombe en zone parking ou extérieure
  services = services.filter(s => {
    const z = classifyZone(s)
    return z !== 'parking' && z !== 'exterior'
  })
  if (services.length === 0) return out

  // Si beaucoup de services détectés, on se limite au centroïde (pas de
  // pré-service en plus pour éviter de doubler le nombre de signs).
  const skipPreService = services.length > 6

  for (const svc of services) {
    if (out.length >= qty) break
    const [scx, scy] = polygonCentroid(svc.polygon)
    out.push({
      x: scx,
      y: scy,
      reason: `${meta.label} pour "${svc.label || svc.id}" — ${serviceTypeName}`,
    })

    // Sign directionnel pré-service à ~13m dans la circulation la plus proche
    if (skipPreService) continue
    if (out.length >= qty) break
    let bestPoint: { x: number; y: number; circLabel: string } | null = null
    let bestDist = Infinity
    for (const c of ctx.circulationSpaces) {
      const [ccx, ccy] = polygonCentroid(c.polygon)
      // Direction du service vers le centre de circulation
      const dx = ccx - scx, dy = ccy - scy
      const d = Math.hypot(dx, dy)
      if (d > 0 && d < bestDist) {
        const t = Math.min(13, d - 5) / d // 13m vers le centre, sans dépasser
        bestPoint = {
          x: scx + dx * t,
          y: scy + dy * t,
          circLabel: c.label || c.id,
        }
        bestDist = d
      }
    }
    if (bestPoint) {
      out.push({
        x: bestPoint.x,
        y: bestPoint.y,
        reason: `${meta.label} → "${svc.label || svc.id}" (pré-service, sur ${bestPoint.circLabel})`,
      })
    }
  }
  return out
}

/** Trouve dans quelle zone du plan se trouve un point. */
function findZoneOfPoint(x: number, y: number, spaces: PlanSpace[]): { zone: PlanZone; spaceLabel: string } {
  for (const s of spaces) {
    if (pointInPolygon(x, y, s.polygon)) {
      return { zone: classifyZone(s), spaceLabel: s.label || s.id }
    }
  }
  return { zone: 'unknown', spaceLabel: '—' }
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
  // Circulations INTÉRIEURES UNIQUEMENT pour placement signalétique :
  // exclut parking, extérieur, et tout polygone qui ressemble à un parking
  // (très grande aire avec voirie). Évite les BAES qui courent le long du
  // périmètre du parking.
  const circulationSpaces = input.spaces.filter(s => {
    if (!matchesType(s, CIRC_RE)) return false
    const z = classifyZone(s)
    if (z === 'parking' || z === 'exterior') return false
    // Garde-fou : exclut polygones absurdement grands (> 5000m² = probablement
    // une voirie extérieure mal typée comme circulation)
    if (s.areaSqm > 5000) return false
    return true
  })
  const circulationSqm = circulationSpaces.reduce((s, sp) => s + sp.areaSqm, 0)

  const commerceCount = input.spaces.filter(s => COMMERCE_RE.test(s.type ?? '') || COMMERCE_RE.test(s.label ?? '')).length
  // Helper : filtre service avec garde-fous (taille + zone non-parking/extérieur)
  const filterValidService = (re: RegExp, areaKind: keyof typeof SERVICE_AREA_RANGES) =>
    input.spaces.filter(s =>
      matchesType(s, re)
      && isReasonableServiceSize(s, areaKind)
      && classifyZone(s) !== 'parking'
      && classifyZone(s) !== 'exterior',
    )
  const elevatorCount = filterValidService(ELEVATOR_RE, 'elevator').length
  const escalatorCount = filterValidService(ESCALATOR_RE, 'escalator').length
  const stairCount = filterValidService(STAIRS_RE, 'stair').length
  const wcBlockCount = filterValidService(WC_RE, 'wc').length // pas de Math.max(1) — si 0 détecté, 0 placements
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
    // ─── WHITELIST STRICTE : un pin doit être DANS une circulation valide ───
    // Plus de blacklist qui laisse passer les zones "inconnues". On exige
    // que le point soit explicitement à l'intérieur d'au moins UN polygone
    // de circulationSpaces (qui sont déjà filtrées : indoor uniquement).
    //
    // Exceptions par TYPE :
    //   • TOT-EXT, SRV-PKG  : doivent être DANS un polygone parking/extérieur
    //   • COM-LED           : doit être dans un polygone extérieur (façade)
    //   • LOT-N, ENS, COM-VIT : doit être dans un polygone commerce (centroïde)
    //   • SRV-WC, SRV-ASC, SRV-ESC, etc. : centroïde de leur espace de service
    //
    // Tous les autres types (DIR-S, DIR-M, PLAN-M, SEC-IS, SEC-EXT, etc.)
    // doivent être dans une CIRCULATION INTÉRIEURE.
    const SERVICE_TYPES = new Set(['SRV-WC', 'SRV-ASC', 'SRV-PKG'])
    const COMMERCE_TYPES = new Set(['LOT-N', 'ENS', 'COM-VIT'])
    const OUTDOOR_TYPES = new Set(['TOT-EXT', 'COM-LED'])

    const filteredByZone: typeof suggestedLocations = []
    for (const loc of suggestedLocations) {
      const { zone, spaceLabel } = findZoneOfPoint(loc.x, loc.y, input.spaces)

      let accepted = false
      if (OUTDOOR_TYPES.has(code)) {
        // Doit être en extérieur (parvis/jardin) ou parking
        accepted = (zone === 'exterior' || zone === 'parking')
      } else if (code === 'SRV-PKG') {
        accepted = zone === 'parking'
      } else if (SERVICE_TYPES.has(code)) {
        // Service indoor : zone === 'service' OU pin dans une circulation
        accepted = zone === 'service' || circulationSpaces.some(c => pointInPolygon(loc.x, loc.y, c.polygon))
      } else if (COMMERCE_TYPES.has(code)) {
        // Commerce : zone === 'galerie' (un commerce ou circulation de la galerie)
        accepted = zone === 'galerie'
      } else {
        // Tous les autres : doit être DANS UNE CIRCULATION VALIDÉE
        accepted = circulationSpaces.some(c => pointInPolygon(loc.x, loc.y, c.polygon))
      }

      if (!accepted) continue
      filteredByZone.push({
        ...loc,
        zone,
        zoneLabel: ZONE_LABELS[zone],
        reason: `[${ZONE_LABELS[zone]} · ${spaceLabel}] ${loc.reason}`,
      })
    }
    suggestedLocations.length = 0
    suggestedLocations.push(...filteredByZone)
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

  // ─── Zone summary : aggrégation par zone détectée ───
  const zoneAggr = new Map<PlanZone, { spaceCount: number; areaSqm: number; signs: Array<{ code: string }> }>()
  // Comptage des espaces par zone
  for (const s of input.spaces) {
    const z = classifyZone(s)
    const cur = zoneAggr.get(z) ?? { spaceCount: 0, areaSqm: 0, signs: [] }
    cur.spaceCount++
    cur.areaSqm += s.areaSqm
    zoneAggr.set(z, cur)
  }
  // Comptage des signs proposés par zone
  for (const rec of recommendations) {
    for (const loc of rec.suggestedLocations) {
      const z = (loc.zone ?? 'unknown') as PlanZone
      const cur = zoneAggr.get(z) ?? { spaceCount: 0, areaSqm: 0, signs: [] }
      cur.signs.push({ code: rec.code })
      zoneAggr.set(z, cur)
    }
  }
  const zoneSummary = Array.from(zoneAggr.entries()).map(([zone, agg]) => {
    // Top types par fréquence
    const counts: Record<string, number> = {}
    for (const sig of agg.signs) counts[sig.code] = (counts[sig.code] ?? 0) + 1
    const topTypes = Object.entries(counts)
      .map(([code, qty]) => ({ code, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
    return {
      zone,
      label: ZONE_LABELS[zone],
      spaceCount: agg.spaceCount,
      areaSqm: agg.areaSqm,
      plannedSignsCount: agg.signs.length,
      topTypes,
    }
  }).sort((a, b) => b.areaSqm - a.areaSqm)

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
    zoneSummary,
    detectionInventory: {
      commerces: input.spaces.filter(s => COMMERCE_RE.test(s.type ?? '') || COMMERCE_RE.test(s.label ?? ''))
        .map(s => ({ id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm })),
      elevators: filterValidService(ELEVATOR_RE, 'elevator').map(s => ({ id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm })),
      escalators: filterValidService(ESCALATOR_RE, 'escalator').map(s => ({ id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm })),
      stairs: filterValidService(STAIRS_RE, 'stair').map(s => ({ id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm })),
      wcs: filterValidService(WC_RE, 'wc').map(s => ({ id: s.id, label: s.label, type: s.type, areaSqm: s.areaSqm })),
      entrances: [
        ...input.pois.filter(p => ENTRANCE_RE.test(p.label) || p.priority === 1).map(p => ({ id: p.id, label: p.label })),
        ...input.spaces
          .filter(s => /^(entree_principale|entree_secondaire|porte_entree|acces_site_pieton_principal|acces_site_pieton_secondaire)$/.test(String(s.type ?? '')))
          .map(s => ({ id: `space-${s.id}`, label: s.label || 'Entrée (espace)' })),
      ],
      anchors: [
        ...input.pois.filter(p => p.priority === 1 && !ENTRANCE_RE.test(p.label) && !EXIT_RE.test(p.label)).map(p => ({ id: p.id, label: p.label })),
        ...input.spaces
          .filter(s => ANCHOR_RE.test(String(s.type ?? '')) || ANCHOR_RE.test(String(s.label ?? '')))
          .map(s => ({ id: `space-${s.id}`, label: s.label || String(s.type ?? 'Ancre') })),
      ],
    },
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
