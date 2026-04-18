// ═══ VOL.4 WAYFINDER — BRIDGE ═══
//
// Pont entre les données existantes (ParsedPlan, Vol.1 spaces, Vol.3 graphe) et
// les structures utilisées par le Wayfinder.
//
// Aucune donnée mockée : tout est dérivé de ce que l'utilisateur a déjà importé
// ou de ce que les autres volumes exposent dans leur store Zustand.

import type { ParsedPlan } from '../../shared/planReader/planEngineTypes'
import type { DetectedSpace } from '../../shared/planReader/planEngineTypes'
import type { NavGraph } from '../../shared/engines/plan-analysis/navGraphEngine'
import { buildNavGraph } from '../../shared/engines/plan-analysis/navGraphEngine'
import { computeSkeleton } from '../../shared/engines/plan-analysis/skeletonEngine'
import type { SearchableItem } from './searchEngine'

// ─── Construction du graphe depuis un ParsedPlan ────────

export interface BuildWayfinderGraphInput {
  parsedPlan: ParsedPlan
  /** Statut commercial par spaceId (Vol.1). */
  statusBySpaceId?: Map<string, 'open' | 'closed' | 'vacant' | 'works'>
  /** Attractivité par space (0..1) : normalement dérivée du CA/m² Vol.1. */
  attractivityBySpaceId?: Map<string, number>
}

export interface WayfinderGraphResult {
  graph: NavGraph
  /** Référentiel spaceId → anchorNodeId (utile pour rechercher le nœud d'une boutique). */
  anchorByRefId: Map<string, string>
  /** Bounds du plan pour le rendu. */
  planBounds: { width: number; height: number }
}

/**
 * Construit un graphe de navigation prêt pour le Wayfinder à partir d'un
 * ParsedPlan. Réutilise le skeletonEngine + navGraphEngine déjà présents
 * dans /shared/proph3t.
 */
export function buildWayfinderGraph(input: BuildWayfinderGraphInput): WayfinderGraphResult {
  const { parsedPlan, statusBySpaceId, attractivityBySpaceId } = input

  // 1. Construire le squelette des couloirs à partir des polygones franchissables.
  //    On considère comme "circulable" l'union des espaces non-occupés (couloirs,
  //    mails, halls) détectés par le planReader (type ≠ 'tenant').
  const walkablePolygons: Array<Array<[number, number]>> = []
  for (const s of parsedPlan.spaces) {
    const hay = (s.label + ' ' + (s.type ?? '')).toLowerCase()
    if (/couloir|mail|hall|circul|promenade|allee|allée/.test(hay)) {
      walkablePolygons.push(s.polygon)
    } else if (!/boutique|tenant|cellule|local/.test(hay) && s.areaSqm > 30) {
      walkablePolygons.push(s.polygon)
    }
  }
  // Fallback : si rien n'a été détecté comme circulable, on prend tous les spaces
  // (meilleur que rien pour produire un graphe exploitable).
  if (walkablePolygons.length === 0) {
    for (const s of parsedPlan.spaces) walkablePolygons.push(s.polygon)
  }
  const skeleton = computeSkeleton({
    walkablePolygons,
    pixelsPerMeter: 4,     // compromis : perf vs précision sur plan < 500×500 px
    closingRadius: 2,
  })

  // 2. Ancres : entrées/sorties + spaces occupés (ouverts)
  const anchors: Parameters<typeof buildNavGraph>[0]['anchors'] = []
  for (const s of parsedPlan.spaces) {
    const status = statusBySpaceId?.get(s.id)
    // On exclut les vacants pour ne pas pointer vers des locaux non-existants
    if (status === 'vacant' || status === 'works') continue
    const kind: 'entrance' | 'exit' | 'transit' =
      /entr[eé]e|entrance/i.test(s.label) ? 'entrance'
      : /sortie|exit/i.test(s.label) ? 'exit'
      : /escalat|ascenseur|lift|elevator|ramp|stair|escal/i.test(s.label) ? 'transit'
      : 'entrance' // par défaut, boutique = point d'accès

    const centroid = polygonCentroid(s.polygon)
    anchors.push({
      id: s.id,
      x: centroid[0], y: centroid[1],
      label: s.label,
      kind,
      refId: s.id,
    })
  }

  // 3. Spaces attractifs (boutiques fortes CA/m²)
  const attractiveSpaces: Parameters<typeof buildNavGraph>[0]['attractiveSpaces'] = []
  if (attractivityBySpaceId) {
    for (const s of parsedPlan.spaces) {
      const score = attractivityBySpaceId.get(s.id)
      if (score != null && score > 0) {
        attractiveSpaces.push({ polygon: s.polygon, attractivityScore: score })
      }
    }
  }

  const graph = buildNavGraph({ skeleton, anchors, attractiveSpaces })

  // 4. Mapping refId → anchorNodeId
  const anchorByRefId = new Map<string, string>()
  for (const n of graph.nodes) {
    if (n.refId) anchorByRefId.set(n.refId, n.id)
  }

  return {
    graph,
    anchorByRefId,
    planBounds: {
      width: parsedPlan.bounds.width,
      height: parsedPlan.bounds.height,
    },
  }
}

// ─── Catalogue : ParsedPlan + Vol.1 → SearchableItem[] ──

export interface BuildCatalogInput {
  parsedPlan: ParsedPlan
  /** Tenants enrichis depuis Vol.1 (nom enseigne, catégorie, horaires). */
  tenantsBySpaceId?: Map<string, {
    name: string
    category: string
    tags?: string[]
    hours?: string
    reference?: string
    status: 'open' | 'closed' | 'vacant' | 'works'
  }>
  /** Libellés humains des étages. */
  floorLabels?: Map<string, string>
}

export function buildWayfinderCatalog(input: BuildCatalogInput): SearchableItem[] {
  const { parsedPlan, tenantsBySpaceId, floorLabels } = input
  const items: SearchableItem[] = []

  for (const s of parsedPlan.spaces) {
    const centroid = polygonCentroid(s.polygon)
    const tenant = tenantsBySpaceId?.get(s.id)
    const floorId = s.floorId ?? 'RDC'
    const floorLabel = floorLabels?.get(floorId) ?? floorId

    items.push({
      id: s.id,
      label: tenant?.name ?? s.label,
      category: tenant?.category ?? categorizeSpace(s),
      tags: tenant?.tags ?? defaultTags(s),
      reference: tenant?.reference,
      floorId,
      floorLabel,
      x: centroid[0],
      y: centroid[1],
      hours: tenant?.hours,
      status: tenant?.status ?? spaceStatus(s),
      icon: tenant?.category ? undefined : iconForSpace(s),
    })
  }
  return items
}

function polygonCentroid(poly: [number, number][]): [number, number] {
  if (poly.length === 0) return [0, 0]
  let x = 0, y = 0
  for (const [px, py] of poly) { x += px; y += py }
  return [x / poly.length, y / poly.length]
}

function categorizeSpace(s: DetectedSpace): string {
  const hay = (s.label + ' ' + s.type).toLowerCase()
  if (/resto|restaurant|food|snack|caf[eé]/.test(hay)) return 'restauration'
  if (/mode|textile|vêtement|habillement|chaussure/.test(hay)) return 'mode'
  if (/cin[eé]|loisir|jeu|enfant/.test(hay)) return 'loisirs'
  if (/pharmac|sant[eé]|m[eé]dica/.test(hay)) return 'sante'
  if (/tech|electro|informatique|phone/.test(hay)) return 'tech'
  if (/sanitai|toilet|wc/.test(hay)) return 'sanitaires'
  if (/parking|garage/.test(hay)) return 'parking'
  if (/escalat|ascenseur|lift|elevator|ramp|stair/.test(hay)) return 'transit'
  if (/entr[eé]e|sortie|exit/.test(hay)) return 'acces'
  return 'autre'
}

function defaultTags(s: DetectedSpace): string[] {
  const out: string[] = []
  if (s.type) out.push(s.type)
  if (s.layer) out.push(s.layer)
  return out
}

function spaceStatus(s: DetectedSpace): 'open' | 'closed' | 'vacant' | 'works' {
  const hay = (s.label + ' ' + s.type).toLowerCase()
  if (/vacant|libre|disponible/.test(hay)) return 'vacant'
  if (/travaux|works|chantier/.test(hay)) return 'works'
  return 'open'
}

function iconForSpace(s: DetectedSpace): string {
  const hay = (s.label + ' ' + s.type).toLowerCase()
  if (/toilet|sanitai|wc/.test(hay)) return '🚻'
  if (/escalat/.test(hay)) return '🪜'
  if (/ascenseur|lift|elevator/.test(hay)) return '🛗'
  if (/entr[eé]e|entrance/.test(hay)) return '🚪'
  if (/parking/.test(hay)) return '🅿️'
  return '📍'
}

// ─── Nœud le plus proche d'une position (fallback si pas d'ancre) ──

export function nearestGraphNode(
  graph: NavGraph,
  x: number,
  y: number,
): string | null {
  if (graph.nodes.length === 0) return null
  let best: string | null = null
  let bestD = Infinity
  for (const n of graph.nodes) {
    const d = Math.hypot(n.x - x, n.y - y)
    if (d < bestD) { bestD = d; best = n.id }
  }
  return best
}
