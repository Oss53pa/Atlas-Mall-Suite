import { useMemo, useCallback } from 'react'
import type { Floor, TransitionNode } from '../proph3t/types'

interface UseMultiFloorOptions {
  floors: Floor[]
  transitions: TransitionNode[]
  activeFloorId: string
  onFloorChange: (floorId: string) => void
}

interface UseMultiFloorResult {
  activeFloor: Floor | undefined
  sortedFloors: Floor[]
  floorTransitions: TransitionNode[]
  adjacentFloors: Floor[]
  navigateUp: () => void
  navigateDown: () => void
  getTransitionsBetween: (fromLevel: string, toLevel: string) => TransitionNode[]
  pmrAccessibleFloors: Floor[]
}

export function useMultiFloor({
  floors,
  transitions,
  activeFloorId,
  onFloorChange,
}: UseMultiFloorOptions): UseMultiFloorResult {
  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.order - b.order),
    [floors],
  )

  const activeFloor = useMemo(
    () => floors.find((f) => f.id === activeFloorId),
    [floors, activeFloorId],
  )

  const floorTransitions = useMemo(
    () =>
      transitions.filter(
        (t) =>
          t.fromFloor === activeFloor?.level || t.toFloor === activeFloor?.level,
      ),
    [transitions, activeFloor],
  )

  const adjacentFloors = useMemo(() => {
    if (!activeFloor) return []
    const levels = new Set<string>()
    for (const t of transitions) {
      if (t.fromFloor === activeFloor.level) levels.add(t.toFloor)
      if (t.toFloor === activeFloor.level) levels.add(t.fromFloor)
    }
    return sortedFloors.filter((f) => levels.has(f.level))
  }, [activeFloor, transitions, sortedFloors])

  const pmrAccessibleFloors = useMemo(() => {
    if (!activeFloor) return []
    const pmrLevels = new Set<string>()
    for (const t of transitions) {
      if (!t.pmr) continue
      if (t.fromFloor === activeFloor.level) pmrLevels.add(t.toFloor)
      if (t.toFloor === activeFloor.level) pmrLevels.add(t.fromFloor)
    }
    return sortedFloors.filter((f) => pmrLevels.has(f.level))
  }, [activeFloor, transitions, sortedFloors])

  const navigateUp = useCallback(() => {
    const idx = sortedFloors.findIndex((f) => f.id === activeFloorId)
    if (idx < sortedFloors.length - 1) {
      onFloorChange(sortedFloors[idx + 1].id)
    }
  }, [sortedFloors, activeFloorId, onFloorChange])

  const navigateDown = useCallback(() => {
    const idx = sortedFloors.findIndex((f) => f.id === activeFloorId)
    if (idx > 0) {
      onFloorChange(sortedFloors[idx - 1].id)
    }
  }, [sortedFloors, activeFloorId, onFloorChange])

  const getTransitionsBetween = useCallback(
    (fromLevel: string, toLevel: string) =>
      transitions.filter(
        (t) =>
          (t.fromFloor === fromLevel && t.toFloor === toLevel) ||
          (t.fromFloor === toLevel && t.toFloor === fromLevel),
      ),
    [transitions],
  )

  return {
    activeFloor,
    sortedFloors,
    floorTransitions,
    adjacentFloors,
    navigateUp,
    navigateDown,
    getTransitionsBetween,
    pmrAccessibleFloors,
  }
}
