// ═══ GOD MODE SIGNAGE ENGINE — Signalétique institutionnelle vs publicitaire ═══
//
// Proph3t décide automatiquement, pour chaque emplacement :
//   • La FAMILLE : institutional (directionnel/infos mall) vs advertising (publicité)
//   • Le TYPE physique (totem, mural, suspendu, LED, rétroéclairé, marquage sol…)
//   • Les DIMENSIONS (hauteur/largeur/profondeur) selon distance de lecture,
//     hauteur sous plafond, flux ABM
//   • Le SUPPORT recommandé
//   • La POSITION exacte (x, y) et orientation
//
// + Règles de cohabitation : distances minimales, hiérarchie visuelle,
//   zones d'exclusion pour éviter les conflits et la sur-signalétique.

import type { NavGraph } from './plan-analysis/navGraphEngine'

// ─── Types enrichis ───────────────────────────────────────

/** Famille du panneau — distinction stricte institutionnel vs publicitaire. */
export type SignageFamily = 'institutional' | 'advertising'

/** Sous-catégorie institutionnelle. */
export type InstitutionalCategory =
  | 'directional'        // flèches, "you are here", liens de niveaux
  | 'information'        // horaires, règlement, accessibilité
  | 'safety'             // sortie de secours, plan évacuation
  | 'service'            // toilettes, info point, ascenseurs

/** Sous-catégorie publicitaire. */
export type AdvertisingCategory =
  | 'campaign'           // campagne active d'une enseigne
  | 'promo'              // promotion ponctuelle
  | 'event'              // événement du mall
  | 'brand-wall'         // vitrophanie / mur de marque

/** Support physique. */
export type SignageSupport =
  | 'totem-freestanding' // totem sur pied
  | 'suspended'          // suspendu du plafond
  | 'wall-mounted'       // mural
  | 'led-screen'         // écran LED / DOOH
  | 'backlit-panel'      // panneau rétroéclairé
  | 'floor-decal'        // marquage sol / sticker
  | 'facade-sign'        // enseigne de façade (pour les boutiques)
  | 'digital-kiosk'      // borne interactive

/** Dimensions physiques en mètres. */
export interface SignageDimensions {
  /** Hauteur totale (panneau + pied si totem). */
  heightM: number
  /** Largeur. */
  widthM: number
  /** Profondeur (pour support LED, totem). */
  depthM: number
  /** Hauteur du texte principal (mm) — dérivée de la distance de lecture. */
  textHeightMm: number
}

/** Enregistrement complet d'un panneau piloté par GOD MODE. */
export interface GodModeSignagePlacement {
  id: string
  floorId: string
  family: SignageFamily
  institutionalCategory?: InstitutionalCategory
  advertisingCategory?: AdvertisingCategory
  support: SignageSupport
  dimensions: SignageDimensions
  /** Position monde (m). */
  x: number
  y: number
  /** Orientation en degrés (0 = Nord). */
  orientationDeg: number
  /** Hauteur de pose (haut du panneau par rapport au sol). */
  poseHeightM: number
  /** Contenu / message. */
  content: string
  /** Distance max de lecture attendue (m). */
  maxReadingDistanceM: number
  /** Flux piéton estimé à cet emplacement (passages/heure). */
  expectedFootfall: number
  /** Score de visibilité 0..1 (1 = optimal). */
  visibilityScore: number
  /** Justification Proph3t (pourquoi ici, pourquoi ce type, pourquoi ces dimensions). */
  rationale: string
  /** Liste des conflits détectés (vide si OK). */
  conflicts: string[]
  /** ID de la campagne publicitaire associée (si family=advertising). */
  campaignId?: string
  /** True si placé par le moteur GOD MODE (vs manuel). */
  autoPlaced: boolean
}

// ─── Paramètres d'optimisation ────────────────────────────

export interface GodModeInput {
  /** Graphe de navigation (issu du Vol.4 Wayfinder ou du Vol.3). */
  navGraph: NavGraph
  /** Zones fréquentées (ABM heatmap) — lookup par cellule. */
  footfallByCell?: Map<string, number>
  /** Plafond sous lequel on pose (m) — contrainte technique. */
  ceilingHeightM: number
  /** Zones où la publicité est interdite (front boutique voisine, sécurité, etc.). */
  advertisingExclusionZones?: Array<[number, number][]>
  /** Positions existantes de signalétique (on vérifie la cohabitation). */
  existingPlacements?: GodModeSignagePlacement[]
  /** Campagnes actives (pour placer les panneaux publicitaires). */
  activeCampaigns?: AdvertisingCampaign[]
  /** Boutiques attractives (CA/m² élevé) pour placement "découverte". */
  attractiveSpaces?: Array<{ polygon: [number, number][]; attractivityScore: number }>
  /** Entrées du mall pour poser les plans "you are here". */
  entrances: Array<{ x: number; y: number; floorId: string; label: string }>
  /** Transits verticaux (escalators, ascenseurs) — panneaux directionnels. */
  verticalTransits?: Array<{ x: number; y: number; floorId: string; kind: string }>
  /** Boutiques occupées pour les enseignes de façade. */
  tenants?: Array<{ x: number; y: number; floorId: string; name: string; width: number }>
}

export interface AdvertisingCampaign {
  id: string
  advertiser: string
  title: string
  /** Catégorie de boutique (mode, tech…) — utilisée pour matcher les zones. */
  category: string
  priority: number   // 1..5, priorité d'affichage
  startDate: string
  endDate: string
  /** Nombre de panneaux demandés. */
  requestedPanels: number
  /** Budget CAPEX en FCFA. */
  budgetFcfa?: number
}

// ─── Règles de cohabitation ───────────────────────────────

/** Distances minimales (mètres) entre familles selon la configuration du mall. */
export const COHABITATION_RULES = {
  institutional_to_institutional: 3.5,   // 2 panneaux directionnels trop proches = confusion
  advertising_to_advertising:     6.0,   // 2 publicités trop proches = pollution visuelle
  institutional_to_advertising:   4.0,   // institutionnel doit primer — buffer clair
  near_emergency_exit:            8.0,   // aucune publicité à < 8m d'une sortie de secours
  near_entrance:                  3.0,   // premier panneau direction ≥ 3m de l'entrée
} as const

// ─── Table de décision dimensions ─────────────────────────

/** Formule spec signalétique : textHeight = readingDistance / 100 (en mm). */
function optimalTextHeightMm(readingDistanceM: number): number {
  // NF X 08-003 : h_text = d / 100 (mm) pour lisibilité standard
  return Math.max(10, Math.round(readingDistanceM * 10))
}

/**
 * Détermine les dimensions optimales d'un panneau en fonction de :
 *   • distance de lecture attendue
 *   • hauteur sous plafond (limite le format suspendu/totem haut)
 *   • flux piéton (plus le flux est dense, plus le panneau doit être grand)
 */
export function computeDimensions(
  readingDistanceM: number,
  ceilingM: number,
  flowDensity: number,     // 0..1
  support: SignageSupport,
  family: SignageFamily,
): SignageDimensions {
  const th = optimalTextHeightMm(readingDistanceM)

  // Hauteur texte → ratio de hauteur panneau : 1 ligne ≈ 1.4× hauteur texte
  const minPanelHeightM = (th / 1000) * 1.4 * 3  // 3 lignes utiles
  let heightM = Math.max(0.4, minPanelHeightM)

  // Largeur : ratio 2.5:1 par défaut
  let widthM = heightM * 2.5

  // Ajustement par support
  switch (support) {
    case 'totem-freestanding':
      heightM = Math.min(ceilingM - 0.5, 2.4 + flowDensity * 0.8) // 2.4 à 3.2 m
      widthM = 0.6 + flowDensity * 0.3 // pied plus large si flux dense
      return { heightM, widthM, depthM: 0.15, textHeightMm: th }

    case 'suspended':
      heightM = 0.6 + flowDensity * 0.4  // 0.6 à 1.0 m
      widthM = heightM * 3
      return { heightM, widthM, depthM: 0.08, textHeightMm: th }

    case 'wall-mounted':
      return { heightM, widthM, depthM: 0.05, textHeightMm: th }

    case 'led-screen':
      // Standard DOOH : 55"/65"/75" format 16:9 ou 9:16 vertical
      heightM = family === 'advertising' ? 1.8 : 1.4
      widthM = family === 'advertising' ? 1.0 : 0.8
      return { heightM, widthM, depthM: 0.2, textHeightMm: th }

    case 'backlit-panel':
      return { heightM, widthM, depthM: 0.08, textHeightMm: th }

    case 'floor-decal':
      return { heightM: 0.02, widthM: 1.5, depthM: 0, textHeightMm: th }

    case 'facade-sign':
      // Enseigne de façade : largeur boutique × 0.8, hauteur 0.5-0.8m
      return { heightM: 0.7, widthM: 3.0, depthM: 0.15, textHeightMm: th * 1.5 }

    case 'digital-kiosk':
      return { heightM: 1.7, widthM: 0.55, depthM: 0.25, textHeightMm: th }
  }
}

// ─── Moteur principal ─────────────────────────────────────

export interface GodModeResult {
  placements: GodModeSignagePlacement[]
  warnings: string[]
  summary: {
    institutionalCount: number
    advertisingCount: number
    totalConflicts: number
    avgVisibility: number
    rejectedCampaigns: string[]   // IDs des campagnes qui n'ont pas pu être placées
  }
}

/**
 * Produit un plan de signalétique complet (institutionnel + publicitaire).
 * Proph3t place automatiquement chaque panneau, détecte les conflits,
 * recommande les dimensions/supports.
 */
export function computeGodModeSignagePlan(input: GodModeInput): GodModeResult {
  const placements: GodModeSignagePlacement[] = []
  const warnings: string[] = []
  let nextId = 1
  const id = () => `god-${String(nextId++).padStart(4, '0')}`

  // ─── 1. Institutionnel — Entrées : "You are here" + directionnel ───
  for (const entrance of input.entrances) {
    const flow = getFlowAt(input.footfallByCell, entrance.x, entrance.y)
    const dims = computeDimensions(8, input.ceilingHeightM, flow, 'totem-freestanding', 'institutional')
    placements.push({
      id: id(),
      floorId: entrance.floorId,
      family: 'institutional',
      institutionalCategory: 'directional',
      support: 'totem-freestanding',
      dimensions: dims,
      x: entrance.x + 3, y: entrance.y + 3, // 3m de l'entrée
      orientationDeg: 0,
      poseHeightM: dims.heightM,
      content: `Plan du centre — « Vous êtes ici » (${entrance.label})`,
      maxReadingDistanceM: 8,
      expectedFootfall: flow * 300, // pax/h
      visibilityScore: 0.95,
      rationale: `Entrée principale « ${entrance.label} » : totem "You are here" à 3m de l'entrée, hauteur 2.4-3.2m pour visibilité depuis le hall. Texte ${dims.textHeightMm}mm pour lecture à 8m.`,
      conflicts: [],
      autoPlaced: true,
    })
  }

  // ─── 2. Institutionnel — Transits verticaux (escalators, ascenseurs) ───
  for (const transit of input.verticalTransits ?? []) {
    const flow = getFlowAt(input.footfallByCell, transit.x, transit.y)
    const dims = computeDimensions(5, input.ceilingHeightM, flow, 'suspended', 'institutional')
    placements.push({
      id: id(),
      floorId: transit.floorId,
      family: 'institutional',
      institutionalCategory: 'directional',
      support: 'suspended',
      dimensions: dims,
      x: transit.x, y: transit.y + 2,
      orientationDeg: 0,
      poseHeightM: input.ceilingHeightM - 0.3,
      content: `↑ ${transit.kind === 'escalator' ? 'Escalator' : transit.kind === 'elevator' ? 'Ascenseur' : 'Montée'} — niveau supérieur`,
      maxReadingDistanceM: 5,
      expectedFootfall: flow * 400,
      visibilityScore: 0.85,
      rationale: `${transit.kind} : panneau directionnel suspendu 2m avant, hauteur plafond -0.3m pour vision debout et en arrivée.`,
      conflicts: [],
      autoPlaced: true,
    })
  }

  // ─── 3. Institutionnel — Nœuds de décision du graphe ───
  if (input.navGraph) {
    const junctions = input.navGraph.nodes.filter(n => n.kind === 'junction')
    for (const j of junctions.slice(0, 20)) {  // max 20 jonctions
      // Éviter si déjà un panneau proche
      if (placements.some(p => Math.hypot(p.x - j.x, p.y - j.y) < COHABITATION_RULES.institutional_to_institutional)) {
        continue
      }
      const flow = getFlowAt(input.footfallByCell, j.x, j.y)
      if (flow < 0.3) continue  // skip les jonctions peu fréquentées
      const dims = computeDimensions(6, input.ceilingHeightM, flow, 'suspended', 'institutional')
      placements.push({
        id: id(),
        floorId: 'RDC',
        family: 'institutional',
        institutionalCategory: 'directional',
        support: 'suspended',
        dimensions: dims,
        x: j.x, y: j.y,
        orientationDeg: 0,
        poseHeightM: input.ceilingHeightM - 0.3,
        content: 'Directions ← → ↑',
        maxReadingDistanceM: 6,
        expectedFootfall: flow * 350,
        visibilityScore: 0.75,
        rationale: `Nœud de décision du graphe navigation (degré ${j.kind}). Flux estimé ${(flow * 350).toFixed(0)} pax/h.`,
        conflicts: [],
        autoPlaced: true,
      })
    }
  }

  // ─── 4. Publicitaire — Campagnes actives matchées aux zones ───
  const rejectedCampaigns: string[] = []
  for (const campaign of input.activeCampaigns ?? []) {
    const placed = placeCampaign(campaign, input, placements, warnings, id)
    if (placed === 0) rejectedCampaigns.push(campaign.id)
  }

  // ─── 5. Détection des conflits globaux ───
  const conflicts = detectConflicts(placements)
  let totalConflicts = 0
  for (const placement of placements) {
    placement.conflicts = conflicts.get(placement.id) ?? []
    totalConflicts += placement.conflicts.length
  }

  // ─── 6. Résumé ───
  const institutionalCount = placements.filter(p => p.family === 'institutional').length
  const advertisingCount = placements.filter(p => p.family === 'advertising').length
  const avgVisibility = placements.length > 0
    ? placements.reduce((s, p) => s + p.visibilityScore, 0) / placements.length
    : 0

  if (totalConflicts > 0) {
    warnings.push(`${totalConflicts} conflits de cohabitation détectés — revoir les positions concernées`)
  }

  return {
    placements, warnings,
    summary: {
      institutionalCount, advertisingCount, totalConflicts,
      avgVisibility, rejectedCampaigns,
    },
  }
}

// ─── Placement d'une campagne publicitaire ────────────────

function placeCampaign(
  campaign: AdvertisingCampaign,
  input: GodModeInput,
  placements: GodModeSignagePlacement[],
  warnings: string[],
  nextId: () => string,
): number {
  let placedCount = 0
  const matching = (input.attractiveSpaces ?? [])
    .filter(s => true) // Could filter by category matching later
    .sort((a, b) => b.attractivityScore - a.attractivityScore)

  for (const space of matching) {
    if (placedCount >= campaign.requestedPanels) break
    const centroid = polygonCentroid(space.polygon)

    // Vérifier zones d'exclusion pub
    if (isInAnyZone(centroid.x, centroid.y, input.advertisingExclusionZones ?? [])) continue

    // Distance aux sorties de secours
    const tooCloseToEmergency = (input.verticalTransits ?? []).some(t =>
      Math.hypot(t.x - centroid.x, t.y - centroid.y) < COHABITATION_RULES.near_emergency_exit
      && /evac|secours|exit/i.test(t.kind)
    )
    if (tooCloseToEmergency) continue

    // Distance aux autres pubs
    const tooCloseToOtherAd = placements.some(p =>
      p.family === 'advertising' &&
      Math.hypot(p.x - centroid.x, p.y - centroid.y) < COHABITATION_RULES.advertising_to_advertising,
    )
    if (tooCloseToOtherAd) continue

    // OK, placer
    const flow = getFlowAt(input.footfallByCell, centroid.x, centroid.y)
    const support: SignageSupport = campaign.priority >= 4 ? 'led-screen' : 'backlit-panel'
    const dims = computeDimensions(4, input.ceilingHeightM, flow, support, 'advertising')

    placements.push({
      id: nextId(),
      floorId: 'RDC',
      family: 'advertising',
      advertisingCategory: 'campaign',
      support, dimensions: dims,
      x: centroid.x, y: centroid.y,
      orientationDeg: 0,
      poseHeightM: 2.2,
      content: `${campaign.advertiser} — ${campaign.title}`,
      maxReadingDistanceM: 4,
      expectedFootfall: flow * 300,
      visibilityScore: 0.8 - placedCount * 0.05,
      rationale: `Campagne « ${campaign.title} » (${campaign.advertiser}, priorité ${campaign.priority}). Zone attractive (score ${space.attractivityScore.toFixed(2)}), flux ${(flow * 300).toFixed(0)} pax/h. Support ${support} pour impact visuel.`,
      conflicts: [],
      campaignId: campaign.id,
      autoPlaced: true,
    })
    placedCount++
  }

  if (placedCount < campaign.requestedPanels) {
    warnings.push(`Campagne ${campaign.title} : ${placedCount}/${campaign.requestedPanels} panneaux placés (zones compatibles insuffisantes)`)
  }
  return placedCount
}

// ─── Détection de conflits ────────────────────────────────

function detectConflicts(placements: GodModeSignagePlacement[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>()
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i], b = placements[j]
      if (a.floorId !== b.floorId) continue
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      let minDist = 0
      if (a.family === 'institutional' && b.family === 'institutional') {
        minDist = COHABITATION_RULES.institutional_to_institutional
      } else if (a.family === 'advertising' && b.family === 'advertising') {
        minDist = COHABITATION_RULES.advertising_to_advertising
      } else {
        minDist = COHABITATION_RULES.institutional_to_advertising
      }
      if (d < minDist) {
        addConflict(conflicts, a.id, `Trop proche de ${b.id} (${d.toFixed(1)}m < ${minDist}m)`)
        addConflict(conflicts, b.id, `Trop proche de ${a.id} (${d.toFixed(1)}m < ${minDist}m)`)
      }
    }
  }
  return conflicts
}

function addConflict(map: Map<string, string[]>, id: string, msg: string) {
  const arr = map.get(id) ?? []
  arr.push(msg)
  map.set(id, arr)
}

// ─── Utils ────────────────────────────────────────────────

function getFlowAt(
  map: Map<string, number> | undefined,
  x: number, y: number,
): number {
  if (!map) return 0.5  // défaut moyen si pas de données ABM
  const cellKey = `${Math.floor(x / 5)}_${Math.floor(y / 5)}`
  return map.get(cellKey) ?? 0.3
}

function polygonCentroid(poly: [number, number][]): { x: number; y: number } {
  let x = 0, y = 0
  for (const [px, py] of poly) { x += px; y += py }
  return { x: x / poly.length, y: y / poly.length }
}

function isInAnyZone(x: number, y: number, zones: Array<[number, number][]>): boolean {
  return zones.some(poly => pointInPolygon(x, y, poly))
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

// ─── Export JSON (nomenclature complète) ──────────────────

export interface SignagePlanExport {
  version: '1.0.0'
  generatedAt: string
  summary: GodModeResult['summary']
  placements: GodModeSignagePlacement[]
  cohabitationRules: typeof COHABITATION_RULES
}

export function exportSignagePlan(result: GodModeResult): SignagePlanExport {
  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    summary: result.summary,
    placements: result.placements,
    cohabitationRules: COHABITATION_RULES,
  }
}
