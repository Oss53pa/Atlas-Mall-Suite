// ═══ OFFLINE SYNC — Dexie IndexedDB ═══

import Dexie from 'dexie'

class AtlasOfflineDB extends Dexie {
  plans!: Dexie.Table<{ id: string; floorId: string; svgData: string; updatedAt: string }, string>
  entities!: Dexie.Table<{ id: string; type: string; data: Record<string, unknown>; updatedAt: string; synced: boolean }, string>
  syncQueue!: Dexie.Table<{ id: string; action: string; entityType: string; entityId: string; payload: Record<string, unknown>; createdAt: string }, string>
  photos!: Dexie.Table<{ id: string; entityId: string; dataUrl: string; createdAt: string; synced: boolean }, string>

  constructor() {
    super('AtlasOfflineDB')
    this.version(1).stores({
      plans: 'id, floorId',
      entities: 'id, type, synced',
      syncQueue: 'id, action, createdAt',
      photos: 'id, entityId, synced',
    })
  }
}

export const offlineDB = new AtlasOfflineDB()

export async function queueSync(action: 'create' | 'update' | 'delete', entityType: string, entityId: string, payload: Record<string, unknown>): Promise<void> {
  await offlineDB.syncQueue.add({ id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`, action, entityType, entityId, payload, createdAt: new Date().toISOString() })
}

export async function processSyncQueue(syncFn: (item: { action: string; entityType: string; entityId: string; payload: Record<string, unknown> }) => Promise<boolean>): Promise<{ synced: number; failed: number }> {
  const queue = await offlineDB.syncQueue.orderBy('createdAt').toArray()
  let synced = 0, failed = 0
  for (const item of queue) {
    try { if (await syncFn(item)) { await offlineDB.syncQueue.delete(item.id); synced++ } else failed++ }
    catch { failed++ }
  }
  return { synced, failed }
}

export async function cachePlan(floorId: string, svgData: string): Promise<void> {
  await offlineDB.plans.put({ id: `plan-${floorId}`, floorId, svgData, updatedAt: new Date().toISOString() })
}

export async function getCachedPlan(floorId: string): Promise<string | undefined> {
  return (await offlineDB.plans.get(`plan-${floorId}`))?.svgData
}

export function getPendingSyncCount(): Promise<number> { return offlineDB.syncQueue.count() }
