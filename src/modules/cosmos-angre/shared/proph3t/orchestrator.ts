// ═══ PROPH3T ORCHESTRATOR — Routing skills + auto-trigger + RLHF integration ═══
// Toutes les analyses passent par ici : auto-déclenchement à l'import / modif,
// résolution skill, exécution avec mesure de temps, persistance result + corrections.

import type { Proph3tResult, Proph3tCorrection } from './orchestrator.types'
import { useRlhfStore } from './rlhfStore'

// ─── Skill registry ───────────────────────────────────────

export type SkillFunction<TInput, TOutput> = (input: TInput) => Promise<Proph3tResult<TOutput>>

interface SkillRegistry {
  [skillId: string]: SkillFunction<any, any>
}

const registry: SkillRegistry = {}

export function registerSkill<TInput, TOutput>(
  skillId: string,
  fn: SkillFunction<TInput, TOutput>,
): void {
  registry[skillId] = fn
}

export function listSkills(): string[] {
  return Object.keys(registry)
}

// ─── Result store (in-memory, derniers résultats par skill) ───

const lastResults = new Map<string, Proph3tResult<unknown>>()

export function getLastResult(skillId: string): Proph3tResult<unknown> | undefined {
  return lastResults.get(skillId)
}

// ─── Listeners ────────────────────────────────────────────

type ResultListener = (skill: string, result: Proph3tResult<unknown>) => void
const listeners = new Set<ResultListener>()

export function onProph3tResult(handler: ResultListener): () => void {
  listeners.add(handler)
  return () => listeners.delete(handler)
}

// ─── Run a skill ──────────────────────────────────────────

export async function runSkill<TInput, TOutput>(
  skillId: string,
  input: TInput,
): Promise<Proph3tResult<TOutput>> {
  const fn = registry[skillId] as SkillFunction<TInput, TOutput> | undefined
  if (!fn) throw new Error(`PROPH3T skill unknown: ${skillId}`)
  console.log(`[PROPH3T] running skill: ${skillId}`)
  const result = await fn(input)
  lastResults.set(skillId, result)
  for (const l of listeners) {
    try { l(skillId, result) } catch (err) { console.error('[PROPH3T] listener error', err) }
  }
  return result
}

// ─── Auto-triggers (événements de domaine déclenchant des skills) ───

export type Proph3tTrigger =
  | 'plan-imported'
  | 'plan-modified'
  | 'lot-modified'
  | 'tenant-modified'
  | 'security-recomputed'
  | 'parcours-recomputed'
  | 'report-requested'

const triggerMap = new Map<Proph3tTrigger, Set<{ skillId: string; buildInput: () => unknown }>>()

export function bindTrigger(
  trigger: Proph3tTrigger,
  skillId: string,
  buildInput: () => unknown,
): () => void {
  const set = triggerMap.get(trigger) ?? new Set()
  const entry = { skillId, buildInput }
  set.add(entry)
  triggerMap.set(trigger, set)
  return () => set.delete(entry)
}

export async function fireTrigger(trigger: Proph3tTrigger): Promise<Proph3tResult<unknown>[]> {
  const entries = triggerMap.get(trigger)
  if (!entries || entries.size === 0) return []
  const results: Proph3tResult<unknown>[] = []
  for (const { skillId, buildInput } of entries) {
    try {
      const input = buildInput()
      const r = await runSkill(skillId, input)
      results.push(r)
    } catch (err) {
      console.error(`[PROPH3T] trigger ${trigger} → ${skillId} failed`, err)
    }
  }
  return results
}

// ─── Apply correction (RLHF) ──────────────────────────────

export function applyCorrection(correction: Proph3tCorrection): void {
  useRlhfStore.getState().record(correction)
}

// ─── Wire up to domain event bus ──────────────────────────

let wired = false

export async function wireDomainTriggers(): Promise<void> {
  if (wired) return
  wired = true
  // Branche les événements du domain bus aux triggers PROPH3T
  const { eventBus } = await import('../domain/events')
  eventBus.on('plan.imported', () => { void fireTrigger('plan-imported') })
  eventBus.on('lot.created', () => { void fireTrigger('lot-modified') })
  eventBus.on('lot.updated', () => { void fireTrigger('lot-modified') })
  eventBus.on('lot.deleted', () => { void fireTrigger('lot-modified') })
  eventBus.on('lot.tenantAssigned', () => { void fireTrigger('tenant-modified') })
  eventBus.on('lot.statusChanged', () => { void fireTrigger('tenant-modified') })
  eventBus.on('security.coverageRecomputed', () => { void fireTrigger('security-recomputed') })
  eventBus.on('parcours.pathRecomputed', () => { void fireTrigger('parcours-recomputed') })
  console.log('[PROPH3T] domain triggers wired')
}
