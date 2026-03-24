import type { Zone } from '../../proph3t/types'
import type { TenantInfo, ExtrudedZone, View3DConfig } from '../types/view3dTypes'

const OCCUPANCY_COLORS: Record<string, ExtrudedZone['colors']> = {
  occupied:    { top: '#0a3d1f', left: '#051e0f', right: '#145a2e', front: '#0a2e18' },
  vacant:      { top: '#3d0a0a', left: '#1e0505', right: '#5a1414', front: '#2e0808' },
  reserved:    { top: '#3d2a0a', left: '#1e1505', right: '#5a3e14', front: '#2e2008' },
  under_works: { top: '#2a2a2a', left: '#151515', right: '#3e3e3e', front: '#202020' },
}

export function getVol1ZoneColors(
  zone: Zone, tenants: TenantInfo[], config: View3DConfig
): ExtrudedZone['colors'] {
  if (!config.showOccupancyColors) {
    return { top: '#0d3320', left: '#061a10', right: '#1a5535', front: '#0a2818' }
  }
  const tenant = tenants.find(t => t.spaceId === zone.id)
  const status = tenant?.status ?? 'vacant'
  return OCCUPANCY_COLORS[status] ?? OCCUPANCY_COLORS.vacant
}

export function getVol1ZoneLabel(
  zone: Zone, tenants: TenantInfo[], config: View3DConfig
): string | undefined {
  if (!config.showTenantNames) return zone.label
  const tenant = tenants.find(t => t.spaceId === zone.id)
  if (!tenant) return config.showVacantHighlight ? 'VACANT' : undefined
  return tenant.brandName
}
