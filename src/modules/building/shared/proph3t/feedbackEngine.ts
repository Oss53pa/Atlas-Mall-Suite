// ═══ PROPH3T — Moteur de Feedback / Renforcement ═══

export interface RecommendationFeedback {
  id: string
  recommendationId: string
  ruleId: string
  feedback: 'accepted' | 'rejected' | 'deferred'
  reason?: string
  timestamp: string
  userId: string
}

export interface RuleAdjustment {
  ruleId: string
  originalWeight: number
  adjustedWeight: number
  acceptCount: number
  rejectCount: number
  deferCount: number
  lastAdjusted: string
}

export interface ProPh3tQualityScore {
  overallAccuracy: number
  acceptRate: number
  rejectRate: number
  deferRate: number
  totalFeedbacks: number
  ruleScores: { ruleId: string; accuracy: number; count: number }[]
  trend: 'improving' | 'stable' | 'declining'
}

// ─── In-memory store ─────────────────────────────────────

let feedbackStore: RecommendationFeedback[] = []
let ruleWeights: Map<string, RuleAdjustment> = new Map()

export function recordFeedback(
  recommendationId: string,
  ruleId: string,
  feedback: 'accepted' | 'rejected' | 'deferred',
  userId: string,
  reason?: string,
): RecommendationFeedback {
  const entry: RecommendationFeedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recommendationId,
    ruleId,
    feedback,
    reason,
    timestamp: new Date().toISOString(),
    userId,
  }
  feedbackStore.push(entry)

  // Adjust rule weight
  const existing = ruleWeights.get(ruleId) ?? {
    ruleId,
    originalWeight: 1.0,
    adjustedWeight: 1.0,
    acceptCount: 0,
    rejectCount: 0,
    deferCount: 0,
    lastAdjusted: '',
  }

  if (feedback === 'accepted') existing.acceptCount++
  else if (feedback === 'rejected') existing.rejectCount++
  else existing.deferCount++

  const total = existing.acceptCount + existing.rejectCount + existing.deferCount
  existing.adjustedWeight = total > 0
    ? existing.originalWeight * (existing.acceptCount / total)
    : existing.originalWeight
  existing.lastAdjusted = entry.timestamp
  ruleWeights.set(ruleId, existing)

  return entry
}

export function getAllFeedback(): RecommendationFeedback[] {
  return [...feedbackStore]
}

export function adjustRules(): RuleAdjustment[] {
  return Array.from(ruleWeights.values())
}

export function getQualityScore(): ProPh3tQualityScore {
  const total = feedbackStore.length
  if (total === 0) {
    return {
      overallAccuracy: 1.0,
      acceptRate: 0,
      rejectRate: 0,
      deferRate: 0,
      totalFeedbacks: 0,
      ruleScores: [],
      trend: 'stable',
    }
  }

  const accepted = feedbackStore.filter(f => f.feedback === 'accepted').length
  const rejected = feedbackStore.filter(f => f.feedback === 'rejected').length
  const deferred = feedbackStore.filter(f => f.feedback === 'deferred').length

  const ruleGroups = new Map<string, RecommendationFeedback[]>()
  for (const fb of feedbackStore) {
    const arr = ruleGroups.get(fb.ruleId) ?? []
    arr.push(fb)
    ruleGroups.set(fb.ruleId, arr)
  }

  const ruleScores = Array.from(ruleGroups.entries()).map(([ruleId, fbs]) => ({
    ruleId,
    accuracy: fbs.filter(f => f.feedback === 'accepted').length / fbs.length,
    count: fbs.length,
  }))

  const overallAccuracy = accepted / total

  // Trend: compare last 10 vs previous 10
  const recent = feedbackStore.slice(-10)
  const previous = feedbackStore.slice(-20, -10)
  const recentAcc = recent.length > 0 ? recent.filter(f => f.feedback === 'accepted').length / recent.length : 0
  const prevAcc = previous.length > 0 ? previous.filter(f => f.feedback === 'accepted').length / previous.length : recentAcc
  const trend = recentAcc > prevAcc + 0.05 ? 'improving' : recentAcc < prevAcc - 0.05 ? 'declining' : 'stable'

  return {
    overallAccuracy,
    acceptRate: accepted / total,
    rejectRate: rejected / total,
    deferRate: deferred / total,
    totalFeedbacks: total,
    ruleScores,
    trend,
  }
}

export function resetFeedbackStore(): void {
  feedbackStore = []
  ruleWeights = new Map()
}
