import type {
  CascadeTrigger, CascadeResult, BlindSpot, SecurityScore,
  Zone, Camera, Door, Floor, TransitionNode, SignageItem,
  DoorRecommendation
} from './types'
import {
  scoreSecurite, findBlindSpots, computeFloorCoverage, recommendDoor
} from './engine'
import { detectVisualBreaks } from './signaleticsEngine'

// ═══ MOTEUR CASCADE — RECALCUL TEMPS RÉEL PROPH3T ═══
// Ordre fixe : angles morts -> score -> couverture -> portes -> signaletique

/** Etat complet du projet pour le recalcul cascade */
export interface CascadeState {
  floors: Floor[]
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  transitions: TransitionNode[]
  signageItems: SignageItem[]
}

/**
 * Recalcul cascade complet dans un ordre fixe :
 * 1. Detection angles morts
 * 2. Score securitaire APSAD R82
 * 3. Couverture par etage
 * 4. Recommandations portes
 * 5. Alertes signaletique
 */
export async function runCascade(
  state: CascadeState,
  _trigger: CascadeTrigger
): Promise<CascadeResult> {
  const startTime = performance.now()
  const { floors, zones, cameras, doors, signageItems } = state

  // ── 1. Angles morts par etage ──
  const allBlindSpots: BlindSpot[] = []
  for (const floor of floors) {
    const floorZones = zones.filter(z => z.floorId === floor.id)
    const floorCameras = cameras.filter(c => c.floorId === floor.id)

    if (floorZones.length === 0) continue

    const spots = findBlindSpots(
      floorZones,
      floorCameras,
      floor.id,
      floor.widthM,
      floor.heightM
    )
    allBlindSpots.push(...spots)
  }

  // ── 2. Score securitaire ──
  const exits = doors.filter(d => d.isExit)
  const score: SecurityScore = scoreSecurite(zones, cameras, doors, exits)

  // ── 3. Couverture par etage ──
  const coverageByFloor: Record<string, number> = {}
  let totalCoverage = 0
  let floorCount = 0
  for (const floor of floors) {
    const floorZones = zones.filter(z => z.floorId === floor.id)
    const floorCameras = cameras.filter(c => c.floorId === floor.id)

    if (floorZones.length === 0) {
      coverageByFloor[floor.id] = 0
      continue
    }

    const cov = computeFloorCoverage(
      floorZones,
      floorCameras,
      floor.id,
      floor.widthM,
      floor.heightM,
      20 // resolution reduite pour la cascade temps reel
    )
    coverageByFloor[floor.id] = cov
    totalCoverage += cov
    floorCount++
  }
  const avgCoverage = floorCount > 0 ? Math.round(totalCoverage / floorCount) : 0

  // ── 4. Recommandations portes ──
  const doorRecommendations: DoorRecommendation[] = []
  for (const zone of zones) {
    // Verifier si la zone a deja une porte adaptee
    const zoneDoors = doors.filter(d =>
      d.floorId === zone.floorId && d.zoneType === zone.type
    )
    if (zoneDoors.length === 0) {
      doorRecommendations.push(recommendDoor(zone))
    } else {
      // Verifier la conformite des portes existantes
      for (const door of zoneDoors) {
        if (['technique', 'backoffice', 'financier'].includes(zone.type) && !door.hasBadge) {
          doorRecommendations.push({
            ...recommendDoor(zone),
            note: `Porte "${door.label}" zone sensible sans badge — mise a niveau requise`,
          })
        }
        if (zone.type === 'financier' && !door.hasBiometric) {
          doorRecommendations.push({
            ...recommendDoor(zone),
            note: `Porte "${door.label}" zone financiere sans biometrie — non-conforme`,
          })
        }
      }
    }
  }

  // ── 5. Alertes signaletique ──
  const signageAlerts: string[] = []
  for (const floor of floors) {
    const breaks = detectVisualBreaks(
      signageItems,
      floor.id,
      floor.widthM,
      floor.heightM
    )

    for (const brk of breaks) {
      signageAlerts.push(
        `${floor.level}: rupture visuelle entre ${brk.from.ref} et ${brk.to.ref} — ${brk.distanceM}m (max ${brk.maxAllowedM}m)`
      )
    }
  }

  // Verifier panneaux lumineux pour zones faible luminosite
  for (const zone of zones) {
    if ((zone.lux ?? 300) < 200) {
      const hasLuminous = signageItems.some(
        s => s.floorId === zone.floorId && s.isLuminous &&
          s.x >= zone.x && s.x <= zone.x + zone.w &&
          s.y >= zone.y && s.y <= zone.y + zone.h
      )
      if (!hasLuminous) {
        signageAlerts.push(
          `Zone "${zone.label}" (lux < 200) sans panneau lumineux — NF EN 1838`
        )
      }
    }
  }

  // Verifier BAES obligatoires pres des sorties de secours
  const exitDoors = doors.filter(d => d.isExit)
  for (const exit of exitDoors) {
    const hasBAES = signageItems.some(
      s => s.floorId === exit.floorId && s.requiresBAES &&
        Math.abs(s.x - exit.x) < 0.05 && Math.abs(s.y - exit.y) < 0.05
    )
    if (!hasBAES) {
      signageAlerts.push(
        `Sortie "${exit.label}" sans BAES a proximite — NF C 71-800`
      )
    }
  }

  const durationMs = Math.round(performance.now() - startTime)

  return {
    score,
    coverage: avgCoverage,
    blindSpots: allBlindSpots,
    doorRecommendations,
    signageAlerts,
    durationMs,
    coverageByFloor,
  }
}

// ═══ DEBOUNCED CASCADE ═══

interface DebouncedState {
  timer: ReturnType<typeof setTimeout> | null
  pendingResolvers: Array<{
    resolve: (result: CascadeResult) => void
    reject: (err: Error) => void
  }>
}

const debouncedState: DebouncedState = {
  timer: null,
  pendingResolvers: [],
}

/**
 * Version debounced du recalcul cascade.
 * Regroupe les declenchements rapproche en un seul recalcul.
 * @param delay - delai en ms avant execution (defaut 100ms)
 */
export function debouncedCascade(
  state: CascadeState,
  trigger: CascadeTrigger,
  delay: number = 100
): Promise<CascadeResult> {
  return new Promise<CascadeResult>((resolve, reject) => {
    debouncedState.pendingResolvers.push({ resolve, reject })

    if (debouncedState.timer !== null) {
      clearTimeout(debouncedState.timer)
    }

    debouncedState.timer = setTimeout(() => {
      const resolvers = [...debouncedState.pendingResolvers]
      debouncedState.pendingResolvers = []
      debouncedState.timer = null

      runCascade(state, trigger)
        .then((result) => {
          for (const r of resolvers) {
            r.resolve(result)
          }
        })
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err))
          for (const r of resolvers) {
            r.reject(error)
          }
        })
    }, delay)
  })
}
