// ═══ LOCAL BACKUP — IndexedDB (Dexie) ═══
//
// Base de sauvegarde locale unifiée. Un snapshot par projet, versionné.
// Source de vérité offline : l'app fonctionne à 100% même sans Supabase.

import Dexie, { type Table } from 'dexie'

export interface ProjectSnapshot {
  projectId: string
  updatedAt: number
  version: number
  stores: Record<string, unknown>
}

export interface SnapshotHistoryEntry {
  id?: number
  projectId: string
  createdAt: number
  size: number
  stores: Record<string, unknown>
}

class LocalBackupDB extends Dexie {
  snapshots!: Table<ProjectSnapshot, string>
  history!: Table<SnapshotHistoryEntry, number>

  constructor() {
    super('atlas-local-backup')
    this.version(1).stores({
      snapshots: 'projectId, updatedAt',
      history: '++id, projectId, createdAt',
    })
  }
}

export const backupDB = new LocalBackupDB()

export const SNAPSHOT_VERSION = 1
export const HISTORY_MAX_PER_PROJECT = 20
