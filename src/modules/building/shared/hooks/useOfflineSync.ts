import { useState, useEffect, useCallback, useRef } from 'react'
import Dexie from 'dexie'
import { supabase } from '../../../../lib/supabase'

// ═══ DEXIE DATABASE ═══

interface SyncQueueEntry {
  id?: number
  table: string
  recordId: string
  operation: 'upsert' | 'delete'
  data: string // JSON-serialized
  timestamp: number
  projectId: string
}

interface SnapshotEntry {
  id?: string
  projectId: string
  timestamp: number
  label: string
  data: string // JSON-serialized full state
}

class AtlasPlanDB extends Dexie {
  cameras!: Dexie.Table<Record<string, unknown>, string>
  doors!: Dexie.Table<Record<string, unknown>, string>
  pois!: Dexie.Table<Record<string, unknown>, string>
  zones!: Dexie.Table<Record<string, unknown>, string>
  syncQueue!: Dexie.Table<SyncQueueEntry, number>
  snapshots!: Dexie.Table<SnapshotEntry, string>

  constructor() {
    super('AtlasPlan')
    this.version(1).stores({
      cameras: 'id, floorId, project_id',
      doors: 'id, floorId, project_id',
      pois: 'id, floorId, project_id',
      zones: 'id, floorId, project_id',
      syncQueue: '++id, table, recordId, projectId, timestamp',
      snapshots: 'id, projectId, timestamp',
    })
  }
}

const db = new AtlasPlanDB()

// ═══ HELPERS ═══

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

function isSupabaseConfigured(): boolean {
  return !!SUPABASE_URL && !SUPABASE_URL.includes('placeholder')
}

type TableName = 'cameras' | 'doors' | 'pois' | 'zones'

const VALID_TABLES: readonly TableName[] = ['cameras', 'doors', 'pois', 'zones'] as const

function isValidTable(table: string): table is TableName {
  return (VALID_TABLES as readonly string[]).includes(table)
}

async function pingSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('zones').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

// ═══ HOOK ═══

interface OfflineSyncResult {
  isOffline: boolean
  isSyncing: boolean
  pendingCount: number
  saveLocal: (table: TableName, data: Record<string, unknown>) => Promise<void>
  loadLocal: <T>(table: TableName) => Promise<T[]>
  syncToServer: () => Promise<void>
  createSnapshot: (label?: string) => Promise<string>
  restoreSnapshot: (snapshotId: string) => Promise<Record<string, unknown[]>>
}

export function useOfflineSync(projectId: string): OfflineSyncResult {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const syncingRef = useRef(false)

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false)
      // Auto-sync when coming back online
      void autoSync()
    }
    const goOffline = () => setIsOffline(true)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Initial ping
    void pingSupabase().then((reachable) => {
      if (!reachable) setIsOffline(true)
    })

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Count pending sync entries
  useEffect(() => {
    const updateCount = async () => {
      const count = await db.syncQueue
        .where('projectId')
        .equals(projectId)
        .count()
      setPendingCount(count)
    }
    void updateCount()
    const interval = setInterval(() => void updateCount(), 5_000)
    return () => clearInterval(interval)
  }, [projectId])

  const saveLocal = useCallback(
    async (table: TableName, data: Record<string, unknown>) => {
      if (!isValidTable(table)) return

      const recordId = data.id as string
      if (!recordId) return

      // Always write to IndexedDB first
      await db.table(table).put(data)

      // Add to sync queue
      await db.syncQueue.add({
        table,
        recordId,
        operation: 'upsert',
        data: JSON.stringify(data),
        timestamp: Date.now(),
        projectId,
      })

      setPendingCount((prev) => prev + 1)
    },
    [projectId]
  )

  const loadLocal = useCallback(
    async <T>(table: TableName): Promise<T[]> => {
      if (!isValidTable(table)) return []

      const records = await db.table(table)
        .where('project_id')
        .equals(projectId)
        .toArray()

      return records as T[]
    },
    [projectId]
  )

  const syncToServer = useCallback(async () => {
    if (syncingRef.current || !isSupabaseConfigured()) return
    syncingRef.current = true
    setIsSyncing(true)

    try {
      const entries = await db.syncQueue
        .where('projectId')
        .equals(projectId)
        .sortBy('timestamp')

      // Deduplicate: keep latest entry per table+recordId
      const latestByKey = new Map<string, SyncQueueEntry>()
      for (const entry of entries) {
        const key = `${entry.table}:${entry.recordId}`
        const existing = latestByKey.get(key)
        if (!existing || entry.timestamp > existing.timestamp) {
          latestByKey.set(key, entry)
        }
      }

      const processedIds: number[] = []

      for (const entry of latestByKey.values()) {
        if (!isValidTable(entry.table)) continue

        try {
          if (entry.operation === 'delete') {
            const { error } = await supabase
              .from(entry.table)
              .delete()
              .eq('id', entry.recordId)

            if (error) {
              console.error(`Sync delete failed for ${entry.table}/${entry.recordId}:`, error.message)
              continue
            }
          } else {
            const localData: Record<string, unknown> = JSON.parse(entry.data)

            // Merge strategy: compare timestamps. Local wins if newer.
            const { data: serverData } = await supabase
              .from(entry.table)
              .select('*')
              .eq('id', entry.recordId)
              .single()

            if (serverData) {
              const serverTs = typeof serverData.updated_at === 'string'
                ? new Date(serverData.updated_at).getTime()
                : 0
              if (serverTs > entry.timestamp) {
                // Server is newer — update local with server data
                await db.table(entry.table).put(serverData as Record<string, unknown>)
                // Still remove from queue
                if (entry.id !== undefined) processedIds.push(entry.id)
                continue
              }
            }

            const { error } = await supabase
              .from(entry.table)
              .upsert(localData)

            if (error) {
              console.error(`Sync upsert failed for ${entry.table}/${entry.recordId}:`, error.message)
              continue
            }
          }

          // Collect all queue entry IDs for this key
          const relatedEntries = entries.filter(
            (e) => e.table === entry.table && e.recordId === entry.recordId
          )
          for (const related of relatedEntries) {
            if (related.id !== undefined) processedIds.push(related.id)
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`Sync error for ${entry.table}/${entry.recordId}:`, msg)
        }
      }

      if (processedIds.length > 0) {
        await db.syncQueue.bulkDelete(processedIds)
      }

      const remaining = await db.syncQueue
        .where('projectId')
        .equals(projectId)
        .count()
      setPendingCount(remaining)
    } finally {
      syncingRef.current = false
      setIsSyncing(false)
    }
  }, [projectId])

  const autoSync = useCallback(async () => {
    const reachable = await pingSupabase()
    if (reachable) {
      await syncToServer()
    }
  }, [syncToServer])

  const createSnapshot = useCallback(
    async (label?: string): Promise<string> => {
      const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const timestamp = Date.now()

      const cameras = await db.cameras.where('project_id').equals(projectId).toArray()
      const doors = await db.doors.where('project_id').equals(projectId).toArray()
      const pois = await db.pois.where('project_id').equals(projectId).toArray()
      const zones = await db.zones.where('project_id').equals(projectId).toArray()

      const snapshot: SnapshotEntry = {
        id: snapshotId,
        projectId,
        timestamp,
        label: label ?? `Snapshot ${new Date(timestamp).toLocaleString()}`,
        data: JSON.stringify({ cameras, doors, pois, zones }),
      }

      await db.snapshots.put(snapshot)
      return snapshotId
    },
    [projectId]
  )

  const restoreSnapshot = useCallback(
    async (snapshotId: string): Promise<Record<string, unknown[]>> => {
      const snapshot = await db.snapshots.get(snapshotId)
      if (!snapshot) throw new Error(`Snapshot ${snapshotId} introuvable`)

      const parsed = JSON.parse(snapshot.data) as {
        cameras: Record<string, unknown>[]
        doors: Record<string, unknown>[]
        pois: Record<string, unknown>[]
        zones: Record<string, unknown>[]
      }

      // Clear existing data for this project
      await db.cameras.where('project_id').equals(projectId).delete()
      await db.doors.where('project_id').equals(projectId).delete()
      await db.pois.where('project_id').equals(projectId).delete()
      await db.zones.where('project_id').equals(projectId).delete()

      // Restore from snapshot
      if (parsed.cameras.length > 0) await db.cameras.bulkPut(parsed.cameras)
      if (parsed.doors.length > 0) await db.doors.bulkPut(parsed.doors)
      if (parsed.pois.length > 0) await db.pois.bulkPut(parsed.pois)
      if (parsed.zones.length > 0) await db.zones.bulkPut(parsed.zones)

      return parsed
    },
    [projectId]
  )

  return {
    isOffline,
    isSyncing,
    pendingCount,
    saveLocal,
    loadLocal,
    syncToServer,
    createSnapshot,
    restoreSnapshot,
  }
}
