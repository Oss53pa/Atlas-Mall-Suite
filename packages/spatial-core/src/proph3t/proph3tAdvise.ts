// ═══ PROPH3T MODE A — Advise ═══
//
// PROPH3T propose des corrections géométriques en se basant sur l'analyse
// du moteur TS pur. JAMAIS de génération de coordonnées par LLM.
//
// Workflow :
//   1. Le moteur TS détecte les anomalies (murs voisins décalés, polygones
//      qui se chevauchent, sommets désalignés)
//   2. PROPH3T formule la suggestion en langage naturel + propose la
//      correction calculée par TS
//   3. L'user voit "Boutiques 23 et 24 ont leurs murs partagés décalés
//      de 38 cm. Aligner sur x=12.45 ?" + boutons Apply / Refuse
//   4. Apply → applique la géométrie déjà calculée par TS

import type { SpatialEntity, Point2D } from '../domain/SpatialEntity'
import { isPolygon } from '../domain/SpatialEntity'

export interface AlignmentSuggestion {
  readonly id: string
  readonly affectedEntityIds: ReadonlyArray<string>
  readonly axis: 'x' | 'y'
  readonly currentValues: ReadonlyArray<number>
  readonly suggestedValue: number
  readonly maxDriftM: number
  readonly humanReadable: string
}

/**
 * Détecte les groupes de sommets quasi-alignés sur X (ou Y) entre
 * polygones différents. Retourne des suggestions structurées.
 */
export function detectMisalignments(
  entities: ReadonlyArray<SpatialEntity>,
  toleranceM = 0.5,
): ReadonlyArray<AlignmentSuggestion> {
  const out: AlignmentSuggestion[] = []

  // Collecte tous les sommets X par cluster
  const verticesByEntity = new Map<string, Point2D[]>()
  for (const e of entities) {
    if (!isPolygon(e.geometry)) continue
    verticesByEntity.set(e.id, [...e.geometry.outer])
  }
  if (verticesByEntity.size < 2) return out

  // Cluster sur X
  const allX: Array<{ entityId: string; x: number }> = []
  for (const [id, pts] of verticesByEntity) {
    for (const p of pts) allX.push({ entityId: id, x: p.x })
  }
  allX.sort((a, b) => a.x - b.x)

  let i = 0
  while (i < allX.length) {
    const start = allX[i]
    const cluster: Array<{ entityId: string; x: number }> = [start]
    let j = i + 1
    while (j < allX.length && allX[j].x - start.x <= toleranceM) {
      cluster.push(allX[j])
      j++
    }
    // Suggestion seulement si cluster touche ≥ 2 entités différentes
    const distinct = new Set(cluster.map(c => c.entityId))
    if (distinct.size >= 2) {
      const median = cluster[Math.floor(cluster.length / 2)].x
      const drift = Math.max(...cluster.map(c => Math.abs(c.x - median)))
      out.push({
        id: `align-x-${out.length}`,
        affectedEntityIds: Array.from(distinct),
        axis: 'x',
        currentValues: cluster.map(c => c.x),
        suggestedValue: median,
        maxDriftM: drift,
        humanReadable:
          `${distinct.size} entités ont des murs verticaux à ${cluster[0].x.toFixed(2)}–${cluster[cluster.length - 1].x.toFixed(2)} m. ` +
          `Aligner sur x=${median.toFixed(2)} (drift ${(drift * 100).toFixed(0)} cm).`,
      })
    }
    i = j
  }
  return out
}

/**
 * Applique une suggestion sur les entités concernées.
 * Retourne les nouvelles entités (immutable).
 */
export function applyAlignmentSuggestion(
  entities: ReadonlyArray<SpatialEntity>,
  suggestion: AlignmentSuggestion,
): SpatialEntity[] {
  const targetIds = new Set(suggestion.affectedEntityIds)
  return entities.map(e => {
    if (!targetIds.has(e.id)) return [e][0]
    if (!isPolygon(e.geometry)) return e
    const tolerance = suggestion.maxDriftM + 0.05
    const newOuter = e.geometry.outer.map(p => {
      if (suggestion.axis === 'x' && Math.abs(p.x - suggestion.suggestedValue) <= tolerance) {
        return { x: suggestion.suggestedValue, y: p.y }
      }
      if (suggestion.axis === 'y' && Math.abs(p.y - suggestion.suggestedValue) <= tolerance) {
        return { x: p.x, y: suggestion.suggestedValue }
      }
      return p
    })
    return { ...e, geometry: { ...e.geometry, outer: newOuter }, updatedAt: new Date().toISOString() }
  })
}
