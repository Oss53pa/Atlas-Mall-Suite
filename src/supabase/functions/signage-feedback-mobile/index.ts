// ═══ Edge Function : signage-feedback-mobile ═══
// Endpoint public (pas besoin d'auth) qui reçoit un POST depuis un téléphone
// ayant scanné un QR code sur un panneau physique.
//
// Écrit dans la table signage_feedback via le service_role key (bypass RLS).
//
// Paramètres attendus (JSON body) :
//   - projet_id     (uuid) *required
//   - panel_ref     (string) *required
//   - status        (enum : 'ok'|'illisible'|'absent'|'mal-oriente'|'degrade'|'obsolete'|'autre') *required
//   - floor_id      (string)
//   - x, y          (number)
//   - panel_type    (string)
//   - severity      (enum : 'low'|'medium'|'high'|'critical')
//   - note          (string)
//   - agent_name    (string)
//   - photo_base64  (string, PNG ou JPEG base64)
//
// Rate limit : max 30 req/min par IP (simple anti-spam en mémoire).

const ALLOWED_ORIGINS = ["*"] // Public depuis téléphone → autorise tout origin

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }
}

const VALID_STATUSES = new Set(['ok','illisible','absent','mal-oriente','degrade','obsolete','autre'])
const VALID_SEVERITIES = new Set(['low','medium','high','critical'])

// F-013 : rate limit persistant via table Postgres `request_log` (cf. migration 015).
// La Map JS precedente etait perdue au cold start Deno → bypass trivial.
const LIMIT = 30
const WINDOW_MS = 60_000
const ENDPOINT = 'signage-feedback-mobile'

async function rateLimitOk(ip: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !serviceKey) return true // fail-open si conf manquante

  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const headers = { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` }

  // Compte les requetes recentes pour cet IP
  const countRes = await fetch(
    `${supabaseUrl}/rest/v1/request_log?client_key=eq.${encodeURIComponent(ip)}&endpoint=eq.${ENDPOINT}&created_at=gte.${encodeURIComponent(since)}&select=id`,
    { headers: { ...headers, "Prefer": "count=exact" } }
  )
  const range = countRes.headers.get("content-range") ?? "0/0"
  const total = parseInt(range.split("/")[1] ?? "0", 10)
  if (total >= LIMIT) return false

  // Enregistre la requete (fire-and-forget — pas critique si echoue)
  void fetch(`${supabaseUrl}/rest/v1/request_log`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", "Prefer": "return=minimal" },
    body: JSON.stringify({ client_key: ip, endpoint: ENDPOINT }),
  }).catch(() => {})

  return true
}

interface FeedbackBody {
  projet_id?: string
  panel_ref?: string
  status?: string
  floor_id?: string
  x?: number
  y?: number
  panel_type?: string
  severity?: string
  note?: string
  agent_name?: string
  photo_base64?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  if (!(await rateLimitOk(ip))) {
    return new Response(JSON.stringify({ error: "Rate limit dépassé (30 req/min)" }),
      { status: 429, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  let body: FeedbackBody
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Corps JSON invalide" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  // ─── Validation ────
  if (!body.projet_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.projet_id)) {
    return new Response(JSON.stringify({ error: "projet_id manquant ou invalide (UUID attendu)" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }
  if (!body.panel_ref || body.panel_ref.length > 100) {
    return new Response(JSON.stringify({ error: "panel_ref manquant ou trop long" }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }
  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return new Response(JSON.stringify({ error: `status invalide — valeurs possibles : ${[...VALID_STATUSES].join(', ')}` }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }
  if (body.severity && !VALID_SEVERITIES.has(body.severity)) {
    return new Response(JSON.stringify({ error: `severity invalide — valeurs : ${[...VALID_SEVERITIES].join(', ')}` }),
      { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Configuration serveur incomplète" }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  // ─── Upload photo (si présente) ────
  let photoUrl: string | null = null
  if (body.photo_base64 && typeof body.photo_base64 === 'string') {
    try {
      const base64 = body.photo_base64.replace(/^data:image\/\w+;base64,/, '')
      if (base64.length > 5_000_000) { // ≈ 3.75 MB décodé max
        return new Response(JSON.stringify({ error: "Photo trop volumineuse (> 3,75 MB)" }),
          { status: 413, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
      }
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      // F-012 : sanitisation anti path-traversal (panel_ref est utilisateur-fourni)
      const safePanelRef = body.panel_ref.replace(/[^a-zA-Z0-9_-]/g, '')
      if (safePanelRef.length === 0) {
        return new Response(JSON.stringify({ error: "panel_ref invalide apres sanitisation" }),
          { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
      }
      const filename = `${body.projet_id}/${safePanelRef}-${Date.now()}.jpg`
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/signage-feedback-photos/${filename}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "image/jpeg",
            "x-upsert": "false",
          },
          body: bytes,
        }
      )
      if (uploadRes.ok) {
        photoUrl = `${supabaseUrl}/storage/v1/object/public/signage-feedback-photos/${filename}`
      }
    } catch (err) {
      console.warn("Photo upload failed:", err)
    }
  }

  // ─── Insertion ────
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/signage_feedback`, {
    method: "POST",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: JSON.stringify({
      projet_id: body.projet_id,
      panel_ref: body.panel_ref,
      floor_id: body.floor_id ?? null,
      x: body.x ?? null,
      y: body.y ?? null,
      panel_type: body.panel_type ?? null,
      status: body.status,
      severity: body.severity ?? (body.status === 'absent' ? 'high' : body.status === 'ok' ? 'low' : 'medium'),
      note: body.note?.slice(0, 1000) ?? null,
      photo_url: photoUrl,
      agent_name: body.agent_name?.slice(0, 100) ?? null,
      user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
      device_info: {
        ip_hash: ip.split('.').slice(0, 2).join('.') + '.x.x', // anonymisation
        submitted_at: new Date().toISOString(),
      },
    }),
  })

  if (!insertRes.ok) {
    const errText = await insertRes.text()
    console.error("Insert failed:", errText)
    return new Response(JSON.stringify({ error: "Erreur enregistrement" }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } })
  }

  const [row] = await insertRes.json()
  return new Response(JSON.stringify({
    success: true,
    id: row.id,
    message: "Signalement enregistré. Merci !",
  }), {
    status: 201,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  })
})
