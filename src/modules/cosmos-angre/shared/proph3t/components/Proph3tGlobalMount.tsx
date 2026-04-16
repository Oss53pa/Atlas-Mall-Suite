// ═══ PROPH3T GLOBAL MOUNT — Monté UNE SEULE FOIS au niveau racine ═══
// Évite que la modal soit instanciée N fois (1 par PlanCanvasV2 dans Vol1/Vol2/Vol3).
// Lit le parsedPlan depuis le store, construit les inputs à la demande.

import React, { useCallback } from 'react'
import { Proph3tImportModal } from './Proph3tImportModal'
import { FloorAttributionModal, type FloorAttribution } from '../../components/FloorAttributionModal'
import { usePlanEngineStore } from '../../stores/planEngineStore'
import { usePlanHydration } from '../../hooks/usePlanHydration'
import { FloorLevel, FLOOR_LABEL_FR, FLOOR_STACK_ORDER } from '../../domain/FloorLevel'
import type { ParsedPlan } from '../../planReader/planEngineTypes'
import type { Proph3tAction } from '../orchestrator.types'

export function Proph3tGlobalMount() {
  // Hydrate le parsedPlan depuis IndexedDB si pas encore en mémoire
  usePlanHydration()
  const plan = usePlanEngineStore(s => s.parsedPlan)
  const setParsedPlan = usePlanEngineStore(s => s.setParsedPlan)
  const proph3tModalOpen = usePlanEngineStore(s => s.proph3tModalOpen)
  const closeProph3tModal = usePlanEngineStore(s => s.closeProph3tModal)
  const openProph3tModal = usePlanEngineStore(s => s.openProph3tModal)
  const floorAttributionOpen = usePlanEngineStore(s => s.floorAttributionOpen)
  const closeFloorAttribution = usePlanEngineStore(s => s.closeFloorAttribution)
  const validatePlan = usePlanEngineStore(s => s.validatePlan)

  // ⚠ IMPORTANT : TOUS les hooks doivent être appelés AVANT tout return conditionnel
  // (règles des hooks React). useCallback ici DOIT rester avant les early returns.
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

  // Kill switch : si PROPH3T désactivé, ne monte rien
  const disabled = (() => {
    try { return localStorage.getItem('atlas-proph3t-disabled') === '1' }
    catch { return false }
  })()
  if (disabled) return null

  // Rien à monter si pas de plan
  if (!plan) return null

  // ── Attribution ────────────────────────────────────────
  const clusters = plan.detectedFloors ?? []

  const handleAttributionConfirm = async (attributions: Array<FloorAttribution & { level: FloorLevel }>) => {
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
  }

  return (
    <>
      {clusters.length > 1 && (
        <FloorAttributionModal
          open={floorAttributionOpen}
          detectedClusters={clusters}
          onConfirm={handleAttributionConfirm}
          onCancel={() => { closeFloorAttribution(); openProph3tModal() }}
        />
      )}
      <Proph3tImportModal
        open={proph3tModalOpen}
        onClose={closeProph3tModal}
        projectName="Cosmos Angré"
        orgName="Centre commercial · Abidjan"
        onApplyAction={onApplyAction}
        onValidatePlan={validatePlan}
        onRefresh={async () => {
          const { runSkill } = await import('../orchestrator')
          await runSkill('analyzePlanAtImport', {
            plan,
            importId: `refresh-${Date.now()}`,
            fileName: 'plan courant',
          })
        }}
      />
    </>
  )
}
