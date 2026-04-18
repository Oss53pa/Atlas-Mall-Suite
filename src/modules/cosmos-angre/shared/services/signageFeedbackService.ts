// ═══ SIGNAGE FEEDBACK SERVICE ═══
//
// Pipeline feedback terrain :
//   1. Pour chaque panneau, on génère un QR code pointant vers une URL mobile
//      qui contient l'id du projet + l'id du panneau en paramètres.
//   2. Un agent sur site scanne → page mobile → formulaire "statut du panneau".
//   3. Le form POST vers Supabase (table signage_feedback, RLS insertion publique).
//   4. Le manager consulte les signalements via listFeedback() / useSignageFeedback().
//
// Offline-safe : si Supabase n'est pas configuré (isOfflineMode), les signalements
// sont stockés en localStorage + marqués pending pour synchronisation ultérieure.

import { supabase, isOfflineMode, LOCAL_USER } from '../../../../lib/supabase'

// ─── Types ─────────────────────────────────────────────

export type FeedbackStatus = 'ok' | 'illisible' | 'absent' | 'mal-oriente' | 'degrade' | 'obsolete' | 'autre'
export type FeedbackSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SignageFeedback {
  id: string
  projet_id: string
  panel_ref: string
  floor_id?: string | null
  x?: number | null
  y?: number | null
  panel_type?: string | null
  status: FeedbackStatus
  severity?: FeedbackSeverity | null
  note?: string | null
  photo_url?: string | null
  agent_name?: string | null
  agent_id?: string | null
  device_info?: Record<string, unknown> | null
  resolved: boolean
  resolved_at?: string | null
  resolved_by?: string | null
  resolution_note?: string | null
  created_at: string
}

export interface SubmitFeedbackInput {
  projet_id: string
  panel_ref: string
  floor_id?: string
  x?: number
  y?: number
  panel_type?: string
  status: FeedbackStatus
  severity?: FeedbackSeverity
  note?: string
  photoBlob?: Blob
  agent_name?: string
}

// ─── Génération QR ─────────────────────────────────────

export interface QrCodeParams {
  baseUrl: string          // ex: https://app.atlas-mall.ci/feedback
  projetId: string
  panelRef: string
  floorId?: string
  panelType?: string
  x?: number
  y?: number
}

/** Construit l'URL encodée dans le QR code pour un panneau. */
export function buildFeedbackUrl(params: QrCodeParams): string {
  const u = new URL(params.baseUrl)
  u.searchParams.set('p', params.projetId)
  u.searchParams.set('r', params.panelRef)
  if (params.floorId) u.searchParams.set('f', params.floorId)
  if (params.panelType) u.searchParams.set('t', params.panelType)
  if (params.x !== undefined) u.searchParams.set('x', params.x.toFixed(1))
  if (params.y !== undefined) u.searchParams.set('y', params.y.toFixed(1))
  return u.toString()
}

/** Parse l'URL scannée et extrait les paramètres. */
export function parseFeedbackUrl(url: string): QrCodeParams | null {
  try {
    const u = new URL(url)
    const projetId = u.searchParams.get('p')
    const panelRef = u.searchParams.get('r')
    if (!projetId || !panelRef) return null
    return {
      baseUrl: `${u.origin}${u.pathname}`,
      projetId,
      panelRef,
      floorId: u.searchParams.get('f') ?? undefined,
      panelType: u.searchParams.get('t') ?? undefined,
      x: u.searchParams.get('x') ? Number(u.searchParams.get('x')) : undefined,
      y: u.searchParams.get('y') ? Number(u.searchParams.get('y')) : undefined,
    }
  } catch {
    return null
  }
}

// ─── Submission (côté mobile via scan QR) ────────────

export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean; id?: string; error?: string }> {
  // Upload photo si fournie
  let photoUrl: string | null = null
  if (input.photoBlob && !isOfflineMode) {
    const filename = `${input.projet_id}/${input.panel_ref}-${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('signage-feedback-photos')
      .upload(filename, input.photoBlob, { cacheControl: '3600', upsert: false })
    if (!upErr) {
      const { data } = supabase.storage.from('signage-feedback-photos').getPublicUrl(filename)
      photoUrl = data.publicUrl
    }
  }

  const deviceInfo = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    ts: new Date().toISOString(),
  }

  if (isOfflineMode) {
    // Stockage pending en localStorage
    const id = `local-${crypto.randomUUID()}`
    const pending: SignageFeedback = {
      id,
      projet_id: input.projet_id,
      panel_ref: input.panel_ref,
      floor_id: input.floor_id,
      x: input.x,
      y: input.y,
      panel_type: input.panel_type,
      status: input.status,
      severity: input.severity,
      note: input.note,
      photo_url: null,
      agent_name: input.agent_name,
      agent_id: LOCAL_USER.id,
      device_info: deviceInfo,
      resolved: false,
      created_at: new Date().toISOString(),
    }
    const key = 'atlas-signage-feedback-pending'
    const existing: SignageFeedback[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    existing.unshift(pending)
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 500)))
    return { success: true, id }
  }

  const { data, error } = await supabase
    .from('signage_feedback')
    .insert({
      projet_id: input.projet_id,
      panel_ref: input.panel_ref,
      floor_id: input.floor_id,
      x: input.x,
      y: input.y,
      panel_type: input.panel_type,
      status: input.status,
      severity: input.severity ?? (input.status === 'absent' ? 'high' : input.status === 'ok' ? 'low' : 'medium'),
      note: input.note,
      photo_url: photoUrl,
      agent_name: input.agent_name,
      device_info: deviceInfo,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, id: data!.id }
}

// ─── Lecture (côté manager) ──────────────────────────

export async function listFeedback(projetId: string, opts?: {
  unresolvedOnly?: boolean
  limit?: number
}): Promise<SignageFeedback[]> {
  if (isOfflineMode) {
    const pending: SignageFeedback[] = JSON.parse(
      localStorage.getItem('atlas-signage-feedback-pending') ?? '[]',
    )
    return pending
      .filter(f => f.projet_id === projetId)
      .filter(f => !opts?.unresolvedOnly || !f.resolved)
      .slice(0, opts?.limit ?? 100)
  }

  let q = supabase
    .from('signage_feedback')
    .select('*')
    .eq('projet_id', projetId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100)

  if (opts?.unresolvedOnly) {
    q = q.eq('resolved', false)
  }

  const { data, error } = await q
  if (error) {
     
    console.warn('[signageFeedbackService] list failed:', error.message)
    return []
  }
  return (data ?? []) as SignageFeedback[]
}

export async function resolveFeedback(
  feedbackId: string,
  resolutionNote?: string,
): Promise<boolean> {
  if (isOfflineMode) {
    const key = 'atlas-signage-feedback-pending'
    const pending: SignageFeedback[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const idx = pending.findIndex(f => f.id === feedbackId)
    if (idx < 0) return false
    pending[idx].resolved = true
    pending[idx].resolved_at = new Date().toISOString()
    pending[idx].resolution_note = resolutionNote
    localStorage.setItem(key, JSON.stringify(pending))
    return true
  }

  const { error } = await supabase
    .from('signage_feedback')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: (await supabase.auth.getUser()).data.user?.id,
      resolution_note: resolutionNote,
    })
    .eq('id', feedbackId)

  return !error
}

// ─── Synchronisation des feedback pending (offline → online) ──

export async function syncPendingFeedback(): Promise<{ synced: number; failed: number }> {
  if (isOfflineMode) return { synced: 0, failed: 0 }
  const key = 'atlas-signage-feedback-pending'
  const pending: SignageFeedback[] = JSON.parse(localStorage.getItem(key) ?? '[]')
  let synced = 0
  let failed = 0

  for (const f of pending) {
    if (!f.id.startsWith('local-')) continue
    const { error } = await supabase.from('signage_feedback').insert({
      projet_id: f.projet_id,
      panel_ref: f.panel_ref,
      floor_id: f.floor_id,
      x: f.x,
      y: f.y,
      panel_type: f.panel_type,
      status: f.status,
      severity: f.severity,
      note: f.note,
      agent_name: f.agent_name,
      device_info: f.device_info,
    })
    if (error) failed++
    else synced++
  }

  // Nettoie les synced
  const remaining = pending.filter(f => !f.id.startsWith('local-') || failed === pending.length)
  localStorage.setItem(key, JSON.stringify(remaining))

  return { synced, failed }
}

// ─── Stats ────────────────────────────────────────────

export interface FeedbackStats {
  total: number
  unresolved: number
  byStatus: Record<FeedbackStatus, number>
  bySeverity: Record<FeedbackSeverity, number>
  lastUpdate?: string
}

export async function computeFeedbackStats(projetId: string): Promise<FeedbackStats> {
  const all = await listFeedback(projetId, { limit: 500 })
  const byStatus: Record<FeedbackStatus, number> = {
    ok: 0, illisible: 0, absent: 0, 'mal-oriente': 0, degrade: 0, obsolete: 0, autre: 0,
  }
  const bySeverity: Record<FeedbackSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 }
  let unresolved = 0
  for (const f of all) {
    byStatus[f.status]++
    if (f.severity) bySeverity[f.severity]++
    if (!f.resolved) unresolved++
  }
  return {
    total: all.length,
    unresolved,
    byStatus,
    bySeverity,
    lastUpdate: all[0]?.created_at,
  }
}
