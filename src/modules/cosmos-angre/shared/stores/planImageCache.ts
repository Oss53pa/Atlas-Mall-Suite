// ═══ Plan Image Cache — persists plan images in IndexedDB via Dexie ═══
// Blob URLs die on page refresh. This stores the actual image data in IndexedDB
// and recreates blob URLs on demand.

import Dexie from 'dexie'

class PlanImageDB extends Dexie {
  planImages!: Dexie.Table<{ floorId: string; imageBlob: Blob; fileName: string; savedAt: string }, string>

  constructor() {
    super('atlas-plan-images')
    this.version(1).stores({
      planImages: 'floorId',
    })
  }
}

const db = new PlanImageDB()

// Active blob URLs (recreated from IndexedDB on load)
const blobUrlCache = new Map<string, string>()

/**
 * Save a plan image for a floor. Stores the actual Blob in IndexedDB.
 */
export async function savePlanImage(floorId: string, imageBlob: Blob, fileName: string): Promise<string> {
  await db.planImages.put({ floorId, imageBlob, fileName, savedAt: new Date().toISOString() })
  // Create and cache a blob URL
  const url = URL.createObjectURL(imageBlob)
  blobUrlCache.set(floorId, url)
  return url
}

/**
 * Save a plan image from a blob URL (fetches the blob first).
 */
export async function savePlanImageFromUrl(floorId: string, blobUrl: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(blobUrl)
    const blob = await res.blob()
    await savePlanImage(floorId, blob, fileName)
  } catch {
    // Blob URL may have expired — can't persist
  }
}

/**
 * Get the blob URL for a floor's plan image. Recreates from IndexedDB if needed.
 * Vérifie que le blob URL est vivant — sinon le regénère.
 */
export async function getPlanImageUrl(floorId: string): Promise<string | undefined> {
  // Check memory cache first — vérifie que le blob est vivant (GET, pas HEAD)
  const cached = blobUrlCache.get(floorId)
  if (cached) {
    try {
      const res = await fetch(cached).catch(() => null)
      if (res && res.ok) return cached
      blobUrlCache.delete(floorId)
    } catch { blobUrlCache.delete(floorId) }
  }

  // Load from IndexedDB
  const record = await db.planImages.get(floorId)
  if (!record) return undefined

  const url = URL.createObjectURL(record.imageBlob)
  blobUrlCache.set(floorId, url)
  return url
}

/**
 * Load all cached plan images and return a map of floorId → blobUrl.
 * Call this once on app startup to restore plan backgrounds.
 */
export async function loadAllPlanImages(): Promise<Record<string, string>> {
  const all = await db.planImages.toArray()
  const result: Record<string, string> = {}
  for (const record of all) {
    const url = URL.createObjectURL(record.imageBlob)
    blobUrlCache.set(record.floorId, url)
    result[record.floorId] = url
  }
  return result
}

/**
 * Delete a plan image for a floor.
 */
export async function deletePlanImage(floorId: string): Promise<void> {
  const existing = blobUrlCache.get(floorId)
  if (existing) URL.revokeObjectURL(existing)
  blobUrlCache.delete(floorId)
  await db.planImages.delete(floorId)
}

/**
 * Clear all cached plan images from IndexedDB and revoke blob URLs.
 */
export async function clearAllPlanImages(): Promise<void> {
  for (const url of blobUrlCache.values()) URL.revokeObjectURL(url)
  blobUrlCache.clear()
  await db.planImages.clear()
}
