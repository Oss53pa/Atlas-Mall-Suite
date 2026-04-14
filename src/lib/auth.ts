// ═══ AUTH UTILITIES — Registration, login, invite flow ═══

import { supabase } from './supabase'

// ── Sign up (Chemin A — admin creates org) ───────────────────

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })
  if (error) throw new Error(error.message)
  return data
}

// ── Sign in ──────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw new Error(error.message)
  return data
}

// ── Sign out ─────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// ── Create invite token (Chemin B) ───────────────────────────

export async function createInviteToken(
  orgId: string,
  email: string,
  role: string,
  projectId?: string
): Promise<string> {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Non authentifie')

  const { data, error } = await supabase
    .from('invite_tokens')
    .insert({
      org_id: orgId,
      email,
      role,
      project_id: projectId ?? null,
      created_by: user.user.id,
    })
    .select('token')
    .single()

  if (error) throw new Error(error.message)
  return data.token
}

// ── Validate invite token ────────────────────────────────────

export async function validateInviteToken(token: string) {
  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*, organizations(name)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null
  return data
}

// ── Accept invite (join org) ─────────────────────────────────

export async function acceptInvite(token: string) {
  const invite = await validateInviteToken(token)
  if (!invite) throw new Error('Invitation invalide ou expiree')

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Non authentifie')

  // Add to org_members
  const { error: memberError } = await supabase
    .from('org_members')
    .insert({
      org_id: invite.org_id,
      user_id: user.user.id,
      role: invite.role,
      full_name: user.user.user_metadata?.full_name ?? '',
      joined_at: new Date().toISOString(),
      status: 'active',
      invited_by: invite.created_by,
    })

  if (memberError) throw new Error(memberError.message)

  // If project-scoped, add to project_members too
  if (invite.project_id) {
    await supabase
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.user.id,
        role: invite.role,
      })
  }

  // Mark token as used
  await supabase
    .from('invite_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)

  return invite
}

// ── Change password (Chemin C — first login) ─────────────────

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw new Error(error.message)
}

// ── Create organization ──────────────────────────────────────

export async function createOrganization(data: {
  name: string
  legal_form?: string
  rccm?: string
  tax_id?: string
  city?: string
  country?: string
}) {
  const { data: org, error } = await supabase
    .from('organizations')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return org
}

// ── Create project ───────────────────────────────────────────

export async function createProject(data: {
  org_id: string
  name: string
  slug?: string
  phase?: string
  total_area_sqm?: number
  city?: string
  volumes_enabled?: string[]
}) {
  const { data: project, error } = await supabase
    .from('projets')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return project
}

// ── Audit log ────────────────────────────────────────────────

export async function logAudit(
  orgId: string,
  action: string,
  metadata?: Record<string, unknown>,
  projectId?: string
) {
  const { data: user } = await supabase.auth.getUser()
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    project_id: projectId ?? null,
    user_id: user.user?.id ?? null,
    action,
    metadata: metadata ?? null,
  })
}
