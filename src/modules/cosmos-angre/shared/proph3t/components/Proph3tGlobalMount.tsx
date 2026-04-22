// ═══ PROPH3T GLOBAL MOUNT — Monté UNE SEULE FOIS au niveau racine ═══

import { useCallback, useMemo } from 'react'
import { Proph3tImportModal } from './Proph3tImportModal'
import { FloorAttributionModal, type FloorAttribution } from '../../components/FloorAttributionModal'
import { usePlanEngineStore } from '../../stores/planEngineStore'
import { usePlanHydration } from '../../hooks/usePlanHydration'
import { FloorLevel, FLOOR_LABEL_FR, FLOOR_STACK_ORDER } from '../../domain/FloorLevel'
import type { Proph3tAction } from '../orchestrator.types'

export function Proph3tGlobalMount() {
  // ⚠ RÈGLE D'OR : TOUS les hooks dans le même ordre, à CHAQUE render.
  // Aucun early return avant, aucun hook conditionnel.
  usePlanHydration()

  const plan = usePlanEngineStore(s => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)
  const proph3tModalOpen = usePlanEngineStore(s => s.proph3tModalOpen)
  const closeProph3tModal = usePlanEngineStore(s => s.closeProph3tModal)
  const openProph3tModal = usePlanEngineStore(s => s.openProph3tModal)
  const floorAttributionOpen = usePlanEngineStore(s => s.floorAttributionOpen)
  const closeFloorAttribution = usePlanEngineStore(s => s.closeFloorAttribution)
  const validatePlan = usePlanEngineStore(s => s.validatePlan)

  const disabled = useMemo(() => {
    try { return localStorage.getItem('atlas-proph3t-disabled') === '1' }
    catch { return false }
  }, [])

  const clusters = useMemo(() => plan?.detectedFloors ?? [], [plan])

  const onApplyAction = useCallback(async (action: Proph3tAction) => {
    switch (action.verb) {
      case 'exclude-layer': {
        const layerName = (action.payload?.layerName as string) ?? action.targetId
        if (!layerName) return
        const { useExcludedLayersStore } = await import('../../stores/excludedLayersStore')
        useExcludedLayersStore.getState().exclude(layerName)
        return
      }
      case 'reclassify-zone':
      case 'flag-anomaly': {
        const spaceId = (action.payload?.spaceId as string) ?? action.targetId
        if (!spaceId) return
        usePlanEngineStore.getState().selectSpace?.(spaceId)
        return
      }
      default:
        return
    }
  }, [])

  const handleAttributionConfirm = useCallback(async (attributions: Array<FloorAttribution & { level: FloorLevel }>) => {
    if (!plan) return
    const ignoredIds = new Set(
      clusters.filter(c => !attributions.some(a => a.clusterId === c.id)).map(c => c.id),
    )
    let workingPlan = { ...plan }
    if (ignoredIds.size > 0) {
      const { removeFloorFromPlan } = await import('../../stores/plansLibraryStore')
      for (const id of ignoredIds) workingPlan = removeFloorFromPlan(workingPlan, id)
    }
    const newFloors = attributions.map(a => ({
      id: a.level,
      label: FLOOR_LABEL_FR[a.level],
      bounds: a.bounds,
      entityCount: a.entityCount,
      stackOrder: FLOOR_STACK_ORDER[a.level],
    }))
    const levelByClusterId = new Map(attributions.map(a => [a.clusterId, a.level]))
    const retag = <T extends { floorId?: string }>(item: T, cx: number, cy: number): T => {
      if (item.floorId && levelByClusterId.has(item.floorId)) {
        return { ...item, floorId: levelByClusterId.get(item.floorId) }
      }
      for (const a of attributions) {
        const b = a.bounds
        if (cx >= b.minX && cx <= b.maxX && cy >= b.minY && cy <= b.maxY) {
          return { ...item, floorId: a.level }
        }
      }
      return item
    }
    setParsedPlan({
      ...workingPlan,
      detectedFloors: newFloors,
      spaces: workingPlan.spaces.map(sp => retag(sp, sp.bounds.centerX, sp.bounds.centerY)),
      wallSegments: workingPlan.wallSegments.map(w => retag(w, (w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2)),
      dimensions: (workingPlan.dimensions ?? []).map(d => retag(d, (d.p1[0] + d.p2[0]) / 2, (d.p1[1] + d.p2[1]) / 2)),
    })
    closeFloorAttribution()
    openProph3tModal()
  }, [plan, clusters, setParsedPlan, closeFloorAttribution, openProph3tModal])

  const onRefresh = useCallback(async () => {
    if (!plan) return
    const { runSkill } = await import('../orchestrator')
    await runSkill('analyzePlanAtImport', {
      plan,
      importId: `refresh-${Date.now()}`,
      fileName: 'plan courant',
    })
  }, [plan])

  const onCancelAttribution = useCallback(() => {
    closeFloorAttribution()
    openProph3tModal()
  }, [closeFloorAttribution, openProph3tModal])

  // ═══ AUCUN EARLY RETURN AVANT ICI — tous les hooks sont définis ═══
  // Tout le rendu conditionnel se fait via les flags dans le JSX.

  const shouldRender = !disabled && !!plan

  return (
    <>
      {shouldRender && clusters.length > 1 && (
        <FloorAttributionModal
          open={floorAttributionOpen}
          detectedClusters={clusters}
          onConfirm={handleAttributionConfirm}
          onCancel={onCancelAttribution}
        />
      )}
      {shouldRender && (
        <Proph3tImportModal
          open={proph3tModalOpen}
          onClose={closeProph3tModal}
          projectName="Cosmos Angré"
          orgName="Centre commercial · Abidjan"
          onApplyAction={onApplyAction}
          onValidatePlan={validatePlan}
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}
