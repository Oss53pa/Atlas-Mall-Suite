// ═══ AUTO-POPULATE — Génère des instances décoratives ═══
//
// À partir des SpatialEntity métier (parking, green_area), génère des
// instances décoratives (CAR_INSTANCE, TREE_PALM, SHRUB) pour atteindre
// un rendu photo-réaliste façon plan d'archi.
//
// Pure : ne modifie pas les entrées. Renvoie un nouveau tableau d'instances
// à concaténer aux entités source pour le rendu.

import type { SpatialEntity, Polygon } from '../domain/SpatialEntity'
import { isPolygon } from '../domain/SpatialEntity'
import { CoreEntityType } from '../domain/EntityType'
import { getEntityMetadata } from '../domain/EntityTypeMetadata'

// ─── PRNG déterministe (basé sur l'ID) ────────────────────

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ─── Helpers géométriques ─────────────────────────────────

function polyBounds(p: Polygon): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pt of p.outer) {
    if (pt.x < minX) minX = pt.x
    if (pt.y < minY) minY = pt.y
    if (pt.x > maxX) maxX = pt.x
    if (pt.y > maxY) maxY = pt.y
  }
  return { minX, minY, maxX, maxY }
}

function polyArea(p: Polygon): number {
  const pts = p.outer
  if (pts.length < 3) return 0
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(s) / 2
}

function pointInPolygon(x: number, y: number, p: Polygon): boolean {
  let inside = false
  const pts = p.outer
  const n = pts.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x, yi = pts[i].y
    const xj = pts[j].x, yj = pts[j].y
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

// ─── Auto-population ──────────────────────────────────────

export interface AutoPopulateOptions {
  /** Probabilité d'occupation d'une place de parking [0..1]. Défaut 0.55. */
  readonly parkingFillRate?: number
  /** Espacement min entre arbres en m. Défaut 8. */
  readonly treeSpacingM?: number
  /** Maximum d'instances ajoutées (sécurité perf). Défaut 800. */
  readonly maxInstances?: number
}

const DEFAULTS = {
  parkingFillRate: 0.55,
  treeSpacingM: 8,
  maxInstances: 800,
}

/**
 * Génère des instances décoratives. À concaténer aux entités source
 * avant rendu : `<SceneRenderer entities={[...source, ...autoPopulate(source)]} />`.
 */
export function autoPopulate(
  entities: ReadonlyArray<SpatialEntity>,
  options: AutoPopulateOptions = {},
): SpatialEntity[] {
  const opts = { ...DEFAULTS, ...options }
  const out: SpatialEntity[] = []
  const rand = lcg(hashStr(entities.map(e => e.id).join('|')))

  const carMeta = getEntityMetadata(CoreEntityType.CAR_INSTANCE)
  const palmMeta = getEntityMetadata(CoreEntityType.TREE_PALM)
  const treeMeta = getEntityMetadata(CoreEntityType.TREE_DECIDUOUS)
  const shrubMeta = getEntityMetadata(CoreEntityType.SHRUB)

  let count = 0
  const limit = opts.maxInstances

  for (const e of entities) {
    if (count >= limit) break
    const t = String(e.type).toLowerCase()

    // ─── Voiture sur place de parking (point ou rectangle) ──
    if (
      (t === 'parking_place_standard' || t === 'parking_place_pmr' ||
       t === 'parking_place_ve' || t === 'parking_place_famille' ||
       t === 'parking_space') &&
      isPolygon(e.geometry)
    ) {
      if (rand() < opts.parkingFillRate) {
        const b = polyBounds(e.geometry)
        const cx = (b.minX + b.maxX) / 2
        const cy = (b.minY + b.maxY) / 2
        out.push({
          id: `car-${e.id}`,
          projectId: e.projectId,
          type: CoreEntityType.CAR_INSTANCE,
          level: e.level,
          geometry: { point: { x: cx, y: cy } },
          extrusion: { ...carMeta.defaultExtrusion },
          material: carMeta.defaultMaterial,
          snapBehavior: 'none',
          mergeWithNeighbors: false,
          childrenIds: [],
          customProperties: { autoPopulated: true, basedOn: e.id },
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          createdBy: 'auto-populate',
          isAutoCorrected: false,
          correctionAuditTrail: [],
        })
        count++
      }
    }

    // ─── Arbres dans GREEN_AREA / GARDEN_BED / TERRE_PLEIN ──
    const isGreen = t === 'green_area' || t === 'garden_bed' || t === 'terre_plein' ||
                    t === 'jardin' || t === 'pelouse' || t === 'espace_vert' ||
                    t === 'massif_vegetal' || t === 'plantation'
    if (isGreen && isPolygon(e.geometry)) {
      const b = polyBounds(e.geometry)
      const area = polyArea(e.geometry)
      if (area < 4) continue
      const spacing = opts.treeSpacingM
      const w = b.maxX - b.minX
      const h = b.maxY - b.minY
      const cols = Math.max(1, Math.floor(w / spacing))
      const rows = Math.max(1, Math.floor(h / spacing))
      for (let i = 0; i < cols && count < limit; i++) {
        for (let j = 0; j < rows && count < limit; j++) {
          // Jitter pseudo-aléatoire pour éviter la grille parfaite
          const jx = (rand() - 0.5) * spacing * 0.4
          const jy = (rand() - 0.5) * spacing * 0.4
          const px = b.minX + (i + 0.5) * (w / cols) + jx
          const py = b.minY + (j + 0.5) * (h / rows) + jy
          if (!pointInPolygon(px, py, e.geometry)) continue
          // Mix palmiers / feuillus / arbustes
          const r = rand()
          let entityType: string = CoreEntityType.TREE_DECIDUOUS
          let meta = treeMeta
          if (r < 0.25) { entityType = CoreEntityType.TREE_PALM; meta = palmMeta }
          else if (r > 0.75) { entityType = CoreEntityType.SHRUB; meta = shrubMeta }
          out.push({
            id: `tree-${e.id}-${i}-${j}`,
            projectId: e.projectId,
            type: entityType,
            level: e.level,
            geometry: { point: { x: px, y: py } },
            extrusion: { ...meta.defaultExtrusion },
            material: meta.defaultMaterial,
            snapBehavior: 'none',
            mergeWithNeighbors: false,
            childrenIds: [],
            customProperties: { autoPopulated: true, basedOn: e.id },
            createdAt: e.createdAt,
            updatedAt: e.updatedAt,
            createdBy: 'auto-populate',
            isAutoCorrected: false,
            correctionAuditTrail: [],
          })
          count++
        }
      }
    }
  }

  return out
}
