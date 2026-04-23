// ═══ GLOBAL APP STORE ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Organization, OrgMember, OrgRole } from '../types/organization'
import type { Project } from '../types/project'
import type { Permission } from '../types/permissions'
import { ROLE_PERMISSIONS } from '../types/permissions'
import { supabase } from '../lib/supabase'

export interface AppUser {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
}

interface AppState {
  currentUser: AppUser | null
  isAuthenticated: boolean
  activeOrg: Organization | null
  activeProject: Project | null
  activeRole: OrgRole | null
  userOrgs: Organization[]
  userProjects: Project[]
  userMembers: OrgMember[]
  activeVolume: string
  activeTab: string
  permissions: Permission[]
  isLoading: boolean

  setCurrentUser: (user: AppUser | null) => void
  setActiveOrg: (org: Organization | null) => void
  setActiveProject: (project: Project | null) => void
  setActiveRole: (role: OrgRole | null) => void
  setActiveVolume: (vol: string) => void
  setActiveTab: (tab: string) => void
  setUserOrgs: (orgs: Organization[]) => void
  setUserProjects: (projects: Project[]) => void
  switchContext: (orgId: string, projectId?: string) => void
  loadUserContext: () => Promise<void>
  resolvePermissions: () => void
  hasPermission: (perm: Permission) => boolean
  logout: () => void
}

const DEMO_ORG: Organization = {
  id: 'org-new-heaven', name: 'New Heaven SA', legal_form: 'SA',
  rccm: 'CI-ABJ-2020-B-12345', tax_id: 'DGI-2020-00456', cnps_id: null,
  country: 'CI', city: 'Abidjan', address: 'Angré, Cocody',
  sector: 'Immobilier commercial', accounting_standard: 'SYSCOHADA',
  currency_primary: 'XOF', currency_secondary: 'EUR',
  fiscal_year_start: '01-01', vat_rate: 18.0,
  logo_url: null, accent_color: '#7e5e3c', plan: 'pro',
  plan_expires_at: null, created_at: '2025-01-15', updated_at: '2025-08-01',
}

const DEMO_PROJECT: Project = {
  id: 'cosmos-angre', org_id: 'org-new-heaven', name: 'The Mall',
  slug: 'cosmos-angre', phase: 'pre_opening', opening_date: '2026-10-16',
  total_area_sqm: 30000, city: 'Abidjan', country: 'CI',
  status: 'active', volumes_enabled: ['vol1','vol2','vol3'],
  color: '#7e5e3c', created_at: '2025-01-15',
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: { id: 'user-demo', email: 'admin@newheavensa.ci', full_name: 'Cheick Sanankoua', avatar_url: null },
      isAuthenticated: true,
      activeOrg: DEMO_ORG,
      activeProject: DEMO_PROJECT,
      activeRole: 'super_admin',
      userOrgs: [DEMO_ORG],
      userProjects: [DEMO_PROJECT],
      userMembers: [],
      activeVolume: '',
      activeTab: '',
      permissions: ROLE_PERMISSIONS.super_admin,
      isLoading: false,

      setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
      setActiveOrg: (org) => set({ activeOrg: org }),
      setActiveProject: (project) => set({ activeProject: project }),
      setActiveRole: (role) => { set({ activeRole: role }); get().resolvePermissions() },
      setActiveVolume: (vol) => set({ activeVolume: vol }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setUserOrgs: (orgs) => set({ userOrgs: orgs }),
      setUserProjects: (projects) => set({ userProjects: projects }),

      switchContext: (orgId, projectId) => {
        const { userOrgs, userProjects } = get()
        const org = userOrgs.find(o => o.id === orgId)
        if (!org) return
        const orgProjects = userProjects.filter(p => p.org_id === orgId)
        const project = projectId ? orgProjects.find(p => p.id === projectId) ?? orgProjects[0] ?? null : orgProjects[0] ?? null
        set({ activeOrg: org, activeProject: project, activeVolume: '', activeTab: '' })
        get().resolvePermissions()
      },

      loadUserContext: async () => {
        set({ isLoading: true })
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          set({
            currentUser: {
              id: user.id,
              email: user.email ?? '',
              full_name: user.user_metadata?.full_name ?? '',
              avatar_url: user.user_metadata?.avatar_url ?? null,
            },
            isAuthenticated: true,
          })

          // Load org memberships
          const { data: members } = await supabase
            .from('org_members')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')

          if (members && members.length > 0) {
            set({ userMembers: members as OrgMember[] })

            const orgIds = members.map((m: OrgMember) => m.org_id)
            const { data: orgs } = await supabase
              .from('organizations')
              .select('*')
              .in('id', orgIds)

            if (orgs && orgs.length > 0) {
              set({ userOrgs: orgs as Organization[] })
              if (!get().activeOrg) {
                set({ activeOrg: orgs[0] as Organization, activeRole: members[0].role as OrgRole })
              }
            }

            const { data: projects } = await supabase
              .from('projets')
              .select('*')
              .in('org_id', orgIds)
              .eq('status', 'active')

            if (projects && projects.length > 0) {
              set({ userProjects: projects as Project[] })
              const activeOrg = get().activeOrg
              if (!get().activeProject && activeOrg) {
                const first = projects.find((p) => (p as Project).org_id === activeOrg.id)
                if (first) set({ activeProject: first as Project })
              }
            }
          }

          get().resolvePermissions()
        } catch (err) {
          console.warn('[AppStore] loadUserContext failed, using demo data:', err)
        } finally {
          set({ isLoading: false })
        }
      },

      resolvePermissions: () => {
        const { activeRole } = get()
        set({ permissions: activeRole ? ROLE_PERMISSIONS[activeRole] ?? [] : [] })
      },

      hasPermission: (perm) => get().permissions.includes(perm),

      logout: () => {
        set({
          currentUser: null, isAuthenticated: false,
          activeOrg: null, activeProject: null, activeRole: null,
          userOrgs: [], userProjects: [], userMembers: [], permissions: [],
          activeVolume: '', activeTab: '', isLoading: false,
        })
        void supabase.auth.signOut()
      },
    }),
    {
      name: 'atlas-app-store',
      partialize: (s) => ({
        activeOrg: s.activeOrg, activeProject: s.activeProject,
        activeRole: s.activeRole, currentUser: s.currentUser,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
