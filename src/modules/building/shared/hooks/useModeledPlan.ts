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
import { trimOverlapsBatch, type TrimableEntity } from '../engines/geometry/trimOverlaps'

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
    // pour que coherenceEngine puisse identifier et fusionner correctement,
    // ET pour que defaultHeightForType retourne 0.05 (plat) au lieu de 4.5 (mur).
    // Seuil élargi à HIGH + MEDIUM : les patterns medium (terrasse_default,
    // mall_default, hall, couloir_generic) sont fiables sur des labels nets.
    const reTypedSpaces = merged.spaces.map(s => {
      const sug = suggestType(s.id, String(s.type), s.label ?? '', s.label ?? '')
      if (sug && (sug.confidence === 'high' || sug.confidence === 'medium')) {
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

    // 5. ═══ TRIM OVERLAPS — boolean difference vs voisins prioritaires ═══
    // Les murs/sanitaires/boutiques gardent leur forme. Les circulations
    // se font soustraire les boutiques. Les voiries se font soustraire les
    // bâtiments. Les jardins / paysage absorbent ce qui dépasse.
    // Garantit qu'aucun polygone ne déborde sur un voisin plus prioritaire.
    const trimable: TrimableEntity[] = harmonizedSpaces.map(s => ({
      id: s.id,
      type: String(s.type),
      polygon: s.polygon.map(([x, y]) => ({ x, y })),
      bounds: { minX: s.bounds.minX, minY: s.bounds.minY, maxX: s.bounds.maxX, maxY: s.bounds.maxY },
    }))
    const trimmed = trimOverlapsBatch(trimable)
    const trimmedById = new Map(trimmed.map(t => [t.id, t]))
    const finalSpaces = harmonizedSpaces.flatMap(s => {
      const t = trimmedById.get(s.id)
      if (!t) return [] // absorbé par un voisin prioritaire
      // Reconstruit polygon en format tuple [number,number][]
      const newPoly = t.polygon.map(p => [p.x, p.y] as [number, number])
      // Si rien n'a changé (référence identique aux x/y), retourne tel quel
      const same = s.polygon.length === newPoly.length &&
        s.polygon.every((p, j) => p[0] === newPoly[j][0] && p[1] === newPoly[j][1])
      if (same) return [s]
      return [{ ...s, polygon: newPoly, bounds: { ...s.bounds, ...t.bounds, width: t.bounds.maxX - t.bounds.minX, height: t.bounds.maxY - t.bounds.minY, centerX: (t.bounds.minX + t.bounds.maxX) / 2, centerY: (t.bounds.minY + t.bounds.maxY) / 2 } }]
    })

    return { ...corrected, spaces: finalSpaces }
  }, [parsedPlan, editableSpaces])
}
