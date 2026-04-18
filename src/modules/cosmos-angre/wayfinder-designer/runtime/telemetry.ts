// ═══ Télémétrie borne — envoi async vers analytics Vol.4 ═══
//
// CDC §08 : "Télémétrie borne — envoi asynchrone des events (recherches,
// destinations populaires, temps moyen par session) vers l'analytics Vol.4
// existant".
//
// Persiste dans table Supabase `kiosk_telemetry_events` (créée dans
// migration 012). Buffering local + flush par batch toutes les 10 s ou
// 20 events, ce qui évite de flooder le backend.

import { supabase, isOfflineMode } from '../../../../lib/supabase'
import type { KioskTelemetryEvent } from '../types'

let buffer: Array<KioskTelemetryEvent & { projetId: string }> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let currentSession: string | null = null

const FLUSH_INTERVAL_MS = 10_000
const FLUSH_THRESHOLD = 20

export function makeSessionHash(): string {
  const date = new Date().toISOString().slice(0, 10)
  const rnd = Math.random().toString(36).slice(2, 8)
  currentSession = `kiosk-${date}-${rnd}`
  return currentSession
}

export function sessionHash(): string | null {
  return currentSession
}

export function logTelemetry(
  event: Omit<KioskTelemetryEvent, 'timestampMs'>,
  projetId?: string,
): void {
  buffer.push({
    ...event,
    timestampMs: Date.now(),
    projetId: projetId ?? '',
  })
  if (buffer.length >= FLUSH_THRESHOLD) {
    void flushTelemetry()
  } else {
    scheduleFlush()
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushTelemetry()
  }, FLUSH_INTERVAL_MS)
}

export async function flushTelemetry(): Promise<{ success: boolean; flushed: number; error?: string }> {
  if (buffer.length === 0) return { success: true, flushed: 0 }
  const batch = buffer.slice()
  buffer = []

  if (isOfflineMode) {
    // Buffer local en localStorage pour rejouer plus tard
    const key = 'atlas-kiosk-telemetry-pending'
    const existing = JSON.parse(localStorage.getItem(key) ?? '[]')
    existing.push(...batch)
    localStorage.setItem(key, JSON.stringify(existing.slice(-1000)))
    return { success: true, flushed: batch.length }
  }

  try {
    const rows = batch
      .filter(e => e.projetId)
      .map(e => ({
        kiosk_id: e.kioskId,
        projet_id: e.projetId,
        kind: e.kind,
        payload: e.payload ?? null,
        locale: e.locale ?? null,
        session_hash: e.sessionHash,
        recorded_at: new Date(e.timestampMs).toISOString(),
      }))
    if (rows.length === 0) return { success: true, flushed: 0 }
    const { error } = await supabase.from('kiosk_telemetry_events').insert(rows)
    if (error) {
      // Re-buffering
      buffer.push(...batch)
      return { success: false, flushed: 0, error: error.message }
    }
    return { success: true, flushed: rows.length }
  } catch (err) {
    buffer.push(...batch)
    return { success: false, flushed: 0, error: err instanceof Error ? err.message : 'unknown' }
  }
}

/** Synchronise les events offline pending au démarrage borne. */
export async function syncPendingTelemetry(): Promise<{ synced: number; failed: number }> {
  if (isOfflineMode) return { synced: 0, failed: 0 }
  const key = 'atlas-kiosk-telemetry-pending'
  const pending: Array<KioskTelemetryEvent & { projetId: string }> =
    JSON.parse(localStorage.getItem(key) ?? '[]')
  if (pending.length === 0) return { synced: 0, failed: 0 }
  buffer.push(...pending)
  localStorage.removeItem(key)
  const r = await flushTelemetry()
  return { synced: r.flushed, failed: pending.length - r.flushed }
}
