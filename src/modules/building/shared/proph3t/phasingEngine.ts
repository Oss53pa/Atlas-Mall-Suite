// ═══ PROPH3T — Moteur de Phasage Temporel ═══
// Raisonne sur les phases d'ouverture et le calendrier du projet

import type {
  ProjectPhase, PhaseSimulation, Zone, Camera, Door,
  TenantInfo, SecurityScore,
} from './types'
import { scoreSecurite, calcArea } from './engine'

// ─── Simulation d'une phase ──────────────────────────────────

export function simulatePhase(
  phase: ProjectPhase,
  allZones: Zone[],
  allCameras: Camera[],
  allDoors: Door[],
  allTenants: TenantInfo[]
): PhaseSimulation {

  // Filtrer les equipements actifs a cette phase
  const activeCameras = allCameras.filter(c => phase.plannedCameraIds.includes(c.id))
  const activeDoors = allDoors.filter(d => phase.plannedDoorIds.includes(d.id))
  const activeTenants = allTenants.filter(t => phase.confirmedTenantIds.includes(t.spaceId))

  // Zones actives = zones ayant au moins un equipement ou un preneur
  const activeFloorIds = new Set([
    ...activeCameras.map(c => c.floorId),
    ...activeDoors.map(d => d.floorId),
  ])
  const activeZones = allZones.filter(z => activeFloorIds.has(z.floorId))

  // Score securitaire sur l'etat filtre
  const exits = activeDoors.filter(d => d.isExit)
  const securityScore: SecurityScore = scoreSecurite(activeZones, activeCameras, activeDoors, exits)

  // CAPEX phase = equipements actifs uniquement
  const capexPhase = activeCameras.reduce((s, c) => s + (c.capexFcfa ?? 0), 0)
    + activeDoors.reduce((s, d) => s + (d.capexFcfa ?? 0), 0)

  // Revenus mensuels des preneurs confirmes
  const revenueMonthlyFcfa = activeTenants.reduce((s, t) => {
    const zone = allZones.find(z => z.id === t.spaceId)
    const surface = zone ? calcArea(zone) : 100
    return s + surface * (t.rentFcfaM2 ?? 35000) / 12
  }, 0)

  // Taux d'occupation
  const occupancyRate = allTenants.length > 0
    ? Math.round((activeTenants.length / allTenants.length) * 100)
    : 0

  // Identification des bloquants
  const blockers: string[] = []

  if (activeCameras.length < 8) {
    blockers.push(
      `Nombre de cameras insuffisant pour ouverture (${activeCameras.length}/8 minimum)`
    )
  }

  if (exits.length < 3) {
    blockers.push(
      `Sorties de secours insuffisantes pour ouverture ERP (${exits.length}/3 minimum)`
    )
  }

  // Zones N4/N5 sans couverture
  const criticalUncovered = activeZones.filter(z =>
    z.niveau >= 4 &&
    !activeCameras.some(c =>
      c.floorId === z.floorId &&
      c.x >= z.x - 0.05 && c.x <= z.x + z.w + 0.05 &&
      c.y >= z.y - 0.05 && c.y <= z.y + z.h + 0.05
    )
  )
  if (criticalUncovered.length > 0) {
    blockers.push(
      `${criticalUncovered.length} zone(s) critique(s) N4/N5 sans camera : ${criticalUncovered.map(z => z.label).join(', ')}`
    )
  }

  const isASPADCertifiable = securityScore.total >= 70 && blockers.length === 0

  const warnings = securityScore.issues.filter(i => !blockers.includes(i))

  const proph3tAdvice = generatePhaseAdvice(
    phase, securityScore, activeTenants.length, blockers
  )

  return {
    phase,
    activeZones,
    activeCameras,
    activeDoors,
    securityScore,
    capexPhase,
    revenueMonthlyFcfa,
    occupancyRate,
    isASPADCertifiable,
    blockers,
    warnings,
    proph3tAdvice,
  }
}

// ─── Conseil Proph3t par phase ───────────────────────────────

export function generatePhaseAdvice(
  phase: ProjectPhase,
  score: SecurityScore,
  tenantCount: number,
  blockers: string[]
): string {
  const daysToOpening = Math.ceil(
    (new Date(phase.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (blockers.length > 0) {
    return `${blockers.length} point(s) bloquant(s) pour ${phase.name} dans ${daysToOpening} jours. `
      + `Priorite absolue : ${blockers[0]}. Sans correction, l'ouverture ne peut pas etre autorisee.`
  }

  if (score.total < 75) {
    return `Score ${score.total}/100 — acceptable mais perfectible. `
      + `${daysToOpening > 30 ? 'Vous avez le temps d\'ameliorer avant l\'ouverture.' : 'Temps limite — concentrez-vous sur les points critiques.'}`
  }

  return `Phase ${phase.name} : configuration conforme (score ${score.total}/100, ${tenantCount} enseignes). `
    + `${daysToOpening} jours avant l'ouverture — plan valide.`
}

// ─── Simulation de toutes les phases ─────────────────────────

export function simulateAllPhases(
  phases: ProjectPhase[],
  allZones: Zone[],
  allCameras: Camera[],
  allDoors: Door[],
  allTenants: TenantInfo[]
): PhaseSimulation[] {
  return phases.map(phase =>
    simulatePhase(phase, allZones, allCameras, allDoors, allTenants)
  )
}

// ─── Projection de revenus ───────────────────────────────────

export function computePhaseRevenue(
  tenants: TenantInfo[],
  zones: Zone[],
  occupancyRate: number
): number {
  const active = tenants.filter(t => t.status === 'active' || t.status === 'confirmed')
  return active.reduce((total, t) => {
    const zone = zones.find(z => z.id === t.spaceId)
    const surface = zone ? calcArea(zone) : 100
    return total + surface * (t.rentFcfaM2 ?? 35000) * (occupancyRate / 100) / 12
  }, 0)
}
