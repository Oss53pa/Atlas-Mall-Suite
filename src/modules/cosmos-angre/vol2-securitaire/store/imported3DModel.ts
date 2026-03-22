// ═══ IMPORTED 3D MODEL — Singleton ref for Three.js Group ═══
// THREE.Group objects can't be serialized in Zustand, so we use
// a simple event-driven singleton to pass models to FloorPlan3D.

import type * as THREE from 'three'

export interface Imported3DModelEntry {
  scene: THREE.Group
  format: string
  floorId: string
  addedAt: number
}

type Listener = () => void

let models: Imported3DModelEntry[] = []
const listeners = new Set<Listener>()

export function getImported3DModels(): Imported3DModelEntry[] {
  return models
}

export function addImported3DModel(entry: Imported3DModelEntry) {
  models = [...models, entry]
  listeners.forEach(fn => fn())
}

export function clearImported3DModels() {
  models = []
  listeners.forEach(fn => fn())
}

export function subscribeImported3DModels(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
