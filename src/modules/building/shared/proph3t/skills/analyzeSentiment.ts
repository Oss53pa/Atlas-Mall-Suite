// ═══ SKILL — Analyse feedback clients (sentiment + topics + urgence) ═══

import type { Proph3tResult, Proph3tFinding, Proph3tAction } from '../orchestrator.types'
import { citeAlgo, confidence } from '../orchestrator.types'
import {
  summarizeFeedback,
  analyzeSentiment,
  type FeedbackItem,
  type SentimentSummary,
  type SentimentResult,
} from '../../engines/sentimentEngine'

export interface SentimentInput {
  feedbacks: FeedbackItem[]
}

export interface SentimentPayload {
  summary: SentimentSummary
  individualResults: SentimentResult[]
}

const ACTION_VERB = {
  acknowledge: 'acknowledge-feedback',
  investigate: 'investigate-feedback',
  escalate: 'escalate-feedback',
} as const

export async function analyzeSentimentSkill(
  input: SentimentInput,
): Promise<Proph3tResult<SentimentPayload>> {
  const t0 = performance.now()
  const individualResults = input.feedbacks.map(analyzeSentiment)
  const summary = summarizeFeedback(input.feedbacks)

  const findings: Proph3tFinding[] = summary.topIssues.slice(0, 5).map((issue, i) => ({
    id: `sent-issue-${i}`,
    severity: issue.severity > 3 ? 'critical' : 'warning',
    title: `Thématique critique : ${issue.topic} (${issue.count} feedbacks négatifs)`,
    description: `Score de sévérité ${issue.severity} — volume × impact négatif moyen.`,
    affectedIds: [],
    sources: [citeAlgo('lexical-sentiment', 'Lexique FR/EN + détection topics')],
    confidence: confidence(0.7, 'NLP lexical — fiabilité moyenne'),
    metric: { name: 'sévérité', value: issue.severity, unit: '' },
  }))

  for (const urgent of summary.urgentItems.slice(0, 5)) {
    findings.push({
      id: `sent-urgent-${urgent.feedbackId}`,
      severity: 'critical',
      title: `Feedback urgent : ${urgent.topics.join(', ')}`,
      description: urgent.keyPhrases.join(' … ') || 'Mots-clés critiques détectés',
      affectedIds: [urgent.feedbackId],
      sources: [citeAlgo('urgency-keywords', 'Détection mots-clés sécurité/agression')],
      confidence: confidence(0.85, 'Keywords explicites'),
    })
  }

  const actions: Proph3tAction[] = individualResults
    .filter(r => r.suggestedAction !== 'none')
    .slice(0, 8)
    .map((r, i) => {
      const action = r.suggestedAction as 'acknowledge' | 'investigate' | 'escalate'
      return {
        id: `sent-act-${i}`,
        verb: ACTION_VERB[action],
        targetId: r.feedbackId,
        label: `${action === 'escalate' ? '🚨 Escalader' : action === 'investigate' ? 'Investiguer' : 'Accuser réception'} — ${r.topics.join(', ')}`,
        rationale: r.keyPhrases.join(' … ') || `Polarity ${r.polarity} (score ${r.score})`,
        payload: { feedbackId: r.feedbackId, topics: r.topics, urgency: r.urgency },
        severity: r.urgency === 'high' ? 'critical' : r.urgency === 'medium' ? 'warning' : 'info',
        confidence: confidence(0.7, 'Lexical + keywords'),
        sources: [citeAlgo('lexical-sentiment', 'Lexique FR/EN + urgency')],
        estimatedDelayDays: r.urgency === 'high' ? 1 : r.urgency === 'medium' ? 3 : 7,
      }
    })

  const execSummary = `${summary.total} feedbacks · ${summary.negative} négatifs (${Math.round(summary.negative / Math.max(1, summary.total) * 100)} %) · score moyen ${summary.avgScore} · ${summary.urgentItems.length} urgent(s).`

  return {
    skill: 'analyzeSentiment',
    timestamp: new Date().toISOString(),
    qualityScore: Math.round((summary.avgScore + 1) * 50), // score -1..+1 → 0..100
    executiveSummary: execSummary,
    findings,
    actions,
    payload: { summary, individualResults },
    source: 'algo',
    confidence: confidence(0.7, 'NLP lexical + urgency keywords'),
    elapsedMs: performance.now() - t0,
  }
}
