// ═══ Topology Audit Engine — SEM-03 / SEM-04 ═══
//
// CDC §3.1 :
//   SEM-03 — Détecter incohérences topologiques (orphelins, surfaces nulles,
//            zones non fermées, doublons, isolés)
//   SEM-04 — Proposer correction pour chaque incohérence
//
// Pur (pas de side-effect). Retourne un rapport + des autoFix exécutables
// optionnellement par l'UI.

import type { ParsedPlan, DetectedSpace } from '../shared/planReader/planEngineTypes'

// ─── Types ─────────────────────────────────────

export type TopologyIssueKind =
  | 'orphan'           // espace sans voisin (jamais accessible)
  | 'zero-area'        // surface nulle ou < 0.5 m²
  | 'unclosed'         // polygone non fermé (1er ≠ dernier)
  | 'self-intersect'   // arêtes qui se croisent
  | 'overlap'          // chevauche un autre espace > 50%
  | 'isolated'         // sans connexion graphe
  | 'duplicate'        // identique à un autre espace
  | 'unlabeled'        // pas de label
  | 'tiny-perimeter'   // périmètre très petit (< 5 m) → probablement bruit
  | 'huge-area'        // surface > seuil (> 10 000 m² → suspect)

export interface TopologyIssue {
  spaceId?: string
  kind: TopologyIssueKind
  severity: 'low' | 'medium' | 'high'
  description: string
  /** Suggestion de correction lisible. */
  suggestion: string
  /** Action automatique (optionnelle). */
  autoFix?: () => void
  /** Coordonnées pour highlight UI. */
  centroid?: { x: number; y: number }
}

export interface TopologyAuditResult {
  issues: TopologyIssue[]
  /** Score 0..100 de qualité topologique. */
  overallScore: number
  /** Stats par type. */
  byKind: Partial<Record<TopologyIssueKind, number>>
  /** Surfaces aberrantes. */
  stats: {
    spacesCount: number
    averageAreaSqm: number
    medianAreaSqm: number
    minAreaSqm: number
    maxAreaSqm: number
  }
}

// ─── Géométrie helpers ────────────────────────

function polyPerimeter(poly: [number, number][]): number {
  let p = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    p += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return p
}

function polyCentroid(poly: [number, number][]): { x: number; y: number } {
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return { x: cx / poly.length, y: cy / poly.length }
}

function bbox(poly: [number, number][]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function bboxOverlap(a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): number {
  const dx = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)
  const dy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY)
  return Math.max(0, dx) * Math.max(0, dy)
}

function bboxArea(b: ReturnType<typeof bbox>): number {
  return Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY)
}

function segmentsIntersect(a1: [number, number], a2: [number, number],
                            b1: [number, number], b2: [number, number]): boolean {
  const d = (a2[0] - a1[0]) * (b2[1] - b1[1]) - (a2[1] - a1[1]) * (b2[0] - b1[0])
  if (Math.abs(d) < 1e-9) return false
  const t = ((b1[0] - a1[0]) * (b2[1] - b1[1]) - (b1[1] - a1[1]) * (b2[0] - b1[0])) / d
  const u = ((b1[0] - a1[0]) * (a2[1] - a1[1]) - (b1[1] - a1[1]) * (a2[0] - a1[0])) / d
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6
}

// ─── Pipeline ─────────────────────────────────

export function auditPlanTopology(plan: ParsedPlan): TopologyAuditResult {
  const spaces = plan.spaces ?? []
  const issues: TopologyIssue[] = []

  // Statistiques de surface
  const areas = spaces.map(s => s.areaSqm).sort((a, b) => a - b)
  const stats = {
    spacesCount: spaces.length,
    averageAreaSqm: areas.length ? areas.reduce((s, a) => s + a, 0) / areas.length : 0,
    medianAreaSqm: areas.length ? areas[Math.floor(areas.length / 2)] : 0,
    minAreaSqm: areas[0] ?? 0,
    maxAreaSqm: areas[areas.length - 1] ?? 0,
  }

  // Index par bbox pour overlap detection
  const boxes = spaces.map(s => ({ space: s, box: bbox(s.polygon) }))

  // ─── Vérifications ───
  for (const s of spaces) {
    const area = s.areaSqm
    const perimeter = polyPerimeter(s.polygon)
    const centroid = polyCentroid(s.polygon)

    // Zero area
    if (area < 0.5) {
      issues.push({
        spaceId: s.id, kind: 'zero-area', severity: 'high',
        description: `Surface aberrante : ${area.toFixed(3)} m².`,
        suggestion: 'Supprimer ce space ou redessiner ses contours.',
        centroid,
      })
    }

    // Tiny perimeter
    if (perimeter < 5 && area > 0.5) {
      issues.push({
        spaceId: s.id, kind: 'tiny-perimeter', severity: 'medium',
        description: `Périmètre très court (${perimeter.toFixed(1)} m).`,
        suggestion: 'Probablement un artefact d\'import — vérifier visuellement.',
        centroid,
      })
    }

    // Huge area
    if (area > 10000) {
      issues.push({
        spaceId: s.id, kind: 'huge-area', severity: 'medium',
        description: `Surface anormalement grande (${area.toFixed(0)} m² > 10 000).`,
        suggestion: 'Vérifier l\'unité de mesure et la calibration de l\'import DXF.',
        centroid,
      })
    }

    // Unlabeled
    if (!s.label || s.label.trim().length === 0) {
      issues.push({
        spaceId: s.id, kind: 'unlabeled', severity: 'low',
        description: 'Espace sans label.',
        suggestion: 'Renommer via SpaceLabelEditor pour permettre la classification PROPH3T.',
        centroid,
      })
    }

    // Unclosed (LWPOLYLINE non fermée détectée par 1er ≠ dernier)
    if (s.polygon.length >= 3) {
      const first = s.polygon[0]
      const last = s.polygon[s.polygon.length - 1]
      const dist = Math.hypot(first[0] - last[0], first[1] - last[1])
      if (dist > 0.5) {
        issues.push({
          spaceId: s.id, kind: 'unclosed', severity: 'high',
          description: `Polygone non fermé (écart 1er↔dernier vertex : ${dist.toFixed(2)} m).`,
          suggestion: 'Fermer automatiquement en ajoutant le 1er vertex à la fin.',
          centroid,
          autoFix: () => {
            (s as DetectedSpace & { polygon: [number, number][] }).polygon.push([first[0], first[1]])
          },
        })
      }
    }

    // Self intersect (vérification limitée aux 50 premiers segments pour perf)
    const N = Math.min(s.polygon.length, 50)
    let selfHit = false
    for (let i = 0; i < N - 1 && !selfHit; i++) {
      for (let j = i + 2; j < N - 1 && !selfHit; j++) {
        if (i === 0 && j === N - 2) continue
        if (segmentsIntersect(s.polygon[i], s.polygon[i + 1], s.polygon[j], s.polygon[j + 1])) {
          selfHit = true
        }
      }
    }
    if (selfHit) {
      issues.push({
        spaceId: s.id, kind: 'self-intersect', severity: 'high',
        description: 'Polygone auto-intersectant.',
        suggestion: 'Re-tracer ce contour manuellement (mode polygone).',
        centroid,
      })
    }
  }

  // Overlaps (bbox-based, cheap)
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      if (a.space.floorId && b.space.floorId && a.space.floorId !== b.space.floorId) continue
      const inter = bboxOverlap(a.box, b.box)
      if (inter <= 0) continue
      const minA = bboxArea(a.box)
      const minB = bboxArea(b.box)
      const ratio = inter / Math.min(minA, minB)
      if (ratio > 0.5) {
        issues.push({
          spaceId: a.space.id, kind: 'overlap', severity: 'medium',
          description: `Chevauche ${b.space.label || b.space.id.slice(0, 6)} à ${(ratio * 100).toFixed(0)} %.`,
          suggestion: 'Fusionner les 2 spaces (M) ou découper l\'un d\'eux (X).',
          centroid: polyCentroid(a.space.polygon),
        })
      }
    }
  }

  // Duplicates : labels strictement identiques + bbox proche
  const byLabel = new Map<string, DetectedSpace[]>()
  for (const s of spaces) {
    if (!s.label) continue
    const key = s.label.trim().toLowerCase()
    if (!byLabel.has(key)) byLabel.set(key, [])
    byLabel.get(key)!.push(s)
  }
  for (const [label, group] of byLabel) {
    if (group.length < 2) continue
    for (let i = 1; i < group.length; i++) {
      const ref = group[0]
      const dup = group[i]
      if (Math.abs(ref.areaSqm - dup.areaSqm) / Math.max(ref.areaSqm, 1) < 0.05) {
        issues.push({
          spaceId: dup.id, kind: 'duplicate', severity: 'low',
          description: `Doublon présumé de "${label}" (surfaces quasi égales).`,
          suggestion: 'Supprimer ou différencier le label.',
          centroid: polyCentroid(dup.polygon),
        })
      }
    }
  }

  // Isolated : pas de bbox-voisin dans un rayon de 3 m (CDC : "espaces orphelins")
  for (let i = 0; i < boxes.length; i++) {
    const a = boxes[i]
    let hasNeighbor = false
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue
      const b = boxes[j]
      if (a.space.floorId && b.space.floorId && a.space.floorId !== b.space.floorId) continue
      const dx = Math.max(0, Math.max(a.box.minX - b.box.maxX, b.box.minX - a.box.maxX))
      const dy = Math.max(0, Math.max(a.box.minY - b.box.maxY, b.box.minY - a.box.maxY))
      if (dx + dy < 3) { hasNeighbor = true; break }
    }
    if (!hasNeighbor && a.space.areaSqm > 5) {
      issues.push({
        spaceId: a.space.id, kind: 'isolated', severity: 'medium',
        description: `Aucun voisin à moins de 3 m — espace orphelin.`,
        suggestion: 'Vérifier l\'import DXF (calque manquant ?) ou retirer cet espace.',
        centroid: polyCentroid(a.space.polygon),
      })
    }
  }

  // Score global
  const byKind: Partial<Record<TopologyIssueKind, number>> = {}
  for (const i of issues) byKind[i.kind] = (byKind[i.kind] ?? 0) + 1
  const severeCount = issues.filter(i => i.severity === 'high').length
  const mediumCount = issues.filter(i => i.severity === 'medium').length
  const lowCount = issues.filter(i => i.severity === 'low').length
  const penalty = severeCount * 10 + mediumCount * 4 + lowCount * 1
  const overallScore = Math.max(0, Math.min(100, 100 - penalty))

  return { issues, overallScore, byKind, stats }
}

/** Applique automatiquement les corrections sécurisées (autoFix) sur un plan. */
export function applyAutoFixes(audit: TopologyAuditResult, severityThreshold: 'low' | 'medium' | 'high' = 'high'): number {
  const order: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 }
  let applied = 0
  for (const i of audit.issues) {
    if (order[i.severity] < order[severityThreshold]) continue
    if (i.autoFix) { i.autoFix(); applied++ }
  }
  return applied
}
