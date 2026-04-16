// ═══ usePlanHydration — Recharge parsedPlan depuis IndexedDB au montage ═══
// + régénère un blob URL frais pour dxfBlobUrl (les anciens blobs meurent au refresh)

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

    ;(async () => {
      let plan = current
      if (!plan) {
        plan = await loadPlanFromCache().catch(() => null)
        if (plan) console.log('[PlanHydration] parsedPlan restauré depuis IndexedDB')
      }
      if (!plan) return

      // Régénère un blob URL frais si dxfBlobUrl est mort
      if (plan.dxfBlobUrl) {
        try {
          const res = await fetch(plan.dxfBlobUrl, { method: 'HEAD' }).catch(() => null)
          const alive = res && res.ok
          if (!alive) {
            // Cherche dans planFileCache un fichier DXF à re-blober
            const { listPlanFiles, getPlanFileUrl } = await import('../stores/planFileCache')
            const files = await listPlanFiles()
            const dxfFiles = files
              .filter(f => f.sourceType === 'dxf' || f.sourceType === 'dwg')
              .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            if (dxfFiles.length > 0) {
              const freshUrl = await getPlanFileUrl(dxfFiles[0].importId)
              if (freshUrl) {
                plan = { ...plan, dxfBlobUrl: freshUrl }
                console.log(`[PlanHydration] blob DXF régénéré depuis IDB : ${dxfFiles[0].fileName}`)
              } else {
                // Pas de fichier DXF en IDB → on retire le dxfBlobUrl pour éviter "Chargement..." éternel
                plan = { ...plan, dxfBlobUrl: undefined }
                console.warn('[PlanHydration] aucun DXF en IDB, rendu fallback SVG/zones')
              }
            } else {
              plan = { ...plan, dxfBlobUrl: undefined }
              console.warn('[PlanHydration] aucun DXF en IDB (listPlanFiles vide)')
            }
          }
        } catch (err) {
          console.warn('[PlanHydration] erreur check blob', err)
        }
      }

      // Set direct pour éviter la boucle save→load
      if (!current || current !== plan) {
        usePlanEngineStore.setState({ parsedPlan: plan })
      }
    })()
  }, [])
}
