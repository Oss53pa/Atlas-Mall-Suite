// ═══ USE GEOMETRY CONSTRAINTS ═══
//
// Hook React exposant les contraintes géométriques (grille, ortho, snap
// voisin) applicables PENDANT le tracé/édition dans SpaceEditorCanvas.
//
// Préférences persistées dans localStorage sous `atlas-editor-geom-prefs`
// (isolé des stores Zustand — c'est de la UX utilisateur pure, pas de la
// data projet).

import { useCallback, useEffect, useState } from 'react'
import {
  applyConstraints,
  type PolygonMm,
} from '../engines/geometry/constraints'
import { mToMm, mmToM, tuplePolygonToMm } from '../engines/geometry/meterAdapter'

const PREFS_KEY = 'atlas-editor-geom-prefs'

export interface GeomPrefs {
  /** Pas de grille en mm. 0 = désactivé. Défauts usuels : 100 (10cm), 250, 500, 1000. */
  gridMm: number
  /** Mode orthogonal toujours actif (sans shift). */
  orthoAlways: boolean
  /** Snap sur sommets/arêtes des voisins. */
  snapNeighbors: boolean
  /** Tolérance du snap voisin en mm. */
  neighborTolMm: number
}

const DEFAULTS: GeomPrefs = {
  gridMm: 500,
  orthoAlways: false,
  snapNeighbors: true,
  neighborTolMm: 150, // 15 cm — assez tolérant pour saisie souris
}

function loadPrefs(): GeomPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return {
      gridMm: typeof parsed.gridMm === 'number' ? parsed.gridMm : DEFAULTS.gridMm,
      orthoAlways: !!parsed.orthoAlways,
      snapNeighbors: parsed.snapNeighbors !== false,
      neighborTolMm: typeof parsed.neighborTolMm === 'number' ? parsed.neighborTolMm : DEFAULTS.neighborTolMm,
    }
  } catch {
    return DEFAULTS
  }
}

function savePrefs(p: GeomPrefs): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)) } catch { /* quota */ }
}

export interface ApplyToPointArgs {
  /** Point courant en mètres float (ce que produit screenToWorld). */
  rawM: readonly [number, number]
  /** Point précédent en mètres (pour ortho). Null = pas d'ortho. */
  prevM?: readonly [number, number] | null
  /** Shift pressé (active ortho ponctuel même si orthoAlways=false). */
  shiftHeld?: boolean
  /** Polygones voisins en mètres (tuples [x,y]). */
  neighborsM?: readonly (readonly [number, number][])[]
}

export interface ApplyToPointResult {
  readonly pointM: [number, number]
  readonly appliedSnap: 'none' | 'grid' | 'ortho' | 'neighbor-vertex' | 'neighbor-edge'
}

export function useGeometryConstraints() {
  const [prefs, setPrefs] = useState<GeomPrefs>(() => loadPrefs())

  useEffect(() => { savePrefs(prefs) }, [prefs])

  const setGridMm = useCallback((mm: number) => setPrefs(p => ({ ...p, gridMm: Math.max(0, Math.round(mm)) })), [])
  const toggleOrtho = useCallback(() => setPrefs(p => ({ ...p, orthoAlways: !p.orthoAlways })), [])
  const toggleSnapNeighbors = useCallback(() => setPrefs(p => ({ ...p, snapNeighbors: !p.snapNeighbors })), [])
  const setNeighborTolMm = useCallback((mm: number) => setPrefs(p => ({ ...p, neighborTolMm: Math.max(0, Math.round(mm)) })), [])

  /**
   * Applique les contraintes à un point en mètres. Retourne le point
   * corrigé en mètres + le type de snap appliqué (pour feedback UI).
   */
  const applyToPoint = useCallback((args: ApplyToPointArgs): ApplyToPointResult => {
    const rawMm = mToMm(args.rawM)
    const useOrtho = prefs.orthoAlways || !!args.shiftHeld
    const neighborsMm: PolygonMm[] = prefs.snapNeighbors && args.neighborsM
      ? args.neighborsM.map(tuplePolygonToMm)
      : []

    const result = applyConstraints(rawMm, {
      gridMm: prefs.gridMm,
      orthogonalPrev: useOrtho && args.prevM ? mToMm(args.prevM) : undefined,
      neighbors: neighborsMm,
      neighborTolMm: prefs.snapNeighbors ? prefs.neighborTolMm : 0,
    })

    const m = mmToM(result.point)
    return { pointM: [m[0], m[1]], appliedSnap: result.appliedSnap }
  }, [prefs])

  return {
    prefs,
    setGridMm,
    toggleOrtho,
    toggleSnapNeighbors,
    setNeighborTolMm,
    applyToPoint,
  }
}
