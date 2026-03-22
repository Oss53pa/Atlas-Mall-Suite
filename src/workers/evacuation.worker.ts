// ═══ EVACUATION WORKER — Social Force Model simplified, NF S 61-938 conformance ═══

// Minimal types for worker context
interface Floor {
  id: string
  level: string
  order: number
  widthM: number
  heightM: number
  zones: Zone[]
  transitions: TransitionNode[]
}

interface Zone {
  id: string
  floorId: string
  label: string
  type: string
  x: number
  y: number
  w: number
  h: number
  niveau: 1 | 2 | 3 | 4 | 5
  color: string
  surfaceM2?: number
}

interface Door {
  id: string
  floorId: string
  label: string
  x: number
  y: number
  isExit: boolean
  widthM: number
}

interface TransitionNode {
  id: string
  type: string
  fromFloor: string
  toFloor: string
  x: number
  y: number
  pmr: boolean
  capacityPerMin: number
  label: string
}

interface EvacuationScenario {
  name: string
  originFloorId?: string
  originZoneId?: string
  occupancyMultiplier: number
  disabledExits?: string[]
  disabledTransitions?: string[]
}

interface Bottleneck {
  id: string
  floorId: string
  x: number
  y: number
  entityId: string
  entityType: 'door' | 'transition'
  queueLength: number
  waitTimeSec: number
}

interface EvacuationFrame {
  time: number
  agents: { id: string; floorId: string; x: number; y: number; evacuated: boolean }[]
}

interface FloorEvacResult {
  floorId: string
  level: string
  totalAgents: number
  evacuatedCount: number
  timeSec: number
  bottlenecks: Bottleneck[]
}

interface EvacuationResult {
  totalTimeSec: number
  conformNFS61938: boolean
  bottlenecks: Bottleneck[]
  frames: EvacuationFrame[]
  recommendations: string[]
  floorResults: FloorEvacResult[]
}

interface EvacInput {
  floors: Floor[]
  zones: Zone[]
  doors: Door[]
  transitions: TransitionNode[]
  scenario: EvacuationScenario
  fps?: number  // default 10
}

// ═══ NF S 61-938 FLOW RATES ═══
// 1 UP (Unite de Passage) = 0.60m -> 60 pers/min
// 0.90m -> 90 pers/min
// 1.20m -> 120 pers/min
// Linear interpolation: flowPerMin = widthM * 100

function computeExitFlowPerMin(widthM: number): number {
  if (widthM <= 0.60) return 60
  if (widthM <= 0.90) return 90
  if (widthM <= 1.20) return 120
  // Above 1.20m: scale linearly
  return Math.round(widthM * 100)
}

// ═══ AGENT ═══

interface Agent {
  id: string
  floorId: string
  x: number
  y: number
  targetX: number
  targetY: number
  targetFloorId: string
  targetEntityId: string
  speed: number
  evacuated: boolean
  waitingSince: number
}

// ═══ GEOMETRY ═══

function calcDistance(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

// ═══ TARGET ASSIGNMENT ═══

function assignTarget(
  agent: Agent,
  exits: Door[],
  transitions: TransitionNode[],
  floors: Floor[]
): void {
  const floor = floors.find(f => f.id === agent.floorId)
  if (!floor) return

  // Find exit on same floor
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
    agent.targetEntityId = nearest.id
    return
  }

  // No exit on this floor — find transition to a floor with exits
  const floorsWithExits = new Set(exits.map(e => e.floorId))
  const availableTransitions = transitions.filter(t => {
    if (t.fromFloor !== floor.level) return false
    const targetFloor = floors.find(f => f.level === t.toFloor)
    return targetFloor ? floorsWithExits.has(targetFloor.id) : false
  })

  if (availableTransitions.length > 0) {
    let nearest = availableTransitions[0]
    let minDist = Infinity

    for (const trans of availableTransitions) {
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
    agent.targetEntityId = nearest.id
    return
  }

  // Fallback — any transition
  const floorTransitions = transitions.filter(t => t.fromFloor === floor.level)
  if (floorTransitions.length > 0) {
    let nearest = floorTransitions[0]
    let minDist = Infinity

    for (const trans of floorTransitions) {
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
    agent.targetEntityId = nearest.id
  }
}

// ═══ MAIN SIMULATION ═══

function simulate(input: EvacInput): EvacuationResult {
  const { floors, zones, doors, transitions, scenario, fps: inputFps } = input
  const FPS = inputFps ?? 10
  const FRAME_INTERVAL = 1 / FPS
  const MAX_TIME_SEC = 600

  // Filter active exits and transitions
  const activeExits = doors.filter(d =>
    d.isExit && !scenario.disabledExits?.includes(d.id)
  )
  const activeTransitions = transitions.filter(t =>
    !scenario.disabledTransitions?.includes(t.id)
  )

  // 1. Distribute agents by zone: density = occupancy / surface
  const agents: Agent[] = []
  let agentId = 0

  for (const floor of floors) {
    const floorZones = zones.filter(z => z.floorId === floor.id)

    for (const zone of floorZones) {
      const area = zone.surfaceM2 ?? (zone.w * floor.widthM * zone.h * floor.heightM)
      // ~1 person per 5m2 x multiplier
      const numAgents = Math.max(1, Math.ceil((area / 5) * scenario.occupancyMultiplier))

      for (let i = 0; i < numAgents; i++) {
        const agent: Agent = {
          id: `agent-${agentId++}`,
          floorId: floor.id,
          x: zone.x + Math.random() * zone.w,
          y: zone.y + Math.random() * zone.h,
          targetX: 0,
          targetY: 0,
          targetFloorId: '',
          targetEntityId: '',
          speed: 1.2 + (Math.random() - 0.5) * 0.4, // 1.0-1.4 m/s variation
          evacuated: false,
          waitingSince: -1,
        }
        agents.push(agent)
      }
    }
  }

  // Assign initial targets
  for (const agent of agents) {
    assignTarget(agent, activeExits, activeTransitions, floors)
  }

  // 2. Compute flow capacities per NF S 61-938
  const exitFlowCapPerMin = new Map<string, number>()
  for (const exit of activeExits) {
    exitFlowCapPerMin.set(exit.id, computeExitFlowPerMin(exit.widthM))
  }

  const transFlowCapPerMin = new Map<string, number>()
  for (const trans of activeTransitions) {
    transFlowCapPerMin.set(trans.id, trans.capacityPerMin)
  }

  // 3. Simulate
  const frames: EvacuationFrame[] = []
  const detectedBottlenecks: Bottleneck[] = []

  // Per-second flow counters
  const exitFlowThisSecond = new Map<string, number>()
  const transFlowThisSecond = new Map<string, number>()
  let lastFlowResetTime = 0

  // Bottleneck tracking: entityId -> { lowFlowStartTime, flowInWindow }
  const bottleneckTracker = new Map<string, { lowFlowStartTime: number; flowInWindow: number; lastWindowStart: number }>()

  let time = 0
  const totalAgents = agents.length
  let frameCounter = 0

  while (time < MAX_TIME_SEC) {
    const allEvacuated = agents.every(a => a.evacuated)
    if (allEvacuated) break

    // Reset flow counters each second
    const currentSecond = Math.floor(time)
    if (currentSecond > lastFlowResetTime) {
      // Before resetting, check for bottleneck conditions
      for (const exit of activeExits) {
        const flowThisSec = exitFlowThisSecond.get(exit.id) ?? 0
        const flowPerMin = flowThisSec * 60
        trackBottleneck(exit.id, 'door', exit.floorId, exit.x, exit.y, flowPerMin, time, bottleneckTracker, detectedBottlenecks, agents)
      }
      for (const trans of activeTransitions) {
        const flowThisSec = transFlowThisSecond.get(trans.id) ?? 0
        const flowPerMin = flowThisSec * 60
        const floorId = floors.find(f => f.level === trans.fromFloor)?.id ?? ''
        trackBottleneck(trans.id, 'transition', floorId, trans.x, trans.y, flowPerMin, time, bottleneckTracker, detectedBottlenecks, agents)
      }

      lastFlowResetTime = currentSecond
      exitFlowThisSecond.clear()
      transFlowThisSecond.clear()
    }

    for (const agent of agents) {
      if (agent.evacuated) continue

      const floor = floors.find(f => f.id === agent.floorId)
      if (!floor) continue

      const dx = agent.targetX - agent.x
      const dy = agent.targetY - agent.y
      const distNorm = Math.sqrt(
        (dx * floor.widthM) ** 2 + (dy * floor.heightM) ** 2
      )

      if (distNorm < 0.5) {
        // Arrived at target
        if (agent.targetFloorId !== agent.floorId) {
          // Transition between floors
          const trans = activeTransitions.find(t => t.id === agent.targetEntityId)
          if (trans) {
            const currentFlow = transFlowThisSecond.get(trans.id) ?? 0
            const maxPerSec = trans.capacityPerMin / 60

            if (currentFlow < maxPerSec) {
              transFlowThisSecond.set(trans.id, currentFlow + 1)
              agent.floorId = agent.targetFloorId
              agent.waitingSince = -1
              assignTarget(agent, activeExits, activeTransitions, floors)
            } else {
              // Queuing
              if (agent.waitingSince < 0) agent.waitingSince = time
            }
          }
        } else {
          // Arrived at exit
          const exit = activeExits.find(e => e.id === agent.targetEntityId)
          if (exit) {
            const currentFlow = exitFlowThisSecond.get(exit.id) ?? 0
            const capPerMin = exitFlowCapPerMin.get(exit.id) ?? 60
            const maxPerSec = capPerMin / 60

            if (currentFlow < maxPerSec) {
              exitFlowThisSecond.set(exit.id, currentFlow + 1)
              agent.evacuated = true
              agent.waitingSince = -1
            } else {
              if (agent.waitingSince < 0) agent.waitingSince = time
            }
          } else {
            // Target was a transition on same floor, just reassign
            assignTarget(agent, activeExits, activeTransitions, floors)
          }
        }
      } else {
        // Move toward target
        const moveDistM = agent.speed * FRAME_INTERVAL
        const moveRatio = moveDistM / distNorm

        // Move in normalized coordinates
        const moveX = (dx / (distNorm / (floor.widthM))) * (moveDistM / floor.widthM)
        const moveY = (dy / (distNorm / (floor.heightM))) * (moveDistM / floor.heightM)

        agent.x = Math.max(0, Math.min(1, agent.x + moveX))
        agent.y = Math.max(0, Math.min(1, agent.y + moveY))
      }
    }

    // Generate frame at given FPS
    frameCounter++
    if (frameCounter % 1 === 0) {
      frames.push({
        time: Math.round(time * 100) / 100,
        agents: agents.map(a => ({
          id: a.id,
          floorId: a.floorId,
          x: a.x,
          y: a.y,
          evacuated: a.evacuated,
        })),
      })
    }

    time += FRAME_INTERVAL

    // Progress
    const evacuatedCount = agents.filter(a => a.evacuated).length
    const progressPercent = Math.round((evacuatedCount / Math.max(1, totalAgents)) * 90)
    if (frameCounter % (FPS * 5) === 0) {
      self.postMessage({ type: 'progress', percent: Math.min(95, progressPercent) })
    }
  }

  // 4. Floor results
  const floorResults: FloorEvacResult[] = floors.map(floor => {
    const initialFrame = frames[0]
    const floorAgentIds = new Set(
      initialFrame
        ? initialFrame.agents.filter(a => a.floorId === floor.id).map(a => a.id)
        : []
    )
    const floorAgents = agents.filter(a => floorAgentIds.has(a.id))
    const floorBottlenecks = detectedBottlenecks.filter(b => b.floorId === floor.id)

    return {
      floorId: floor.id,
      level: floor.level,
      totalAgents: floorAgents.length,
      evacuatedCount: floorAgents.filter(a => a.evacuated).length,
      timeSec: Math.round(time),
      bottlenecks: floorBottlenecks,
    }
  })

  // 5. Conformity check: ERP type M -> must evacuate in < 3 min (180s)
  const totalTimeSec = Math.round(time)
  const conformNFS61938 = totalTimeSec <= 180

  // 6. Recommendations
  const recommendations: string[] = []

  if (!conformNFS61938) {
    recommendations.push(
      `Temps d'evacuation ${totalTimeSec}s depasse les 180s — non conforme NF S 61-938 pour ERP type M.`
    )
  }

  if (detectedBottlenecks.length > 0) {
    recommendations.push(
      `${detectedBottlenecks.length} goulot(s) d'etranglement detecte(s) — envisager l'elargissement des passages.`
    )
    for (const bn of detectedBottlenecks) {
      if (bn.entityType === 'door') {
        const door = activeExits.find(d => d.id === bn.entityId)
        if (door && door.widthM < 1.20) {
          recommendations.push(
            `Sortie "${door.label}" (${door.widthM}m) : elargir a 1.40m minimum pour augmenter le debit a 140 pers/min.`
          )
        }
      }
    }
  }

  const unevacuated = agents.filter(a => !a.evacuated).length
  if (unevacuated > 0) {
    recommendations.push(
      `${unevacuated} personne(s) non evacuee(s) sur ${totalAgents} — verifier les sorties de secours et transitions.`
    )
  }

  for (const floor of floors) {
    const floorExits = activeExits.filter(e => e.floorId === floor.id)
    if (floorExits.length === 0) {
      const floorTransitions = activeTransitions.filter(
        t => t.fromFloor === floor.level
      )
      if (floorTransitions.length === 0) {
        recommendations.push(
          `Etage ${floor.level} : aucune sortie ni transition active — agents bloques.`
        )
      }
    }
  }

  // PMR check
  for (const floor of floors) {
    const floorTransitions = activeTransitions.filter(
      t => t.fromFloor === floor.level || t.toFloor === floor.level
    )
    const hasPmr = floorTransitions.some(t => t.pmr)
    if (!hasPmr && floors.length > 1) {
      recommendations.push(
        `Etage ${floor.level} : aucune transition PMR disponible pour l'evacuation.`
      )
    }
  }

  self.postMessage({ type: 'progress', percent: 100 })

  return {
    totalTimeSec,
    conformNFS61938,
    bottlenecks: detectedBottlenecks,
    frames,
    recommendations,
    floorResults,
  }
}

// ═══ BOTTLENECK TRACKING ═══
// Detect blockages: < 10 pers/min for > 30s

function trackBottleneck(
  entityId: string,
  entityType: 'door' | 'transition',
  floorId: string,
  x: number,
  y: number,
  flowPerMin: number,
  time: number,
  tracker: Map<string, { lowFlowStartTime: number; flowInWindow: number; lastWindowStart: number }>,
  detectedBottlenecks: Bottleneck[],
  agents: Agent[]
): void {
  // Only track if there are agents waiting at this entity
  const waitingAgents = agents.filter(
    a => !a.evacuated && a.targetEntityId === entityId && a.waitingSince >= 0
  )
  if (waitingAgents.length === 0) {
    tracker.delete(entityId)
    return
  }

  const existing = tracker.get(entityId)
  if (flowPerMin < 10) {
    if (!existing) {
      tracker.set(entityId, { lowFlowStartTime: time, flowInWindow: flowPerMin, lastWindowStart: time })
    } else {
      const duration = time - existing.lowFlowStartTime
      if (duration > 30) {
        const alreadyDetected = detectedBottlenecks.some(b => b.entityId === entityId)
        if (!alreadyDetected) {
          detectedBottlenecks.push({
            id: `bn-${entityId}`,
            floorId,
            x,
            y,
            entityId,
            entityType,
            queueLength: waitingAgents.length,
            waitTimeSec: Math.round(duration),
          })
        }
      }
    }
  } else {
    // Flow recovered, reset tracker
    tracker.delete(entityId)
  }
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<EvacInput>) => {
  try {
    const result = simulate(e.data)
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in evacuation worker',
    })
  }
}
