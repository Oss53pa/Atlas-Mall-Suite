// ═══ Scene Editor — Types ═══

export type SceneTool = 'select' | 'move' | 'rotate' | 'scale' | 'delete'

export type AmbianceTime = 'morning' | 'afternoon' | 'evening' | 'night'
export type AmbianceStyle = 'moderne_tropical' | 'epure' | 'luxe'
export type RenderMode = 'local_threejs' | 'photo_ai'

// ── Catalogue ──

export interface FurnitureItemDef {
  id: string
  name: string
  category: string
  w: number       // metres
  d: number
  h: number
  src: string     // chemin asset GLB relatif
  color?: string
}

export interface TextureItemDef {
  id: string
  name: string
  type: 'floor' | 'wall' | 'ceiling'
  texture: string  // identifiant texture
}

export interface CharacterItemDef {
  id: string
  name: string
  category: string
  count: number
  animation: string
  formation?: 'line' | 'scatter' | 'circle'
  uniform?: string
  badge?: boolean
}

export interface CatalogCategory {
  label: string
  color: string
  items: FurnitureItemDef[]
}

export interface CharacterCategory {
  label: string
  items: CharacterItemDef[]
}

// ── Scene Objects ──

export interface SceneObject {
  id: string
  catalogId: string
  name: string
  type: 'furniture' | 'character' | 'decoration'
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  isDecoration: boolean
  metadata?: Record<string, unknown>
}

export interface SceneAmbiance {
  timeOfDay: AmbianceTime
  style: AmbianceStyle
  lightingIntensity: number
}

export interface SceneData {
  id: string
  name: string
  zoneType: string
  objects: SceneObject[]
  characters: (SceneObject & { count: number; animation: string })[]
  ambiance: SceneAmbiance
  floorTexture?: string
  wallTexture?: string
  ceilingTexture?: string
  cameraPosition: { x: number; y: number; z: number }
  cameraTarget: { x: number; y: number; z: number }
}

export interface RenderResult {
  id: string
  mode: RenderMode
  prompt: string
  imageUrl: string | null    // blob URL ou Supabase Storage URL
  thumbnailUrl: string | null
  isApproved: boolean
  createdAt: string
}

export interface DiversityPreset {
  skinTones: string[]
  weights: number[]
  clothingStyles: string[]
}

export const DIVERSITY_ABIDJAN: DiversityPreset = {
  skinTones: ['dark', 'medium_dark', 'medium', 'medium_light'],
  weights: [0.55, 0.25, 0.15, 0.05],
  clothingStyles: ['africain_moderne', 'casual_western', 'tenue_bureau', 'tenue_decontractee'],
}
