import type { SpaceType } from '../../proph3t/types'

export interface MaterialDef {
  color: string
  metalness: number
  roughness: number
  opacity: number
  emissive?: string
  emissiveIntensity?: number
}

const MATERIALS: Record<string, MaterialDef> = {
  parking:       { color: '#2a3f5f', metalness: 0.1, roughness: 0.9, opacity: 1 },
  commerce:      { color: '#1a5535', metalness: 0.05, roughness: 0.7, opacity: 1 },
  restauration:  { color: '#6b3000', metalness: 0.05, roughness: 0.6, opacity: 1 },
  circulation:   { color: '#2a402a', metalness: 0.02, roughness: 0.8, opacity: 0.7 },
  technique:     { color: '#2e1550', metalness: 0.2, roughness: 0.8, opacity: 1 },
  backoffice:    { color: '#2e152e', metalness: 0.1, roughness: 0.8, opacity: 1 },
  financier:     { color: '#4a1515', metalness: 0.3, roughness: 0.5, opacity: 1 },
  loisirs:       { color: '#152a42', metalness: 0.05, roughness: 0.6, opacity: 1, emissive: '#0a1a2a', emissiveIntensity: 0.2 },
  hotel:         { color: '#15154a', metalness: 0.15, roughness: 0.5, opacity: 1 },
  bureaux:       { color: '#2e2e2e', metalness: 0.1, roughness: 0.7, opacity: 1 },
  exterieur:     { color: '#15451a', metalness: 0.0, roughness: 0.95, opacity: 0.3 },
  sortie_secours:{ color: '#2e0000', metalness: 0.1, roughness: 0.8, opacity: 1, emissive: '#ff0000', emissiveIntensity: 0.1 },
  services:      { color: '#2e2e15', metalness: 0.1, roughness: 0.7, opacity: 1 },
  glass:         { color: '#88ccff', metalness: 0.9, roughness: 0.1, opacity: 0.3 },
  floor_slab:    { color: '#1a1a1a', metalness: 0.0, roughness: 0.95, opacity: 1 },
  occupied:      { color: '#0a5525', metalness: 0.05, roughness: 0.7, opacity: 1 },
  vacant:        { color: '#5a1414', metalness: 0.05, roughness: 0.7, opacity: 1, emissive: '#ff0000', emissiveIntensity: 0.05 },
  reserved:      { color: '#5a3e14', metalness: 0.05, roughness: 0.7, opacity: 1 },
  under_works:   { color: '#3e3e3e', metalness: 0.2, roughness: 0.6, opacity: 1 },
}

export function getMaterial(key: string): MaterialDef {
  return MATERIALS[key] ?? MATERIALS.commerce
}

export function getMaterialForZone(zoneType: SpaceType): MaterialDef {
  return MATERIALS[zoneType] ?? MATERIALS.commerce
}
