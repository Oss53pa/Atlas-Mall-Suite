// ═══ SPATIAL ENTITY — Modèle de données ═══
//
// Représentation d'une entité spatiale dans l'éditeur Atlas Studio.
// Sérialisable (JSON), persistable Dexie + Supabase.
//
// Convention d'unités : MÈTRES FLOAT côté in-app. La conversion mm entiers
// pour persistance Supabase se fait dans `persistence/DataAdapter.ts`.

import type { EntityTypeId, MaterialId, SnapBehavior } from './EntityTypeMetadata'

// ─── Géométries ──────────────────────────────────────────

export interface Point2D {
  readonly x: number
  readonly y: number
}

export interface Polyline {
  readonly points: ReadonlyArray<Point2D>
  readonly closed: boolean
}

export interface Polygon {
  readonly outer: ReadonlyArray<Point2D>
  /** Trous (CSG holes) — ex: porte dans un mur. */
  readonly holes?: ReadonlyArray<ReadonlyArray<Point2D>>
}

export interface PointGeometry {
  readonly point: Point2D
}

export type SpatialGeometry = Polygon | Polyline | PointGeometry

export function isPolygon(g: SpatialGeometry): g is Polygon {
  return 'outer' in g
}
export function isPolyline(g: SpatialGeometry): g is Polyline {
  return 'points' in g
}
export function isPoint(g: SpatialGeometry): g is PointGeometry {
  return 'point' in g
}

// ─── Audit / migration ───────────────────────────────────

export type CorrectionActionKind =
  | 'straighten' | 'snap_endpoint' | 'align_parallel'
  | 'trim_overlap' | 'close_polygon' | 'merge_union'
  | 'harmonize_global'

export interface CorrectionAction {
  readonly timestamp: string
  readonly action: CorrectionActionKind
  readonly beforeGeometry: SpatialGeometry
  readonly afterGeometry: SpatialGeometry
  readonly parameters: Readonly<Record<string, number>>
}

export interface MigrationMetadata {
  readonly migratedFromLegacyId: string
  readonly migrationDate: string
  readonly migrationConfidence: 'high' | 'medium' | 'low' | 'manual_review_needed'
  readonly legacyType: string
  readonly heuristicApplied: string
}

// ─── Entité spatiale ─────────────────────────────────────

export interface SpatialEntity {
  readonly id: string
  readonly projectId: string
  readonly type: EntityTypeId
  readonly level: 'rdc' | 'r1' | 'r2' | 'r3' | 'sous_sol' | string
  readonly geometry: SpatialGeometry

  readonly extrusion: { enabled: boolean; height: number; baseElevation: number }
  readonly material: MaterialId
  readonly snapBehavior: SnapBehavior
  readonly mergeWithNeighbors: boolean

  // Hiérarchie
  readonly parentId?: string
  readonly childrenIds: ReadonlyArray<string>

  // Liens cross-produit
  readonly boutiqueId?: string
  readonly zoneId?: string
  readonly equipmentId?: string
  readonly leaseLotId?: string
  readonly safetyComplianceId?: string
  readonly wayfinderRouteId?: string

  // Métadonnées libres
  readonly label?: string
  readonly notes?: string
  readonly customProperties: Readonly<Record<string, unknown>>

  // Audit
  readonly createdAt: string
  readonly updatedAt: string
  readonly createdBy: string
  readonly isAutoCorrected: boolean
  readonly correctionAuditTrail: ReadonlyArray<CorrectionAction>
  readonly migrationMetadata?: MigrationMetadata
}

// ─── Helpers de construction ─────────────────────────────

export function nowIso(): string {
  return new Date().toISOString()
}

export function genSpatialEntityId(): string {
  return `spatial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
