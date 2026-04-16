// ═══ ISO COORDS — Primitive 3D→2D projection (zero dependencies) ═══
// Extracted from isometricEngine.ts to break the engine ↔ renderers cycle.
// Renderers (vol*Renderer, iso*Renderer, isoAnnotations) import ONLY this file;
// isometricEngine can still re-export worldToIso for backwards compatibility.

const COS_ISO = Math.cos(Math.PI / 6)
const SIN_ISO = Math.sin(Math.PI / 6)

export function worldToIso(wX: number, wY: number, wZ: number, scale: number): [number, number] {
  return [
    (wX - wZ) * COS_ISO * scale,
    (wX + wZ) * SIN_ISO * scale - wY * scale,
  ]
}
