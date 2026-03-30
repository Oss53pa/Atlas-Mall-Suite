// ═══ MOTEUR CASCADE v3 — 10 NIVEAUX + INTER-VOLUMES ═══
// Chaque trigger declenche les niveaux necessaires
// Objectif : < 200ms via Promise.allSettled parallele

import type {
  CascadeTrigger, CascadeResult, BlindSpot, SecurityScore,
  Zone, Camera, Door, Floor, TransitionNode, SignageItem,
  DoorRecommendation, CrossVolumeInsight, CascadeResultV3,
  JourneyImpact, CommercialImpact, ProactiveInsight,
  MomentCle, TenantInfo,
} from './types'
import {
  scoreSecurite, findBlindSpots, computeFloorCoverage,
  recommendDoor, computeCapex, calcArea,
} from './engine'
import { detectVisualBreaks } from './signaleticsEngine'

// ─── Niveaux de cascade ──────────────────────────────────────

export const CASCADE_LEVELS = {
  L1_ZONES:          'reclassification zones affectees',
  L2_COVERAGE:       'couverture camera par etage',
  L3_BLIND_SPOTS:    'angles morts (severite critique/elevee/normale)',
  L4_DOOR_RECS:      'recommandations portes zones affectees',
  L5_SECURITY_SCORE: 'score APSAD R82 global + par etage',
  L6_CAPEX:          'recalcul CAPEX total + ventilation',
  L7_COMPLIANCE:     'statut conformite certifiable ou non',
  L8_SIGNALETICS:    'ruptures signaletique + placement optimal',
  L9_JOURNEY:        'impact sur parcours client',
  L10_COMMERCIAL:    'impact sur mix enseigne + revenus',
} as const

// ─── Etat complet pour le recalcul ──────────────────────────

export interface CascadeState {
  floors: Floor[]
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  transitions: TransitionNode[]
  signageItems: SignageItem[]
  // Donnees inter-volumes (optionnelles)
  moments?: MomentCle[]
  tenants?: TenantInfo[]
  signageGaps?: Array<{ id: string; axisId: string; description: string; distanceM: number; recommendedPoseHeight: number }>
  phases?: Array<{ id: string; name: string; targetDate: string }>
  projectClass?: 'A' | 'B' | 'C'
}

// ─── Recalcul cascade complet ────────────────────────────────

export async function runCascade(
  state: CascadeState,
  _trigger: CascadeTrigger
): Promise<CascadeResultV3> {
  const startTime = performance.now()
  const { floors, zones, cameras, doors, signageItems } = state

  // ── L2-L4 en parallele ──
  const [l2Result, l3Result, l4Result] = await Promise.allSettled([
    computeCoverageByFloor(floors, zones, cameras),
    computeAllBlindSpots(floors, zones, cameras),
    computeDoorRecommendations(zones, doors),
  ])

  const coverageByFloor = l2Result.status === 'fulfilled' ? l2Result.value : {} as Record<string, number>
  const allBlindSpots = l3Result.status === 'fulfilled' ? l3Result.value : [] as BlindSpot[]
  const doorRecommendations = l4Result.status === 'fulfilled' ? l4Result.value : [] as DoorRecommendation[]

  // ── L5 : Score securitaire ──
  const exits = doors.filter(d => d.isExit)
  const score: SecurityScore = scoreSecurite(zones, cameras, doors, exits)

  // Couverture moyenne
  const floorCovValues = Object.values(coverageByFloor).filter(v => v > 0)
  const avgCoverage = floorCovValues.length > 0
    ? Math.round(floorCovValues.reduce((s, v) => s + v, 0) / floorCovValues.length)
    : 0

  // ── L6 : CAPEX ──
  const capexResult = computeCapex(cameras, doors, signageItems)
  const capexTotal = typeof capexResult === 'number' ? capexResult : (capexResult as { total: number }).total ?? 0

  // ── L7 : Conformite certifiable ──
  const complianceCertifiable = score.total >= 70
    && exits.length >= 3
    && !zones.some(z => z.niveau >= 4 && !cameras.some(c =>
      c.floorId === z.floorId &&
      c.x >= z.x - 0.05 && c.x <= z.x + z.w + 0.05 &&
      c.y >= z.y - 0.05 && c.y <= z.y + z.h + 0.05
    ))

  // ── L8 : Alertes signaletique ──
  const signageAlerts: string[] = []
  for (const floor of floors) {
    const breaks = detectVisualBreaks(signageItems, floor.id, floor.widthM, floor.heightM)
    for (const brk of breaks) {
      signageAlerts.push(
        `${floor.level}: rupture visuelle entre ${brk.from.ref} et ${brk.to.ref} — ${brk.distanceM}m (max ${brk.maxAllowedM}m)`
      )
    }
  }

  for (const zone of zones) {
    if ((zone.lux ?? 300) < 200) {
      const hasLuminous = signageItems.some(
        s => s.floorId === zone.floorId && s.isLuminous &&
          s.x >= zone.x && s.x <= zone.x + zone.w &&
          s.y >= zone.y && s.y <= zone.y + zone.h
      )
      if (!hasLuminous) {
        signageAlerts.push(`Zone "${zone.label}" (lux < 200) sans panneau lumineux — NF EN 1838`)
      }
    }
  }

  for (const exit of exits) {
    const hasBAES = signageItems.some(
      s => s.floorId === exit.floorId && s.requiresBAES &&
        Math.abs(s.x - exit.x) < 0.05 && Math.abs(s.y - exit.y) < 0.05
    )
    if (!hasBAES) {
      signageAlerts.push(`Sortie "${exit.label}" sans BAES a proximite — NF C 71-800`)
    }
  }

  // ── L9 : Impact parcours client ──
  const journeyImpact = computeJourneyImpact(allBlindSpots, state.moments ?? [])

  // ── L10 : Impact commercial ──
  const commercialImpact = computeCommercialImpact(allBlindSpots, state.tenants ?? [], zones)

  // ── Insights inter-volumes ──
  const crossVolumeInsights = computeCrossVolumeInsights(
    state, allBlindSpots, journeyImpact, commercialImpact
  )

  const proactiveInsights: ProactiveInsight[] = []

  const durationMs = Math.round(performance.now() - startTime)

  return {
    score,
    coverage: avgCoverage,
    blindSpots: allBlindSpots,
    doorRecommendations,
    signageAlerts,
    durationMs,
    coverageByFloor,
    capex: capexTotal,
    complianceCertifiable,
    journeyImpact,
    commercialImpact,
    crossVolumeInsights,
    proactiveInsights,
  }
}

// ─── Fonctions de calcul par niveau ──────────────────────────

async function computeCoverageByFloor(
  floors: Floor[], zones: Zone[], cameras: Camera[]
): Promise<Record<string, number>> {
  const coverage: Record<string, number> = {}
  for (const floor of floors) {
    const fZones = zones.filter(z => z.floorId === floor.id)
    const fCams = cameras.filter(c => c.floorId === floor.id)
    if (fZones.length === 0) { coverage[floor.id] = 0; continue }
    coverage[floor.id] = computeFloorCoverage(fZones, fCams, floor.id, floor.widthM, floor.heightM, 20)
  }
  return coverage
}

async function computeAllBlindSpots(
  floors: Floor[], zones: Zone[], cameras: Camera[]
): Promise<BlindSpot[]> {
  const allSpots: BlindSpot[] = []
  for (const floor of floors) {
    const fZones = zones.filter(z => z.floorId === floor.id)
    const fCams = cameras.filter(c => c.floorId === floor.id)
    if (fZones.length === 0) continue
    const spots = findBlindSpots(fZones, fCams, floor.id, floor.widthM, floor.heightM)
    allSpots.push(...spots)
  }
  return allSpots
}

async function computeDoorRecommendations(
  zones: Zone[], doors: Door[]
): Promise<DoorRecommendation[]> {
  const recs: DoorRecommendation[] = []
  for (const zone of zones) {
    const zoneDoors = doors.filter(d => d.floorId === zone.floorId && d.zoneType === zone.type)
    if (zoneDoors.length === 0) {
      recs.push(recommendDoor(zone))
    } else {
      for (const door of zoneDoors) {
        if (['technique', 'backoffice', 'financier'].includes(zone.type) && !door.hasBadge) {
          recs.push({ ...recommendDoor(zone), note: `Porte "${door.label}" zone sensible sans badge` })
        }
        if (zone.type === 'financier' && !door.hasBiometric) {
          recs.push({ ...recommendDoor(zone), note: `Porte "${door.label}" zone financiere sans biometrie` })
        }
      }
    }
  }
  return recs
}

// ─── Impact parcours client ──────────────────────────────────

function computeJourneyImpact(
  blindSpots: BlindSpot[],
  moments: MomentCle[]
): JourneyImpact {
  const affectedMoments: string[] = []
  const zoneHeatValues: Record<string, number> = {}
  const axisHeatValues: Record<string, number> = {}

  for (const moment of moments) {
    const isBlind = blindSpots.some(bs =>
      bs.floorId === moment.floorId &&
      Math.abs(moment.x - (bs.x + bs.w / 2)) < 0.08 &&
      Math.abs(moment.y - (bs.y + bs.h / 2)) < 0.08
    )
    if (isBlind) affectedMoments.push(moment.id)
    zoneHeatValues[moment.id] = 0.5 + Math.random() * 0.5
  }

  return { affectedMoments, zoneHeatValues, axisHeatValues }
}

// ─── Impact commercial ───────────────────────────────────────

function computeCommercialImpact(
  blindSpots: BlindSpot[],
  tenants: TenantInfo[],
  zones: Zone[]
): CommercialImpact {
  const affectedTenants: string[] = []
  let revenueImpactFcfa = 0

  for (const tenant of tenants) {
    const zone = zones.find(z => z.id === tenant.spaceId)
    if (!zone) continue
    const isBlind = blindSpots.some(bs =>
      bs.floorId === zone.floorId && bs.severity === 'critique' &&
      Math.abs(zone.x + zone.w / 2 - (bs.x + bs.w / 2)) < 0.1 &&
      Math.abs(zone.y + zone.h / 2 - (bs.y + bs.h / 2)) < 0.1
    )
    if (isBlind) {
      affectedTenants.push(tenant.spaceId)
      revenueImpactFcfa += (tenant.rentFcfaM2 ?? 35000) * calcArea(zone) * 0.05
    }
  }

  return { affectedTenants, revenueImpactFcfa }
}

// ─── Insights inter-volumes ──────────────────────────────────

export function computeCrossVolumeInsights(
  state: CascadeState,
  blindSpots: BlindSpot[],
  journeyImpact: JourneyImpact | null,
  commercialImpact: CommercialImpact | null
): CrossVolumeInsight[] {
  const insights: CrossVolumeInsight[] = []

  // Regle 1 : Zone morte critique = Moment Cle → CONFLIT
  for (const bs of blindSpots.filter(b => b.severity === 'critique')) {
    const affectedMoment = (state.moments ?? []).find(m =>
      m.floorId === bs.floorId &&
      Math.abs(m.x - (bs.x + bs.w / 2)) < 0.08 &&
      Math.abs(m.y - (bs.y + bs.h / 2)) < 0.08
    )
    if (affectedMoment) {
      insights.push({
        sourceVolume: 'vol2', targetVolume: 'vol3',
        sourceEntityId: bs.id, targetEntityId: affectedMoment.id,
        insightType: 'conflict', severity: 'critique',
        title: `Angle mort critique sur le Moment ${affectedMoment.number}`,
        explanation: `La zone "${affectedMoment.name}" n'est pas couverte par les cameras. Double risque : securitaire et experientiel.`,
        recommendedAction: `Placer une camera dome Wisenet QNV-8080R en ${bs.floorId}.`,
      })
    }
  }

  // Regle 2 : Cellule vacante strategique → OPPORTUNITE
  for (const tenant of (state.tenants ?? []).filter(t => t.status === 'vacant')) {
    const zone = state.zones.find(z => z.id === tenant.spaceId)
    if (!zone) continue
    const isPrime = zone.x < 0.3 || zone.y < 0.2
    if (isPrime) {
      insights.push({
        sourceVolume: 'vol1', targetVolume: 'vol3',
        sourceEntityId: tenant.spaceId, targetEntityId: tenant.spaceId,
        insightType: 'opportunity', severity: 'attention',
        title: 'Cellule vacante strategique',
        explanation: `La cellule ${zone.label} est vacante en position prime.`,
        recommendedAction: 'Prioriser le remplissage par restauration rapide ou services.',
      })
    }
  }

  // Regle 3 : Rupture signaletique → RISQUE
  for (const gap of (state.signageGaps ?? [])) {
    insights.push({
      sourceVolume: 'vol3', targetVolume: 'vol3',
      sourceEntityId: gap.id, targetEntityId: gap.axisId,
      insightType: 'risk', severity: 'attention',
      title: 'Rupture signaletique sur axe frequente',
      explanation: `Rupture de ${gap.distanceM}m sur ${gap.description}.`,
      recommendedAction: `Ajouter un panneau directionnel. Hauteur: ${gap.recommendedPoseHeight}m.`,
    })
  }

  // Regle 4 : CAPEX eleve → OPTIMISATION
  const totalCapex = state.cameras.reduce((s, c) => s + (c.capexFcfa ?? 0), 0)
  const benchmarkAvg = state.projectClass === 'A' ? 55_000_000 : state.projectClass === 'B' ? 35_000_000 : 20_000_000
  if (totalCapex > benchmarkAvg * 1.3) {
    insights.push({
      sourceVolume: 'vol2', targetVolume: 'vol1',
      sourceEntityId: 'capex_total', targetEntityId: 'budget_global',
      insightType: 'optimization', severity: 'attention',
      title: 'CAPEX securite 30% au-dessus de la moyenne',
      explanation: `Budget equipements (${Math.round(totalCapex).toLocaleString('fr-FR')} FCFA) depasse la moyenne.`,
      recommendedAction: `Eliminer les redondances : ~${Math.round(totalCapex * 0.15).toLocaleString('fr-FR')} FCFA liberables.`,
    })
  }

  return insights
}

// ═══ DEBOUNCED CASCADE ═══

interface DebouncedState {
  timer: ReturnType<typeof setTimeout> | null
  pendingResolvers: Array<{
    resolve: (result: CascadeResultV3) => void
    reject: (err: Error) => void
  }>
}

const debouncedState: DebouncedState = {
  timer: null,
  pendingResolvers: [],
}

export function debouncedCascade(
  state: CascadeState,
  trigger: CascadeTrigger,
  delay: number = 100
): Promise<CascadeResultV3> {
  return new Promise<CascadeResultV3>((resolve, reject) => {
    debouncedState.pendingResolvers.push({ resolve, reject })

    if (debouncedState.timer !== null) {
      clearTimeout(debouncedState.timer)
    }

    debouncedState.timer = setTimeout(() => {
      const resolvers = [...debouncedState.pendingResolvers]
      debouncedState.pendingResolvers = []
      debouncedState.timer = null

      runCascade(state, trigger)
        .then((result) => {
          for (const r of resolvers) r.resolve(result)
        })
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err))
          for (const r of resolvers) r.reject(error)
        })
    }, delay)
  })
}
