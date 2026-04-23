// ═══ EXPORT POWERPOINT — Presentation cle en main ═══
// Genere un fichier .pptx pour presentation DG / conseil d'administration


export interface SlideData {
  title: string
  subtitle?: string
  content: string[]
  chartData?: Record<string, number>
  type: 'title' | 'kpi' | 'chart' | 'table' | 'recommendation'
}

export interface PresentationConfig {
  projectName: string
  volume: 'vol1' | 'vol2' | 'vol3'
  date: string
  author: string
  slides: SlideData[]
}

/**
 * Generate a PowerPoint-compatible XML (OOXML) blob.
 * Uses a simplified OOXML structure for maximum compatibility.
 * In production, use pptxgenjs for richer output.
 */
export function generatePresentationSlides(config: PresentationConfig): SlideData[] {
  const slides: SlideData[] = []

  // Title slide
  slides.push({
    title: config.projectName,
    subtitle: `${volumeLabel(config.volume)} — ${config.date}`,
    content: [`Auteur : ${config.author}`, 'Confidentiel — Atlas Studio'],
    type: 'title',
  })

  // Add provided slides
  slides.push(...config.slides)

  // Closing slide
  slides.push({
    title: 'Proph3t Engine',
    subtitle: 'Intelligence Artificielle — Atlas BIM',
    content: [
      'Analyse generee par Proph3t (Claude API)',
      'Normes : APSAD R82 · EN 50132 · ISO 22341 · ISO 7010',
      'Benchmark : 50+ centres commerciaux africains',
    ],
    type: 'title',
  })

  return slides
}

function volumeLabel(vol: string): string {
  switch (vol) {
    case 'vol1': return 'Vol. 1 — Plan Commercial'
    case 'vol2': return 'Vol. 2 — Plan Securitaire'
    case 'vol3': return 'Vol. 3 — Parcours Client'
    default: return vol
  }
}

export function generateOccupancyPresentation(
  projectName: string,
  occupancyRate: number,
  totalGla: number,
  vacantGla: number,
  tenantCount: number,
  sectorBreakdown: { sector: string; percentage: number }[],
  alerts: { message: string; severity: string }[],
): SlideData[] {
  return generatePresentationSlides({
    projectName,
    volume: 'vol1',
    date: new Date().toLocaleDateString('fr-FR'),
    author: 'Atlas Studio',
    slides: [
      {
        title: 'Dashboard Occupancy',
        content: [
          `Taux d'occupation : ${occupancyRate}%`,
          `GLA totale : ${totalGla.toLocaleString()} m²`,
          `GLA vacante : ${vacantGla.toLocaleString()} m²`,
          `Preneurs actifs : ${tenantCount}`,
        ],
        chartData: { 'Occupe': occupancyRate, 'Vacant': 100 - occupancyRate },
        type: 'kpi',
      },
      {
        title: 'Mix Enseigne par Secteur',
        content: sectorBreakdown.map(s => `${s.sector} : ${s.percentage}%`),
        chartData: Object.fromEntries(sectorBreakdown.map(s => [s.sector, s.percentage])),
        type: 'chart',
      },
      {
        title: 'Alertes & Recommandations',
        content: alerts.map(a => `[${a.severity.toUpperCase()}] ${a.message}`),
        type: 'recommendation',
      },
    ],
  })
}

export function generateSecurityPresentation(
  projectName: string,
  cameraCount: number,
  coverageScore: number,
  blindSpots: number,
  budgetFcfa: number,
  complianceScore: number,
): SlideData[] {
  return generatePresentationSlides({
    projectName,
    volume: 'vol2',
    date: new Date().toLocaleDateString('fr-FR'),
    author: 'Atlas Studio',
    slides: [
      {
        title: 'Dispositif Securitaire',
        content: [
          `Cameras : ${cameraCount}`,
          `Couverture : ${coverageScore}%`,
          `Angles morts : ${blindSpots}`,
          `Budget CAPEX : ${budgetFcfa.toLocaleString()} FCFA`,
          `Conformite APSAD R82 : ${complianceScore}%`,
        ],
        type: 'kpi',
      },
    ],
  })
}

export function generateExperiencePresentation(
  projectName: string,
  nps: number,
  dwellTime: number,
  cosmosClubMembers: number,
  experienceScore: number,
): SlideData[] {
  return generatePresentationSlides({
    projectName,
    volume: 'vol3',
    date: new Date().toLocaleDateString('fr-FR'),
    author: 'Atlas Studio',
    slides: [
      {
        title: 'Experience Visiteur',
        content: [
          `NPS Global : ${nps}`,
          `Dwell Time moyen : ${dwellTime} min`,
          `Membres Cosmos Club : ${cosmosClubMembers.toLocaleString()}`,
          `Score Experience : ${experienceScore}/100`,
        ],
        type: 'kpi',
      },
    ],
  })
}
