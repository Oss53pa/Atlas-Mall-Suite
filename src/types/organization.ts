// ═══ Organization types ═══

export interface Organization {
  id: string
  name: string
  legal_form: string | null
  rccm: string | null
  tax_id: string | null
  cnps_id: string | null
  country: string
  city: string | null
  address: string | null
  sector: string
  accounting_standard: string
  currency_primary: string
  currency_secondary: string
  fiscal_year_start: string
  vat_rate: number
  logo_url: string | null
  accent_color: string
  plan: 'starter' | 'pro' | 'enterprise'
  plan_expires_at: string | null
  created_at: string
  updated_at: string
}

export type OrgRole = 'super_admin' | 'admin' | 'consultant' | 'enseigne' | 'investisseur' | 'viewer'

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  full_name: string | null
  job_title: string | null
  phone: string | null
  is_external: boolean
  invited_by: string | null
  invited_at: string | null
  joined_at: string | null
  status: 'active' | 'invited' | 'suspended'
}
