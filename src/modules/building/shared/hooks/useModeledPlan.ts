// ═══ useModeledPlan — Plan cohérent partagé entre tous les volumes ═══
//
// Retourne un ParsedPlan "modélisé" = DXF brut + EditableSpace du user +
// corrections de cohérence Proph3t + redressage géométrique à l'affichage.
//
// Tous les volumes (Vol.1, Vol.2, Vol.3, Vol.4) appellent ce hook pour
// rendre le plan. Règle Atlas BIM : zéro divergence de plan entre volumes.
//
// - Si aucun EditableSpace dans le store → retourne null (les appelants
//   décident du fallback : DXF brut, placeholder, etc.)
// - Cache LRU des polygones nettoyés : recalcul évité sur re-renders.

import { useMemo } from 'react'
import type { ParsedPlan } from '../planReader/planEngineTypes'
import { useEditableSpaceStore } from '../stores/editableSpaceStore'
import { applyEditsToPlan } from '../planReader/applyEditsToPlan'
import { applyCoherenceCorrections } from '../engines/plan-analysis/coherenceEngine'
import { cleanupPolygon } from '../engines/geometry/legacyCleanup'
import { tuplePolygonToMm, tuplePolygonToM } from '../engines/geometry/meterAdapter'
import { harmonizePolygons } from '../engines/geometry/harmonize'

// Cache module-global — survit aux remounts.
const cleanupCache = new Map<string, Array<[number, number]>>()
const CACHE_MAX = 1000

function cacheKey(id: string, poly: readonly [number, number][]): string {
  if (!poly || poly.length === 0) return `${id}:0`
  const [fx, fy] = poly[0]
  const [lx, ly] = poly[poly.length - 1]
  return `${id}:${poly.length}:${fx.toFixed(3)},${fy.toFixed(3)}:${lx.toFixed(3)},${ly.toFixed(3)}`
}

function evictIfNeeded(): void {
  if (cleanupCache.size > CACHE_MAX) {
    const firstKey = cleanupCache.keys().next().value
    if (firstKey) cleanupCache.delete(firstKey)
  }
}

export function useModeledPlan(parsedPlan: ParsedPlan | null): ParsedPlan | null {
  const editableSpaces = useEditableSpaceStore(s => s.spaces)

  return useMemo(() => {
    if (!parsedPlan) return null
    if (editableSpaces.length === 0) return null

    // 1. Fusionne les edits user sur le plan importé
    const merged = applyEditsToPlan(parsedPlan, editableSpaces)

    // 2. Corrections de cohérence Proph3t (fusion voies/couloirs adjacents, etc.)
    const { plan: corrected } = applyCoherenceCorrections(merged, {
      adjacencyTolM: 0.5,
      mergeAdjacent: true,
    })

    // 3. Redressage géométrique à l'affichage (view-time, avec cache)
    const straightened = corrected.spaces.map(s => {
      if (!s.polygon || s.polygon.length < 3) return s
      const key = cacheKey(s.id, s.polygon)
      const cached = cleanupCache.get(key)
      if (cached) {
        return cached === s.polygon ? s : { ...s, polygon: cached }
      }
      const polyMm = tuplePolygonToMm(s.polygon)
      const result = cleanupPolygon(polyMm, {
        gridMm: 100, minEdgeMm: 30, orthoAlignMm: 80, maxDriftMm: 400,
      })
      if (!result.changed) {
        cleanupCache.set(key, s.polygon)
        evictIfNeeded()
        return s
      }
      const cleanedPolygon = tuplePolygonToM(result.cleaned)
      cleanupCache.set(key, cleanedPolygon)
      evictIfNeeded()
      return { ...s, polygon: cleanedPolygon }
    })

    // 4. ═══ HARMONISATION GLOBALE ═══
    // Aligne les coordonnées proches entre polygones DIFFÉRENTS. Sans cette
    // passe, deux commerces voisins peuvent avoir leurs murs partagés à
    // 5 cm de différence — l'œil voit un défaut d'alignement même si chaque
    // polygone est individuellement propre. Tolérance 12 cm = couvre la
    // saisie souris bancale rc.0 sans déformer les vraies différences.
    const polysM = straightened.map(s => s.polygon.map(([x, y]) => ({ x, y })))
    const harmonized = harmonizePolygons(polysM, { toleranceM: 0.12, maxDisplacementM: 0.25 })
    const harmonizedSpaces = straightened.map((s, i) => {
      const h = harmonized[i]
      if (!h) return s
      // Convertit retour en tuples [x, y] (format DetectedSpace)
      const newPolygon = h.map(p => [p.x, p.y] as [number, number])
      // Si rien n'a bougé pour ce space → retourne l'objet original (référence stable)
      const same = s.polygon.every((p, j) => p[0] === newPolygon[j][0] && p[1] === newPolygon[j][1])
      return same ? s : { ...s, polygon: newPolygon }
    })

    return { ...corrected, spaces: harmonizedSpaces }
  }, [parsedPlan, editableSpaces])
}
