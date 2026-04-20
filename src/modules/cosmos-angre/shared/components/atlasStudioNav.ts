// ═══ ATLAS STUDIO · PHASE 0 — Shared nav contract ═══
// Canonical Studio group used as Phase 0 in every volume (Vol1/Vol2/Vol3).
// Volumes spread ATLAS_STUDIO_CORE_ITEMS into their own nav + may add
// volume-specific items inside the same group (e.g. simulation, budget).

import {
  Upload,
  Map,
  BarChart2,
  FileText,
  MessageSquare,
  Sparkles,
  Edit3,
  type LucideIcon,
} from 'lucide-react'

export interface AtlasStudioNavItem {
  id: string
  label: string
  icon: LucideIcon
}

export const ATLAS_STUDIO_GROUP_META = {
  key: 'studio',
  label: 'ATLAS STUDIO · PHASE 0',
  icon: Sparkles,
  color: '#a855f7',
} as const

// Sections that MUST exist in every volume's Studio phase.
// Volumes may interleave their own items but these IDs are reserved.
// NOTE : L'ID "editor" est utilisé par Vol.1/Vol.2 ; Vol.3 a historiquement
// son propre ID `space_editor` avec le même composant shared.
export const ATLAS_STUDIO_CORE_ITEMS: AtlasStudioNavItem[] = [
  { id: 'plan_imports', label: 'Plans importés',  icon: Upload },
  { id: 'editor',       label: 'Éditeur espaces', icon: Edit3 },
  { id: 'plan',         label: 'Plan interactif', icon: Map },
  { id: 'analyse',      label: 'Analyse Proph3t', icon: BarChart2 },
  { id: 'rapport',      label: 'Rapport',         icon: FileText },
  { id: 'chat',         label: 'Proph3t Chat',    icon: MessageSquare },
]

export const ATLAS_STUDIO_DEFAULT_TAB = 'plan_imports'
