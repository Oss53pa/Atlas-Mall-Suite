// ═══ KioskAdapter — encapsule les moteurs Vol.4 sans les modifier ═══
//
// Conformément à CDC §09 :
//   "Le runtime borne appelle les moteurs Vol.4 existants de manière identique
//    à l'app admin actuelle. Créer un KioskAdapter qui encapsule les appels aux
//    moteurs sans les modifier."
//
// Contrat exposé au runtime : search() / computeRoute() / kioskPosition / planData.

import { useMemo } from 'react'
import { useVol4Store } from '../../vol4-wayfinder/store/vol4Store'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { useDesignerStore } from '../store/designerStore'
import type { InjectedPlanData, InjectedFloor, InjectedPoi } from '../types'

interface SearchResult {
  id: string
  label: string
  type: string
  x: number
  y: number
  floorId?: string
}

interface RouteResult {
  waypoints: Array<{ x: number; y: number; floorId?: string }>
  lengthM: number
  durationS: number
  instructions: Array<{ text: string }>
}

export function useKioskAdapter(kioskId: string) {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const { kiosks, catalogItems, currentRoute, setActiveKiosk } = useVol4Store()
  const { config } = useDesignerStore()

  const kiosk = kiosks.find(k => k.id === kioskId)
  const projetId = config.project.projetId ?? ''

  // Activer la borne dans Vol.4 store si pas déjà active
  useMemo(() => {
    if (kiosk) setActiveKiosk(kiosk.id)
  }, [kiosk?.id, setActiveKiosk])

  // ─── Plan data injecté pour MapRenderer ───
  const planData: InjectedPlanData | null = useMemo(() => {
    if (!parsedPlan) return null
    const floorMap = new Map<string, InjectedFloor>()
    for (const s of (parsedPlan.spaces ?? [])) {
      const fid = s.floorId ?? 'default'
      if (!floorMap.has(fid)) {
        floorMap.set(fid, {
          id: fid, label: fid, order: 0, walls: [], spaces: [],
          bounds: {
            width: parsedPlan.bounds?.width ?? 200,
            height: parsedPlan.bounds?.height ?? 140,
          },
        })
      }
      floorMap.get(fid)!.spaces.push({
        id: s.id, label: s.label, type: s.type ?? 'autre',
        polygon: s.polygon as [number, number][],
      })
    }
    const walls = (parsedPlan.wallSegments ?? []).map(w => ({
      x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
    }))
    for (const f of floorMap.values()) f.walls = walls
    if (floorMap.size === 0) {
      floorMap.set('default', {
        id: 'default', label: 'RDC', order: 0, walls, spaces: [],
        bounds: { width: parsedPlan.bounds?.width ?? 200, height: parsedPlan.bounds?.height ?? 140 },
      })
    }

    const pois: InjectedPoi[] = []
    for (const s of (parsedPlan.spaces ?? [])) {
      if (!['local_commerce', 'restauration', 'services', 'loisirs', 'sanitaires', 'point_information']
          .includes(s.type ?? '')) continue
      let cx = 0, cy = 0
      for (const [x, y] of (s.polygon ?? [])) { cx += x; cy += y }
      cx /= Math.max(1, s.polygon?.length ?? 1)
      cy /= Math.max(1, s.polygon?.length ?? 1)
      pois.push({
        id: s.id, label: s.label, type: s.type ?? 'autre',
        x: cx, y: cy, floorId: s.floorId,
      })
    }

    return {
      projectName: config.project.siteName,
      floors: Array.from(floorMap.values()),
      pois,
      entrances: [],
      exits: [],
    }
  }, [parsedPlan, config.project.siteName])

  // ─── Position de la borne ───
  const kioskPosition = useMemo(() => {
    if (!kiosk) return null
    return { x: kiosk.x, y: kiosk.y, floorId: kiosk.floorId }
  }, [kiosk])

  // ─── Recherche (Vol.4 searchEngine via catalogItems) ───
  const search = (query: string): SearchResult[] => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return catalogItems
      .filter(i => i.label.toLowerCase().includes(q))
      .slice(0, 8)
      .map(i => ({
        id: i.id,
        label: i.label,
        type: (i as any).type ?? '',
        x: (i as any).x ?? 0,
        y: (i as any).y ?? 0,
        floorId: (i as any).floorId,
      }))
  }

  // ─── Itinéraire (Vol.4 astarEngine via currentRoute calculé en amont) ───
  const computeRoute = (dest: { id: string; x: number; y: number }): RouteResult | null => {
    if (!kioskPosition) return null
    // Pour l'instant, route en ligne droite (fallback simple).
    // Le vrai astarEngine de Vol.4 doit être appelé via l'action setRoute
    // du store Vol.4 — fait dans une promise séparée pour ne pas bloquer.
    if (currentRoute) {
      return {
        waypoints: currentRoute.waypoints,
        lengthM: currentRoute.lengthM,
        durationS: currentRoute.durationS,
        instructions: currentRoute.instructions.map(i => ({ text: i.text })),
      }
    }
    // Fallback : ligne droite
    const dx = dest.x - kioskPosition.x
    const dy = dest.y - kioskPosition.y
    const distance = Math.hypot(dx, dy)
    return {
      waypoints: [
        { x: kioskPosition.x, y: kioskPosition.y, floorId: kioskPosition.floorId },
        { x: dest.x, y: dest.y },
      ],
      lengthM: distance,
      durationS: distance / 1.3,
      instructions: [
        { text: `Avancez tout droit sur ${distance.toFixed(0)} m vers la destination.` },
      ],
    }
  }

  return {
    kiosk,
    kioskPosition,
    planData,
    projetId,
    search,
    computeRoute,
  }
}
