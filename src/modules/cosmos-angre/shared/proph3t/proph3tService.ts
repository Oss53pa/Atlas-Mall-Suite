// ═══ PROPH3T SERVICE — Service IA partage ═══
// Priorite : Ollama local → Claude API (Edge Function) → Keyword matching fallback
// Toutes les sections IA passent par ce service unique

export type AISource = 'ollama' | 'claude' | 'offline'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  text: string
  source: AISource
  durationMs: number
}

export interface SentimentResult {
  score: number      // -1 a +1
  label: 'positif' | 'neutre' | 'negatif'
  keywords: string[]
  suggestion: string
}

// ── Detection Ollama ──

let ollamaAvailable: boolean | null = null

async function checkOllama(): Promise<boolean> {
  if (ollamaAvailable !== null) return ollamaAvailable
  try {
    const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) })
    ollamaAvailable = res.ok
  } catch {
    ollamaAvailable = false
  }
  return ollamaAvailable
}

// Reset le cache toutes les 60s pour re-detecter si Ollama demarre apres le chargement
setInterval(() => { ollamaAvailable = null }, 60_000)

// ── Appel Ollama local ──

async function callOllama(messages: AIMessage[], model = 'mistral'): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  return data.message?.content ?? ''
}

// ── Appel Claude API via Edge Function ──

async function callClaude(
  messages: AIMessage[],
  projectData?: Record<string, unknown>
): Promise<string> {
  // Clé lue depuis le store centralisé (Paramètres → Intégrations IA).
  // Fallback de compatibilité : ancien localStorage key utilisé avant l'ajout
  // du store dédié apiKeyStore.
  const { getClaudeApiKey } = await import('../../../../lib/apiKeyStore')
  const clientKey = getClaudeApiKey() ?? localStorage.getItem('atlas_claude_key') ?? ''
  if (!clientKey) throw new Error('Cle Claude non configuree (Parametres > Integrations IA)')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
  const res = await fetch(`${supabaseUrl}/functions/v1/proph3t-claude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-key': clientKey,
    },
    body: JSON.stringify({
      question: messages.filter(m => m.role === 'user').pop()?.content ?? '',
      mode: 'vol3',
      proph3tAnswer: '',
      projectData,
      memoryNarrative: '',
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.answer ?? ''
}

// ── Service principal ──

export async function askProph3t(
  messages: AIMessage[],
  options?: {
    projectData?: Record<string, unknown>
    ollamaModel?: string
  }
): Promise<AIResponse> {
  const t0 = performance.now()

  // 1. Ollama local (gratuit, rapide)
  if (await checkOllama()) {
    try {
      const text = await callOllama(messages, options?.ollamaModel ?? 'mistral')
      if (text.trim()) {
        return { text, source: 'ollama', durationMs: Math.round(performance.now() - t0) }
      }
    } catch { /* fallback */ }
  }

  // 2. Claude API via Edge Function
  try {
    const text = await callClaude(messages, options?.projectData)
    if (text.trim()) {
      return { text, source: 'claude', durationMs: Math.round(performance.now() - t0) }
    }
  } catch { /* fallback */ }

  // 3. Mode offline — retourner un message explicite
  return {
    text: 'Mode hors-ligne : Ollama et Claude API indisponibles. Reponse generee localement.',
    source: 'offline',
    durationMs: Math.round(performance.now() - t0),
  }
}

// ── Analyse de sentiment (pour le module Feedback) ──

export async function analyzeSentiment(feedbackText: string): Promise<SentimentResult> {
  const prompt = `Analyse le sentiment de ce feedback client de mall en Cote d'Ivoire.
Reponds UNIQUEMENT en JSON valide: {"score": 0.8, "label": "positif", "keywords": ["propre", "rapide"], "suggestion": "..."}
Feedback: "${feedbackText}"`

  const response = await askProph3t([
    { role: 'system', content: 'Tu es un analyste de sentiment specialise dans les feedbacks clients de centres commerciaux africains. Reponds uniquement en JSON valide.' },
    { role: 'user', content: prompt },
  ])

  // Parser la reponse JSON
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        score: typeof parsed.score === 'number' ? Math.max(-1, Math.min(1, parsed.score)) : 0,
        label: ['positif', 'neutre', 'negatif'].includes(parsed.label) ? parsed.label : 'neutre',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
        suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : '',
      }
    }
  } catch { /* fallback */ }

  // Fallback simple si le parsing echoue
  const lower = feedbackText.toLowerCase()
  const positiveWords = ['bien', 'excellent', 'propre', 'rapide', 'bravo', 'top', 'super', 'merci']
  const negativeWords = ['lent', 'sale', 'mauvais', 'cher', 'probleme', 'bruit', 'attente', 'pire']
  const posCount = positiveWords.filter(w => lower.includes(w)).length
  const negCount = negativeWords.filter(w => lower.includes(w)).length
  const score = posCount > negCount ? 0.6 : negCount > posCount ? -0.6 : 0

  return {
    score,
    label: score > 0.2 ? 'positif' : score < -0.2 ? 'negatif' : 'neutre',
    keywords: [...positiveWords.filter(w => lower.includes(w)), ...negativeWords.filter(w => lower.includes(w))],
    suggestion: '',
  }
}

// ── Generateur de prompt contextuel ──

export function buildMallContext(data: {
  zoneCount: number
  storeCount: number
  kpis?: Record<string, unknown>
}): string {
  return `Tu es PROPH3T, l'assistant IA expert du Cosmos Angre Mall (Abidjan, Cote d'Ivoire).
Tu connais parfaitement :
- Le plan du mall : 3 etages, ${data.zoneCount} zones, ${data.storeCount} enseignes
- Les KPIs actuels : ${data.kpis ? JSON.stringify(data.kpis) : 'non charges'}
- Les personas : Awa & Moussa (CSP+ Angre), Serge (Digital Riviera), Pamela (UHNW Cocody), Aminata (Gen-Z)
- Le contexte SYSCOHADA et le marche ivoirien
Reponds en francais, de facon concise et actionale. Si tu manques de donnees, dis-le.`
}

// ── Indicateur visuel source ──

export function getSourceIndicator(source: AISource): { emoji: string; label: string; color: string } {
  switch (source) {
    case 'ollama': return { emoji: '🟢', label: 'Ollama local', color: '#22c55e' }
    case 'claude': return { emoji: '🔵', label: 'Claude API', color: '#3b82f6' }
    case 'offline': return { emoji: '🟡', label: 'Mode hors-ligne', color: '#f59e0b' }
  }
}
