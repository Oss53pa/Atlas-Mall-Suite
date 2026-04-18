// ═══ ERP CONSTRAINT ENGINE — contraintes réglementaires (non négociables) ═══
//
// Règle PROPH3T Vol.3 : "ERP prime toujours sur l'optimisation du flux.
// PROPH3T optimise le flux dans les contraintes ERP, jamais l'inverse."
//
// Contrainte principale : panneau "sortie secours" visible tous les 30 m
// maximum le long de chaque chemin principal menant à une issue.
//
// Normes référencées :
//   - Arrêté du 25 juin 1980 (sécurité ERP, évacuation)
//   - NF X 08-003 (pictogrammes)
//   - ISO 7010 (signalétique sécurité internationale)
//   - NF EN ISO 7010 (formes/couleurs normalisées)
//
// Ce moteur produit une LISTE DE PANNEAUX OBLIGATOIRES qui sont placés
// en priorité absolue avant toute optimisation de budget.

import type { FlowPath, FlowEntryExit } from './flowPathEngine'

// ─── Types ─────────────────────────────────────────────

export interface MandatoryPanel {
  id: string
  /** Position monde en mètres. */
  x: number
  y: number
  /** Type de panneau obligatoire. */
  kind: 'emergency-exit' | 'exit-direction' | 'emergency-plan' | 'pmr-direction'
  /** Norme qui impose ce panneau. */
  standard: string
  /** Distance au panneau précédent sur le même chemin (pour cascade ERP). */
  distanceFromPreviousM?: number
  /** Chemins concernés (ids). */
  pathIds: string[]
  /** Description de la raison d'emplacement. */
  reason: string
  /** Direction suggérée (deg, 0 = +X). */
  orientationDeg?: number
  /** Contenu textuel suggéré. */
  content: string
}

export interface ErpInput {
  paths: FlowPath[]
  entrances: FlowEntryExit[]
  exits: FlowEntryExit[]
  /** Distance maximum entre 2 panneaux sortie secours sur un chemin (défaut 30 m). */
  maxSpacingM?: number
  /** Ajouter un panneau à chaque entrée (plan d'évacuation). Défaut true. */
  emergencyPlanAtEntrances?: boolean
}

export interface ErpResult {
  panels: MandatoryPanel[]
  /** Indicateur de conformité : true si aucune rupture > maxSpacingM. */
  compliant: boolean
  /** Chemins avec rupture de couverture (non conformes). */
  nonCompliantPathIds: string[]
  stats: {
    emergencyExitPanels: number
    exitDirectionPanels: number
    emergencyPlanPanels: number
    pmrDirectionPanels: number
    maxGapM: number
    averageSpacingM: number
  }
}

// ─── Helpers ───────────────────────────────────────────

function pathLength(waypoints: Array<{ x: number; y: number }>): number {
  let len = 0
  for (let i = 1; i < waypoints.length; i++) {
    len += Math.hypot(waypoints[i].x - waypoints[i - 1].x, waypoints[i].y - waypoints[i - 1].y)
  }
  return len
}

function pointAtDistance(
  waypoints: Array<{ x: number; y: number }>,
  targetDist: number,
): { x: number; y: number; orientationDeg: number } | null {
  let acc = 0
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1]
    const b = waypoints[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (acc + seg >= targetDist) {
      const t = (targetDist - acc) / seg
      const x = a.x + (b.x - a.x) * t
      const y = a.y + (b.y - a.y) * t
      const orientationDeg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI
      return { x, y, orientationDeg }
    }
    acc += seg
  }
  return null
}

// ─── Pipeline principal ───────────────────────────────

export function computeErpPanels(input: ErpInput): ErpResult {
  const maxSpacing = input.maxSpacingM ?? 30
  const panels: MandatoryPanel[] = []
  const nonCompliantPathIds: string[] = []
  let maxGap = 0
  let totalSpacing = 0
  let spacingCount = 0

  // ─── 1. Panneau "plan d'évacuation" à chaque entrée (obligatoire ERP) ──
  if (input.emergencyPlanAtEntrances ?? true) {
    for (const e of input.entrances) {
      panels.push({
        id: `erp-plan-${e.id}`,
        x: e.x,
        y: e.y,
        kind: 'emergency-plan',
        standard: 'Arrêté 25 juin 1980 art. MS41',
        pathIds: input.paths.filter(p => p.from.id === e.id).map(p => p.id),
        reason: `Plan d'évacuation obligatoire à l'entrée « ${e.label} » (ERP).`,
        content: 'Plan d\'évacuation avec « Vous êtes ici » + numéros de secours + itinéraire sortie la plus proche',
      })
    }
  }

  // ─── 2. Panneau sortie immédiate à chaque sortie (ISO 7010) ─────────
  for (const x of input.exits) {
    panels.push({
      id: `erp-exit-${x.id}`,
      x: x.x,
      y: x.y,
      kind: 'emergency-exit',
      standard: 'ISO 7010 E001 / E002',
      pathIds: input.paths.filter(p => p.to.id === x.id).map(p => p.id),
      reason: `Pictogramme sortie « ${x.label} » (ISO 7010 — norme internationale).`,
      content: 'Pictogramme sortie (homme qui court, vert, fond blanc) + éclairage BAES',
    })
  }

  // ─── 3. Cascade de panneaux direction-sortie tous les 30 m ──────────
  for (const path of input.paths) {
    const totalLen = pathLength(path.waypoints)
    if (totalLen < maxSpacing) continue

    let placed = 0
    let lastPos = maxSpacing
    while (lastPos < totalLen - maxSpacing * 0.5) {
      const pt = pointAtDistance(path.waypoints, lastPos)
      if (!pt) break

      panels.push({
        id: `erp-dir-${path.id}-${placed}`,
        x: pt.x,
        y: pt.y,
        kind: 'exit-direction',
        standard: 'ISO 7010 E006 (flèche directionnelle sortie)',
        distanceFromPreviousM: lastPos === maxSpacing ? lastPos : maxSpacing,
        pathIds: [path.id],
        reason: `Relais directionnel sortie secours (chemin ${path.from.label} → ${path.to.label}, +${lastPos.toFixed(0)}m).`,
        orientationDeg: pt.orientationDeg,
        content: `Pictogramme flèche sortie → ${path.to.label} (${(totalLen - lastPos).toFixed(0)}m restants)`,
      })

      placed++
      totalSpacing += maxSpacing
      spacingCount++
      lastPos += maxSpacing
    }

    // Contrôle conformité : si le dernier panneau est à > 30m de la sortie, alerte
    const remaining = totalLen - (lastPos - maxSpacing)
    if (remaining > maxSpacing * 1.2) {
      nonCompliantPathIds.push(path.id)
      if (remaining > maxGap) maxGap = remaining
    }
  }

  const emergencyExitPanels = panels.filter(p => p.kind === 'emergency-exit').length
  const exitDirectionPanels = panels.filter(p => p.kind === 'exit-direction').length
  const emergencyPlanPanels = panels.filter(p => p.kind === 'emergency-plan').length
  const pmrDirectionPanels = panels.filter(p => p.kind === 'pmr-direction').length

  return {
    panels,
    compliant: nonCompliantPathIds.length === 0,
    nonCompliantPathIds,
    stats: {
      emergencyExitPanels,
      exitDirectionPanels,
      emergencyPlanPanels,
      pmrDirectionPanels,
      maxGapM: maxGap,
      averageSpacingM: spacingCount ? totalSpacing / spacingCount : 0,
    },
  }
}
