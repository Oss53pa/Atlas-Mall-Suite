// ═══ COHERENCE ENGINE — Corrections géométriques Proph3t ═══
//
// Applique des corrections "intelligentes" au plan modélisé pour gommer
// les imperfections du traçage utilisateur tout en conservant la
// cohérence :
//
//   • Unification des espaces de même type qui se touchent (parking,
//     circulations véhicules, couloirs) → un réseau continu au lieu de
//     cadres empilés avec délimitations artificielles.
//   • Alignement doux des polygones adjacents (snap des coins proches).
//
// Principe : on retourne un NOUVEAU plan ; l'original reste intact
// pour l'édition. L'UI affiche la version "corrigée" en lecture seule.

import type { ParsedPlan, DetectedSpace, Bounds } from '../../planReader/planEngineTypes'
import { unionPolygons } from './spaceGeometryEngine'

// ─── Types qui doivent être fusionnés quand adjacents ────

/** Groupes de types où la fusion géométrique fait sens :
 *  un "parking" coupé en 3 cases adjacentes = en réalité 1 parking. */
const MERGEABLE_GROUPS: Array<{ id: string; match: RegExp; label: string }> = [
  { id: 'parking-veh',  match: /parking|voie_circulation|circulation_vehicule/i, label: 'Réseau parking/véhicules' },
  { id: 'circulation',  match: /^circulation$|couloir|galerie|mail|atrium|promenade/i, label: 'Circulation piétonne' },
  { id: 'pedestrian',   match: /trottoir|parvis|pedestrian/i, label: 'Espaces piétons' },
  { id: 'green',        match: /espace_vert|pelouse|jardin|plantation/i, label: 'Espaces verts' },
]

/** Trouve le groupe fusionnable auquel appartient un type. */
function findMergeGroup(type: string): string | null {
  for (const g of MERGEABLE_GROUPS) {
    if (g.match.test(type)) return g.id
  }
  return null
}

// ─── Test d'adjacence géométrique ─────────────────────────

/** Deux espaces sont "adjacents" si leurs bounding boxes se chevauchent
 *  ou sont très proches (≤ toleranceM). Approximation suffisante avant
 *  de tenter l'union polygonale coûteuse. */
function bboxNear(a: Bounds, b: Bounds, toleranceM: number): boolean {
  return !(
    a.maxX < b.minX - toleranceM ||
    b.maxX < a.minX - toleranceM ||
    a.maxY < b.minY - toleranceM ||
    b.maxY < a.minY - toleranceM
  )
}

/** Construit les composantes connexes : un ensemble de spaces tels que
 *  chacun est adjacent à au moins un autre du même groupe. */
function buildComponents(
  spaces: DetectedSpace[],
  toleranceM: number,
): number[][] {
  const n = spaces.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] }
    return x
  }
  const union = (a: number, b: number): void => {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (bboxNear(spaces[i].bounds, spaces[j].bounds, toleranceM)) {
        union(i, j)
      }
    }
  }
  const groups = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const r = find(i)
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r)!.push(i)
  }
  return Array.from(groups.values()).filter(g => g.length >= 2)
}

// ─── Unification ─────────────────────────────────────────

/** Fusionne les bounds d'un ensemble de spaces. */
function mergeBounds(spaces: DetectedSpace[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const s of spaces) {
    if (s.bounds.minX < minX) minX = s.bounds.minX
    if (s.bounds.minY < minY) minY = s.bounds.minY
    if (s.bounds.maxX > maxX) maxX = s.bounds.maxX
    if (s.bounds.maxY > maxY) maxY = s.bounds.maxY
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX, height: maxY - minY,
    centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2,
  } as Bounds
}

// ─── API ─────────────────────────────────────────────────

export interface CoherenceOptions {
  /** Tolérance d'adjacence en mètres (défaut 0.5 m). */
  adjacencyTolM?: number
  /** Active la fusion des polygones adjacents (défaut true). */
  mergeAdjacent?: boolean
}

export interface CoherenceResult {
  /** Plan avec les corrections appliquées. */
  plan: ParsedPlan
  /** Nombre de groupes fusionnés. */
  mergedGroups: number
  /** Nombre total de spaces absorbés par les fusions. */
  absorbedSpaces: number
  /** Liste des corrections effectuées (pour audit). */
  corrections: Array<{ groupId: string; label: string; count: number }>
}

/**
 * Applique les corrections de cohérence au plan.
 * N'altère jamais le plan d'entrée (retourne une copie).
 */
export function applyCoherenceCorrections(
  plan: ParsedPlan,
  options: CoherenceOptions = {},
): CoherenceResult {
  const { adjacencyTolM = 0.5, mergeAdjacent = true } = options

  if (!mergeAdjacent || plan.spaces.length === 0) {
    return { plan, mergedGroups: 0, absorbedSpaces: 0, corrections: [] }
  }

  // Grouper par type de fusion
  const byGroup = new Map<string, DetectedSpace[]>()
  const untouched: DetectedSpace[] = []
  for (const s of plan.spaces) {
    const g = findMergeGroup(String(s.type))
    if (g) {
      if (!byGroup.has(g)) byGroup.set(g, [])
      byGroup.get(g)!.push(s)
    } else {
      untouched.push(s)
    }
  }

  const newSpaces: DetectedSpace[] = [...untouched]
  let mergedGroups = 0
  let absorbed = 0
  const corrections: CoherenceResult['corrections'] = []

  for (const [groupId, members] of byGroup.entries()) {
    if (members.length < 2) {
      newSpaces.push(...members)
      continue
    }
    // Trouve composantes connexes adjacentes dans ce groupe
    const components = buildComponents(members, adjacencyTolM)
    const absorbedIdx = new Set<number>()
    for (const comp of components) {
      if (comp.length < 2) continue
      const compSpaces = comp.map(i => members[i])
      const polygons = compSpaces.map(s => s.polygon.map(([x, y]) => ({ x, y })))
      let unioned: Array<Array<{ x: number; y: number }>> = []
      try {
        unioned = unionPolygons(polygons, 20)
      } catch {
        unioned = []
      }
      if (unioned.length === 0) continue
      // Prend le plus grand polygone résultant (union principale)
      const mainPoly = unioned.reduce((max, p) => p.length > max.length ? p : max, unioned[0])
      if (mainPoly.length < 3) continue

      const firstMember = compSpaces[0]
      const mergedLabel = firstMember.label || MERGEABLE_GROUPS.find(g => g.id === groupId)?.label || 'Fusion'
      const mergedSpace: DetectedSpace = {
        id: `merged-${groupId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        polygon: mainPoly.map(p => [p.x, p.y] as [number, number]),
        areaSqm: compSpaces.reduce((sum, s) => sum + s.areaSqm, 0),
        label: mergedLabel,
        layer: 'coherence-merged',
        type: firstMember.type,
        bounds: mergeBounds(compSpaces),
        color: firstMember.color,
        metadata: {
          ...firstMember.metadata,
          mergedFrom: compSpaces.map(s => s.id),
          mergedCount: compSpaces.length,
          autoMerged: true,
        },
        floorId: firstMember.floorId,
      }
      newSpaces.push(mergedSpace)
      comp.forEach(i => absorbedIdx.add(i))
      mergedGroups++
      absorbed += compSpaces.length
      corrections.push({
        groupId,
        label: MERGEABLE_GROUPS.find(g => g.id === groupId)?.label ?? groupId,
        count: compSpaces.length,
      })
    }
    // Ré-ajoute les membres isolés non fusionnés
    members.forEach((m, i) => {
      if (!absorbedIdx.has(i)) newSpaces.push(m)
    })
  }

  return {
    plan: { ...plan, spaces: newSpaces },
    mergedGroups,
    absorbedSpaces: absorbed,
    corrections,
  }
}
