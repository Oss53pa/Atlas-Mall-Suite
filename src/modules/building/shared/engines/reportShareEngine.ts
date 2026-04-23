// ═══ REPORT SHARE ENGINE — Envoi + tracking des rapports ═══
//
// Deux modes d'envoi :
//   1. E-mail : ouvre mailto: avec le HTML en PJ (ou lien téléchargement)
//   2. Lien partageable : uploade le rapport sur un hébergement simple
//      (Supabase Storage ou fallback local Blob URL) → retourne un shortlink
//
// Tracking :
//   • Création d'un ReportShare avec token unique
//   • Le HTML embarqué envoie des événements au webhook (opened, approved,
//     corrections_requested, commented)
//   • Store IndexedDB côté app → affiche l'état en temps réel dans l'UI admin

import Dexie, { type Table } from 'dexie'
import {
  syncToCloud, getActiveProjectId, pullReportShares, deleteReportShareCloud,
} from './supabaseVersioningSync'
import { hasConsent } from '../components/ConsentBanner'

async function maybeSyncEventToCloud(event: ShareEvent): Promise<void> {
  if (!hasConsent('analytics')) return
  await syncToCloud({ kind: 'event', event })
}

// ─── Types ────────────────────────────────────────────────

export type ShareChannel = 'email' | 'link'

export type ShareEventType =
  | 'sent' | 'opened' | 'approved' | 'corrections_requested' | 'commented' | 'expired'

export interface ShareEvent {
  id: string
  reportToken: string
  type: ShareEventType
  at: string
  /** Email/nom de l'acteur si connu. */
  actor?: string
  /** Contenu libre (commentaire). */
  comment?: string
  /** Métadonnées (IP, user-agent, etc.). */
  meta?: Record<string, unknown>
}

export interface ReportShare {
  /** Token unique — utilisé comme ID dans le HTML embarqué. */
  token: string
  /** Nom humain du rapport. */
  title: string
  /** Volume source. */
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  /** Destinataires (peuvent être multiples). */
  recipients: Array<{ name: string; email: string; role?: string }>
  /** Canal utilisé. */
  channel: ShareChannel
  /** URL du rapport (Blob URL local ou URL hébergée). */
  url: string
  /** HTML embarqué (pour réémission). */
  html: string
  /** Créé le. */
  createdAt: string
  /** Expire le (optionnel). */
  expiresAt?: string
  /** État courant agrégé. */
  status: 'draft' | 'sent' | 'opened' | 'approved' | 'rejected' | 'commented' | 'expired'
  /** Historique des événements. */
  events: ShareEvent[]
}

// ─── IndexedDB (tracking local) ───────────────────────────

class ReportSharesDB extends Dexie {
  shares!: Table<ReportShare, string>
  events!: Table<ShareEvent, string>
  constructor() {
    super('atlas-report-shares')
    this.version(1).stores({
      shares: 'token, volumeId, createdAt, status',
      events: 'id, reportToken, at, type',
    })
  }
}

const db = new ReportSharesDB()

// ─── Création d'un partage ────────────────────────────────

export interface CreateShareInput {
  title: string
  volumeId: 'vol1' | 'vol2' | 'vol3' | 'vol4'
  recipients: Array<{ name: string; email: string; role?: string }>
  channel: ShareChannel
  html: string
  expiresAtDays?: number
}

export async function createReportShare(input: CreateShareInput): Promise<ReportShare> {
  const token = generateToken()
  const now = new Date()
  const url = await publishReport(input.html, token, input.channel)
  const share: ReportShare = {
    token,
    title: input.title,
    volumeId: input.volumeId,
    recipients: input.recipients,
    channel: input.channel,
    url,
    html: input.html,
    createdAt: now.toISOString(),
    expiresAt: input.expiresAtDays
      ? new Date(now.getTime() + input.expiresAtDays * 864e5).toISOString()
      : undefined,
    status: 'draft',
    events: [],
  }
  await db.shares.put(share)
  void syncToCloud({ kind: 'share', share, projetId: getActiveProjectId() })
  return share
}

function generateToken(): string {
  const rand = new Uint8Array(12)
  if (typeof crypto !== 'undefined') crypto.getRandomValues(rand)
  else for (let i = 0; i < rand.length; i++) rand[i] = Math.floor(Math.random() * 256)
  return 'rpt_' + Array.from(rand).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Publication (stub extensible) ────────────────────────

/**
 * Publie le rapport HTML et retourne une URL accessible.
 * Stratégie par défaut : Blob URL local (valable tant que l'onglet est ouvert).
 * Pour un lien durable, connecter un backend (Supabase Storage, S3, etc.).
 */
async function publishReport(html: string, _token: string, _channel: ShareChannel): Promise<string> {
  // Implémentation locale (Blob URL)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  return URL.createObjectURL(blob)
}

// ─── Envoi par email (mailto) ─────────────────────────────

export async function sendByEmail(share: ReportShare, options?: {
  /** Corps du mail complémentaire. */
  bodyPrefix?: string
  /** Inclure le HTML en texte (attention : long). */
  inlineHtml?: boolean
}): Promise<void> {
  const to = share.recipients.map(r => r.email).filter(Boolean).join(',')
  const subject = `Rapport à valider — ${share.title}`
  const body = [
    options?.bodyPrefix ?? `Bonjour,\n\nVeuillez trouver ci-après le rapport « ${share.title} » généré par Atlas BIM.`,
    '',
    `Lien du rapport : ${share.url}`,
    '',
    `Token de référence : ${share.token}`,
    '',
    '— Atlas BIM / PROPH3T',
  ].join('\n')

  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailtoUrl

  await trackEvent(share.token, 'sent', { channel: 'email' })
  await updateShareStatus(share.token, 'sent')
}

// ─── Envoi par lien ───────────────────────────────────────

export async function sendByLink(share: ReportShare): Promise<string> {
  await trackEvent(share.token, 'sent', { channel: 'link' })
  await updateShareStatus(share.token, 'sent')
  // Copie automatique dans le presse-papier
  try {
    await navigator.clipboard.writeText(share.url)
  } catch { /* ignore */ }
  return share.url
}

// ─── Tracking ─────────────────────────────────────────────

export async function trackEvent(
  reportToken: string,
  type: ShareEventType,
  meta?: Record<string, unknown>,
  actor?: string,
  comment?: string,
): Promise<void> {
  const event: ShareEvent = {
    id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    reportToken,
    type,
    at: new Date().toISOString(),
    actor, comment, meta,
  }
  await db.events.put(event)
  // Cloud sync : uniquement si consentement analytics donné (RGPD)
  void maybeSyncEventToCloud(event)

  // Met à jour l'état agrégé du share
  const share = await db.shares.get(reportToken)
  if (share) {
    const nextStatus: ReportShare['status'] =
      type === 'approved' ? 'approved'
      : type === 'corrections_requested' ? 'rejected'
      : type === 'commented' ? 'commented'
      : type === 'opened' && share.status === 'sent' ? 'opened'
      : type === 'expired' ? 'expired'
      : share.status
    share.events = [...share.events, event]
    share.status = nextStatus
    await db.shares.put(share)
  }
}

async function updateShareStatus(token: string, status: ReportShare['status']): Promise<void> {
  const s = await db.shares.get(token)
  if (!s) return
  s.status = status
  await db.shares.put(s)
}

// ─── Lecture / administration ─────────────────────────────

export async function listReportShares(volumeId?: string): Promise<ReportShare[]> {
  const all = volumeId
    ? await db.shares.where('volumeId').equals(volumeId).toArray()
    : await db.shares.toArray()
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getReportShare(token: string): Promise<ReportShare | null> {
  return (await db.shares.get(token)) ?? null
}

export async function getShareEvents(token: string): Promise<ShareEvent[]> {
  return db.events.where('reportToken').equals(token).toArray()
}

export async function deleteReportShare(token: string): Promise<void> {
  await db.shares.delete(token)
  await db.events.where('reportToken').equals(token).delete()
  void deleteReportShareCloud(token)
}

/** Pull non-destructif : merge les shares du cloud absents localement. */
export async function pullSharesFromCloud(volumeId?: string): Promise<number> {
  const cloud = await pullReportShares(getActiveProjectId(), volumeId)
  let merged = 0
  for (const share of cloud) {
    const existing = await db.shares.get(share.token)
    if (!existing) {
      await db.shares.put(share)
      // Push également les events
      for (const e of share.events) {
        const existingEvent = await db.events.get(e.id)
        if (!existingEvent) await db.events.put(e)
      }
      merged++
    }
  }
  return merged
}

// ─── Webhook receiver ─────────────────────────────────────

/**
 * Route webhook côté client (pour dev local) : parse un event POST entrant
 * et le transforme en trackEvent. À connecter à un Express/Netlify endpoint
 * en production.
 */
export async function handleWebhookPayload(raw: unknown): Promise<boolean> {
  if (typeof raw !== 'object' || !raw) return false
  const obj = raw as Record<string, unknown>
  const token = typeof obj.token === 'string' ? obj.token : null
  const event = typeof obj.event === 'string' ? obj.event as ShareEventType : null
  if (!token || !event) return false
  const validEvents: ShareEventType[] = ['sent', 'opened', 'approved', 'corrections_requested', 'commented', 'expired']
  if (!validEvents.includes(event)) return false

  await trackEvent(token, event, undefined, typeof obj.actor === 'string' ? obj.actor : undefined,
    typeof obj.comment === 'string' ? obj.comment : undefined)
  return true
}

// ─── Stats globales ───────────────────────────────────────

export interface SharesSummary {
  total: number
  byStatus: Record<ReportShare['status'], number>
  avgResponseTimeMinutes: number
  approvalRate: number
}

export async function getSharesSummary(volumeId?: string): Promise<SharesSummary> {
  const shares = await listReportShares(volumeId)
  const byStatus: SharesSummary['byStatus'] = {
    draft: 0, sent: 0, opened: 0, approved: 0, rejected: 0, commented: 0, expired: 0,
  }
  for (const s of shares) byStatus[s.status]++

  const responded = shares.filter(s => ['approved', 'rejected', 'commented'].includes(s.status))
  let totalResponseMs = 0
  for (const s of responded) {
    const firstResponse = s.events.find(e => e.type === 'approved' || e.type === 'corrections_requested' || e.type === 'commented')
    if (firstResponse) {
      totalResponseMs += new Date(firstResponse.at).getTime() - new Date(s.createdAt).getTime()
    }
  }

  return {
    total: shares.length,
    byStatus,
    avgResponseTimeMinutes: responded.length > 0 ? totalResponseMs / responded.length / 60000 : 0,
    approvalRate: shares.length > 0 ? byStatus.approved / shares.length : 0,
  }
}
