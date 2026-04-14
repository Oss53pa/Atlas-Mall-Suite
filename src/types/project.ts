// ═══ Project types ═══

export type ProjectPhase = 'pre_opening' | 'operations' | 'renovation'
export type ProjectStatus = 'active' | 'archived' | 'closed'

export interface Project {
  id: string
  org_id: string
  name: string
  slug: string | null
  phase: ProjectPhase | null
  opening_date: string | null
  total_area_sqm: number | null
  city: string | null
  country: string
  status: ProjectStatus
  volumes_enabled: string[]
  color: string
  created_at: string
}
