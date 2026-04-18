// ═══ PROPH3T BOOTSTRAP — Enregistre les skills + branche triggers ═══
// À appeler une fois au démarrage de l'app (idempotent).

import { registerSkill, wireDomainTriggers, listSkills } from './orchestrator'
import { analyzePlanAtImport, type AnalyzePlanInput } from './skills/analyzePlanAtImport'
import { analyzeCommercialMix, type CommercialAnalysisInput } from './skills/analyzeCommercialMix'
import { auditSecurity, type SecurityAuditInput } from './skills/auditSecurity'
import { analyzeParcours, type ParcoursAnalysisInput } from './skills/analyzeParcours'

let bootstrapped = false

export async function bootstrapProph3t(): Promise<void> {
  if (bootstrapped) return
  bootstrapped = true

  // Enregistre toutes les skills disponibles
  registerSkill<AnalyzePlanInput, ReturnType<typeof analyzePlanAtImport>>(
    'analyzePlanAtImport', analyzePlanAtImport,
  )
  registerSkill<CommercialAnalysisInput, ReturnType<typeof analyzeCommercialMix>>(
    'analyzeCommercialMix', analyzeCommercialMix,
  )
  registerSkill<SecurityAuditInput, ReturnType<typeof auditSecurity>>(
    'auditSecurity', auditSecurity,
  )
  registerSkill<ParcoursAnalysisInput, ReturnType<typeof analyzeParcours>>(
    'analyzeParcours', analyzeParcours,
  )

  // Branche le bus d'événements de domaine (logging uniquement, pas d'auto-run)
  await wireDomainTriggers()

  // Les bindings auto sur lot-modified / tenant-modified ont été RETIRÉS
  // → causaient des runSkill en cascade quand upsertMany hydratait 400 lots
  // → freeze du main thread
  // Les skills Vol.1 Commercial s'exécutent maintenant SEULEMENT via le
  // panneau Proph3tVolumePanel (boutons Évaluer / Suggérer / Auditer manuels)

  console.log(`[PROPH3T] bootstrapped — skills: ${listSkills().join(', ')}`)
}

/** Récupère l'input commercial depuis le lotsStore canonique. */
function getCommercialInputFromStore(): CommercialAnalysisInput {
  // Lazy import pour éviter les cycles
   
  const { useLotsStore } = require('../stores/lotsStore') as typeof import('../stores/lotsStore')
  const lots = useLotsStore.getState().all()
  return {
    lots,
    horizonMonths: 12,
    historicalLeases: [], // sera enrichi par useVol1Store quand branché
  }
}
