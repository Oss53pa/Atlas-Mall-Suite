// ═══ PROPH3T API — Façade unifiée (CDC §4.4) ═══
//
// Toutes les interactions des volumes avec PROPH3T passent par cet objet.
// API stable, typée, documentée, testable indépendamment.
//
//   proph3t.analyze(plan)               → PlanSemantique
//   proph3t.orchestrate(input)          → ExecutionTrace
//   proph3t.predict(context, type)      → Prediction
//   proph3t.optimize(problem, constr.)  → Solution[]
//   proph3t.learn(pattern, context)     → void
//   proph3t.feedback(qrCode, data)      → void

import type { ParsedPlan } from '../shared/planReader/planEngineTypes'
import type {
  Proph3tApi, AnalyzeResult, OrchestrateInput,
  PredictDomain, OptimizeProblem, OptimizeSolution,
  PatternEntry, FeedbackEntry,
} from './types'
import { orchestrate, orchestrateInWorker } from './orchestrator'
import { TraceBuilder, persistTrace } from './executionTrace'

// ─── analyze ───────────────────────────────────

async function analyzeImpl(plan: ParsedPlan, opts?: { projetId?: string }): Promise<AnalyzeResult> {
  const { autoDetectSpaceType } = await import('../shared/proph3t/libraries/spaceTypeLibrary')
  const { auditPlanTopology } = await import('./topologyAuditEngine')

  const projetId = opts?.projetId ?? 'unknown'
  const builder = new TraceBuilder(projetId, ['vol1-commercial']) // analyze utilise un sous-trace

  // Classification espaces
  const classifications = (plan.spaces ?? []).map(s => {
    const detected = autoDetectSpaceType(s.label, s.type)
    return { spaceId: s.id, type: detected, confidence: detected === 'a_definir' ? 0.3 : 0.85 }
  })
  builder.recordDecision('vol1-commercial', {
    kind: 'classification',
    description: `Classification automatique de ${classifications.length} espaces (taxonomie 31 types)`,
    source: { kind: 'rule', reference: 'spaceTypeLibrary.autoDetectSpaceType' },
    confidence: classifications.reduce((s, c) => s + c.confidence, 0) / Math.max(1, classifications.length),
    output: { count: classifications.length },
  })

  // Audit topologique (CDC SEM-03)
  const topology = auditPlanTopology(plan)
  builder.recordDecision('vol1-commercial', {
    kind: 'audit',
    description: `Audit topologique : ${topology.issues.length} incohérences détectées (score ${topology.overallScore}/100)`,
    source: { kind: 'rule', reference: 'topologyAuditEngine' },
    confidence: 1.0,
    output: { issuesCount: topology.issues.length, score: topology.overallScore },
  })

  const trace = builder.finalize('success')
  await persistTrace(trace).catch(() => {})

  return {
    classifications,
    topology: {
      issues: topology.issues.map(i => ({
        spaceId: i.spaceId,
        kind: i.kind,
        severity: i.severity,
        description: i.description,
        autoFix: i.autoFix,
      })),
      overallScore: topology.overallScore,
    },
    trace,
  }
}

// ─── predict ───────────────────────────────────

async function predictImpl<T>(context: Record<string, unknown>, type: PredictDomain): Promise<T> {
  switch (type) {
    case 'commercial-revenue': {
      const { generateBenchmarkDataset, trainRevenueForest, predictRevenue } =
        await import('../vol1-commercial/engines/revenueForestEngine')
      // Cache local du forest (on évite de retrain à chaque appel)
      if (!cachedForest) {
        const ds = generateBenchmarkDataset()
        cachedForest = trainRevenueForest(ds.features, ds.revenuesPerSqm, { nTrees: 30 })
      }
      const features = context as any
      return predictRevenue(cachedForest, features) as unknown as T
    }
    case 'footfall': {
      // Stub : utilise Kalman pour lisser la série fournie
      const { filterFootfall } = await import('../vol2-securitaire/engines/kalmanFilterEngine')
      return filterFootfall({ measurements: (context.measurements as any) ?? [] }) as unknown as T
    }
    case 'intervention-time': {
      const { simulateIntervention } = await import('../vol2-securitaire/engines/monteCarloInterventionEngine')
      const sim = simulateIntervention(
        (context.x as number) ?? 0, (context.y as number) ?? 0,
        (context.config as any) ?? { posts: [] },
      )
      return sim as unknown as T
    }
    default:
      throw new Error(`Domain de prédiction non supporté : ${type}`)
  }
}

let cachedForest: any = null

// ─── optimize ──────────────────────────────────

async function optimizeImpl(problem: OptimizeProblem, constraints?: Record<string, unknown>): Promise<OptimizeSolution[]> {
  switch (problem.kind) {
    case 'mix-enseignes': {
      const { generateMultipleScenarios } = await import('../vol1-commercial/engines/multiScenarioGeneratorEngine')
      return await generateMultipleScenarios(problem.context as any, constraints as any)
    }
    case 'camera-placement': {
      const { placeCamerasGreedy } = await import('../vol2-securitaire/engines/cameraPlacementEngine')
      return placeCamerasGreedy(problem.context as any).solutions
    }
    case 'agent-assignment': {
      const { assignAgentsToIncidents } = await import('../vol2-securitaire/engines/hungarianAssignmentEngine')
      const r = assignAgentsToIncidents(problem.context as any)
      return [{
        rank: 1,
        score: -r.totalCostSec,
        config: r,
        rationale: `${r.assignments.length} agents affectés en ${r.computeMs.toFixed(0)} ms (algorithme hongrois Jonker-Volgenant)`,
      }]
    }
    case 'signage-placement': {
      const { computeFlowPaths } = await import('../shared/engines/plan-analysis/flowPathEngine')
      const flow = computeFlowPaths(problem.context as any)
      return [{
        rank: 1,
        score: flow.summary.signageCount,
        config: flow,
        rationale: `Placement signalétique : ${flow.signage.length} panneaux (ERP prioritaire) — méthode ${flow.method}`,
      }]
    }
    default:
      throw new Error(`Problème d'optimisation non supporté : ${problem.kind}`)
  }
}

// ─── learn ─────────────────────────────────────

async function learnImpl(pattern: PatternEntry, context: Record<string, unknown>): Promise<void> {
  const { recordPattern } = await import('../shared/services/signageMemoryService')
  await recordPattern({
    pattern_type: pattern.type,
    trigger_raw: pattern.triggerKey,
    trigger_context: { ...pattern.context, ...context },
    applied_value: pattern.appliedValue,
    projet_id_origine: context.projetId as string | undefined,
  })
}

// ─── feedback ──────────────────────────────────

async function feedbackImpl(qrCode: string, data: FeedbackEntry): Promise<void> {
  const { parseFeedbackUrl, submitFeedback } = await import('../shared/services/signageFeedbackService')
  const parsed = parseFeedbackUrl(qrCode)
  if (!parsed) throw new Error('QR code non parsable.')
  await submitFeedback({
    projet_id: parsed.projetId,
    panel_ref: data.panelRef ?? parsed.panelRef,
    floor_id: parsed.floorId,
    x: parsed.x,
    y: parsed.y,
    panel_type: parsed.panelType,
    status: data.status,
    severity: data.severity,
    note: data.note,
    agent_name: data.agentName,
  })
  // Boucle d'apprentissage : si feedback "absent" répété → on apprend que cet emplacement
  // doit être renforcé. Ici on enregistre simplement l'event ; la consolidation
  // est faite par feedbackLearningPipeline (LRN-03).
}

// ─── Façade exportée ──────────────────────────

export const proph3t: Proph3tApi = {
  analyze: analyzeImpl,
  orchestrate: (input: OrchestrateInput) =>
    input.useWorker ? orchestrateInWorker(input) : orchestrate(input),
  predict: predictImpl,
  optimize: optimizeImpl,
  learn: learnImpl,
  feedback: feedbackImpl,
}

// Export default pour faciliter l'import
export default proph3t
