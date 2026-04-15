// ═══ AFRICAN RETAIL BENCHMARKS — Centres commerciaux Afrique de l'Ouest (M20) ═══
// Références de marché pour comparer un projet aux standards régionaux.
// Sources : Sagaci Research 2024, Knight Frank Africa Retail, Jumia Mall Report,
// SYSCOHADA Zone UEMOA retail, études CFAO / Prosuma / Mercure.

export interface MarketBenchmark {
  /** Libellé de la métrique. */
  metric: string
  /** Valeur médiane observée. */
  median: number
  /** Quartiles 25 / 75. */
  q25?: number
  q75?: number
  /** Unité (FCFA/m²/an, %, etc.). */
  unit: string
  /** Zone géographique (Abidjan, Dakar, Lagos, régional…). */
  region: string
  /** Note contextuelle. */
  note?: string
}

export interface GlaBand {
  /** Tranche de surface GLA (m²). */
  minSqm: number
  maxSqm: number
  /** Catégorie de centre. */
  kind: 'proximite' | 'quartier' | 'communautaire' | 'regional' | 'super-regional'
  /** Zone de chalandise en km. */
  catchmentKm: [number, number]
  /** Nombre indicatif d'enseignes. */
  storeCount: [number, number]
}

/** Tranches GLA standards retail en Afrique de l'Ouest. */
export const GLA_BANDS: GlaBand[] = [
  { minSqm: 0, maxSqm: 5_000, kind: 'proximite', catchmentKm: [0, 3], storeCount: [5, 30] },
  { minSqm: 5_000, maxSqm: 15_000, kind: 'quartier', catchmentKm: [2, 8], storeCount: [30, 80] },
  { minSqm: 15_000, maxSqm: 40_000, kind: 'communautaire', catchmentKm: [5, 15], storeCount: [60, 150] },
  { minSqm: 40_000, maxSqm: 80_000, kind: 'regional', catchmentKm: [10, 25], storeCount: [120, 250] },
  { minSqm: 80_000, maxSqm: Infinity, kind: 'super-regional', catchmentKm: [15, 40], storeCount: [200, 400] },
]

/** Benchmarks principaux Abidjan / Dakar / Lagos. */
export const WEST_AFRICA_BENCHMARKS: MarketBenchmark[] = [
  {
    metric: 'Loyer moyen boutique',
    median: 25_000,
    q25: 15_000, q75: 45_000,
    unit: 'FCFA/m²/mois',
    region: 'Abidjan CBD',
    note: 'Plateau / Cocody — galeries premium',
  },
  {
    metric: 'Loyer moyen boutique',
    median: 12_000,
    q25: 8_000, q75: 20_000,
    unit: 'FCFA/m²/mois',
    region: 'Abidjan périphérie',
    note: 'Marcory, Yopougon, Abobo',
  },
  {
    metric: 'Loyer ancre',
    median: 6_000,
    q25: 3_500, q75: 9_500,
    unit: 'FCFA/m²/mois',
    region: 'Abidjan',
    note: 'Carrefour, Shoprite, Marina Market',
  },
  {
    metric: 'Loyer restauration food court',
    median: 35_000,
    q25: 22_000, q75: 60_000,
    unit: 'FCFA/m²/mois',
    region: 'Abidjan',
  },
  {
    metric: 'Taux d\'occupation stabilisé',
    median: 88,
    q25: 75, q75: 94,
    unit: '%',
    region: 'Afrique de l\'Ouest',
    note: 'Après 24 mois d\'exploitation',
  },
  {
    metric: 'Charges communes (CAM)',
    median: 3_500,
    q25: 2_500, q75: 5_500,
    unit: 'FCFA/m²/mois',
    region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Cap rate stabilisé',
    median: 9.5,
    q25: 8.0, q75: 12.0,
    unit: '%',
    region: 'Afrique de l\'Ouest',
    note: 'Knight Frank 2024',
  },
  {
    metric: 'WALE cible',
    median: 4.5,
    q25: 3.0, q75: 6.5,
    unit: 'années',
    region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Mix enseignes — Mode',
    median: 35, q25: 25, q75: 45,
    unit: '% GLA', region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Mix enseignes — Restauration',
    median: 15, q25: 10, q75: 20,
    unit: '% GLA', region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Mix enseignes — Services',
    median: 10, q25: 5, q75: 15,
    unit: '% GLA', region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Mix enseignes — Alimentaire (ancre)',
    median: 20, q25: 15, q75: 30,
    unit: '% GLA', region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Fréquentation (footfall) annuel',
    median: 3_500_000,
    q25: 1_500_000, q75: 7_000_000,
    unit: 'visiteurs',
    region: 'Centre régional 30-50k m²',
  },
  {
    metric: 'Panier moyen',
    median: 18_000,
    q25: 9_500, q75: 32_000,
    unit: 'FCFA', region: 'Afrique de l\'Ouest',
  },
  {
    metric: 'Densité caméras',
    median: 1,
    q25: 0.7, q75: 1.5,
    unit: 'caméra/100 m² GLA',
    region: 'Afrique de l\'Ouest',
    note: 'Hors réserves / parking',
  },
  {
    metric: 'Densité signalétique',
    median: 1,
    q25: 0.5, q75: 1.5,
    unit: 'panneau/100 m² circulation',
    region: 'Afrique de l\'Ouest',
  },
]

// ─── Helpers de comparaison ─────────────────────────────────

/** Classifie une GLA dans une tranche standard. */
export function classifyMall(glaSqm: number): GlaBand | null {
  return GLA_BANDS.find(b => glaSqm >= b.minSqm && glaSqm < b.maxSqm) ?? null
}

/** Compare une valeur à un benchmark. Retourne un z-score approximatif et verdict. */
export function compareToBenchmark(
  value: number,
  benchmark: MarketBenchmark,
): { verdict: 'below-q25' | 'in-range' | 'above-q75' | 'unknown'; gap: number } {
  if (benchmark.q25 === undefined || benchmark.q75 === undefined) {
    return { verdict: 'unknown', gap: value - benchmark.median }
  }
  if (value < benchmark.q25) return { verdict: 'below-q25', gap: value - benchmark.q25 }
  if (value > benchmark.q75) return { verdict: 'above-q75', gap: value - benchmark.q75 }
  return { verdict: 'in-range', gap: 0 }
}

/** Trouve les benchmarks pertinents pour une métrique donnée. */
export function findBenchmarks(metricPattern: string): MarketBenchmark[] {
  const re = new RegExp(metricPattern, 'i')
  return WEST_AFRICA_BENCHMARKS.filter(b => re.test(b.metric))
}
