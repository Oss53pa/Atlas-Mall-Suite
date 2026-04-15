// ═══ Plan File Cache — persists raw DXF/DWG files in IndexedDB ═══
// Blob URLs die on page refresh. This stores the actual file bytes so we can
// rebuild a fresh blob URL after refresh + re-run the parsing pipeline if needed.

import Dexie from 'dexie'

interface PlanFileRecord {
  importId: string
  fileName: string
  sourceType: string  // 'dxf' | 'dwg' | 'ifc' | 'pdf' | 'image_raster' | 'svg'
  fileBlob: Blob
  savedAt: string
}

class PlanFileDB extends Dexie {
  planFiles!: Dexie.Table<PlanFileRecord, string>

  constructor() {
    super('atlas-plan-files')
    this.version(1).stores({
      planFiles: 'importId, fileName, sourceType',
    })
  }
}

const db = new PlanFileDB()

// In-session cache of blob URLs for speed
const urlCache = new Map<string, string>()

/** Save a plan file (raw bytes) under its import id */
export async function savePlanFile(importId: string, file: File | Blob, fileName: string, sourceType: string): Promise<string> {
  const blob = file instanceof File ? file.slice(0, file.size, file.type) : file
  await db.planFiles.put({
    importId,
    fileName,
    sourceType,
    fileBlob: blob,
    savedAt: new Date().toISOString(),
  })
  const url = URL.createObjectURL(blob)
  // Revoke previous URL if any
  const prev = urlCache.get(importId)
  if (prev) URL.revokeObjectURL(prev)
  urlCache.set(importId, url)
  return url
}

/** Get a fresh blob URL for the given importId (recreates from IndexedDB if needed) */
export async function getPlanFileUrl(importId: string): Promise<string | null> {
  // Session cache hit
  const cached = urlCache.get(importId)
  if (cached) return cached

  // Fetch from IndexedDB
  const record = await db.planFiles.get(importId)
  if (!record) return null

  const url = URL.createObjectURL(record.fileBlob)
  urlCache.set(importId, url)
  return url
}

/** Return the raw blob */
export async function getPlanFileBlob(importId: string): Promise<Blob | null> {
  const record = await db.planFiles.get(importId)
  return record ? record.fileBlob : null
}

/** Return the raw File (with filename preserved) */
export async function getPlanFile(importId: string): Promise<File | null> {
  const record = await db.planFiles.get(importId)
  if (!record) return null
  return new File([record.fileBlob], record.fileName, { type: record.fileBlob.type })
}

/** List all stored files */
export async function listPlanFiles(): Promise<Array<{ importId: string; fileName: string; sourceType: string; savedAt: string; size: number }>> {
  const all = await db.planFiles.toArray()
  return all.map(r => ({
    importId: r.importId,
    fileName: r.fileName,
    sourceType: r.sourceType,
    savedAt: r.savedAt,
    size: r.fileBlob.size,
  }))
}

/** Delete a stored file */
export async function deletePlanFile(importId: string): Promise<void> {
  const url = urlCache.get(importId)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(importId)
  }
  await db.planFiles.delete(importId)
}

/** Clear all stored files (danger!) */
export async function clearAllPlanFiles(): Promise<void> {
  for (const url of urlCache.values()) URL.revokeObjectURL(url)
  urlCache.clear()
  await db.planFiles.clear()
}
