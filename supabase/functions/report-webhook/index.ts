// ═══ Supabase Edge Function — report-webhook ═══
//
// Endpoint public qui reçoit les événements envoyés par le HTML autonome
// (boutons Valider / Corrections / Commenter dans `reportHtmlExporter`).
//
// Déploiement :
//   supabase functions deploy report-webhook --no-verify-jwt
//
// URL publique :
//   https://<project-ref>.supabase.co/functions/v1/report-webhook
//
// Cette URL est injectée comme `feedbackWebhookUrl` dans le HTML embarqué
// via `buildReportHtml({ feedbackWebhookUrl: ... })`.
//
// Payload attendu (POST JSON) :
//   { event: 'opened' | 'approved' | 'corrections_requested' | 'commented',
//     token: 'rpt_xxxxxxxx',
//     at?: '<ISO date>',
//     comment?: '<texte>',
//     actor?: '<email/nom>' }

/// <reference lib="deno.ns" />

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — npm: specifier résolu par Deno dans l'Edge Runtime
import { createClient } from 'npm:@supabase/supabase-js@2'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { rateLimitResponse } from '../_shared/rateLimit.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')         as string
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string

// CORS : autorise le HTML généré à nous appeler depuis n'importe quelle origine
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type ValidEvent = 'sent' | 'opened' | 'approved' | 'corrections_requested' | 'commented' | 'expired'
const VALID_EVENTS: readonly ValidEvent[] = [
  'sent', 'opened', 'approved', 'corrections_requested', 'commented', 'expired',
]

interface WebhookPayload {
  event?: string
  token?: string
  at?: string
  actor?: string
  comment?: string
  meta?: Record<string, unknown>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed')
  }

  // Rate limiting : 30 req/min par IP sur ce webhook public
  const throttled = rateLimitResponse(req, 'report-webhook', { max: 30, windowMs: 60_000 }, CORS_HEADERS)
  if (throttled) return throttled

  // Parse JSON body
  let body: WebhookPayload
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'invalid_json')
  }

  const token = typeof body.token === 'string' ? body.token : null
  const event = typeof body.event === 'string' ? body.event : null
  if (!token || !event) return jsonError(400, 'missing_token_or_event')
  if (!VALID_EVENTS.includes(event as ValidEvent)) {
    return jsonError(400, 'invalid_event_type')
  }

  // Vérifie que le token existe (sinon = injection tentative)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: share, error: shareErr } = await supabase
    .from('report_shares')
    .select('token, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (shareErr || !share) {
    return jsonError(404, 'share_not_found')
  }

  // Vérifie expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return jsonError(410, 'share_expired')
  }

  // Déduplication "opened" : ne compte qu'un open par IP/jour
  if (event === 'opened') {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('share_events')
      .select('id', { count: 'exact', head: true })
      .eq('report_token', token)
      .eq('type', 'opened')
      .gte('at', todayStart.toISOString())
      .ilike('meta->>ip', ip)

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: 'already_opened_today' }), {
        headers: CORS_HEADERS, status: 200,
      })
    }
  }

  // Insère l'événement ; le trigger DB met à jour status du share
  const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  const { error: insertErr } = await supabase.from('share_events').insert({
    id: eventId,
    report_token: token,
    type: event,
    actor: body.actor ?? null,
    comment: body.comment ?? null,
    meta: {
      ...(body.meta ?? {}),
      ip: req.headers.get('x-forwarded-for'),
      ua: req.headers.get('user-agent'),
    },
    at: body.at ?? new Date().toISOString(),
  })

  if (insertErr) {
    console.error('[webhook] insert failed:', insertErr.message)
    return jsonError(500, 'insert_failed')
  }

  return new Response(
    JSON.stringify({ ok: true, eventId, event, token }),
    { headers: CORS_HEADERS, status: 200 },
  )
})

function jsonError(status: number, code: string): Response {
  return new Response(JSON.stringify({ ok: false, error: code }), {
    status, headers: CORS_HEADERS,
  })
}
