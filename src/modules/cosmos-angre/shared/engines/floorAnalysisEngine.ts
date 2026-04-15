// ═══ FLOOR ANALYSIS ENGINE — Multi-volet per-floor synthesis ═══
// Aggregates Vol.1 (Commercial), Vol.2 (Securitaire), Vol.3 (Parcours)
// analyses per detected floor and produces a unified per-level report.

import { runCompliance, type ComplianceReport } from './complianceEngine'
import { computeCoverage, type CoverageResult, type Camera as CovCamera, type Space as CovSpace } from './cameraCoverageEngine'
import { runCommercialAnalysis, type CommercialReport, type CommercialSpace, type Tenant } from './commercialEngine'
import { runParcoursAnalysis, type ParcoursReport, type POI, type SignageItem, type JourneyMoment, type SpaceForParcours } from './parcoursEngine'

export interface FloorDef {
  id: string
  label: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number }
  stackOrder: number
}

export interface PerFloorVolumeScore {
  floorId: string
  floorLabel: string
  securitaire: {
    score: number
    coveragePct: number
    camerasCount: number
    exitsCount: number
    blindSpotsCount: number
    criticalIssues: number
  }
  commercial: {
    score: number
    gla: number
    occupancyPct: number
    vacantCount: number
    anchorCount: number
    monthlyRevenue: number
  }
  parcours: {
    score: number
    poisCount: number
    signageCount: number
    momentsCount: number
    wayfindingScore: number
    accessibilityPct: number
  }
  globalScore: number
  priorities: Array<{ volume: 'sec' | 'com' | 'par'; severity: 'info' | 'warning' | 'critical'; title: string }>
}

export interface GlobalAnalysis {
  timestamp: string
  floors: PerFloorVolumeScore[]
  overall: {
    securitaire: number
    commercial: number
    parcours: number
    global: number
  }
  topPriorities: Array<{ volume: 'sec' | 'com' | 'par'; floorId: string; severity: 'info' | 'warning' | 'critical'; title: string }>
}

export interface AnalysisInput {
  floors: FloorDef[]
  planBounds: { width: number; height: number }
  // Vol.2
  cameras: CovCamera[]
  doors: Array<{ id: string; floorId: string; x: number; y: number; isExit?: boolean; hasBadge?: boolean }>
  // Vol.1
  commercialSpaces: CommercialSpace[]
  tenants: Tenant[]
  // Vol.3
  pois: POI[]
  signage: SignageItem[]
  moments: JourneyMoment[]
  // Shared
  spaces: Array<CovSpace & { label: string; type?: string; areaSqm: number; polygon: [number, number][]; floorId?: string }>
}

export function runGlobalAnalysis(input: AnalysisInput): GlobalAnalysis {
  const perFloor: PerFloorVolumeScore[] = []

  for (const floor of input.floors) {
    // Vol.2 — coverage + compliance
    const coverage = computeCoverage(input.cameras, input.spaces, floor.id, input.planBounds)
    const coverageMap: Record<string, CoverageResult> = { [floor.id]: coverage }
    const secFloor = { id: floor.id, label: floor.label, totalAreaSqm: coverage.totalAreaSqm || floor.bounds.width * floor.bounds.height }
    const compliance = runCompliance({
      cameras: input.cameras,
      doors: input.doors,
      spaces: input.spaces.map(s => ({ id: s.id, floorId: s.floorId, type: s.type, areaSqm: s.areaSqm, polygon: s.polygon })),
      floors: [secFloor],
      coverage: coverageMap,
      erpType: 'shopping-mall',
    })

    // Vol.1 — commercial
    const floorSpaces = input.commercialSpaces.filter(s => !s.floorId || s.floorId === floor.id)
    const commercial = runCommercialAnalysis(floorSpaces, input.tenants)

    // Vol.3 — parcours
    const floorPois = input.pois.filter(p => p.floorId === floor.id)
    const floorSigns = input.signage.filter(s => s.floorId === floor.id)
    const floorMoments = input.moments.filter(m => m.floorId === floor.id)
    const floorParcoursSpaces: SpaceForParcours[] = input.spaces
      .filter(s => !s.floorId || s.floorId === floor.id)
      .map(s => ({
        id: s.id, floorId: s.floorId, type: s.type,
        polygon: s.polygon, areaSqm: s.areaSqm, label: s.label,
      }))
    const parcours = runParcoursAnalysis({
      pois: floorPois,
      signage: floorSigns,
      moments: floorMoments,
      spaces: floorParcoursSpaces,
      floors: [{ id: floor.id, label: floor.label, areaSqm: coverage.totalAreaSqm }],
    })

    // Aggregate priorities
    const priorities: PerFloorVolumeScore['priorities'] = []
    for (const i of compliance.issues) {
      if (i.severity !== 'info') {
        priorities.push({ volume: 'sec', severity: i.severity, title: i.title })
      }
    }
    for (const i of commercial.issues) {
      if (i.severity !== 'info') {
        priorities.push({ volume: 'com', severity: i.severity, title: i.title })
      }
    }
    for (const i of parcours.issues) {
      if (i.severity !== 'info') {
        priorities.push({ volume: 'par', severity: i.severity, title: i.title })
      }
    }

    const floorSec = compliance.floorStats[0] ?? { coveragePct: 0, camerasCount: 0, exitsCount: 0, blindSpotsCount: 0, blindSpotsAreaSqm: 0 }
    const globalScore = Math.round(
      compliance.scorePct * 0.4 +
      commercial.scorePct * 0.35 +
      parcours.scorePct * 0.25
    )

    perFloor.push({
      floorId: floor.id,
      floorLabel: floor.label,
      securitaire: {
        score: compliance.scorePct,
        coveragePct: floorSec.coveragePct,
        camerasCount: floorSec.camerasCount,
        exitsCount: floorSec.exitsCount,
        blindSpotsCount: floorSec.blindSpotsCount,
        criticalIssues: compliance.summary.critical,
      },
      commercial: {
        score: commercial.scorePct,
        gla: commercial.totalSurfaceSqm,
        occupancyPct: commercial.occupancy.occupiedPct,
        vacantCount: commercial.occupancy.vacant,
        anchorCount: commercial.anchors.count,
        monthlyRevenue: commercial.monthlyRevenueFcfa,
      },
      parcours: {
        score: parcours.scorePct,
        poisCount: parcours.totals.pois,
        signageCount: parcours.totals.signage,
        momentsCount: parcours.totals.moments,
        wayfindingScore: parcours.wayfindingScore,
        accessibilityPct: parcours.accessibility.accessiblePct,
      },
      globalScore,
      priorities: priorities.slice(0, 5),
    })
  }

  const overall = {
    securitaire: Math.round(perFloor.reduce((s, f) => s + f.securitaire.score, 0) / (perFloor.length || 1)),
    commercial: Math.round(perFloor.reduce((s, f) => s + f.commercial.score, 0) / (perFloor.length || 1)),
    parcours: Math.round(perFloor.reduce((s, f) => s + f.parcours.score, 0) / (perFloor.length || 1)),
    global: Math.round(perFloor.reduce((s, f) => s + f.globalScore, 0) / (perFloor.length || 1)),
  }

  // Global top priorities
  const allPriorities: GlobalAnalysis['topPriorities'] = []
  for (const fl of perFloor) {
    for (const p of fl.priorities) {
      allPriorities.push({ volume: p.volume, floorId: fl.floorId, severity: p.severity, title: p.title })
    }
  }
  // Sort by severity (critical first), limit to 10
  allPriorities.sort((a, b) => {
    const sev = (s: typeof a.severity) => s === 'critical' ? 0 : s === 'warning' ? 1 : 2
    return sev(a.severity) - sev(b.severity)
  })

  return {
    timestamp: new Date().toISOString(),
    floors: perFloor,
    overall,
    topPriorities: allPriorities.slice(0, 10),
  }
}
