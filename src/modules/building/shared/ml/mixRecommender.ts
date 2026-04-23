// ═══ MIX RECOMMENDER — Recommandations enseignes par lot (M11) ═══
// Pas de modèle ML entraîné (pas de dataset) → heuristique pondérée basée sur :
//  - Écart au mix idéal (benchmarks African retail)
//  - Adjacence tenant-mix (complémentarité vs concurrence)
//  - Taille du lot vs surface moyenne par catégorie
//  - Position (RDC=ancre, étages=services/loisirs)

import type { Lot } from '../domain/LotEntity'
import { FloorLevel } from '../domain/FloorLevel'

export type Sector =
  | 'mode' | 'restauration' | 'services' | 'loisirs'
  | 'alimentaire' | 'beaute' | 'electronique' | 'bijouterie'
  | 'sport' | 'enfants' | 'maison' | 'sante'

export interface MixRecommendation {
  lotId: string
  recommendedSector: Sector
  confidence: number       // 0-1
  reasoning: string[]
  estimatedRentFcfaM2Month: number
  alternatives: Array<{ sector: Sector; confidence: number }>
}

// ─── Surfaces moyennes par secteur (m²) ────────────────────

const IDEAL_AREA_BY_SECTOR: Record<Sector, { min: number; median: number; max: number }> = {
  mode: { min: 40, median: 120, max: 400 },
  restauration: { min: 25, median: 80, max: 300 },
  services: { min: 15, median: 40, max: 120 },
  loisirs: { min: 100, median: 400, max: 2000 },
  alimentaire: { min: 500, median: 1500, max: 5000 },
  beaute: { min: 20, median: 50, max: 150 },
  electronique: { min: 50, median: 150, max: 500 },
  bijouterie: { min: 15, median: 35, max: 90 },
  sport: { min: 80, median: 250, max: 800 },
  enfants: { min: 40, median: 120, max: 400 },
  maison: { min: 100, median: 300, max: 1000 },
  sante: { min: 20, median: 60, max: 200 },
}

// ─── Préférences niveau ────────────────────────────────────

const FLOOR_AFFINITY: Record<Sector, Partial<Record<FloorLevel, number>>> = {
  alimentaire:   { [FloorLevel.RDC]: 1.0, [FloorLevel.B1]: 0.8, [FloorLevel.R1]: 0.3 },
  mode:          { [FloorLevel.RDC]: 1.0, [FloorLevel.R1]: 0.9, [FloorLevel.R2]: 0.7 },
  restauration:  { [FloorLevel.R1]: 1.0, [FloorLevel.RDC]: 0.8, [FloorLevel.R2]: 0.9 },
  loisirs:       { [FloorLevel.R2]: 1.0, [FloorLevel.R1]: 0.8, [FloorLevel.ROOF]: 0.9 },
  services:      { [FloorLevel.RDC]: 0.9, [FloorLevel.R1]: 0.7 },
  beaute:        { [FloorLevel.RDC]: 1.0, [FloorLevel.R1]: 0.8 },
  electronique:  { [FloorLevel.R1]: 1.0, [FloorLevel.RDC]: 0.7 },
  bijouterie:    { [FloorLevel.RDC]: 1.0 },
  sport:         { [FloorLevel.R1]: 1.0, [FloorLevel.R2]: 0.8 },
  enfants:       { [FloorLevel.R1]: 1.0, [FloorLevel.R2]: 0.9 },
  maison:        { [FloorLevel.R1]: 1.0, [FloorLevel.R2]: 0.9 },
  sante:         { [FloorLevel.RDC]: 0.8, [FloorLevel.R1]: 0.9 },
}

// ─── Adjacence (bonus si voisin complémentaire) ────────────

const ADJACENCY_BOOST: Record<Sector, Sector[]> = {
  mode: ['beaute', 'bijouterie', 'services'],
  restauration: ['loisirs', 'enfants', 'mode'],
  beaute: ['mode', 'bijouterie'],
  loisirs: ['restauration', 'enfants'],
  enfants: ['restauration', 'loisirs', 'mode'],
  alimentaire: ['services', 'sante'],
  services: ['mode', 'alimentaire', 'sante'],
  electronique: ['sport', 'maison'],
  sport: ['enfants', 'sante', 'electronique'],
  bijouterie: ['mode', 'beaute'],
  maison: ['electronique', 'sport'],
  sante: ['services', 'beaute'],
}

// ─── Loyers FCFA/m²/mois par secteur (Abidjan médian) ──────

const BASE_RENT_FCFA_M2_MONTH: Record<Sector, number> = {
  restauration: 35_000,
  mode: 25_000,
  bijouterie: 45_000,
  beaute: 28_000,
  electronique: 22_000,
  services: 15_000,
  sport: 18_000,
  enfants: 20_000,
  sante: 16_000,
  maison: 14_000,
  loisirs: 8_000,
  alimentaire: 6_000,
}

// ─── Scoring helpers ───────────────────────────────────────

function sizeFitScore(areaSqm: number, sector: Sector): number {
  const ideal = IDEAL_AREA_BY_SECTOR[sector]
  if (areaSqm >= ideal.min && areaSqm <= ideal.max) {
    // score = 1 si exactement médian, diminue aux extrêmes
    const dist = Math.abs(areaSqm - ideal.median) / (ideal.max - ideal.min)
    return 1 - dist * 0.5
  }
  if (areaSqm < ideal.min) return Math.max(0, areaSqm / ideal.min)
  return Math.max(0, 1 - (areaSqm - ideal.max) / (ideal.max * 2))
}

function gapToIdealMix(
  currentMix: Record<string, number>, // % GLA par catégorie
  _totalGlaSqm: number,
): Record<string, number> {
  const gaps: Record<string, number> = {}
  const sectors: Array<{ name: string; target: number }> = [
    { name: 'mode', target: 35 },
    { name: 'restauration', target: 15 },
    { name: 'services', target: 10 },
    { name: 'loisirs', target: 10 },
    { name: 'alimentaire', target: 20 },
  ]
  for (const s of sectors) {
    const current = currentMix[s.name] ?? 0
    gaps[s.name] = Math.max(0, s.target - current) // % manquant
  }
  return gaps
}

// ─── Main recommender ─────────────────────────────────────

export interface RecommenderInput {
  targetLot: Lot
  neighboringLots?: Lot[] // lots adjacents (pour adjacency boost)
  currentMix?: Record<string, number> // % par catégorie (depuis commercialEngine)
  totalGlaSqm?: number
}

export function recommendMix(input: RecommenderInput): MixRecommendation {
  const lot = input.targetLot
  const sectors = Object.keys(BASE_RENT_FCFA_M2_MONTH) as Sector[]
  const mixGaps = input.currentMix ? gapToIdealMix(input.currentMix, input.totalGlaSqm ?? 0) : {}

  const neighborSectors = new Set<Sector>()
  for (const n of input.neighboringLots ?? []) {
    const cat = (n.commercial?.category ?? '') as Sector
    if (cat) neighborSectors.add(cat)
  }

  const scores: Array<{ sector: Sector; score: number; reasons: string[] }> = sectors.map(sector => {
    const reasons: string[] = []
    let score = 0

    // 1. Taille (40% du poids)
    const sizeFit = sizeFitScore(lot.areaSqm, sector)
    score += sizeFit * 0.4
    if (sizeFit > 0.7) reasons.push(`Taille ${lot.areaSqm.toFixed(0)}m² idéale pour ${sector}`)

    // 2. Étage (25%)
    const floorFit = FLOOR_AFFINITY[sector]?.[lot.floorLevel] ?? 0.5
    score += floorFit * 0.25
    if (floorFit >= 0.9) reasons.push(`Étage ${lot.floorLevel} recommandé pour ${sector}`)

    // 3. Gap mix (20%)
    const gap = mixGaps[sector] ?? 0
    const gapScore = Math.min(1, gap / 15) // 15 points de gap = max
    score += gapScore * 0.2
    if (gap > 5) reasons.push(`Mix actuel déficitaire en ${sector} (-${gap.toFixed(1)}%)`)

    // 4. Adjacence (15%)
    const boosts = ADJACENCY_BOOST[sector] ?? []
    const adjMatch = boosts.filter(b => neighborSectors.has(b)).length
    const adjScore = Math.min(1, adjMatch / 2)
    score += adjScore * 0.15
    if (adjMatch >= 1) reasons.push(`Complémentaire avec voisins (${adjMatch} matches)`)

    return { sector, score, reasons }
  })

  scores.sort((a, b) => b.score - a.score)
  const top = scores[0]

  return {
    lotId: lot.id as string,
    recommendedSector: top.sector,
    confidence: top.score,
    reasoning: top.reasons,
    estimatedRentFcfaM2Month: BASE_RENT_FCFA_M2_MONTH[top.sector],
    alternatives: scores.slice(1, 4).map(s => ({ sector: s.sector, confidence: s.score })),
  }
}

/** Recommandations pour tout un portfolio. */
export function recommendMixForPortfolio(lots: Lot[]): MixRecommendation[] {
  // Calcul mix actuel
  const bySector: Record<string, number> = {}
  let totalGla = 0
  for (const l of lots) {
    const cat = l.commercial?.category
    if (!cat) continue
    bySector[cat] = (bySector[cat] ?? 0) + l.areaSqm
    totalGla += l.areaSqm
  }
  const mix: Record<string, number> = {}
  for (const k of Object.keys(bySector)) {
    mix[k] = (bySector[k] / (totalGla || 1)) * 100
  }

  // Vacants uniquement
  const vacants = lots.filter(l => !l.commercial?.tenantId || l.commercial?.status === 'vacant')
  return vacants.map(lot => {
    const neighbors = lots
      .filter(other => other.id !== lot.id && other.floorLevel === lot.floorLevel)
      .slice(0, 5)
    return recommendMix({
      targetLot: lot,
      neighboringLots: neighbors,
      currentMix: mix,
      totalGlaSqm: totalGla,
    })
  })
}
