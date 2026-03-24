// ═══ RECONNAISSANCE PLANS SCANNÉS / IMAGES RASTER ═══

import type { RasterRecognitionResult } from './planReaderTypes'
import type { SpaceType, Zone } from '../proph3t/types'

// ─── RECONNAISSANCE VIA EDGE FUNCTION VISION-PLAN ───

export async function recognizeRasterPlan(
  imageFile: File,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<RasterRecognitionResult> {
  const base64 = await fileToBase64(imageFile)
  const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const response = await fetch(`${supabaseUrl}/functions/v1/vision-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      imageBase64: base64,
      mediaType,
      fileName: imageFile.name,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Erreur Edge Function vision-plan: ${response.status} — ${errText}`)
  }

  const data = await response.json()
  return parseVisionResponse(data.result)
}

function parseVisionResponse(raw: string): RasterRecognitionResult {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      zones: parsed.zones ?? [],
      walls: parsed.walls ?? [],
      doors: parsed.doors ?? [],
      dimensions: parsed.dimensions ?? [],
      scale: parsed.scale,
      floorLevel: parsed.floorLevel,
      confidence: parsed.confidence ?? 0.5,
      proph3tNotes: parsed.proph3tNotes ?? [],
      rawClaudeResponse: raw,
    }
  } catch (err) {
    console.error('Erreur parsing reponse Vision:', err)
    return {
      zones: [],
      walls: [],
      doors: [],
      dimensions: [],
      confidence: 0,
      proph3tNotes: ["Erreur de reconnaissance — verifier la qualite de l'image"],
      rawClaudeResponse: raw,
    }
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── CONVERSION RÉSULTAT VISION → ZONES ATLAS ───

export function convertVisionToAtlasZones(
  result: RasterRecognitionResult,
  floorId: string
): Partial<Zone>[] {
  return result.zones.map((rz, idx): Partial<Zone> => ({
    id: `vision-zone-${idx}`,
    floorId,
    label: rz.label,
    type: rz.estimatedType,
    x: rz.boundingBox.x,
    y: rz.boundingBox.y,
    w: rz.boundingBox.w,
    h: rz.boundingBox.h,
    niveau: inferNiveauFromType(rz.estimatedType),
    color: rz.color ?? getDefaultColor(rz.estimatedType),
    description: `Reconnu par Proph3t Vision (confiance ${Math.round(rz.confidence * 100)}%)`,
  }))
}

function inferNiveauFromType(type: SpaceType): 1 | 2 | 3 | 4 | 5 {
  const map: Partial<Record<SpaceType, 1 | 2 | 3 | 4 | 5>> = {
    parking: 1, circulation: 1, exterieur: 1,
    commerce: 2, restauration: 2, loisirs: 2, services: 2, hotel: 2,
    bureaux: 3,
    technique: 4, backoffice: 4, financier: 5, sortie_secours: 1,
  }
  return map[type] ?? 2
}

function getDefaultColor(type: SpaceType): string {
  const colors: Partial<Record<SpaceType, string>> = {
    parking: '#1e3a5f', circulation: '#0a1a0a', commerce: '#0a2a15',
    restauration: '#2a0f00', technique: '#1a0a2e', backoffice: '#1a0a1a',
    financier: '#2a0a0a', sortie_secours: '#1a0a0a', loisirs: '#0a1a2a',
    services: '#1a1a0a', hotel: '#0a0a2a', bureaux: '#1a1a1a', exterieur: '#0a2a0a',
  }
  return colors[type] ?? '#1a1a1a'
}
