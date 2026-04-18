// ═══ Ollama Model Registry — §4.2 modèles embarqués ═══
//
// CDC §4.2 :
//   - Modèle vision local (Llava, Moondream)            < 8 Go VRAM
//   - Classification espaces (fine-tuné taxonomie 31)   < 4 Go RAM
//   - Raisonnement orchestration (Llama 3.1 8B)         < 16 Go RAM
//   - Prédiction CA/m² (gradient boosting hors LLM)     < 500 Mo
//   - Optimisation mix (génétique CPU only)             CPU only
//
// Ce registre déclare les modèles attendus, vérifie leur disponibilité sur
// le serveur Ollama local (http://localhost:11434), et propose un fallback
// gracieux quand un modèle n'est pas installé.

// ─── Types ────────────────────────────────────

export type EmbeddedTask =
  | 'vision-plan'              // analyse d'image plan architectural
  | 'space-classification'     // taxonomie 31 types
  | 'orchestration-reasoning'  // décisions volumes
  | 'rationale-explanation'    // texte explicatif décisions

export interface EmbeddedModelSpec {
  task: EmbeddedTask
  /** Nom Ollama (`ollama pull X`). */
  modelName: string
  /** Nom alternatif si modèle principal indisponible. */
  fallbacks: string[]
  /** Contraintes ressources. */
  constraints: {
    maxRamGb?: number
    maxVramGb?: number
    cpuOnly?: boolean
  }
  /** Description fonctionnelle. */
  description: string
  /** Format prompt par défaut (JSON template). */
  defaultPromptTemplate: string
}

// ─── Catalogue (CDC §4.2) ──────────────────────

export const EMBEDDED_MODELS: EmbeddedModelSpec[] = [
  {
    task: 'vision-plan',
    modelName: 'llava:7b',
    fallbacks: ['llava:13b', 'moondream:1.8b'],
    constraints: { maxVramGb: 8 },
    description: 'Modèle vision multimodal local pour analyse de plans architecturaux',
    defaultPromptTemplate: `Tu es un expert en lecture de plans architecturaux de centres commerciaux.
Analyse l'image fournie et retourne un JSON structuré listant :
- spaces[] : { name, type, position }
- entrances/exits
- échelle si visible

JSON STRICT seulement, pas de texte autour.`,
  },
  {
    task: 'space-classification',
    modelName: 'mistral:7b-instruct',
    fallbacks: ['llama3.1:8b', 'qwen2.5:7b'],
    constraints: { maxRamGb: 4 },
    description: 'Classifier un label DXF dans la taxonomie 31 types Atlas Mall Suite',
    defaultPromptTemplate: `Classifie le label suivant dans EXACTEMENT un des 31 types autorisés :
[entree_principale, entree_secondaire, sortie_secours, promenade, couloir_secondaire,
 hall_distribution, local_commerce, restauration, loisirs, services, grande_surface, kiosque,
 sanitaires, escalator, ascenseur, rampe_pmr, escalier_fixe, point_information, borne_wayfinder,
 parking_vehicule, parking_moto, zone_livraison, zone_technique, local_poubelles,
 exterieur_parvis, exterieur_voirie, entree_parking, entree_service, a_definir, autre, a_exclure]

Label : "{LABEL}"
Surface : {AREA} m²
Réponse JSON : { "type": "...", "confidence": 0..1, "reason": "..." }`,
  },
  {
    task: 'orchestration-reasoning',
    modelName: 'llama3.1:8b',
    fallbacks: ['mistral:7b-instruct', 'qwen2.5:7b'],
    constraints: { maxRamGb: 16 },
    description: 'Raisonnement orchestration : choisir l\'ordre des volumes, identifier risques',
    defaultPromptTemplate: `Tu es PROPH3T, orchestrateur d'Atlas Mall Suite.
Contexte : {CONTEXT}
Question : {QUESTION}
Réponds en français, factuel, max 4 paragraphes.`,
  },
  {
    task: 'rationale-explanation',
    modelName: 'llama3.1:8b',
    fallbacks: ['mistral:7b-instruct'],
    constraints: { maxRamGb: 16 },
    description: 'Génère une justification lisible humain pour une décision automatique',
    defaultPromptTemplate: `Décision automatique :
- Type : {DECISION_KIND}
- Sortie : {OUTPUT}
- Source : {SOURCE}
- Confiance : {CONFIDENCE}

Justifie cette décision en français pour un professionnel non-IA, en 2 phrases max.`,
  },
]

// ─── Health check ────────────────────────────

export interface OllamaHealth {
  available: boolean
  /** Liste des modèles installés. */
  installedModels: string[]
  /** Modèles attendus et leur statut. */
  modelStatus: Array<{
    task: EmbeddedTask
    model: string
    installed: boolean
    fallbackAvailable: boolean
    fallbackUsed?: string
  }>
  /** Erreur réseau si applicable. */
  error?: string
}

export async function checkOllamaHealth(ollamaUrl = 'http://localhost:11434'): Promise<OllamaHealth> {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) {
      return {
        available: false, installedModels: [], modelStatus: [],
        error: `Ollama HTTP ${res.status}`,
      }
    }
    const data = await res.json()
    const installedModels: string[] = (data.models ?? []).map((m: { name: string }) => m.name)

    const modelStatus = EMBEDDED_MODELS.map(spec => {
      const installed = installedModels.some(m => m.startsWith(spec.modelName.split(':')[0]))
      const fallbackUsed = !installed
        ? spec.fallbacks.find(fb => installedModels.some(m => m.startsWith(fb.split(':')[0])))
        : undefined
      return {
        task: spec.task,
        model: spec.modelName,
        installed,
        fallbackAvailable: !!fallbackUsed,
        fallbackUsed,
      }
    })

    return { available: true, installedModels, modelStatus }
  } catch (err) {
    return {
      available: false, installedModels: [], modelStatus: [],
      error: err instanceof Error ? err.message : 'unknown',
    }
  }
}

// ─── Inference ──────────────────────────────

export interface InferInput {
  task: EmbeddedTask
  /** Prompt rendu (variables substituées). */
  prompt: string
  /** Pour vision : image base64. */
  imageBase64?: string
  /** Forcer un modèle spécifique. */
  forceModel?: string
  /** Mode JSON strict. */
  jsonMode?: boolean
}

export interface InferResult {
  modelUsed: string
  text: string
  /** Json parsé si jsonMode. */
  parsedJson?: unknown
  /** Si fallback Claude utilisé. */
  fallbackToClaud?: boolean
  durationMs: number
  error?: string
}

export async function inferEmbedded(input: InferInput, ollamaUrl = 'http://localhost:11434'): Promise<InferResult> {
  const t0 = performance.now()
  const spec = EMBEDDED_MODELS.find(s => s.task === input.task)
  if (!spec) {
    return {
      modelUsed: 'none', text: '', durationMs: 0,
      error: `Aucun modèle pour la tâche ${input.task}`,
    }
  }

  // Déterminer modèle effectif
  const health = await checkOllamaHealth(ollamaUrl)
  let modelToUse = input.forceModel ?? spec.modelName
  if (!input.forceModel && health.available) {
    const status = health.modelStatus.find(s => s.task === input.task)
    if (status && !status.installed && status.fallbackUsed) {
      modelToUse = status.fallbackUsed
    } else if (status && !status.installed && !status.fallbackUsed) {
      // Aucun modèle local → fallback Claude (proph3t.ts existant)
      try {
        const { proph3tQuery } = await import('../../../lib/aiClient')
        const response = await proph3tQuery(input.prompt, {
          orgName: 'Atlas Studio', projectName: 'Cosmos Angré',
          phase: 'embedded-fallback', userRole: 'PROPH3T',
          city: 'Abidjan', country: 'Côte d\'Ivoire',
        })
        return {
          modelUsed: response.source,
          text: response.text,
          fallbackToClaud: response.source === 'claude',
          durationMs: Math.round(performance.now() - t0),
        }
      } catch (err) {
        return {
          modelUsed: 'none', text: '',
          durationMs: Math.round(performance.now() - t0),
          error: `Aucun modèle Ollama dispo + Claude indisponible : ${err instanceof Error ? err.message : 'unknown'}`,
        }
      }
    }
  }

  // Appel Ollama
  try {
    const body: Record<string, unknown> = {
      model: modelToUse,
      prompt: input.prompt,
      stream: false,
    }
    if (input.jsonMode) body.format = 'json'
    if (input.imageBase64) body.images = [input.imageBase64]

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
    const data = await res.json()
    const text = data.response ?? ''

    let parsedJson: unknown
    if (input.jsonMode) {
      try { parsedJson = JSON.parse(text) }
      catch { /* texte non-JSON, on continue */ }
    }

    return {
      modelUsed: modelToUse,
      text,
      parsedJson,
      durationMs: Math.round(performance.now() - t0),
    }
  } catch (err) {
    return {
      modelUsed: modelToUse,
      text: '',
      durationMs: Math.round(performance.now() - t0),
      error: err instanceof Error ? err.message : 'unknown',
    }
  }
}

// ─── Helpers package ─────────────────────────

/** Génère un script `ollama pull` pour installer tous les modèles requis. */
export function generateInstallScript(): string {
  const lines = [
    '#!/bin/bash',
    '# Atlas Mall Suite — installation modèles Ollama embarqués',
    '# Référence : CDC PROPH3T §4.2',
    '',
    'set -e',
    'echo "Vérification d\'Ollama..."',
    'ollama --version',
    '',
  ]
  for (const spec of EMBEDDED_MODELS) {
    lines.push(`echo "Pulling ${spec.modelName} (${spec.task})..."`)
    lines.push(`ollama pull ${spec.modelName}`)
    lines.push('')
  }
  lines.push('echo "✓ Tous les modèles PROPH3T installés."')
  lines.push('ollama list')
  return lines.join('\n')
}

export function getModelSpecForTask(task: EmbeddedTask): EmbeddedModelSpec | null {
  return EMBEDDED_MODELS.find(s => s.task === task) ?? null
}
