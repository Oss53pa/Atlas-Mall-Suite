// ═══ COORDINATE ENGINE — Bounds, unit detection, normalization, fitToScreen ═══

import type { Bounds, ViewportState, PlanEntity, ParsedPlan } from './planEngineTypes'

// ─── COMPUTE BOUNDS ───────────────────────────────────────

export function computeBounds(entities: PlanEntity[]): Bounds {
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const entity of entities) {
    const pts = extractAllPoints(entity)
    for (const [x, y] of pts) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  // Guard: no entities
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1, centerX: 0.5, centerY: 0.5 }
  }

  const width = maxX - minX
  const height = maxY - minY
  return {
    minX, minY, maxX, maxY, width, height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  }
}

export function computeBoundsFromPoints(points: [number, number][]): Bounds {
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (!isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, width: 1, height: 1, centerX: 0.5, centerY: 0.5 }
  }
  const width = maxX - minX
  const height = maxY - minY
  return {
    minX, minY, maxX, maxY, width, height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  }
}

function extractAllPoints(entity: PlanEntity): [number, number][] {
  const g = entity.geometry
  switch (g.kind) {
    case 'line':
      return [[g.x1, g.y1], [g.x2, g.y2]]
    case 'polyline':
      return g.vertices.map(v => [v.x, v.y] as [number, number])
    case 'circle':
      return [[g.cx - g.radius, g.cy - g.radius], [g.cx + g.radius, g.cy + g.radius]]
    case 'arc':
      return [[g.cx - g.radius, g.cy - g.radius], [g.cx + g.radius, g.cy + g.radius]]
    case 'text':
      return [[g.x, g.y]]
    case 'dimension':
      return [g.defPoint1, g.defPoint2, g.textPosition]
    case 'hatch':
      return g.boundaries.flatMap(b => b.vertices.map(v => [v.x, v.y] as [number, number]))
    case 'insert':
      return [[g.x, g.y]]
    default:
      return []
  }
}

// ─── UNIT DETECTION & SCALE ──────────────────────────────

/**
 * Detect drawing units from DXF $INSUNITS header + bounds heuristic.
 * Returns a multiplier that converts drawing units → metres.
 */
export function detectUnitScale(insunits: number | undefined, bounds: Bounds): {
  scaleFactor: number
  detectedUnit: 'mm' | 'cm' | 'm' | 'ft' | 'in' | 'unknown'
} {
  // $INSUNITS values:
  // 0 = unitless, 1 = inches, 2 = feet, 4 = mm, 5 = cm, 6 = m
  const knownUnits: Record<number, { scale: number; unit: 'mm' | 'cm' | 'm' | 'ft' | 'in' }> = {
    1: { scale: 0.0254, unit: 'in' },
    2: { scale: 0.3048, unit: 'ft' },
    4: { scale: 0.001, unit: 'mm' },
    5: { scale: 0.01, unit: 'cm' },
    6: { scale: 1.0, unit: 'm' },
  }

  if (insunits !== undefined && insunits in knownUnits) {
    const { scale, unit } = knownUnits[insunits]
    return { scaleFactor: scale, detectedUnit: unit }
  }

  // Heuristic: auto-detect from coordinate range
  return autoDetectScale(bounds)
}

function autoDetectScale(bounds: Bounds): {
  scaleFactor: number
  detectedUnit: 'mm' | 'cm' | 'm' | 'ft' | 'in' | 'unknown'
} {
  const w = bounds.width
  // A mall plan is typically 50m-500m wide
  // If width > 10000 → probably mm → 0.001
  // If width > 1000  → probably cm → 0.01
  // If width > 100   → probably dm/ft → 0.1
  // Otherwise → probably m → 1.0
  if (w > 10000) return { scaleFactor: 0.001, detectedUnit: 'mm' }
  if (w > 1000) return { scaleFactor: 0.01, detectedUnit: 'cm' }
  if (w > 100) return { scaleFactor: 0.1, detectedUnit: 'unknown' }
  return { scaleFactor: 1.0, detectedUnit: 'm' }
}

// ─── COORDINATE NORMALIZATION ─────────────────────────────

/**
 * Translate all coordinates so the plan starts at (0,0) and scale to metres.
 * Also flips Y axis (DWG Y-up → SVG Y-down).
 * @param maxY - the raw maxY bound (before scaling) for Y-flip calculation
 */
export function normalizeEntityBounds(entity: PlanEntity, originX: number, originY: number, scale: number, maxY?: number): PlanEntity {
  const g = entity.geometry
  let newGeom = g
  // When maxY is provided, flip Y axis: DWG Y-up → SVG Y-down
  const ny = (rawY: number) => maxY != null ? (maxY - rawY) * scale : (rawY - originY) * scale
  const nx = (rawX: number) => (rawX - originX) * scale

  switch (g.kind) {
    case 'line':
      newGeom = {
        ...g,
        x1: nx(g.x1),
        y1: ny(g.y1),
        x2: nx(g.x2),
        y2: ny(g.y2),
      }
      break
    case 'polyline':
      newGeom = {
        ...g,
        vertices: g.vertices.map(v => ({
          ...v,
          x: nx(v.x),
          y: ny(v.y),
        })),
      }
      break
    case 'circle':
      newGeom = {
        ...g,
        cx: nx(g.cx),
        cy: ny(g.cy),
        radius: g.radius * scale,
      }
      break
    case 'arc':
      newGeom = {
        ...g,
        cx: nx(g.cx),
        cy: ny(g.cy),
        radius: g.radius * scale,
      }
      break
    case 'text':
      newGeom = {
        ...g,
        x: nx(g.x),
        y: ny(g.y),
        height: g.height * scale,
      }
      break
    case 'dimension':
      newGeom = {
        ...g,
        defPoint1: [nx(g.defPoint1[0]), ny(g.defPoint1[1])],
        defPoint2: [nx(g.defPoint2[0]), ny(g.defPoint2[1])],
        textPosition: [nx(g.textPosition[0]), ny(g.textPosition[1])],
        measurement: g.measurement * scale,
      }
      break
    case 'hatch':
      newGeom = {
        ...g,
        boundaries: g.boundaries.map(b => ({
          ...b,
          vertices: b.vertices.map(v => ({
            x: nx(v.x),
            y: ny(v.y),
          })),
        })),
      }
      break
    case 'insert':
      newGeom = {
        ...g,
        x: nx(g.x),
        y: ny(g.y),
      }
      break
  }

  // Recompute bounds after normalization
  const tempEntity = { ...entity, geometry: newGeom }
  const pts = extractAllPoints(tempEntity)
  const newBounds = pts.length > 0
    ? computeBoundsFromPoints(pts)
    : { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 }

  return {
    ...entity,
    geometry: newGeom,
    bounds: newBounds,
  }
}

/**
 * Normalize ALL entities in a plan: translate to origin + scale to metres.
 * Flips Y axis (DWG Y-up → SVG Y-down) when flipY is true (default).
 */
export function normalizeAllEntities(
  entities: PlanEntity[],
  rawBounds: Bounds,
  scaleFactor: number,
  flipY = true
): PlanEntity[] {
  const yFlipMax = flipY ? rawBounds.maxY : undefined
  return entities.map(e => normalizeEntityBounds(e, rawBounds.minX, rawBounds.minY, scaleFactor, yFlipMax))
}

// ─── FIT TO SCREEN ────────────────────────────────────────

/**
 * Compute the viewport state that fits the entire plan into the canvas.
 * The plan is centered with PADDING px margin on all sides.
 */
export function fitToScreen(
  planWidthM: number,
  planHeightM: number,
  canvasW: number,
  canvasH: number,
  padding = 40
): ViewportState {
  if (planWidthM <= 0 || planHeightM <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 }
  }

  const scaleX = (canvasW - padding * 2) / planWidthM
  const scaleY = (canvasH - padding * 2) / planHeightM
  const scale = Math.min(scaleX, scaleY)

  const offsetX = (canvasW - planWidthM * scale) / 2
  const offsetY = (canvasH - planHeightM * scale) / 2

  return { scale, offsetX, offsetY, rotation: 0 }
}

/**
 * Compute the viewport to fit given bounds into the canvas.
 */
export function fitBoundsToScreen(
  bounds: Bounds,
  canvasW: number,
  canvasH: number,
  padding = 40
): ViewportState {
  return fitToScreen(bounds.width, bounds.height, canvasW, canvasH, padding)
}

// ─── VIEWPORT TRANSFORMS ─────────────────────────────────

/** Convert world coordinates (metres) to screen coordinates (pixels). */
export function worldToScreen(
  worldX: number, worldY: number,
  viewport: ViewportState
): { x: number; y: number } {
  return {
    x: worldX * viewport.scale + viewport.offsetX,
    y: worldY * viewport.scale + viewport.offsetY,
  }
}

/** Convert screen coordinates (pixels) to world coordinates (metres). */
export function screenToWorld(
  screenX: number, screenY: number,
  viewport: ViewportState
): { x: number; y: number } {
  return {
    x: (screenX - viewport.offsetX) / viewport.scale,
    y: (screenY - viewport.offsetY) / viewport.scale,
  }
}

/** Compute new viewport after zooming centered on a cursor position. */
export function zoomAtPoint(
  viewport: ViewportState,
  cursorX: number,
  cursorY: number,
  zoomDelta: number,
  minScale = 0.02,
  maxScale = 100
): ViewportState {
  const newScale = Math.max(minScale, Math.min(maxScale, viewport.scale * Math.exp(-zoomDelta)))
  const ratio = newScale / viewport.scale
  return {
    ...viewport,
    scale: newScale,
    offsetX: cursorX - (cursorX - viewport.offsetX) * ratio,
    offsetY: cursorY - (cursorY - viewport.offsetY) * ratio,
  }
}

// ─── VIEWPORT CULLING ─────────────────────────────────────

/** Check if an entity's bounds are within the visible viewport area (+margin). */
export function isInViewport(
  entityBounds: Bounds,
  viewport: ViewportState,
  canvasW: number,
  canvasH: number,
  marginFraction = 0.2
): boolean {
  const s = viewport.scale
  const ox = viewport.offsetX
  const oy = viewport.offsetY

  const screenMinX = entityBounds.minX * s + ox
  const screenMaxX = entityBounds.maxX * s + ox
  const screenMinY = entityBounds.minY * s + oy
  const screenMaxY = entityBounds.maxY * s + oy

  const margin = Math.max(canvasW, canvasH) * marginFraction
  return (
    screenMaxX > -margin &&
    screenMinX < canvasW + margin &&
    screenMaxY > -margin &&
    screenMinY < canvasH + margin
  )
}

// ─── LOD ──────────────────────────────────────────────────

export function computeLOD(scale: number): 'minimal' | 'medium' | 'full' | 'ultra' {
  if (scale < 0.1) return 'minimal'
  if (scale < 0.5) return 'medium'
  if (scale < 2) return 'full'
  return 'ultra'
}
