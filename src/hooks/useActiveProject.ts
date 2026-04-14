// ═══ useActiveProject — Bridge between AppStore and vol stores ═══

import { useAppStore } from '../stores/appStore'

/**
 * Returns the active project ID from the global AppStore.
 * Vol stores use this to know which project to hydrate from Supabase.
 * Falls back to the demo project ID if no org context is loaded.
 */
export function useActiveProjectId(): string {
  const activeProject = useAppStore((s) => s.activeProject)
  // Fallback: legacy demo project or the id field from the store
  return activeProject?.id ?? 'cosmos-angre'
}

/**
 * Returns the active org ID, or null if no org is loaded.
 */
export function useActiveOrgId(): string | null {
  return useAppStore((s) => s.activeOrg?.id ?? null)
}
