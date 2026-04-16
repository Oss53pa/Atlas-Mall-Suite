// ═══ STRUCTURED LLM — Ollama priorité absolue + Claude fallback transparent ═══
// Garantit une sortie JSON conforme à un schéma. Plusieurs tentatives + repair.

export interface StructuredLlmCall {
  /** Prompt système (rôle, contraintes JSON). */
  system: string
  /** Prompt utilisateur (données structurées + tâche). */
  user: string
  /** Schéma attendu (description textuelle pour le LLM). */
  schemaHint?: string
  /** Modèle Ollama à utiliser (défaut : configuré globalement). */
  model?: string
  /** Température (défaut 0.2 pour stabilité JSON). */
  temperature?: number
  /** Nb max de tentatives en cas de JSON invalide. */
  maxRetries?: number
}

export interface StructuredLlmResult<T> {
  data: T
  source: 'ollama' | 'claude'
  elapsedMs: number
  attempts: number
}

const OLLAMA_URL = (typeof window !== 'undefined' && (window as any).__OLLAMA_URL__) || 'http://localhost:11434'
const DEFAULT_MODEL = 'mistral:latest'

function extractJson(text: string): unknown {
  // Tente JSON pur, sinon extrait entre ```json ... ``` ou première { ... }
  try { return JSON.parse(text) } catch { /* */ }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    try { return JSON.parse(fenced[1]) } catch { /* */ }
  }
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)) } catch { /* */ }
  }
  throw new Error('No valid JSON found in LLM response')
}

async function callOllama(call: StructuredLlmCall, signal?: AbortSignal): Promise<unknown> {
  const model = call.model ?? DEFAULT_MODEL
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: call.system + '\n\nRESPOND ONLY WITH VALID JSON. NO MARKDOWN. NO EXPLANATION.' },
        { role: 'user', content: call.user + (call.schemaHint ? `\n\nSchema:\n${call.schemaHint}` : '') },
      ],
      stream: false,
      format: 'json',
      options: { temperature: call.temperature ?? 0.2 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const data = await res.json()
  const content = data.message?.content ?? ''
  return extractJson(content)
}

async function callClaudeFallback(call: StructuredLlmCall): Promise<unknown> {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    throw new Error('Claude fallback unavailable in offline mode')
  }
  const res = await fetch(`${supabaseUrl}/functions/v1/proph3t-claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      mode: 'chat',
      system: call.system + '\n\nRESPOND ONLY WITH VALID JSON. NO MARKDOWN.',
      question: call.user + (call.schemaHint ? `\n\nSchema:\n${call.schemaHint}` : ''),
    }),
  })
  if (!res.ok) throw new Error(`Claude fallback HTTP ${res.status}`)
  const data = await res.json()
  const content = data.answer ?? data.text ?? ''
  return extractJson(content)
}

export async function callStructured<T>(
  call: StructuredLlmCall,
  validate: (parsed: unknown) => parsed is T,
): Promise<StructuredLlmResult<T>> {
  const t0 = performance.now()
  const maxRetries = call.maxRetries ?? 2
  let lastErr: unknown

  // 1. Ollama (priorité absolue) — avec retry
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const parsed = await callOllama(call)
      if (validate(parsed)) {
        return { data: parsed as T, source: 'ollama', elapsedMs: performance.now() - t0, attempts: attempt }
      }
      throw new Error('Schema validation failed')
    } catch (err) {
      lastErr = err
      console.warn(`[PROPH3T/Ollama] attempt ${attempt}/${maxRetries} failed:`, err)
    }
  }

  // 2. Claude fallback transparent
  try {
    const parsed = await callClaudeFallback(call)
    if (validate(parsed)) {
      return { data: parsed as T, source: 'claude', elapsedMs: performance.now() - t0, attempts: maxRetries + 1 }
    }
    throw new Error('Schema validation failed (claude)')
  } catch (err) {
    lastErr = err
  }

  throw new Error(`[PROPH3T] all LLM calls failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`)
}

/** Validation laxiste : juste s'assurer que c'est un objet. */
export function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}
