// ═══ PARSER COTES DXF ═══

import type { DimEntity, CalibrationResult, DimType, Zone } from './planReaderTypes'
import type { DXFEntity } from '../proph3t/types'

// ─── EXTRACTION DES ENTITÉS DIMENSION DXF ───

interface DXFDimEntity extends DXFEntity {
  dxf?: {
    dimensionType?: number
    actualMeasurement?: number
    text?: string
    definitionPoint?: { x: number; y: number }
    middleOfText?: { x: number; y: number }
    linearOrAngularPoint1?: { x: number; y: number }
    linearOrAngularPoint2?: { x: number; y: number }
  }
}

export function extractDimEntities(rawEntities: DXFEntity[]): DimEntity[] {
  return (rawEntities as DXFDimEntity[])
    .filter(e => e.type === 'DIMENSION')
    .map((e, idx): DimEntity => {
      const dimTypeCode = (e.dxf?.dimensionType ?? 0) & 0b00001111
      const typeMap: Record<number, DimType> = {
        0: 'lineaire', 1: 'alignee', 2: 'angulaire',
        3: 'diametrale', 4: 'radiale', 6: 'ordinatee',
      }

      const rawValue = e.dxf?.actualMeasurement ?? 0
      const textRaw = e.dxf?.text ?? '<>'

      const { value, unit, confidence: unitConf } = detectUnit(rawValue, textRaw)

      const defPoint1: [number, number] = [
        e.dxf?.definitionPoint?.x ?? e.dxf?.linearOrAngularPoint1?.x ?? 0,
        e.dxf?.definitionPoint?.y ?? e.dxf?.linearOrAngularPoint1?.y ?? 0,
      ]
      const defPoint2: [number, number] = [
        e.dxf?.linearOrAngularPoint2?.x ?? 0,
        e.dxf?.linearOrAngularPoint2?.y ?? 0,
      ]

      const measuredDistance = Math.sqrt(
        (defPoint2[0] - defPoint1[0]) ** 2 + (defPoint2[1] - defPoint1[1]) ** 2
      )

      return {
        id: `dim-${idx}`,
        type: typeMap[dimTypeCode] ?? 'lineaire',
        value,
        valueText: textRaw === '<>' ? `${value} ${unit}` : textRaw,
        unit,
        confidence: unitConf,
        defPoint1,
        defPoint2,
        textPosition: [e.dxf?.middleOfText?.x ?? 0, e.dxf?.middleOfText?.y ?? 0],
        measuredDistance,
        layer: e.layer ?? '0',
      }
    })
    .filter(d => d.value > 0)
}

function detectUnit(rawValue: number, text: string): { value: number; unit: DimEntity['unit']; confidence: number } {
  const t = text.toLowerCase()

  if (t.includes('mm'))                        return { value: rawValue / 1000, unit: 'mm',    confidence: 0.95 }
  if (t.includes('cm'))                        return { value: rawValue / 100,  unit: 'cm',    confidence: 0.95 }
  if (t.includes(' m') || t.endsWith('m'))     return { value: rawValue,        unit: 'm',     confidence: 0.95 }
  if (t.includes('"') || t.includes('inch'))   return { value: rawValue * 0.0254, unit: 'inch', confidence: 0.90 }

  if (rawValue > 200)  return { value: rawValue / 1000, unit: 'mm',      confidence: 0.75 }
  if (rawValue > 0.1)  return { value: rawValue,        unit: 'm',       confidence: 0.70 }
  return { value: rawValue, unit: 'unknown', confidence: 0.30 }
}

// ─── CALIBRATION AUTOMATIQUE ───

export function calibratePlanFromDims(
  dims: DimEntity[],
  planBoundsRaw: { minX: number; minY: number; maxX: number; maxY: number }
): CalibrationResult {
  const reliableDims = dims.filter(d =>
    (d.type === 'lineaire' || d.type === 'alignee') &&
    d.confidence > 0.6 &&
    d.measuredDistance !== undefined &&
    d.measuredDistance > 0
  )

  if (reliableDims.length === 0) {
    return {
      scaleFactorX: 1 / 1000,
      scaleFactorY: 1 / 1000,
      realWidthM: (planBoundsRaw.maxX - planBoundsRaw.minX) / 1000,
      realHeightM: (planBoundsRaw.maxY - planBoundsRaw.minY) / 1000,
      confidence: 0.2,
      method: 'dim_manual',
      samplesUsed: 0,
      outlierCount: 0,
      issues: ['Aucune cote fiable trouvee — calibration par defaut (1 unite = 1mm)'],
    }
  }

  const ratios = reliableDims.map(d => ({
    ratio: d.value / (d.measuredDistance ?? 1),
    dim: d,
  }))

  const ratioValues = ratios.map(r => r.ratio)
  const mean = ratioValues.reduce((s, v) => s + v, 0) / ratioValues.length
  const std = Math.sqrt(ratioValues.reduce((s, v) => s + (v - mean) ** 2, 0) / ratioValues.length)
  const inliers = ratios.filter(r => Math.abs(r.ratio - mean) < 2 * std)
  const outliers = ratios.filter(r => Math.abs(r.ratio - mean) >= 2 * std)

  const sorted = inliers.map(r => r.ratio).sort((a, b) => a - b)
  const medianRatio = sorted[Math.floor(sorted.length / 2)] ?? mean

  const rawWidth  = planBoundsRaw.maxX - planBoundsRaw.minX
  const rawHeight = planBoundsRaw.maxY - planBoundsRaw.minY

  const issues: string[] = []
  if (inliers.length < 3)    issues.push(`Seulement ${inliers.length} cote(s) fiable(s) — verifier la calibration`)
  if (outliers.length > 3)   issues.push(`${outliers.length} cote(s) incoherente(s) ignoree(s)`)
  if (mean > 0 && std / mean > 0.15) issues.push('Dispersion elevee entre les cotes — plan potentiellement multi-echelle')

  return {
    scaleFactorX: medianRatio,
    scaleFactorY: medianRatio,
    realWidthM:  rawWidth  * medianRatio,
    realHeightM: rawHeight * medianRatio,
    confidence: Math.min(0.99, 0.5 + inliers.length * 0.1 - outliers.length * 0.05),
    method: 'dim_auto',
    samplesUsed: inliers.length,
    outlierCount: outliers.length,
    issues,
  }
}

// ─── CORRESPONDANCE COTES ↔ ZONES ───

export function linkDimsToZones(dims: DimEntity[], zones: Zone[], planWidth: number): DimEntity[] {
  const threshold = planWidth * 0.05

  return dims.map(dim => {
    let bestZoneId: string | undefined
    let bestDist = Infinity

    for (const zone of zones) {
      const edges: [number, number, number, number][] = [
        [zone.x, zone.y, zone.x + zone.w, zone.y],
        [zone.x + zone.w, zone.y, zone.x + zone.w, zone.y + zone.h],
        [zone.x, zone.y + zone.h, zone.x + zone.w, zone.y + zone.h],
        [zone.x, zone.y, zone.x, zone.y + zone.h],
      ]

      for (const [ax, ay, bx, by] of edges) {
        const d1 = pointToSegmentDist(dim.defPoint1[0], dim.defPoint1[1], ax, ay, bx, by)
        const d2 = pointToSegmentDist(dim.defPoint2[0], dim.defPoint2[1], ax, ay, bx, by)
        const avgDist = (d1 + d2) / 2
        if (avgDist < bestDist) {
          bestDist = avgDist
          bestZoneId = zone.id
        }
      }
    }

    return bestDist < threshold ? { ...dim, linkedZoneId: bestZoneId } : dim
  })
}

function pointToSegmentDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.sqrt((px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2)
}
