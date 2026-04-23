// ═══ VERTICALS — Types & config par type de bâtiment ═══
//
// Atlas BIM est un jumeau numérique générique de bâtiments. Chaque projet
// déclare une `verticalId` qui change :
//   • Le vocabulaire UI (boutique ↔ chambre ↔ bureau ↔ salle…)
//   • Les benchmarks (ICSC pour mall, STR pour hôtel, BOMA pour bureaux…)
//   • Les KPIs principaux (CA/m² vs RevPAR vs occupation vs actes/jour)
//   • Les normes réglementaires (ERP M pour mall, ERP O pour hôtel, ERP N/S pour santé…)
//   • Les catégories d'espaces pertinentes
//   • Les prompts Proph3t spécialisés

export type VerticalId =
  | 'mall'
  | 'hotel'
  | 'office'
  | 'hospital'
  | 'campus'
  | 'industrial'
  | 'erp-public'
  | 'multi-site'

export interface VerticalBenchmark {
  /** Nom du benchmark de référence. */
  source: string
  /** Panel (nombre de bâtiments comparables). */
  panelSize?: number
  /** Région couverte. */
  region: string
  /** Année de référence. */
  year: number
}

export interface VerticalKpi {
  id: string
  label: string
  unit: string
  /** Benchmark médian. */
  benchmark?: number
  /** Objectif cible. */
  target?: number
  /** Couleur d'affichage. */
  color?: string
}

export interface VerticalNorm {
  code: string
  label: string
  reference?: string
  /** Domaine couvert. */
  domain: 'security' | 'accessibility' | 'signage' | 'hygiene' | 'fire' | 'labor' | 'financial'
}

export interface VerticalConfig {
  id: VerticalId
  /** Nom affichable en français. */
  label: string
  /** Icône emoji. */
  icon: string
  /** Description courte. */
  description: string
  /** Couleur principale (hex). */
  color: string

  /** Benchmarks sectoriels. */
  benchmarks: VerticalBenchmark[]
  /** KPIs prioritaires affichés dans les dashboards. */
  primaryKpis: VerticalKpi[]
  /** Normes réglementaires applicables. */
  norms: VerticalNorm[]

  /** Classification ERP (si applicable). */
  erpCategory?: 'M' | 'N' | 'O' | 'L' | 'S' | 'R' | 'U' | 'W' | 'CTS' | 'mixed'

  /** Modules/volumes pertinents pour cette verticale (les autres peuvent être désactivés). */
  enabledVolumes: {
    operations: boolean   // Vol.1
    security: boolean     // Vol.2 (toujours true pour tout ERP)
    experience: boolean   // Vol.3
    wayfinder: boolean    // Vol.4
  }

  /** Exemples de projets réels pour les démos. */
  exampleProjects: Array<{
    name: string
    location: string
    areaSqm: number
    operator?: string
  }>
}
