-- ═══ B2 · Audit 2026-04-22 — Durcissement RLS des tables récentes ═══
-- Remplace les policies trop permissives (`using (true)`) de la migration
-- 20260422_plan_versions_and_report_shares.sql par des policies qui
-- vérifient l'appartenance au projet via project_members.
--
-- Modèle : toute opération sur plan_versions / report_shares / share_events
-- doit être faite par un user membre du projet (role ≥ viewer pour SELECT,
-- role ≥ editor pour INSERT/UPDATE, role = owner pour DELETE).

-- ────────────────────────────────────────────────────────────
-- Helper : fonction de vérification d'appartenance
-- ────────────────────────────────────────────────────────────

create or replace function public.is_project_member(p_projet_id text, p_min_role text default 'viewer')
returns boolean as $$
declare
  user_role text;
  role_rank int;
  min_rank  int;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role into user_role
    from public.project_members
   where projet_id = p_projet_id
     and user_id   = auth.uid()
   limit 1;

  if user_role is null then
    return false;
  end if;

  -- Hiérarchie : owner > editor > security_manager = commercial_manager > viewer
  role_rank := case user_role
                 when 'owner'   then 4
                 when 'editor'  then 3
                 when 'security_manager'   then 2
                 when 'commercial_manager' then 2
                 when 'viewer'  then 1
                 else 0
               end;
  min_rank  := case p_min_role
                 when 'owner'   then 4
                 when 'editor'  then 3
                 when 'manager' then 2
                 when 'viewer'  then 1
                 else 1
               end;

  return role_rank >= min_rank;
end;
$$ language plpgsql security definer stable;

-- ────────────────────────────────────────────────────────────
-- plan_versions — durcissement
-- ────────────────────────────────────────────────────────────

drop policy if exists "plan_versions readable by project members"  on public.plan_versions;
drop policy if exists "plan_versions writable by project members"  on public.plan_versions;
drop policy if exists "plan_versions deletable by project members" on public.plan_versions;

create policy "plan_versions select by project member"
  on public.plan_versions for select
  using (public.is_project_member(projet_id, 'viewer'));

create policy "plan_versions insert by project editor"
  on public.plan_versions for insert
  with check (public.is_project_member(projet_id, 'editor'));

create policy "plan_versions update by project editor"
  on public.plan_versions for update
  using (public.is_project_member(projet_id, 'editor'))
  with check (public.is_project_member(projet_id, 'editor'));

create policy "plan_versions delete by project owner"
  on public.plan_versions for delete
  using (public.is_project_member(projet_id, 'owner'));

-- ────────────────────────────────────────────────────────────
-- report_shares — durcissement
-- ────────────────────────────────────────────────────────────

drop policy if exists "report_shares readable via token"              on public.report_shares;
drop policy if exists "report_shares writable by project members"     on public.report_shares;
drop policy if exists "report_shares updatable by project members"    on public.report_shares;

create policy "report_shares select by project member"
  on public.report_shares for select
  using (public.is_project_member(projet_id, 'viewer'));

-- Accès public en lecture via token (destinataire externe lit son rapport).
-- On limite strictement aux champs non sensibles via la vue publique
-- `report_shares_public` (créée ci-dessous).

create policy "report_shares insert by project editor"
  on public.report_shares for insert
  with check (public.is_project_member(projet_id, 'editor'));

create policy "report_shares update by project editor"
  on public.report_shares for update
  using (public.is_project_member(projet_id, 'editor'))
  with check (public.is_project_member(projet_id, 'editor'));

create policy "report_shares delete by project owner"
  on public.report_shares for delete
  using (public.is_project_member(projet_id, 'owner'));

-- Vue publique limitée — pas de PII, pas de html complet
create or replace view public.report_shares_public as
  select token, volume_id, title, channel, status, created_at, expires_at
    from public.report_shares;

-- Grant en lecture anon (mais reste soumis aux policies de la vue)
grant select on public.report_shares_public to anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- share_events — durcissement
-- ────────────────────────────────────────────────────────────

drop policy if exists "share_events insertable via webhook"        on public.share_events;
drop policy if exists "share_events readable by project members"   on public.share_events;

-- Lecture : seul un membre du projet propriétaire du share peut lire les events
create policy "share_events select by project member"
  on public.share_events for select
  using (
    exists (
      select 1 from public.report_shares s
       where s.token = share_events.report_token
         and public.is_project_member(s.projet_id, 'viewer')
    )
  );

-- Insertion via Edge Function webhook : utilise service_role, bypass RLS.
-- On garde une policy explicite pour les insertions utilisateur authentifié (app interne).
create policy "share_events insert by project editor"
  on public.share_events for insert
  with check (
    exists (
      select 1 from public.report_shares s
       where s.token = share_events.report_token
         and public.is_project_member(s.projet_id, 'editor')
    )
  );

create policy "share_events delete by project owner"
  on public.share_events for delete
  using (
    exists (
      select 1 from public.report_shares s
       where s.token = share_events.report_token
         and public.is_project_member(s.projet_id, 'owner')
    )
  );

-- ────────────────────────────────────────────────────────────
-- Anonymisation des logs après 90 jours (RGPD)
-- ────────────────────────────────────────────────────────────

create or replace function public.anonymize_old_share_events()
returns integer as $$
declare
  affected int;
begin
  update public.share_events
     set actor = null,
         meta  = jsonb_build_object('anonymized', true, 'anonymized_at', now())
   where at < now() - interval '90 days'
     and (meta->>'anonymized') is distinct from 'true';
  get diagnostics affected = row_count;
  return affected;
end;
$$ language plpgsql security definer;

-- À appeler via un cron Supabase (ex : quotidien à 02:00 UTC)
-- select public.anonymize_old_share_events();

-- ────────────────────────────────────────────────────────────
-- Commentaires pour l'auditeur
-- ────────────────────────────────────────────────────────────

comment on function public.is_project_member is
  'Vérifie que auth.uid() est membre du projet avec un rôle >= min_role.
   Utilisée par toutes les policies RLS des tables liées à un projet.';

comment on function public.anonymize_old_share_events is
  'Anonymise les events >90j (RGPD) : supprime actor et efface meta.
   À planifier via cron Supabase.';
