// ═══ Configuration des statuts — partage entre tous les volumes ═══

import type { SpaceStatus } from '../../vol1-commercial/store/vol1Types'

// ── Vol.1 : Statuts des cellules commerciales ──

export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  occupied: 'Occupe',
  vacant: 'Vacant',
  reserved: 'Reserve',
  under_works: 'En travaux',
}

export const SPACE_STATUS_COLORS: Record<SpaceStatus, string> = {
  occupied: '#22c55e',
  vacant: '#ef4444',
  reserved: '#f59e0b',
  under_works: '#6366f1',
}

// ── Vol.2 : Statuts de conformite ──

export type ComplianceStatus = 'conforme' | 'non_conforme' | 'a_verifier' | 'en_cours'

export const COMPLIANCE_STATUS_CONFIG: Record<ComplianceStatus, {
  color: string
  bg: string
  border: string
  label: string
}> = {
  conforme: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    label: 'Conforme',
  },
  non_conforme: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    label: 'Non conforme',
  },
  a_verifier: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    label: 'A verifier',
  },
  en_cours: {
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
    label: 'En cours',
  },
}
