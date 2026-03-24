// ═══ REPORT GENERATOR — Types ═══

export interface NarrativeSection {
  title: string
  content: string
  level: 1 | 2 | 3
}

export interface NarrativeReport {
  title: string
  subtitle: string
  generatedAt: string
  sections: NarrativeSection[]
  executiveSummary: string
  totalPages: number
}

export interface ReportConfig {
  useClaudeAPI: boolean
  language: 'fr'
  includeExecutiveSummary: boolean
  includeRecommendations: boolean
  includeBudget: boolean
  includeBenchmark: boolean
}
