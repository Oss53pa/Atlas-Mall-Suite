// ═══ HEDONIC REGRESSION — Estimation loyer de marché par lot ═══
// Régression linéaire multiple : loyer = β₀ + Σ βᵢ × featureᵢ + ε
// Ridge (L2) pour régulariser. Résolution par équations normales.

export interface HedonicSample {
  /** Variable réponse : loyer FCFA/m²/mois. */
  rent: number
  /** Features : surface, niveau (encoded), flux estimé, anchor proximity, etc. */
  features: number[]
}

export interface HedonicModel {
  /** Coefficient pour chaque feature + intercept en [0]. */
  coefficients: number[]
  rSquared: number
  /** Erreur standard. */
  rmse: number
  /** Nb d'échantillons. */
  n: number
}

/** Inverse de matrice par Gauss-Jordan (n petit, OK ici). */
function invert(matrix: number[][]): number[][] | null {
  const n = matrix.length
  const aug: number[][] = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)])
  for (let i = 0; i < n; i++) {
    // Pivot
    let pivot = i
    for (let r = i + 1; r < n; r++) if (Math.abs(aug[r][i]) > Math.abs(aug[pivot][i])) pivot = r
    if (Math.abs(aug[pivot][i]) < 1e-12) return null
    ;[aug[i], aug[pivot]] = [aug[pivot], aug[i]]
    const piv = aug[i][i]
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= piv
    for (let r = 0; r < n; r++) {
      if (r === i) continue
      const factor = aug[r][i]
      for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[i][j]
    }
  }
  return aug.map(row => row.slice(n))
}

export function fitHedonic(samples: HedonicSample[], lambda = 0.1): HedonicModel {
  if (samples.length === 0) return { coefficients: [], rSquared: 0, rmse: 0, n: 0 }
  const k = samples[0].features.length
  // Matrice X (n × k+1) avec colonne 1 pour intercept
  const X: number[][] = samples.map(s => [1, ...s.features])
  const y: number[] = samples.map(s => s.rent)
  // X^T X + λI
  const XtX: number[][] = []
  for (let i = 0; i <= k; i++) {
    XtX.push([])
    for (let j = 0; j <= k; j++) {
      let sum = 0
      for (let r = 0; r < X.length; r++) sum += X[r][i] * X[r][j]
      if (i === j && i > 0) sum += lambda // ridge sauf intercept
      XtX[i].push(sum)
    }
  }
  // X^T y
  const Xty: number[] = []
  for (let i = 0; i <= k; i++) {
    let sum = 0
    for (let r = 0; r < X.length; r++) sum += X[r][i] * y[r]
    Xty.push(sum)
  }
  const inv = invert(XtX)
  if (!inv) return { coefficients: new Array(k + 1).fill(0), rSquared: 0, rmse: 0, n: samples.length }
  const beta: number[] = []
  for (let i = 0; i <= k; i++) {
    let sum = 0
    for (let j = 0; j <= k; j++) sum += inv[i][j] * Xty[j]
    beta.push(sum)
  }
  // Métriques
  const yMean = y.reduce((s, v) => s + v, 0) / y.length
  let ssTot = 0, ssRes = 0
  for (let i = 0; i < samples.length; i++) {
    const pred = beta[0] + samples[i].features.reduce((s, f, j) => s + beta[j + 1] * f, 0)
    ssTot += (y[i] - yMean) ** 2
    ssRes += (y[i] - pred) ** 2
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0
  const rmse = Math.sqrt(ssRes / samples.length)
  return { coefficients: beta, rSquared, rmse, n: samples.length }
}

export function predictHedonic(model: HedonicModel, features: number[]): number {
  if (model.coefficients.length === 0) return 0
  return model.coefficients[0] + features.reduce((s, f, i) => s + (model.coefficients[i + 1] ?? 0) * f, 0)
}
