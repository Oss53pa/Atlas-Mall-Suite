// ═══ COVERAGE SOLVER WORKER — Multi-floor camera placement optimizer ═══

// Minimal types for worker context
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
  coverageScore?: number
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

interface SolverInput {
  floors: Floor[]
  existingCameras: Camera[]
  zones: Zone[]
  targetCoverage: number   // default 95
  maxCams: number          // default 120
  gridResolution?: number  // default 25
}

interface CoverageMapCell {
  x: number
  y: number
  covered: boolean
  cameraCount: number
  zoneId: string
}

interface Redundancy {
  cameraId: string
  overlapPercent: number
  removable: boolean
}

interface SolverOutput {
  cameras: Camera[]
  coverageByFloor: Record<string, number>
  totalCoverage: number
  coverageMap: CoverageMapCell[]
  redundancies: Redundancy[]
}

interface ProgressMessage {
  type: 'progress'
  percent: number
}

interface ResultMessage {
  type: 'result'
  data: SolverOutput
}

interface ErrorMessage {
  type: 'error'
  message: string
}

type OutMessage = ProgressMessage | ResultMessage | ErrorMessage

// ═══ CRITICAL ZONE TYPES ═══

const CRITICAL_ZONE_TYPES = new Set([
  'financier', 'technique', 'backoffice', 'sortie_secours',
])

// ═══ GEOMETRY HELPERS ═══

function calcDistance(
  x1: number, y1: number, x2: number, y2: number,
  widthM: number, heightM: number
): number {
  const dx = (x2 - x1) * widthM
  const dy = (y2 - y1) * heightM
  return Math.sqrt(dx * dx + dy * dy)
}

function isCellCovered(
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

function computeFloorCoverage(
  zones: Zone[],
  cameras: Camera[],
  floorId: string,
  widthM: number,
  heightM: number,
  gridRes: number
): number {
  const floorZones = zones.filter(z => z.floorId === floorId)
  const floorCameras = cameras.filter(c => c.floorId === floorId)

  if (floorZones.length === 0) return 0

  let coveredCells = 0
  let totalCells = 0

  for (const zone of floorZones) {
    for (let xi = 0; xi < gridRes; xi++) {
      for (let yi = 0; yi < gridRes; yi++) {
        const px = zone.x + ((xi + 0.5) / gridRes) * zone.w
        const py = zone.y + ((yi + 0.5) / gridRes) * zone.h
        totalCells++

        if (floorCameras.some(cam => isCellCovered(px, py, cam, widthM, heightM))) {
          coveredCells++
        }
      }
    }
  }

  return totalCells > 0 ? (coveredCells / totalCells) * 100 : 0
}

// ═══ HEAT SCORE COMPUTATION ═══

interface GridCell {
  x: number
  y: number
  covered: boolean
  heatScore: number
  zoneId: string
  zoneNiveau: number
  zoneType: string
}

function buildGrid(
  floor: Floor,
  zones: Zone[],
  cameras: Camera[],
  gridRes: number
): GridCell[] {
  const floorZones = zones.filter(z => z.floorId === floor.id)
  const floorCameras = cameras.filter(c => c.floorId === floor.id)
  const cells: GridCell[] = []

  for (const zone of floorZones) {
    for (let xi = 0; xi < gridRes; xi++) {
      for (let yi = 0; yi < gridRes; yi++) {
        const px = zone.x + ((xi + 0.5) / gridRes) * zone.w
        const py = zone.y + ((yi + 0.5) / gridRes) * zone.h

        const covered = floorCameras.some(cam =>
          isCellCovered(px, py, cam, floor.widthM, floor.heightM)
        )

        // Heat score: zone.niveau * 2 + (1 if critical zone type)
        const heatScore = covered
          ? 0
          : zone.niveau * 2 + (CRITICAL_ZONE_TYPES.has(zone.type) ? 1 : 0)

        cells.push({
          x: px,
          y: py,
          covered,
          heatScore,
          zoneId: zone.id,
          zoneNiveau: zone.niveau,
          zoneType: zone.type,
        })
      }
    }
  }

  return cells
}

function findZoneCentroid(zoneId: string, zones: Zone[]): { x: number; y: number } {
  const zone = zones.find(z => z.id === zoneId)
  if (!zone) return { x: 0.5, y: 0.5 }
  return { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 }
}

function computeOverlap(
  cam: Camera,
  allCameras: Camera[],
  floor: Floor,
  zones: Zone[],
  gridRes: number
): number {
  const floorZones = zones.filter(z => z.floorId === floor.id)
  const otherCameras = allCameras.filter(c => c.id !== cam.id && c.floorId === floor.id)

  if (otherCameras.length === 0) return 0

  let coveredByCam = 0
  let coveredByOthers = 0

  for (const zone of floorZones) {
    for (let xi = 0; xi < gridRes; xi++) {
      for (let yi = 0; yi < gridRes; yi++) {
        const px = zone.x + ((xi + 0.5) / gridRes) * zone.w
        const py = zone.y + ((yi + 0.5) / gridRes) * zone.h

        const byCam = isCellCovered(px, py, cam, floor.widthM, floor.heightM)
        if (byCam) {
          coveredByCam++
          const byOther = otherCameras.some(c =>
            isCellCovered(px, py, c, floor.widthM, floor.heightM)
          )
          if (byOther) coveredByOthers++
        }
      }
    }
  }

  return coveredByCam > 0 ? (coveredByOthers / coveredByCam) * 100 : 0
}

// ═══ COVERAGE MAP BUILDER ═══

function buildCoverageMap(
  floors: Floor[],
  zones: Zone[],
  cameras: Camera[],
  gridRes: number
): CoverageMapCell[] {
  const cells: CoverageMapCell[] = []

  for (const floor of floors) {
    const floorZones = zones.filter(z => z.floorId === floor.id)
    const floorCameras = cameras.filter(c => c.floorId === floor.id)

    for (const zone of floorZones) {
      for (let xi = 0; xi < gridRes; xi++) {
        for (let yi = 0; yi < gridRes; yi++) {
          const px = zone.x + ((xi + 0.5) / gridRes) * zone.w
          const py = zone.y + ((yi + 0.5) / gridRes) * zone.h

          let cameraCount = 0
          for (const cam of floorCameras) {
            if (isCellCovered(px, py, cam, floor.widthM, floor.heightM)) {
              cameraCount++
            }
          }

          cells.push({
            x: px,
            y: py,
            covered: cameraCount > 0,
            cameraCount,
            zoneId: zone.id,
          })
        }
      }
    }
  }

  return cells
}

// ═══ SOLVER ═══

function solve(input: SolverInput): SolverOutput {
  const {
    floors,
    existingCameras,
    zones,
    targetCoverage = 95,
    maxCams = 120,
    gridResolution: gridRes = 25,
  } = input
  const allCameras: Camera[] = [...existingCameras]
  let camIndex = existingCameras.length + 1
  const totalFloors = floors.length

  // Phase 1: Greedy placement per floor
  for (let fi = 0; fi < totalFloors; fi++) {
    const floor = floors[fi]
    const floorZones = zones.filter(z => z.floorId === floor.id)
    if (floorZones.length === 0) continue

    let iteration = 0
    const maxIterations = maxCams - allCameras.length

    while (iteration < maxIterations) {
      const currentCoverage = computeFloorCoverage(
        zones, allCameras, floor.id, floor.widthM, floor.heightM, gridRes
      )
      if (currentCoverage >= targetCoverage) break

      const grid = buildGrid(floor, zones, allCameras, gridRes)
      const uncoveredCells = grid.filter(c => !c.covered)
      if (uncoveredCells.length === 0) break

      // Find cell with max heat score
      let maxCell = uncoveredCells[0]
      for (let i = 1; i < uncoveredCells.length; i++) {
        if (uncoveredCells[i].heatScore > maxCell.heatScore) {
          maxCell = uncoveredCells[i]
        }
      }

      // Orient toward zone centroid
      const centroid = findZoneCentroid(maxCell.zoneId, zones)
      const angleRad = Math.atan2(
        (centroid.y - maxCell.y) * floor.heightM,
        (centroid.x - maxCell.x) * floor.widthM
      )
      const angleDeg = angleRad * (180 / Math.PI)

      const defaultRangeM = 12
      const defaultFov = 109

      const newCam: Camera = {
        id: `cam-solver-${floor.id}-${camIndex}`,
        floorId: floor.id,
        label: `CS${String(camIndex).padStart(3, '0')}`,
        model: 'XNV-8080R',
        x: maxCell.x,
        y: maxCell.y,
        angle: angleDeg,
        fov: defaultFov,
        range: defaultRangeM / floor.widthM,
        rangeM: defaultRangeM,
        color: maxCell.zoneNiveau >= 4 ? '#ef4444' : '#3b82f6',
        priority: maxCell.zoneNiveau >= 4 ? 'critique' : maxCell.zoneNiveau >= 3 ? 'haute' : 'normale',
        capexFcfa: 850_000,
        autoPlaced: true,
      }

      allCameras.push(newCam)
      camIndex++
      iteration++

      // Progress update
      const progressBase = (fi / totalFloors) * 70
      const progressStep = (iteration / maxIterations) * (70 / totalFloors)
      postOut({ type: 'progress', percent: Math.round(progressBase + progressStep) })
    }
  }

  // Phase 2: Force coverage on transition nodes
  for (const floor of floors) {
    for (const transition of floor.transitions) {
      const covered = allCameras.some(c =>
        c.floorId === floor.id &&
        isCellCovered(transition.x, transition.y, c, floor.widthM, floor.heightM)
      )

      if (!covered && allCameras.length < maxCams) {
        const newCam: Camera = {
          id: `cam-solver-trans-${transition.id}-${camIndex}`,
          floorId: floor.id,
          label: `CT${String(camIndex).padStart(3, '0')}`,
          model: 'QNV-8080R',
          x: transition.x,
          y: transition.y,
          angle: 0,
          fov: 109,
          range: 10 / floor.widthM,
          rangeM: 10,
          color: '#f59e0b',
          priority: 'haute',
          capexFcfa: 920_000,
          autoPlaced: true,
        }
        allCameras.push(newCam)
        camIndex++
      }
    }
  }

  postOut({ type: 'progress', percent: 75 })

  // Phase 3: Post-optimize — remove redundant cameras (overlap > 80%)
  const optimizedCameras: Camera[] = [...existingCameras]
  const newCameras = allCameras.filter(c => !existingCameras.some(ec => ec.id === c.id))
  const redundancies: Redundancy[] = []

  for (const cam of newCameras) {
    const floor = floors.find(f => f.id === cam.floorId)
    if (!floor) {
      optimizedCameras.push(cam)
      continue
    }

    const overlap = computeOverlap(cam, optimizedCameras, floor, zones, gridRes)
    if (overlap >= 80) {
      redundancies.push({
        cameraId: cam.id,
        overlapPercent: Math.round(overlap * 10) / 10,
        removable: true,
      })
    } else {
      optimizedCameras.push(cam)
      if (overlap > 50) {
        redundancies.push({
          cameraId: cam.id,
          overlapPercent: Math.round(overlap * 10) / 10,
          removable: false,
        })
      }
    }
  }

  postOut({ type: 'progress', percent: 85 })

  // Build coverage map
  const coverageMap = buildCoverageMap(floors, zones, optimizedCameras, gridRes)

  postOut({ type: 'progress', percent: 92 })

  // Compute final coverage
  const coverageByFloor: Record<string, number> = {}
  let totalCoverageSum = 0
  let floorCount = 0

  for (const floor of floors) {
    const cov = computeFloorCoverage(
      zones, optimizedCameras, floor.id, floor.widthM, floor.heightM, gridRes
    )
    coverageByFloor[floor.id] = Math.round(cov * 10) / 10
    totalCoverageSum += cov
    floorCount++
  }

  const totalCov = floorCount > 0 ? Math.round((totalCoverageSum / floorCount) * 10) / 10 : 0

  return {
    cameras: optimizedCameras,
    coverageByFloor,
    totalCoverage: totalCov,
    coverageMap,
    redundancies,
  }
}

function postOut(msg: OutMessage): void {
  self.postMessage(msg)
}

// ═══ MESSAGE HANDLER ═══

self.onmessage = (e: MessageEvent<SolverInput>) => {
  try {
    const result = solve(e.data)
    postOut({ type: 'progress', percent: 100 })
    postOut({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown error in coverageSolver worker',
    })
  }
}
