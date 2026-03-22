import type {
  Floor, Camera, TransitionNode, Door, Zone,
  SecurityScenario, EvacuationScenario,
  MonteCarloResult, EvacuationResult, EvacuationFrame,
  FloorEvacResult, Bottleneck
} from './types'
import { isCovered, calcDistance } from './engine'

// ═══ CONFIGURATION PAR SCENARIO ═══

const SCENARIO_CONFIG: Record<SecurityScenario, {
  label: string
  targetZoneTypes: string[]
  detectionThresholdSec: number
}> = {
  vol_etalage: {
    label: 'Vol a l\'etalage',
    targetZoneTypes: ['commerce', 'restauration'],
    detectionThresholdSec: 30,
  },
  intrusion_nocturne: {
    label: 'Intrusion nocturne',
    targetZoneTypes: ['parking', 'technique', 'backoffice'],
    detectionThresholdSec: 10,
  },
  incendie: {
    label: 'Incendie',
    targetZoneTypes: ['restauration', 'technique', 'commerce'],
    detectionThresholdSec: 15,
  },
  mouvement_foule: {
    label: 'Mouvement de foule',
    targetZoneTypes: ['circulation', 'restauration', 'loisirs'],
    detectionThresholdSec: 5,
  },
  pickpocket: {
    label: 'Pickpocket',
    targetZoneTypes: ['circulation', 'commerce'],
    detectionThresholdSec: 20,
  },
  agression_parking: {
    label: 'Agression parking',
    targetZoneTypes: ['parking'],
    detectionThresholdSec: 10,
  },
}

// ═══ MONTE CARLO — SIMULATION MULTI-SCENARIOS ═══

export function runMonteCarlo(
  scenario: SecurityScenario,
  cameras: Camera[],
  zones: Zone[],
  floors: Floor[],
  runs: number = 1000
): MonteCarloResult {
  const config = SCENARIO_CONFIG[scenario]
  const targetZones = zones.filter(z => config.targetZoneTypes.includes(z.type))

  if (targetZones.length === 0) {
    return {
      scenario: config.label,
      runs,
      resilienceScore: 100,
      avgDetectionTimeSec: 0,
      failureZones: [],
      heatmapData: createEmptyGrid(25),
    }
  }

  let successCount = 0
  let totalDetectionTime = 0
  const zoneFailures = new Map<string, number>()

  // Heatmap grid 25x25
  const gridSize = 25
  const heatmap = createEmptyGrid(gridSize)

  // Seeded PRNG for deterministic results (xorshift32)
  let seed = 42
  const random = (): number => {
    seed ^= seed << 13
    seed ^= seed >> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 10000) / 10000
  }

  for (let run = 0; run < runs; run++) {
    // 1. Random incident position in a target zone
    const zone = targetZones[Math.floor(random() * targetZones.length)]
    const floor = floors.find(f => f.id === zone.floorId)
    if (!floor) continue

    const ix = zone.x + random() * zone.w
    const iy = zone.y + random() * zone.h

    // Update heatmap
    const hx = Math.min(gridSize - 1, Math.floor(ix * gridSize))
    const hy = Math.min(gridSize - 1, Math.floor(iy * gridSize))
    if (hx >= 0 && hy >= 0) {
      heatmap[hy][hx]++
    }

    // 2. Calculate detection probability using P = exp(-d^2 / (2 * range^2))
    const floorCameras = cameras.filter(c => c.floorId === floor.id)
    let bestDetectionProb = 0
    let bestDetectionTimeSec = config.detectionThresholdSec + 1

    for (const cam of floorCameras) {
      if (!isCovered(ix, iy, cam, floor.widthM, floor.heightM)) continue

      const dist = calcDistance(ix, iy, cam.x, cam.y, floor.widthM, floor.heightM)
      const range = cam.rangeM

      // Detection probability: Gaussian falloff
      const prob = Math.exp(-(dist * dist) / (2 * range * range))

      if (prob > bestDetectionProb) {
        bestDetectionProb = prob
        // Detection time inversely proportional to probability
        bestDetectionTimeSec = Math.max(1, (1 - prob) * config.detectionThresholdSec)
      }
    }

    // 3. Monte Carlo sampling: random draw against detection probability
    const roll = random()
    if (roll < bestDetectionProb && bestDetectionTimeSec <= config.detectionThresholdSec) {
      successCount++
      totalDetectionTime += bestDetectionTimeSec
    } else {
      zoneFailures.set(zone.id, (zoneFailures.get(zone.id) ?? 0) + 1)
    }
  }

  const failureZones = Array.from(zoneFailures.entries())
    .map(([zoneId, count]) => ({
      zoneId,
      failureRate: Math.round((count / runs) * 100) / 100,
    }))
    .sort((a, b) => b.failureRate - a.failureRate)

  return {
    scenario: config.label,
    runs,
    resilienceScore: Math.round((successCount / runs) * 100),
    avgDetectionTimeSec: successCount > 0
      ? Math.round((totalDetectionTime / successCount) * 10) / 10
      : 0,
    failureZones,
    heatmapData: heatmap,
  }
}

function createEmptyGrid(size: number): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  )
}

// ═══ SIMULATION EVACUATION MULTI-ETAGES ═══

interface EvacAgent {
  id: string
  floorId: string
  x: number
  y: number
  targetX: number
  targetY: number
  targetFloorId: string
  speed: number // m/s
  evacuated: boolean
  waitTimeSec: number
}

export function simulateEvacuation(
  floors: Floor[],
  zones: Zone[],
  doors: Door[],
  transitions: TransitionNode[],
  scenario: EvacuationScenario
): EvacuationResult {
  const frameInterval = 0.1 // 10fps => 0.1s per tick
  const maxTimeSec = 600

  // 1. Filter active exits and transitions
  const activeExits = doors.filter(d =>
    d.isExit && !(scenario.disabledExits ?? []).includes(d.id)
  )
  const activeTransitions = transitions.filter(t =>
    !(scenario.disabledTransitions ?? []).includes(t.id)
  )

  // 2. Distribute agents based on zone areas
  const agents: EvacAgent[] = []
  let agentCounter = 0

  for (const floor of floors) {
    // If scenario specifies origin floor, only populate that floor
    if (scenario.originFloorId && floor.id !== scenario.originFloorId) continue

    const floorZones = zones.filter(z => z.floorId === floor.id)
    const filteredZones = scenario.originZoneId
      ? floorZones.filter(z => z.id === scenario.originZoneId)
      : floorZones

    for (const zone of filteredZones) {
      const area = zone.surfaceM2 ?? 50
      // ~1 person per 5m2, multiplied by scenario factor
      const count = Math.max(1, Math.ceil((area / 5) * scenario.occupancyMultiplier))

      for (let i = 0; i < count; i++) {
        const ax = zone.x + pseudoRandom(agentCounter * 3 + 1) * zone.w
        const ay = zone.y + pseudoRandom(agentCounter * 3 + 2) * zone.h

        agents.push({
          id: `evac-${agentCounter}`,
          floorId: floor.id,
          x: ax,
          y: ay,
          targetX: 0,
          targetY: 0,
          targetFloorId: '',
          speed: 1.2, // standard walking speed m/s
          evacuated: false,
          waitTimeSec: 0,
        })
        agentCounter++
      }
    }
  }

  // 3. Assign initial targets
  for (const agent of agents) {
    assignNearestTarget(agent, activeExits, activeTransitions, floors)
  }

  // 4. Simulate frame by frame
  const frames: EvacuationFrame[] = []
  const bottleneckTracker = new Map<string, { count: number; maxQueue: number; totalWait: number }>()
  let time = 0

  // Track flow rates at exits and transitions
  const flowCounters = new Map<string, number>()

  while (time < maxTimeSec) {
    if (agents.every(a => a.evacuated)) break

    for (const agent of agents) {
      if (agent.evacuated) continue

      const floor = floors.find(f => f.id === agent.floorId)
      if (!floor) continue

      const dx = agent.targetX - agent.x
      const dy = agent.targetY - agent.y

      // Convert pixel distance to meters
      const distMeters = Math.sqrt(
        (dx * floor.widthM) * (dx * floor.widthM) +
        (dy * floor.heightM) * (dy * floor.heightM)
      )

      if (distMeters < 0.5) {
        // Reached target
        if (agent.targetFloorId !== '' && agent.targetFloorId !== agent.floorId) {
          // At a transition — check capacity bottleneck
          const trans = activeTransitions.find(t =>
            Math.abs(t.x - agent.targetX) < 0.05 &&
            Math.abs(t.y - agent.targetY) < 0.05
          )

          if (trans) {
            const key = trans.id
            const tracker = bottleneckTracker.get(key) ?? { count: 0, maxQueue: 0, totalWait: 0 }
            const currentFlow = flowCounters.get(key) ?? 0

            // Check if flow rate allows passage (capacity per tick)
            const capacityPerTick = (trans.capacityPerMin / 60) * frameInterval
            if (currentFlow < capacityPerTick) {
              flowCounters.set(key, currentFlow + 1)
              agent.floorId = agent.targetFloorId
              assignNearestTarget(agent, activeExits, activeTransitions, floors)
              tracker.count++
              bottleneckTracker.set(key, tracker)
            } else {
              // Queue — bottleneck
              agent.waitTimeSec += frameInterval
              tracker.maxQueue = Math.max(tracker.maxQueue, Math.ceil(currentFlow - capacityPerTick + 1))
              tracker.totalWait += frameInterval
              bottleneckTracker.set(key, tracker)
            }
          }
        } else {
          // At an exit — check door flow rate
          const exit = activeExits.find(e =>
            Math.abs(e.x - agent.targetX) < 0.05 &&
            Math.abs(e.y - agent.targetY) < 0.05
          )

          if (exit) {
            const key = exit.id
            const currentFlow = flowCounters.get(key) ?? 0
            // Door flow capacity: width * 1.3 persons/m/s
            const capacityPerTick = exit.widthM * 1.3 * frameInterval

            if (currentFlow < capacityPerTick) {
              flowCounters.set(key, currentFlow + 1)
              agent.evacuated = true
            } else {
              agent.waitTimeSec += frameInterval
              const tracker = bottleneckTracker.get(key) ?? { count: 0, maxQueue: 0, totalWait: 0 }
              tracker.maxQueue = Math.max(tracker.maxQueue, Math.ceil(currentFlow - capacityPerTick + 1))
              tracker.totalWait += frameInterval
              bottleneckTracker.set(key, tracker)
            }
          } else {
            // No matching exit found, evacuate anyway (reached coordinates)
            agent.evacuated = true
          }
        }
      } else {
        // Move toward target at 1.2 m/s
        const moveDistMeters = agent.speed * frameInterval
        const moveFraction = distMeters > 0 ? moveDistMeters / distMeters : 0
        const clampedFraction = Math.min(1, moveFraction)

        agent.x += dx * clampedFraction
        agent.y += dy * clampedFraction
      }
    }

    // Reset flow counters each tick
    flowCounters.clear()

    // Generate frames at 10fps intervals (every tick)
    // But to avoid huge frame arrays, capture every 5 ticks (0.5s)
    if (Math.round(time * 10) % 5 === 0) {
      frames.push({
        time: Math.round(time * 10) / 10,
        agents: agents.map(a => ({
          id: a.id,
          floorId: a.floorId,
          x: a.x,
          y: a.y,
          evacuated: a.evacuated,
        })),
      })
    }

    time += frameInterval
  }

  // 5. Build bottleneck results
  const bottlenecks: Bottleneck[] = []
  for (const [entityId, tracker] of bottleneckTracker) {
    if (tracker.maxQueue <= 1) continue

    // Determine entity type and position
    const trans = transitions.find(t => t.id === entityId)
    const door = doors.find(d => d.id === entityId)

    if (trans) {
      const transFloor = floors.find(f => f.level === trans.fromFloor)
      bottlenecks.push({
        id: `bn-${entityId}`,
        floorId: transFloor?.id ?? '',
        x: trans.x,
        y: trans.y,
        entityId,
        entityType: 'transition',
        queueLength: tracker.maxQueue,
        waitTimeSec: Math.round(tracker.totalWait * 10) / 10,
      })
    } else if (door) {
      bottlenecks.push({
        id: `bn-${entityId}`,
        floorId: door.floorId,
        x: door.x,
        y: door.y,
        entityId,
        entityType: 'door',
        queueLength: tracker.maxQueue,
        waitTimeSec: Math.round(tracker.totalWait * 10) / 10,
      })
    }
  }

  // 6. Floor results
  const initialFloorCounts = new Map<string, number>()
  for (const agent of agents) {
    // Use first frame to get initial floor
    const firstFrame = frames[0]
    const frameAgent = firstFrame?.agents.find(a => a.id === agent.id)
    const origFloor = frameAgent?.floorId ?? agent.floorId
    initialFloorCounts.set(origFloor, (initialFloorCounts.get(origFloor) ?? 0) + 1)
  }

  const floorResults: FloorEvacResult[] = floors.map(floor => {
    const totalAgents = initialFloorCounts.get(floor.id) ?? 0
    const evacuatedCount = agents.filter(a => {
      const firstFrame = frames[0]
      const frameAgent = firstFrame?.agents.find(fa => fa.id === a.id)
      return (frameAgent?.floorId ?? a.floorId) === floor.id && a.evacuated
    }).length

    const floorBottlenecks = bottlenecks.filter(b => b.floorId === floor.id)

    return {
      floorId: floor.id,
      level: floor.level,
      totalAgents,
      evacuatedCount,
      timeSec: Math.round(time),
      bottlenecks: floorBottlenecks,
    }
  })

  // 7. Check NF S 61-938 conformity (< 180s)
  const totalTimeSec = Math.round(time)
  const conformNFS61938 = totalTimeSec <= 180

  // 8. Recommendations
  const recommendations: string[] = []
  if (!conformNFS61938) {
    recommendations.push(
      `Temps d'evacuation ${totalTimeSec}s > 180s — non-conforme NF S 61-938`
    )
  }
  if (bottlenecks.length > 0) {
    const worstBottleneck = bottlenecks.reduce((worst, b) =>
      b.waitTimeSec > worst.waitTimeSec ? b : worst
    , bottlenecks[0])
    recommendations.push(
      `${bottlenecks.length} goulot(s) d'etranglement — le pire a ${worstBottleneck.entityId} (attente ${worstBottleneck.waitTimeSec}s)`
    )
  }
  const unevacuated = agents.filter(a => !a.evacuated).length
  if (unevacuated > 0) {
    recommendations.push(
      `${unevacuated} personne(s) non evacuee(s) — verifier les sorties de secours`
    )
  }
  if (activeExits.length < 2) {
    recommendations.push(
      'Moins de 2 sorties de secours actives — non-conforme NF S 61-938'
    )
  }

  return {
    totalTimeSec,
    conformNFS61938,
    bottlenecks,
    frames,
    recommendations,
    floorResults,
  }
}

// ═══ UTILITAIRES ═══

function assignNearestTarget(
  agent: EvacAgent,
  exits: Door[],
  transitions: TransitionNode[],
  floors: Floor[]
): void {
  const floor = floors.find(f => f.id === agent.floorId)
  if (!floor) return

  // Try same-floor exits first
  const sameFloorExits = exits.filter(e => e.floorId === agent.floorId)

  if (sameFloorExits.length > 0) {
    let nearest = sameFloorExits[0]
    let minDist = Infinity

    for (const exit of sameFloorExits) {
      const d = calcDistance(agent.x, agent.y, exit.x, exit.y, floor.widthM, floor.heightM)
      if (d < minDist) {
        minDist = d
        nearest = exit
      }
    }

    agent.targetX = nearest.x
    agent.targetY = nearest.y
    agent.targetFloorId = agent.floorId
    return
  }

  // No exit on this floor — find transition to a floor with exits
  const floorsWithExits = new Set(exits.map(e => e.floorId))
  const validTransitions = transitions.filter(t => {
    if (t.fromFloor !== floor.level) return false
    const targetFloor = floors.find(f => f.level === t.toFloor)
    return targetFloor ? floorsWithExits.has(targetFloor.id) : false
  })

  if (validTransitions.length > 0) {
    let nearest = validTransitions[0]
    let minDist = Infinity

    for (const trans of validTransitions) {
      const d = calcDistance(agent.x, agent.y, trans.x, trans.y, floor.widthM, floor.heightM)
      if (d < minDist) {
        minDist = d
        nearest = trans
      }
    }

    agent.targetX = nearest.x
    agent.targetY = nearest.y
    const targetFloor = floors.find(f => f.level === nearest.toFloor)
    agent.targetFloorId = targetFloor?.id ?? agent.floorId
    return
  }

  // Fallback — any transition
  if (transitions.length > 0) {
    let nearest = transitions[0]
    let minDist = Infinity

    for (const trans of transitions) {
      const d = calcDistance(agent.x, agent.y, trans.x, trans.y, floor.widthM, floor.heightM)
      if (d < minDist) {
        minDist = d
        nearest = trans
      }
    }

    agent.targetX = nearest.x
    agent.targetY = nearest.y
    const targetFloor = floors.find(f => f.level === nearest.toFloor)
    agent.targetFloorId = targetFloor?.id ?? agent.floorId
  }
}

function pseudoRandom(seed: number): number {
  // Simple hash-based pseudo-random for deterministic agent placement
  let x = seed
  x ^= x << 13
  x ^= x >> 17
  x ^= x << 5
  return ((x >>> 0) % 10000) / 10000
}
