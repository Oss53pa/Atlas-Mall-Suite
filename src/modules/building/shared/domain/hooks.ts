// ═══ DOMAIN HOOKS — React bindings for the canonical Lot store ═══
// Remplacent progressivement les divers `useVol1Store().spaces` et similaires.

import { useMemo } from 'react'
import { useLotsStore } from '../stores/lotsStore'
import { commercialSpaceFromLot, tenantFromLot } from './adapters'
import { FloorLevel } from './FloorLevel'
import type { Lot, LotId } from './LotEntity'
import type { CommercialSpace, Tenant } from '../engines/commercialEngine'

/** Tous les lots (snapshot réactif). */
export function useAllLots(): Lot[] {
  return useLotsStore(s => Object.values(s.lots))
}

/** Lots d'un étage donné. */
export function useLotsOnFloor(level: FloorLevel): Lot[] {
  return useLotsStore(s => Object.values(s.lots).filter(l => l.floorLevel === level))
}

/** Un lot par id. */
export function useLot(id: LotId | undefined): Lot | undefined {
  return useLotsStore(s => (id ? s.lots[id as string] : undefined))
}

/** Commercial spaces legacy shape — pour alimenter runCommercialAnalysis. */
export function useCommercialSpacesFromLots(): CommercialSpace[] {
  const lots = useAllLots()
  return useMemo(() => lots.map(commercialSpaceFromLot), [lots])
}

/** Tenants dérivés des lots (un tenant par lot.commercial.tenantId). */
export function useTenantsFromLots(): Tenant[] {
  const lots = useAllLots()
  return useMemo(() => {
    const t: Tenant[] = []
    const seen = new Set<string>()
    for (const lot of lots) {
      const tenant = tenantFromLot(lot)
      if (tenant && !seen.has(tenant.id)) {
        seen.add(tenant.id)
        t.push(tenant)
      }
    }
    return t
  }, [lots])
}

/** Stats rapides par étage. */
export function useFloorStats(): Array<{ level: FloorLevel; count: number; areaSqm: number }> {
  const lots = useAllLots()
  return useMemo(() => {
    const byFloor = new Map<FloorLevel, { count: number; areaSqm: number }>()
    for (const lot of lots) {
      const curr = byFloor.get(lot.floorLevel) ?? { count: 0, areaSqm: 0 }
      curr.count += 1
      curr.areaSqm += lot.areaSqm
      byFloor.set(lot.floorLevel, curr)
    }
    return Array.from(byFloor.entries()).map(([level, v]) => ({ level, ...v }))
  }, [lots])
}
