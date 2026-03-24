// ═══ MULTI-PROJECT — Types ═══

export type ProjectType = 'mall' | 'office' | 'hotel' | 'hospital' | 'school'
export type ProjectStatus = 'conception' | 'deploiement' | 'ouvert' | 'archive'

export interface Project {
  id: string
  name: string
  client: string
  address: string
  surface_m2: number
  type: ProjectType
  opening_date: string
  status: ProjectStatus
  created_by: string
  team_members: string[]
  created_at: string
  updated_at: string
  thumbnail?: string
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
