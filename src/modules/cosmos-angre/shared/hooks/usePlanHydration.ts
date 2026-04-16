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

      // Régénère un blob URL frais si dxfBlobUrl est mort (HEAD sur blob → ERR_METHOD,
      // donc on fait GET). Si mort → chercher dans planFileCache, sinon dropper dxfBlobUrl.
      if (plan.dxfBlobUrl) {
        let alive = false
        try {
          const res = await fetch(plan.dxfBlobUrl).catch(() => null)
          alive = !!(res && res.ok)
        } catch { alive = false }

        if (!alive) {
          try {
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
                plan = { ...plan, dxfBlobUrl: undefined }
                console.warn('[PlanHydration] aucun DXF en IDB → fallback SVG')
              }
            } else {
              // Aucun fichier DXF disponible → retire dxfBlobUrl pour éviter ERR_FILE_NOT_FOUND
              plan = { ...plan, dxfBlobUrl: undefined }
              console.warn('[PlanHydration] planFileCache vide — dxfBlobUrl retiré')
            }
          } catch (err) {
            console.warn('[PlanHydration] erreur lookup IDB', err)
            plan = { ...plan, dxfBlobUrl: undefined }
          }
        }
      }

      // Purge planImageUrl si mort aussi (svg/png preview peut être un blob mort)
      if (plan.planImageUrl) {
        try {
          const res = await fetch(plan.planImageUrl).catch(() => null)
          if (!res || !res.ok) {
            plan = { ...plan, planImageUrl: undefined }
            console.warn('[PlanHydration] planImageUrl mort → retiré')
          }
        } catch {
          plan = { ...plan, planImageUrl: undefined }
        }
      }

      // Set direct pour éviter la boucle save→load
      if (!current || current !== plan) {
        usePlanEngineStore.setState({ parsedPlan: plan })
      }
    })()
  }, [])
}
