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
import { suggestType } from '../engines/geometry/relabelByLabel'

// Cache module-global — survit aux remounts.
// Reset complet quand la signature du jeu d'EditableSpace change (count + 5
// derniers ids). Évite de retourner des polys obsolètes après une fusion.
const cleanupCache = new Map<string, Array<[number, number]>>()
let cacheKeySetSignature = ''
const CACHE_MAX = 1000

function invalidateCacheIfStale(spaces: ReadonlyArray<{ id: string }>): void {
  const sig = `${spaces.length}:${spaces.slice(-5).map(s => s.id).join('|')}`
  if (sig !== cacheKeySetSignature) {
    cleanupCache.clear()
    cacheKeySetSignature = sig
  }
}

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

    // 1b. ═══ Re-typage automatique par labels (PROPH3T mode B inline) ═══
    // Beaucoup d'EditableSpace rc.0 ont type='commerce' par défaut alors
    // que leur label dit clairement autre chose ("PARKING C5", "TERRE PLEIN",
    // "VOIE PRINCIPALE"). On corrige le type EN MÉMOIRE (pas dans le store)
    // pour que coherenceEngine puisse identifier et fusionner correctement.
    // Seules les suggestions confidence=high sont appliquées.
    const reTypedSpaces = merged.spaces.map(s => {
      const sug = suggestType(s.id, String(s.type), s.label ?? '', s.label ?? '')
      if (sug && sug.confidence === 'high') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...s, type: sug.suggestedType as any }
      }
      return s
    })
    const reTypedPlan = { ...merged, spaces: reTypedSpaces }

    // 2. Corrections de cohérence Proph3t (fusion voies/couloirs adjacents, etc.)
    //    Avec tolérances par groupe (parking 8m, voirie 5m, circulation 2.5m).
    //    adjacencyTolM est le fallback global si un groupe n'a pas sa tolérance.
    const { plan: corrected } = applyCoherenceCorrections(reTypedPlan, {
      adjacencyTolM: 1.0,
      mergeAdjacent: true,
    })

    // 3. Redressage géométrique à l'affichage (view-time, avec cache)
    invalidateCacheIfStale(corrected.spaces)
    const straightened = corrected.spaces.map(s => {
      if (!s.polygon || s.polygon.length < 3) return s
      const key = cacheKey(s.id, s.polygon)
      const cached = cleanupCache.get(key)
      if (cached) {
        return cached === s.polygon ? s : { ...s, polygon: cached }
      }
      const polyMm = tuplePolygonToMm(s.polygon)
      // Params plus agressifs pour rc.0 où les polygones sont franchement
      // bancals : grille 25 cm, ortho à 15 cm, drift max 80 cm.
      const result = cleanupPolygon(polyMm, {
        gridMm: 250, minEdgeMm: 50, orthoAlignMm: 150, maxDriftMm: 800,
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

    // 4. ═══ HARMONISATION GLOBALE (agressive rc.0) ═══
    // Aligne les coordonnées proches entre polygones DIFFÉRENTS. Tolérance
    // 30 cm + drift max 60 cm : couvre les saisies vraiment bancales du
    // rc.0 où deux commerces mitoyens peuvent avoir leurs murs partagés
    // décalés de 30-50 cm. Au-delà de 60 cm c'est une vraie différence
    // architecturale qu'on ne touche pas.
    const polysM = straightened.map(s => s.polygon.map(([x, y]) => ({ x, y })))
    const harmonized = harmonizePolygons(polysM, { toleranceM: 0.30, maxDisplacementM: 0.60 })
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
