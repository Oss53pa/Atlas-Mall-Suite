// ═══ 3D MODEL LOADERS — Unified export ═══

export { loadGLTF, disposeGLTF, type GLTFLoadResult } from './gltf-loader'
export { loadOBJ, disposeOBJ, type OBJLoadResult } from './obj-loader'
export { loadIFC, disposeIFC, type IFCLoadResult, type IFCSpace, type IFCDoor } from './ifc-loader'

export type ModelFormat = 'gltf' | 'glb' | 'obj' | 'ifc'

export function detectModelFormat(fileName: string): ModelFormat | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.gltf') || lower.endsWith('.glb')) return 'gltf'
  if (lower.endsWith('.obj')) return 'obj'
  if (lower.endsWith('.ifc')) return 'ifc'
  return null
}

export const MODEL_FORMAT_LABELS: Record<ModelFormat, string> = {
  gltf: 'glTF',
  glb: 'GLB',
  obj: 'OBJ',
  ifc: 'IFC',
}

export const MODEL_FORMAT_COLORS: Record<ModelFormat, string> = {
  gltf: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  glb: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
  obj: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40',
  ifc: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
}

export const ALL_3D_ACCEPT = '.gltf,.glb,.obj,.ifc'
