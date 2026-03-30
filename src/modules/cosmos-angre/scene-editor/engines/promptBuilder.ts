// ═══ Scene Editor — Generateur de prompt pour rendu photo ═══
// Construit un prompt Stable Diffusion en anglais depuis l'etat de la scene

import type { SceneData, AmbianceTime, AmbianceStyle } from '../store/sceneEditorTypes'

const ZONE_DESCRIPTIONS: Record<string, string> = {
  commerce: 'retail boutique interior',
  restauration: 'food court and restaurant area',
  mode: 'fashion retail store',
  loisirs: 'entertainment and leisure zone',
  services: 'service desk and customer support area',
  circulation: 'main gallery and circulation corridor',
  parking: 'underground parking garage',
  exterieur: 'outdoor plaza and entrance area',
}

const TIME_DESCRIPTIONS: Record<AmbianceTime, string> = {
  morning: 'soft morning sunlight streaming through large windows, golden hour warmth',
  afternoon: 'bright afternoon natural light, warm sunlight through floor-to-ceiling windows',
  evening: 'warm evening ambient lighting, orange sunset glow, cozy atmosphere',
  night: 'artificial interior lighting at night, blue accent lights, dramatic shadows',
}

const STYLE_DESCRIPTIONS: Record<AmbianceStyle, string> = {
  moderne_tropical: 'modern tropical architecture, lush indoor plants, bamboo accents, natural materials, warm earth tones',
  epure: 'minimalist clean design, white walls, polished concrete floors, subtle lighting',
  luxe: 'luxury upscale interior, marble floors, gold accents, chandeliers, premium materials',
}

export function buildScenePrompt(scene: SceneData): string {
  const zone = ZONE_DESCRIPTIONS[scene.zoneType] ?? 'commercial interior space'
  const time = TIME_DESCRIPTIONS[scene.ambiance.timeOfDay]
  const style = STYLE_DESCRIPTIONS[scene.ambiance.style]

  const furniture = scene.objects
    .filter(o => o.type === 'furniture')
    .map(o => o.name.toLowerCase())
    .join(', ')

  const decoration = scene.objects
    .filter(o => o.isDecoration)
    .map(o => o.name.toLowerCase())
    .join(', ')

  const characterDescs = scene.characters.map(c =>
    `${c.count} ${c.name.toLowerCase()}`
  ).join(', ')

  const density = scene.characters.reduce((s, c) => s + c.count, 0)
  const crowdLevel = density > 10 ? 'busy crowded atmosphere' : density > 4 ? 'moderate foot traffic' : 'calm relaxed atmosphere'

  const floorDesc = scene.floorTexture ? `, ${scene.floorTexture.replace(/_/g, ' ')} flooring` : ''

  const parts = [
    `Modern shopping mall ${zone}`,
    `Abidjan Cote d'Ivoire`,
    furniture && `featuring ${furniture}`,
    decoration && `decorated with ${decoration}`,
    characterDescs && `${characterDescs}`,
    `diverse African clientele, Abidjan middle class`,
    crowdLevel,
    time,
    style,
    floorDesc,
    `photorealistic architectural visualization`,
    `8k, sharp focus, professional photography, wide angle lens`,
  ].filter(Boolean)

  return parts.join(', ')
}

export function buildSystemPromptForProph3t(): string {
  return `Tu es un expert en architecture commerciale et visualisation d'espaces.
Genere un prompt de rendu photo-realiste en anglais pour Stable Diffusion.
Contexte : mall commercial a Abidjan, Cote d'Ivoire, clientele africaine.
Reponds UNIQUEMENT avec le prompt optimise, sans explication ni formatage.
Le prompt doit etre en anglais, detaille, avec des termes techniques de photography.`
}
