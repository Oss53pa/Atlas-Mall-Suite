// ═══ NAIVE BAYES — Scoring de risque par zone ═══
// P(risque|features) ∝ P(risque) × Π P(feature_i|risque)
// Avec lissage de Laplace pour éviter probas nulles.

export interface BayesianFeature {
  name: string
  /** Valeur observée (catégorielle). */
  value: string
}

export interface BayesianTrainingExample {
  /** Classe : 'risky' | 'safe' (ou autre binaire). */
  label: string
  features: BayesianFeature[]
}

export interface BayesianModel {
  classes: string[]
  /** P(class). */
  classPriors: Record<string, number>
  /** P(feature=value | class). */
  conditionals: Record<string, Record<string, Record<string, number>>>
  /** Smoothing alpha. */
  alpha: number
}

export function trainBayes(
  examples: BayesianTrainingExample[],
  alpha = 1,
): BayesianModel {
  const classCounts: Record<string, number> = {}
  const featureCounts: Record<string, Record<string, Record<string, number>>> = {}
  const featureValues: Record<string, Set<string>> = {}

  for (const ex of examples) {
    classCounts[ex.label] = (classCounts[ex.label] ?? 0) + 1
    featureCounts[ex.label] = featureCounts[ex.label] ?? {}
    for (const f of ex.features) {
      featureCounts[ex.label][f.name] = featureCounts[ex.label][f.name] ?? {}
      featureCounts[ex.label][f.name][f.value] = (featureCounts[ex.label][f.name][f.value] ?? 0) + 1
      featureValues[f.name] = featureValues[f.name] ?? new Set()
      featureValues[f.name].add(f.value)
    }
  }

  const total = examples.length || 1
  const classes = Object.keys(classCounts)
  const classPriors: Record<string, number> = {}
  for (const c of classes) classPriors[c] = classCounts[c] / total

  const conditionals: BayesianModel['conditionals'] = {}
  for (const c of classes) {
    conditionals[c] = {}
    for (const fname of Object.keys(featureValues)) {
      conditionals[c][fname] = {}
      const values = Array.from(featureValues[fname])
      const counts = featureCounts[c]?.[fname] ?? {}
      const sumValues = Object.values(counts).reduce((s: number, n: number) => s + n, 0)
      for (const v of values) {
        conditionals[c][fname][v] = ((counts[v] ?? 0) + alpha) / (sumValues + alpha * values.length)
      }
    }
  }
  return { classes, classPriors, conditionals, alpha }
}

/** Retourne distribution P(class | features) normalisée. */
export function predictBayes(
  model: BayesianModel,
  features: BayesianFeature[],
): Record<string, number> {
  const logScores: Record<string, number> = {}
  for (const c of model.classes) {
    let logP = Math.log(model.classPriors[c] || 1e-9)
    for (const f of features) {
      const cond = model.conditionals[c]?.[f.name]?.[f.value]
      logP += Math.log(cond || (model.alpha / 100))
    }
    logScores[c] = logP
  }
  // Softmax normalize
  const maxLog = Math.max(...Object.values(logScores))
  const exps: Record<string, number> = {}
  let sum = 0
  for (const c of Object.keys(logScores)) {
    exps[c] = Math.exp(logScores[c] - maxLog)
    sum += exps[c]
  }
  const probs: Record<string, number> = {}
  for (const c of Object.keys(exps)) probs[c] = exps[c] / sum
  return probs
}

/** Helper pré-entraîné : risque par zone (usage ad-hoc sans dataset). */
export function quickRiskScore(features: {
  hasCamera: boolean
  hasExit: boolean
  hasBadge: boolean
  isFloor0: boolean
  hasFire: boolean
  hasWindowAccess: boolean
}): { risky: number; safe: number } {
  // Modèle pré-câblé (heuristique experte) — sera remplacé par modèle entraîné
  const examples: BayesianTrainingExample[] = []
  // Génère 200 exemples synthétiques alignés sur règles APSAD/ERP
  for (let i = 0; i < 100; i++) {
    examples.push({ label: 'safe', features: [
      { name: 'cam', value: 'yes' }, { name: 'exit', value: i % 2 === 0 ? 'yes' : 'no' },
      { name: 'badge', value: 'yes' }, { name: 'fire', value: 'no' },
      { name: 'window', value: 'no' }, { name: 'floor', value: 'upper' },
    ] })
    examples.push({ label: 'risky', features: [
      { name: 'cam', value: 'no' }, { name: 'exit', value: 'no' },
      { name: 'badge', value: 'no' }, { name: 'fire', value: i % 2 === 0 ? 'yes' : 'no' },
      { name: 'window', value: 'yes' }, { name: 'floor', value: 'rdc' },
    ] })
  }
  const model = trainBayes(examples)
  const f: BayesianFeature[] = [
    { name: 'cam', value: features.hasCamera ? 'yes' : 'no' },
    { name: 'exit', value: features.hasExit ? 'yes' : 'no' },
    { name: 'badge', value: features.hasBadge ? 'yes' : 'no' },
    { name: 'fire', value: features.hasFire ? 'yes' : 'no' },
    { name: 'window', value: features.hasWindowAccess ? 'yes' : 'no' },
    { name: 'floor', value: features.isFloor0 ? 'rdc' : 'upper' },
  ]
  const probs = predictBayes(model, f)
  return { risky: probs.risky ?? 0, safe: probs.safe ?? 0 }
}
