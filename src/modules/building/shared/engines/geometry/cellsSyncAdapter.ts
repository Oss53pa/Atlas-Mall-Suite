// ═══ CELLS SYNC ADAPTER ═══
//
// Pont entre `EditableSpace` (in-app, polygone en mètres float) et la table
// Supabase `public.cells` (polygon_vertices en mm entiers + metadata JSONB +
// geometry_quality_score).
//
// PRINCIPE : la conversion a lieu EXCLUSIVEMENT dans ce fichier. Aucun
// autre module de l'app ne doit parler directement à la colonne
// `polygon_vertices`. On garde ainsi la liberté de changer le schéma
// (mm entiers, mm × 10, PostGIS…) sans toucher à l'UI.
//
// Trois fonctions publiques :
//   • serializePolygonForCells(polygonM)  → { polygon_vertices, polygon_metadata, geometry_quality_score }
//   • deserializePolygonFromCells(row)    → { polygonM }
//   • pushEditableSpaces(projectId, spaces) → upsert batché dans Supabase
//
// Sync best-effort (local-first CLAUDE.md §5.4) : toute erreur est loguée,
// jamais propagée à l'UI bloquante.

import type { EditableSpace } from '../../components/SpaceEditorCanvas'
import type { PolygonMm } from './constraints'
import { xyPolygonToMm, xyPolygonToM } from './meterAdapter'
import { scorePolygonQuality, scorePolygonQualityForType } from './qualityScore'
import { hasSelfIntersection } from './overlapDetection'
import { supabase, isOfflineMode } from '../../../../../lib/supabase'

// ─── Types SQL ────────────────────────────────────────────

export interface CellRow {
  readonly id: string
  /** Slug Atlas BIM (ex: 'cosmos-angre') — colonne TEXT côté DB. */
  readonly project_id: string
  readonly floor_id: string | null
  readonly label: string | null
  readonly space_type: string | null
  readonly polygon_vertices: number[][] | null
  readonly polygon_metadata: CellMetadata | null
  readonly geometry_quality_score: number | null
}

export interface CellMetadata {
  readonly closed: boolean
  readonly orthogonal: boolean
  readonly simpleRing: boolean
  readonly areaMm2: number
  readonly perimeterMm: number
  readonly vertexCount: number
  readonly breakdown: {
    readonly orthogonality: number
    readonly closure: number
    readonly simpleRing: number
    readonly compactness: number
  }
}

export interface SerializedCellGeometry {
  readonly polygon_vertices: number[][]
  readonly polygon_metadata: CellMetadata
  readonly geometry_quality_score: number
}

// ─── Serialize ────────────────────────────────────────────

export function serializePolygonForCells(
  polygonM: readonly { x: number; y: number }[],
  spaceType?: string,
): SerializedCellGeometry {
  const polyMm: PolygonMm = xyPolygonToMm(polygonM)
  // Scoring context-aware si le type est fourni (portes/voies/organiques
  // ont des pondérations réalistes). Sinon fallback scoring strict.
  const q = spaceType ? scorePolygonQualityForType(polyMm, spaceType) : scorePolygonQuality(polyMm)
  const simpleRing = !hasSelfIntersection(polyMm)
  const metadata: CellMetadata = {
    closed: true,
    orthogonal: q.breakdown.orthogonality >= 0.9,
    simpleRing,
    areaMm2: q.areaMm2,
    perimeterMm: q.perimeterMm,
    vertexCount: q.vertexCount,
    breakdown: q.breakdown,
  }
  return {
    polygon_vertices: polyMm.map(([x, y]) => [x, y]),
    polygon_metadata: metadata,
    geometry_quality_score: Math.round(q.score * 100) / 100, // NUMERIC(3,2)
  }
}

// ─── Deserialize ──────────────────────────────────────────

export function deserializePolygonFromCells(row: CellRow): { x: number; y: number }[] | null {
  if (!row.polygon_vertices || !Array.isArray(row.polygon_vertices)) return null
  const polyMm: PolygonMm = row.polygon_vertices
    .filter(v => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number')
    .map(v => [v[0], v[1]] as const)
  if (polyMm.length < 3) return null
  return xyPolygonToM(polyMm)
}

// ─── Push batché ──────────────────────────────────────────

export interface PushResult {
  readonly attempted: number
  readonly succeeded: number
  readonly failed: number
  readonly skippedOffline: boolean
  readonly errors: ReadonlyArray<{ spaceId: string; message: string }>
}

/**
 * Upsert les `EditableSpace` dans `public.cells`. Best-effort :
 *   - offline (env Supabase non configurée) → skip proprement
 *   - erreur SQL sur un row → log + continue les autres
 *   - pas d'erreur throwée vers l'appelant (l'UI reste fluide)
 */
export async function pushEditableSpaces(
  projectId: string,
  spaces: readonly EditableSpace[],
): Promise<PushResult> {
  if (isOfflineMode) {
    return { attempted: spaces.length, succeeded: 0, failed: 0, skippedOffline: true, errors: [] }
  }

  const errors: Array<{ spaceId: string; message: string }> = []
  let succeeded = 0

  // Batches de 50 pour éviter les payloads trop gros
  const BATCH = 50
  for (let start = 0; start < spaces.length; start += BATCH) {
    const batch = spaces.slice(start, start + BATCH)
    const rows = batch.map(s => {
      const geom = serializePolygonForCells(s.polygon, String(s.type))
      return {
        id: s.id,
        project_id: projectId,
        floor_id: String(s.floorLevel ?? ''),
        label: s.name ?? null,
        space_type: String(s.type ?? ''),
        polygon_vertices: geom.polygon_vertices,
        polygon_metadata: geom.polygon_metadata,
        geometry_quality_score: geom.geometry_quality_score,
      }
    })
    const { error } = await supabase.from('cells').upsert(rows, { onConflict: 'id' })
    if (error) {
      for (const s of batch) errors.push({ spaceId: s.id, message: error.message })
    } else {
      succeeded += batch.length
    }
  }

  return {
    attempted: spaces.length,
    succeeded,
    failed: errors.length,
    skippedOffline: false,
    errors,
  }
}

// ─── Pull ─────────────────────────────────────────────────

export interface PullResult {
  readonly spaces: EditableSpace[]
  readonly skippedOffline: boolean
  readonly errorMessage?: string
}

/**
 * Récupère les cells d'un projet et les reconstruit en `EditableSpace`.
 * Les champs non-géométriques (vacant, tenant, etc.) ne sont PAS synchronisés
 * par ce module — c'est hors scope (autre table, autre adapter).
 */
export async function pullEditableSpaces(projectId: string): Promise<PullResult> {
  if (isOfflineMode) {
    return { spaces: [], skippedOffline: true }
  }
  const { data, error } = await supabase
    .from('cells')
    .select('id, project_id, floor_id, label, space_type, polygon_vertices, polygon_metadata, geometry_quality_score')
    .eq('project_id', projectId)
  if (error) return { spaces: [], skippedOffline: false, errorMessage: error.message }

  const spaces: EditableSpace[] = []
  for (const row of (data ?? []) as CellRow[]) {
    const polygon = deserializePolygonFromCells(row)
    if (!polygon) continue
    spaces.push({
      id: row.id,
      name: row.label ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: (row.space_type ?? 'other') as any,
      polygon,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      floorLevel: (row.floor_id ?? 'rdc') as any,
      validated: true,
    })
  }
  return { spaces, skippedOffline: false }
}
