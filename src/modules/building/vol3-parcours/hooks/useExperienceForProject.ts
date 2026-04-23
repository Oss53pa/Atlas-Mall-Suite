// ═══ HOOK — Experience data pour le projet actif ═══
//
// Centralise :
//   • Résolution du projectId + verticalId depuis useProjectStore
//   • Initialisation auto du store au 1er mount
//   • Calcul dynamique des KPIs (progress %) depuis les engines branchés
//     (plan, lots, journey) — transforme les templates en vraie data

import { useEffect, useMemo } from 'react'
import { useProjectStore } from '../../../projects/projectStore'
import { projectVertical } from '../../../projects/types'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { useLotsStore } from '../../shared/stores/lotsStore'
import { useJourneyStore } from '../store/journeyStore'
import { useExperienceStore, type Kpi } from '../store/experienceStore'
import type { VerticalId } from '../../../../verticals/types'

/** Calcule dynamiquement la valeur actuelle + progress d'un KPI selon son
 *  `computedBy`. Retourne le KPI enrichi (value + progress auto). */
function computeKpi(
  kpi: Kpi,
  ctx: {
    spacesCount: number
    validatedCount: number
    totalAreaSqm: number
    lotsCount: number
    occupiedLots: number
    journeyStagesCount: number
    dwellTimeMinEstimate: number
  },
): Kpi {
  // Si computé à la main, on laisse tel quel
  if (!kpi.computedBy || kpi.computedBy === 'manual') return kpi

  let value: number | string | undefined
  let progress: number | undefined

  switch (kpi.computedBy) {
    case 'plan-engine':
      // Taux de modélisation (validés / total espaces)
      if (ctx.spacesCount === 0) {
        value = '0 espace'
        progress = 0
      } else {
        const pct = Math.round((ctx.validatedCount / ctx.spacesCount) * 100)
        value = `${ctx.validatedCount}/${ctx.spacesCount} (${pct} %)`
        progress = pct
      }
      break

    case 'lots-store': {
      // Occupation ou CA selon label
      if (/occupation/i.test(kpi.label)) {
        if (ctx.lotsCount === 0) { value = 'N/A'; progress = 0; break }
        const pct = Math.round((ctx.occupiedLots / ctx.lotsCount) * 100)
        value = `${pct} %`
        progress = pct
      } else if (/CA|loyer/i.test(kpi.label)) {
        value = ctx.lotsCount > 0 ? `${ctx.lotsCount} lots actifs` : 'Importez des lots Vol.1'
        progress = ctx.lotsCount > 0 ? 30 : 0
      }
      break
    }

    case 'journey-store':
      if (ctx.journeyStagesCount === 0) {
        value = 'Journey Map vide'
        progress = 0
      } else {
        value = `${ctx.dwellTimeMinEstimate.toFixed(0)} min (${ctx.journeyStagesCount} étapes)`
        // progress = % cible atteinte (approximatif)
        progress = Math.min(100, Math.round((ctx.dwellTimeMinEstimate / 52) * 100))
      }
      break

    case 'proph3t':
      // Branché sur les résultats Proph3t à venir (skills externe)
      value = kpi.currentValue ?? '—'
      progress = kpi.progress
      break
  }

  return { ...kpi, currentValue: value, progress }
}

export function useExperienceForProject() {
  const activeProject = useProjectStore(s => s.getActiveProject())
  const projectId = activeProject?.id ?? 'cosmos-angre'
  const verticalId: VerticalId = activeProject ? projectVertical(activeProject) : 'mall'

  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const spaces = usePlanEngineStore(s => s.spaces)
  const lots = useLotsStore(s => s.all())
  const stages = useJourneyStore(s => s.stages)

  // Ensure store initialized for this project
  const ensureInitialized = useExperienceStore(s => s.ensureInitialized)
  useEffect(() => {
    ensureInitialized(projectId, verticalId)
  }, [projectId, verticalId, ensureInitialized])

  const personas    = useExperienceStore(s => s.personasByProject[projectId] ?? [])
  const touchpoints = useExperienceStore(s => s.touchpointsByProject[projectId] ?? [])
  const kpisRaw     = useExperienceStore(s => s.kpisByProject[projectId] ?? [])
  const actions     = useExperienceStore(s => s.actionsByProject[projectId] ?? [])

  // Enrichir KPIs avec valeurs dynamiques
  const kpis = useMemo(() => {
    const ctx = {
      spacesCount: spaces.length + (parsedPlan?.spaces.length ?? 0),
      validatedCount: spaces.filter(s => (s as unknown as { validated?: boolean }).validated).length,
      totalAreaSqm: (parsedPlan?.bounds.width ?? 0) * (parsedPlan?.bounds.height ?? 0),
      lotsCount: lots.length,
      // LotStatus.Vacant = 'vacant' — on compte ceux qui sont occupés/réservés
      occupiedLots: lots.filter(l => l.commercial?.status && l.commercial.status !== 'vacant').length,
      journeyStagesCount: stages.length,
      // Extrait les minutes du champ `duration` libre (ex: "~15 min", "30-45 min"). Fallback : 0.
      dwellTimeMinEstimate: stages.reduce((sum, s) => {
        const m = /(\d+)\s*min/.exec(s.duration ?? '')
        return sum + (m ? parseInt(m[1], 10) : 0)
      }, 0),
    }
    return kpisRaw.map(k => computeKpi(k, ctx))
  }, [kpisRaw, parsedPlan, spaces, lots, stages])

  return {
    projectId,
    projectName: activeProject?.name ?? 'Projet',
    verticalId,
    personas,
    touchpoints,
    kpis,
    actions,
  }
}
