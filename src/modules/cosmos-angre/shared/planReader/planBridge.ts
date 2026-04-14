// ═══ PLAN BRIDGE — Convert import results → ParsedPlan for PlanCanvasV2 ═══
// Bridges the gap between the import pipeline (RecognizedZone[], DimEntity[])
// and the PlanCanvasV2 engine (ParsedPlan with DetectedSpace[], PlanEntity[]).

import type { RecognizedZone, DimEntity, CalibrationResult } from './planReaderTypes'
import type {
  ParsedPlan, PlanEntity, PlanLayer, DetectedSpace, WallSegment, Bounds,
} from './planEngineTypes'
import type { SpaceType } from '../proph3t/types'
import { computeBoundsFromPoints } from './coordinateEngine'

let _uid = 0
function uid(prefix: string): string {
  return `${prefix}-${++_uid}-${Date.now().toString(36)}`
}

/**
 * Build a ParsedPlan from import pipeline results.
 * Converts RecognizedZone bounding boxes (0-1 normalized) into
 * DetectedSpace polygon rectangles in metres using calibration data.
 */
export function buildParsedPlanFromImport(
  zones: Array<Partial<{ id: string; label: string; x: number; y: number; w: number; h: number; type: string; color: string }>>,
  dims: DimEntity[],
  calibration: CalibrationResult,
): ParsedPlan {
  _uid = 0

  const realW = calibration.realWidthM || 200
  const realH = calibration.realHeightM || 140

  // ── Convert zones → DetectedSpace[] (polygon rectangles in metres) ──
  const spaces: DetectedSpace[] = zones
    .filter(z => z.w != null && z.h != null && z.x != null && z.y != null)
    .map(z => {
      // Zones from import have 0-1 normalized coords
      const x = (z.x ?? 0) * realW
      const y = (z.y ?? 0) * realH
      const w = (z.w ?? 0.1) * realW
      const h = (z.h ?? 0.1) * realH

      const polygon: [number, number][] = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ]

      const areaSqm = Math.round(w * h * 10) / 10
      const bounds = computeBoundsFromPoints(polygon)

      return {
        id: z.id ?? uid('space'),
        polygon,
        areaSqm,
        label: z.label ?? `Local ${_uid}`,
        layer: 'import',
        type: (z.type ?? 'commerce') as SpaceType,
        bounds,
        color: z.color ?? null,
        metadata: {},
      }
    })

  // ── Convert DimEntity[] → PlanEntity[] (dimension lines) ──
  const dimEntities: PlanEntity[] = dims.map(dim => {
    const pts: [number, number][] = [dim.defPoint1, dim.defPoint2, dim.textPosition]
    const bounds = computeBoundsFromPoints(pts)
    return {
      id: dim.id,
      type: 'DIMENSION',
      layer: dim.layer ?? 'dimensions',
      geometry: {
        kind: 'dimension' as const,
        defPoint1: dim.defPoint1,
        defPoint2: dim.defPoint2,
        textPosition: dim.textPosition,
        measurement: dim.value,
        text: dim.valueText,
      },
      bounds,
      visible: true,
      color: '#ef4444',
    }
  })

  // ── Build layers ──
  const layerNames = new Set<string>()
  layerNames.add('import')
  if (dims.length > 0) layerNames.add('dimensions')
  for (const z of zones) {
    if (z.type) layerNames.add(z.type)
  }

  const layers: PlanLayer[] = Array.from(layerNames).map(name => ({
    name,
    visible: true,
    locked: false,
    category: name === 'dimensions' ? 'dimension' as const : 'space' as const,
  }))

  // ── Overall bounds in metres ──
  const planBounds: Bounds = {
    minX: 0,
    minY: 0,
    maxX: realW,
    maxY: realH,
    width: realW,
    height: realH,
    centerX: realW / 2,
    centerY: realH / 2,
  }

  return {
    entities: dimEntities,
    layers,
    spaces,
    bounds: planBounds,
    unitScale: 1, // already in metres
    detectedUnit: 'm',
    wallSegments: [],
  }
}

/**
 * Build a ParsedPlan from raw DWG entities extracted during import.
 * This is called when we have full entity data (not just zones).
 */
export function buildParsedPlanFromEntities(
  entities: PlanEntity[],
  spaces: DetectedSpace[],
  wallSegments: WallSegment[],
  bounds: Bounds,
  unitScale: number,
  detectedUnit: ParsedPlan['detectedUnit'],
): ParsedPlan {
  // ── Build layers from entities ──
  const layerMap = new Map<string, PlanLayer>()
  for (const e of entities) {
    if (!layerMap.has(e.layer)) {
      layerMap.set(e.layer, {
        name: e.layer,
        visible: true,
        locked: false,
        category: classifyLayerCategory(e.layer),
      })
    }
  }

  return {
    entities,
    layers: Array.from(layerMap.values()),
    spaces,
    bounds,
    unitScale,
    detectedUnit,
    wallSegments,
  }
}

function classifyLayerCategory(layer: string): PlanLayer['category'] {
  const l = layer.toLowerCase()
  if (/mur|wall|struct|beton|facade|maconn/i.test(l)) return 'structure'
  if (/clois|door|porte|fenetre|window|partition/i.test(l)) return 'partition'
  if (/local|space|zone|room|boutique|commerce/i.test(l)) return 'space'
  if (/dim|cot|dimension|measure/i.test(l)) return 'dimension'
  if (/text|annot|label/i.test(l)) return 'text'
  if (/equip|mobilier|furni/i.test(l)) return 'equipment'
  if (/hatch/i.test(l)) return 'hatch'
  return 'other'
}
