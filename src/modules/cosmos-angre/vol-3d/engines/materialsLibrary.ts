import * as THREE from 'three'
import type { RenderMode } from '../store/vol3dTypes'

interface MaterialSpec {
  color: string; emissive?: string; emissiveIntensity?: number
  metalness: number; roughness: number; transparent?: boolean; opacity?: number
}

const SPECS: Record<string, Record<RenderMode, MaterialSpec>> = {
  parking:       { isometric: { color: '#1e3a5f', metalness: 0, roughness: 1 }, perspective: { color: '#1e3a5f', metalness: 0.1, roughness: 0.9 }, realistic: { color: '#2a3a50', metalness: 0.1, roughness: 0.85, emissive: '#0a1020', emissiveIntensity: 0.05 } },
  commerce:      { isometric: { color: '#0d3320', metalness: 0, roughness: 1 }, perspective: { color: '#0d3320', metalness: 0.1, roughness: 0.8 }, realistic: { color: '#1a4a2a', metalness: 0.05, roughness: 0.75, emissive: '#051510', emissiveIntensity: 0.1 } },
  restauration:  { isometric: { color: '#3d1500', metalness: 0, roughness: 1 }, perspective: { color: '#3d1500', metalness: 0.15, roughness: 0.8 }, realistic: { color: '#5a2010', metalness: 0.1, roughness: 0.7, emissive: '#1a0800', emissiveIntensity: 0.15 } },
  circulation:   { isometric: { color: '#1a2a1a', metalness: 0, roughness: 1 }, perspective: { color: '#1a2a1a', metalness: 0, roughness: 0.9 }, realistic: { color: '#252a25', metalness: 0, roughness: 0.9 } },
  technique:     { isometric: { color: '#1a0a2e', metalness: 0, roughness: 1 }, perspective: { color: '#1a0a2e', metalness: 0.3, roughness: 0.6 }, realistic: { color: '#2a1a40', metalness: 0.4, roughness: 0.5 } },
  financier:     { isometric: { color: '#2a0a0a', metalness: 0, roughness: 1 }, perspective: { color: '#2a0a0a', metalness: 0.4, roughness: 0.5 }, realistic: { color: '#3a1515', metalness: 0.5, roughness: 0.4, emissive: '#0a0505', emissiveIntensity: 0.1 } },
  loisirs:       { isometric: { color: '#0a1a2a', metalness: 0, roughness: 1 }, perspective: { color: '#0a1a2a', metalness: 0.1, roughness: 0.8 }, realistic: { color: '#152535', metalness: 0.1, roughness: 0.7, emissive: '#050d15', emissiveIntensity: 0.2 } },
}

const GLAZING: Record<RenderMode, MaterialSpec> = {
  isometric: { color: '#a8d4e8', metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.7 },
  perspective: { color: '#b8e0f0', metalness: 0.15, roughness: 0.05, transparent: true, opacity: 0.5 },
  realistic: { color: '#d4eef8', metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.3 },
}

const cache = new Map<string, THREE.MeshStandardMaterial>()

export function getMaterial(zoneType: string, mode: RenderMode, glazing = false): THREE.MeshStandardMaterial {
  const key = `${zoneType}-${mode}-${glazing}`
  if (cache.has(key)) return cache.get(key)!
  const spec = glazing ? GLAZING[mode] : (SPECS[zoneType]?.[mode] ?? SPECS.commerce[mode])
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.color), metalness: spec.metalness, roughness: spec.roughness,
    transparent: spec.transparent ?? false, opacity: spec.opacity ?? 1,
    side: glazing ? THREE.DoubleSide : THREE.FrontSide,
  })
  if (spec.emissive) { mat.emissive = new THREE.Color(spec.emissive); mat.emissiveIntensity = spec.emissiveIntensity ?? 0 }
  cache.set(key, mat)
  return mat
}

export function updateMaterialsForMode(scene: THREE.Scene, mode: RenderMode) {
  cache.clear()
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh && obj.userData.zoneId) {
      obj.material = getMaterial(obj.userData.zoneType as string, mode, obj.userData.glazing as boolean)
    }
  })
}

export function disposeMaterials() { cache.forEach(m => m.dispose()); cache.clear() }
