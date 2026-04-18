// ═══ Model Registry — LRN-04/05/06 ═══
//
// CDC §3.6 :
//   LRN-04 — Ré-entraîner périodiquement les modèles prédictifs
//   LRN-05 — Mesurer et exposer la précision des modèles
//   LRN-06 — Permettre le rollback vers une version antérieure
//
// Versionning ML : chaque modèle entraîné est stocké en IndexedDB (poids
// sérialisés JSON), avec metadata de précision (MAPE, MAE, R²) et tag de version.
// Rollback = repointer le pointeur "active" sur une version antérieure.

import { supabase, isOfflineMode } from '../../../lib/supabase'

// ─── Types ────────────────────────────────────

export type ModelKind =
  | 'revenue-forest'      // gradient boosting CA/m²
  | 'genetic-mix'         // optimiseur mix
  | 'space-classifier'    // taxonomie 31 types
  | 'abm-calibration'     // paramètres ABM par persona
  | 'kalman-footfall'     // filtre Kalman footfall
  | 'cusum-baseline'      // baselines CUSUM par zone

export interface ModelMetrics {
  /** MAPE — Mean Absolute Percentage Error (régressions). */
  mape?: number
  /** MAE — Mean Absolute Error. */
  mae?: number
  /** R² coefficient. */
  r2?: number
  /** Précision pour classification (0..1). */
  accuracy?: number
  /** F1 score moyen. */
  f1?: number
  /** Temps moyen d'inférence en ms. */
  inferenceMs?: number
  /** Taille du dataset d'entraînement. */
  trainingSize?: number
  /** Taille du dataset de validation. */
  validationSize?: number
  /** Date du back-test. */
  backTestedAt?: string
}

export interface ModelVersion {
  id: string
  kind: ModelKind
  version: string                   // semver
  /** Poids sérialisés (JSON ou base64). */
  weightsJson: string
  /** Hyperparamètres utilisés. */
  hyperparams: Record<string, unknown>
  metrics: ModelMetrics
  trainedAt: string
  trainedBy?: string
  notes?: string
  /** true si version active (lecture par défaut). */
  isActive: boolean
  /** true si bloquée (interdiction de promote/rollback). */
  isLocked: boolean
}

export interface ReTrainSchedule {
  kind: ModelKind
  /** Période en jours. */
  intervalDays: number
  /** Seuil de dégradation (MAPE) au-dessus duquel re-train forcé. */
  thresholdMapeDelta: number
  /** Date prévue prochain ré-entraînement. */
  nextDueAt: string
  enabled: boolean
}

// ─── Registry persistant (IndexedDB local + Supabase opt.) ───

const STORAGE_KEY = 'atlas-proph3t-model-registry'

interface RegistryState {
  versions: ModelVersion[]
  schedules: ReTrainSchedule[]
}

function loadRegistry(): RegistryState {
  if (typeof localStorage === 'undefined') return { versions: [], schedules: [] }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { versions: [], schedules: [] }
  try { return JSON.parse(raw) } catch { return { versions: [], schedules: [] } }
}

function saveRegistry(state: RegistryState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// ─── API ─────────────────────────────────────

export function registerModelVersion(input: {
  kind: ModelKind
  version: string
  weightsJson: string
  hyperparams: Record<string, unknown>
  metrics: ModelMetrics
  notes?: string
  setActive?: boolean
}): ModelVersion {
  const state = loadRegistry()
  const id = `${input.kind}-${input.version}-${Date.now().toString(36)}`
  const newVersion: ModelVersion = {
    id,
    kind: input.kind,
    version: input.version,
    weightsJson: input.weightsJson,
    hyperparams: input.hyperparams,
    metrics: input.metrics,
    trainedAt: new Date().toISOString(),
    notes: input.notes,
    isActive: input.setActive ?? true,
    isLocked: false,
  }
  // Désactiver les autres versions du même kind si on active celle-ci
  if (newVersion.isActive) {
    for (const v of state.versions) {
      if (v.kind === input.kind) v.isActive = false
    }
  }
  state.versions.push(newVersion)
  saveRegistry(state)

  // Sync Supabase optionnelle
  if (!isOfflineMode) {
    void supabase.from('proph3t_model_versions').insert({
      id, kind: input.kind, version: input.version,
      weights_json: input.weightsJson,
      hyperparams: input.hyperparams,
      metrics: input.metrics,
      notes: input.notes ?? null,
      is_active: newVersion.isActive,
      trained_at: newVersion.trainedAt,
    }).then(() => {/* silencieux */})
  }
  return newVersion
}

export function getActiveModel(kind: ModelKind): ModelVersion | null {
  const state = loadRegistry()
  return state.versions.find(v => v.kind === kind && v.isActive) ?? null
}

export function listVersions(kind?: ModelKind): ModelVersion[] {
  const state = loadRegistry()
  return kind ? state.versions.filter(v => v.kind === kind) : state.versions
}

/** Promote une version comme active (rollback ou avancement). */
export function activateVersion(versionId: string): { success: boolean; error?: string } {
  const state = loadRegistry()
  const target = state.versions.find(v => v.id === versionId)
  if (!target) return { success: false, error: 'Version introuvable.' }
  if (target.isLocked) return { success: false, error: 'Version verrouillée.' }
  for (const v of state.versions) {
    if (v.kind === target.kind) v.isActive = false
  }
  target.isActive = true
  saveRegistry(state)
  // Audit Supabase
  if (!isOfflineMode) {
    void supabase.from('proph3t_model_versions')
      .update({ is_active: true })
      .eq('id', versionId)
  }
  return { success: true }
}

export function lockVersion(versionId: string): boolean {
  const state = loadRegistry()
  const v = state.versions.find(x => x.id === versionId)
  if (!v) return false
  v.isLocked = true
  saveRegistry(state)
  return true
}

export function deleteVersion(versionId: string): { success: boolean; error?: string } {
  const state = loadRegistry()
  const v = state.versions.find(x => x.id === versionId)
  if (!v) return { success: false, error: 'Version introuvable.' }
  if (v.isLocked) return { success: false, error: 'Version verrouillée — impossible de supprimer.' }
  if (v.isActive) return { success: false, error: 'Version active — promouvoir une autre version d\'abord.' }
  state.versions = state.versions.filter(x => x.id !== versionId)
  saveRegistry(state)
  return { success: true }
}

// ─── Backtest + précision (LRN-05) ───────────

export interface BacktestInput<X, Y> {
  kind: ModelKind
  versionId: string
  testSet: Array<{ input: X; truth: Y }>
  predict: (input: X) => Y
}

/** Exécute un back-test régression et calcule MAPE / MAE / R². */
export function backtestRegression<X>(
  input: BacktestInput<X, number>,
): { mape: number; mae: number; r2: number; n: number } {
  const ys = input.testSet.map(t => t.truth)
  const yMean = ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length)
  let sumAbs = 0, sumPct = 0, ssRes = 0, ssTot = 0
  for (const t of input.testSet) {
    const pred = input.predict(t.input)
    const err = pred - t.truth
    sumAbs += Math.abs(err)
    if (t.truth !== 0) sumPct += Math.abs(err / t.truth)
    ssRes += err * err
    ssTot += (t.truth - yMean) ** 2
  }
  const n = input.testSet.length
  const mape = n > 0 ? sumPct / n : 0
  const mae = n > 0 ? sumAbs / n : 0
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  // Mise à jour metrics dans registry
  const state = loadRegistry()
  const v = state.versions.find(v => v.id === input.versionId)
  if (v) {
    v.metrics = {
      ...v.metrics,
      mape, mae, r2,
      backTestedAt: new Date().toISOString(),
      validationSize: n,
    }
    saveRegistry(state)
  }
  return { mape, mae, r2, n }
}

/** Idem pour classification. */
export function backtestClassification<X>(
  input: BacktestInput<X, string>,
): { accuracy: number; n: number; perClass: Record<string, { precision: number; recall: number; f1: number }> } {
  const n = input.testSet.length
  let correct = 0
  const tp: Record<string, number> = {}
  const fp: Record<string, number> = {}
  const fn: Record<string, number> = {}
  for (const t of input.testSet) {
    const pred = input.predict(t.input)
    if (pred === t.truth) {
      correct++
      tp[t.truth] = (tp[t.truth] ?? 0) + 1
    } else {
      fp[pred] = (fp[pred] ?? 0) + 1
      fn[t.truth] = (fn[t.truth] ?? 0) + 1
    }
  }
  const accuracy = n ? correct / n : 0
  const perClass: Record<string, { precision: number; recall: number; f1: number }> = {}
  const classes = new Set([...Object.keys(tp), ...Object.keys(fp), ...Object.keys(fn)])
  let f1Sum = 0
  for (const c of classes) {
    const p = (tp[c] ?? 0) / Math.max(1, (tp[c] ?? 0) + (fp[c] ?? 0))
    const r = (tp[c] ?? 0) / Math.max(1, (tp[c] ?? 0) + (fn[c] ?? 0))
    const f1 = (p + r) > 0 ? 2 * p * r / (p + r) : 0
    perClass[c] = { precision: p, recall: r, f1 }
    f1Sum += f1
  }
  const macroF1 = classes.size ? f1Sum / classes.size : 0

  // Mise à jour metrics
  const state = loadRegistry()
  const v = state.versions.find(v => v.id === input.versionId)
  if (v) {
    v.metrics = {
      ...v.metrics,
      accuracy, f1: macroF1,
      backTestedAt: new Date().toISOString(),
      validationSize: n,
    }
    saveRegistry(state)
  }
  return { accuracy, n, perClass }
}

// ─── Re-training scheduling (LRN-04) ─────────

export function scheduleRetrain(input: ReTrainSchedule): void {
  const state = loadRegistry()
  state.schedules = state.schedules.filter(s => s.kind !== input.kind)
  state.schedules.push(input)
  saveRegistry(state)
}

export function getDueRetrains(now = Date.now()): ReTrainSchedule[] {
  const state = loadRegistry()
  return state.schedules.filter(s => s.enabled && new Date(s.nextDueAt).getTime() <= now)
}

export function markRetrainCompleted(kind: ModelKind, nextDueDate: Date): void {
  const state = loadRegistry()
  const sched = state.schedules.find(s => s.kind === kind)
  if (sched) {
    sched.nextDueAt = nextDueDate.toISOString()
    saveRegistry(state)
  }
}

// ─── Vue de monitoring globale (LRN-05) ──────

export interface RegistrySummary {
  modelsCount: number
  versionsCount: number
  activeByKind: Partial<Record<ModelKind, ModelVersion>>
  averageMape: number
  schedulesDueCount: number
  oldestActiveDays: number
}

export function getRegistrySummary(): RegistrySummary {
  const state = loadRegistry()
  const active: Partial<Record<ModelKind, ModelVersion>> = {}
  for (const v of state.versions.filter(v => v.isActive)) active[v.kind] = v
  const mapes = Object.values(active).map(v => v?.metrics.mape).filter((x): x is number => x !== undefined)
  const avgMape = mapes.length ? mapes.reduce((a, b) => a + b, 0) / mapes.length : 0
  const due = getDueRetrains().length
  const oldest = Object.values(active).reduce((min, v) => {
    if (!v) return min
    const days = (Date.now() - new Date(v.trainedAt).getTime()) / (1000 * 3600 * 24)
    return Math.max(min, days)
  }, 0)
  return {
    modelsCount: Object.keys(active).length,
    versionsCount: state.versions.length,
    activeByKind: active,
    averageMape: avgMape,
    schedulesDueCount: due,
    oldestActiveDays: oldest,
  }
}
