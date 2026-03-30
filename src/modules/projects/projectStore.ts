// ═══ MULTI-PROJECT STORE ═══

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, ProjectStatus } from './types'

interface ProjectsState {
  projects: Project[]
  activeProjectId: string | null

  // Actions
  addProject: (project: Project) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  getActiveProject: () => Project | undefined
}

// Cosmos Angré as seed project
const COSMOS_ANGRE: Project = {
  id: 'cosmos-angre',
  name: 'Cosmos Angré Shopping Center',
  client: 'Cosmos Group',
  address: 'Angré, Abidjan, Côte d\'Ivoire',
  surface_m2: 30000,
  type: 'mall',
  opening_date: '2026-10-16',
  status: 'conception',
  created_by: 'admin',
  team_members: ['Cheick Sanankoua'],
  created_at: '2025-01-15',
  updated_at: '2025-08-01',
}

export const useProjectStore = create<ProjectsState>()(
  persist(
    (set, get) => ({
      projects: [COSMOS_ANGRE],
      activeProjectId: 'cosmos-angre',

      addProject: (project) =>
        set((s) => ({ projects: [...s.projects, project] })),

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString().slice(0, 10) } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      getActiveProject: () => {
        const { projects, activeProjectId } = get()
        return projects.find((p) => p.id === activeProjectId)
      },
    }),
    { name: 'atlas-projects' }
  )
)
