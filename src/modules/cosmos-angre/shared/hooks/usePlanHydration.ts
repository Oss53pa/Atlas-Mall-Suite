// ═══ usePlanHydration — Recharge parsedPlan depuis IndexedDB au montage ═══

import { useEffect } from 'react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { loadPlanFromCache } from '../stores/parsedPlanCache'

let hydrated = false

/** À appeler dans chaque volume (Vol1/Vol2/Vol3) pour s'assurer que parsedPlan
 *  est chargé depuis le cache IndexedDB s'il n'est pas en mémoire. */
export function usePlanHydration(): void {
  useEffect(() => {
    if (hydrated) return
    hydrated = true
    const current = usePlanEngineStore.getState().parsedPlan
    if (current) return // déjà hydraté
    loadPlanFromCache().then(plan => {
      if (plan) {
        // On appelle set direct (pas setParsedPlan) pour éviter d'écrire en boucle
        usePlanEngineStore.setState({ parsedPlan: plan })
        console.log('[PlanHydration] parsedPlan restauré depuis IndexedDB')
      }
    }).catch(() => {})
  }, [])
}
