// ═══ Revenue Model Service — adapter LightGBM serveur ═══
//
// CDC §4.2 + Fix 4 :
//   - Si volume données > 100 000 → utiliser LightGBM serveur (Python)
//   - Sinon → fallback gradient boosting natif TS (rapide, pas de réseau)
//
// L'utilisateur peut connecter son propre service LightGBM via la variable
// `VITE_LIGHTGBM_SERVICE_URL`. Le service expose 3 endpoints :
//   POST /train     → { features, targets, hyperparams } → { modelId, metrics }
//   POST /predict   → { modelId, features }              → { prediction, confidence, ci80 }
//   POST /backtest  → { modelId, testSet }               → { mape, mae, r2 }
//
// Fallback gracieux : si service indisponible, on utilise revenueForestEngine natif.

import {
  trainRevenueForest, predictRevenue, generateBenchmarkDataset,
  type LocalFeatures, type Prediction, type RevenueForest, type TrainConfig,
} from './revenueForestEngine'

// ─── Configuration ───────────────────────────

const SERVICE_URL = (import.meta as any).env?.VITE_LIGHTGBM_SERVICE_URL ?? ''
const SERVICE_API_KEY = (import.meta as any).env?.VITE_LIGHTGBM_API_KEY ?? ''
const SAMPLE_THRESHOLD = 5000   // au-delà → préférer LightGBM serveur

export type ModelBackend = 'native-ts' | 'lightgbm-server' | 'auto'

interface BackendCapabilities {
  available: boolean
  url?: string
  latencyMs?: number
  version?: string
  error?: string
}

let cachedCapabilities: BackendCapabilities | null = null
let cachedNativeForest: RevenueForest | null = null

// ─── Détection backend ──────────────────────

export async function detectBackend(): Promise<{
  native: BackendCapabilities
  lightgbm: BackendCapabilities
  recommended: ModelBackend
}> {
  const native: BackendCapabilities = {
    available: true,
    version: 'native-gbt-1.0',
  }

  let lightgbm: BackendCapabilities = { available: false, error: 'VITE_LIGHTGBM_SERVICE_URL non configuré' }
  if (SERVICE_URL) {
    try {
      const t0 = performance.now()
      const res = await fetch(`${SERVICE_URL}/health`, {
        headers: SERVICE_API_KEY ? { 'X-API-Key': SERVICE_API_KEY } : {},
        signal: AbortSignal.timeout(3000),
      })
      const latency = performance.now() - t0
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        lightgbm = {
          available: true,
          url: SERVICE_URL,
          latencyMs: Math.round(latency),
          version: data.version ?? 'unknown',
        }
      } else {
        lightgbm = { available: false, error: `HTTP ${res.status}` }
      }
    } catch (err) {
      lightgbm = { available: false, error: err instanceof Error ? err.message : 'unknown' }
    }
  }

  cachedCapabilities = lightgbm
  return {
    native, lightgbm,
    recommended: lightgbm.available ? 'lightgbm-server' : 'native-ts',
  }
}

// ─── Service unifié ────────────────────────

export interface TrainOptions extends TrainConfig {
  backend?: ModelBackend
  /** Si true, utilise LightGBM uniquement si dataset > SAMPLE_THRESHOLD. */
  autoBackend?: boolean
}

export interface UnifiedTrainResult {
  modelId: string
  backend: 'native-ts' | 'lightgbm-server'
  metrics: {
    samples: number
    durationMs: number
    mapeTrain?: number
  }
  /** Pour native-ts : référence au forest local. */
  nativeForest?: RevenueForest
  /** Pour lightgbm-server : id du modèle côté serveur. */
  serverModelId?: string
}

export async function trainModel(
  features: LocalFeatures[],
  targets: number[],
  options: TrainOptions = {},
): Promise<UnifiedTrainResult> {
  const t0 = performance.now()
  const autoBackend = options.autoBackend ?? true

  // ─── Choix backend ───
  let backend: 'native-ts' | 'lightgbm-server' = 'native-ts'
  if (options.backend === 'lightgbm-server') {
    backend = 'lightgbm-server'
  } else if (options.backend === 'native-ts') {
    backend = 'native-ts'
  } else if (autoBackend && features.length > SAMPLE_THRESHOLD) {
    // Auto : essayer LightGBM si dataset important
    const caps = await detectBackend()
    if (caps.lightgbm.available) backend = 'lightgbm-server'
  }

  // ─── Branche LightGBM serveur ───
  if (backend === 'lightgbm-server') {
    try {
      const result = await trainRemote(features, targets, options)
      return {
        ...result,
        backend: 'lightgbm-server',
        metrics: {
          samples: features.length,
          durationMs: Math.round(performance.now() - t0),
          ...result.metrics,
        },
      }
    } catch (err) {
      // Fallback gracieux native si serveur fail
       
      console.warn('[revenueModelService] LightGBM serveur indisponible, fallback native:', err)
    }
  }

  // ─── Branche native ───
  const forest = trainRevenueForest(features, targets, options)
  cachedNativeForest = forest
  const modelId = `native-${Date.now().toString(36)}`
  return {
    modelId,
    backend: 'native-ts',
    metrics: {
      samples: features.length,
      durationMs: Math.round(performance.now() - t0),
    },
    nativeForest: forest,
  }
}

export async function predict(
  modelHandle: UnifiedTrainResult,
  features: LocalFeatures,
): Promise<Prediction> {
  if (modelHandle.backend === 'lightgbm-server' && modelHandle.serverModelId) {
    try {
      return await predictRemote(modelHandle.serverModelId, features)
    } catch (err) {
      console.warn('[revenueModelService] LightGBM predict échec, fallback native:', err)
    }
  }
  if (modelHandle.nativeForest) {
    return predictRevenue(modelHandle.nativeForest, features)
  }
  // Dernier fallback : entraîner native rapidement avec benchmark dataset
  if (!cachedNativeForest) {
    const ds = generateBenchmarkDataset()
    cachedNativeForest = trainRevenueForest(ds.features, ds.revenuesPerSqm, { nTrees: 20 })
  }
  return predictRevenue(cachedNativeForest, features)
}

// ─── Calls HTTP serveur ────────────────────

async function trainRemote(
  features: LocalFeatures[], targets: number[], options: TrainOptions,
): Promise<{ modelId: string; serverModelId: string; metrics: { mapeTrain?: number } }> {
  const res = await fetch(`${SERVICE_URL}/train`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SERVICE_API_KEY ? { 'X-API-Key': SERVICE_API_KEY } : {}),
    },
    body: JSON.stringify({
      features, targets,
      hyperparams: {
        n_estimators: options.nTrees ?? 100,
        max_depth: options.maxDepth ?? 6,
        learning_rate: options.learningRate ?? 0.05,
        min_child_samples: options.minSplit ?? 5,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) throw new Error(`train HTTP ${res.status}`)
  const data = await res.json()
  return {
    modelId: data.modelId ?? data.model_id,
    serverModelId: data.modelId ?? data.model_id,
    metrics: { mapeTrain: data.metrics?.mape ?? data.metrics?.mape_train },
  }
}

async function predictRemote(serverModelId: string, features: LocalFeatures): Promise<Prediction> {
  const res = await fetch(`${SERVICE_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(SERVICE_API_KEY ? { 'X-API-Key': SERVICE_API_KEY } : {}),
    },
    body: JSON.stringify({ modelId: serverModelId, features }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`predict HTTP ${res.status}`)
  const data = await res.json()
  return {
    revenuePerYearFcfa: data.revenuePerYear ?? data.revenue_per_year ?? 0,
    revenuePerSqmFcfa: data.revenuePerSqm ?? data.revenue_per_sqm ?? 0,
    ci80Low: data.ci80Low ?? data.ci80_low ?? 0,
    ci80High: data.ci80High ?? data.ci80_high ?? 0,
    topContributors: data.topContributors ?? data.top_contributors ?? [],
  }
}

// ─── Backtest ─────────────────────────────

export interface BacktestResult {
  mape: number
  mae: number
  r2: number
  n: number
  backend: 'native-ts' | 'lightgbm-server'
}

export async function backtestModel(
  modelHandle: UnifiedTrainResult,
  testFeatures: LocalFeatures[],
  testTargets: number[],
): Promise<BacktestResult> {
  if (modelHandle.backend === 'lightgbm-server' && modelHandle.serverModelId && SERVICE_URL) {
    try {
      const res = await fetch(`${SERVICE_URL}/backtest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SERVICE_API_KEY ? { 'X-API-Key': SERVICE_API_KEY } : {}),
        },
        body: JSON.stringify({
          modelId: modelHandle.serverModelId,
          features: testFeatures, targets: testTargets,
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (res.ok) {
        const d = await res.json()
        return {
          mape: d.mape, mae: d.mae, r2: d.r2,
          n: testFeatures.length,
          backend: 'lightgbm-server',
        }
      }
    } catch (err) {
      console.warn('[revenueModelService] backtest LightGBM échec, fallback native')
    }
  }

  // Native backtest
  if (!modelHandle.nativeForest) {
    throw new Error('Pas de modèle natif disponible pour backtest')
  }
  const forest = modelHandle.nativeForest
  let sumAbs = 0, sumPct = 0, ssRes = 0, ssTot = 0
  const targetMean = testTargets.reduce((a, b) => a + b, 0) / Math.max(1, testTargets.length)
  for (let i = 0; i < testFeatures.length; i++) {
    const pred = predictRevenue(forest, testFeatures[i])
    const err = pred.revenuePerSqmFcfa - testTargets[i]
    sumAbs += Math.abs(err)
    if (testTargets[i] !== 0) sumPct += Math.abs(err / testTargets[i])
    ssRes += err * err
    ssTot += (testTargets[i] - targetMean) ** 2
  }
  const n = testFeatures.length
  return {
    mape: n > 0 ? sumPct / n : 0,
    mae: n > 0 ? sumAbs / n : 0,
    r2: ssTot > 0 ? 1 - ssRes / ssTot : 0,
    n,
    backend: 'native-ts',
  }
}

// ─── Helpers status ─────────────────────────

export function isServerConfigured(): boolean {
  return !!SERVICE_URL
}

export function getCachedCapabilities(): BackendCapabilities | null {
  return cachedCapabilities
}
