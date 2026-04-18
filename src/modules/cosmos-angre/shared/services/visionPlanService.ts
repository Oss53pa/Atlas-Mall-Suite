// ═══ VISION PLAN SERVICE ═══
//
// Client côté front pour l'Edge Function `vision-plan` (Claude Vision API).
// Envoie une image du plan et récupère une analyse sémantique structurée :
//   - espaces détectés (avec type, nom, position approximative)
//   - échelle détectée si visible
//   - niveau d'étage détecté
//
// Utilise ensuite ces données pour :
//   - Proposer des corrections de labelisation (signageMemoryService.recordPattern)
//   - Enrichir les espaces du parsedPlan avec les types détectés
//   - Stocker dans la table `vision_recognitions` pour traçabilité
//
// Offline-safe : si Supabase n'est pas configuré, retourne une erreur explicite.

import { supabase, isOfflineMode } from '../../../../lib/supabase'

// ─── Types ─────────────────────────────────────────────

export type VisionSpaceType =
  | 'parking' | 'commerce' | 'restauration' | 'circulation' | 'technique'
  | 'backoffice' | 'financier' | 'sortie_secours' | 'loisirs' | 'services'
  | 'hotel' | 'bureaux' | 'exterieur'

export interface VisionSpace {
  name: string
  type: VisionSpaceType
  /** Position approximative dans l'image (ratio 0..1). */
  position?: { x: number; y: number }
  /** Taille approximative (ratio 0..1). */
  size?: { w: number; h: number }
  /** Nombre de portes détectées sur cet espace. */
  doors?: number
  confidence?: number
}

export interface VisionResult {
  spaces: VisionSpace[]
  scale?: string               // ex: "1:100"
  floorLevel?: string          // ex: "RDC", "R+1", "B1"
  wallsDetected?: number
  doorsDetected?: number
  dimensionsVisible?: string[] // cotes lisibles
  fileName?: string
  /** Résumé textuel. */
  summary?: string
  /** Confiance globale 0..1. */
  confidence?: number
}

export interface VisionAnalyzeInput {
  /** Image en base64 sans le préfixe data:. */
  imageBase64: string
  /** MIME type (image/jpeg, image/png, image/webp). */
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
  fileName?: string
  projetId?: string
}

export interface VisionAnalyzeResponse {
  success: boolean
  result?: VisionResult
  error?: string
  /** id dans vision_recognitions si sauvegardé. */
  recognitionId?: string
}

// ─── Helpers capture image ────────────────────────────

/**
 * Convertit un élément HTMLCanvasElement (rendu 2D du plan) en base64.
 * Max 5 MB décodés, compresse en JPEG 0.8.
 */
export function canvasToBase64(canvas: HTMLCanvasElement, quality = 0.8): { base64: string; mediaType: 'image/jpeg' } {
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  return { base64, mediaType: 'image/jpeg' }
}

/** Lit un fichier image et renvoie base64 + mediaType. */
export function fileToBase64(file: File): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error(`Format non supporté : ${file.type}. Utilisez JPEG, PNG ou WEBP.`))
      return
    }
    if (file.size > 5_000_000) {
      reject(new Error('Image trop grande (> 5 Mo). Compressez avant analyse.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      resolve({ base64, mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' })
    }
    reader.onerror = () => reject(new Error('Erreur lecture fichier'))
    reader.readAsDataURL(file)
  })
}

// ─── Appel Edge Function ───────────────────────────

export async function analyzePlanVision(input: VisionAnalyzeInput): Promise<VisionAnalyzeResponse> {
  if (isOfflineMode) {
    return { success: false, error: 'Analyse Vision indisponible en mode offline (Supabase non configuré).' }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? ''
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? ''

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/vision-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        imageBase64: input.imageBase64,
        mediaType: input.mediaType,
        fileName: input.fileName,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      return { success: false, error: errData.error ?? `HTTP ${res.status}` }
    }

    const data = await res.json()

    // Parse le JSON contenu dans `result` (Claude renvoie du texte JSON)
    let parsed: VisionResult
    try {
      const jsonMatch = data.result.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { spaces: [] }
    } catch {
      return { success: false, error: 'Réponse Vision invalide (JSON impossible à parser).' }
    }

    // Normalisation : s'assurer que spaces est un tableau
    if (!Array.isArray(parsed.spaces)) parsed.spaces = []
    parsed.fileName = data.fileName

    // Sauvegarde en base pour traçabilité
    let recognitionId: string | undefined
    if (input.projetId) {
      const { data: row } = await supabase
        .from('vision_recognitions')
        .insert({
          projet_id: input.projetId,
          file_name: data.fileName ?? input.fileName,
          spaces_count: parsed.spaces.length,
          detected_floor: parsed.floorLevel,
          detected_scale: parsed.scale,
          raw_result: data.result,
          parsed_result: parsed,
        })
        .select('id')
        .single()
      recognitionId = row?.id
    }

    return { success: true, result: parsed, recognitionId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur réseau'
    return { success: false, error: msg }
  }
}

// ─── Mapping VisionSpace → suggestion correction ──────

/** Pour chaque espace détecté par vision, propose une correction de catégorie. */
export function visionToCorrectionSuggestions(
  visionSpaces: VisionSpace[],
  planSpaces: Array<{ id: string; label: string; areaSqm: number; polygon: [number, number][] }>,
): Array<{
  planSpaceId: string
  visionSpace: VisionSpace
  suggestion: { customLabel?: string; category?: string }
  confidence: number
}> {
  const out: Array<{
    planSpaceId: string
    visionSpace: VisionSpace
    suggestion: { customLabel?: string; category?: string }
    confidence: number
  }> = []

  // Mapping VisionSpaceType → SpaceCategory (store corrections)
  const typeMap: Record<VisionSpaceType, string> = {
    parking: 'circulation',
    commerce: 'mode',
    restauration: 'restauration',
    circulation: 'circulation',
    technique: 'service-tech',
    backoffice: 'services',
    financier: 'services',
    sortie_secours: 'circulation',
    loisirs: 'loisirs',
    services: 'services',
    hotel: 'services',
    bureaux: 'services',
    exterieur: 'circulation',
  }

  for (const vs of visionSpaces) {
    // Match par similarité de label OU proximité spatiale (si position disponible)
    let bestMatch: typeof planSpaces[0] | null = null
    let bestScore = 0

    for (const ps of planSpaces) {
      const labelA = (vs.name ?? '').toLowerCase()
      const labelB = (ps.label ?? '').toLowerCase()
      if (!labelA || !labelB) continue
      // Jaccard sur tokens
      const tA = new Set(labelA.split(/[\s\-_]/).filter(Boolean))
      const tB = new Set(labelB.split(/[\s\-_]/).filter(Boolean))
      const inter = new Set([...tA].filter(t => tB.has(t))).size
      const union = new Set([...tA, ...tB]).size
      const score = union ? inter / union : 0
      if (score > bestScore && score > 0.3) {
        bestScore = score
        bestMatch = ps
      }
    }

    if (bestMatch) {
      out.push({
        planSpaceId: bestMatch.id,
        visionSpace: vs,
        suggestion: {
          customLabel: vs.name !== bestMatch.label ? vs.name : undefined,
          category: typeMap[vs.type],
        },
        confidence: bestScore * (vs.confidence ?? 0.7),
      })
    }
  }

  return out
}
