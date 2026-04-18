// ═══ VOL.2 · Hungarian Algorithm — affectation agents ↔ incidents ═══
//
// Algorithme hongrois (Kuhn-Munkres) pour résoudre le problème
// d'affectation optimale : M agents vs N incidents simultanés, en
// minimisant la somme des temps de réponse.
//
// Complexité : O(n³) où n = max(M, N). Adéquat jusqu'à n=100.
//
// Usage Vol.2 :
//   - Multi-alertes simultanées (évacuation partielle + incident)
//   - Optimiser le routage immédiat de chaque agent disponible
//   - Produire le planning d'intervention optimal
//
// Référence : Kuhn 1955 "The Hungarian method for the assignment problem".

// ─── Types ─────────────────────────────────────────

export interface AssignmentInput {
  /** Agents disponibles. */
  agents: Array<{ id: string; x: number; y: number; label: string }>
  /** Incidents à couvrir. */
  incidents: Array<{ id: string; x: number; y: number; severity: 'low' | 'medium' | 'high' | 'critical'; label: string }>
  /** Fonction coût agent i → incident j (sec). Défaut = distance / 2.5 m/s. */
  costFn?: (agentIdx: number, incidentIdx: number) => number
  /** Vitesse par défaut. */
  walkSpeedMps?: number
  /** Pénalité par niveau de sévérité (multiplicateur sur coût si pas affecté). */
  severityPenaltyMultiplier?: Record<'low' | 'medium' | 'high' | 'critical', number>
}

export interface AssignmentPair {
  agentId: string
  agentLabel: string
  incidentId: string
  incidentLabel: string
  costSec: number
  distanceM: number
  severity: string
}

export interface AssignmentResult {
  assignments: AssignmentPair[]
  /** Agents sans affectation (reste en veille). */
  unassignedAgents: Array<{ id: string; label: string }>
  /** Incidents non couverts (agents insuffisants). */
  uncoveredIncidents: Array<{ id: string; label: string; severity: string }>
  totalCostSec: number
  /** Durée de calcul. */
  computeMs: number
}

// ─── Algorithme hongrois ─────────────────────────

/**
 * Résout le problème d'affectation (minimisation) sur matrice N×N.
 * Retourne un tableau où res[i] = j signifie ligne i ↦ colonne j.
 * -1 signifie pas d'affectation.
 */
export function solveHungarian(cost: number[][]): number[] {
  const n = cost.length
  if (n === 0) return []
  // Padding si non carré
  const m = cost[0]?.length ?? 0
  const size = Math.max(n, m)
  const BIG = 1e12

  const c: number[][] = []
  for (let i = 0; i < size; i++) {
    const row: number[] = []
    for (let j = 0; j < size; j++) {
      row.push(i < n && j < m ? cost[i][j] : BIG)
    }
    c.push(row)
  }

  // Implémentation "Jonker-Volgenant" simplifiée O(n³)
  const u = new Array(size + 1).fill(0)
  const v = new Array(size + 1).fill(0)
  const p = new Array(size + 1).fill(0)
  const way = new Array(size + 1).fill(0)

  for (let i = 1; i <= size; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(size + 1).fill(Infinity)
    const used = new Array(size + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = Infinity
      let j1 = 0
      for (let j = 1; j <= size; j++) {
        if (!used[j]) {
          const cur = c[i0 - 1][j - 1] - u[i0] - v[j]
          if (cur < minv[j]) {
            minv[j] = cur
            way[j] = j0
          }
          if (minv[j] < delta) {
            delta = minv[j]
            j1 = j
          }
        }
      }
      for (let j = 0; j <= size; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)

    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }

  const result = new Array(n).fill(-1)
  for (let j = 1; j <= size; j++) {
    const i = p[j] - 1
    if (i >= 0 && i < n && j - 1 < m) {
      if (c[i][j - 1] < BIG / 2) result[i] = j - 1
    }
  }
  return result
}

// ─── Pipeline Vol.2 ──────────────────────────────

export function assignAgentsToIncidents(input: AssignmentInput): AssignmentResult {
  const t0 = performance.now()
  const speed = input.walkSpeedMps ?? 2.5
  const sevMult = input.severityPenaltyMultiplier ?? {
    low: 1, medium: 0.9, high: 0.75, critical: 0.5,
  }

  const M = input.agents.length
  const N = input.incidents.length
  if (M === 0 || N === 0) {
    return {
      assignments: [],
      unassignedAgents: input.agents.map(a => ({ id: a.id, label: a.label })),
      uncoveredIncidents: input.incidents.map(i => ({ id: i.id, label: i.label, severity: i.severity })),
      totalCostSec: 0,
      computeMs: performance.now() - t0,
    }
  }

  // Matrice de coût M×N (sec) avec pondération sévérité
  const costFn = input.costFn ?? ((i, j) => {
    const a = input.agents[i]
    const b = input.incidents[j]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    return (d / speed) * sevMult[b.severity]
  })
  const cost: number[][] = []
  for (let i = 0; i < M; i++) {
    const row: number[] = []
    for (let j = 0; j < N; j++) {
      row.push(costFn(i, j))
    }
    cost.push(row)
  }

  const assignment = solveHungarian(cost)
  const pairs: AssignmentPair[] = []
  const assignedAgents = new Set<number>()
  const coveredIncidents = new Set<number>()

  for (let i = 0; i < M; i++) {
    const j = assignment[i]
    if (j >= 0 && j < N) {
      const a = input.agents[i]
      const b = input.incidents[j]
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      pairs.push({
        agentId: a.id,
        agentLabel: a.label,
        incidentId: b.id,
        incidentLabel: b.label,
        costSec: cost[i][j],
        distanceM: d,
        severity: b.severity,
      })
      assignedAgents.add(i)
      coveredIncidents.add(j)
    }
  }

  const unassignedAgents = input.agents
    .map((a, i) => (!assignedAgents.has(i) ? { id: a.id, label: a.label } : null))
    .filter((x): x is { id: string; label: string } => x !== null)

  const uncoveredIncidents = input.incidents
    .map((b, j) => (!coveredIncidents.has(j) ? { id: b.id, label: b.label, severity: b.severity } : null))
    .filter((x): x is { id: string; label: string; severity: string } => x !== null)
    // Priorité : montrer d'abord critical
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99)
    })

  return {
    assignments: pairs,
    unassignedAgents,
    uncoveredIncidents,
    totalCostSec: pairs.reduce((s, p) => s + p.costSec, 0),
    computeMs: performance.now() - t0,
  }
}
