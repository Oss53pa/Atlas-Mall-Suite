import { supabase } from '../../../../lib/supabase'
import type { ProPh3tMemory, ProjectMemorySummary } from './types'

// ═══ MÉMOIRE PROPH3T — Supabase avec fallback in-memory ═══

const TABLE = 'proph3t_memory'

// Fallback in-memory store when Supabase is unreachable
let fallbackStore: ProPh3tMemory[] = []
let supabaseAvailable: boolean | null = null // null = not checked yet

let sessionId = `session-${Date.now()}`

export function resetSession(): void {
  sessionId = `session-${Date.now()}`
}

export function getSessionId(): string {
  return sessionId
}

// ═══ CONNECTIVITY CHECK ═══

async function isSupabaseReachable(): Promise<boolean> {
  if (supabaseAvailable !== null) return supabaseAvailable

  try {
    const { error } = await supabase
      .from(TABLE)
      .select('id')
      .limit(1)

    supabaseAvailable = !error
  } catch {
    supabaseAvailable = false
  }

  return supabaseAvailable
}

// ═══ DB ROW ↔ DOMAIN MAPPING ═══

interface MemoryRow {
  id: string
  projet_id: string
  session_id: string
  user_id?: string
  event_type: string
  entity_type: string
  entity_id: string
  description: string
  impact_metric?: string
  floor_level?: string
  created_at: string
}

function rowToDomain(row: MemoryRow): ProPh3tMemory {
  return {
    id: row.id,
    projectId: row.projet_id,
    sessionId: row.session_id,
    timestamp: row.created_at,
    eventType: row.event_type as ProPh3tMemory['eventType'],
    entityType: row.entity_type as ProPh3tMemory['entityType'],
    entityId: row.entity_id,
    description: row.description,
    impactMetric: row.impact_metric ?? undefined,
    userId: row.user_id ?? undefined,
  }
}

function domainToRow(entry: ProPh3tMemory): Omit<MemoryRow, 'id' | 'created_at'> {
  return {
    projet_id: entry.projectId,
    session_id: entry.sessionId,
    user_id: entry.userId,
    event_type: entry.eventType,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    description: entry.description,
    impact_metric: entry.impactMetric,
  }
}

// ═══ ENREGISTREMENT D'ÉVÉNEMENTS ═══

export async function logEvent(event: Omit<ProPh3tMemory, 'id' | 'timestamp'>): Promise<void> {
  const entry: ProPh3tMemory = {
    ...event,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  }

  // Always store in fallback for immediate availability
  fallbackStore.push(entry)

  // Try Supabase persist
  if (await isSupabaseReachable()) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .insert(domainToRow(entry))

      if (error) {
        console.warn('[Proph3t Memory] Supabase insert failed, using fallback:', error.message)
      }
    } catch (err) {
      console.warn('[Proph3t Memory] Supabase unreachable, using fallback:', err)
      supabaseAvailable = false
    }
  }
}

// ═══ CHARGEMENT MÉMOIRE PROJET ═══

export async function loadProjectMemory(projectId: string): Promise<ProjectMemorySummary> {
  let events: ProPh3tMemory[] = []

  if (await isSupabaseReachable()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('projet_id', projectId)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) {
        events = (data as MemoryRow[]).map(rowToDomain)
      } else {
        // Fallback to in-memory
        events = fallbackStore.filter(m => m.projectId === projectId)
      }
    } catch {
      events = fallbackStore.filter(m => m.projectId === projectId)
      supabaseAvailable = false
    }
  } else {
    events = fallbackStore.filter(m => m.projectId === projectId)
  }

  // Reverse to chronological order for processing
  const chronological = [...events].reverse()

  const sessions = new Set(chronological.map(m => m.sessionId))

  const keyDecisions = chronological
    .filter(m => m.impactMetric)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10)

  const unresolvedAlerts = chronological.filter(m => m.eventType === 'alert_ignored')

  const coverageEvolution = chronological
    .filter(m => m.impactMetric?.includes('couverture') || m.impactMetric?.includes('coverage'))
    .map(m => ({
      date: m.timestamp.split('T')[0],
      coverage: parseFloat(m.impactMetric?.match(/(\d+)%/)?.[1] ?? '0'),
    }))

  const scoreEvolution = chronological
    .filter(m => m.eventType === 'analysis')
    .map(m => ({
      date: m.timestamp.split('T')[0],
      score: parseFloat(m.impactMetric?.match(/score\s*:?\s*(\d+)/i)?.[1] ?? '0'),
    }))

  const narrative = generateMemoryNarrative({
    totalSessions: sessions.size,
    lastActivity: chronological[chronological.length - 1]?.timestamp ?? '',
    keyDecisions,
    unresolvedAlerts,
    progressMetrics: {
      coverageEvolution,
      scoreEvolution,
      capexEvolution: [],
    },
    proph3tNarrative: '',
  })

  return {
    totalSessions: sessions.size,
    lastActivity: chronological[chronological.length - 1]?.timestamp ?? new Date().toISOString(),
    keyDecisions,
    unresolvedAlerts,
    progressMetrics: {
      coverageEvolution,
      scoreEvolution,
      capexEvolution: [],
    },
    proph3tNarrative: narrative,
  }
}

// ═══ CONTEXTE MÉMOIRE POUR CLAUDE ═══

export async function getMemoryContext(
  projectId: string,
  contextType?: string,
  limit = 20
): Promise<ProPh3tMemory[]> {
  if (await isSupabaseReachable()) {
    try {
      let query = supabase
        .from(TABLE)
        .select('*')
        .eq('projet_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (contextType) {
        query = query.eq('event_type', contextType)
      }

      const { data, error } = await query

      if (!error && data) {
        return (data as MemoryRow[]).map(rowToDomain)
      }
    } catch {
      supabaseAvailable = false
    }
  }

  // Fallback
  let filtered = fallbackStore.filter(m => m.projectId === projectId)
  if (contextType) {
    filtered = filtered.filter(m => m.eventType === contextType)
  }
  return filtered.slice(-limit).reverse()
}

// ═══ ALERTES NON RÉSOLUES ═══

export async function getUnresolvedAlerts(projectId: string): Promise<ProPh3tMemory[]> {
  if (await isSupabaseReachable()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('projet_id', projectId)
        .eq('event_type', 'alert_ignored')
        .order('created_at', { ascending: false })

      if (!error && data) {
        return (data as MemoryRow[]).map(rowToDomain)
      }
    } catch {
      supabaseAvailable = false
    }
  }

  return fallbackStore.filter(
    m => m.projectId === projectId && m.eventType === 'alert_ignored'
  )
}

// ═══ NETTOYAGE SESSION ═══

export async function clearSessionMemory(sid: string): Promise<void> {
  // Clear from fallback
  fallbackStore = fallbackStore.filter(m => m.sessionId !== sid)

  // Clear from Supabase
  if (await isSupabaseReachable()) {
    try {
      await supabase
        .from(TABLE)
        .delete()
        .eq('session_id', sid)
    } catch {
      supabaseAvailable = false
    }
  }
}

// ═══ SYNC FALLBACK → SUPABASE ═══

export async function syncFallbackToSupabase(): Promise<{ synced: number; failed: number }> {
  if (fallbackStore.length === 0) return { synced: 0, failed: 0 }

  // Re-check connectivity
  supabaseAvailable = null
  if (!(await isSupabaseReachable())) return { synced: 0, failed: fallbackStore.length }

  let synced = 0
  let failed = 0

  for (const entry of fallbackStore) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          { ...domainToRow(entry), created_at: entry.timestamp },
          { onConflict: 'id' }
        )

      if (error) {
        failed++
      } else {
        synced++
      }
    } catch {
      failed++
    }
  }

  // Clear synced entries from fallback
  if (synced > 0 && failed === 0) {
    fallbackStore = []
  }

  return { synced, failed }
}

// ═══ NARRATIVE MÉMOIRE ═══

export function generateMemoryNarrative(summary: ProjectMemorySummary): string {
  if (summary.totalSessions === 0) {
    return "C'est votre première session sur ce projet. Bienvenue ! Je suis Proph3t, votre expert vivant. Je mémoriserai chaque décision pour vous accompagner dans la durée."
  }

  const parts: string[] = []

  parts.push(`Depuis votre première session, vous avez effectué ${summary.totalSessions} session(s) de travail.`)

  if (summary.keyDecisions.length > 0) {
    const recentDecision = summary.keyDecisions[0]
    parts.push(`Dernière action significative : ${recentDecision.description}.`)
    if (recentDecision.impactMetric) {
      parts.push(`Impact : ${recentDecision.impactMetric}.`)
    }
  }

  if (summary.progressMetrics.coverageEvolution.length >= 2) {
    const first = summary.progressMetrics.coverageEvolution[0]
    const last = summary.progressMetrics.coverageEvolution[summary.progressMetrics.coverageEvolution.length - 1]
    parts.push(`La couverture caméra est passée de ${first.coverage}% à ${last.coverage}%.`)
  }

  if (summary.unresolvedAlerts.length > 0) {
    parts.push(`⚠️ ${summary.unresolvedAlerts.length} alerte(s) restent non résolues depuis ${summary.unresolvedAlerts.length > 1 ? 'plusieurs' : 'la dernière'} session(s).`)
    const oldest = summary.unresolvedAlerts[0]
    parts.push(`La plus ancienne : "${oldest.description}".`)
  }

  return parts.join(' ')
}

// ═══ RECHERCHE MÉMOIRE ═══

export function searchMemory(
  projectId: string,
  query: string
): ProPh3tMemory[] {
  const lower = query.toLowerCase()
  return fallbackStore.filter(
    m => m.projectId === projectId && (
      m.description.toLowerCase().includes(lower) ||
      m.entityType.includes(lower) ||
      m.eventType.includes(lower) ||
      (m.impactMetric?.toLowerCase().includes(lower) ?? false)
    )
  )
}

// ═══ STATISTIQUES MÉMOIRE ═══

export function getMemoryStats(projectId: string): {
  totalEvents: number
  byType: Record<string, number>
  byEntity: Record<string, number>
} {
  const events = fallbackStore.filter(m => m.projectId === projectId)
  const byType: Record<string, number> = {}
  const byEntity: Record<string, number> = {}

  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1
    byEntity[e.entityType] = (byEntity[e.entityType] ?? 0) + 1
  }

  return { totalEvents: events.length, byType, byEntity }
}
