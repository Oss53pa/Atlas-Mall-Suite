// ═══ SUPABASE SYNC — Plan versions + Report shares ═══
//
// Miroir bidirectionnel entre IndexedDB local (source de vérité offline) et
// Supabase (source de vérité cloud, partage inter-collaborateurs).
//
// Stratégie :
//   • Écriture : always local-first, puis best-effort cloud push (fire-and-forget)
//   • Lecture  : local d'abord ; pull cloud sur demande (refresh button UI)
//   • Conflits : version la plus récente (updated_at) gagne
//   • Offline  : fonctionne en dégradé — les ops cloud sont queued et rejouées

import { supabase } from '../../../../lib/supabase'
import { isSupabaseConfigured } from '../supabaseSync'
import type { PlanVersion } from './planVersioningEngine'
import type { ReportShare, ShareEvent } from './reportShareEngine'

// ═══ PLAN VERSIONS ═══

interface DbPlanVersion {
  id: string
  projet_id: string
  plan_id: string
  version_number: number
  snapshot: unknown
  author: string
  author_email: string | null
  message: string
  tag: string | null
  size_bytes: number | null
  created_at: string
}

function toDbVersion(v: PlanVersion, projetId: string): DbPlanVersion {
  return {
    id: v.id,
    projet_id: projetId,
    plan_id: v.planId,
    version_number: v.versionNumber,
    snapshot: v.snapshot as unknown,
    author: v.author,
    author_email: v.authorEmail ?? null,
    message: v.message,
    tag: v.tag ?? null,
    size_bytes: v.sizeBytes,
    created_at: v.createdAt,
  }
}

function fromDbVersion(row: DbPlanVersion): PlanVersion {
  return {
    id: row.id,
    planId: row.plan_id,
    versionNumber: row.version_number,
    snapshot: row.snapshot as PlanVersion['snapshot'],
    author: row.author,
    authorEmail: row.author_email ?? undefined,
    message: row.message,
    tag: row.tag ?? undefined,
    sizeBytes: row.size_bytes ?? 0,
    createdAt: row.created_at,
  }
}

/** Push une version locale vers Supabase (fire-and-forget). */
export async function pushPlanVersion(version: PlanVersion, projetId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('plan_versions').upsert(toDbVersion(version, projetId))
    if (error) {
      console.warn('[VersioningSync] push failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[VersioningSync] push error:', err)
    return false
  }
}

/** Pull les versions cloud d'un plan (retourne vide si Supabase indispo). */
export async function pullPlanVersions(planId: string): Promise<PlanVersion[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('plan_versions')
      .select('*')
      .eq('plan_id', planId)
      .order('version_number', { ascending: false })
    if (error) {
      console.warn('[VersioningSync] pull failed:', error.message)
      return []
    }
    return (data as DbPlanVersion[]).map(fromDbVersion)
  } catch (err) {
    console.warn('[VersioningSync] pull error:', err)
    return []
  }
}

export async function deletePlanVersionCloud(versionId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('plan_versions').delete().eq('id', versionId)
    if (error) return false
    return true
  } catch { return false }
}

// ═══ REPORT SHARES ═══

interface DbReportShare {
  token: string
  projet_id: string
  volume_id: string
  title: string
  channel: string
  recipients: unknown
  url: string | null
  html: string | null
  status: string
  created_at: string
  expires_at: string | null
  updated_at: string
}

function toDbShare(s: ReportShare, projetId: string): DbReportShare {
  return {
    token: s.token,
    projet_id: projetId,
    volume_id: s.volumeId,
    title: s.title,
    channel: s.channel,
    recipients: s.recipients,
    url: s.url ?? null,
    html: s.html ?? null,
    status: s.status,
    created_at: s.createdAt,
    expires_at: s.expiresAt ?? null,
    updated_at: new Date().toISOString(),
  }
}

function fromDbShare(row: DbReportShare, events: ShareEvent[] = []): ReportShare {
  return {
    token: row.token,
    title: row.title,
    volumeId: row.volume_id as ReportShare['volumeId'],
    recipients: (row.recipients as ReportShare['recipients']) ?? [],
    channel: row.channel as ReportShare['channel'],
    url: row.url ?? '',
    html: row.html ?? '',
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    status: row.status as ReportShare['status'],
    events,
  }
}

export async function pushReportShare(share: ReportShare, projetId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('report_shares').upsert(toDbShare(share, projetId))
    if (error) {
      console.warn('[VersioningSync] report push failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('[VersioningSync] report push error:', err)
    return false
  }
}

export async function pullReportShares(projetId: string, volumeId?: string): Promise<ReportShare[]> {
  if (!isSupabaseConfigured()) return []
  try {
    let query = supabase.from('report_shares').select('*').eq('projet_id', projetId)
    if (volumeId) query = query.eq('volume_id', volumeId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return []
    const rows = data as DbReportShare[]
    // Pull events en lot pour chaque share
    const withEvents: ReportShare[] = []
    for (const row of rows) {
      const events = await pullShareEvents(row.token)
      withEvents.push(fromDbShare(row, events))
    }
    return withEvents
  } catch { return [] }
}

export async function deleteReportShareCloud(token: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('report_shares').delete().eq('token', token)
    return !error
  } catch { return false }
}

// ═══ SHARE EVENTS ═══

interface DbShareEvent {
  id: string
  report_token: string
  type: string
  actor: string | null
  comment: string | null
  meta: unknown
  at: string
}

function toDbEvent(e: ShareEvent): DbShareEvent {
  return {
    id: e.id,
    report_token: e.reportToken,
    type: e.type,
    actor: e.actor ?? null,
    comment: e.comment ?? null,
    meta: e.meta ?? null,
    at: e.at,
  }
}

function fromDbEvent(row: DbShareEvent): ShareEvent {
  return {
    id: row.id,
    reportToken: row.report_token,
    type: row.type as ShareEvent['type'],
    actor: row.actor ?? undefined,
    comment: row.comment ?? undefined,
    meta: (row.meta as Record<string, unknown>) ?? undefined,
    at: row.at,
  }
}

export async function pushShareEvent(event: ShareEvent): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  try {
    const { error } = await supabase.from('share_events').upsert(toDbEvent(event))
    if (error) return false
    return true
  } catch { return false }
}

export async function pullShareEvents(token: string): Promise<ShareEvent[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase
      .from('share_events')
      .select('*')
      .eq('report_token', token)
      .order('at', { ascending: true })
    if (error) return []
    return (data as DbShareEvent[]).map(fromDbEvent)
  } catch { return [] }
}

// ═══ SYNC HELPER — push local → cloud on write ═══

/**
 * Helper centralisant les 3 cas d'écriture.
 * À appeler depuis l'engine IndexedDB après une écriture locale réussie.
 */
export async function syncToCloud(payload:
  | { kind: 'version'; version: PlanVersion; projetId: string }
  | { kind: 'share'; share: ReportShare; projetId: string }
  | { kind: 'event'; event: ShareEvent }
): Promise<boolean> {
  switch (payload.kind) {
    case 'version': return pushPlanVersion(payload.version, payload.projetId)
    case 'share':   return pushReportShare(payload.share, payload.projetId)
    case 'event':   return pushShareEvent(payload.event)
  }
}

// ═══ Projet ID courant ═══

/** Récupère l'ID du projet actif (depuis onboarding ou localStorage). */
export function getActiveProjectId(): string {
  try {
    const raw = localStorage.getItem('cosmos-onboarding-v1')
    if (raw) {
      const p = JSON.parse(raw)
      return p?.state?.projectId ?? p?.state?.projectName ?? 'cosmos-angre'
    }
  } catch { /* ignore */ }
  return 'cosmos-angre'
}
