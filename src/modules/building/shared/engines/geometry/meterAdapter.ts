// ═══ METER ↔ MILLIMETER ADAPTER ═══
//
// Pont entre le reste de l'app (mètres float) et le module geometry
// (millimètres entiers — seule unité acceptée par constraints.ts /
// qualityScore.ts / overlapDetection.ts).
//
// Règle : toujours convertir AUX FRONTIÈRES, jamais en plein milieu d'un
// calcul. Un round à 1 mm à l'aller suffit, le retour est un simple ×1e-3.

import type { PointMm, PolygonMm } from './constraints'

// ─── Points ───────────────────────────────────────────────

export type PointM = readonly [number, number]
export type PolygonM = readonly PointM[]

export function mToMm(p: PointM): PointMm {
  return [Math.round(p[0] * 1000), Math.round(p[1] * 1000)]
}

export function mmToM(p: PointMm): PointM {
  return [p[0] / 1000, p[1] / 1000]
}

// ─── Polygones ────────────────────────────────────────────

export function polygonToMm(poly: PolygonM): PolygonMm {
  return poly.map(mToMm)
}

export function polygonToM(poly: PolygonMm): PolygonM {
  return poly.map(mmToM)
}

// ─── Helpers pour les formats exotiques du reste du code ──

/** EditableSpace.polygon est stocké en `[x,y]` float m. Idem DetectedSpace. */
export function tuplePolygonToMm(poly: readonly [number, number][]): PolygonMm {
  return poly.map(p => [Math.round(p[0] * 1000), Math.round(p[1] * 1000)] as const)
}

export function tuplePolygonToM(poly: PolygonMm): [number, number][] {
  return poly.map(p => [p[0] / 1000, p[1] / 1000] as [number, number])
}

/** spaceGeometryEngine utilise `{ x, y }`. */
export function xyPolygonToMm(poly: readonly { x: number; y: number }[]): PolygonMm {
  return poly.map(p => [Math.round(p.x * 1000), Math.round(p.y * 1000)] as const)
}

export function xyPolygonToM(poly: PolygonMm): { x: number; y: number }[] {
  return poly.map(p => ({ x: p[0] / 1000, y: p[1] / 1000 }))
}
