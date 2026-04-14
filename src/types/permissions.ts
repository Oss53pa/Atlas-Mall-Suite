// ═══ Permissions ═══

import type { OrgRole } from './organization'

export type Permission =
  | 'vol1.read' | 'vol1.write'
  | 'vol2.read' | 'vol2.write'
  | 'vol3.read' | 'vol3.write'
  | 'finance.read'
  | 'dce.read' | 'dce.write'
  | 'ai.use'
  | 'reports.export'
  | 'members.manage'

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  super_admin: ['vol1.read','vol1.write','vol2.read','vol2.write','vol3.read','vol3.write','finance.read','dce.read','dce.write','ai.use','reports.export','members.manage'],
  admin: ['vol1.read','vol1.write','vol2.read','vol2.write','vol3.read','vol3.write','finance.read','dce.read','dce.write','ai.use','reports.export','members.manage'],
  consultant: ['vol1.read','vol2.read','vol3.read','ai.use','reports.export'],
  enseigne: ['vol1.read'],
  investisseur: ['finance.read','reports.export'],
  viewer: ['vol1.read','vol2.read','vol3.read'],
}
