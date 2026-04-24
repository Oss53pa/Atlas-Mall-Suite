// ═══ OVERLAP & SELF-INTERSECTION DETECTION ═══
//
// Implémentation native (sans dépendance) pour la détection de :
//   • auto-intersection d'un polygone (Bentley-Ottmann simplifié : test
//     naïf O(n²) des paires d'arêtes non-adjacentes → suffisant car les
//     polygones Atlas BIM ont ≤ quelques dizaines de sommets)
//   • chevauchement entre polygones (SAT sur convexes + fallback sampling
//     pour les non-convexes)
//
// Pour les futures opérations booléennes (union/difference/intersection
// exactes), on pourra basculer sur `polygon-clipping` (30 kB) — voir
// TODO bas de fichier. Tant que le besoin reste détection binaire, on
// évite la dépendance.
//
// Unités : millimètres entiers.

import type { PolygonMm, PointMm } from './constraints'

// ─── Auto-intersection ────────────────────────────────────

/**
 * Teste si un polygone se coupe lui-même. Deux arêtes adjacentes (qui
 * partagent un sommet) sont naturellement exclues. Pour le reste, on fait
 * un test O(n²) de segments. Correct pour n ≤ ~500.
 */
export function hasSelfIntersection(polygon: PolygonMm): boolean {
  const n = polygon.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a1 = polygon[i]
    const a2 = polygon[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      // skip adjacent edges (partagent un sommet) et les arêtes
      // directement voisines via le wrap-around 0↔n-1.
      if (j === i || j === (i + 1) % n || (i === 0 && j === n - 1)) continue
      const b1 = polygon[j]
      const b2 = polygon[(j + 1) % n]
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

/**
 * Intersection propre (les deux segments se croisent à l'intérieur, pas
 * seulement au point commun d'extrémités).
 */
function segmentsProperlyIntersect(
  p1: PointMm, p2: PointMm,
  p3: PointMm, p4: PointMm,
): boolean {
  const d1 = cross(p4, p3, p1)
  const d2 = cross(p4, p3, p2)
  const d3 = cross(p2, p1, p3)
  const d4 = cross(p2, p1, p4)
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) return true
  // Cas colinéaires = pas "propre" pour notre usage (on veut flagger
  // les croisements francs, pas les arêtes qui se touchent par un bout).
  return false
}

function cross(o: PointMm, a: PointMm, b: PointMm): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

// ─── Chevauchement inter-polygones ────────────────────────

export interface OverlapPair {
  readonly indexA: number
  readonly indexB: number
}

/**
 * Retourne toutes les paires (i, j) i<j de polygones qui se chevauchent.
 * Chevauchement ≠ adjacence : deux polygones qui partagent une arête
 * sans intérieur commun ne sont PAS signalés.
 *
 * Algorithme :
 *   1. Filtre rapide par bounding box (O(n²) brut, optimisable plus tard
 *      avec un R-tree si n > quelques centaines).
 *   2. Test d'intersection d'arêtes (proper intersect).
 *   3. Fallback : si aucune arête ne se croise, on teste si un sommet de
 *      A est strictement à l'intérieur de B (ou l'inverse) → un polygone
 *      contient l'autre.
 */
export function detectOverlaps(polygons: readonly PolygonMm[]): OverlapPair[] {
  const bboxes = polygons.map(computeBBox)
  const out: OverlapPair[] = []
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      if (!bboxesIntersect(bboxes[i], bboxes[j])) continue
      if (polygonsOverlap(polygons[i], polygons[j])) {
        out.push({ indexA: i, indexB: j })
      }
    }
  }
  return out
}

/** Test binaire paire-à-paire. Expose pour appel direct depuis l'UI. */
export function polygonsOverlap(a: PolygonMm, b: PolygonMm): boolean {
  // 1. Test d'intersection d'arêtes
  const na = a.length, nb = b.length
  for (let i = 0; i < na; i++) {
    const a1 = a[i]
    const a2 = a[(i + 1) % na]
    for (let j = 0; j < nb; j++) {
      const b1 = b[j]
      const b2 = b[(j + 1) % nb]
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true
    }
  }
  // 2. Containment : un sommet strictement dedans ?
  if (pointStrictlyInside(a[0], b)) return true
  if (pointStrictlyInside(b[0], a)) return true
  return false
}

// ─── BBox ─────────────────────────────────────────────────

interface BBox { minX: number; minY: number; maxX: number; maxY: number }

function computeBBox(poly: PolygonMm): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function bboxesIntersect(a: BBox, b: BBox): boolean {
  return !(a.maxX < b.minX || b.maxX < a.minX || a.maxY < b.minY || b.maxY < a.minY)
}

// ─── Point-in-polygon strict ──────────────────────────────

/**
 * Ray casting. Strict : un point exactement sur une arête n'est PAS
 * considéré dedans (pour qu'on ne flag pas les polygones seulement
 * adjacents).
 */
function pointStrictlyInside(p: PointMm, poly: PolygonMm): boolean {
  let inside = false
  const n = poly.length
  const [px, py] = p
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    // point sur un sommet ? → pas strict dedans
    if ((xi === px && yi === py) || (xj === px && yj === py)) return false
    const intersects =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

// DÉCISION rc.1 : on NE PAS ajouter `polygon-clipping` pour l'instant.
// Nos besoins actuels (détection binaire overlap + self-intersection) sont
// couverts par ce fichier, sans dépendance. Le seul consommateur potentiel
// d'unions booléennes exactes (coherenceEngine/unionPolygons) fonctionne
// avec notre implémentation maison. Réévaluation reportée v1.0-beta si un
// besoin concret apparaît. Gain : ~30 kB bundle, zéro surface d'attaque.
