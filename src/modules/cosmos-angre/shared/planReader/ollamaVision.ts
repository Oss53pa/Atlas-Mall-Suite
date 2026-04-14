// ═══ OLLAMA VISION LOCAL — Plan analysis via multimodal LLM ═══
// Uses llava / bakllava / llama3.2-vision running on localhost:11434
// Free, no API cost, runs entirely on the user's machine.

import type { RasterRecognitionResult, RecognizedZone, RecognizedWall, RecognizedDoor } from './planReaderTypes'
import type { SpaceType } from '../proph3t/types'

const OLLAMA_URL = 'http://localhost:11434'

// Models to try in order of preference
const VISION_MODELS = ['llama3.2-vision', 'llava', 'bakllava', 'moondream']

// ── System prompt for architectural plan analysis ────────────

const PLAN_ANALYSIS_PROMPT = `Tu es un expert en lecture de plans architecte de centres commerciaux en Afrique de l'Ouest.
Analyse cette image d'un plan de centre commercial. Identifie tous les espaces/locaux visibles.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "zones": [
    {
      "label": "nom du local ou description",
      "type": "commerce|restauration|circulation|parking|technique|bureaux|services|loisirs|backoffice|sortie_secours",
      "x": 0.0 à 1.0 (position horizontale relative, 0=gauche, 1=droite),
      "y": 0.0 à 1.0 (position verticale relative, 0=haut, 1=bas),
      "w": 0.0 à 1.0 (largeur relative),
      "h": 0.0 à 1.0 (hauteur relative),
      "confidence": 0.0 à 1.0
    }
  ],
  "floor_level": "RDC|B1|R+1|R+2",
  "wall_count_estimate": nombre,
  "door_count_estimate": nombre,
  "notes": "observations sur le plan"
}

Regles :
- Les coordonnees x,y,w,h sont RELATIVES a l'image (entre 0 et 1)
- Ignore le cartouche (cadre avec titre/logo en bas ou a droite)
- Ignore les cotes, annotations, reseaux techniques
- Concentre-toi sur les LOCAUX COMMERCIAUX (cellules, boutiques, restaurants)
- Identifie aussi les circulations (couloirs, halls, allees)
- Identifie les locaux techniques, parking, escaliers
- Si tu vois des lettres/numeros de reperage (A, B, C... ou 1, 2, 3...), utilise-les dans les labels
- Retourne UNIQUEMENT le JSON, pas de texte avant ou apres`

// ── Check if Ollama has a vision model available ─────────────

export async function checkOllamaVisionAvailable(): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const models: { name: string }[] = data.models ?? []
    const modelNames = models.map(m => m.name.split(':')[0].toLowerCase())

    // Find first available vision model
    for (const preferred of VISION_MODELS) {
      if (modelNames.some(m => m.includes(preferred))) {
        return models.find(m => m.name.toLowerCase().includes(preferred))?.name ?? preferred
      }
    }

    return null
  } catch {
    return null
  }
}

// ── Convert image to base64 ─────────────────────────────────

async function imageToBase64(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ── Analyze plan with Ollama Vision ──────────────────────────

export async function analyzeWithOllamaVision(
  imageFile: File | Blob,
  onProgress?: (msg: string) => void
): Promise<RasterRecognitionResult> {
  const notes: string[] = []

  // 1. Check if Ollama is available with a vision model
  onProgress?.('Verification Ollama Vision local...')
  const modelName = await checkOllamaVisionAvailable()

  if (!modelName) {
    throw new Error(
      'Ollama Vision non disponible. Installez Ollama (ollama.com) puis lancez : ollama pull llama3.2-vision'
    )
  }

  notes.push(`Modele Ollama Vision : ${modelName}`)
  onProgress?.(`Analyse du plan avec ${modelName}...`)

  // 2. Convert image to base64
  const base64Image = await imageToBase64(imageFile)

  // 3. Call Ollama Vision API
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      prompt: PLAN_ANALYSIS_PROMPT,
      images: [base64Image],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 4096,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ollama Vision erreur ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const responseText = data.response ?? ''

  notes.push(`Reponse recue (${responseText.length} chars)`)
  onProgress?.('Extraction des zones depuis la reponse IA...')

  // 4. Parse JSON from response
  const parsed = extractJSONFromResponse(responseText)

  if (!parsed || !Array.isArray(parsed.zones)) {
    notes.push('Reponse IA non parseable — fallback sur detection locale')
    throw new Error('Ollama Vision n\'a pas retourne de JSON exploitable')
  }

  notes.push(`${parsed.zones.length} zones identifiees par Ollama Vision`)
  if (parsed.floor_level) notes.push(`Etage detecte : ${parsed.floor_level}`)
  if (parsed.notes) notes.push(`IA notes : ${parsed.notes}`)

  // 5. Convert to RecognizedZone format
  const zones: RecognizedZone[] = parsed.zones
    .filter((z: OllamaZone) => z.x != null && z.y != null && z.w != null && z.h != null)
    .map((z: OllamaZone, idx: number): RecognizedZone => ({
      id: `ollama-zone-${idx}`,
      label: z.label || `Zone ${idx + 1}`,
      estimatedType: validateSpaceType(z.type),
      boundingBox: {
        x: clamp(z.x, 0, 0.95),
        y: clamp(z.y, 0, 0.95),
        w: clamp(z.w, 0.02, 0.5),
        h: clamp(z.h, 0.02, 0.5),
      },
      confidence: clamp(z.confidence ?? 0.7, 0.1, 0.95),
    }))

  // 6. Build result
  const wallCount = parsed.wall_count_estimate ?? 0
  const doorCount = parsed.door_count_estimate ?? 0

  // Generate simple wall segments from zone edges
  const walls: RecognizedWall[] = zones.slice(0, 30).flatMap((z, i) => {
    const bb = z.boundingBox
    return [
      { id: `w-${i}-t`, x1: bb.x, y1: bb.y, x2: bb.x + bb.w, y2: bb.y, confidence: 0.6 },
      { id: `w-${i}-b`, x1: bb.x, y1: bb.y + bb.h, x2: bb.x + bb.w, y2: bb.y + bb.h, confidence: 0.6 },
      { id: `w-${i}-l`, x1: bb.x, y1: bb.y, x2: bb.x, y2: bb.y + bb.h, confidence: 0.6 },
      { id: `w-${i}-r`, x1: bb.x + bb.w, y1: bb.y, x2: bb.x + bb.w, y2: bb.y + bb.h, confidence: 0.6 },
    ]
  })

  const doors: RecognizedDoor[] = []

  return {
    zones,
    walls: walls.slice(0, 100),
    doors,
    dimensions: [],
    scale: undefined,
    floorLevel: parsed.floor_level ?? undefined,
    confidence: zones.length > 0 ? Math.min(0.9, 0.5 + zones.length * 0.03) : 0.2,
    proph3tNotes: notes,
    rawClaudeResponse: responseText,
  }
}

// ── JSON extraction from LLM response ────────────────────────
// LLMs sometimes wrap JSON in markdown code blocks or add text before/after

function extractJSONFromResponse(text: string): OllamaResponse | null {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch { /* continue */ }

  // Try to find JSON in code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1])
    } catch { /* continue */ }
  }

  // Try to find first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0])
    } catch { /* continue */ }
  }

  return null
}

// ── Type validation ──────────────────────────────────────────

interface OllamaZone {
  label: string
  type: string
  x: number
  y: number
  w: number
  h: number
  confidence?: number
}

interface OllamaResponse {
  zones: OllamaZone[]
  floor_level?: string
  wall_count_estimate?: number
  door_count_estimate?: number
  notes?: string
}

const VALID_TYPES: SpaceType[] = [
  'parking', 'commerce', 'restauration', 'circulation', 'technique',
  'backoffice', 'financier', 'sortie_secours', 'loisirs', 'services',
  'hotel', 'bureaux', 'exterieur',
]

function validateSpaceType(type: string | undefined): SpaceType {
  if (!type) return 'commerce'
  const t = type.toLowerCase().trim()
  if (VALID_TYPES.includes(t as SpaceType)) return t as SpaceType
  // Fuzzy match
  if (t.includes('commerc') || t.includes('boutiqu') || t.includes('cell')) return 'commerce'
  if (t.includes('restau') || t.includes('food') || t.includes('cuis')) return 'restauration'
  if (t.includes('circul') || t.includes('couloir') || t.includes('hall') || t.includes('allee')) return 'circulation'
  if (t.includes('park') || t.includes('garag')) return 'parking'
  if (t.includes('tech') || t.includes('local') || t.includes('gaine')) return 'technique'
  if (t.includes('bureau') || t.includes('admin')) return 'bureaux'
  if (t.includes('sortie') || t.includes('secours')) return 'sortie_secours'
  return 'commerce'
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
