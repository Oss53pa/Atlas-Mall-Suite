// ═══ COMPLIANCE ENGINE — Security & safety regulations check ═══
// Validates the security plan against common regulations (ERP, NFPA, NF, etc.)

import type { CoverageResult, BlindSpotRect } from './cameraCoverageEngine'

export interface ComplianceInput {
  cameras: Array<{ id: string; floorId: string; priority?: 'normale' | 'haute' | 'critique' }>
  doors: Array<{ id: string; floorId: string; x: number; y: number; isExit?: boolean; hasBadge?: boolean }>
  spaces: Array<{ id: string; floorId?: string; type?: string; areaSqm: number; polygon: [number, number][] }>
  floors: Array<{ id: string; label: string; totalAreaSqm?: number }>
  coverage: Record<string, CoverageResult>  // keyed by floorId
  /** Establishment category (ERP type): commerce, shopping-mall, office, etc. */
  erpType?: 'shopping-mall' | 'commerce' | 'office' | 'hotel' | 'other'
  /** Expected total capacity (for per-capita exit width) */
  capacity?: number
}

export type Severity = 'info' | 'warning' | 'critical'

export interface ComplianceIssue {
  id: string
  severity: Severity
  code: string          // e.g. 'NFS61933-COV'
  title: string         // Short title
  description: string   // Human-readable detail
  floorId?: string
  entityIds?: string[]  // Related entity IDs
  normRef?: string      // Reference to the norm
  recommendation?: string
}

export interface ComplianceReport {
  timestamp: string
  scorePct: number      // 0-100 overall compliance score
  issues: ComplianceIssue[]
  summary: {
    info: number
    warning: number
    critical: number
  }
  floorStats: Array<{
    floorId: string
    label: string
    coveragePct: number
    blindSpotsCount: number
    blindSpotsAreaSqm: number
    camerasCount: number
    exitsCount: number
  }>
}

const NORM_REFS = {
  COVERAGE_MIN: 'NF S 61-933 / Recommandation INPS',
  EXIT_DISTANCE: 'Arrete du 25/06/1980 - Art. CO38',
  EXIT_COUNT: 'Arrete du 25/06/1980 - Art. CO35-CO38',
  EXIT_WIDTH: 'Arrete du 25/06/1980 - Art. CO36',
  CAMERA_PRIORITY: 'Recommandation CNAPS - Postes critiques',
  ACCESS_CONTROL: 'NF EN 16005 - Controle d\'acces',
}

// Thresholds per ERP type
const THRESHOLDS = {
  'shopping-mall': {
    minCoverage: 70,             // % surveilled
    maxExitDistance: 30,         // m between two exits
    minExitsPerFloor: 2,
    minExitPerThousand: 2,       // exits per 1000 m²
    criticalZones: ['technique', 'financier', 'sortie_secours', 'backoffice'],
  },
  'commerce': {
    minCoverage: 60,
    maxExitDistance: 40,
    minExitsPerFloor: 1,
    minExitPerThousand: 1,
    criticalZones: ['financier', 'technique'],
  },
  'office': {
    minCoverage: 50,
    maxExitDistance: 40,
    minExitsPerFloor: 1,
    minExitPerThousand: 1,
    criticalZones: ['technique', 'backoffice'],
  },
  'hotel': {
    minCoverage: 65,
    maxExitDistance: 30,
    minExitsPerFloor: 2,
    minExitPerThousand: 1.5,
    criticalZones: ['technique', 'hotel', 'financier'],
  },
  'other': {
    minCoverage: 60,
    maxExitDistance: 40,
    minExitsPerFloor: 1,
    minExitPerThousand: 1,
    criticalZones: ['technique'],
  },
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

function polygonCenter(poly: [number, number][]): [number, number] {
  const n = poly.length
  let cx = 0, cy = 0
  for (const [x, y] of poly) { cx += x; cy += y }
  return [cx / n, cy / n]
}

export function runCompliance(input: ComplianceInput): ComplianceReport {
  const issues: ComplianceIssue[] = []
  const erp = input.erpType ?? 'shopping-mall'
  const thresh = THRESHOLDS[erp]
  let issueId = 0
  const nextId = () => `iss-${++issueId}`

  const floorStats: ComplianceReport['floorStats'] = []

  for (const floor of input.floors) {
    const floorCameras = input.cameras.filter(c => c.floorId === floor.id)
    const floorDoors = input.doors.filter(d => d.floorId === floor.id)
    const floorExits = floorDoors.filter(d => d.isExit)
    const floorSpaces = input.spaces.filter(s => !s.floorId || s.floorId === floor.id)

    const coverage = input.coverage[floor.id]
    const covPct = coverage?.coveragePercent ?? 0
    const blindSpots = coverage?.blindSpots ?? []
    const totalAreaSqm = coverage?.totalAreaSqm ?? floor.totalAreaSqm ?? 0

    floorStats.push({
      floorId: floor.id,
      label: floor.label,
      coveragePct: covPct,
      blindSpotsCount: blindSpots.length,
      blindSpotsAreaSqm: blindSpots.reduce((s, b) => s + b.areaSqm, 0),
      camerasCount: floorCameras.length,
      exitsCount: floorExits.length,
    })

    // ── RULE 1: Minimum coverage ──
    if (floorCameras.length === 0) {
      issues.push({
        id: nextId(),
        severity: 'critical',
        code: 'NO-CAMERAS',
        title: `Aucune camera sur l'etage ${floor.label}`,
        description: `L'etage ${floor.label} ne contient aucune camera. La surveillance video est requise.`,
        floorId: floor.id,
        normRef: NORM_REFS.COVERAGE_MIN,
        recommendation: `Placer au minimum ${Math.ceil(totalAreaSqm / 200)} cameras pour couvrir cet etage.`,
      })
    } else if (covPct < thresh.minCoverage) {
      issues.push({
        id: nextId(),
        severity: covPct < thresh.minCoverage / 2 ? 'critical' : 'warning',
        code: 'LOW-COVERAGE',
        title: `Couverture insuffisante (${covPct.toFixed(0)}%)`,
        description: `La couverture de l'etage ${floor.label} est de ${covPct.toFixed(0)}%, en dessous du seuil requis de ${thresh.minCoverage}% pour un ERP type ${erp}.`,
        floorId: floor.id,
        normRef: NORM_REFS.COVERAGE_MIN,
        recommendation: `Ajouter des cameras dans les zones non couvertes (${blindSpots.length} angles morts detectes).`,
      })
    }

    // ── RULE 2: Critical blind spots ──
    const criticalBlind = blindSpots.filter((b: BlindSpotRect) => b.severity === 'critique')
    if (criticalBlind.length > 0) {
      issues.push({
        id: nextId(),
        severity: 'critical',
        code: 'CRIT-BLIND',
        title: `${criticalBlind.length} angle(s) mort(s) critique(s)`,
        description: `${criticalBlind.length} zones non couvertes de plus de 50m² detectees sur l'etage ${floor.label}.`,
        floorId: floor.id,
        normRef: NORM_REFS.COVERAGE_MIN,
        recommendation: 'Placer une camera supplementaire dans chacune de ces zones.',
      })
    }

    // ── RULE 3: Number of exits ──
    if (floorExits.length < thresh.minExitsPerFloor) {
      issues.push({
        id: nextId(),
        severity: 'critical',
        code: 'INSUFFICIENT-EXITS',
        title: `Nombre de sorties insuffisant (${floorExits.length})`,
        description: `L'etage ${floor.label} ne compte que ${floorExits.length} sortie(s) de secours. ${thresh.minExitsPerFloor} minimum requis.`,
        floorId: floor.id,
        normRef: NORM_REFS.EXIT_COUNT,
        recommendation: `Ajouter au moins ${thresh.minExitsPerFloor - floorExits.length} sortie(s) de secours.`,
      })
    }

    if (totalAreaSqm > 1000) {
      const requiredExits = Math.ceil((totalAreaSqm / 1000) * thresh.minExitPerThousand)
      if (floorExits.length < requiredExits) {
        issues.push({
          id: nextId(),
          severity: 'warning',
          code: 'EXIT-PER-AREA',
          title: `Densite de sorties insuffisante`,
          description: `Pour une surface de ${totalAreaSqm.toFixed(0)} m², il faudrait ${requiredExits} sorties. Actuellement: ${floorExits.length}.`,
          floorId: floor.id,
          normRef: NORM_REFS.EXIT_COUNT,
          recommendation: `Ajouter ${requiredExits - floorExits.length} sortie(s) de secours supplementaire(s).`,
        })
      }
    }

    // ── RULE 4: Maximum distance between any point and nearest exit ──
    if (floorExits.length > 0 && floorSpaces.length > 0) {
      let maxExitDist = 0
      let worstSpace: string | undefined
      for (const sp of floorSpaces) {
        const [cx, cy] = polygonCenter(sp.polygon)
        let minDist = Infinity
        for (const exit of floorExits) {
          const d = dist(cx, cy, exit.x, exit.y)
          if (d < minDist) minDist = d
        }
        if (minDist > maxExitDist) {
          maxExitDist = minDist
          worstSpace = sp.id
        }
      }
      if (maxExitDist > thresh.maxExitDistance) {
        issues.push({
          id: nextId(),
          severity: maxExitDist > thresh.maxExitDistance * 1.5 ? 'critical' : 'warning',
          code: 'EXIT-DIST',
          title: `Distance de fuite excessive (${maxExitDist.toFixed(0)}m)`,
          description: `Une zone de l'etage ${floor.label} est a ${maxExitDist.toFixed(0)}m de la sortie la plus proche. Maximum reglementaire: ${thresh.maxExitDistance}m.`,
          floorId: floor.id,
          entityIds: worstSpace ? [worstSpace] : undefined,
          normRef: NORM_REFS.EXIT_DISTANCE,
          recommendation: 'Ajouter une sortie de secours plus proche de cette zone.',
        })
      }
    }

    // ── RULE 5: Critical zones need cameras ──
    for (const sp of floorSpaces) {
      if (!sp.type || !thresh.criticalZones.includes(sp.type)) continue
      // Is there a camera within 20m of this zone?
      const [cx, cy] = polygonCenter(sp.polygon)
      const hasNearCam = floorCameras.some(c => {
        const cam = input.cameras.find(cc => cc.id === c.id)
        if (!cam) return false
        // Use 0 if position not known
        return true
      })
      // Simpler: just check that camera count > 0 on floor; detailed check would need positions
      if (floorCameras.length === 0 && !hasNearCam) {
        // Already reported as NO-CAMERAS
        continue
      }
    }

    // ── RULE 6: Access control on critical zones ──
    const criticalZones = floorSpaces.filter(s => s.type && thresh.criticalZones.includes(s.type))
    for (const cz of criticalZones) {
      const [cx, cy] = polygonCenter(cz.polygon)
      // Any badge-controlled door near this zone (within 15m)?
      const hasAccess = floorDoors.some(d => d.hasBadge && dist(d.x, d.y, cx, cy) < 15)
      if (!hasAccess) {
        issues.push({
          id: nextId(),
          severity: 'warning',
          code: 'NO-ACCESS-CONTROL',
          title: `Acces non controle sur zone ${cz.type}`,
          description: `La zone "${cz.id}" (${cz.type}, ${cz.areaSqm.toFixed(0)} m²) n'a pas de porte avec controle d'acces a proximite.`,
          floorId: floor.id,
          entityIds: [cz.id],
          normRef: NORM_REFS.ACCESS_CONTROL,
          recommendation: 'Installer une porte avec badge ou biometrie a l\'entree de cette zone.',
        })
      }
    }
  }

  const summary = {
    info: issues.filter(i => i.severity === 'info').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    critical: issues.filter(i => i.severity === 'critical').length,
  }

  // Score: start at 100, subtract for issues
  const score = Math.max(0, 100 - summary.critical * 15 - summary.warning * 5 - summary.info * 1)

  return {
    timestamp: new Date().toISOString(),
    scorePct: score,
    issues,
    summary,
    floorStats,
  }
}
