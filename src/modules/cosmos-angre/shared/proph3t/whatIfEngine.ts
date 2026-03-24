// ═══ PROPH3T — Moteur What-If ═══

import type { Camera, Zone, Door, POI } from './types'

export type WhatIfType =
  | 'camera_failure'
  | 'door_breach'
  | 'crowd_surge'
  | 'power_outage'
  | 'fire_zone'
  | 'vip_event'
  | 'night_intrusion'

export interface WhatIfScenario {
  id: string
  type: WhatIfType
  label: string
  description: string
  affectedEntityIds: string[]
  params: Record<string, number | string | boolean>
}

export interface SnapshotMetrics {
  coveragePercent: number
  activeCamera: number
  secureDoors: number
  avgResponseTimeSec: number
  riskLevel: 'faible' | 'moyen' | 'eleve' | 'critique'
}

export interface DeltaMetrics {
  coverageDelta: number
  activeCameraDelta: number
  secureDoorDelta: number
  responseTimeDelta: number
  riskLevelBefore: string
  riskLevelAfter: string
}

export interface WhatIfResult {
  scenario: WhatIfScenario
  before: SnapshotMetrics
  after: SnapshotMetrics
  delta: DeltaMetrics
  recommendations: string[]
  impactSummary: string
}

function computeSnapshot(cameras: Camera[], zones: Zone[], doors: Door[]): SnapshotMetrics {
  const activeCamera = cameras.length
  const secureDoors = doors.filter(d => d.hasBadge || d.hasBiometric).length
  const coverage = zones.length > 0 ? Math.min(100, Math.round((cameras.length / Math.max(zones.length, 1)) * 50)) : 0
  const avgResponse = 120
  const riskLevel: SnapshotMetrics['riskLevel'] = coverage >= 80 ? 'faible' : coverage >= 60 ? 'moyen' : coverage >= 40 ? 'eleve' : 'critique'
  return { coveragePercent: coverage, activeCamera, secureDoors, avgResponseTimeSec: avgResponse, riskLevel }
}

export function simulateWhatIf(
  scenario: WhatIfScenario,
  cameras: Camera[],
  zones: Zone[],
  doors: Door[],
  _pois: POI[],
): WhatIfResult {
  const before = computeSnapshot(cameras, zones, doors)

  let afterCameras = [...cameras]
  let afterDoors = [...doors]
  const recommendations: string[] = []

  switch (scenario.type) {
    case 'camera_failure': {
      const count = (scenario.params.failCount as number) || 3
      afterCameras = afterCameras.slice(0, Math.max(0, afterCameras.length - count))
      recommendations.push(`Activer ${count} cameras de secours`, 'Envoyer technicien VRD en urgence')
      break
    }
    case 'door_breach': {
      afterDoors = afterDoors.map(d =>
        scenario.affectedEntityIds.includes(d.id) ? { ...d, hasBadge: false, hasBiometric: false } : d
      )
      recommendations.push('Deployer agents aux portes compromises', 'Activer protocole code rouge')
      break
    }
    case 'crowd_surge':
      recommendations.push('Ouvrir toutes les issues de secours', 'Activer compteurs flux temps reel', 'Deployer 4 agents supplementaires')
      break
    case 'power_outage':
      afterCameras = afterCameras.filter(c => c.priority === 'critique')
      recommendations.push('Verifier groupe electrogene', 'Activer eclairage de secours BAES', 'Evacuer si > 30 min')
      break
    case 'fire_zone':
      recommendations.push('Declencher alarme SSI', 'Evacuation immediate zone concernee', 'Alerter SDIS')
      break
    case 'vip_event':
      recommendations.push('Renforcer securite perimetre VIP', 'Doubler les rondes', 'Pre-positionner equipe medicale')
      break
    case 'night_intrusion':
      afterCameras = afterCameras.filter(c => c.priority !== 'normale')
      recommendations.push('Activer detection perimetre IR', 'Alerter PC securite', 'Envoyer ronde immediate')
      break
  }

  const after = computeSnapshot(afterCameras, zones, afterDoors)

  const delta: DeltaMetrics = {
    coverageDelta: after.coveragePercent - before.coveragePercent,
    activeCameraDelta: after.activeCamera - before.activeCamera,
    secureDoorDelta: after.secureDoors - before.secureDoors,
    responseTimeDelta: after.avgResponseTimeSec - before.avgResponseTimeSec,
    riskLevelBefore: before.riskLevel,
    riskLevelAfter: after.riskLevel,
  }

  const impactSummary = `Couverture ${before.coveragePercent}% -> ${after.coveragePercent}%. Risque ${before.riskLevel} -> ${after.riskLevel}.`

  return { scenario, before, after, delta, recommendations, impactSummary }
}

export const PREDEFINED_SCENARIOS: WhatIfScenario[] = [
  { id: 'wi-01', type: 'camera_failure', label: 'Panne 5 cameras RDC', description: '5 cameras du RDC tombent hors ligne simultanement', affectedEntityIds: [], params: { failCount: 5 } },
  { id: 'wi-02', type: 'door_breach', label: 'Porte technique forcee', description: 'Intrusion par porte technique B1', affectedEntityIds: ['door-tech-01'], params: {} },
  { id: 'wi-03', type: 'crowd_surge', label: 'Affluence Tabaski x2.5', description: 'Affluence 2.5x un samedi de Tabaski', affectedEntityIds: [], params: { multiplier: 2.5 } },
  { id: 'wi-04', type: 'power_outage', label: 'Coupure electrique generale', description: 'Coupure CIE pendant 45 minutes', affectedEntityIds: [], params: { durationMin: 45 } },
  { id: 'wi-05', type: 'fire_zone', label: 'Incendie food court R+1', description: 'Depart de feu cuisine food court', affectedEntityIds: [], params: { floorId: 'floor-r1' } },
  { id: 'wi-06', type: 'vip_event', label: 'Evenement VIP 200 invites', description: 'Inauguration VIP avec ministre', affectedEntityIds: [], params: { guests: 200 } },
  { id: 'wi-07', type: 'night_intrusion', label: 'Intrusion nocturne parking', description: 'Detection mouvement parking B1 a 3h00', affectedEntityIds: [], params: { hour: 3 } },
]
