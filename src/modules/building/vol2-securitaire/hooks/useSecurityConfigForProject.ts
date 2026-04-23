// ═══ HOOK — Security config pour projet actif ═══

import { useEffect } from 'react'
import { useProjectStore } from '../../../projects/projectStore'
import { projectVertical } from '../../../projects/types'
import { useSecurityConfigStore } from '../store/securityConfigStore'
import type { VerticalId } from '../../../../verticals/types'

export function useSecurityConfigForProject() {
  const activeProject = useProjectStore(s => s.getActiveProject())
  const projectId = activeProject?.id ?? 'cosmos-angre'
  const verticalId: VerticalId = activeProject ? projectVertical(activeProject) : 'mall'

  const ensureInitialized = useSecurityConfigStore(s => s.ensureInitialized)
  useEffect(() => {
    ensureInitialized(projectId, verticalId)
  }, [projectId, verticalId, ensureInitialized])

  return {
    projectId,
    projectName: activeProject?.name ?? 'Projet',
    verticalId,
    accessEquipments:    useSecurityConfigStore(s => s.accessEquipments[projectId]    ?? []),
    accessRights:        useSecurityConfigStore(s => s.accessRights[projectId]        ?? []),
    fireEquipments:      useSecurityConfigStore(s => s.fireEquipments[projectId]      ?? []),
    fireScenarios:       useSecurityConfigStore(s => s.fireScenarios[projectId]       ?? []),
    fireExercises:       useSecurityConfigStore(s => s.fireExercises[projectId]       ?? []),
    erpChecks:           useSecurityConfigStore(s => s.erpChecks[projectId]           ?? []),
    orgNodes:            useSecurityConfigStore(s => s.orgNodes[projectId]            ?? []),
    orgConnections:      useSecurityConfigStore(s => s.orgConnections[projectId]      ?? []),
    perimeterEquipments: useSecurityConfigStore(s => s.perimeterEquipments[projectId] ?? []),
    procedures:          useSecurityConfigStore(s => s.procedures[projectId]          ?? []),
    securityAgents:      useSecurityConfigStore(s => s.securityAgents[projectId]      ?? []),
    vmsProviders:        useSecurityConfigStore(s => s.vmsProviders[projectId]        ?? []),
    incidentTemplates:   useSecurityConfigStore(s => s.incidentTemplates[projectId]   ?? []),
  }
}
