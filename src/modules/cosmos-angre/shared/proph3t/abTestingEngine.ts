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

export const MOCK_AB_TESTS: ABTest[] = [
  {
    id: 'ab-01',
    name: 'Signaletique parking: fleches sol vs panneaux suspendus',
    hypothesis: 'Les fleches au sol reduisent le temps de navigation parking de 20%',
    startDate: '2026-02-01', endDate: '2026-03-15', status: 'completed',
    category: 'signaletique',
    variantA: { id: 'a1', name: 'Panneaux suspendus (controle)', description: 'Signalisation actuelle', visitors: 4200, conversions: 3570, avgSpendFcfa: 32_000, npsScore: 42 },
    variantB: { id: 'b1', name: 'Fleches au sol LED', description: 'Fleches directionnelles au sol retro-eclairees', visitors: 4150, conversions: 3735, avgSpendFcfa: 34_500, npsScore: 51 },
  },
  {
    id: 'ab-02',
    name: 'Borne interactive: ecran 43" vs 55"',
    hypothesis: 'L\'ecran 55" augmente l\'utilisation de 30%',
    startDate: '2026-02-15', endDate: '2026-03-20', status: 'completed',
    category: 'digital',
    variantA: { id: 'a2', name: 'Ecran 43"', description: 'Borne standard 43 pouces', visitors: 3800, conversions: 950, avgSpendFcfa: 45_000, npsScore: 48 },
    variantB: { id: 'b2', name: 'Ecran 55"', description: 'Borne grand format 55 pouces', visitors: 3750, conversions: 1312, avgSpendFcfa: 47_000, npsScore: 55 },
  },
  {
    id: 'ab-03',
    name: 'Parcours: circuit lineaire vs circuit libre',
    hypothesis: 'Le circuit libre augmente le dwell time de 15%',
    startDate: '2026-03-01', endDate: '2026-04-01', status: 'running',
    category: 'parcours',
    variantA: { id: 'a3', name: 'Circuit lineaire', description: 'Parcours oriente RDC -> R+1 -> R+2', visitors: 2100, conversions: 1680, avgSpendFcfa: 52_000, npsScore: 50 },
    variantB: { id: 'b3', name: 'Circuit libre', description: 'Parcours libre avec points d\'interet', visitors: 2050, conversions: 1722, avgSpendFcfa: 56_000, npsScore: 53 },
  },
  {
    id: 'ab-04',
    name: 'Offre Cosmos Club: -10% vs points doubles',
    hypothesis: 'Les points doubles generent plus de retention que la remise directe',
    startDate: '2026-03-10', endDate: '2026-04-10', status: 'running',
    category: 'offre',
    variantA: { id: 'a4', name: 'Remise -10%', description: 'Coupon remise immediate 10%', visitors: 1500, conversions: 1050, avgSpendFcfa: 38_000, npsScore: 46 },
    variantB: { id: 'b4', name: 'Points x2', description: 'Points Cosmos Club doubles pendant 1 mois', visitors: 1480, conversions: 1036, avgSpendFcfa: 41_000, npsScore: 49 },
  },
]

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
