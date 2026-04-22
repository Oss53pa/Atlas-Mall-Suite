// ═══ AGENT PLANNING — Security staff dimensioning + patrol optimization ═══

import type { Zone, Floor } from '../../shared/proph3t/types'

// ── Types ────────────────────────────────────────────────────

export interface Patrol {
  name: string
  route: string[]           // zone IDs
  frequencyPerShift: number
  durationMinutes: number
}

export interface AgentPlanningResult {
  daytimeAgents: number
  nighttimeAgents: number
  supervisors: number
  patrols: Patrol[]
  monthlyCostFcfa: number
  breakdown: StaffBreakdown
  narrative: string
}

interface StaffBreakdown {
  fixedPostsDay: number
  mobilePatrolDay: number
  fixedPostsNight: number
  mobilePatrolNight: number
  supervision: number
}

// ── Salary constants (FCFA/month, Cote d'Ivoire market) ──────

const AGENT_SALARY_FCFA = 180_000
const SUPERVISOR_SALARY_FCFA = 350_000
const CHARGES_MULTIPLIER = 1.35  // charges sociales ~35%

// ── Planning algorithm ───────────────────────────────────────

export function planSecurityStaff(
  zones: Zone[],
  floors: Floor[],
  controlPointCount: number,
  _openingHours: { open: number; close: number } = { open: 8, close: 22 }
): AgentPlanningResult {
  const totalSurfaceM2 = zones.reduce((s, z) => s + (z.surfaceM2 ?? z.w * z.h), 0)
  const floorCount = floors.length

  // ── Fixed posts (access control, entrances, parking) ──
  const entrancePostsDay = Math.max(2, Math.ceil(controlPointCount * 0.3))
  const entrancePostsNight = Math.max(1, Math.ceil(entrancePostsDay * 0.5))

  // ── Mobile patrols ──
  // Rule: 1 patrol agent per 5000m² during day, 1 per 8000m² at night
  const mobileDay = Math.max(2, Math.ceil(totalSurfaceM2 / 5_000))
  const mobileNight = Math.max(1, Math.ceil(totalSurfaceM2 / 8_000))

  // ── Supervisors: 1 per shift ──
  const supervisors = 2  // day + night

  const daytimeAgents = entrancePostsDay + mobileDay
  const nighttimeAgents = entrancePostsNight + mobileNight

  // ── Generate patrol routes ──
  const patrols: Patrol[] = []

  // Group zones by floor for patrol routes
  for (const floor of floors) {
    const floorZones = zones.filter((z) => z.floorId === floor.id)
    if (floorZones.length === 0) continue

    // Main patrol
    patrols.push({
      name: `Ronde ${floor.level} — principale`,
      route: floorZones.map((z) => z.id),
      frequencyPerShift: 4,
      durationMinutes: Math.max(15, Math.ceil(floorZones.length * 3)),
    })

    // Critical zones patrol (N4/N5)
    const criticalZones = floorZones.filter((z) => z.niveau >= 4)
    if (criticalZones.length > 0) {
      patrols.push({
        name: `Ronde ${floor.level} — zones critiques`,
        route: criticalZones.map((z) => z.id),
        frequencyPerShift: 6,
        durationMinutes: Math.max(10, Math.ceil(criticalZones.length * 2)),
      })
    }
  }

  // Night-specific exterior patrol
  patrols.push({
    name: 'Ronde exterieure nocturne',
    route: [],
    frequencyPerShift: 3,
    durationMinutes: 25,
  })

  // ── Monthly cost ──
  // 3 shifts rotation (3×8h) means 3x staff for 24h coverage
  const totalAgentsForShiftCoverage = (daytimeAgents + nighttimeAgents) * 1.5  // 1.5x for days off/vacation coverage
  const monthlyAgentsCost = Math.ceil(totalAgentsForShiftCoverage) * AGENT_SALARY_FCFA * CHARGES_MULTIPLIER
  const monthlySupervisorsCost = supervisors * SUPERVISOR_SALARY_FCFA * CHARGES_MULTIPLIER
  const monthlyCostFcfa = Math.round(monthlyAgentsCost + monthlySupervisorsCost)

  const breakdown: StaffBreakdown = {
    fixedPostsDay: entrancePostsDay,
    mobilePatrolDay: mobileDay,
    fixedPostsNight: entrancePostsNight,
    mobilePatrolNight: mobileNight,
    supervision: supervisors,
  }

  const narrative =
    `Effectif recommande : ${daytimeAgents} agents de jour + ${nighttimeAgents} de nuit ` +
    `+ ${supervisors} superviseurs pour ${totalSurfaceM2.toLocaleString('fr-FR')} m² ` +
    `sur ${floorCount} niveaux, selon les standards CNSP CI. ` +
    `${patrols.length} rondes planifiees couvrant l'ensemble du perimetre. ` +
    `Budget masse salariale mensuel estime : ${monthlyCostFcfa.toLocaleString('fr-FR')} FCFA (charges incluses).`

  return {
    daytimeAgents,
    nighttimeAgents,
    supervisors,
    patrols,
    monthlyCostFcfa,
    breakdown,
    narrative,
  }
}
