import type { Zone } from '../../shared/proph3t/types'
import type { ZoneHeight } from '../store/vol3dTypes'
import { defaultHeightForType } from './isometricEngine'

export function resolveZoneHeights(
  zones: Zone[],
  ifcHeights: Record<string, number> | null,
  userOverrides: Partial<Record<string, number>>
): ZoneHeight[] {
  return zones.map((zone): ZoneHeight => {
    const ifcH = ifcHeights?.[zone.id]
    if (ifcH && ifcH > 0) return { zoneId: zone.id, heightM: ifcH, floorThicknessM: 0.3, hasGlazing: isGlazingZone(zone), roofType: 'flat' }
    const userH = userOverrides[zone.id]
    if (userH && userH > 0) return { zoneId: zone.id, heightM: userH, floorThicknessM: 0.3, hasGlazing: isGlazingZone(zone), roofType: 'flat' }
    return { zoneId: zone.id, heightM: defaultHeightForType(zone.type), floorThicknessM: 0.3, hasGlazing: isGlazingZone(zone), roofType: zone.type === 'circulation' ? 'none' : 'flat' }
  })
}

function isGlazingZone(zone: Zone): boolean {
  return ['commerce', 'hotel', 'loisirs'].includes(zone.type) && zone.niveau <= 2
}

export function resolveFloorElevations(
  floors: { id: string; level: string; order: number }[]
): Record<string, number> {
  const sorted = [...floors].sort((a, b) => a.order - b.order)
  const elevations: Record<string, number> = {}
  const defaultH: Record<string, number> = { 'B2': 3.0, 'B1': 3.0, 'RDC': 5.5, 'R+1': 4.5, 'R+2': 4.0, 'R+3': 4.0 }
  let currentElev = 0

  for (const floor of sorted) {
    if (floor.order === 0 && floor.level.startsWith('B')) {
      currentElev = -(sorted.filter(f => f.level.startsWith('B')).length) * 3.0
    }
    elevations[floor.id] = currentElev
    currentElev += defaultH[floor.level] ?? 4.0
  }
  return elevations
}
