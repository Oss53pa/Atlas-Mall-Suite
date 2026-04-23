// ═══ CAMERA COVERAGE ENGINE ═══
// Computes CCTV coverage + blind spots from placed cameras and plan geometry.
// Algorithm:
// 1. Rasterize plan bounds into a grid (cells of ~0.5m)
// 2. For each camera, mark cells inside its FOV cone as covered
// 3. Check which cells fall inside space polygons (only count interior space)
// 4. Merge adjacent uncovered interior cells → blind spot rectangles

export interface Camera {
  id: string
  x: number // metres
  y: number // metres
  angle: number // degrees (0 = +X, counterclockwise)
  fov: number // degrees
  rangeM: number // metres
  floorId: string
  priority?: 'normale' | 'haute' | 'critique'
}

export interface Space {
  id: string
  polygon: [number, number][] // metres
  areaSqm: number
  floorId?: string
  type?: string
}

export interface BlindSpotRect {
  id: string
  floorId: string
  x: number
  y: number
  w: number
  h: number
  areaSqm: number
  severity: 'normal' | 'elevee' | 'critique'
}

export interface CoverageResult {
  /** Total surveillable interior area (sum of space areas) */
  totalAreaSqm: number
  /** Covered interior area */
  coveredAreaSqm: number
  /** Percentage 0-100 */
  coveragePercent: number
  /** Detected blind spot rectangles */
  blindSpots: BlindSpotRect[]
  /** Cameras grouped with their individual coverage area */
  perCamera: Array<{ id: string; areaSqm: number; overlap: number }>
}

/** Point-in-polygon ray casting */
function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/** Compute coverage for a single floor */
export function computeCoverage(
  cameras: Camera[],
  spaces: Space[],
  floorId: string,
  planBounds: { width: number; height: number },
  options: { gridSize?: number } = {},
): CoverageResult {
  const gridSize = options.gridSize ?? Math.max(0.5, Math.min(planBounds.width, planBounds.height) / 300)
  const cols = Math.ceil(planBounds.width / gridSize)
  const rows = Math.ceil(planBounds.height / gridSize)

  const floorCameras = cameras.filter(c => c.floorId === floorId)
  const floorSpaces = spaces.filter(s => !s.floorId || s.floorId === floorId)

  // Grid flags: 0 = empty/outside, 1 = interior, 2 = covered
  const flags = new Uint8Array(cols * rows)

  // Mark interior cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * gridSize + gridSize / 2
      const py = r * gridSize + gridSize / 2
      for (const sp of floorSpaces) {
        if (pointInPolygon(px, py, sp.polygon)) {
          flags[r * cols + c] = 1
          break
        }
      }
    }
  }

  const interiorCount = flags.reduce((s, v) => s + (v >= 1 ? 1 : 0), 0)
  const totalAreaSqm = interiorCount * gridSize * gridSize

  // Per-camera coverage
  const perCamera: Array<{ id: string; areaSqm: number; overlap: number }> = []

  for (const cam of floorCameras) {
    let camCells = 0
    let overlapCells = 0
    const angleRad = (cam.angle * Math.PI) / 180
    const halfFov = (cam.fov * Math.PI) / 180 / 2
    const rangeSq = cam.rangeM * cam.rangeM

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (flags[idx] < 1) continue // Not interior

        const px = c * gridSize + gridSize / 2
        const py = r * gridSize + gridSize / 2
        const dx = px - cam.x
        const dy = py - cam.y
        const distSq = dx * dx + dy * dy
        if (distSq > rangeSq) continue

        // Angle check
        const pointAngle = Math.atan2(dy, dx)
        let delta = pointAngle - angleRad
        while (delta > Math.PI) delta -= Math.PI * 2
        while (delta < -Math.PI) delta += Math.PI * 2
        if (Math.abs(delta) > halfFov) continue

        if (flags[idx] === 2) overlapCells++
        else flags[idx] = 2
        camCells++
      }
    }

    perCamera.push({
      id: cam.id,
      areaSqm: camCells * gridSize * gridSize,
      overlap: overlapCells * gridSize * gridSize,
    })
  }

  const coveredCount = flags.reduce((s, v) => s + (v === 2 ? 1 : 0), 0)
  const coveredAreaSqm = coveredCount * gridSize * gridSize
  const coveragePercent = totalAreaSqm > 0 ? (coveredAreaSqm / totalAreaSqm) * 100 : 0

  // Detect blind spots: connected components of uncovered interior cells (flag === 1)
  const visited = new Uint8Array(cols * rows)
  const blindSpots: BlindSpotRect[] = []
  let bsIdx = 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (flags[idx] !== 1 || visited[idx]) continue

      // BFS flood-fill
      const queue: number[] = [idx]
      visited[idx] = 1
      let minR = r, maxR = r, minC = c, maxC = c
      let cellCount = 0

      while (queue.length) {
        const ci = queue.shift()!
        const cr = Math.floor(ci / cols)
        const cc = ci % cols
        if (cr < minR) minR = cr
        if (cr > maxR) maxR = cr
        if (cc < minC) minC = cc
        if (cc > maxC) maxC = cc
        cellCount++

        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nr = cr + dr, nc = cc + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
          const ni = nr * cols + nc
          if (flags[ni] !== 1 || visited[ni]) continue
          visited[ni] = 1
          queue.push(ni)
        }
      }

      const areaSqm = cellCount * gridSize * gridSize
      // Skip tiny blind spots (< 2m²) — likely noise
      if (areaSqm < 2) continue

      const x = minC * gridSize
      const y = minR * gridSize
      const w = (maxC - minC + 1) * gridSize
      const h = (maxR - minR + 1) * gridSize

      // Severity based on size
      const severity: BlindSpotRect['severity'] = areaSqm > 50 ? 'critique'
        : areaSqm > 20 ? 'elevee'
        : 'normal'

      blindSpots.push({
        id: `blind-${floorId}-${bsIdx++}`,
        floorId,
        x, y, w, h,
        areaSqm,
        severity,
      })
    }
  }

  return {
    totalAreaSqm,
    coveredAreaSqm,
    coveragePercent,
    blindSpots,
    perCamera,
  }
}

/** Compute coverage for all floors */
export function computeAllFloorsCoverage(
  cameras: Camera[],
  spaces: Space[],
  floors: Array<{ id: string; width: number; height: number }>,
): Record<string, CoverageResult> {
  const result: Record<string, CoverageResult> = {}
  for (const floor of floors) {
    result[floor.id] = computeCoverage(cameras, spaces, floor.id, {
      width: floor.width,
      height: floor.height,
    })
  }
  return result
}
