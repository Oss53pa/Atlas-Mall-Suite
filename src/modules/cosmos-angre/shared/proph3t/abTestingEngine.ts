// ═══ PROPH3T — Moteur A/B Testing ═══

export interface ABVariant {
  id: string
  name: string
  description: string
  visitors: number
  conversions: number
  avgSpendFcfa: number
  npsScore: number
}

export interface ABTest {
  id: string
  name: string
  hypothesis: string
  startDate: string
  endDate: string
  status: 'draft' | 'running' | 'completed' | 'paused'
  category: 'signaletique' | 'parcours' | 'digital' | 'offre'
  variantA: ABVariant
  variantB: ABVariant
}

export interface ABTestResult {
  testId: string
  winner: 'A' | 'B' | 'inconclusive'
  conversionLift: number
  spendLift: number
  npsLift: number
  confidence: number
  recommendation: string
  sampleSizeAdequate: boolean
}

// Pas de tests A/B mockés : les tests sont à créer par l'utilisateur. analyzeABTest
// accepte tout ABTest fourni (saisi, importé, ou généré par le moteur).

export function analyzeABTest(test: ABTest): ABTestResult {
  const { variantA: a, variantB: b } = test

  const crA = a.visitors > 0 ? a.conversions / a.visitors : 0
  const crB = b.visitors > 0 ? b.conversions / b.visitors : 0
  const conversionLift = crA > 0 ? (crB - crA) / crA : 0

  const spendLift = a.avgSpendFcfa > 0 ? (b.avgSpendFcfa - a.avgSpendFcfa) / a.avgSpendFcfa : 0
  const npsLift = b.npsScore - a.npsScore

  // Simplified confidence via sample size heuristic
  const totalSample = a.visitors + b.visitors
  const sampleSizeAdequate = totalSample >= 2000
  const confidence = sampleSizeAdequate
    ? Math.min(0.99, 0.7 + Math.abs(conversionLift) * 2)
    : Math.min(0.85, 0.5 + Math.abs(conversionLift))

  let winner: ABTestResult['winner'] = 'inconclusive'
  if (confidence >= 0.9) {
    winner = conversionLift > 0.02 ? 'B' : conversionLift < -0.02 ? 'A' : 'inconclusive'
  }

  const winnerName = winner === 'A' ? a.name : winner === 'B' ? b.name : 'Aucun'
  const recommendation = winner === 'inconclusive'
    ? `Resultats non concluants. Prolonger le test de 2 semaines ou augmenter le trafic.`
    : `Deployer "${winnerName}" — lift conversion +${(Math.abs(conversionLift) * 100).toFixed(1)}%, confidence ${(confidence * 100).toFixed(0)}%.`

  return {
    testId: test.id, winner, conversionLift, spendLift, npsLift,
    confidence, recommendation, sampleSizeAdequate,
  }
}
