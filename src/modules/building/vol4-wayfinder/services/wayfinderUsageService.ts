// ═══ VOL.4 USAGE SERVICE — persistance Supabase des logs d'itinéraires ═══
//
// Chaque fois qu'un kiosque ou un mobile calcule un itinéraire, on persiste
// un log dans Supabase. Les analytics Vol.4 exploitent ensuite ces logs
// agrégés pour produire des statistiques réelles (vs proportionnelles).

import { supabase, isOfflineMode } from '../../../../lib/supabase'
import type { RouteMode, RouteResult } from '../engines/astarEngine'

// ─── Types ─────────────────────────────────────────

export interface UsageLogEntry {
  id?: string
  projet_id: string
  kiosk_id?: string            // id du kiosque si applicable
  platform: 'mobile' | 'web' | 'kiosk'
  from_node: string
  to_node: string
  from_label?: string
  to_label?: string
  mode: RouteMode
  length_m: number
  duration_s: number
  compute_ms: number
  /** Recalculé après déviation ? */
  recalculated: boolean
  /** Persona éventuelle. */
  persona?: string
  /** Langue choisie. */
  lang?: 'fr' | 'en' | 'dioula'
  /** Accessibilité PMR demandée. */
  pmr: boolean
  /** Session anonymisée. */
  session_hash: string
  created_at?: string
}

export interface UsageAggregates {
  totalRoutes: number
  avgLengthM: number
  avgDurationS: number
  avgComputeMs: number
  recalculationRate: number
  pmrRate: number
  byMode: Record<RouteMode, number>
  byPlatform: Record<'mobile' | 'web' | 'kiosk', number>
  byKiosk: Array<{ kioskId: string; count: number }>
  topDestinations: Array<{ label: string; count: number }>
  hourlyDistribution: Array<{ hour: number; count: number }>
}

// ─── Session hash (anonymisation) ─────────────────

function makeSessionHash(): string {
  // Rotation quotidienne + random → non traçant individuellement
  const date = new Date().toISOString().slice(0, 10)
  const rnd = Math.random().toString(36).slice(2, 8)
  return `sh-${date}-${rnd}`
}

let currentSessionHash: string | null = null
function getSessionHash(): string {
  if (!currentSessionHash) currentSessionHash = makeSessionHash()
  return currentSessionHash
}

// ─── Enregistrement ────────────────────────────────

export async function logRouteUsage(input: {
  projetId: string
  kioskId?: string
  platform: 'mobile' | 'web' | 'kiosk'
  route: RouteResult
  fromLabel?: string
  toLabel?: string
  persona?: string
  lang?: 'fr' | 'en' | 'dioula'
  pmr?: boolean
  recalculated?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const entry: UsageLogEntry = {
    projet_id: input.projetId,
    kiosk_id: input.kioskId,
    platform: input.platform,
    from_node: input.route.nodeIds[0] ?? '',
    to_node: input.route.nodeIds[input.route.nodeIds.length - 1] ?? '',
    from_label: input.fromLabel,
    to_label: input.toLabel,
    mode: input.route.mode,
    length_m: input.route.lengthM,
    duration_s: input.route.durationS,
    compute_ms: input.route.computeTimeMs,
    recalculated: input.recalculated ?? false,
    persona: input.persona,
    lang: input.lang,
    pmr: input.pmr ?? false,
    session_hash: getSessionHash(),
  }

  if (isOfflineMode) {
    const key = 'atlas-wayfinder-usage-pending'
    const existing: UsageLogEntry[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    existing.unshift({ ...entry, id: `local-${Date.now()}` })
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 2000)))
    return { success: true }
  }

  const { error } = await supabase.from('wayfinder_usage_logs').insert(entry)
  if (error) {
     
    console.warn('[wayfinderUsageService] log failed:', error.message)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ─── Agrégation (analytics réels) ─────────────────

export async function aggregateUsage(
  projetId: string,
  opts?: { sinceDays?: number; kioskId?: string },
): Promise<UsageAggregates> {
  const loadLogs = async (): Promise<UsageLogEntry[]> => {
    if (isOfflineMode) {
      const all: UsageLogEntry[] = JSON.parse(localStorage.getItem('atlas-wayfinder-usage-pending') ?? '[]')
      return all.filter(l => l.projet_id === projetId)
    }
    const since = opts?.sinceDays
      ? new Date(Date.now() - opts.sinceDays * 24 * 3600 * 1000).toISOString()
      : undefined
    let q = supabase
      .from('wayfinder_usage_logs')
      .select('*')
      .eq('projet_id', projetId)
      .order('created_at', { ascending: false })
      .limit(5000)
    if (since) q = q.gte('created_at', since)
    if (opts?.kioskId) q = q.eq('kiosk_id', opts.kioskId)
    const { data, error } = await q
    if (error) {
       
      console.warn('[wayfinderUsageService] aggregate failed:', error.message)
      return []
    }
    return (data ?? []) as UsageLogEntry[]
  }

  const logs = await loadLogs()
  const total = logs.length
  if (total === 0) {
    return {
      totalRoutes: 0, avgLengthM: 0, avgDurationS: 0, avgComputeMs: 0,
      recalculationRate: 0, pmrRate: 0,
      byMode: { standard: 0, pmr: 0, fast: 0, discovery: 0, evacuation: 0 },
      byPlatform: { mobile: 0, web: 0, kiosk: 0 },
      byKiosk: [], topDestinations: [], hourlyDistribution: [],
    }
  }

  const sumLength = logs.reduce((s, l) => s + l.length_m, 0)
  const sumDuration = logs.reduce((s, l) => s + l.duration_s, 0)
  const sumCompute = logs.reduce((s, l) => s + l.compute_ms, 0)
  const recalcCount = logs.filter(l => l.recalculated).length
  const pmrCount = logs.filter(l => l.pmr).length

  const byMode: Record<RouteMode, number> = {
    standard: 0, pmr: 0, fast: 0, discovery: 0, evacuation: 0,
  }
  const byPlatform: Record<'mobile' | 'web' | 'kiosk', number> = {
    mobile: 0, web: 0, kiosk: 0,
  }
  const kioskCounts = new Map<string, number>()
  const destCounts = new Map<string, number>()
  const hourCounts = new Map<number, number>()

  for (const l of logs) {
    byMode[l.mode]++
    byPlatform[l.platform]++
    if (l.kiosk_id) kioskCounts.set(l.kiosk_id, (kioskCounts.get(l.kiosk_id) ?? 0) + 1)
    if (l.to_label) destCounts.set(l.to_label, (destCounts.get(l.to_label) ?? 0) + 1)
    if (l.created_at) {
      const hour = new Date(l.created_at).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
    }
  }

  return {
    totalRoutes: total,
    avgLengthM: sumLength / total,
    avgDurationS: sumDuration / total,
    avgComputeMs: sumCompute / total,
    recalculationRate: recalcCount / total,
    pmrRate: pmrCount / total,
    byMode, byPlatform,
    byKiosk: Array.from(kioskCounts.entries())
      .map(([kioskId, count]) => ({ kioskId, count }))
      .sort((a, b) => b.count - a.count),
    topDestinations: Array.from(destCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({
      hour: h, count: hourCounts.get(h) ?? 0,
    })),
  }
}
