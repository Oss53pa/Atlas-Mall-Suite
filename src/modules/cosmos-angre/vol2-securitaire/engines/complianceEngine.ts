// ═══ COMPLIANCE ENGINE — Multi-norms regulatory validation ═══

import type { Camera, Door, Zone, Floor, TransitionNode } from '../../shared/proph3t/types'

// ── Types ────────────────────────────────────────────────────

export type NormId = 'apsad_r82' | 'en_62676' | 'iso_22341' | 'nf_s61' | 'ci_local'

export interface ComplianceGap {
  requirement: string
  current: string
  required: string
  severity: 'critique' | 'majeur' | 'mineur'
  correctionEstimateFcfa: number
  normRef: string
}

export interface ComplianceReport {
  norm: NormId
  normLabel: string
  score: number  // /100
  gaps: ComplianceGap[]
  compliantItems: string[]
  certificationReady: boolean
}

export interface FullComplianceResult {
  reports: ComplianceReport[]
  globalScore: number
  disclaimer: string
}

// ── Disclaimer ───────────────────────────────────────────────

const DISCLAIMER =
  'Ce rapport est etabli selon les recommandations APSAD R82 (France), ' +
  'utilisees comme reference professionnelle en l\'absence de normes ' +
  'ivoiriennes equivalentes publiees. Il ne remplace pas un audit ' +
  'certifie par un organisme agree.'

// ── APSAD R82 checks ─────────────────────────────────────────

function checkApsadR82(
  cameras: Camera[],
  doors: Door[],
  zones: Zone[],
  floors: Floor[]
): ComplianceReport {
  const gaps: ComplianceGap[] = []
  const compliant: string[] = []

  // R82 §3 — Camera count per zone type
  const exits = doors.filter((d) => d.isExit)
  if (exits.length < 3) {
    gaps.push({
      requirement: 'Minimum 3 sorties de secours couvertes',
      current: `${exits.length} sorties`,
      required: 'Minimum 3',
      severity: 'critique',
      correctionEstimateFcfa: (3 - exits.length) * 850_000,
      normRef: 'APSAD R82 §3.1',
    })
  } else {
    compliant.push('Nombre de sorties de secours conforme (§3.1)')
  }

  // R82 §4.1 — All exits must have camera coverage
  const uncoveredExits = exits.filter((exit) => {
    return !cameras.some(
      (c) => c.floorId === exit.floorId &&
        Math.abs(c.x - exit.x) < 30 && Math.abs(c.y - exit.y) < 30
    )
  })
  if (uncoveredExits.length > 0) {
    gaps.push({
      requirement: 'Chaque sortie de secours doit etre couverte par une camera',
      current: `${uncoveredExits.length} sortie(s) non couverte(s)`,
      required: 'Couverture 100%',
      severity: 'critique',
      correctionEstimateFcfa: uncoveredExits.length * 850_000,
      normRef: 'APSAD R82 §4.1',
    })
  } else if (exits.length > 0) {
    compliant.push('Toutes les sorties de secours couvertes (§4.1)')
  }

  // R82 §4.3 — Critical zones (N4/N5) must have cameras
  const criticalZones = zones.filter((z) => z.niveau >= 4)
  const uncoveredCritical = criticalZones.filter((z) => {
    return !cameras.some(
      (c) => c.floorId === z.floorId &&
        c.x >= z.x - 5 && c.x <= z.x + z.w + 5 &&
        c.y >= z.y - 5 && c.y <= z.y + z.h + 5
    )
  })
  if (uncoveredCritical.length > 0) {
    gaps.push({
      requirement: 'Les zones critiques (N4/N5) doivent avoir une couverture camera',
      current: `${uncoveredCritical.length} zone(s) critique(s) sans camera`,
      required: `Couverture des ${criticalZones.length} zones N4/N5`,
      severity: 'critique',
      correctionEstimateFcfa: uncoveredCritical.length * 850_000,
      normRef: 'APSAD R82 §4.3',
    })
  } else if (criticalZones.length > 0) {
    compliant.push(`${criticalZones.length} zones critiques couvertes (§4.3)`)
  }

  // R82 §5 — Camera density
  const totalSurface = zones.reduce((s, z) => s + (z.surfaceM2 ?? z.w * z.h), 0)
  const density = totalSurface > 0 ? (cameras.length / totalSurface) * 1000 : 0
  if (density < 0.8) {
    gaps.push({
      requirement: 'Densite minimale recommandee : 0.8 cameras / 1000 m²',
      current: `${density.toFixed(2)} cam/1000m²`,
      required: '>= 0.8 cam/1000m²',
      severity: 'majeur',
      correctionEstimateFcfa: Math.ceil((0.8 - density) * totalSurface / 1000) * 850_000,
      normRef: 'APSAD R82 §5',
    })
  } else {
    compliant.push(`Densite camera conforme: ${density.toFixed(2)} cam/1000m² (§5)`)
  }

  // R82 §6 — NVR redundancy
  if (cameras.length > 32) {
    compliant.push('Configuration NVR multi-voies requise (§6)')
  }

  // Score
  const maxGapPenalty = gaps.reduce((s, g) => {
    return s + (g.severity === 'critique' ? 25 : g.severity === 'majeur' ? 15 : 5)
  }, 0)
  const score = Math.max(0, Math.min(100, 100 - maxGapPenalty))

  return {
    norm: 'apsad_r82',
    normLabel: 'APSAD R82 — Videosurveillance',
    score,
    gaps,
    compliantItems: compliant,
    certificationReady: gaps.filter((g) => g.severity === 'critique').length === 0,
  }
}

// ── EN 62676 checks ──────────────────────────────────────────

function checkEN62676(cameras: Camera[], zones: Zone[]): ComplianceReport {
  const gaps: ComplianceGap[] = []
  const compliant: string[] = []

  // Check for identification-grade cameras at entrances
  const entranceZones = zones.filter((z) => z.type === 'circulation' && z.label.toLowerCase().includes('entr'))
  if (entranceZones.length > 0) {
    const entranceCams = cameras.filter((c) =>
      entranceZones.some(
        (z) => c.floorId === z.floorId && c.x >= z.x && c.x <= z.x + z.w && c.y >= z.y && c.y <= z.y + z.h
      )
    )
    if (entranceCams.length < entranceZones.length) {
      gaps.push({
        requirement: 'Camera d\'identification a chaque entree principale',
        current: `${entranceCams.length} cameras aux entrees`,
        required: `Minimum ${entranceZones.length} (1 par entree)`,
        severity: 'majeur',
        correctionEstimateFcfa: (entranceZones.length - entranceCams.length) * 1_200_000,
        normRef: 'EN 62676-4 §6.2',
      })
    } else {
      compliant.push('Cameras d\'identification aux entrees (EN 62676-4 §6.2)')
    }
  }

  // Check FOV adequacy
  const wideFov = cameras.filter((c) => c.fov >= 90)
  if (wideFov.length < cameras.length * 0.3) {
    gaps.push({
      requirement: '30% minimum de cameras grand angle (FOV >= 90°) pour vue d\'ensemble',
      current: `${wideFov.length} cameras grand angle (${Math.round(wideFov.length / Math.max(1, cameras.length) * 100)}%)`,
      required: '>= 30%',
      severity: 'mineur',
      correctionEstimateFcfa: 0,
      normRef: 'EN 62676-4 §7.1',
    })
  } else {
    compliant.push('Ratio cameras grand angle conforme (EN 62676-4 §7.1)')
  }

  const maxPenalty = gaps.reduce((s, g) => s + (g.severity === 'critique' ? 25 : g.severity === 'majeur' ? 15 : 5), 0)

  return {
    norm: 'en_62676',
    normLabel: 'EN 62676 — Systemes de videosurveillance',
    score: Math.max(0, 100 - maxPenalty),
    gaps,
    compliantItems: compliant,
    certificationReady: gaps.filter((g) => g.severity === 'critique').length === 0,
  }
}

// ── NF S 61-938 (Fire safety ERP type M) ─────────────────────

function checkNFS61(doors: Door[], zones: Zone[], transitions: TransitionNode[]): ComplianceReport {
  const gaps: ComplianceGap[] = []
  const compliant: string[] = []

  const exits = doors.filter((d) => d.isExit)
  if (exits.length < 3) {
    gaps.push({
      requirement: 'ERP type M : minimum 3 sorties de secours',
      current: `${exits.length} sorties`,
      required: 'Minimum 3',
      severity: 'critique',
      correctionEstimateFcfa: (3 - exits.length) * 1_500_000,
      normRef: 'NF S 61-938 §4',
    })
  } else {
    compliant.push(`${exits.length} sorties de secours (NF S 61-938 §4)`)
  }

  // Check emergency staircases
  const emergencyStairs = transitions.filter((t) => t.type === 'escalier_secours')
  if (emergencyStairs.length < 2) {
    gaps.push({
      requirement: 'Minimum 2 escaliers de secours pour evacuation multi-etages',
      current: `${emergencyStairs.length} escalier(s) de secours`,
      required: 'Minimum 2',
      severity: 'majeur',
      correctionEstimateFcfa: (2 - emergencyStairs.length) * 5_000_000,
      normRef: 'NF S 61-938 §6.3',
    })
  } else {
    compliant.push(`${emergencyStairs.length} escaliers de secours (NF S 61-938 §6.3)`)
  }

  const maxPenalty = gaps.reduce((s, g) => s + (g.severity === 'critique' ? 25 : g.severity === 'majeur' ? 15 : 5), 0)

  return {
    norm: 'nf_s61',
    normLabel: 'NF S 61-938 — Securite incendie ERP type M',
    score: Math.max(0, 100 - maxPenalty),
    gaps,
    compliantItems: compliant,
    certificationReady: gaps.filter((g) => g.severity === 'critique').length === 0,
  }
}

// ── Full compliance assessment ───────────────────────────────

export function assessCompliance(
  cameras: Camera[],
  doors: Door[],
  zones: Zone[],
  floors: Floor[],
  transitions: TransitionNode[]
): FullComplianceResult {
  const reports = [
    checkApsadR82(cameras, doors, zones, floors),
    checkEN62676(cameras, zones),
    checkNFS61(doors, zones, transitions),
  ]

  const globalScore = Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)

  return { reports, globalScore, disclaimer: DISCLAIMER }
}
