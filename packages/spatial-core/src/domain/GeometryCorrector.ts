// ═══ GEOMETRY CORRECTOR — Pipeline 6 étapes ═══
//
// Corrige les imperfections géométriques d'un polygone/polyline tracé à
// main levée. Pipeline ordonné — l'ordre est critique :
//
//   1. straightenWalls       — angles quasi-droits → 90°
//   2. snapEndpoints         — extrémités proches d'autres entités → snappées
//   3. alignParallelWalls    — segments quasi-parallèles → alignés
//   4. trimOverlaps          — chevauchements avec voisins → trim
//   5. closePolygons         — premier/dernier sommet quasi-identiques → fermeture
//   6. unionMergeAdjacent    — fusion booléenne avec entités même type adjacentes
//
// Trois configs : RC0_AGGRESSIVE / PRECISION / MIGRATION (cf spec).

import type { SpatialEntity, Point2D, SpatialGeometry, CorrectionAction } from './SpatialEntity'
import { isPolygon, isPolyline, nowIso } from './SpatialEntity'

// ─── Configuration ────────────────────────────────────────

export interface CorrectionConfig {
  /** Angle déviation max pour redresser à 90° (degrés). */
  readonly straightenAngleToleranceDeg: number
  /** Distance max pour snap d'endpoint sur sommet/arête voisine (m). */
  readonly endpointSnapDistanceM: number
  /** Distance max pour considérer deux segments comme parallèles à aligner (m). */
  readonly parallelAlignDistanceM: number
  /** Drift max accepté lors d'un alignement parallèle (m). */
  readonly parallelDriftMaxM: number
  /** Gap max premier↔dernier sommet pour fermer un polygone (m). */
  readonly polygonClosureGapM: number
  /** Active le trim des chevauchements. */
  readonly overlapTrimEnabled: boolean
  /** Active la fusion union avec voisins même type. */
  readonly unionMergeAdjacentEnabled: boolean
}

export const RC0_AGGRESSIVE_CONFIG: CorrectionConfig = {
  straightenAngleToleranceDeg: 5,
  endpointSnapDistanceM: 0.8,
  parallelAlignDistanceM: 0.3,
  parallelDriftMaxM: 1.0,
  polygonClosureGapM: 1.0,
  overlapTrimEnabled: true,
  unionMergeAdjacentEnabled: true,
}

export const PRECISION_CONFIG: CorrectionConfig = {
  straightenAngleToleranceDeg: 1,
  endpointSnapDistanceM: 0.1,
  parallelAlignDistanceM: 0.05,
  parallelDriftMaxM: 0.15,
  polygonClosureGapM: 0.1,
  overlapTrimEnabled: true,
  unionMergeAdjacentEnabled: false,
}

export const MIGRATION_CONFIG: CorrectionConfig = {
  straightenAngleToleranceDeg: 3,
  endpointSnapDistanceM: 0.5,
  parallelAlignDistanceM: 0.2,
  parallelDriftMaxM: 0.6,
  polygonClosureGapM: 0.5,
  overlapTrimEnabled: true,
  unionMergeAdjacentEnabled: false,
}

// ─── Corrector ────────────────────────────────────────────

export class GeometryCorrector {
  constructor(private readonly config: CorrectionConfig) {}

  /**
   * Applique le pipeline complet à une entité. Retourne une NOUVELLE
   * entité (immutabilité — `correctionAuditTrail` enrichi).
   *
   * @param entity   l'entité à corriger
   * @param context  les autres entités du même level (voisins potentiels)
   */
  correctEntity(entity: SpatialEntity, context: ReadonlyArray<SpatialEntity>): SpatialEntity {
    const trail: CorrectionAction[] = [...entity.correctionAuditTrail]
    let geometry = entity.geometry

    // 1. Redresse les segments quasi-orthogonaux
    if (isPolygon(geometry) || isPolyline(geometry)) {
      const before = geometry
      geometry = this.straightenWalls(geometry)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'straighten',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: { toleranceDeg: this.config.straightenAngleToleranceDeg },
        })
      }
    }

    // 2. Snap des endpoints sur sommets/arêtes voisines
    {
      const before = geometry
      geometry = this.snapEndpoints(geometry, context)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'snap_endpoint',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: { snapDistanceM: this.config.endpointSnapDistanceM },
        })
      }
    }

    // 3. Aligne les segments parallèles
    if (isPolygon(geometry) || isPolyline(geometry)) {
      const before = geometry
      geometry = this.alignParallelWalls(geometry, context)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'align_parallel',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: {
            alignDistanceM: this.config.parallelAlignDistanceM,
            driftMaxM: this.config.parallelDriftMaxM,
          },
        })
      }
    }

    // 4. Trim des chevauchements
    if (this.config.overlapTrimEnabled && isPolygon(geometry)) {
      const before = geometry
      geometry = this.trimOverlaps(geometry, context)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'trim_overlap',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: {},
        })
      }
    }

    // 5. Fermeture de polygone
    if (isPolygon(geometry)) {
      const before = geometry
      geometry = this.closePolygon(geometry)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'close_polygon',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: { gapM: this.config.polygonClosureGapM },
        })
      }
    }

    // 6. Fusion booléenne avec voisins même type
    if (this.config.unionMergeAdjacentEnabled && isPolygon(geometry) && entity.mergeWithNeighbors) {
      const before = geometry
      geometry = this.unionMergeAdjacent(geometry, entity.type, context)
      if (!geomEqual(before, geometry)) {
        trail.push({
          timestamp: nowIso(), action: 'merge_union',
          beforeGeometry: before, afterGeometry: geometry,
          parameters: {},
        })
      }
    }

    return {
      ...entity,
      geometry,
      isAutoCorrected: trail.length > entity.correctionAuditTrail.length,
      correctionAuditTrail: trail,
      updatedAt: nowIso(),
    }
  }

  // ─── 1. Straighten ────────────────────────────────────

  private straightenWalls<G extends SpatialGeometry>(geom: G): G {
    if (!isPolygon(geom) && !isPolyline(geom)) return geom
    const points = isPolygon(geom) ? geom.outer : geom.points
    const n = points.length
    if (n < 2) return geom
    const tolRad = (this.config.straightenAngleToleranceDeg * Math.PI) / 180

    const out: Point2D[] = points.map(p => ({ x: p.x, y: p.y }))
    for (let i = 0; i < n - 1; i++) {
      const a = out[i]
      const b = out[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx === 0 && dy === 0) continue
      const angle = Math.atan2(dy, dx)
      // Rounded à pi/2 (90°) le plus proche
      const k = Math.round(angle / (Math.PI / 2))
      const targetAngle = k * (Math.PI / 2)
      const diff = Math.abs(angle - targetAngle)
      // Skip si déjà parfaitement orthogonal (évite epsilon numérique
      // Math.cos(PI/2) ≈ 6e-17 qui modifierait sans raison).
      if (diff < 1e-9) continue
      if (diff < tolRad) {
        const len = Math.hypot(dx, dy)
        // Cos/sin entiers sur axes principaux pour éviter epsilon numérique.
        const kMod = ((k % 4) + 4) % 4
        const cos = kMod === 0 ? 1 : kMod === 1 ? 0 : kMod === 2 ? -1 : 0
        const sin = kMod === 0 ? 0 : kMod === 1 ? 1 : kMod === 2 ? 0 : -1
        out[i + 1] = {
          x: a.x + cos * len,
          y: a.y + sin * len,
        }
      }
    }

    if (isPolygon(geom)) return { ...geom, outer: out } as G
    return { ...geom, points: out } as G
  }

  // ─── 2. Snap endpoints ────────────────────────────────

  private snapEndpoints<G extends SpatialGeometry>(geom: G, context: ReadonlyArray<SpatialEntity>): G {
    if (!isPolygon(geom) && !isPolyline(geom)) return geom
    const tol = this.config.endpointSnapDistanceM
    const candidates = collectVertices(context)
    if (candidates.length === 0) return geom

    const points = isPolygon(geom) ? geom.outer : geom.points
    const out: Point2D[] = points.map(p => {
      let best: { d: number; pt: Point2D } | null = null
      for (const c of candidates) {
        const d = Math.hypot(c.x - p.x, c.y - p.y)
        if (d <= tol && (!best || d < best.d)) best = { d, pt: c }
      }
      return best ? { x: best.pt.x, y: best.pt.y } : p
    })

    if (isPolygon(geom)) return { ...geom, outer: out } as G
    return { ...geom, points: out } as G
  }

  // ─── 3. Align parallel walls ──────────────────────────

  private alignParallelWalls<G extends SpatialGeometry>(geom: G, context: ReadonlyArray<SpatialEntity>): G {
    // Stratégie pragmatique : on harmonise les coords X et Y des sommets
    // proches entre le polygone courant et tous les voisins.
    if (!isPolygon(geom) && !isPolyline(geom)) return geom
    const tol = this.config.parallelAlignDistanceM
    const drift = this.config.parallelDriftMaxM
    if (tol <= 0) return geom

    const points = isPolygon(geom) ? geom.outer : geom.points
    const allCtxX: number[] = []
    const allCtxY: number[] = []
    for (const v of collectVertices(context)) {
      allCtxX.push(v.x)
      allCtxY.push(v.y)
    }
    if (allCtxX.length === 0) return geom

    const out: Point2D[] = points.map(p => {
      let bestX = p.x, bestY = p.y
      let bestDX = drift + 1, bestDY = drift + 1
      for (const cx of allCtxX) {
        const d = Math.abs(cx - p.x)
        if (d <= tol && d < bestDX) { bestDX = d; bestX = cx }
      }
      for (const cy of allCtxY) {
        const d = Math.abs(cy - p.y)
        if (d <= tol && d < bestDY) { bestDY = d; bestY = cy }
      }
      // Garde-fou : drift par sommet
      const driftActual = Math.hypot(bestX - p.x, bestY - p.y)
      if (driftActual > drift) return p
      return { x: bestX, y: bestY }
    })

    if (isPolygon(geom)) return { ...geom, outer: out } as G
    return { ...geom, points: out } as G
  }

  // ─── 4. Trim overlaps ─────────────────────────────────

  private trimOverlaps<G extends SpatialGeometry>(geom: G, _context: ReadonlyArray<SpatialEntity>): G {
    // Implémentation simple rc.1 : pas de modification réelle.
    // Une vraie version utiliserait `polygon-clipping.difference()` pour
    // soustraire les chevauchements significatifs. À implémenter Sprint 2.5.
    return geom
  }

  // ─── 5. Close polygon ─────────────────────────────────

  private closePolygon<G extends SpatialGeometry>(geom: G): G {
    if (!isPolygon(geom)) return geom
    const pts = geom.outer
    if (pts.length < 3) return geom
    const first = pts[0]
    const last = pts[pts.length - 1]
    const gap = Math.hypot(last.x - first.x, last.y - first.y)
    if (gap > 0 && gap <= this.config.polygonClosureGapM) {
      // Si gap suffisamment petit, on supprime le dernier point dupliqué
      // (le polygone est implicitement fermé par la convention "ring").
      const newOuter = [...pts.slice(0, -1)]
      // Si c'est un véritable doublon → retire. Sinon on rapproche.
      if (gap > 0) newOuter[newOuter.length - 1] = first
      return { ...geom, outer: newOuter } as G
    }
    return geom
  }

  // ─── 6. Union avec voisins ────────────────────────────

  private unionMergeAdjacent<G extends SpatialGeometry>(
    geom: G,
    _entityType: string,
    _context: ReadonlyArray<SpatialEntity>,
  ): G {
    // Implémentation simple rc.1 : pas de modification réelle.
    // Une vraie version utiliserait `polygon-clipping.union()` après filtrage
    // des voisins de même type adjacents (bbox + ST_Touches). Sprint 2.5.
    return geom
  }
}

// ─── Helpers ──────────────────────────────────────────────

function collectVertices(context: ReadonlyArray<SpatialEntity>): Point2D[] {
  const out: Point2D[] = []
  for (const e of context) {
    if (isPolygon(e.geometry)) for (const p of e.geometry.outer) out.push(p)
    else if (isPolyline(e.geometry)) for (const p of e.geometry.points) out.push(p)
    else out.push(e.geometry.point)
  }
  return out
}

function geomEqual(a: SpatialGeometry, b: SpatialGeometry): boolean {
  if (a === b) return true
  return JSON.stringify(a) === JSON.stringify(b)
}
