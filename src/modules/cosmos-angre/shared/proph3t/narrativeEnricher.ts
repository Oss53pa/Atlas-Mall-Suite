// ═══ NARRATIVE ENRICHER — Wrapper Ollama (priorité) + Claude fallback ═══
// Prend un Proph3tResult algorithmique, le transmet au LLM avec un system prompt
// expert pour générer : executiveSummary enrichi + rationale par action enrichie.
// Si LLM indisponible : retourne le résultat algo intact (pas d'erreur).

import { callStructured, isObject } from './llm/structuredLlm'
import { useRlhfStore } from './rlhfStore'
import type { Proph3tResult, Proph3tAction, Proph3tFinding } from './orchestrator.types'

interface NarrativeOutput {
  /** Résumé exécutif retravaillé (FR pro, max 4 phrases). */
  executive_summary: string
  /** Map actionId → rationale enrichie (contextuelle, citée). */
  enriched_rationales: Record<string, string>
  /** Map findingId → description enrichie. */
  enriched_findings?: Record<string, string>
  /** Insights additionnels (1-3 phrases) sur les corrélations entre actions. */
  cross_insights?: string[]
}

function isNarrativeOutput(x: unknown): x is NarrativeOutput {
  if (!isObject(x)) return false
  return typeof x.executive_summary === 'string' && isObject(x.enriched_rationales)
}

const SYSTEM_PROMPT = `Tu es PROPH3T, IA experte en architecture commerciale de centres commerciaux en Afrique de l'Ouest.

RÈGLES STRICTES :
- Réponds UNIQUEMENT en JSON valide, AUCUN markdown, AUCUNE explication hors JSON.
- Français professionnel, ton de consultant senior.
- Cite implicitement les normes (APSAD R82, ERP CO, SYSCOHADA, Loi CI 2013-450) quand pertinent.
- N'invente JAMAIS de chiffres : appuie-toi UNIQUEMENT sur les données fournies.
- Sois concis : 1-3 phrases par rationale enrichie.

Tu reçois un résultat d'analyse algorithmique (DBSCAN, Cox, Bayes, etc.) et tu dois :
1. Reformuler le executive_summary en 2-4 phrases percutantes pour un comité directeur.
2. Pour chaque action, enrichir la rationale en expliquant l'IMPACT MÉTIER attendu (gain CA, réduction risque, conformité).
3. Optionnel : 1-3 cross_insights révélant des corrélations entre actions.

Schéma de sortie OBLIGATOIRE :
{
  "executive_summary": "string (max 400 chars)",
  "enriched_rationales": { "<actionId>": "string", ... },
  "enriched_findings": { "<findingId>": "string", ... },
  "cross_insights": ["string", ...]
}`

interface EnrichOptions {
  /** Skip si LLM indisponible (défaut true). Sinon throw. */
  silentOnFailure?: boolean
  /** Audience visée pour le ton. */
  audience?: 'director' | 'security-officer' | 'leasing-manager' | 'operations'
  /** Modèle Ollama. */
  model?: string
}

/** Vérifie rapidement si Ollama est joignable (2s timeout). Cache 60s. */
let ollamaCheckCache: { reachable: boolean; at: number } | null = null
async function isOllamaReachable(): Promise<boolean> {
  if (ollamaCheckCache && Date.now() - ollamaCheckCache.at < 60_000) {
    return ollamaCheckCache.reachable
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const url = (typeof window !== 'undefined' && (window as any).__OLLAMA_URL__) || 'http://localhost:11434'
    const res = await fetch(`${url}/api/tags`, { signal: ctrl.signal })
    clearTimeout(t)
    const ok = res.ok
    ollamaCheckCache = { reachable: ok, at: Date.now() }
    return ok
  } catch {
    ollamaCheckCache = { reachable: false, at: Date.now() }
    return false
  }
}

export async function enrichWithNarrative<T>(
  result: Proph3tResult<T>,
  opts: EnrichOptions = {},
): Promise<Proph3tResult<T>> {
  const silent = opts.silentOnFailure ?? true

  // Skip si Ollama indispo (évite freeze 60s en attendant timeout)
  if (!(await isOllamaReachable())) {
    console.log(`[PROPH3T narrative] Ollama indispo → skip narratif pour ${result.skill}`)
    return result
  }

  // Compact representation pour le LLM (évite payload trop gros)
  const compact = {
    skill: result.skill,
    qualityScore: result.qualityScore,
    executive_summary_initial: result.executiveSummary,
    audience: opts.audience ?? 'director',
    findings: result.findings.slice(0, 8).map(f => ({
      id: f.id, severity: f.severity, title: f.title, description: f.description.slice(0, 200),
    })),
    actions: result.actions.slice(0, 12).map(a => ({
      id: a.id, severity: a.severity, label: a.label,
      rationale_initial: a.rationale.slice(0, 200),
      cost_fcfa: a.estimatedCostFcfa,
      delay_days: a.estimatedDelayDays,
      confidence: a.confidence.score,
    })),
  }

  // Calibration : injecte les corrections RLHF récentes pour cette skill
  const rlhfContext = useRlhfStore.getState().buildContextPrompt(result.skill, 5)

  try {
    const enriched = await callStructured<NarrativeOutput>(
      {
        system: SYSTEM_PROMPT + rlhfContext,
        user: `Analyse à enrichir (JSON) :\n${JSON.stringify(compact, null, 2)}\n\nGénère le narratif structuré conforme au schéma.`,
        schemaHint: '{"executive_summary":"...","enriched_rationales":{"actionId":"..."},"enriched_findings":{"findingId":"..."},"cross_insights":["..."]}',
        temperature: 0.3,
        maxRetries: 2,
      },
      isNarrativeOutput,
    )

    // Applique le narratif au résultat
    const actions: Proph3tAction[] = result.actions.map(a => {
      const enrichedRat = enriched.data.enriched_rationales[a.id]
      if (enrichedRat && enrichedRat.length > 5) {
        return { ...a, rationale: enrichedRat }
      }
      return a
    })

    const findings: Proph3tFinding[] = result.findings.map(f => {
      const enrichedDesc = enriched.data.enriched_findings?.[f.id]
      if (enrichedDesc && enrichedDesc.length > 5) {
        return { ...f, description: enrichedDesc }
      }
      return f
    })

    const summary = enriched.data.executive_summary && enriched.data.executive_summary.length > 10
      ? enriched.data.executive_summary
      : result.executiveSummary

    // Ajoute cross_insights au payload si fournis
    const payloadWithInsights = enriched.data.cross_insights && enriched.data.cross_insights.length > 0
      ? { ...(result.payload as Record<string, unknown>), llmInsights: enriched.data.cross_insights } as T
      : result.payload

    console.log(`[PROPH3T narrative] ${result.skill} enrichi via ${enriched.source} en ${enriched.elapsedMs.toFixed(0)}ms (${enriched.attempts} tentative(s))`)

    return {
      ...result,
      executiveSummary: summary,
      actions,
      findings,
      payload: payloadWithInsights,
      source: enriched.source, // 'ollama' ou 'claude'
    }
  } catch (err) {
    if (!silent) throw err
    console.warn(`[PROPH3T narrative] LLM indispo pour ${result.skill}, conservation algo only`, err)
    return result // pas d'erreur — on garde le résultat algo
  }
}
