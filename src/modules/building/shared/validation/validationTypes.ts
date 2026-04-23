// ═══ VALIDATION HUB — Types ═══

export type ValidationRole =
  | 'owner'
  | 'security_expert'
  | 'architect'
  | 'tenant'
  | 'investor'
  | 'contractor'

export type ValidationStatus = 'brouillon' | 'en_revue' | 'commentaires' | 'approuve' | 'rejete'

export type DocumentType = 'plan_securitaire' | 'plan_commercial' | 'plan_signaletique' | 'dce' | 'rapport_apsad'

export interface ValidationDocument {
  id: string
  title: string
  type: DocumentType
  version: string
  status: ValidationStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  workflow: ValidationStep[]
  comments: ValidationComment[]
  fileUrl?: string
}

export interface ValidationStep {
  id: string
  role: ValidationRole
  assignedTo: string
  status: 'en_attente' | 'valide' | 'rejete' | 'commentaire'
  completedAt?: string
  signature?: string
}

export interface ValidationComment {
  id: string
  author: string
  role: ValidationRole
  text: string
  linkedZoneId?: string
  linkedFloorId?: string
  isoX?: number
  isoY?: number
  status: 'ouvert' | 'resolu'
  createdAt: string
}

// ── Status config ────────────────────────────────────────────

export const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string }> = {
  brouillon:    { label: 'Brouillon',     color: '#6b7280' },
  en_revue:     { label: 'En revue',      color: '#38bdf8' },
  commentaires: { label: 'Commentaires',  color: '#f59e0b' },
  approuve:     { label: 'Approuve',      color: '#22c55e' },
  rejete:       { label: 'Rejete',        color: '#ef4444' },
}

export const ROLE_LABELS: Record<ValidationRole, string> = {
  owner:           'Proprietaire (CRMC)',
  security_expert: 'Expert securite APSAD',
  architect:       'Architecte',
  tenant:          'Preneur',
  investor:        'Investisseur',
  contractor:      'Prestataire DCE',
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  plan_securitaire: 'Plan securitaire',
  plan_commercial:  'Plan commercial',
  plan_signaletique: 'Plan signaletique',
  dce:              'DCE',
  rapport_apsad:    'Rapport APSAD',
}
