// ═══ NORMALISATION GÉOMÉTRIE MULTI-SOURCES ═══

import type { Zone } from '../proph3t/types'
import type { CalibrationResult, RecognizedZone, BoundingBox } from './planReaderTypes'

// ─── NORMALISER GÉOMÉTRIE ───

export function normalizeGeometry(
  zones: Partial<Zone>[],
  _calibration: CalibrationResult,
  floorWidthM: number,
  floorHeightM: number
): Zone[] {
  return zones.map((z, idx): Zone => {
    const w = (z.w ?? 0.1) * floorWidthM
    const h = (z.h ?? 0.1) * floorHeightM
    const surfaceM2 = Math.round(w * h)

    return {
      id: z.id ?? `norm-zone-${idx}`,
      floorId: z.floorId ?? '',
      label: z.label ?? `Zone ${idx + 1}`,
      type: z.type ?? 'circulation',
      x: z.x ?? 0,
      y: z.y ?? 0,
      w: z.w ?? 0.1,
      h: z.h ?? 0.1,
      niveau: z.niveau ?? 2,
      color: z.color ?? '#1a1a2e',
      description: z.description,
      surfaceM2,
    }
  })
}

// ─── DÉDUPLICATION ZONES ───

export function mergeZonesFromMultipleSources(
  zonesA: Partial<Zone>[],
  zonesB: Partial<Zone>[],
  overlapThreshold = 0.5
): Partial<Zone>[] {
  const merged = [...zonesA]

  for (const zb of zonesB) {
    const hasOverlap = merged.some(za => {
      const overlap = computeOverlap(
        { x: za.x ?? 0, y: za.y ?? 0, w: za.w ?? 0, h: za.h ?? 0 },
        { x: zb.x ?? 0, y: zb.y ?? 0, w: zb.w ?? 0, h: zb.h ?? 0 }
      )
      const areaA = (za.w ?? 0) * (za.h ?? 0)
      const areaB = (zb.w ?? 0) * (zb.h ?? 0)
      const minArea = Math.min(areaA, areaB)
      return minArea > 0 && overlap / minArea > overlapThreshold
    })

    if (!hasOverlap) {
      merged.push(zb)
    }
  }

  return merged
}

function computeOverlap(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)

  if (x2 <= x1 || y2 <= y1) return 0
  return (x2 - x1) * (y2 - y1)
}

// ─── VALIDATION ZONES ───

export function validateZones(
  zones: Partial<Zone>[],
  totalArea: number
): { valid: Partial<Zone>[]; warnings: string[] } {
  const warnings: string[] = []
  const valid: Partial<Zone>[] = []

  for (const zone of zones) {
    const zoneArea = (zone.w ?? 0) * (zone.h ?? 0)

    // Zones trop petites (< 0.5% de la surface totale)
    if (totalArea > 0 && zoneArea / totalArea < 0.005) {
      warnings.push(`Zone "${zone.label}" ignoree — surface trop petite (${(zoneArea / totalArea * 100).toFixed(1)}%)`)
      continue
    }

    // Zones trop grandes (> 80% de la surface totale)
    if (totalArea > 0 && zoneArea / totalArea > 0.8) {
      warnings.push(`Zone "${zone.label}" suspecte — couvre ${(zoneArea / totalArea * 100).toFixed(0)}% du plan`)
    }

    valid.push(zone)
  }

  // Check for overlaps
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i], b = valid[j]
      const overlap = computeOverlap(
        { x: a.x ?? 0, y: a.y ?? 0, w: a.w ?? 0, h: a.h ?? 0 },
        { x: b.x ?? 0, y: b.y ?? 0, w: b.w ?? 0, h: b.h ?? 0 }
      )
      const minArea = Math.min((a.w ?? 0) * (a.h ?? 0), (b.w ?? 0) * (b.h ?? 0))
      if (minArea > 0 && overlap / minArea > 0.3) {
        warnings.push(`Chevauchement detecte entre "${a.label}" et "${b.label}" (${(overlap / minArea * 100).toFixed(0)}%)`)
      }
    }
  }

  return { valid, warnings }
}

// ─── CONVERSION RECOGNIZED ZONES → PARTIAL ZONES ───

export function recognizedZonesToPartialZones(
  recognized: RecognizedZone[],
  floorId: string
): Partial<Zone>[] {
  return recognized.map((rz, idx): Partial<Zone> => ({
    id: rz.id ?? `rz-${idx}`,
    floorId,
    label: rz.label,
    type: rz.estimatedType,
    x: rz.boundingBox.x,
    y: rz.boundingBox.y,
    w: rz.boundingBox.w,
    h: rz.boundingBox.h,
    niveau: 2,
    color: rz.color ?? '#1a1a2e',
  }))
}
