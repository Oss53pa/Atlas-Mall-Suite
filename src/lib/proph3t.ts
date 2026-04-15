// ═══ PROPH3T AI — Ollama local (primary) + Claude API (fallback) ═══

// ── Types ────────────────────────────────────────────────────

export interface ProjectContext {
  orgName: string
  projectName: string
  phase: string
  userRole: string
  city: string
  country: string
}

interface ChatResponse {
  text: string
  source: 'ollama' | 'claude' | 'local'
}

// ── System prompt template ───────────────────────────────────

function buildSystemPrompt(ctx: ProjectContext): string {
  return `Tu es PROPH3T, l'assistant IA d'Atlas Mall Suite.
Organisation : ${ctx.orgName}
Projet : ${ctx.projectName} (${ctx.phase})
Role utilisateur : ${ctx.userRole}
Localisation : ${ctx.city}, ${ctx.country}
Referentiel : SYSCOHADA Revise 2017, marche UEMOA
Monnaie : FCFA (XOF) — TVA 18% (DGI Cote d'Ivoire)

Reponds toujours en francais. Sois precis et oriente action.
Pour les montants, utilise FCFA. Pour les surfaces, m².
Pour les dates, format JJ/MM/AAAA.`
}

// ── Ollama local (primary) ───────────────────────────────────

const OLLAMA_URL = 'http://localhost:11434'

async function ollamaChat(system: string, prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'proph3t',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message?.content ?? ''
}

// ── Claude API fallback (via Supabase Edge Function) ─────────

async function claudeChat(system: string, prompt: string, _apiKey?: string): Promise<string> {
  // ⚠️ M08 — JAMAIS de clé API côté client. La clé Anthropic vit exclusivement
  // dans les variables d'env de l'Edge Function Supabase (ANTHROPIC_API_KEY).
  // Le paramètre apiKey est ignoré et sera supprimé après migration de tous les appels.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('Claude fallback unavailable in offline mode (no Supabase URL configured)')
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/proph3t-claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      // La clé Anthropic n'est PLUS transmise depuis le client — elle est
      // résolue côté Edge Function via Deno.env.get('ANTHROPIC_API_KEY').
    },
    body: JSON.stringify({
      mode: 'chat',
      system,
      question: prompt,
    }),
  })

  if (!res.ok) throw new Error(`Claude fallback error: ${res.status}`)
  const data = await res.json()
  return data.answer ?? data.text ?? ''
}

// ── Main query function ──────────────────────────────────────

export async function proph3tQuery(
  prompt: string,
  context: ProjectContext,
  _options?: { claudeApiKey?: string } // @deprecated M08 — clé résolue côté Edge Function
): Promise<ChatResponse> {
  const system = buildSystemPrompt(context)

  // Priority 1: Ollama local
  try {
    const text = await ollamaChat(system, prompt)
    return { text, source: 'ollama' }
  } catch {
    // Ollama not available — fall through to Claude
  }

  // Priority 2: Claude API via Edge Function (server-side API key)
  try {
    const text = await claudeChat(system, prompt)
    return { text, source: 'claude' }
  } catch {
    // Both unavailable
  }

  return {
    text: 'PROPH3T est temporairement indisponible. Verifiez que le serveur Ollama est lance localement ou que votre cle API Claude est configuree.',
    source: 'local',
  }
}

// ── Check Ollama availability ────────────────────────────────

export async function checkOllamaStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}
