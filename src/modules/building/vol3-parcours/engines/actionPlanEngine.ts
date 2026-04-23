// ═══ ACTION PLAN ENGINE — Integrated Gantt planning ═══

// ── Types ────────────────────────────────────────────────────

export type ActionStatus = 'a_faire' | 'en_cours' | 'bloque' | 'termine'
export type ActionPriority = 'critique' | 'haute' | 'normale' | 'basse'
export type ActionVolume = 'vol1' | 'vol2' | 'vol3' | 'transversal'

export interface ActionItem {
  id: string
  volume: ActionVolume
  title: string
  description: string
  responsable: string
  startDate: string
  endDate: string
  status: ActionStatus
  priority: ActionPriority
  dependencies: string[]
  estimatedCostFcfa?: number
  cockpitMilestoneId?: string
}

// ── Status labels & colors ───────────────────────────────────

export const STATUS_COLORS: Record<ActionStatus, string> = {
  a_faire: '#6b7280',
  en_cours: '#38bdf8',
  bloque: '#ef4444',
  termine: '#22c55e',
}

export const STATUS_LABELS: Record<ActionStatus, string> = {
  a_faire: 'A faire',
  en_cours: 'En cours',
  bloque: 'Bloque',
  termine: 'Termine',
}

export const PRIORITY_COLORS: Record<ActionPriority, string> = {
  critique: '#ef4444',
  haute: '#f59e0b',
  normale: '#38bdf8',
  basse: '#6b7280',
}

export const VOLUME_COLORS: Record<ActionVolume, string> = {
  vol1: '#f59e0b',
  vol2: '#38bdf8',
  vol3: '#22c55e',
  transversal: '#b38a5a',
}

// ── Generate default action plan for The Mall ────────────

export function generateDefaultActionPlan(): ActionItem[] {
  return [
    // Vol.2 — Security
    {
      id: 'act-sec-01', volume: 'vol2', title: 'Import plan DXF securitaire',
      description: 'Importer le plan DXF reel du mall et calibrer les dimensions',
      responsable: 'Archi', startDate: '2026-04-01', endDate: '2026-04-07',
      status: 'a_faire', priority: 'critique', dependencies: [],
    },
    {
      id: 'act-sec-02', volume: 'vol2', title: 'Placement cameras (120+)',
      description: 'Placement automatique Proph3t + ajustements manuels',
      responsable: 'Securite', startDate: '2026-04-08', endDate: '2026-04-21',
      status: 'a_faire', priority: 'critique', dependencies: ['act-sec-01'],
    },
    {
      id: 'act-sec-03', volume: 'vol2', title: 'Generation DCE securite',
      description: 'Generer le dossier de consultation et envoyer a LIBATEL',
      responsable: 'DGA', startDate: '2026-04-22', endDate: '2026-04-28',
      status: 'a_faire', priority: 'haute', dependencies: ['act-sec-02'],
      estimatedCostFcfa: 0,
    },
    {
      id: 'act-sec-04', volume: 'vol2', title: 'Validation rapport APSAD',
      description: 'Faire valider le rapport de conformite par un expert',
      responsable: 'Expert APSAD', startDate: '2026-05-01', endDate: '2026-05-15',
      status: 'a_faire', priority: 'haute', dependencies: ['act-sec-02'],
    },

    // Vol.1 — Commercial
    {
      id: 'act-com-01', volume: 'vol1', title: 'Configuration mix enseigne',
      description: 'Affecter les preneurs confirmes aux cellules commerciales',
      responsable: 'Commercial', startDate: '2026-04-01', endDate: '2026-04-15',
      status: 'a_faire', priority: 'haute', dependencies: [],
    },
    {
      id: 'act-com-02', volume: 'vol1', title: 'Finalisation baux preneurs cles',
      description: 'Signer les baux des 5 enseignes ancres (Zara, Carrefour, KFC, Pathe, Sephora)',
      responsable: 'Juridique', startDate: '2026-04-15', endDate: '2026-06-30',
      status: 'a_faire', priority: 'critique', dependencies: ['act-com-01'],
    },

    // Vol.3 — Parcours client
    {
      id: 'act-par-01', volume: 'vol3', title: 'Plan de signaletique ISO 7010',
      description: 'Generer le plan de signaletique automatique et faire valider par le designer',
      responsable: 'Signaliste', startDate: '2026-05-01', endDate: '2026-05-20',
      status: 'a_faire', priority: 'haute', dependencies: ['act-sec-01'],
    },
    {
      id: 'act-par-02', volume: 'vol3', title: 'DCE signaletique',
      description: 'Generer le dossier de consultation signaletique + charte graphique',
      responsable: 'DGA', startDate: '2026-05-21', endDate: '2026-05-28',
      status: 'a_faire', priority: 'normale', dependencies: ['act-par-01'],
    },
    {
      id: 'act-par-03', volume: 'vol3', title: 'Programme Cosmos Club',
      description: 'Definir le programme de fidelite, bornes d\'inscription, integration app',
      responsable: 'Marketing', startDate: '2026-06-01', endDate: '2026-08-31',
      status: 'a_faire', priority: 'normale', dependencies: [],
      estimatedCostFcfa: 5_000_000,
    },

    // Transversal
    {
      id: 'act-tra-01', volume: 'transversal', title: 'Soft opening',
      description: 'Ouverture partielle avec 60% d\'occupation ciblee',
      responsable: 'DGA', startDate: '2026-10-01', endDate: '2026-10-01',
      status: 'a_faire', priority: 'critique', dependencies: ['act-com-02', 'act-sec-03', 'act-par-01'],
      cockpitMilestoneId: 'milestone-soft-opening',
    },
    {
      id: 'act-tra-02', volume: 'transversal', title: 'Inauguration officielle',
      description: 'Inauguration avec 85% d\'occupation + couverture mediatique',
      responsable: 'DGA', startDate: '2026-11-15', endDate: '2026-11-15',
      status: 'a_faire', priority: 'critique', dependencies: ['act-tra-01'],
      cockpitMilestoneId: 'milestone-inauguration',
    },
  ]
}

// ── Compute progress ─────────────────────────────────────────

export function computeActionProgress(actions: ActionItem[]): {
  total: number
  completed: number
  blocked: number
  progressPct: number
} {
  const total = actions.length
  const completed = actions.filter((a) => a.status === 'termine').length
  const blocked = actions.filter((a) => a.status === 'bloque').length
  return {
    total,
    completed,
    blocked,
    progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}
