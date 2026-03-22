// ═══ MONTE CARLO WORKER — Security resilience simulation ═══

// Minimal types for worker context
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

interface Floor {
  id: string
  level: string
  order: number
  widthM: number
  heightM: number
  zones: Zone[]
  transitions: TransitionNode[]
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

type SecurityScenario =
  | 'vol_etalage' | 'intrusion_nocturne' | 'incendie'
  | 'mouvement_foule' | 'pickpocket' | 'agression_parking'

interface MonteCarloInput {
  scenario: SecurityScenario
  cameras: Camera[]
  zones: Zone[]
  floors: Floor[]
  runs: number
}

interface MonteCarloResult {
  scenario: string
  runs: number
  resilienceScore: number
  avgDetectionTimeSec: number
  failureZones: { zoneId: string; failureRate: number }[]
  heatmapData: number[][]
}

// ═══ SCENARIO CONFIG ═══

const SCENARIO_CONFIG: Record<SecurityScenario, {
  label: string
  targetZoneTypes: string[]
  detectionThresholdSec: number
}> = {
  vol_etalage: {
    label: "Vol a l'etalage",
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

// ═══ GEOMETRY ═══

function calcDistance(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

function isInFOV(
  px: number, py: number,
  cam: Camera,
  floorWidthM: number, floorHeightM: number
): boolean {
  const angleToPoint = Math.atan2(
    (py - cam.y) * floorHeightM,
    (px - cam.x) * floorWidthM
  ) * (180 / Math.PI)

  const normalizedAngle = ((angleToPoint - cam.angle + 540) % 360) - 180
  return Math.abs(normalizedAngle) <= cam.fov / 2
}

// ═══ SEEDED RANDOM ═══

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ═══ SIMULATION ═══

const HEATMAP_SIZE = 25

function runSimulation(input: MonteCarloInput): MonteCarloResult {
  const { scenario, cameras, zones, floors, runs } = input
  const config = SCENARIO_CONFIG[scenario]

  const targetZones = zones.filter(z => config.targetZoneTypes.includes(z.type))

  if (targetZones.length === 0) {
    return {
      scenario: config.label,
      runs,
      resilienceScore: 100,
      avgDetectionTimeSec: 0,
      failureZones: [],
      heatmapData: Array.from({ length: HEATMAP_SIZE }, () => Array(HEATMAP_SIZE).fill(0) as number[]),
    }
  }

  let successCount = 0
  let totalDetectionTime = 0
  const zoneFailures = new Map<string, number>()

  // Heatmap: detection failures
  const heatmap: number[][] = Array.from(
    { length: HEATMAP_SIZE },
    () => Array(HEATMAP_SIZE).fill(0) as number[]
  )

  const rng = mulberry32(42)

  for (let run = 0; run < runs; run++) {
    // Progress every 100 runs
    if (run % 100 === 0) {
      self.postMessage({ type: 'progress', percent: Math.round((run / runs) * 90) })
    }

    // 1. Random incident in a target zone
    const zone = targetZones[Math.floor(rng() * targetZones.length)]
    const floor = floors.find(f => f.id === zone.floorId)
    if (!floor) continue

    const ix = zone.x + rng() * zone.w
    const iy = zone.y + rng() * zone.h

    // 2. Detection by cameras
    const floorCameras = cameras.filter(c => c.floorId === floor.id)
    let detected = false
    let bestDetectionTime = config.detectionThresholdSec + 1

    for (const cam of floorCameras) {
      const d = calcDistance(ix, iy, cam.x, cam.y, floor.widthM, floor.heightM)
      const inFov = isInFOV(ix, iy, cam, floor.widthM, floor.heightM)

      // P_detection = exp(-d^2 / (2 * range^2)) * (inFOV ? 1 : 0.1)
      const pBase = Math.exp(-(d * d) / (2 * cam.rangeM * cam.rangeM))
      const pDetection = pBase * (inFov ? 1.0 : 0.1)

      if (rng() < pDetection) {
        detected = true
        // Detection time: proportional to distance + random noise
        const detTime = 2 + d * 0.5 + rng() * 3
        if (detTime < bestDetectionTime) {
          bestDetectionTime = detTime
        }
      }
    }

    // 3. Evaluate
    if (detected && bestDetectionTime <= config.detectionThresholdSec) {
      successCount++
      totalDetectionTime += bestDetectionTime
    } else {
      zoneFailures.set(zone.id, (zoneFailures.get(zone.id) ?? 0) + 1)

      // Mark heatmap
      const hx = Math.min(HEATMAP_SIZE - 1, Math.floor(ix * HEATMAP_SIZE))
      const hy = Math.min(HEATMAP_SIZE - 1, Math.floor(iy * HEATMAP_SIZE))
      heatmap[hy][hx]++
    }
  }

  self.postMessage({ type: 'progress', percent: 95 })

  // Build failure zones sorted by failure rate
  const failureZones = Array.from(zoneFailures.entries())
    .map(([zoneId, count]) => ({
      zoneId,
      failureRate: Math.round((count / runs) * 10000) / 10000,
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

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<MonteCarloInput>) => {
  try {
    const result = runSimulation(e.data)
    self.postMessage({ type: 'progress', percent: 100 })
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in monteCarlo worker',
    })
  }
}
