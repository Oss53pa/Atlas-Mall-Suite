import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Project Members helpers (RLS multi-tenant) ──

export async function inviteToProject(
  projectId: string,
  userEmail: string,
  role: 'editor' | 'viewer' | 'security_manager' | 'commercial_manager'
): Promise<{ success: boolean; error?: string }> {
  const { data: users, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', userEmail)
    .limit(1)

  if (userError || !users?.length) {
    return { success: false, error: `Utilisateur "${userEmail}" introuvable` }
  }

  const { error } = await supabase
    .from('project_members')
    .insert({
      projet_id: projectId,
      user_id: users[0].id,
      role,
      invited_by: (await supabase.auth.getUser()).data.user?.id,
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getProjectMembers(projectId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('id, user_id, role, created_at')
    .eq('projet_id', projectId)
  return { data, error }
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  newRole: string
) {
  return supabase
    .from('project_members')
    .update({ role: newRole })
    .eq('projet_id', projectId)
    .eq('user_id', userId)
}

export async function removeMember(projectId: string, userId: string) {
  return supabase
    .from('project_members')
    .delete()
    .eq('projet_id', projectId)
    .eq('user_id', userId)
}
