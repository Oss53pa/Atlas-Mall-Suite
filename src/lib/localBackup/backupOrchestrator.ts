// ═══ LOCAL BACKUP ORCHESTRATOR ═══
//
// S'abonne à tous les stores Zustand du projet actif et pousse un snapshot
// unifié dans IndexedDB (debounce 2s). Démarre au boot depuis main.tsx.

import { saveSnapshot, loadSnapshot } from './backupService'

type AnyStore = {
  subscribe: (listener: () => void) => () => void
  getState: () => unknown
}

interface RegisteredStore {
  key: string
  store: AnyStore
  partialize?: (state: unknown) => unknown
}

const registered: RegisteredStore[] = []
let currentProjectId: string | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let unsubscribes: Array<() => void> = []
let isEnabled = false

const DEBOUNCE_MS = 2000

export function registerStore(key: string, store: AnyStore, partialize?: (state: unknown) => unknown) {
  if (registered.some(r => r.key === key)) return
  registered.push({ key, store, partialize })
  if (isEnabled) attachListener(registered[registered.length - 1])
}

function attachListener(entry: RegisteredStore) {
  const unsub = entry.store.subscribe(() => scheduleFlush())
  unsubscribes.push(unsub)
}

function scheduleFlush() {
  if (!currentProjectId) return
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => { void flush() }, DEBOUNCE_MS)
}

function safeSerialize(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value, (_k, v) => {
      if (v instanceof File || v instanceof Blob) return undefined
      if (typeof v === 'function') return undefined
      if (v && typeof v === 'object' && 'isObject3D' in (v as object)) return undefined // THREE.Object3D
      return v
    }))
  } catch {
    return null
  }
}

async function flush() {
  if (!currentProjectId) return
  const stores: Record<string, unknown> = {}
  for (const { key, store, partialize } of registered) {
    try {
      const raw = store.getState()
      const picked = partialize ? partialize(raw) : raw
      const serialized = safeSerialize(picked)
      if (serialized !== null) stores[key] = serialized
    } catch (err) {
      console.warn(`[LocalBackup] serialize failed for ${key}:`, err)
    }
  }
  try {
    await saveSnapshot(currentProjectId, stores)
  } catch (err) {
    console.warn('[LocalBackup] saveSnapshot failed:', err)
  }
}

export function setActiveProjectForBackup(projectId: string | null) {
  currentProjectId = projectId
}

export function startBackupOrchestrator(projectId: string | null) {
  stopBackupOrchestrator()
  currentProjectId = projectId
  isEnabled = true
  for (const entry of registered) attachListener(entry)
}

export function stopBackupOrchestrator() {
  isEnabled = false
  for (const u of unsubscribes) { try { u() } catch { /* ignore */ } }
  unsubscribes = []
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
}

export async function forceFlush() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  await flush()
}

export async function hydrateFromLocalSnapshot(projectId: string): Promise<Record<string, unknown> | null> {
  const snap = await loadSnapshot(projectId)
  return snap?.stores ?? null
}

/**
 * Applique un snapshot local aux stores enregistrés (par clé).
 * Les stores doivent exposer `setState` (API Zustand standard).
 */
export function applySnapshotToStores(
  stores: Record<string, unknown>,
  setters: Record<string, (partial: Record<string, unknown>) => void>,
) {
  for (const [key, state] of Object.entries(stores)) {
    const setter = setters[key]
    if (!setter || !state || typeof state !== 'object') continue
    try {
      setter(state as Record<string, unknown>)
    } catch (err) {
      console.warn(`[LocalBackup] apply failed for ${key}:`, err)
    }
  }
}
