// ═══ LOCAL BACKUP SERVICE ═══
//
// API de sauvegarde locale pour Atlas BIM.
// Un snapshot "courant" par projet + historique roulant (HISTORY_MAX_PER_PROJECT).

import { backupDB, SNAPSHOT_VERSION, HISTORY_MAX_PER_PROJECT, type ProjectSnapshot } from './db'

export async function saveSnapshot(projectId: string, stores: Record<string, unknown>): Promise<void> {
  if (!projectId) return
  const now = Date.now()
  const snap: ProjectSnapshot = { projectId, updatedAt: now, version: SNAPSHOT_VERSION, stores }
  await backupDB.snapshots.put(snap)

  // Historique roulant
  const payload = JSON.stringify(stores)
  await backupDB.history.add({
    projectId, createdAt: now, size: payload.length, stores,
  })
  const entries = await backupDB.history.where('projectId').equals(projectId).sortBy('createdAt')
  if (entries.length > HISTORY_MAX_PER_PROJECT) {
    const toDelete = entries.slice(0, entries.length - HISTORY_MAX_PER_PROJECT)
    await backupDB.history.bulkDelete(toDelete.map(e => e.id!).filter(Boolean))
  }
}

export async function loadSnapshot(projectId: string): Promise<ProjectSnapshot | null> {
  if (!projectId) return null
  const snap = await backupDB.snapshots.get(projectId)
  return snap ?? null
}

export async function listSnapshots(): Promise<ProjectSnapshot[]> {
  return backupDB.snapshots.orderBy('updatedAt').reverse().toArray()
}

export async function listHistory(projectId: string) {
  return backupDB.history.where('projectId').equals(projectId).reverse().sortBy('createdAt')
}

export async function deleteSnapshot(projectId: string): Promise<void> {
  await backupDB.snapshots.delete(projectId)
  const entries = await backupDB.history.where('projectId').equals(projectId).toArray()
  await backupDB.history.bulkDelete(entries.map(e => e.id!).filter(Boolean))
}

// ─── Export/Import fichier ───────────────────────────────────

export interface BackupFile {
  type: 'atlas-backup'
  version: number
  exportedAt: number
  snapshots: ProjectSnapshot[]
}

export async function exportAllToFile(): Promise<Blob> {
  const snapshots = await listSnapshots()
  const file: BackupFile = {
    type: 'atlas-backup', version: SNAPSHOT_VERSION,
    exportedAt: Date.now(), snapshots,
  }
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
}

export async function exportProjectToFile(projectId: string): Promise<Blob | null> {
  const snap = await loadSnapshot(projectId)
  if (!snap) return null
  const file: BackupFile = {
    type: 'atlas-backup', version: SNAPSHOT_VERSION,
    exportedAt: Date.now(), snapshots: [snap],
  }
  return new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
}

export async function importFromFile(blob: Blob): Promise<{ imported: number; errors: string[] }> {
  const text = await blob.text()
  const errors: string[] = []
  let imported = 0
  try {
    const parsed = JSON.parse(text) as BackupFile
    if (parsed.type !== 'atlas-backup') {
      return { imported: 0, errors: ['Fichier invalide : type attendu "atlas-backup"'] }
    }
    for (const snap of parsed.snapshots ?? []) {
      if (!snap.projectId) { errors.push('Snapshot sans projectId ignoré'); continue }
      await backupDB.snapshots.put(snap)
      imported++
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
  }
  return { imported, errors }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
