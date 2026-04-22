// ═══ usePlanHydration — Recharge parsedPlan depuis IndexedDB au montage ═══
// Principe : les blob URLs créées dans la session courante sont reconnaissables
// par leur préfixe (blob:<origin>/...). Si le parsedPlan restauré contient un
// blob URL d'une session précédente, il est FORCÉMENT mort → on le purge
// SANS essayer de fetch (ce qui générait ERR_FILE_NOT_FOUND dans la console).

import { useEffect } from 'react'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { loadPlanFromCache } from '../stores/parsedPlanCache'

let hydrated = false

/** Set en mémoire des blob URLs créés DANS cette session.
 *  Un blob URL qui n'y figure pas = blob d'une session précédente = MORT. */
const sessionBlobUrls = new Set<string>()

/** À appeler chaque fois qu'on crée un nouveau blob URL pour qu'il soit
 *  reconnu comme vivant par la prochaine hydratation. */
export function registerSessionBlob(url: string): void {
  sessionBlobUrls.add(url)
}

// Wrap URL.createObjectURL pour tracker tous les blobs de la session
if (typeof URL !== 'undefined' && URL.createObjectURL) {
  const original = URL.createObjectURL.bind(URL)
  URL.createObjectURL = function (obj: Blob | MediaSource): string {
    const url = original(obj)
    sessionBlobUrls.add(url)
    return url
  }
}

/** À appeler dans chaque volume (Vol1/Vol2/Vol3) pour s'assurer que parsedPlan
 *  est chargé depuis le cache IndexedDB s'il n'est pas en mémoire. */
export function usePlanHydration(): void {
  useEffect(() => {
    if (hydrated) return
    hydrated = true
    const current = usePlanEngineStore.getState().parsedPlan

    ;(async () => {
      // Rehydrate tous les imports (multi-plans) — permet au sélecteur
      // de SpaceEditorSection d'afficher tous les plans persistés.
      void usePlanEngineStore.getState().hydrateParsedPlans()

      let plan = current
      if (!plan) {
        plan = await loadPlanFromCache().catch(() => null)
        if (plan) console.log('[PlanHydration] parsedPlan restauré depuis IndexedDB')
      }
      if (!plan) return

      // Si dxfBlobUrl n'est pas dans la session courante → c'est un blob mort (session précédente)
      // On le remplace directement SANS fetch (évite ERR_FILE_NOT_FOUND bruyant)
      if (plan.dxfBlobUrl && !sessionBlobUrls.has(plan.dxfBlobUrl)) {
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
            }
          } else {
            plan = { ...plan, dxfBlobUrl: undefined }
          }
        } catch {
          plan = { ...plan, dxfBlobUrl: undefined }
        }
      }

      // planImageUrl : pareil, pas de fetch, juste check session set
      if (plan.planImageUrl && !sessionBlobUrls.has(plan.planImageUrl)) {
        plan = { ...plan, planImageUrl: undefined }
      }

      if (!current || current !== plan) {
        usePlanEngineStore.setState({ parsedPlan: plan })
      }
    })()
  }, [])
}
