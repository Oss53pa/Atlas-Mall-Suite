// ═══ IMPORTED ZONES CACHE — Persists imported zones in localStorage ═══
// Survives page refresh. Keyed by floorId.

const STORAGE_KEY = 'atlas-imported-zones'

interface CachedFloorZones {
  floorId: string
  zones: unknown[]   // Zone objects from the store
  importedAt: string
  source: string     // 'pdf' | 'dwg' | 'dxf' | 'image'
}

function loadAll(): CachedFloorZones[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(data: CachedFloorZones[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Save imported zones for a floor. Replaces any previous import for that floor.
 */
export function cacheImportedZones(floorId: string, zones: unknown[], source: string): void {
  const all = loadAll().filter(c => c.floorId !== floorId)
  all.push({ floorId, zones, importedAt: new Date().toISOString(), source })
  saveAll(all)
}

/**
 * Get cached imported zones for a floor, or null if none.
 */
export function getCachedZones(floorId: string): unknown[] | null {
  const entry = loadAll().find(c => c.floorId === floorId)
  return entry?.zones ?? null
}

/**
 * Get all cached zones across all floors.
 */
export function getAllCachedZones(): { floorId: string; zones: unknown[] }[] {
  return loadAll().map(c => ({ floorId: c.floorId, zones: c.zones }))
}

/**
 * Check if any floor has cached imported zones.
 */
export function hasAnyCachedZones(): boolean {
  return loadAll().length > 0
}

/**
 * Clear cached zones for a floor.
 */
export function clearCachedZones(floorId: string): void {
  saveAll(loadAll().filter(c => c.floorId !== floorId))
}

/**
 * Clear all cached zones.
 */
export function clearAllCachedZones(): void {
  localStorage.removeItem(STORAGE_KEY)
}
