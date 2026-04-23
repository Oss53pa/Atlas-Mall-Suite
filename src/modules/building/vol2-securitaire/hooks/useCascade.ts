// ═══ HOOK CASCADE — Auto-recalcul score, angles morts, couverture ═══

import { useEffect, useRef } from 'react'
import { useVol2Store } from '../store/vol2Store'
import { debouncedCascade } from '../../shared/proph3t/cascadeEngine'
import type { CascadeTrigger } from '../../shared/proph3t/types'

/**
 * Déclenche automatiquement le recalcul cascade quand les entités changent.
 * Appliquer les résultats au store (score, blindSpots, coverageByFloor).
 */
export function useCascade() {
  const floors = useVol2Store(s => s.floors)
  const zones = useVol2Store(s => s.zones)
  const cameras = useVol2Store(s => s.cameras)
  const doors = useVol2Store(s => s.doors)
  const transitions = useVol2Store(s => s.transitions)
  const applyCascadeResult = useVol2Store(s => s.applyCascadeResult)

  // Track if initial cascade has run
  const hasRun = useRef(false)

  // Fingerprint to detect changes
  const fingerprint = `${zones.length}-${cameras.length}-${doors.length}-${transitions.length}-${
    cameras.map(c => `${c.id}:${c.x}:${c.y}:${c.angle}:${c.fov}:${c.range}`).join(',')
  }-${
    doors.map(d => `${d.id}:${d.hasBadge}:${d.hasBiometric}:${d.isExit}`).join(',')
  }`

  useEffect(() => {
    const trigger: CascadeTrigger = hasRun.current
      ? { type: 'full_recalc' }
      : { type: 'full_recalc' }

    hasRun.current = true

    debouncedCascade(
      { floors, zones, cameras, doors, transitions, signageItems: [] },
      trigger,
      hasRun.current ? 200 : 0 // immediate on mount, debounced after
    )
      .then(result => {
        applyCascadeResult(result)
      })
      .catch(() => {
        // Cascade error — silently ignore, score stays as-is
      })
  }, [fingerprint]) // eslint-disable-line react-hooks/exhaustive-deps
}
