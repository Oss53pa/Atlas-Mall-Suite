// ═══ PROPH3T AI — Ollama local (primary) + Claude API (fallback) ═══

import { getClaudeApiKey, useApiKeyStore } from './apiKeyStore'

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
  return `Tu es PROPH3T, l'assistant IA d'Atlas BIM.
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

// ── Claude API fallback ──────────────────────────────────────
// 2 modes selon la configuration :
//   a) Edge Function Supabase (production) — si VITE_SUPABASE_URL est défini.
//      La clé utilisateur (stockée localement via apiKeyStore) est transmise
//      via header `x-client-key` ; l'Edge Function la relaie à api.anthropic.com.
//   b) Appel direct api.anthropic.com (dev / mode local) — si pas de Supabase
//      configuré, on utilise la clé locale directement (nécessite CORS actif
//      via le header anthropic-dangerous-direct-browser-access).

async function claudeChat(system: string, prompt: string): Promise<string> {
  const clientKey = getClaudeApiKey()
  if (!clientKey) {
    throw new Error('Clé API Claude non configurée (Paramètres → Intégrations IA)')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  // Mode A — Edge Function Supabase (prod)
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    const res = await fetch(`${supabaseUrl}/functions/v1/proph3t-claude`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'x-client-key': clientKey,
      },
      body: JSON.stringify({
        mode: 'chat',
        system,
        question: prompt,
      }),
    })
    if (res.status === 401) {
      useApiKeyStore.getState().setStatus('invalid', 'Clé refusée (401)')
      throw new Error('Clé Claude refusée — vérifiez la clé dans Paramètres')
    }
    if (!res.ok) throw new Error(`Claude fallback error: ${res.status}`)
    const data = await res.json()
    useApiKeyStore.getState().setStatus('ok')
    return data.answer ?? data.text ?? ''
  }

  // Mode B — Appel direct (dev / offline-first)
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clientKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (res.status === 401 || res.status === 403) {
    useApiKeyStore.getState().setStatus('invalid', `Anthropic ${res.status}`)
    throw new Error('Clé Claude refusée — vérifiez la clé dans Paramètres')
  }
  if (!res.ok) throw new Error(`Claude direct error: ${res.status}`)
  const data = await res.json()
  useApiKeyStore.getState().setStatus('ok')
  return data.content?.[0]?.text ?? ''
}

// ── Main query function ──────────────────────────────────────

export async function proph3tQuery(
  prompt: string,
  context: ProjectContext,
  _options?: { claudeApiKey?: string } // @deprecated — clé lue depuis apiKeyStore
): Promise<ChatResponse> {
  const system = buildSystemPrompt(context)

  // Priority 1: Ollama local
  try {
    const text = await ollamaChat(system, prompt)
    return { text, source: 'ollama' }
  } catch {
    // Ollama not available — fall through to Claude
  }

  // Priority 2: Claude API (clé utilisateur stockée via Paramètres)
  try {
    const text = await claudeChat(system, prompt)
    return { text, source: 'claude' }
  } catch (err) {
     
    console.warn('[PROPH3T] Claude unavailable:', err instanceof Error ? err.message : err)
  }

  return {
    text: 'PROPH3T est temporairement indisponible. Vérifiez que le serveur Ollama est lancé localement ou que votre clé API Claude est configurée dans Paramètres → Intégrations IA.',
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
