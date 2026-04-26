// ═══ TRIM OVERLAPS — Soustraction booléenne entre polygones voisins ═══
//
// Pour chaque polygone, on soustrait l'union de ses voisins de PRIORITÉ
// SUPÉRIEURE pour empêcher tout débordement visuel. Résultat : aucun
// polygone ne mord sur un autre, ils se touchent au max bord à bord.
//
// Priorités (du plus prioritaire au moins) :
//   1. wall_structural / wall_partition (structure du bâtiment)
//   2. sanitaire / vestiaire (locaux fixes)
//   3. boutique / commerce (locataires)
//   4. circulation / mall / galerie / atrium / promenade
//   5. parking / voirie / route (extérieur)
//   6. terre_plein / jardin / espace_vert (paysage)
//   7. autres
//
// Algorithme :
//   - Pour chaque polygone P de priorité N
//   - Trouver tous les voisins de priorité < N (donc plus importants)
//     dont la bbox chevauche celle de P
//   - Construire l'union de leurs polygones
//   - Faire P = difference(P, union(voisins))
//
// Convention : tout en MÈTRES FLOAT (compat EditableSpace).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import polygonClipping from 'polygon-clipping'

export type PointM = { readonly x: number; readonly y: number }
export type PolygonM = ReadonlyArray<PointM>

export interface TrimableEntity {
  readonly id: string
  readonly type: string
  readonly polygon: PolygonM
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

// ─── Priorités par type ───────────────────────────────────

/** Plus le score est BAS, plus l'entité est prioritaire (garde sa forme). */
function priorityScore(type: string): number {
  const t = (type ?? '').toLowerCase()
  // 1. Murs structurels
  if (t.startsWith('wall_') || t === 'mur') return 1
  // 2. Sanitaires / vestiaires / techniques
  if (t === 'sanitaires' || t === 'sanitaire' || t === 'wc' ||
      t.includes('vestiaire') || t.startsWith('local_')) return 2
  // 3. Boutiques / commerces / restaurants / services
  if (t === 'boutique_boundary' || t.startsWith('commerce') ||
      t === 'local_commerce' || t === 'big_box' || t === 'restaurant' ||
      t === 'restauration' || t === 'food_court' || t === 'cinema_multiplex' ||
      t === 'hotel' || t.startsWith('bureau_') || t.startsWith('atm') ||
      t === 'kiosque') return 3
  // 4. Circulations intérieures (mail/galerie/atrium)
  if (t === 'mail_central' || t === 'mail_secondaire' || t === 'atrium' ||
      t === 'galerie' || t === 'promenade' || t === 'circulation' ||
      t === 'couloir' || t === 'couloir_secondaire' || t === 'hall_distribution' ||
      t === 'pedestrian_path') return 4
  // 5. Voiries et marquages sol
  if (t.startsWith('parking') || t.startsWith('voie_') || t.startsWith('route_') ||
      t === 'voirie' || t === 'asphalte' || t === 'rond_point' || t === 'carrefour' ||
      t === 'passage_pieton' || t === 'parking_space' || t === 'vehicle_road' ||
      t.startsWith('acces_site_')) return 5
  // 6. Paysage / espaces verts
  if (t === 'terre_plein' || t === 'jardin' || t === 'pelouse' ||
      t === 'espace_vert' || t === 'plantation' || t === 'massif_vegetal' ||
      t === 'green_area' || t === 'haie' || t.startsWith('exterieur_')) return 6
  // 7. Autres
  return 7
}

// ─── BBox helpers ─────────────────────────────────────────

function bboxOverlaps(a: TrimableEntity['bounds'], b: TrimableEntity['bounds']): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
}

function polygonToClipping(poly: PolygonM): number[][][] {
  // polygon-clipping format : [outer ring]
  return [poly.map(p => [p.x, p.y])]
}

function clippingToPolygons(result: number[][][][]): PolygonM[] {
  // result format : [polygon1, polygon2, ...]
  // chaque polygon = [outer, hole1, hole2, ...]
  // on garde uniquement l'outer de chaque polygon (drop trous pour rc.1)
  return result.map(poly => poly[0].map(([x, y]) => ({ x, y })))
}

// ─── API publique ─────────────────────────────────────────

export interface TrimResult {
  readonly trimmed: PolygonM
  /** true si le polygone a été modifié par la soustraction. */
  readonly changed: boolean
  /** true si le polygone a été complètement absorbé (aire ≈ 0). À supprimer si oui. */
  readonly absorbed: boolean
}

/**
 * Soustrait les voisins prioritaires d'un polygone. Si l'aire résultante
 * < 5% de l'originale, on considère le polygone absorbé (à supprimer).
 */
export function trimAgainstNeighbors(
  entity: TrimableEntity,
  neighbors: ReadonlyArray<TrimableEntity>,
): TrimResult {
  const priorityNeighbors = neighbors.filter(n => {
    if (n.id === entity.id) return false
    if (priorityScore(n.type) >= priorityScore(entity.type)) return false
    return bboxOverlaps(entity.bounds, n.bounds)
  })

  if (priorityNeighbors.length === 0) {
    return { trimmed: entity.polygon, changed: false, absorbed: false }
  }

  try {
    const target = polygonToClipping(entity.polygon)
    // Union de tous les voisins prioritaires
    const others = priorityNeighbors.map(n => polygonToClipping(n.polygon))
    if (others.length === 0) {
      return { trimmed: entity.polygon, changed: false, absorbed: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unionResult = polygonClipping.union(...(others as any))
    if (unionResult.length === 0) {
      return { trimmed: entity.polygon, changed: false, absorbed: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const diff = polygonClipping.difference(target as any, unionResult as any)
    if (diff.length === 0) {
      return { trimmed: [], changed: true, absorbed: true }
    }
    const polys = clippingToPolygons(diff)
    // On garde le plus grand des résultats (en cas d'éclatement)
    const main = polys.reduce((max, p) => (polyArea(p) > polyArea(max) ? p : max), polys[0])
    if (main.length < 3) {
      return { trimmed: entity.polygon, changed: false, absorbed: false }
    }
    const originalArea = polyArea(entity.polygon)
    const newArea = polyArea(main)
    if (originalArea > 0 && newArea / originalArea < 0.05) {
      return { trimmed: [], changed: true, absorbed: true }
    }
    return { trimmed: main, changed: true, absorbed: false }
  } catch {
    // polygon-clipping peut throw sur des inputs dégénérés → on conserve l'original
    return { trimmed: entity.polygon, changed: false, absorbed: false }
  }
}

function polyArea(poly: PolygonM): number {
  if (poly.length < 3) return 0
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y
  }
  return Math.abs(s) / 2
}

/**
 * Pipeline batch : trim chaque entité contre ses voisins plus prioritaires.
 * Retourne un nouveau tableau (immutable). Ordre original préservé.
 */
export function trimOverlapsBatch(
  entities: ReadonlyArray<TrimableEntity>,
): TrimableEntity[] {
  return entities.flatMap(e => {
    const result = trimAgainstNeighbors(e, entities)
    if (result.absorbed) return [] // entité absorbée → on la retire
    if (!result.changed) return [e]
    // Recalcule bounds après trim
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of result.trimmed) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return [{ ...e, polygon: result.trimmed, bounds: { minX, minY, maxX, maxY } }]
  })
}
