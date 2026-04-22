// ═══ SKILL — Scoring preneur entrant (logistic regression) ═══

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import {
  scoreTenantApplicant,
  type TenantApplicant,
  type ZoneProfile,
  type TenantScore,
} from '../../engines/tenantScoringEngine'

export interface TenantScoreInput {
  applicant: TenantApplicant
  availableZones?: ZoneProfile[]
}

export interface TenantScorePayload extends TenantScore {}

export async function analyzeTenantScore(
  input: TenantScoreInput,
): Promise<Proph3tResult<TenantScorePayload>> {
  const t0 = performance.now()
  const score = scoreTenantApplicant(input.applicant, input.availableZones ?? [])

  const findings: Proph3tFinding[] = []
  if (score.defaultProbability12m > 0.2) {
    findings.push({
      id: 'high-default-risk',
      severity: score.defaultProbability12m > 0.35 ? 'critical' : 'warning',
      title: `Risque de défaut élevé : ${(score.defaultProbability12m * 100).toFixed(1)} %`,
      description: `Modèle logistique estime une probabilité de défaut à 12 mois supérieure au seuil d'acceptation (20 %).`,
      affectedIds: [input.applicant.id],
      sources: [citeAlgo('logistic-regression', 'Régression logistique benchmark 50+ malls')],
      confidence: confidence(0.75, 'Modèle calibré'),
      metric: { name: 'P(défaut 12m)', value: Math.round(score.defaultProbability12m * 100), unit: '%' },
    })
  }
  if (score.components.financial < 50) {
    findings.push({
      id: 'weak-financial',
      severity: 'warning',
      title: `Solidité financière faible (${score.components.financial}/100)`,
      description: `Score crédit + incidents paiement faible. Demander garantie bancaire ou caution solidaire.`,
      affectedIds: [input.applicant.id],
      sources: [citeAlgo('credit-score-heuristic', 'Heuristique crédit + incidents')],
      confidence: confidence(0.8, 'Formule transparente'),
    })
  }

  const actions: Proph3tAction[] = [{
    id: 'tenant-score-decision',
    verb: 'score-tenant' as const,
    targetId: input.applicant.id,
    label: `${score.recommendation.toUpperCase()} — ${input.applicant.name} (score ${score.globalScore})`,
    rationale: score.rationale,
    payload: { applicantId: input.applicant.id, recommendation: score.recommendation },
    severity: score.recommendation === 'decline' ? 'critical'
            : score.recommendation === 'negotiate' ? 'warning' : 'info',
    confidence: confidence(0.8, 'Logistic + fit zone'),
    sources: [citeAlgo('logistic-regression', 'Régression logistique')],
  }]

  for (const [i, zr] of score.zoneRecommendations.slice(0, 3).entries()) {
    actions.push({
      id: `zone-reco-${i}`,
      verb: 'reposition-tenant' as const,
      targetId: zr.zoneId,
      label: `Zone recommandée #${i + 1} : ${zr.label} (fit ${zr.fitScore})`,
      rationale: `CA attendu ${(zr.expectedRevenueFcfa / 1_000_000).toFixed(1)} M FCFA/an. ${zr.synergies.join('; ') || 'Pas de synergie détectée.'}${zr.conflicts.length > 0 ? ' Conflits : ' + zr.conflicts.join('; ') : ''}`,
      payload: { zoneId: zr.zoneId, expectedRevenue: zr.expectedRevenueFcfa },
      severity: 'info',
      confidence: confidence(zr.fitScore / 100, 'Fit catégorie × zone'),
      sources: [citeAlgo('category-fit', 'Perf catégorie × synergies × flux')],
    })
  }

  return {
    skill: 'analyzeTenantScore',
    timestamp: new Date().toISOString(),
    qualityScore: score.globalScore,
    executiveSummary: score.rationale,
    findings,
    actions,
    payload: score,
    source: 'algo',
    confidence: confidence(0.8, 'Logistic + category fit + rent fit'),
    elapsedMs: performance.now() - t0,
  }
}
