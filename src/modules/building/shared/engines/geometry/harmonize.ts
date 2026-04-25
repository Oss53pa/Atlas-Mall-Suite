// ═══ HARMONIZE — Alignement global des polygones ═══
//
// Le cleanup polygone-par-polygone (legacyCleanup.ts) ne suffit pas pour
// obtenir un rendu visuellement HARMONIEUX : deux commerces voisins peuvent
// être chacun "propre" mais avec leurs murs partagés à 5 cm de différence
// → l'œil voit un défaut d'alignement.
//
// Cette passe traite TOUS les polygones d'un coup :
//   1. Collecte toutes les coordonnées X de sommets (et Y séparément)
//   2. Regroupe les coords proches (cluster avec tolérance)
//   3. Remplace chaque coord par la médiane de son cluster
//
// Résultat : des centaines de sommets qui étaient à x ∈ [10.20, 10.31]
// deviennent tous à x = 10.25 (la médiane). Les murs partagés s'alignent.
//
// Convention : tout en MÈTRES FLOAT (pour rester compatible avec les
// `EditableSpace.polygon` du reste de l'app sans conversion).

export type PointM = { readonly x: number; readonly y: number }
export type PolygonM = readonly PointM[]

export interface HarmonizeOptions {
  /** Tolérance de regroupement en mètres. Défaut 12 cm. */
  readonly toleranceM?: number
  /** Limite supérieure de déplacement par sommet (sécurité). Défaut 25 cm. */
  readonly maxDisplacementM?: number
}

/**
 * Harmonise un ensemble de polygones : aligne les coordonnées X et Y
 * proches sur une valeur médiane commune. Pure : retourne de nouveaux
 * polygones, ne modifie pas l'entrée.
 */
export function harmonizePolygons(
  polygons: readonly PolygonM[],
  options: HarmonizeOptions = {},
): PolygonM[] {
  const tol = options.toleranceM ?? 0.12
  const maxDisplacement = options.maxDisplacementM ?? 0.25
  if (polygons.length === 0) return []

  // ─── 1. Collecte toutes les coords ─────────────────────
  const allX: number[] = []
  const allY: number[] = []
  for (const poly of polygons) {
    for (const p of poly) {
      if (Number.isFinite(p.x)) allX.push(p.x)
      if (Number.isFinite(p.y)) allY.push(p.y)
    }
  }
  if (allX.length === 0) return polygons.map(p => [...p])

  // ─── 2. Construit la table de remplacement ─────────────
  const xMap = buildSnapTable(allX, tol)
  const yMap = buildSnapTable(allY, tol)

  // ─── 3. Applique avec garde-fou de déplacement ─────────
  return polygons.map(poly =>
    poly.map(p => {
      const newX = lookupSnap(xMap, p.x)
      const newY = lookupSnap(yMap, p.y)
      const dx = newX - p.x
      const dy = newY - p.y
      const drift = Math.hypot(dx, dy)
      if (drift > maxDisplacement) {
        // Drift trop important → on ne harmonise pas ce sommet
        return { x: p.x, y: p.y }
      }
      return { x: newX, y: newY }
    }),
  )
}

// ─── Cluster + médiane ────────────────────────────────────

/**
 * Construit une table coord → coord-médiane-cluster.
 *
 * Algo : tri + balayage linéaire. Un cluster commence à la première coord ;
 * tant que la coord suivante est à ≤ tol de la PREMIÈRE du cluster, on
 * l'absorbe. Sinon on ferme le cluster (médiane) et on en commence un
 * nouveau. C'est plus stable que "à ≤ tol de la PRÉCÉDENTE" qui pourrait
 * fusionner des clusters via une longue chaîne.
 */
function buildSnapTable(values: readonly number[], tol: number): Map<number, number> {
  const sorted = [...values].sort((a, b) => a - b)
  const map = new Map<number, number>()
  let clusterStart = 0
  for (let i = 1; i <= sorted.length; i++) {
    const isEnd = i === sorted.length
    const exceeded = !isEnd && (sorted[i] - sorted[clusterStart] > tol)
    if (isEnd || exceeded) {
      // Ferme le cluster [clusterStart, i)
      const median = clusterMedian(sorted, clusterStart, i)
      for (let j = clusterStart; j < i; j++) {
        map.set(sorted[j], median)
      }
      clusterStart = i
    }
  }
  return map
}

function clusterMedian(sorted: readonly number[], start: number, end: number): number {
  const n = end - start
  if (n === 0) return 0
  if (n === 1) return sorted[start]
  const mid = start + Math.floor(n / 2)
  if (n % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function lookupSnap(map: Map<number, number>, value: number): number {
  const direct = map.get(value)
  if (direct !== undefined) return direct
  // Le map est indexé par les VALEURS originales. Si on tombe sur une coord
  // qui n'est pas dans le map (impossible en pratique car on a inséré
  // toutes les coords), fallback sur la valeur originale.
  return value
}
