// ═══ FT.5 — Multi-Tenant & RBAC ═══

export type UserRole =
  | 'super_admin'
  | 'dg'
  | 'dga'
  | 'responsable_securite'
  | 'responsable_commercial'
  | 'operateur'
  | 'lecture_seule'

export interface RolePermissions {
  role: UserRole
  label: string
  description: string
  volumes: ('vol1' | 'vol2' | 'vol3')[]
  canEdit: boolean
  canExport: boolean
  canManageUsers: boolean
  canAccessProph3t: boolean
  canViewBudget: boolean
  canApproveReports: boolean
}

export const ROLE_DEFINITIONS: RolePermissions[] = [
  {
    role: 'super_admin', label: 'Super Admin', description: 'Acces complet a tous les volumes et parametres',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: true, canExport: true, canManageUsers: true, canAccessProph3t: true, canViewBudget: true, canApproveReports: true,
  },
  {
    role: 'dg', label: 'Directeur General', description: 'Vue complete, approbation rapports, lecture budgets',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: false, canExport: true, canManageUsers: false, canAccessProph3t: true, canViewBudget: true, canApproveReports: true,
  },
  {
    role: 'dga', label: 'Directeur General Adjoint', description: 'Vue complete, edition limitee',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: true, canExport: true, canManageUsers: false, canAccessProph3t: true, canViewBudget: true, canApproveReports: false,
  },
  {
    role: 'responsable_securite', label: 'Responsable Securite', description: 'Acces Vol.2 complet, lecture Vol.1 et Vol.3',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: true, canExport: true, canManageUsers: false, canAccessProph3t: true, canViewBudget: true, canApproveReports: false,
  },
  {
    role: 'responsable_commercial', label: 'Responsable Commercial', description: 'Acces Vol.1 complet, lecture Vol.2 et Vol.3',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: true, canExport: true, canManageUsers: false, canAccessProph3t: true, canViewBudget: true, canApproveReports: false,
  },
  {
    role: 'operateur', label: 'Operateur', description: 'Edition sur le volume assigne, pas de budget',
    volumes: ['vol2'], canEdit: true, canExport: false, canManageUsers: false, canAccessProph3t: false, canViewBudget: false, canApproveReports: false,
  },
  {
    role: 'lecture_seule', label: 'Lecture seule', description: 'Consultation uniquement, pas de modification',
    volumes: ['vol1', 'vol2', 'vol3'], canEdit: false, canExport: false, canManageUsers: false, canAccessProph3t: false, canViewBudget: false, canApproveReports: false,
  },
]

export interface ProjectMember {
  userId: string
  email: string
  displayName: string
  role: UserRole
  invitedAt: string
  lastActive?: string
}

export interface AuditLogEntry {
  id: string
  userId: string
  userEmail: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown>
  timestamp: string
}

export function hasPermission(role: UserRole, permission: keyof Omit<RolePermissions, 'role' | 'label' | 'description' | 'volumes'>): boolean {
  const def = ROLE_DEFINITIONS.find(r => r.role === role)
  if (!def) return false
  return def[permission] as boolean
}

export function canAccessVolume(role: UserRole, volume: 'vol1' | 'vol2' | 'vol3'): boolean {
  const def = ROLE_DEFINITIONS.find(r => r.role === role)
  if (!def) return false
  return def.volumes.includes(volume)
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_DEFINITIONS.find(r => r.role === role)?.label ?? role
}
