// ═══ POV GUIDE ENGINE — visite guidée first-person ═══
//
// Simule la traversée d'un FlowPath à vitesse de marche (1,3 m/s par défaut) :
//   - Position progressive le long des waypoints
//   - À chaque nœud de décision rencontré, vérifie quels panneaux sont visibles
//     depuis ce point → détecte panneaux manquants ou mal orientés
//   - Produit un « script » de visite : list de steps (position, direction, événements)
//
// Ce moteur est découplé du rendu 3D — il produit les métadonnées, la scène
// 3D exploite `getStepAt(timeSec)` pour placer la caméra.

import { checkVisibility, type PanelCandidate, type Obstacle, buildObstaclesFromSpaces } from './signageVisibilityEngine'
import type { FlowPath } from './flowPathEngine'
import type { PlacedPanel } from './signagePlacementEngine'

// ─── Types ─────────────────────────────────────────────

export interface PovStep {
  /** Temps en secondes depuis le début. */
  tSec: number
  /** Position courante en mètres. */
  x: number
  y: number
  /** Hauteur œil (mètres). */
  z: number
  /** Direction (radians) — axe +X = 0. */
  yaw: number
  /** Événements déclenchés à ce pas. */
  events: PovEvent[]
}

export type PovEvent =
  | { kind: 'enter-path'; pathId: string; pathLabel: string }
  | { kind: 'decision-node'; nodeId: string; visiblePanels: string[]; missingPanelCategories: string[] }
  | { kind: 'panel-visible'; panelId: string; panelType: string; distanceM: number; score: number }
  | { kind: 'panel-missing'; message: string; x: number; y: number }
  | { kind: 'exit-path'; pathId: string }

export interface PovScript {
  path: FlowPath
  steps: PovStep[]
  totalDurationSec: number
  /** Résumé : combien de panneaux manquants, mal orientés, bien placés. */
  summary: {
    totalDecisionPoints: number
    decisionsWithSignage: number
    decisionsMissingSignage: number
    panelsSeenAtLeastOnce: Set<string>
    missingRecommendations: string[]
  }
}

export interface PovGuideInput {
  path: FlowPath
  panels: PlacedPanel[]
  /** Nœuds de décision à traverser (positions monde). */
  decisionPoints: Array<{ id: string; x: number; y: number }>
  /** Spaces pour obstacles. */
  spaces: Array<{ polygon: [number, number][] }>
  /** Murs. */
  walls: Array<{ x1: number; y1: number; x2: number; y2: number }>
  /** Vitesse marche (m/s). Défaut 1.3. */
  walkSpeedMps?: number
  /** Pas de temps (s). Défaut 0.2. */
  dtSec?: number
  /** Hauteur œil (m). Défaut 1.6. */
  eyeHeightM?: number
  /** Rayon de détection d'un nœud de décision (m). Défaut 3. */
  decisionProximityM?: number
}

// ─── Construction du script ───────────────────────────

export function buildPovScript(input: PovGuideInput): PovScript {
  const speed = input.walkSpeedMps ?? 1.3
  const dt = input.dtSec ?? 0.2
  const eye = input.eyeHeightM ?? 1.6
  const decisionRadius = input.decisionProximityM ?? 3
  const obstacles: Obstacle[] = buildObstaclesFromSpaces(input.spaces, input.walls)

  const wps = input.path.waypoints
  const steps: PovStep[] = []
  const seenPanels = new Set<string>()
  const visitedDecisions = new Set<string>()
  let decisionsWithSignage = 0
  let decisionsMissingSignage = 0
  const missingRecommendations: string[] = []

  // Événement d'entrée
  steps.push({
    tSec: 0,
    x: wps[0].x,
    y: wps[0].y,
    z: eye,
    yaw: wps.length > 1 ? Math.atan2(wps[1].y - wps[0].y, wps[1].x - wps[0].x) : 0,
    events: [{ kind: 'enter-path', pathId: input.path.id, pathLabel: `${input.path.from.label} → ${input.path.to.label}` }],
  })

  let t = 0
  // Parcourir chaque segment
  for (let i = 1; i < wps.length; i++) {
    const a = wps[i - 1]
    const b = wps[i]
    const segLen = Math.hypot(b.x - a.x, b.y - a.y)
    const segYaw = Math.atan2(b.y - a.y, b.x - a.x)
    const nSteps = Math.max(1, Math.ceil(segLen / (speed * dt)))

    for (let k = 1; k <= nSteps; k++) {
      const f = k / nSteps
      const x = a.x + (b.x - a.x) * f
      const y = a.y + (b.y - a.y) * f
      t += dt * (segLen / (speed * dt) / nSteps)

      const events: PovEvent[] = []

      // Détecter approche d'un nœud de décision
      for (const d of input.decisionPoints) {
        if (visitedDecisions.has(d.id)) continue
        const dist = Math.hypot(x - d.x, y - d.y)
        if (dist > decisionRadius) continue
        visitedDecisions.add(d.id)

        // Vérifier panneaux visibles depuis ce nœud
        const visibleHere: string[] = []
        const categoriesVisibles = new Set<string>()
        for (const p of input.panels) {
          const candidate: PanelCandidate = {
            id: p.id, x: p.x, y: p.y,
            mount: p.mount,
            orientationDeg: p.orientationDeg,
          }
          const res = checkVisibility({
            panel: candidate,
            observerX: x, observerY: y,
            obstacles,
          })
          if (res.visible) {
            visibleHere.push(p.id)
            categoriesVisibles.add(p.kind)
            seenPanels.add(p.id)
            events.push({
              kind: 'panel-visible',
              panelId: p.id,
              panelType: p.kind,
              distanceM: res.distanceM,
              score: res.score,
            })
          }
        }

        // Il manque au moins un panneau directionnel à une intersection ?
        const missing: string[] = []
        if (visibleHere.length === 0) {
          missing.push('directional')
          missingRecommendations.push(`Aucun panneau visible au nœud (${d.x.toFixed(0)}, ${d.y.toFixed(0)}).`)
          decisionsMissingSignage++
          events.push({
            kind: 'panel-missing',
            message: 'Nœud de décision sans aucun panneau visible',
            x: d.x, y: d.y,
          })
        } else {
          decisionsWithSignage++
        }

        events.push({
          kind: 'decision-node',
          nodeId: d.id,
          visiblePanels: visibleHere,
          missingPanelCategories: missing,
        })
      }

      steps.push({ tSec: t, x, y, z: eye, yaw: segYaw, events })
    }
  }

  // Événement de sortie
  steps.push({
    tSec: t + 0.5,
    x: wps[wps.length - 1].x,
    y: wps[wps.length - 1].y,
    z: eye,
    yaw: steps[steps.length - 1]?.yaw ?? 0,
    events: [{ kind: 'exit-path', pathId: input.path.id }],
  })

  return {
    path: input.path,
    steps,
    totalDurationSec: t,
    summary: {
      totalDecisionPoints: visitedDecisions.size,
      decisionsWithSignage,
      decisionsMissingSignage,
      panelsSeenAtLeastOnce: seenPanels,
      missingRecommendations,
    },
  }
}

/** Retourne l'état (position + yaw) interpolé à un temps donné. */
export function stateAt(script: PovScript, tSec: number): { x: number; y: number; z: number; yaw: number; stepIndex: number } {
  if (script.steps.length === 0) return { x: 0, y: 0, z: 1.6, yaw: 0, stepIndex: 0 }
  if (tSec <= 0) return { ...pick(script.steps[0]), stepIndex: 0 }
  if (tSec >= script.totalDurationSec) {
    const last = script.steps[script.steps.length - 1]
    return { ...pick(last), stepIndex: script.steps.length - 1 }
  }

  // Binaire
  let lo = 0, hi = script.steps.length - 1
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (script.steps[m].tSec < tSec) lo = m + 1
    else hi = m
  }
  const i = Math.max(0, lo - 1)
  const a = script.steps[i]
  const b = script.steps[Math.min(script.steps.length - 1, i + 1)]
  const f = (tSec - a.tSec) / Math.max(0.001, b.tSec - a.tSec)
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    z: a.z + (b.z - a.z) * f,
    yaw: shortestYawLerp(a.yaw, b.yaw, f),
    stepIndex: i,
  }
}

function pick(s: PovStep) {
  return { x: s.x, y: s.y, z: s.z, yaw: s.yaw }
}

function shortestYawLerp(a: number, b: number, f: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * f
}
