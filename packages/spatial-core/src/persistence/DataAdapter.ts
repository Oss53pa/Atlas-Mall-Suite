// ═══ DATA ADAPTER — Pont local-first / Supabase ═══
//
// Trois implémentations concrètes possibles :
//   • LocalOnlyAdapter : Zustand store seul (offline)
//   • SupabaseAdapter   : pull/push avec Supabase spatial_entities
//   • DexieAdapter      : Dexie (IndexedDB) pour gros volumes offline
//
// Cette interface uniformise le contrat. La sélection de l'implémentation
// se fait au niveau de l'app consommatrice.

import type { SpatialEntity } from '../domain/SpatialEntity'

export interface DataAdapter {
  /** Charge toutes les entités d'un projet/level (ou tous niveaux si null). */
  loadProject(projectId: string, level?: string | null): Promise<ReadonlyArray<SpatialEntity>>

  /** Insère/met à jour une entité. */
  upsert(entity: SpatialEntity): Promise<void>

  /** Insertion batch (préférable pour migrations/imports). */
  upsertMany(entities: ReadonlyArray<SpatialEntity>): Promise<{ succeeded: number; failed: number; errors: ReadonlyArray<{ id: string; message: string }> }>

  /** Supprime une entité par ID. */
  delete(id: string): Promise<void>

  /** Récupère les voisins géographiques (PostGIS ST_DWithin). */
  fetchNeighbors(projectId: string, level: string, geometry: unknown, maxDistanceM: number): Promise<ReadonlyArray<SpatialEntity>>
}
