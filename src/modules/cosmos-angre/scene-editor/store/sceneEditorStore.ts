// ═══ Scene Editor — Zustand Store ═══

import { create } from 'zustand'
import type {
  SceneTool, SceneObject, SceneData, SceneAmbiance,
  RenderResult, RenderMode, AmbianceTime, AmbianceStyle,
} from './sceneEditorTypes'

interface SceneEditorState {
  // Scene
  scene: SceneData
  isDirty: boolean

  // Selection & tools
  selectedObjectId: string | null
  activeTool: SceneTool
  isTransforming: boolean

  // Render
  renderResults: RenderResult[]
  isRendering: boolean
  currentPrompt: string

  // Library UI
  libraryTab: 'furniture' | 'characters' | 'textures'
  librarySearch: string
  libraryCategory: string | null

  // External API
  externalApiEnabled: boolean

  // Actions — Scene
  setScene: (scene: SceneData) => void
  resetScene: (zoneType?: string) => void
  addObject: (obj: SceneObject) => void
  updateObject: (id: string, updates: Partial<SceneObject>) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void

  // Actions — Selection & Tools
  selectObject: (id: string | null) => void
  setTool: (tool: SceneTool) => void
  setTransforming: (v: boolean) => void

  // Actions — Ambiance
  setAmbiance: (updates: Partial<SceneAmbiance>) => void
  setFloorTexture: (texture: string) => void
  setWallTexture: (texture: string) => void

  // Actions — Render
  setPrompt: (prompt: string) => void
  addRenderResult: (result: RenderResult) => void
  setRendering: (v: boolean) => void

  // Actions — Library UI
  setLibraryTab: (tab: 'furniture' | 'characters' | 'textures') => void
  setLibrarySearch: (q: string) => void
  setLibraryCategory: (cat: string | null) => void

  // Actions — Camera
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void
  setCameraTarget: (target: { x: number; y: number; z: number }) => void
}

const DEFAULT_AMBIANCE: SceneAmbiance = {
  timeOfDay: 'afternoon',
  style: 'moderne_tropical',
  lightingIntensity: 1.0,
}

const EMPTY_SCENE: SceneData = {
  id: '',
  name: 'Nouvelle scene',
  zoneType: 'commerce',
  objects: [],
  characters: [],
  ambiance: DEFAULT_AMBIANCE,
  cameraPosition: { x: 15, y: 12, z: 15 },
  cameraTarget: { x: 0, y: 0, z: 0 },
}

export const useSceneEditorStore = create<SceneEditorState>((set, get) => ({
  scene: { ...EMPTY_SCENE, id: crypto.randomUUID() },
  isDirty: false,

  selectedObjectId: null,
  activeTool: 'select',
  isTransforming: false,

  renderResults: [],
  isRendering: false,
  currentPrompt: '',

  libraryTab: 'furniture',
  librarySearch: '',
  libraryCategory: null,

  externalApiEnabled: false,

  // ── Scene ──

  setScene: (scene) => set({ scene, isDirty: false }),

  resetScene: (zoneType) => set({
    scene: { ...EMPTY_SCENE, id: crypto.randomUUID(), zoneType: zoneType ?? 'commerce' },
    isDirty: false,
    selectedObjectId: null,
    renderResults: [],
    currentPrompt: '',
  }),

  addObject: (obj) => set(s => ({
    scene: { ...s.scene, objects: [...s.scene.objects, obj] },
    isDirty: true,
    selectedObjectId: obj.id,
  })),

  updateObject: (id, updates) => set(s => ({
    scene: {
      ...s.scene,
      objects: s.scene.objects.map(o => o.id === id ? { ...o, ...updates } : o),
    },
    isDirty: true,
  })),

  removeObject: (id) => set(s => ({
    scene: {
      ...s.scene,
      objects: s.scene.objects.filter(o => o.id !== id),
    },
    isDirty: true,
    selectedObjectId: s.selectedObjectId === id ? null : s.selectedObjectId,
  })),

  duplicateObject: (id) => {
    const obj = get().scene.objects.find(o => o.id === id)
    if (!obj) return
    const clone: SceneObject = {
      ...obj,
      id: crypto.randomUUID(),
      name: obj.name + ' (copie)',
      position: { ...obj.position, x: obj.position.x + 1 },
    }
    set(s => ({
      scene: { ...s.scene, objects: [...s.scene.objects, clone] },
      isDirty: true,
      selectedObjectId: clone.id,
    }))
  },

  // ── Selection & Tools ──

  selectObject: (id) => set({ selectedObjectId: id }),
  setTool: (tool) => set({ activeTool: tool }),
  setTransforming: (v) => set({ isTransforming: v }),

  // ── Ambiance ──

  setAmbiance: (updates) => set(s => ({
    scene: { ...s.scene, ambiance: { ...s.scene.ambiance, ...updates } },
    isDirty: true,
  })),

  setFloorTexture: (texture) => set(s => ({
    scene: { ...s.scene, floorTexture: texture },
    isDirty: true,
  })),

  setWallTexture: (texture) => set(s => ({
    scene: { ...s.scene, wallTexture: texture },
    isDirty: true,
  })),

  // ── Render ──

  setPrompt: (prompt) => set({ currentPrompt: prompt }),
  addRenderResult: (result) => set(s => ({ renderResults: [...s.renderResults, result] })),
  setRendering: (v) => set({ isRendering: v }),

  // ── Library UI ──

  setLibraryTab: (tab) => set({ libraryTab: tab }),
  setLibrarySearch: (q) => set({ librarySearch: q }),
  setLibraryCategory: (cat) => set({ libraryCategory: cat }),

  // ── Camera ──

  setCameraPosition: (pos) => set(s => ({
    scene: { ...s.scene, cameraPosition: pos },
  })),

  setCameraTarget: (target) => set(s => ({
    scene: { ...s.scene, cameraTarget: target },
  })),
}))
