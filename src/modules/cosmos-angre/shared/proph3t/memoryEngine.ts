import type { ProPh3tMemory, ProjectMemorySummary } from './types'

// ═══ MÉMOIRE IN-MEMORY (MOCK — sera connecté à Supabase) ═══

let memoryStore: ProPh3tMemory[] = []
let sessionId = `session-${Date.now()}`

export function resetSession(): void {
  sessionId = `session-${Date.now()}`
}

export function getSessionId(): string {
  return sessionId
}

// ═══ ENREGISTREMENT D'ÉVÉNEMENTS ═══

export async function logEvent(event: Omit<ProPh3tMemory, 'id' | 'timestamp'>): Promise<void> {
  const entry: ProPh3tMemory = {
    ...event,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  }
  memoryStore.push(entry)
}

// ═══ CHARGEMENT MÉMOIRE PROJET ═══

export async function loadProjectMemory(projectId: string): Promise<ProjectMemorySummary> {
  const projectEvents = memoryStore.filter(m => m.projectId === projectId)

  const sessions = new Set(projectEvents.map(m => m.sessionId))

  const keyDecisions = projectEvents
    .filter(m => m.impactMetric)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10)

  const unresolvedAlerts = projectEvents.filter(m => m.eventType === 'alert_ignored')

  // Construire les métriques d'évolution
  const coverageEvents = projectEvents
    .filter(m => m.impactMetric?.includes('couverture') || m.impactMetric?.includes('coverage'))
    .map(m => ({
      date: m.timestamp.split('T')[0],
      coverage: parseFloat(m.impactMetric?.match(/(\d+)%/)?.[1] ?? '0'),
    }))

  const scoreEvents = projectEvents
    .filter(m => m.eventType === 'analysis')
    .map(m => ({
      date: m.timestamp.split('T')[0],
      score: parseFloat(m.impactMetric?.match(/score\s*:?\s*(\d+)/i)?.[1] ?? '0'),
    }))

  const narrative = generateMemoryNarrative({
    totalSessions: sessions.size,
    lastActivity: projectEvents[projectEvents.length - 1]?.timestamp ?? '',
    keyDecisions,
    unresolvedAlerts,
    progressMetrics: {
      coverageEvolution: coverageEvents,
      scoreEvolution: scoreEvents,
      capexEvolution: [],
    },
    proph3tNarrative: '',
  })

  return {
    totalSessions: sessions.size,
    lastActivity: projectEvents[projectEvents.length - 1]?.timestamp ?? new Date().toISOString(),
    keyDecisions,
    unresolvedAlerts,
    progressMetrics: {
      coverageEvolution: coverageEvents,
      scoreEvolution: scoreEvents,
      capexEvolution: [],
    },
    proph3tNarrative: narrative,
  }
}

// ═══ ALERTES NON RÉSOLUES ═══

export async function getUnresolvedAlerts(projectId: string): Promise<ProPh3tMemory[]> {
  return memoryStore.filter(
    m => m.projectId === projectId && m.eventType === 'alert_ignored'
  )
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
  return memoryStore.filter(
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
  const events = memoryStore.filter(m => m.projectId === projectId)
  const byType: Record<string, number> = {}
  const byEntity: Record<string, number> = {}

  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1
    byEntity[e.entityType] = (byEntity[e.entityType] ?? 0) + 1
  }

  return { totalEvents: events.length, byType, byEntity }
}
