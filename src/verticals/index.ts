// ═══ VERTICALS — Index ═══

import type { VerticalId, VerticalConfig } from './types'
import { MALL_CONFIG }        from './mall'
import { HOTEL_CONFIG }       from './hotel'
import { OFFICE_CONFIG }      from './office'
import { HOSPITAL_CONFIG }    from './hospital'
import { CAMPUS_CONFIG }      from './campus'
import { INDUSTRIAL_CONFIG }  from './industrial'
import { ERP_PUBLIC_CONFIG }  from './erp-public'
import { MULTI_SITE_CONFIG }  from './multi-site'

export * from './types'
export { MALL_CONFIG, HOTEL_CONFIG, OFFICE_CONFIG, HOSPITAL_CONFIG, CAMPUS_CONFIG, INDUSTRIAL_CONFIG, ERP_PUBLIC_CONFIG, MULTI_SITE_CONFIG }

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  'mall':       MALL_CONFIG,
  'hotel':      HOTEL_CONFIG,
  'office':     OFFICE_CONFIG,
  'hospital':   HOSPITAL_CONFIG,
  'campus':     CAMPUS_CONFIG,
  'industrial': INDUSTRIAL_CONFIG,
  'erp-public': ERP_PUBLIC_CONFIG,
  'multi-site': MULTI_SITE_CONFIG,
}

export function getVertical(id: VerticalId): VerticalConfig {
  return VERTICALS[id] ?? MALL_CONFIG
}

export const VERTICAL_IDS: VerticalId[] = Object.keys(VERTICALS) as VerticalId[]
