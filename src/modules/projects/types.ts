// ═══ MULTI-PROJECT — Types ═══

import type { VerticalId } from '../../verticals/types'

/** @deprecated Utiliser `VerticalId` pour les nouvelles features. Conservé pour compat. */
export type ProjectType = 'mall' | 'office' | 'hotel' | 'hospital' | 'school'
export type ProjectStatus = 'conception' | 'deploiement' | 'ouvert' | 'archive'

export interface Project {
  id: string
  name: string
  client: string
  address: string
  /** Pays (code ISO 2 lettres). */
  country?: string
  /** Devise locale (code ISO 4217). */
  currency?: string
  /** Taux TVA local en %. */
  vat_rate?: number
  /** Langue principale (code ISO). */
  locale?: string
  /** Référentiels réglementaires activés. */
  regulatory_refs?: RegulatoryRef[]
  surface_m2: number
  /** @deprecated Utiliser `verticalId`. Conservé pour backward compat. */
  type: ProjectType
  /** Verticale Atlas BIM (8 types de bâtiments supportés). Fallback auto depuis `type` si absent. */
  verticalId?: VerticalId
  opening_date: string
  status: ProjectStatus
  created_by: string
  team_members: string[]
  created_at: string
  updated_at: string
  thumbnail?: string
  /** Nombre d'étages. */
  floor_count?: number
}

/** Convertit `ProjectType` (legacy) → `VerticalId` (nouvelle taxonomie). */
export function toVerticalId(t: ProjectType): VerticalId {
  const map: Record<ProjectType, VerticalId> = {
    'mall': 'mall',
    'office': 'office',
    'hotel': 'hotel',
    'hospital': 'hospital',
    'school': 'campus',
  }
  return map[t] ?? 'mall'
}

/** Résout la verticale d'un projet (priorité `verticalId`, fallback `type`). */
export function projectVertical(p: Pick<Project, 'verticalId' | 'type'>): VerticalId {
  return p.verticalId ?? toVerticalId(p.type)
}

export type RegulatoryRef =
  | 'erp-france'           // Arrêté du 25 juin 1980 (France/UEMOA)
  | 'erp-nfpa'             // NFPA 101 Life Safety (USA)
  | 'erp-bs'               // BS 5588 (UK)
  | 'pmr-loi-2005-102'     // France - handicap
  | 'pmr-ada'              // Americans with Disabilities Act (USA)
  | 'pmr-iso-21542'        // International
  | 'signage-iso-7010'     // Pictogrammes (universel)
  | 'compta-syscohada'     // UEMOA
  | 'compta-ifrs'          // International
  | 'compta-gaap'          // USA
  | 'wcag-21-aa'           // Web accessibility

export const REGULATORY_PRESETS: Record<string, { label: string; refs: RegulatoryRef[] }> = {
  'UEMOA': {
    label: 'UEMOA / Afrique de l\'Ouest',
    refs: ['erp-france', 'pmr-loi-2005-102', 'signage-iso-7010', 'compta-syscohada', 'wcag-21-aa'],
  },
  'FR': {
    label: 'France',
    refs: ['erp-france', 'pmr-loi-2005-102', 'signage-iso-7010', 'compta-ifrs', 'wcag-21-aa'],
  },
  'US': {
    label: 'États-Unis',
    refs: ['erp-nfpa', 'pmr-ada', 'signage-iso-7010', 'compta-gaap', 'wcag-21-aa'],
  },
  'UK': {
    label: 'Royaume-Uni',
    refs: ['erp-bs', 'pmr-iso-21542', 'signage-iso-7010', 'compta-ifrs', 'wcag-21-aa'],
  },
  'INTL': {
    label: 'International / autre',
    refs: ['pmr-iso-21542', 'signage-iso-7010', 'compta-ifrs', 'wcag-21-aa'],
  },
}

export const COUNTRY_DEFAULTS: Record<string, { currency: string; vat: number; locale: string; preset: string }> = {
  CI: { currency: 'XOF', vat: 18, locale: 'fr-FR', preset: 'UEMOA' },
  SN: { currency: 'XOF', vat: 18, locale: 'fr-FR', preset: 'UEMOA' },
  BF: { currency: 'XOF', vat: 18, locale: 'fr-FR', preset: 'UEMOA' },
  ML: { currency: 'XOF', vat: 18, locale: 'fr-FR', preset: 'UEMOA' },
  FR: { currency: 'EUR', vat: 20, locale: 'fr-FR', preset: 'FR' },
  BE: { currency: 'EUR', vat: 21, locale: 'fr-BE', preset: 'FR' },
  US: { currency: 'USD', vat: 0,  locale: 'en-US', preset: 'US' },
  GB: { currency: 'GBP', vat: 20, locale: 'en-GB', preset: 'UK' },
  MA: { currency: 'MAD', vat: 20, locale: 'fr-MA', preset: 'INTL' },
  DZ: { currency: 'DZD', vat: 19, locale: 'fr-DZ', preset: 'INTL' },
  TN: { currency: 'TND', vat: 19, locale: 'fr-TN', preset: 'INTL' },
}

export interface ProjectTemplate {
  id: string
  name: string
  type: ProjectType
  description: string
  default_zones: { label: string; type: string; surfaceRatio: number }[]
  default_camera_density: number
  default_door_rules: string[]
  checklist_items: string[]
  estimated_capex_per_m2_fcfa: number
  icon: string
}
