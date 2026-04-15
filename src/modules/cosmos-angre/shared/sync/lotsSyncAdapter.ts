// ═══ LOTS SYNC ADAPTER — Supabase sync opt-in pour lotsStore (M17) ═══
// Compatible avec le mode 100% local : si Supabase n'est pas configuré, pas-op.
// Synchronisation pull-then-push avec détection de conflits via version optimiste.

import { supabase, isOfflineMode } from '../../../../lib/supabase'
import type { Lot, LotId } from '../domain/LotEntity'
import { useLotsStore } from '../stores/lotsStore'

export interface SyncStatus {
  lastPushAt: string | null
  lastPullAt: string | null
  pendingLocalChanges: number
  conflicts: Array<{ lotId: string; localVersion: number; remoteVersion: number }>
  mode: 'offline' | 'online' | 'error'
  error?: string
}

// ─── Serialization for Supabase (flat row) ──────────────────

interface LotRow {
  id: string
  project_id: string
  label: string
  type: string
  floor_level: string
  polygon: Array<{ x: number; y: number }>
  area_sqm: number
  created_at: string
  updated_at: string
  version: number
  commercial: unknown
  security: unknown
  parcours: unknown
  metadata: unknown
}

function lotToRow(lot: Lot, projectId: string): LotRow {
  return {
    id: lot.id as string,
    project_id: projectId,
    label: lot.label,
    type: lot.type,
    floor_level: lot.floorLevel,
    polygon: lot.polygon.map(p => ({ x: p.x as number, y: p.y as number })),
    area_sqm: lot.areaSqm,
    created_at: lot.createdAt,
    updated_at: lot.updatedAt,
    version: lot.version,
    commercial: lot.commercial ?? null,
    security: lot.security ?? null,
    parcours: lot.parcours ?? null,
    metadata: lot.metadata ?? null,
  }
}

function rowToLot(row: LotRow): Lot {
  return {
    id: row.id as LotId,
    label: row.label,
    type: row.type as Lot['type'],
    floorLevel: row.floor_level as Lot['floorLevel'],
    polygon: row.polygon.map(p => ({ x: p.x as any, y: p.y as any, __system: 'metric' as const })),
    areaSqm: row.area_sqm,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    commercial: row.commercial as Lot['commercial'],
    security: row.security as Lot['security'],
    parcours: row.parcours as Lot['parcours'],
    metadata: row.metadata as Lot['metadata'],
  }
}

// ─── Sync operations ────────────────────────────────────────

const SYNC_META_KEY = 'cosmos-sync-meta-v1'

interface SyncMeta {
  lastPushAt: string | null
  lastPullAt: string | null
  projectId: string | null
}

function loadMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { lastPushAt: null, lastPullAt: null, projectId: null }
}

function saveMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
}

/** Pull remote lots and merge into local store (remote wins on version conflict). */
export async function pullLots(projectId: string): Promise<SyncStatus> {
  if (isOfflineMode) {
    return { mode: 'offline', lastPushAt: null, lastPullAt: null, pendingLocalChanges: 0, conflicts: [] }
  }
  const meta = loadMeta()
  try {
    const since = meta.lastPullAt ?? '1970-01-01T00:00:00Z'
    const { data, error } = await supabase
      .from('cosmos_lots')
      .select('*')
      .eq('project_id', projectId)
      .gte('updated_at', since)
    if (error) throw error

    const store = useLotsStore.getState()
    const conflicts: SyncStatus['conflicts'] = []
    for (const row of (data ?? []) as LotRow[]) {
      const remote = rowToLot(row)
      const local = store.byId(remote.id)
      if (local && local.version > remote.version) {
        conflicts.push({ lotId: local.id as string, localVersion: local.version, remoteVersion: remote.version })
        continue // local plus récent → on garde local
      }
      store.upsert(remote)
    }

    meta.lastPullAt = new Date().toISOString()
    meta.projectId = projectId
    saveMeta(meta)
    return {
      mode: 'online',
      lastPushAt: meta.lastPushAt,
      lastPullAt: meta.lastPullAt,
      pendingLocalChanges: 0,
      conflicts,
    }
  } catch (e) {
    return {
      mode: 'error',
      lastPushAt: meta.lastPushAt, lastPullAt: meta.lastPullAt,
      pendingLocalChanges: 0, conflicts: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/** Push all local lots for this project to Supabase (upsert by id). */
export async function pushLots(projectId: string): Promise<SyncStatus> {
  if (isOfflineMode) {
    return { mode: 'offline', lastPushAt: null, lastPullAt: null, pendingLocalChanges: 0, conflicts: [] }
  }
  const meta = loadMeta()
  try {
    const lots = useLotsStore.getState().all()
    const rows = lots.map(l => lotToRow(l, projectId))
    // Batch par 500
    const batchSize = 500
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize)
      const { error } = await supabase.from('cosmos_lots').upsert(slice, { onConflict: 'id' })
      if (error) throw error
    }
    meta.lastPushAt = new Date().toISOString()
    meta.projectId = projectId
    saveMeta(meta)
    return {
      mode: 'online',
      lastPushAt: meta.lastPushAt,
      lastPullAt: meta.lastPullAt,
      pendingLocalChanges: 0,
      conflicts: [],
    }
  } catch (e) {
    return {
      mode: 'error',
      lastPushAt: meta.lastPushAt, lastPullAt: meta.lastPullAt,
      pendingLocalChanges: useLotsStore.getState().count(),
      conflicts: [],
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/** Pull-then-push (sync complet). */
export async function syncLots(projectId: string): Promise<SyncStatus> {
  const pullRes = await pullLots(projectId)
  if (pullRes.mode === 'error' || pullRes.mode === 'offline') return pullRes
  return await pushLots(projectId)
}

export function currentSyncStatus(): SyncStatus {
  const meta = loadMeta()
  return {
    mode: isOfflineMode ? 'offline' : 'online',
    lastPushAt: meta.lastPushAt,
    lastPullAt: meta.lastPullAt,
    pendingLocalChanges: 0,
    conflicts: [],
  }
}
