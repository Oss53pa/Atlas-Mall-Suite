// ═══ SUPABASE SPATIAL ENTITY REPOSITORY ═══
//
// Implémentation concrète de SpatialEntityRepository pour Supabase.
// Utilise PostGIS pour les requêtes de voisinage.
//
// La table `spatial_entities` est définie dans la migration
// `20260425b_spatial_core_v2.sql`. Le trigger `sync_geometry_geom_trg`
// synchronise automatiquement la colonne PostGIS depuis le JSONB côté DB.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpatialEntity } from '../domain/SpatialEntity'
import type {
  SpatialEntityRepository,
} from '../migration/LegacyPlanMigrator'
import type { LegacyEntity } from '../migration/MigrationHeuristics'

// ─── Row format DB ────────────────────────────────────────

interface SpatialEntityRow {
  id: string
  project_id: string
  level: string
  entity_type: string
  geometry: unknown
  extrusion_enabled: boolean
  extrusion_height: number
  extrusion_base_elevation: number
  material_id: string
  snap_behavior: string
  merge_with_neighbors: boolean
  parent_id: string | null
  boutique_id: string | null
  equipment_id: string | null
  lease_lot_id: string | null
  safety_compliance_id: string | null
  wayfinder_route_id: string | null
  label: string | null
  notes: string | null
  custom_properties: Record<string, unknown>
  is_auto_corrected: boolean
  correction_audit_trail: unknown
  migration_metadata: unknown
  created_at: string
  updated_at: string
  created_by: string | null
}

function rowToEntity(row: SpatialEntityRow): SpatialEntity {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.entity_type,
    level: row.level,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geometry: row.geometry as any,
    extrusion: {
      enabled: row.extrusion_enabled,
      height: row.extrusion_height,
      baseElevation: row.extrusion_base_elevation,
    },
    material: row.material_id,
    snapBehavior: (row.snap_behavior as 'strong' | 'weak' | 'none'),
    mergeWithNeighbors: row.merge_with_neighbors,
    parentId: row.parent_id ?? undefined,
    boutiqueId: row.boutique_id ?? undefined,
    equipmentId: row.equipment_id ?? undefined,
    leaseLotId: row.lease_lot_id ?? undefined,
    safetyComplianceId: row.safety_compliance_id ?? undefined,
    wayfinderRouteId: row.wayfinder_route_id ?? undefined,
    childrenIds: [],
    label: row.label ?? undefined,
    notes: row.notes ?? undefined,
    customProperties: row.custom_properties ?? {},
    isAutoCorrected: row.is_auto_corrected,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    correctionAuditTrail: (row.correction_audit_trail as any) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migrationMetadata: (row.migration_metadata as any) ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by ?? 'unknown',
  }
}

function entityToRow(e: SpatialEntity): Partial<SpatialEntityRow> {
  return {
    id: e.id,
    project_id: e.projectId,
    level: e.level,
    entity_type: e.type,
    geometry: e.geometry,
    extrusion_enabled: e.extrusion.enabled,
    extrusion_height: e.extrusion.height,
    extrusion_base_elevation: e.extrusion.baseElevation,
    material_id: e.material,
    snap_behavior: e.snapBehavior,
    merge_with_neighbors: e.mergeWithNeighbors,
    parent_id: e.parentId ?? null,
    boutique_id: e.boutiqueId ?? null,
    equipment_id: e.equipmentId ?? null,
    lease_lot_id: e.leaseLotId ?? null,
    safety_compliance_id: e.safetyComplianceId ?? null,
    wayfinder_route_id: e.wayfinderRouteId ?? null,
    label: e.label ?? null,
    notes: e.notes ?? null,
    custom_properties: e.customProperties as Record<string, unknown>,
    is_auto_corrected: e.isAutoCorrected,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    correction_audit_trail: e.correctionAuditTrail as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migration_metadata: e.migrationMetadata as any,
    created_by: e.createdBy,
  }
}

// ─── Repository ───────────────────────────────────────────

export class SupabaseSpatialEntityRepository implements SpatialEntityRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly legacyTableName = 'cells', // table legacy par défaut (cf cells_polygon_geometry.sql)
  ) {}

  async fetchLegacyEntities(projectId: string): Promise<ReadonlyArray<LegacyEntity>> {
    // Charge depuis la table legacy. Pour rc.1 c'est `cells` (les
    // EditableSpace y sont déjà sync via cellsSyncAdapter).
    const { data, error } = await this.supabase
      .from(this.legacyTableName)
      .select('id, project_id, label, space_type, polygon_vertices, floor_id, created_at, updated_at')
      .eq('project_id', projectId)
    if (error) throw new Error(`fetchLegacyEntities: ${error.message}`)

    return (data ?? []).flatMap((row): LegacyEntity[] => {
      const verts = row.polygon_vertices as number[][] | null
      if (!verts || verts.length < 3) return []
      // polygon_vertices est en mm entiers → convert en mètres pour LegacyEntity
      const outer = verts.map(([x, y]) => ({ x: x / 1000, y: y / 1000 }))
      return [{
        id: row.id,
        projectId: row.project_id,
        type: String(row.space_type ?? 'WALL'),
        geometry: { outer },
        label: row.label ?? undefined,
        level: String(row.floor_id ?? 'rdc'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }]
    })
  }

  async fetchNeighbors(
    projectId: string,
    level: string,
    _geometry: unknown,
    maxDistanceM: number,
  ): Promise<ReadonlyArray<SpatialEntity>> {
    // PostGIS find_spatial_neighbors : nécessite l'ID source. Dans le
    // contexte du migrator on n'a pas encore l'ID DB final → on retourne
    // tous les voisins du même level dans un buffer généreux.
    const { data, error } = await this.supabase
      .from('spatial_entities')
      .select('*')
      .eq('project_id', projectId)
      .eq('level', level)
      .limit(200)
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[SupabaseRepo] fetchNeighbors fallback: ${error.message}`)
      return []
    }
    void maxDistanceM
    return (data ?? []).map(rowToEntity)
  }

  async insertSpatialEntity(entity: SpatialEntity): Promise<void> {
    const { error } = await this.supabase
      .from('spatial_entities')
      .upsert(entityToRow(entity) as Record<string, unknown>, { onConflict: 'id' })
    if (error) throw new Error(`insertSpatialEntity ${entity.id}: ${error.message}`)
  }

  async insertManySpatialEntities(entities: ReadonlyArray<SpatialEntity>): Promise<{ succeeded: number; failed: number; errors: Array<{ id: string; message: string }> }> {
    const errors: Array<{ id: string; message: string }> = []
    let succeeded = 0
    const BATCH = 50
    for (let start = 0; start < entities.length; start += BATCH) {
      const batch = entities.slice(start, start + BATCH).map(entityToRow)
      const { error } = await this.supabase
        .from('spatial_entities')
        .upsert(batch as Record<string, unknown>[], { onConflict: 'id' })
      if (error) {
        for (const e of entities.slice(start, start + BATCH)) {
          errors.push({ id: e.id, message: error.message })
        }
      } else {
        succeeded += batch.length
      }
    }
    return { succeeded, failed: errors.length, errors }
  }

  async markLegacyAsMigrated(legacyId: string, newEntityId: string): Promise<void> {
    const { error } = await this.supabase
      .from('spatial_entities_migration_log')
      .upsert({
        project_id: '', // injecté par RLS contextuelle si applicable
        legacy_entity_id: legacyId,
        new_entity_id: newEntityId,
        status: 'migrated',
      }, { onConflict: 'project_id,legacy_entity_id' })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[SupabaseRepo] markLegacyAsMigrated ${legacyId}: ${error.message}`)
    }
  }

  async createSnapshot(projectId: string, snapshotName: string, data: unknown): Promise<void> {
    const { error } = await this.supabase
      .from('spatial_entities_snapshots')
      .insert({
        project_id: projectId,
        snapshot_name: snapshotName,
        snapshot_data: data as object,
      })
    if (error) throw new Error(`createSnapshot ${snapshotName}: ${error.message}`)
  }

  async loadSnapshot(projectId: string, snapshotName: string): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('spatial_entities_snapshots')
      .select('snapshot_data')
      .eq('project_id', projectId)
      .eq('snapshot_name', snapshotName)
      .maybeSingle()
    if (error) throw new Error(`loadSnapshot ${snapshotName}: ${error.message}`)
    return data?.snapshot_data ?? null
  }

  async deleteEntitiesByMigrationFlag(projectId: string): Promise<number> {
    // Supprime tous les SpatialEntity créés par migration (migration_metadata IS NOT NULL).
    const { data, error } = await this.supabase
      .from('spatial_entities')
      .delete()
      .eq('project_id', projectId)
      .not('migration_metadata', 'is', null)
      .select('id')
    if (error) throw new Error(`deleteEntitiesByMigrationFlag: ${error.message}`)
    return data?.length ?? 0
  }

  // ─── DataAdapter compat helpers ────────────────────────

  async loadProject(projectId: string, level?: string | null): Promise<ReadonlyArray<SpatialEntity>> {
    let q = this.supabase.from('spatial_entities').select('*').eq('project_id', projectId)
    if (level) q = q.eq('level', level)
    const { data, error } = await q
    if (error) throw new Error(`loadProject: ${error.message}`)
    return (data ?? []).map(rowToEntity)
  }

  async deleteEntity(id: string): Promise<void> {
    const { error } = await this.supabase.from('spatial_entities').delete().eq('id', id)
    if (error) throw new Error(`deleteEntity ${id}: ${error.message}`)
  }
}
