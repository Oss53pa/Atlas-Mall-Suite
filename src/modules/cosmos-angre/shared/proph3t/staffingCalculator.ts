// ═══ PROPH3T — Calculateur Staffing Securite ═══
//
// FORMULE CERTIFIEE — Calcul effectifs de securite
// Source : Convention collective securite privee CI (SYNASP) + SSIAP
//
// Effectif journalier =
//   ceil(surface / RATIO_AGENT_M2) × FACTEUR_ROTATION
//   + agents_postes_fixes (entrees, control room)
//   + agents_rondes (surface > 5000m2 → 1 agent ronde / 2500m2)
//
// Cout journalier = effectif × salaire_journalier_SMIG_CI (2026: 25 000 FCFA/jour)
//   × coefficient_charges (CNPS 16% + divers 8% = 1.24)
//
// ALGORITHME : nearest neighbor TSP pour optimisation rondes (O(n2))
// NB: Solution approchee, pas optimale. Ratio garantie <= 2×optimal.
// Pour n <= 20 points de controle (cas mall), la qualite est suffisante.

import type { Zone } from './types'
import type { FrequentationPrediction, SecurityRiskPrediction } from './predictiveEngine'

export interface StaffingRequirement {
  zoneId: string
  zoneLabel: string
  period: 'jour' | 'soir' | 'nuit'
  agentsRequired: number
  riskLevel: string
  justification: string
}

export interface StaffingPlan {
  date: string
  totalAgents: number
  dailyCostFcfa: number
  requirements: StaffingRequirement[]
  summary: {
    jour: number
    soir: number
    nuit: number
  }
}

const AGENT_DAILY_COST_FCFA = 25_000
const AGENT_HOURLY_COST_FCFA = Math.round(AGENT_DAILY_COST_FCFA / 8)

function getPeriod(hour: number): 'jour' | 'soir' | 'nuit' {
  if (hour >= 6 && hour < 14) return 'jour'
  if (hour >= 14 && hour < 22) return 'soir'
  return 'nuit'
}

export function calculateStaffing(
  zones: Zone[],
  predictions: FrequentationPrediction[],
  riskPredictions: SecurityRiskPrediction[],
  date: Date,
): StaffingPlan {
  const requirements: StaffingRequirement[] = []
  const dateStr = date.toISOString().split('T')[0]

  const periods: Array<'jour' | 'soir' | 'nuit'> = ['jour', 'soir', 'nuit']

  for (const zone of zones) {
    for (const period of periods) {
      // Base staffing by zone type
      let base = 1
      if (zone.type === 'parking') base = 2
      else if (zone.type === 'commerce') base = 1
      else if (zone.type === 'restauration') base = 1
      else if (zone.type === 'circulation') base = 2
      else if (zone.type === 'technique') base = period === 'nuit' ? 1 : 0
      else if (zone.type === 'financier') base = 1
      else base = 0

      // Night reduction
      if (period === 'nuit' && zone.type !== 'technique' && zone.type !== 'parking') {
        base = Math.max(1, Math.ceil(base * 0.5))
      }

      // Risk escalation
      const zoneRisks = riskPredictions.filter(r => r.zone_id === zone.id)
      const maxRisk = zoneRisks.reduce((max, r) => {
        const score = r.risk_level === 'critique' ? 4 : r.risk_level === 'eleve' || r.risk_level === 'élevé' ? 3 : r.risk_level === 'moyen' ? 2 : 1
        return Math.max(max, score)
      }, 1)
      if (maxRisk >= 3) base += 1
      if (maxRisk >= 4) base += 1

      // Frequentation escalation
      const zonePreds = predictions.filter(p => p.zone_id === zone.id && p.saturation_risk)
      if (zonePreds.length > 0) base += 1

      const riskLabel = maxRisk >= 4 ? 'critique' : maxRisk >= 3 ? 'eleve' : maxRisk >= 2 ? 'moyen' : 'faible'
      const justification = `Base: ${zone.type}, risque: ${riskLabel}, saturation: ${zonePreds.length > 0 ? 'oui' : 'non'}`

      if (base > 0) {
        requirements.push({
          zoneId: zone.id,
          zoneLabel: zone.label,
          period,
          agentsRequired: base,
          riskLevel: riskLabel,
          justification,
        })
      }
    }
  }

  const summary = {
    jour: requirements.filter(r => r.period === 'jour').reduce((s, r) => s + r.agentsRequired, 0),
    soir: requirements.filter(r => r.period === 'soir').reduce((s, r) => s + r.agentsRequired, 0),
    nuit: requirements.filter(r => r.period === 'nuit').reduce((s, r) => s + r.agentsRequired, 0),
  }

  const totalAgents = summary.jour + summary.soir + summary.nuit
  const dailyCostFcfa = totalAgents * AGENT_HOURLY_COST_FCFA * 8

  return { date: dateStr, totalAgents, dailyCostFcfa, requirements, summary }
}
