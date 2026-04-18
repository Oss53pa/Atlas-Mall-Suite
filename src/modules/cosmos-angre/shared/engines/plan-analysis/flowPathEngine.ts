// ═══ FLOW PATH ENGINE ═══
// Trace les chemins de flux ENTRÉES → SORTIES du centre commercial et recommande
// les panneaux d'affichage / directionnels à positionner.
//
// Philosophie :
//   - Un visiteur entre par une entrée, traverse le centre, ressort par une sortie
//   - À chaque point de décision (bifurcation, carrefour, changement d'étage),
//     il a besoin d'une signalétique directionnelle
//   - Aux entrées : panneau d'accueil avec plan
//   - Aux intersections majeures : panneaux directionnels (flèches)
//   - Aux zones confuses : panneaux "Vous êtes ici"
//   - Aux sorties : rien (ou flèche "sortie" déjà évidente)
//
// Pipeline :
//   1. Détecter entrées / sorties / transits (escalators, ascenseurs)
//   2. Calculer chemin A* pour chaque paire (entrée, sortie) réalisable
//   3. Agréger les chemins en une grille de « passage »
//   4. Détecter les cellules de décision (≥2 chemins divergents)
//   5. Classifier chaque point en type de panneau (welcome / directional / YAH / info)
//
// Aucune donnée mockée — tout est déduit du parsedPlan.

import { useSpaceCorrectionsStore } from '../../stores/spaceCorrectionsStore'
import { computeSkeleton } from './skeletonEngine'
import { buildNavGraph, shortestPath, type NavGraph } from './navGraphEngine'
import { computeSignagePlacement, toSignageRecommendations, type PlacementResult } from './signagePlacementEngine'
import { analyzePmr, type PmrResult } from './pmrConstraintEngine'
import {
  detectVerticalTransitionsFromSpaces,
  detectGuidanceRuptures,
  type VerticalTransition,
  type GuidanceRupture,
  type FloorInfo,
} from './multiFloorGraphEngine'

// ─── Types ───────────────────────────────────────────────────

export interface FlowSpace {
  id: string
  label: string
  type?: string
  areaSqm: number
  polygon: [number, number][]
  floorId?: string
}

export interface FlowEntryExit {
  id: string
  /** entrée principale vs secondaire vs transit (escalator/lift) */
  type: 'entrance' | 'exit' | 'transit'
  label: string
  x: number
  y: number
  floorId?: string
  /** poids = importance estimée (1 = principale, 0.5 = secondaire). */
  weight: number
  /** Origine de la détection (debug) */
  sourceSpaceId?: string
}

export interface FlowPath {
  id: string
  from: FlowEntryExit
  to: FlowEntryExit
  /** waypoints en coords monde (mètres) */
  waypoints: Array<{ x: number; y: number }>
  distanceM: number
  durationMin: number
  /** poids = from.weight × to.weight (pour la pondération de trafic) */
  weight: number
}

export type SignageType =
  | 'welcome'      // panneau d'accueil avec plan global (aux entrées)
  | 'directional'  // panneau directionnel avec flèches (bifurcations)
  | 'you-are-here' // plan local « vous êtes ici » (zones longues sans repère)
  | 'information'  // panneau info (sanitaires, POI locaux)
  | 'exit'         // panneau sortie

export interface SignageRecommendation {
  id: string
  type: SignageType
  /** position monde (mètres) */
  x: number
  y: number
  reason: string
  /** criticité */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** ids des chemins concernés */
  pathIds: string[]
  /** nombre de directions distinctes à cet endroit */
  directionsCount: number
  /** suggestions de contenu à afficher */
  suggestedContent: string[]
}

export interface FlowAnalysisInput {
  spaces: FlowSpace[]
  planWidth: number
  planHeight: number
  floorId?: string | null
  /** pas de grille en mètres (défaut 2.0). */
  gridStepM?: number
  /** Segments de mur pour le ray-casting visibilité des panneaux. */
  wallSegments?: Array<{ x1: number; y1: number; x2: number; y2: number }>
  /** Budget max de panneaux optionnels (hors ERP). Défaut 50. */
  signageBudget?: number
  /** Distance ERP max entre 2 panneaux sortie secours. Défaut 30m. */
  erpMaxSpacingM?: number
  /** Liste des étages détectés (pour analyse inter-étages). */
  floors?: FloorInfo[]
  /** Activer l'analyse PMR (défaut true). */
  includePmr?: boolean
}

export interface FlowAnalysisResult {
  entrances: FlowEntryExit[]
  exits: FlowEntryExit[]
  transits: FlowEntryExit[]
  paths: FlowPath[]
  signage: SignageRecommendation[]
  /** Graphe de navigation calculé (si squelettisation réussie). */
  navGraph?: NavGraph
  /** Placement raffiné des panneaux (ERP + ray-casting + glouton) si wallSegments fourni. */
  placement?: PlacementResult
  /** Analyse PMR (segments non conformes + score). */
  pmr?: PmrResult
  /** Transitions verticales détectées (escalators, ascenseurs, rampes, escaliers). */
  verticalTransitions?: VerticalTransition[]
  /** Ruptures de guidage détectées entre étages. */
  guidanceRuptures?: GuidanceRupture[]
  /** Méthode de calcul utilisée (pour diagnostic + debug overlay). */
  method: 'skeleton+dijkstra' | 'cellular-astar'
  summary: {
    pathsCount: number
    totalDistanceM: number
    avgDistanceM: number
    signageCount: number
    criticalSignageCount: number
    entrancesCount: number
    exitsCount: number
    unreachablePairs: number
    /** Compte de nœuds de décision (junctions du squelette). */
    decisionNodes: number
  }
}

// ─── Helpers géométrie ───────────────────────────────────────

function centroidOf(poly: [number, number][]): { x: number; y: number } {
  if (!poly.length) return { x: 0, y: 0 }
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return { x: cx / poly.length, y: cy / poly.length }
}

function bboxOf(poly: [number, number][]) {
  if (!poly.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

function pointInPolygon(px: number, py: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const hit = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
    if (hit) inside = !inside
  }
  return inside
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// ─── Catégorisation catégorielle d'un space ─────────────────

function categorize(s: FlowSpace): {
  isEntrance: boolean
  isExit: boolean
  isTransit: boolean
  isCirculation: boolean
  isServiceTech: boolean
  isCommercial: boolean
  /** true si ce space est un « couloir probable » (forme allongée). */
  isElongated: boolean
} {
  const label = (s.label ?? '').toLowerCase()
  const type = String(s.type ?? '').toLowerCase()
  const hay = label + ' ' + type
  const isEntrance = /entr[eé]e|entrance|\bentr[eé]?\b|entry|main\s*entrance/.test(hay)
  const isExit = /\bsortie\b|\bexit\b|issue\s*de\s*secours|emergency\s*exit|sortie\s*secours/.test(hay)
  const isTransit = /escal(?:ator|ier)?|\basc(?:enseur)?\b|\blift\b|elevator|stair/.test(hay)
  const isCirculation = /circul|\bmail\b|\bhall\b|lobby|couloir|passage|atrium|galerie|parvis|forum|rotonde|promenade|gallery|rue\s|avenue|all[eé]e\s|concourse|plaza/.test(hay)
  const isServiceTech = /technique|\blocal\b|electr|ventil|stockage|reserve|\bwc\b|sanitaire|toilet|gaine|ascenseur|cafet|cuisine/.test(hay) && !isTransit
  const isCommercial = /boutique|shop|magasin|store|\blot\b|\bcommerce\b|tenant|resto|restaurant|food|retail/.test(hay)

  const bb = bboxOf(s.polygon)
  const ratio = bb.w > 0 && bb.h > 0 ? Math.max(bb.w, bb.h) / Math.min(bb.w, bb.h) : 1
  const isElongated = ratio > 3.5 && s.areaSqm > 20

  return { isEntrance, isExit, isTransit, isCirculation, isServiceTech, isCommercial, isElongated }
}

/** Renvoie les polygones franchissables (zones de circulation uniquement). */
function detectWalkablePolygons(
  spaces: FlowSpace[],
  excludedIds: Set<string>,
): { polys: Array<[number, number][]>; reason: 'explicit' | 'shape-based' | 'fallback' } {
  // Niveau 1 — circulation explicite (+ transits)
  const explicit: FlowSpace[] = []
  for (const s of spaces) {
    if (excludedIds.has(s.id)) continue
    const cat = categorize(s)
    if (cat.isCirculation || cat.isTransit || cat.isEntrance || cat.isExit) explicit.push(s)
  }
  if (explicit.length >= 2) {
    return { polys: explicit.map(s => s.polygon), reason: 'explicit' }
  }

  // Niveau 2 — espaces allongés non-commerciaux (couloirs implicites)
  const shape: FlowSpace[] = []
  for (const s of spaces) {
    if (excludedIds.has(s.id)) continue
    const cat = categorize(s)
    if (cat.isServiceTech || cat.isCommercial) continue
    if (cat.isElongated) shape.push(s)
  }
  if (shape.length >= 2) {
    return { polys: shape.map(s => s.polygon), reason: 'shape-based' }
  }

  // Niveau 3 — dernier recours : tout sauf commercial/technique
  const fallback: FlowSpace[] = []
  for (const s of spaces) {
    if (excludedIds.has(s.id)) continue
    const cat = categorize(s)
    if (cat.isServiceTech || cat.isCommercial) continue
    if (s.areaSqm < 8) continue
    fallback.push(s)
  }
  return { polys: fallback.map(s => s.polygon), reason: 'fallback' }
}

// ─── Détection entrées / sorties / transits ─────────────────

function detectFlowPoints(
  spaces: FlowSpace[],
  planWidth: number,
  planHeight: number,
): { entrances: FlowEntryExit[]; exits: FlowEntryExit[]; transits: FlowEntryExit[] } {
  const entrances: FlowEntryExit[] = []
  const exits: FlowEntryExit[] = []
  const transits: FlowEntryExit[] = []
  const corr = (() => { try { return useSpaceCorrectionsStore.getState() } catch { return null } })()

  for (const s of spaces) {
    // corrections manuelles : si l'utilisateur a exclu un space, on l'ignore aussi ici
    if (corr?.isExcluded(s.id)) continue

    const cat = categorize(s)
    const c = centroidOf(s.polygon)
    const bb = bboxOf(s.polygon)

    // Distance au bord du plan (utilisée pour distinguer « principale » vs secondaire)
    const edgeDist = Math.min(c.x, c.y, planWidth - c.x, planHeight - c.y)
    const nearEdge = edgeDist < Math.min(planWidth, planHeight) * 0.15

    // Priorité : corrections label
    const displayLabel = corr?.resolveLabel(s.id, s.label) ?? s.label

    if (cat.isEntrance) {
      entrances.push({
        id: `ent-${s.id}`,
        type: 'entrance',
        label: displayLabel || 'Entrée',
        x: c.x, y: c.y,
        floorId: s.floorId,
        weight: nearEdge ? 1.0 : 0.6,
        sourceSpaceId: s.id,
      })
    }
    if (cat.isExit) {
      exits.push({
        id: `ex-${s.id}`,
        type: 'exit',
        label: displayLabel || 'Sortie',
        x: c.x, y: c.y,
        floorId: s.floorId,
        weight: nearEdge ? 1.0 : 0.6,
        sourceSpaceId: s.id,
      })
    }
    if (cat.isTransit) {
      transits.push({
        id: `tr-${s.id}`,
        type: 'transit',
        label: displayLabel || 'Escalator',
        x: c.x, y: c.y,
        floorId: s.floorId,
        weight: 0.8,
        sourceSpaceId: s.id,
      })
    }
  }

  // Fallback : si rien détecté → on prend les spaces de circulation aux 4 coins
  if (entrances.length === 0 && exits.length === 0) {
    const circulations = spaces
      .filter(s => {
        if (corr?.isExcluded(s.id)) return false
        const c = categorize(s)
        return c.isCirculation || c.isWalkable
      })
      .map(s => ({ s, c: centroidOf(s.polygon) }))

    if (circulations.length > 0) {
      // Trouve les 2 spaces les plus proches de 2 côtés opposés
      const left   = [...circulations].sort((a, b) => a.c.x - b.c.x)[0]
      const right  = [...circulations].sort((a, b) => b.c.x - a.c.x)[0]
      const top    = [...circulations].sort((a, b) => a.c.y - b.c.y)[0]
      const bottom = [...circulations].sort((a, b) => b.c.y - a.c.y)[0]

      // Le plus éloigné devient entrée principale, l'autre côté sortie
      const candidates = [
        { role: 'ent', pt: left,   desc: 'Ouest' },
        { role: 'ex',  pt: right,  desc: 'Est'   },
        { role: 'ent', pt: top,    desc: 'Nord'  },
        { role: 'ex',  pt: bottom, desc: 'Sud'   },
      ]
      for (const cand of candidates) {
        if (cand.role === 'ent') {
          entrances.push({
            id: `ent-auto-${cand.desc}`,
            type: 'entrance',
            label: `Entrée ${cand.desc} (détectée auto)`,
            x: cand.pt.c.x, y: cand.pt.c.y,
            floorId: cand.pt.s.floorId,
            weight: 0.7,
            sourceSpaceId: cand.pt.s.id,
          })
        } else {
          exits.push({
            id: `ex-auto-${cand.desc}`,
            type: 'exit',
            label: `Sortie ${cand.desc} (détectée auto)`,
            x: cand.pt.c.x, y: cand.pt.c.y,
            floorId: cand.pt.s.floorId,
            weight: 0.7,
            sourceSpaceId: cand.pt.s.id,
          })
        }
      }
    }
  }

  // Dédoublonnage (spaces à moins de 3m → on garde le 1er)
  const dedupe = (arr: FlowEntryExit[]): FlowEntryExit[] => {
    const out: FlowEntryExit[] = []
    for (const p of arr) {
      if (out.some(q => dist(p, q) < 3 && q.floorId === p.floorId)) continue
      out.push(p)
    }
    return out
  }

  // Limite raisonnable pour éviter explosion combinatoire
  const capN = (arr: FlowEntryExit[], n: number) =>
    arr.sort((a, b) => b.weight - a.weight).slice(0, n)

  return {
    entrances: capN(dedupe(entrances), 8),
    exits: capN(dedupe(exits), 8),
    transits: capN(dedupe(transits), 10),
  }
}

// ─── Grille A* ───────────────────────────────────────────────

interface Grid {
  cols: number
  rows: number
  cellSize: number
  originX: number
  originY: number
  walkable: Uint8Array
}

function buildGrid(walkablePolys: Array<[number, number][]>, cellSize: number): Grid {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of walkablePolys) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  if (!isFinite(minX)) return { cols: 0, rows: 0, cellSize, originX: 0, originY: 0, walkable: new Uint8Array() }

  const pad = cellSize * 2
  const cols = Math.ceil((maxX - minX + pad * 2) / cellSize)
  const rows = Math.ceil((maxY - minY + pad * 2) / cellSize)
  const walkable = new Uint8Array(cols * rows)
  const originX = minX - pad
  const originY = minY - pad

  for (let j = 0; j < rows; j++) {
    const y = originY + (j + 0.5) * cellSize
    for (let i = 0; i < cols; i++) {
      const x = originX + (i + 0.5) * cellSize
      for (const poly of walkablePolys) {
        if (pointInPolygon(x, y, poly)) { walkable[j * cols + i] = 1; break }
      }
    }
  }
  return { cols, rows, cellSize, originX, originY, walkable }
}

function worldToCell(g: Grid, x: number, y: number): { i: number; j: number } {
  return {
    i: Math.max(0, Math.min(g.cols - 1, Math.floor((x - g.originX) / g.cellSize))),
    j: Math.max(0, Math.min(g.rows - 1, Math.floor((y - g.originY) / g.cellSize))),
  }
}

function cellToWorld(g: Grid, i: number, j: number): { x: number; y: number } {
  return {
    x: g.originX + (i + 0.5) * g.cellSize,
    y: g.originY + (j + 0.5) * g.cellSize,
  }
}

/** Trouve la cellule franchissable la plus proche d'un point donné (BFS). */
function nearestWalkable(g: Grid, x: number, y: number, maxRadius = 20): { i: number; j: number } | null {
  const { i: ci, j: cj } = worldToCell(g, x, y)
  if (g.walkable[cj * g.cols + ci] === 1) return { i: ci, j: cj }
  const queue: Array<[number, number]> = [[ci, cj]]
  const seen = new Set<number>()
  seen.add(cj * g.cols + ci)
  let step = 0
  while (queue.length && step < maxRadius * g.cols) {
    const [i, j] = queue.shift()!
    if (g.walkable[j * g.cols + i] === 1) return { i, j }
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const ni = i + di, nj = j + dj
      if (ni < 0 || ni >= g.cols || nj < 0 || nj >= g.rows) continue
      const k = nj * g.cols + ni
      if (seen.has(k)) continue
      seen.add(k)
      queue.push([ni, nj])
    }
    step++
  }
  return null
}

/** A* retournant les cellules (i,j) traversées. */
function aStar(g: Grid, start: { i: number; j: number }, goal: { i: number; j: number }): Array<{ i: number; j: number }> | null {
  if (!g.cols || !g.rows) return null
  const idx = (i: number, j: number) => j * g.cols + i
  const h = (i: number, j: number) => Math.hypot(i - goal.i, j - goal.j)

  const open = new Map<number, { i: number; j: number; g: number; f: number }>()
  const gScore = new Float32Array(g.cols * g.rows).fill(Infinity)
  const cameFrom = new Int32Array(g.cols * g.rows).fill(-1)
  const startIdx = idx(start.i, start.j)
  gScore[startIdx] = 0
  open.set(startIdx, { i: start.i, j: start.j, g: 0, f: h(start.i, start.j) })

  const dirs: [number, number, number][] = [
    [1,0,1], [-1,0,1], [0,1,1], [0,-1,1],
    [1,1,Math.SQRT2], [-1,1,Math.SQRT2], [1,-1,Math.SQRT2], [-1,-1,Math.SQRT2],
  ]

  let safety = 0
  const maxIter = g.cols * g.rows * 4
  while (open.size && safety++ < maxIter) {
    // lowest f
    let bestKey = -1, bestF = Infinity, best: { i: number; j: number; g: number } | null = null
    for (const [k, v] of open) if (v.f < bestF) { bestF = v.f; bestKey = k; best = v }
    if (!best || bestKey < 0) break
    open.delete(bestKey)

    if (best.i === goal.i && best.j === goal.j) {
      // reconstruct
      const path: Array<{ i: number; j: number }> = []
      let cur = bestKey
      while (cur !== -1) {
        const j = Math.floor(cur / g.cols), i = cur - j * g.cols
        path.push({ i, j })
        cur = cameFrom[cur]
      }
      return path.reverse()
    }

    for (const [di, dj, cost] of dirs) {
      const ni = best.i + di, nj = best.j + dj
      if (ni < 0 || ni >= g.cols || nj < 0 || nj >= g.rows) continue
      const nk = idx(ni, nj)
      if (g.walkable[nk] !== 1) continue
      const tentative = best.g + cost
      if (tentative < gScore[nk]) {
        gScore[nk] = tentative
        cameFrom[nk] = idx(best.i, best.j)
        const f = tentative + h(ni, nj)
        open.set(nk, { i: ni, j: nj, g: tentative, f })
      }
    }
  }
  return null
}

// ─── Simplification du chemin (Douglas-Peucker-like) ────────

function simplifyPath(pts: Array<{ x: number; y: number }>, tol = 0.5): Array<{ x: number; y: number }> {
  if (pts.length < 3) return pts
  const out: Array<{ x: number; y: number }> = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1]
    const cur = pts[i]
    const next = pts[i + 1]
    const dx1 = cur.x - prev.x, dy1 = cur.y - prev.y
    const dx2 = next.x - cur.x, dy2 = next.y - cur.y
    const n1 = Math.hypot(dx1, dy1), n2 = Math.hypot(dx2, dy2)
    if (n1 < tol || n2 < tol) continue
    const cos = (dx1 * dx2 + dy1 * dy2) / (n1 * n2)
    // cos ≥ 0.98 ⇒ points quasi colinéaires → on les saute pour alléger
    if (cos < 0.98) out.push(cur)
  }
  out.push(pts[pts.length - 1])
  return out
}

// ─── Détection des points de décision ───────────────────────
// Principe : sur chaque chemin, un "coude" > ~30° est un point de décision
// potentiel. On agrège les points proches (< 5m) en un seul, qui devient
// un panneau directionnel. Plus il y a de chemins qui passent par ce
// point, plus il est critique.

interface DecisionCandidate {
  x: number
  y: number
  angleDeg: number
  pathIds: Set<string>
  /** Directions sortantes distinctes (pour détecter vrais carrefours) */
  outDirs: Array<{ x: number; y: number }>
}

function detectDecisions(paths: FlowPath[]): DecisionCandidate[] {
  const raw: DecisionCandidate[] = []

  for (const p of paths) {
    const wp = p.waypoints
    for (let i = 1; i < wp.length - 1; i++) {
      const a = wp[i - 1], b = wp[i], c = wp[i + 1]
      const dx1 = b.x - a.x, dy1 = b.y - a.y
      const dx2 = c.x - b.x, dy2 = c.y - b.y
      const n1 = Math.hypot(dx1, dy1), n2 = Math.hypot(dx2, dy2)
      if (n1 < 0.1 || n2 < 0.1) continue
      const cos = Math.max(-1, Math.min(1, (dx1 * dx2 + dy1 * dy2) / (n1 * n2)))
      const angle = Math.acos(cos) * 180 / Math.PI
      if (angle > 25) {
        raw.push({
          x: b.x, y: b.y,
          angleDeg: angle,
          pathIds: new Set([p.id]),
          outDirs: [{ x: dx2 / n2, y: dy2 / n2 }],
        })
      }
    }
  }

  // Clustering par proximité (< 5m)
  const clustered: DecisionCandidate[] = []
  for (const r of raw) {
    const match = clustered.find(c => Math.hypot(c.x - r.x, c.y - r.y) < 5)
    if (match) {
      // Moyenne pondérée des positions
      const n = match.pathIds.size + 1
      match.x = (match.x * (n - 1) + r.x) / n
      match.y = (match.y * (n - 1) + r.y) / n
      for (const id of r.pathIds) match.pathIds.add(id)
      // on garde toutes les directions sortantes
      for (const d of r.outDirs) {
        const exists = match.outDirs.some(od => (od.x * d.x + od.y * d.y) > 0.95)
        if (!exists) match.outDirs.push(d)
      }
      match.angleDeg = Math.max(match.angleDeg, r.angleDeg)
    } else {
      clustered.push({ ...r, pathIds: new Set(r.pathIds), outDirs: [...r.outDirs] })
    }
  }

  return clustered
}

// ─── Pipeline principal ─────────────────────────────────────

export function computeFlowPaths(input: FlowAnalysisInput): FlowAnalysisResult {
  const gridStep = input.gridStepM ?? 2.0
  const floorId = input.floorId ?? null

  // Filtrer spaces par étage
  const allSpaces = input.spaces.filter(s => !floorId || !s.floorId || s.floorId === floorId)

  // 1. Détection entrées / sorties / transits
  const { entrances, exits, transits } = detectFlowPoints(allSpaces, input.planWidth, input.planHeight)

  // 2. Construction de la grille — UNIQUEMENT sur les zones de circulation.
  //    On ajoute des carrés de dilatation autour des entrées/sorties pour
  //    garantir qu'elles sont connectées au réseau walkable même si elles sont
  //    au bord d'un couloir sans l'intersecter exactement.
  const corr = (() => { try { return useSpaceCorrectionsStore.getState() } catch { return null } })()
  const excludedIds = new Set<string>()
  if (corr) {
    for (const s of allSpaces) if (corr.isExcluded(s.id)) excludedIds.add(s.id)
  }

  const { polys: walkablePolys, reason: walkableReason } = detectWalkablePolygons(allSpaces, excludedIds)

  // Dilatation : petits carrés franchissables autour de chaque entrée/sortie
  const DILATE = 3 // mètres de rayon
  for (const p of [...entrances, ...exits, ...transits]) {
    walkablePolys.push([
      [p.x - DILATE, p.y - DILATE],
      [p.x + DILATE, p.y - DILATE],
      [p.x + DILATE, p.y + DILATE],
      [p.x - DILATE, p.y + DILATE],
    ])
  }

   
  console.debug(`[flowPathEngine] walkable source = ${walkableReason} (${walkablePolys.length} polygones)`)

  // ─── STRATÉGIE 1 : squelettisation + Dijkstra sur graphe de navigation ───
  // Plus précis et plus rapide que l'A* cellulaire. Produit aussi les
  // nœuds de décision (junctions) exploitables par la signalétique.
  let method: FlowAnalysisResult['method'] = 'skeleton+dijkstra'
  const paths: FlowPath[] = []
  let unreachable = 0
  let navGraph: NavGraph | undefined

  let useSkeleton = true
  try {
    // Surface walkable trop petite → skeleton instable → on bascule direct cellulaire
    const approxArea = walkablePolys.reduce((s, poly) => {
      let a = 0
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1])
      }
      return s + Math.abs(a / 2)
    }, 0)
    if (approxArea < 50) useSkeleton = false
  } catch { useSkeleton = false }

  if (useSkeleton) {
    try {
      const sk = computeSkeleton({
        walkablePolygons: walkablePolys,
        pixelsPerMeter: 5, // 20 cm/px — compromis précision/perf
        closingRadius: 2,
      })
      if (sk.nodes.length >= 2 && sk.edges.length >= 1) {
        // Spaces commerciaux attractifs pour pondération (tenants non techniques)
        const attractiveSpaces = allSpaces
          .filter(s => {
            if (excludedIds.has(s.id)) return false
            const c = categorize(s)
            return !c.isServiceTech && !c.isCirculation && !c.isEntrance && !c.isExit && s.areaSqm >= 10
          })
          .map(s => ({ polygon: s.polygon, attractivityScore: Math.min(1, s.areaSqm / 100) }))

        const anchors = [
          ...entrances.map(e => ({ id: e.id, x: e.x, y: e.y, label: e.label, kind: 'entrance' as const, refId: e.sourceSpaceId })),
          ...exits.map(e => ({ id: e.id, x: e.x, y: e.y, label: e.label, kind: 'exit' as const, refId: e.sourceSpaceId })),
          ...transits.map(e => ({ id: e.id, x: e.x, y: e.y, label: e.label, kind: 'transit' as const, refId: e.sourceSpaceId })),
        ]

        navGraph = buildNavGraph({ skeleton: sk, anchors, attractiveSpaces })

        for (const e of entrances) {
          for (const x of exits) {
            if ((e.floorId ?? null) !== (x.floorId ?? null)) continue
            const sp = shortestPath(navGraph, `anchor-${e.id}`, `anchor-${x.id}`)
            if (!sp || sp.waypoints.length < 2) { unreachable++; continue }
            const wps = simplifyPath(sp.waypoints, 0.3)
            paths.push({
              id: `path-${e.id}-${x.id}`,
              from: e, to: x,
              waypoints: wps,
              distanceM: sp.lengthM,
              durationMin: sp.lengthM / (1.3 * 60),
              weight: e.weight * x.weight,
            })
          }
        }

         
        console.debug(`[flowPathEngine] skeleton=${sk.stats.skeletonPixels}px, nodes=${sk.stats.nodeCount}, edges=${sk.stats.edgeCount}, junctions=${sk.stats.junctionCount}`)
      } else {
        useSkeleton = false
      }
    } catch (err) {
       
      console.warn('[flowPathEngine] skeleton failed, fallback A*:', err)
      useSkeleton = false
    }
  }

  // ─── STRATÉGIE 2 (FALLBACK) : A* cellulaire sur grille ──────────────
  if (!useSkeleton || paths.length === 0) {
    method = 'cellular-astar'
    const grid = buildGrid(walkablePolys, gridStep)

    for (const e of entrances) {
      for (const x of exits) {
        if ((e.floorId ?? null) !== (x.floorId ?? null)) continue
        // Ne pas doublonner si squelette a réussi pour cette paire
        if (paths.find(p => p.from.id === e.id && p.to.id === x.id)) continue

        const startCell = nearestWalkable(grid, e.x, e.y)
        const goalCell = nearestWalkable(grid, x.x, x.y)
        if (!startCell || !goalCell) { unreachable++; continue }

        const cellPath = aStar(grid, startCell, goalCell)
        if (!cellPath || cellPath.length < 2) { unreachable++; continue }

        const waypoints = simplifyPath(
          cellPath.map(c => cellToWorld(grid, c.i, c.j)),
          gridStep * 0.25,
        )
        let distance = 0
        for (let i = 1; i < waypoints.length; i++) {
          distance += dist(waypoints[i - 1], waypoints[i])
        }
        paths.push({
          id: `path-${e.id}-${x.id}`,
          from: e, to: x,
          waypoints,
          distanceM: distance,
          durationMin: distance / (1.3 * 60),
          weight: e.weight * x.weight,
        })
      }
    }
  }

  // 4. Détection points de décision → panneaux directionnels
  const decisions = detectDecisions(paths)

  const signage: SignageRecommendation[] = []

  // 4a. Panneau d'accueil à chaque entrée
  for (const e of entrances) {
    signage.push({
      id: `sig-welcome-${e.id}`,
      type: 'welcome',
      x: e.x, y: e.y,
      reason: `Panneau d'accueil à l'entrée « ${e.label} » : plan général + annuaire des boutiques`,
      priority: e.weight >= 0.9 ? 'critical' : 'high',
      pathIds: paths.filter(p => p.from.id === e.id).map(p => p.id),
      directionsCount: paths.filter(p => p.from.id === e.id).length,
      suggestedContent: [
        'Plan 2D du niveau avec « Vous êtes ici »',
        'Annuaire catégorisé (mode / resto / services)',
        'Horaires d\'ouverture',
        'Pictogrammes accessibilité / sanitaires / parking',
      ],
    })
  }

  // 4b. Panneaux directionnels aux points de décision
  for (const d of decisions) {
    const nPaths = d.pathIds.size
    const priority: SignageRecommendation['priority'] =
      nPaths >= 4 ? 'critical' :
      nPaths >= 2 ? 'high' :
      d.angleDeg > 60 ? 'medium' : 'low'
    signage.push({
      id: `sig-dir-${signage.length}`,
      type: 'directional',
      x: d.x, y: d.y,
      reason: `Point de décision : ${nPaths} chemin${nPaths > 1 ? 's' : ''} bifurquent ici (angle ${d.angleDeg.toFixed(0)}°)`,
      priority,
      pathIds: Array.from(d.pathIds),
      directionsCount: d.outDirs.length,
      suggestedContent: buildDirectionalContent(d, paths),
    })
  }

  // 4c. Panneaux "Vous êtes ici" tous les ~30m sur les longs chemins sans décision
  for (const p of paths) {
    if (p.distanceM < 40) continue
    let accumulated = 0
    for (let i = 1; i < p.waypoints.length; i++) {
      const a = p.waypoints[i - 1], b = p.waypoints[i]
      const seg = dist(a, b)
      accumulated += seg
      if (accumulated > 30) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        // Pas de doublon proche d'une décision déjà placée
        const closeToDecision = signage.some(s =>
          (s.type === 'directional' || s.type === 'you-are-here') &&
          Math.hypot(s.x - mx, s.y - my) < 15,
        )
        if (!closeToDecision) {
          signage.push({
            id: `sig-yah-${signage.length}`,
            type: 'you-are-here',
            x: mx, y: my,
            reason: `Segment long sans repère sur ${p.from.label} → ${p.to.label}`,
            priority: 'medium',
            pathIds: [p.id],
            directionsCount: 1,
            suggestedContent: [
              'Plan local avec position "Vous êtes ici"',
              'Distances aux points d\'intérêt proches',
              'Indication des sanitaires et sorties',
            ],
          })
          accumulated = 0
        }
      }
    }
  }

  // 4d. Panneau sortie à chaque sortie
  for (const x of exits) {
    signage.push({
      id: `sig-exit-${x.id}`,
      type: 'exit',
      x: x.x, y: x.y,
      reason: `Confirmation visuelle de la sortie « ${x.label} »`,
      priority: 'low',
      pathIds: paths.filter(p => p.to.id === x.id).map(p => p.id),
      directionsCount: 1,
      suggestedContent: ['Pictogramme sortie standard', 'Indication parking / accès transports'],
    })
  }

  // ─── 4d-bis. Analyse PMR préalable (pour alimenter le score cohérence) ─
  let pmrPre: PmrResult | undefined
  if (navGraph && (input.includePmr ?? true)) {
    try {
      pmrPre = analyzePmr({
        graph: navGraph,
        spaces: allSpaces.map(s => ({
          polygon: s.polygon,
          label: s.label,
          type: s.type,
          areaSqm: s.areaSqm,
        })),
      })
    } catch { /* non-bloquant */ }
  }

  // ─── 4e. Placement raffiné (ray-casting + ERP + glouton) ─────
  // Uniquement si les segments de mur sont fournis (ray-casting nécessaire).
  let placement: PlacementResult | undefined
  let finalSignage = signage
  if (input.wallSegments && input.wallSegments.length > 0) {
    try {
      placement = computeSignagePlacement({
        paths,
        entrances,
        exits,
        navGraph,
        spaces: allSpaces,
        walls: input.wallSegments,
        maxPanels: input.signageBudget ?? 50,
        erpMaxSpacingM: input.erpMaxSpacingM ?? 30,
        pmrComplianceScore: pmrPre?.complianceScore,
      })
      // Remplace la signalétique heuristique par la signalétique calculée
      finalSignage = toSignageRecommendations(placement.panels)
       
      console.debug(
        `[flowPathEngine] placement: ${placement.summary.totalPanels} panneaux (${placement.summary.mandatoryPanels} ERP + ${placement.summary.optionalPanels} optionnels), score cohérence ${placement.coherence.total}/100`,
      )
    } catch (err) {
       
      console.warn('[flowPathEngine] placement engine failed:', err)
    }
  }

  // ─── 4f. PMR + transitions verticales + ruptures ──
  const pmr = pmrPre
  if (pmr) {
     
    console.debug(
      `[flowPathEngine] PMR: ${pmr.stats.nonCompliantEdges}/${pmr.stats.totalEdges} arêtes non conformes, score ${pmr.complianceScore}/100`,
    )
  }
  let verticalTransitions: VerticalTransition[] | undefined
  let guidanceRuptures: GuidanceRupture[] | undefined

  if (input.floors && input.floors.length > 1) {
    try {
      verticalTransitions = detectVerticalTransitionsFromSpaces(
        allSpaces.map(s => ({ ...s, areaSqm: s.areaSqm })),
        input.floors,
      )

      if (placement && verticalTransitions.length > 0) {
        guidanceRuptures = detectGuidanceRuptures({
          transitions: verticalTransitions,
          floors: input.floors,
          signagePositions: placement.panels.map(p => ({
            floorId: floorId ?? input.floors![0].id,
            x: p.x,
            y: p.y,
          })),
        })
        if (guidanceRuptures.length > 0) {
           
          console.debug(`[flowPathEngine] ${guidanceRuptures.length} rupture(s) de guidage inter-étages détectée(s)`)
        }
      }
    } catch (err) {
       
      console.warn('[flowPathEngine] multi-floor analysis failed:', err)
    }
  }

  // 5. Summary
  const totalDistanceM = paths.reduce((s, p) => s + p.distanceM, 0)
  const decisionNodes = navGraph
    ? navGraph.nodes.filter(n => n.kind === 'junction').length
    : detectDecisions(paths).length
  return {
    entrances,
    exits,
    transits,
    paths,
    signage: finalSignage,
    navGraph,
    placement,
    pmr,
    verticalTransitions,
    guidanceRuptures,
    method,
    summary: {
      pathsCount: paths.length,
      totalDistanceM,
      avgDistanceM: paths.length ? totalDistanceM / paths.length : 0,
      signageCount: finalSignage.length,
      criticalSignageCount: finalSignage.filter(s => s.priority === 'critical').length,
      entrancesCount: entrances.length,
      exitsCount: exits.length,
      unreachablePairs: unreachable,
      decisionNodes,
    },
  }
}

// Construit le texte suggéré d'un panneau directionnel basé sur les chemins
function buildDirectionalContent(d: DecisionCandidate, paths: FlowPath[]): string[] {
  const content: string[] = []
  for (const pid of d.pathIds) {
    const p = paths.find(pp => pp.id === pid)
    if (!p) continue
    // Détermine direction cardinale vers la destination
    const dir = cardinalDir(d, p.to)
    content.push(`${dir} → vers ${p.to.label}`)
  }
  if (content.length === 0) content.push('Flèches directionnelles vers les zones principales')
  return content
}

function cardinalDir(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x, dy = to.y - from.y
  const ang = Math.atan2(dy, dx) * 180 / Math.PI
  // axes orientés selon plan (y+ = sud typiquement)
  if (ang > -22.5 && ang <= 22.5)  return '→'
  if (ang > 22.5 && ang <= 67.5)   return '↘'
  if (ang > 67.5 && ang <= 112.5)  return '↓'
  if (ang > 112.5 && ang <= 157.5) return '↙'
  if (ang > 157.5 || ang <= -157.5) return '←'
  if (ang > -157.5 && ang <= -112.5) return '↖'
  if (ang > -112.5 && ang <= -67.5)  return '↑'
  if (ang > -67.5 && ang <= -22.5)   return '↗'
  return '→'
}
