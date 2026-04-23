// ═══ PROPH3T — Generateur de Rapports Mensuels ═══

export interface MonthlySecurityReport {
  month: string
  generatedAt: string
  kpis: {
    totalIncidents: number
    resolvedPercent: number
    avgResponseTimeSec: number
    cameraUptime: number
    coveragePercent: number
    evacuationDrills: number
    staffingCostFcfa: number
  }
  topIncidentTypes: { type: string; count: number }[]
  riskTrend: 'improving' | 'stable' | 'degrading'
  recommendations: string[]
  complianceScore: number
}

export interface MonthlyExperienceReport {
  month: string
  generatedAt: string
  kpis: {
    totalVisitors: number
    npsScore: number
    avgDwellTimeMin: number
    cosmosClubMembers: number
    newSignups: number
    churnRate: number
    touchpointsActive: number
    signageInstalled: number
  }
  topTouchpoints: { name: string; satisfaction: number }[]
  feedbackSummary: { positive: number; neutral: number; negative: number }
  recommendations: string[]
  openingReadiness: number
}

export function generateMonthlySecurityReport(month: string): MonthlySecurityReport {
  return {
    month,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalIncidents: 12 + Math.floor(Math.random() * 8),
      resolvedPercent: 87 + Math.floor(Math.random() * 10),
      avgResponseTimeSec: 140 + Math.floor(Math.random() * 60),
      cameraUptime: 97 + Math.random() * 2.5,
      coveragePercent: 92 + Math.floor(Math.random() * 6),
      evacuationDrills: 1,
      staffingCostFcfa: 4_200_000 + Math.floor(Math.random() * 800_000),
    },
    topIncidentTypes: [
      { type: 'Vol a l\'etalage', count: 5 },
      { type: 'Intrusion zone technique', count: 3 },
      { type: 'Altercation', count: 2 },
      { type: 'Malaise visiteur', count: 2 },
    ],
    riskTrend: 'improving',
    recommendations: [
      'Renforcer patrouilles parking B1 entre 20h et 6h',
      'Mettre a jour firmware cameras lot 3',
      'Planifier exercice evacuation Q2',
      'Former 2 nouveaux SST',
    ],
    complianceScore: 88 + Math.floor(Math.random() * 8),
  }
}

export function generateMonthlyExperienceReport(month: string): MonthlyExperienceReport {
  return {
    month,
    generatedAt: new Date().toISOString(),
    kpis: {
      totalVisitors: 95_000 + Math.floor(Math.random() * 20_000),
      npsScore: 52 + Math.floor(Math.random() * 15),
      avgDwellTimeMin: 62 + Math.floor(Math.random() * 20),
      cosmosClubMembers: 3_200 + Math.floor(Math.random() * 500),
      newSignups: 180 + Math.floor(Math.random() * 80),
      churnRate: 0.08 + Math.random() * 0.07,
      touchpointsActive: 13 + Math.floor(Math.random() * 2),
      signageInstalled: 115 + Math.floor(Math.random() * 16),
    },
    topTouchpoints: [
      { name: 'Borne interactive Hall', satisfaction: 4.5 },
      { name: 'Accueil Cosmos Club', satisfaction: 4.3 },
      { name: 'App mobile wayfinding', satisfaction: 4.1 },
      { name: 'Signalétique parking', satisfaction: 3.8 },
      { name: 'Toilettes publiques', satisfaction: 3.5 },
    ],
    feedbackSummary: { positive: 245, neutral: 82, negative: 38 },
    recommendations: [
      'Ameliorer signaletique parking B1 (satisfaction basse)',
      'Lancer campagne recrutement Cosmos Club tier Prestige',
      'Installer 2 bornes interactives supplementaires R+1',
      'Deployer QR codes satisfaction aux toilettes',
    ],
    openingReadiness: 74 + Math.floor(Math.random() * 15),
  }
}
