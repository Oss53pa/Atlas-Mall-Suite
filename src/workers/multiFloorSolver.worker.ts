// ═══ MULTI-FLOOR SOLVER WORKER — Vertical propagation of recalculations ═══

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

interface Camera {
  id: string
  floorId: string
  label: string
  model: string
  x: number
  y: number
  angle: number
  fov: number
  range: number
  rangeM: number
  color: string
  priority: 'normale' | 'haute' | 'critique'
  capexFcfa: number
  autoPlaced: boolean
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

interface MultiFloorInput {
  trigger: string
  floors: Floor[]
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  transitions: TransitionNode[]
}

interface MultiFloorOutput {
  coverageByFloor: Record<string, number>
  crossFloorIssues: string[]
  affectedFloors: string[]
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

function isCovered(
  px: number, py: number,
  cam: Camera,
  floorWidthM: number, floorHeightM: number
): boolean {
  const dist = calcDistance(px, py, cam.x, cam.y, floorWidthM, floorHeightM)
  if (dist > cam.rangeM) return false

  const angleToPoint = Math.atan2(
    (py - cam.y) * floorHeightM,
    (px - cam.x) * floorWidthM
  ) * (180 / Math.PI)

  const normalizedAngle = ((angleToPoint - cam.angle + 540) % 360) - 180
  return Math.abs(normalizedAngle) <= cam.fov / 2
}

// ═══ COVERAGE COMPUTATION ═══

const GRID_RESOLUTION = 25

function computeFloorCoverage(
  zones: Zone[],
  cameras: Camera[],
  floorId: string,
  widthM: number,
  heightM: number
): number {
  const floorZones = zones.filter(z => z.floorId === floorId)
  const floorCameras = cameras.filter(c => c.floorId === floorId)

  if (floorZones.length === 0) return 0

  let coveredCells = 0
  let totalCells = 0

  for (const zone of floorZones) {
    for (let xi = 0; xi < GRID_RESOLUTION; xi++) {
      for (let yi = 0; yi < GRID_RESOLUTION; yi++) {
        const px = zone.x + ((xi + 0.5) / GRID_RESOLUTION) * zone.w
        const py = zone.y + ((yi + 0.5) / GRID_RESOLUTION) * zone.h
        totalCells++

        if (floorCameras.some(cam => isCovered(px, py, cam, widthM, heightM))) {
          coveredCells++
        }
      }
    }
  }

  return totalCells > 0 ? Math.round((coveredCells / totalCells) * 1000) / 10 : 0
}

// ═══ TRIGGER ANALYSIS ═══

function determineAffectedFloors(
  trigger: string,
  floors: Floor[],
  zones: Zone[],
  cameras: Camera[],
  transitions: TransitionNode[]
): string[] {
  // Parse trigger to find entity references
  const affected = new Set<string>()

  // Trigger formats: "camera_moved:cam-id", "zone_changed:zone-id", "full_recalc", etc.
  const [triggerType, entityId] = trigger.split(':')

  switch (triggerType) {
    case 'camera_moved':
    case 'camera_added':
    case 'camera_deleted': {
      const cam = cameras.find(c => c.id === entityId)
      if (cam) {
        affected.add(cam.floorId)
        // Adjacent floors via transitions may be affected
        const floor = floors.find(f => f.id === cam.floorId)
        if (floor) {
          for (const trans of transitions) {
            if (trans.fromFloor === floor.level || trans.toFloor === floor.level) {
              const adjFloor = floors.find(f =>
                f.level === (trans.fromFloor === floor.level ? trans.toFloor : trans.fromFloor)
              )
              if (adjFloor) affected.add(adjFloor.id)
            }
          }
        }
      }
      break
    }

    case 'zone_changed': {
      const zone = zones.find(z => z.id === entityId)
      if (zone) {
        affected.add(zone.floorId)
      }
      break
    }

    case 'transition_changed': {
      const trans = transitions.find(t => t.id === entityId)
      if (trans) {
        const fromFloor = floors.find(f => f.level === trans.fromFloor)
        const toFloor = floors.find(f => f.level === trans.toFloor)
        if (fromFloor) affected.add(fromFloor.id)
        if (toFloor) affected.add(toFloor.id)
      }
      break
    }

    case 'door_changed': {
      // Doors can affect evacuation on their floor and connected floors
      const floorId = entityId ? cameras.find(c => c.id === entityId)?.floorId : undefined
      if (floorId) affected.add(floorId)
      // For doors, also check all floors (evacuation is multi-floor)
      for (const floor of floors) {
        affected.add(floor.id)
      }
      break
    }

    case 'floor_imported': {
      if (entityId) {
        affected.add(entityId)
        // Adjacent floors
        const floor = floors.find(f => f.id === entityId)
        if (floor) {
          for (const trans of transitions) {
            if (trans.fromFloor === floor.level || trans.toFloor === floor.level) {
              const adjFloor = floors.find(f =>
                f.level === (trans.fromFloor === floor.level ? trans.toFloor : trans.fromFloor)
              )
              if (adjFloor) affected.add(adjFloor.id)
            }
          }
        }
      }
      break
    }

    case 'full_recalc':
    default:
      for (const floor of floors) {
        affected.add(floor.id)
      }
      break
  }

  return Array.from(affected)
}

// ═══ CROSS-FLOOR ISSUE DETECTION ═══

function detectCrossFloorIssues(
  floors: Floor[],
  zones: Zone[],
  cameras: Camera[],
  transitions: TransitionNode[],
  coverageByFloor: Record<string, number>
): string[] {
  const issues: string[] = []

  // 1. Transition nodes without camera coverage
  for (const trans of transitions) {
    const fromFloor = floors.find(f => f.level === trans.fromFloor)
    const toFloor = floors.find(f => f.level === trans.toFloor)

    if (fromFloor) {
      const fromCameras = cameras.filter(c => c.floorId === fromFloor.id)
      const coveredOnFrom = fromCameras.some(cam =>
        isCovered(trans.x, trans.y, cam, fromFloor.widthM, fromFloor.heightM)
      )
      if (!coveredOnFrom) {
        issues.push(
          `Transition "${trans.label}" (${trans.type}) non couverte sur l'etage ${fromFloor.level} — risque de zone aveugle inter-etages.`
        )
      }
    }

    if (toFloor) {
      const toCameras = cameras.filter(c => c.floorId === toFloor.id)
      const coveredOnTo = toCameras.some(cam =>
        isCovered(trans.x, trans.y, cam, toFloor.widthM, toFloor.heightM)
      )
      if (!coveredOnTo) {
        issues.push(
          `Transition "${trans.label}" (${trans.type}) non couverte sur l'etage ${toFloor.level} — risque de zone aveugle inter-etages.`
        )
      }
    }
  }

  // 2. Large coverage disparity between adjacent floors
  const sortedFloors = [...floors].sort((a, b) => a.order - b.order)
  for (let i = 0; i < sortedFloors.length - 1; i++) {
    const floorA = sortedFloors[i]
    const floorB = sortedFloors[i + 1]
    const covA = coverageByFloor[floorA.id] ?? 0
    const covB = coverageByFloor[floorB.id] ?? 0

    if (Math.abs(covA - covB) > 20) {
      const lowFloor = covA < covB ? floorA : floorB
      const highFloor = covA < covB ? floorB : floorA
      const lowCov = Math.min(covA, covB)
      const highCov = Math.max(covA, covB)
      issues.push(
        `Disparite de couverture entre ${lowFloor.level} (${lowCov.toFixed(1)}%) et ${highFloor.level} (${highCov.toFixed(1)}%) — equilibrer les cameras.`
      )
    }
  }

  // 3. Floors with critical zones but low coverage
  for (const floor of floors) {
    const floorZones = zones.filter(z => z.floorId === floor.id)
    const hasCritical = floorZones.some(z => z.niveau >= 4)
    const coverage = coverageByFloor[floor.id] ?? 0

    if (hasCritical && coverage < 85) {
      issues.push(
        `Etage ${floor.level} contient des zones critiques (N4/N5) mais la couverture n'est que de ${coverage.toFixed(1)}% — minimum 85% requis (APSAD R82).`
      )
    }
  }

  // 4. Isolated floors (no transitions connecting them)
  for (const floor of floors) {
    const hasTransitionFrom = transitions.some(t => t.fromFloor === floor.level)
    const hasTransitionTo = transitions.some(t => t.toFloor === floor.level)

    if (!hasTransitionFrom && !hasTransitionTo && floors.length > 1) {
      issues.push(
        `Etage ${floor.level} est isole — aucune transition ne le connecte aux autres etages.`
      )
    }
  }

  // 5. PMR accessibility gaps
  for (const floor of floors) {
    const floorTransitions = transitions.filter(
      t => t.fromFloor === floor.level || t.toFloor === floor.level
    )
    const hasPmrTransition = floorTransitions.some(t => t.pmr)

    if (!hasPmrTransition && floors.length > 1) {
      issues.push(
        `Etage ${floor.level} n'a aucune transition PMR — non conforme accessibilite.`
      )
    }
  }

  return issues
}

// ═══ MAIN SOLVER ═══

function solve(input: MultiFloorInput): MultiFloorOutput {
  const { trigger, floors, zones, cameras, doors, transitions } = input

  self.postMessage({ type: 'progress', percent: 10 })

  // 1. Determine affected floors
  const affectedFloors = determineAffectedFloors(trigger, floors, zones, cameras, transitions)

  self.postMessage({ type: 'progress', percent: 20 })

  // 2. Recalculate coverage per floor
  const coverageByFloor: Record<string, number> = {}

  for (let i = 0; i < floors.length; i++) {
    const floor = floors[i]
    coverageByFloor[floor.id] = computeFloorCoverage(
      zones, cameras, floor.id, floor.widthM, floor.heightM
    )

    const progressPercent = 20 + Math.round(((i + 1) / floors.length) * 50)
    self.postMessage({ type: 'progress', percent: progressPercent })
  }

  // 3. Detect cross-floor issues
  const crossFloorIssues = detectCrossFloorIssues(
    floors, zones, cameras, transitions, coverageByFloor
  )

  self.postMessage({ type: 'progress', percent: 90 })

  return {
    coverageByFloor,
    crossFloorIssues,
    affectedFloors,
  }
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<MultiFloorInput>) => {
  try {
    const result = solve(e.data)
    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in multiFloorSolver worker',
    })
  }
}
