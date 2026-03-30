// ═══ PROPH3T — Moteur d'Apprentissage Bayesien v2 ═══
// Les preferences utilisateur modifient les probabilites des recommandations futures

import type { RecommendationFeedbackV2, RuleWeight } from './types'

// ─── Stockage en memoire (fallback si Supabase indisponible) ───

const feedbackStore = new Map<string, RecommendationFeedbackV2[]>()
const weightStore = new Map<string, Map<string, RuleWeight>>()
const noteStore: Array<{ projectId: string; text: string; timestamp: string }> = []

// ─── Enregistrement de feedback ───────────────────────────────

export async function recordFeedbackV2(feedback: RecommendationFeedbackV2): Promise<void> {
  // 1. Stocker le feedback
  const key = feedback.projectId
  const existing = feedbackStore.get(key) ?? []
  existing.push(feedback)
  feedbackStore.set(key, existing)

  // 2. Mettre a jour le poids de la regle
  const projectWeights = weightStore.get(key) ?? new Map<string, RuleWeight>()
  const current = projectWeights.get(feedback.ruleId) ?? {
    ruleId: feedback.ruleId,
    baseWeight: 1.0,
    adjustedWeight: 1.0,
    acceptanceRate: 0.5,
    totalFeedbacks: 0,
    trend: 'stable' as const,
    lastUpdated: '',
    userPreferences: {},
  }

  // 3. Algorithme bayesien simplifie
  let newWeight = current.adjustedWeight
  if (feedback.userAction === 'accepted') {
    newWeight = Math.min(2.0, current.adjustedWeight * 1.05)
  } else if (feedback.userAction === 'rejected') {
    newWeight = Math.max(0.1, current.adjustedWeight * 0.85)
  }
  // 'modified' : pas de changement de poids, mais on enregistre la preference
  // 'deferred' : pas de changement

  const totalFeedbacks = current.totalFeedbacks + 1

  // 4. Calculer le taux d'acceptation
  const allRuleFeedbacks = existing.filter(f => f.ruleId === feedback.ruleId)
  const acceptCount = allRuleFeedbacks.filter(f => f.userAction === 'accepted').length
  const acceptanceRate = allRuleFeedbacks.length > 0 ? acceptCount / allRuleFeedbacks.length : 0.5

  // 5. Detecter la tendance
  const recent = allRuleFeedbacks.slice(-10)
  const previous = allRuleFeedbacks.slice(-20, -10)
  const recentAcc = recent.length > 0
    ? recent.filter(f => f.userAction === 'accepted').length / recent.length
    : 0.5
  const prevAcc = previous.length > 0
    ? previous.filter(f => f.userAction === 'accepted').length / previous.length
    : recentAcc
  const trend = recentAcc > prevAcc + 0.05
    ? 'improving' as const
    : recentAcc < prevAcc - 0.05
      ? 'declining' as const
      : 'stable' as const

  // 6. Detecter les preferences
  const userPreferences = detectPreferences(allRuleFeedbacks)

  projectWeights.set(feedback.ruleId, {
    ruleId: feedback.ruleId,
    baseWeight: 1.0,
    adjustedWeight: newWeight,
    acceptanceRate,
    totalFeedbacks,
    trend,
    lastUpdated: new Date().toISOString(),
    userPreferences,
  })
  weightStore.set(key, projectWeights)

  // 7. Si preference forte detectee → note proactive
  if (userPreferences.preferredCameraModel) {
    const prefCount = allRuleFeedbacks.filter(
      f => f.modifiedValue === userPreferences.preferredCameraModel
    ).length
    if (prefCount === 3) {
      await logProph3tNote(
        feedback.projectId,
        `J'ai note que vous preferez le modele ${userPreferences.preferredCameraModel} `
        + `(${prefCount} choix confirmes). Mes recommandations sont mises a jour.`
      )
    }
  }
}

// ─── Detection de preferences recurrentes ─────────────────────

export function detectPreferences(
  feedbacks: RecommendationFeedbackV2[]
): RuleWeight['userPreferences'] {
  const prefs: RuleWeight['userPreferences'] = {}

  // Modele camera le plus souvent choisi lors des modifications
  const cameraChoices = feedbacks
    .filter(f => f.userAction === 'modified' && f.modifiedValue)
    .map(f => f.modifiedValue!)
    .filter(Boolean)

  if (cameraChoices.length >= 3) {
    const counts: Record<string, number> = {}
    for (const v of cameraChoices) counts[v] = (counts[v] ?? 0) + 1
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (sorted[0] && sorted[0][1] >= 3) {
      prefs.preferredCameraModel = sorted[0][0]
    }
  }

  // Seuil CAPEX : mediane des valeurs rejetees
  const rejectedCapex = feedbacks
    .filter(f => f.userAction === 'rejected' && f.ruleCategory === 'capex')
    .map(f => parseFloat(f.recommendation.replace(/[^0-9]/g, '')))
    .filter(n => !isNaN(n))

  if (rejectedCapex.length >= 3) {
    const sorted = [...rejectedCapex].sort((a, b) => a - b)
    prefs.capexThreshold = sorted[Math.floor(sorted.length / 2)]
  }

  // Offset hauteur de pose systematiquement ajoute
  const heightModifications = feedbacks
    .filter(f => f.userAction === 'modified' && f.ruleCategory === 'signage_height')
    .map(f => {
      const original = parseFloat(f.recommendation)
      const modified = parseFloat(f.modifiedValue ?? '')
      return !isNaN(original) && !isNaN(modified) ? modified - original : null
    })
    .filter((v): v is number => v !== null)

  if (heightModifications.length >= 3) {
    const avg = heightModifications.reduce((s, v) => s + v, 0) / heightModifications.length
    if (Math.abs(avg) > 0.05) {
      prefs.signageHeightOffset = Math.round(avg * 100) / 100
    }
  }

  return prefs
}

// ─── Recuperation des poids d'un projet ───────────────────────

export async function getProjectWeights(
  projectId: string
): Promise<Record<string, RuleWeight>> {
  const projectWeights = weightStore.get(projectId)
  if (!projectWeights) return {}
  return Object.fromEntries(projectWeights.entries())
}

// ─── Recommandation ponderee par les poids appris ─────────────

export async function getWeightedRecommendation<T extends { ruleId: string }>(
  candidates: T[],
  projectId: string
): Promise<T | undefined> {
  if (candidates.length === 0) return undefined

  const weights = await getProjectWeights(projectId)

  let bestCandidate = candidates[0]
  let bestScore = 0

  for (const candidate of candidates) {
    const w = weights[candidate.ruleId]?.adjustedWeight ?? 1.0
    const score = w // Score de base = poids appris
    if (score > bestScore) {
      bestScore = score
      bestCandidate = candidate
    }
  }

  return bestCandidate
}

// ─── Notes proactives Proph3t ─────────────────────────────────

export async function logProph3tNote(
  projectId: string,
  text: string
): Promise<void> {
  noteStore.push({
    projectId,
    text,
    timestamp: new Date().toISOString(),
  })
}

export function getProph3tNotes(projectId: string): typeof noteStore {
  return noteStore.filter(n => n.projectId === projectId)
}

// ─── Reset (pour les tests) ──────────────────────────────────

export function resetLearningStore(): void {
  feedbackStore.clear()
  weightStore.clear()
  noteStore.length = 0
}
