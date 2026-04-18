// ═══ Bottleneck Detection — PC-06 ═══
//
// CDC §3.4 :
//   PC-06 — Détecter les zones de congestion, goulots, angles morts
//           signalétiques
//
// 3 analyses :
//   1. Goulots de circulation (largeur < seuil + flux > seuil)
//   2. Zones de congestion (densité > 4 pers/m² dans la heatmap ABM)
//   3. Angles morts signalétique (zones > 15 m sans panneau visible)

import type { FlowAnalysisResult } from '../../shared/engines/plan-analysis/flowPathEngine'
import type { AbmResult } from '../../shared/engines/plan-analysis/abmSocialForceEngine'

// ─── Types ────────────────────────────────────

export type BottleneckSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface BottleneckIssue {
  id: string
  kind: 'narrow-passage' | 'congestion-zone' | 'signage-blind-spot' | 'dead-end' | 'traffic-cross'
  severity: BottleneckSeverity
  position: { x: number; y: number; floorId?: string }
  description: string
  /** Métrique chiffrée. */
  metric: { name: string; value: number; unit: string; threshold?: number }
  /** Recommandation correction. */
  recommendation: string
  /** Edge ou node id concerné. */
  refIds?: string[]
}

export interface BottleneckReport {
  issues: BottleneckIssue[]
  byKind: Record<BottleneckIssue['kind'], number>
  bySeverity: Record<BottleneckSeverity, number>
  /** Score qualité 0..100. */
  fluidityScore: number
  generatedAt: string
}

// ─── Helpers ──────────────────────────────────

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// ─── Pipeline ─────────────────────────────────

export interface BottleneckInput {
  flow: FlowAnalysisResult
  /** Résultats ABM optionnels (heatmaps de densité). */
  abmResults?: AbmResult[]
  /** Largeur estimée des couloirs (m). Si fournie, détecte goulots. */
  edgeWidthMap?: Map<string, number>
  /** Seuil largeur considéré comme goulot. */
  narrowThresholdM?: number
  /** Seuil densité critique (pers/m²). */
  densityThresholdPerSqm?: number
  /** Distance max acceptable sans panneau (m). */
  signageMaxGapM?: number
}

export function detectBottlenecks(input: BottleneckInput): BottleneckReport {
  const issues: BottleneckIssue[] = []
  const narrowThr = input.narrowThresholdM ?? 1.4   // CDC PMR
  const densityThr = input.densityThresholdPerSqm ?? 4
  const signageGapMax = input.signageMaxGapM ?? 15

  // ═══ 1. GOULOTS DE CIRCULATION ═══
  if (input.flow.navGraph && input.edgeWidthMap) {
    for (const e of input.flow.navGraph.edges) {
      const width = input.edgeWidthMap.get(e.id) ?? 2.0
      if (width < narrowThr) {
        const from = input.flow.navGraph.nodes.find(n => n.id === e.fromId)
        const to = input.flow.navGraph.nodes.find(n => n.id === e.toId)
        if (!from || !to) continue
        const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
        // Sévérité dépend du flux estimé sur cette arête
        const traffic = input.flow.paths.filter(p =>
          p.waypoints.some(w => Math.hypot(w.x - mid.x, w.y - mid.y) < 5)
        ).length
        const severity: BottleneckSeverity =
          width < 0.9 ? 'critical' :
          traffic > 4 ? 'high' :
          traffic > 1 ? 'medium' : 'low'
        issues.push({
          id: `narrow-${e.id}`,
          kind: 'narrow-passage',
          severity,
          position: mid,
          description: `Passage de largeur ${width.toFixed(2)} m (${traffic} chemins le traversent).`,
          metric: { name: 'Largeur', value: width, unit: 'm', threshold: narrowThr },
          recommendation: width < 0.9
            ? `Élargir d'urgence (sortie secours bloquée potentielle).`
            : `Élargir à ≥ 1,40 m (PMR / Loi 2005-102).`,
          refIds: [e.id],
        })
      }
    }
  }

  // ═══ 2. ZONES DE CONGESTION ═══
  if (input.abmResults) {
    for (const abm of input.abmResults) {
      for (const spot of (abm.stats.congestionSpots ?? [])) {
        if (spot.peakDensity < densityThr) continue
        const severity: BottleneckSeverity =
          spot.peakDensity > 6 ? 'critical' :
          spot.peakDensity > 5 ? 'high' :
          'medium'
        issues.push({
          id: `cong-${spot.x.toFixed(0)}-${spot.y.toFixed(0)}-${(abm as any).slot ?? 'x'}`,
          kind: 'congestion-zone',
          severity,
          position: { x: spot.x, y: spot.y },
          description: `Densité maximale ${spot.peakDensity.toFixed(2)} pers/m² (seuil ${densityThr}).`,
          metric: { name: 'Densité pic', value: spot.peakDensity, unit: 'pers/m²', threshold: densityThr },
          recommendation: spot.peakDensity > 6
            ? `Risque écrasement — élargir l'espace, ajouter une issue, gérer le flux.`
            : `Diluer le flux par signalétique alternative ou aménagement.`,
        })
      }
    }
  }

  // ═══ 3. ANGLES MORTS SIGNALÉTIQUE ═══
  // Parcourir les chemins, chercher segments > signageGapMax sans panneau visible
  const placedPanels = input.flow.placement?.panels ?? input.flow.signage ?? []
  for (const path of input.flow.paths) {
    let cursorDist = 0
    for (let i = 1; i < path.waypoints.length; i++) {
      const a = path.waypoints[i - 1]
      const b = path.waypoints[i]
      const seg = dist(a, b)
      // Vérifier si un panneau est visible dans une fenêtre de 8 m autour du milieu
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const nearestPanel = placedPanels.find(p => dist(p, mid) < 8)
      if (!nearestPanel) cursorDist += seg
      else cursorDist = 0

      if (cursorDist >= signageGapMax) {
        issues.push({
          id: `blind-${path.id}-${i}`,
          kind: 'signage-blind-spot',
          severity: cursorDist > 25 ? 'high' : 'medium',
          position: mid,
          description: `Aucun panneau visible sur ${cursorDist.toFixed(0)} m de chemin (${path.from.label} → ${path.to.label}).`,
          metric: { name: 'Distance sans panneau', value: cursorDist, unit: 'm', threshold: signageGapMax },
          recommendation: `Placer un panneau « Vous êtes ici » ou directionnel à ce point.`,
          refIds: [path.id],
        })
        cursorDist = 0
      }
    }
  }

  // ═══ 4. CARREFOURS DE FLUX ═══
  // Détection de zones où plusieurs chemins se croisent à angle ouvert
  if (input.flow.navGraph) {
    for (const node of input.flow.navGraph.nodes) {
      if (node.kind !== 'junction') continue
      const incomingEdges = input.flow.navGraph.edges.filter(e => e.fromId === node.id || e.toId === node.id)
      if (incomingEdges.length >= 4) {
        // Carrefour ≥ 4 directions = zone à risque de croisement de flux
        const traffic = input.flow.paths.filter(p =>
          p.waypoints.some(w => Math.hypot(w.x - node.x, w.y - node.y) < 5)
        ).length
        if (traffic >= 3) {
          issues.push({
            id: `cross-${node.id}`,
            kind: 'traffic-cross',
            severity: traffic >= 6 ? 'high' : 'medium',
            position: { x: node.x, y: node.y },
            description: `Carrefour ${incomingEdges.length} directions, ${traffic} chemins se croisent.`,
            metric: { name: 'Chemins traversants', value: traffic, unit: 'chemins' },
            recommendation: `Installer une borne wayfinder ou un plan « Vous êtes ici ». Marquage sol différencié.`,
            refIds: [node.id],
          })
        }
      }
    }
  }

  // ═══ 5. CULS-DE-SAC ═══
  if (input.flow.navGraph) {
    for (const node of input.flow.navGraph.nodes) {
      if (node.kind !== 'endpoint') continue
      // Si endpoint sans sortie associée, c'est un cul-de-sac
      const isExitOrEntrance = input.flow.entrances.some(e => Math.hypot(e.x - node.x, e.y - node.y) < 3)
        || input.flow.exits.some(e => Math.hypot(e.x - node.x, e.y - node.y) < 3)
      if (!isExitOrEntrance) {
        issues.push({
          id: `dead-${node.id}`,
          kind: 'dead-end',
          severity: 'low',
          position: { x: node.x, y: node.y },
          description: `Cul-de-sac dans le réseau de circulation.`,
          metric: { name: 'Endpoint isolé', value: 1, unit: '' },
          recommendation: `Vérifier que c'est intentionnel (local technique fermé) ou ajouter une issue.`,
          refIds: [node.id],
        })
      }
    }
  }

  // ─── Agrégation ─────────────────────────

  const byKind: Record<BottleneckIssue['kind'], number> = {
    'narrow-passage': 0, 'congestion-zone': 0, 'signage-blind-spot': 0,
    'dead-end': 0, 'traffic-cross': 0,
  }
  const bySeverity: Record<BottleneckSeverity, number> = {
    critical: 0, high: 0, medium: 0, low: 0,
  }
  for (const i of issues) {
    byKind[i.kind]++
    bySeverity[i.severity]++
  }

  const penalty = bySeverity.critical * 25 + bySeverity.high * 8
    + bySeverity.medium * 3 + bySeverity.low * 1
  const fluidityScore = Math.max(0, Math.min(100, 100 - penalty))

  return {
    issues,
    byKind, bySeverity,
    fluidityScore,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Insights texte ───────────────────────────

export function summarizeBottlenecks(report: BottleneckReport): string[] {
  const out: string[] = []
  out.push(`Score de fluidité : ${report.fluidityScore}/100`)
  out.push(`Total problèmes : ${report.issues.length}`)
  if (report.bySeverity.critical > 0) out.push(`⚠ ${report.bySeverity.critical} critique(s) — action immédiate`)
  if (report.bySeverity.high > 0) out.push(`◐ ${report.bySeverity.high} haute(s) priorité`)
  out.push(`Goulots étroits : ${report.byKind['narrow-passage']}`)
  out.push(`Zones congestion : ${report.byKind['congestion-zone']}`)
  out.push(`Angles morts signalétique : ${report.byKind['signage-blind-spot']}`)
  out.push(`Carrefours risque : ${report.byKind['traffic-cross']}`)
  out.push(`Culs-de-sac : ${report.byKind['dead-end']}`)
  return out
}
