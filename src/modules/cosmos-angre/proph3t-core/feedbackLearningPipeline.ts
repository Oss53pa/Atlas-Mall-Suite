// ═══ Feedback Learning Pipeline — LRN-03 ═══
//
// CDC §3.6 :
//   LRN-03 — Intégrer les feedbacks QR terrain comme signal de correction
//            des modèles
//
// Pipeline :
//   1. Ingest des feedbacks QR (table signage_feedback) + groupement par panel
//   2. Détection des patterns récurrents :
//      - "absent" répété → emplacement incorrect → exclure du futur placement
//      - "mal-oriente" répété → angle incorrect → ajuster orientation par défaut
//      - "illisible" → distance trop grande → réduire distance max signagePlacement
//      - "OK" répété → renforcer le pattern (validation positive)
//   3. Re-injection dans signageMemoryService comme patterns avec
//      confidence_score ajustée
//   4. Marquer le feedback comme "consumed" pour ne pas re-traiter

import { supabase, isOfflineMode } from '../../../lib/supabase'
import { recordPattern } from '../shared/services/signageMemoryService'

// ─── Types ────────────────────────────────────

export interface FeedbackSignal {
  panelRef: string
  status: string
  count: number
  /** Avg sévérité 0..3 (low=0, critical=3). */
  avgSeverity: number
  /** Position monde (interpolée). */
  position?: { x: number; y: number }
  panelType?: string
  feedbacks: Array<{ id: string; createdAt: string; note?: string }>
}

export interface LearningResult {
  /** Feedbacks consommés. */
  consumedCount: number
  /** Patterns ajoutés/renforcés. */
  patternsCreated: number
  /** Recommandations pour PROPH3T-PC (ajustement règles placement). */
  rulesAdjustments: Array<{
    rule: string
    delta: string
    rationale: string
  }>
  errors: string[]
}

const SEVERITY_WEIGHT: Record<string, number> = {
  low: 0, medium: 1, high: 2, critical: 3,
}

// ─── Pipeline principal ───────────────────────

export async function processFeedbackLearning(projetId: string): Promise<LearningResult> {
  const result: LearningResult = {
    consumedCount: 0,
    patternsCreated: 0,
    rulesAdjustments: [],
    errors: [],
  }

  // 1. Ingest feedbacks non encore traités
  const feedbacks = await loadUnprocessedFeedbacks(projetId)
  if (feedbacks.length === 0) return result

  // 2. Grouper par panel_ref
  const byPanel = new Map<string, typeof feedbacks>()
  for (const f of feedbacks) {
    const key = f.panel_ref
    if (!byPanel.has(key)) byPanel.set(key, [])
    byPanel.get(key)!.push(f)
  }

  // 3. Pour chaque panneau : détecter signaux récurrents
  for (const [panelRef, fbs] of byPanel) {
    if (fbs.length < 2) continue   // au moins 2 feedbacks pour pattern
    const byStatus = new Map<string, typeof fbs>()
    for (const f of fbs) {
      const k = f.status
      if (!byStatus.has(k)) byStatus.set(k, [])
      byStatus.get(k)!.push(f)
    }

    // Pattern dominant
    const sorted = Array.from(byStatus.entries()).sort((a, b) => b[1].length - a[1].length)
    const [dominantStatus, dominantFbs] = sorted[0]
    const ratio = dominantFbs.length / fbs.length

    if (ratio < 0.5) continue   // pas de tendance claire

    const fx = dominantFbs[0].x
    const fy = dominantFbs[0].y
    const signal: FeedbackSignal = {
      panelRef,
      status: dominantStatus,
      count: dominantFbs.length,
      avgSeverity: dominantFbs.reduce((s, f) => s + (SEVERITY_WEIGHT[f.severity ?? 'medium'] ?? 1), 0) / dominantFbs.length,
      position: (fx !== undefined && fx !== null && fy !== undefined && fy !== null)
        ? { x: fx, y: fy }
        : undefined,
      panelType: dominantFbs[0].panel_type ?? undefined,
      feedbacks: dominantFbs.map(f => ({ id: f.id, createdAt: f.created_at, note: f.note ?? undefined })),
    }

    // 4. Apprendre selon le statut
    try {
      const r = await learnFromSignal(signal, projetId)
      if (r.patternId) {
        result.patternsCreated++
      }
      if (r.ruleAdjustment) {
        result.rulesAdjustments.push(r.ruleAdjustment)
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'unknown')
    }
  }

  // 5. Marquer comme consommés
  if (!isOfflineMode) {
    const ids = feedbacks.map(f => f.id)
    if (ids.length > 0) {
      const { error } = await supabase
        .from('signage_feedback')
        .update({ resolved: true, resolution_note: 'Consommé par feedbackLearningPipeline' })
        .in('id', ids)
      if (error) result.errors.push(`Mark consumed failed : ${error.message}`)
    }
  }
  result.consumedCount = feedbacks.length

  return result
}

// ─── Apprentissage par signal ─────────────────

async function learnFromSignal(
  signal: FeedbackSignal,
  projetId: string,
): Promise<{ patternId?: string; ruleAdjustment?: LearningResult['rulesAdjustments'][0] }> {
  switch (signal.status) {
    case 'absent': {
      // Pattern : ce panel_ref doit être exclu du placement futur
      const r = await recordPattern({
        pattern_type: 'exclusion',
        trigger_raw: signal.panelRef,
        trigger_context: { panelType: signal.panelType, count: signal.count },
        applied_value: { reason: `Signalé absent ${signal.count}× sur le terrain` },
        projet_id_origine: projetId,
      })
      return {
        patternId: r.patternId,
        ruleAdjustment: {
          rule: `signagePlacementEngine.exclude(${signal.panelRef})`,
          delta: 'Exclure ce panel_ref des prochaines générations',
          rationale: `${signal.count} signalements "absent" — l'emplacement n'a pas été déployé ou n'est pas viable`,
        },
      }
    }
    case 'illisible': {
      // Pattern : la distance de placement est trop grande pour ce type
      return {
        ruleAdjustment: {
          rule: `signageVisibilityEngine.MOUNT_RANGE_M[${signal.panelType ?? 'wall'}]`,
          delta: '-15%',
          rationale: `${signal.count} signalements "illisible" — réduire la portée de placement de ce type`,
        },
      }
    }
    case 'mal-oriente': {
      const r = await recordPattern({
        pattern_type: 'panel-placement',
        trigger_raw: signal.panelRef,
        trigger_context: { panelType: signal.panelType, count: signal.count },
        applied_value: {
          orientation: 'auto-recompute',
          hint: 'Aligner sur axe du chemin principal',
        },
        projet_id_origine: projetId,
      })
      return {
        patternId: r.patternId,
        ruleAdjustment: {
          rule: `signagePlacementEngine.orientationAuto`,
          delta: 'enable=true',
          rationale: `${signal.count} signalements "mal-oriente" — recalculer orientation depuis tangente flux`,
        },
      }
    }
    case 'degrade':
    case 'obsolete':
      // Pas d'apprentissage modèle, juste ticket maintenance
      return {}
    case 'ok':
      // Validation positive : on renforce le pattern d'emplacement
      const r = await recordPattern({
        pattern_type: 'panel-placement',
        trigger_raw: signal.panelRef,
        trigger_context: { panelType: signal.panelType, validations: signal.count },
        applied_value: { validated: true, position: signal.position },
        projet_id_origine: projetId,
      })
      return { patternId: r.patternId }
    default:
      return {}
  }
}

// ─── Loading ─────────────────────────────────

interface RawFeedback {
  id: string
  panel_ref: string
  status: string
  severity?: string
  panel_type?: string
  x?: number | null
  y?: number | null
  note?: string
  created_at: string
  resolved: boolean
}

async function loadUnprocessedFeedbacks(projetId: string): Promise<RawFeedback[]> {
  if (isOfflineMode) {
    const all: RawFeedback[] = JSON.parse(localStorage.getItem('atlas-signage-feedback-pending') ?? '[]')
    return all.filter(f => !f.resolved && (f as any).projet_id === projetId)
  }
  const { data } = await supabase
    .from('signage_feedback')
    .select('id, panel_ref, status, severity, panel_type, x, y, note, created_at, resolved')
    .eq('projet_id', projetId)
    .eq('resolved', false)
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as RawFeedback[]
}

// ─── Run périodique (LRN-04) ─────────────────

let pipelineTimer: ReturnType<typeof setInterval> | null = null

/** Démarre le pipeline en arrière-plan : exécution toutes les N minutes. */
export function startFeedbackLearningPipeline(projetId: string, intervalMinutes = 60): void {
  if (pipelineTimer) return
  pipelineTimer = setInterval(() => {
    void processFeedbackLearning(projetId).then(r => {
       
      console.debug('[FeedbackLearning]', new Date().toLocaleTimeString(), r)
    })
  }, intervalMinutes * 60_000)
}

export function stopFeedbackLearningPipeline(): void {
  if (pipelineTimer) {
    clearInterval(pipelineTimer)
    pipelineTimer = null
  }
}
