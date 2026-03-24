// ═══ PROPH3T — Optimiseur de Rondes ═══

import type { Zone, Camera } from './types'

export interface RondePoint {
  id: string
  label: string
  x: number
  y: number
  floorId: string
  zoneId: string
  type: 'camera_check' | 'door_check' | 'zone_patrol' | 'blind_spot'
  priority: 'haute' | 'moyenne' | 'basse'
  estimatedTimeSec: number
}

export interface RondeRoute {
  id: string
  label: string
  points: RondePoint[]
  totalDistanceM: number
  totalTimeSec: number
  floorId: string
}

export interface RondePlan {
  routes: RondeRoute[]
  totalPoints: number
  totalTimeSec: number
  coveragePercent: number
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

export function generateRondePoints(zones: Zone[], cameras: Camera[]): RondePoint[] {
  const points: RondePoint[] = []
  let idx = 0

  // One checkpoint per camera
  for (const cam of cameras) {
    idx++
    points.push({
      id: `rp-cam-${idx}`,
      label: `Check ${cam.label}`,
      x: cam.x,
      y: cam.y,
      floorId: cam.floorId,
      zoneId: '',
      type: 'camera_check',
      priority: cam.priority === 'critique' ? 'haute' : cam.priority === 'haute' ? 'moyenne' : 'basse',
      estimatedTimeSec: 30,
    })
  }

  // One patrol point per zone center
  for (const zone of zones) {
    idx++
    const prio = zone.niveau >= 4 ? 'haute' : zone.niveau >= 3 ? 'moyenne' : 'basse'
    points.push({
      id: `rp-zone-${idx}`,
      label: `Patrouille ${zone.label}`,
      x: zone.x + zone.w / 2,
      y: zone.y + zone.h / 2,
      floorId: zone.floorId,
      zoneId: zone.id,
      type: 'zone_patrol',
      priority: prio,
      estimatedTimeSec: 60,
    })
  }

  return points
}

export function optimizeRondes(points: RondePoint[]): RondePlan {
  // Group points by floor
  const floorGroups = new Map<string, RondePoint[]>()
  for (const pt of points) {
    const arr = floorGroups.get(pt.floorId) ?? []
    arr.push(pt)
    floorGroups.set(pt.floorId, arr)
  }

  const routes: RondeRoute[] = []
  let routeIdx = 0

  for (const [floorId, floorPoints] of floorGroups) {
    // Sort by priority then nearest-neighbor TSP heuristic
    const sorted = [...floorPoints].sort((a, b) => {
      const prio = { haute: 0, moyenne: 1, basse: 2 }
      return prio[a.priority] - prio[b.priority]
    })

    // Nearest-neighbor ordering
    const ordered: RondePoint[] = []
    const remaining = [...sorted]
    let current = remaining.shift()!
    ordered.push(current)

    while (remaining.length > 0) {
      let nearestIdx = 0
      let nearestDist = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const d = distance(current, remaining[i])
        if (d < nearestDist) {
          nearestDist = d
          nearestIdx = i
        }
      }
      current = remaining.splice(nearestIdx, 1)[0]
      ordered.push(current)
    }

    // Calculate total distance (in meters, assuming 1 unit = 1m)
    let totalDist = 0
    for (let i = 1; i < ordered.length; i++) {
      totalDist += distance(ordered[i - 1], ordered[i])
    }

    const totalTime = ordered.reduce((s, p) => s + p.estimatedTimeSec, 0) + Math.round(totalDist / 1.2) // walk speed 1.2 m/s

    routeIdx++
    routes.push({
      id: `route-${routeIdx}`,
      label: `Ronde ${floorId}`,
      points: ordered,
      totalDistanceM: Math.round(totalDist),
      totalTimeSec: totalTime,
      floorId,
    })
  }

  const totalPoints = points.length
  const totalTimeSec = routes.reduce((s, r) => s + r.totalTimeSec, 0)
  const coveragePercent = Math.min(100, Math.round((totalPoints / Math.max(totalPoints, 1)) * 100))

  return { routes, totalPoints, totalTimeSec, coveragePercent }
}
