// ═══ COLLABORATION — Types ═══

export type UserRole =
  | 'owner'
  | 'manager'
  | 'security_consultant'
  | 'designer'
  | 'tenant'
  | 'reviewer'
  | 'viewer'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  lastActive?: string
}

export interface ShareLink {
  id: string
  projectId: string
  token: string
  role: UserRole
  expiresAt: string | null
  createdBy: string
  createdAt: string
  label?: string
  active: boolean
}

export interface PlanAnnotation {
  id: string
  projectId: string
  x: number
  y: number
  floorId: string
  authorId: string
  authorName: string
  text: string
  status: 'open' | 'resolved' | 'wont_fix'
  replies: AnnotationReply[]
  createdAt: string
  updatedAt: string
}

export interface AnnotationReply {
  id: string
  annotationId: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export interface SectionValidation {
  id: string
  projectId: string
  sectionId: string
  volume: 'vol2' | 'vol3'
  status: 'draft' | 'in_review' | 'approved' | 'rejected'
  validatedBy?: string
  validatedAt?: string
  notes?: string
}

export interface PlanVersion {
  id: string
  projectId: string
  versionNumber: number
  label: string
  snapshot: Record<string, unknown>
  createdBy: string
  createdAt: string
}

export const ROLE_PERMISSIONS: Record<UserRole, {
  label: string
  description: string
  color: string
  canEdit: boolean
  canComment: boolean
  canValidate: boolean
  canExport: boolean
  canManageTeam: boolean
  sections: string[] | 'all'
}> = {
  owner: {
    label: 'Propriétaire', description: 'Accès total à tous les modules', color: '#EF4444',
    canEdit: true, canComment: true, canValidate: true, canExport: true, canManageTeam: true, sections: 'all',
  },
  manager: {
    label: 'Manager', description: 'Lecture complète + commentaires', color: '#F59E0B',
    canEdit: false, canComment: true, canValidate: true, canExport: true, canManageTeam: false, sections: 'all',
  },
  security_consultant: {
    label: 'Consultant Sécurité', description: 'Édition Vol.2 uniquement', color: '#3B82F6',
    canEdit: true, canComment: true, canValidate: false, canExport: true, canManageTeam: false, sections: ['vol2'],
  },
  designer: {
    label: 'Designer', description: 'Édition signalétique Vol.3', color: '#10B981',
    canEdit: true, canComment: true, canValidate: false, canExport: true, canManageTeam: false, sections: ['vol3'],
  },
  tenant: {
    label: 'Enseigne', description: 'Lecture plan Vol.3 uniquement', color: '#8B5CF6',
    canEdit: false, canComment: false, canValidate: false, canExport: false, canManageTeam: false, sections: ['vol3'],
  },
  reviewer: {
    label: 'Validateur', description: 'Lecture + validation uniquement', color: '#EC4899',
    canEdit: false, canComment: true, canValidate: true, canExport: true, canManageTeam: false, sections: 'all',
  },
  viewer: {
    label: 'Invité', description: 'Lecture seule temporaire (24h)', color: '#6B7280',
    canEdit: false, canComment: false, canValidate: false, canExport: false, canManageTeam: false, sections: 'all',
  },
}
