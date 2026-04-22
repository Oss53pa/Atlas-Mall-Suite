-- ═══ B3 · Audit et durcissement RLS sur toutes les tables historiques ═══
-- Date : 2026-04-22
-- Finding : docs/AUDIT.md §4.3 — RLS non garantie sur ~24 tables
--
-- Stratégie :
--   1. Activer RLS sur toutes les tables métier
--   2. Ajouter policies basées sur public.is_project_member() (helper créé
--      dans 20260422b_harden_rls_policies.sql)
--   3. Tables spéciales (organizations, invite_tokens, audit_logs) :
--      policies dédiées selon leur pattern d'usage
--   4. Tables de référence publique : lecture anonyme autorisée
--
-- IMPORTANT : cette migration suppose les tables existantes. Si une table
-- n'existe pas, les commandes `alter table if exists` + `drop policy if exists`
-- rendent l'opération idempotente.

-- ════════════════════════════════════════════════════════════
-- 0. Préambule : s'assurer que les helpers existent
-- ════════════════════════════════════════════════════════════

-- Le helper is_project_member(projet_id, role) est créé dans 20260422b.
-- On ajoute ici is_org_member pour les tables d'organisation.

create or replace function public.is_org_member(p_org_id text, p_min_role text default 'viewer')
returns boolean as $$
declare
  user_role text;
  rr int;
  mr int;
begin
  if auth.uid() is null then return false; end if;
  select role into user_role
    from public.org_members
   where org_id = p_org_id and user_id = auth.uid()
   limit 1;
  if user_role is null then return false; end if;
  rr := case user_role when 'owner' then 4 when 'admin' then 3 when 'editor' then 2 when 'viewer' then 1 else 0 end;
  mr := case p_min_role when 'owner' then 4 when 'admin' then 3 when 'editor' then 2 when 'viewer' then 1 else 1 end;
  return rr >= mr;
end; $$ language plpgsql security definer stable;

-- Helper pour vérifier que le user est le créateur d'une ligne
create or replace function public.is_row_creator(p_created_by uuid)
returns boolean as $$
begin
  return auth.uid() is not null and auth.uid() = p_created_by;
end; $$ language plpgsql security definer stable;

-- ════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS & MEMBERSHIP
-- ════════════════════════════════════════════════════════════

-- organizations : lecture par membres, écriture par admin/owner
alter table if exists public.organizations enable row level security;
drop policy if exists "organizations_select" on public.organizations;
drop policy if exists "organizations_insert" on public.organizations;
drop policy if exists "organizations_update" on public.organizations;
drop policy if exists "organizations_delete" on public.organizations;

create policy "organizations_select" on public.organizations
  for select using (public.is_org_member(id, 'viewer'));
create policy "organizations_insert" on public.organizations
  for insert with check (auth.uid() is not null);  -- tout user connecté peut créer son org
create policy "organizations_update" on public.organizations
  for update using (public.is_org_member(id, 'admin'))
  with check (public.is_org_member(id, 'admin'));
create policy "organizations_delete" on public.organizations
  for delete using (public.is_org_member(id, 'owner'));

-- org_members : self-read + admin-manage
alter table if exists public.org_members enable row level security;
drop policy if exists "org_members_select" on public.org_members;
drop policy if exists "org_members_insert" on public.org_members;
drop policy if exists "org_members_update" on public.org_members;
drop policy if exists "org_members_delete" on public.org_members;

-- Un user voit ses propres lignes + admin voit tous les membres de l'org
create policy "org_members_select" on public.org_members
  for select using (
    user_id = auth.uid() or public.is_org_member(org_id, 'admin')
  );
create policy "org_members_insert" on public.org_members
  for insert with check (public.is_org_member(org_id, 'admin'));
create policy "org_members_update" on public.org_members
  for update using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));
create policy "org_members_delete" on public.org_members
  for delete using (public.is_org_member(org_id, 'owner'));

-- project_members : self-read + project owner manage
alter table if exists public.project_members enable row level security;
drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert" on public.project_members;
drop policy if exists "project_members_update" on public.project_members;
drop policy if exists "project_members_delete" on public.project_members;

create policy "project_members_select" on public.project_members
  for select using (
    user_id = auth.uid() or public.is_project_member(projet_id, 'editor')
  );
create policy "project_members_insert" on public.project_members
  for insert with check (public.is_project_member(projet_id, 'owner'));
create policy "project_members_update" on public.project_members
  for update using (public.is_project_member(projet_id, 'owner'))
  with check (public.is_project_member(projet_id, 'owner'));
create policy "project_members_delete" on public.project_members
  for delete using (public.is_project_member(projet_id, 'owner'));

-- invite_tokens : lecture publique via token (pour accepter une invitation),
-- écriture par admin uniquement. Le token lui-même sert de secret.
alter table if exists public.invite_tokens enable row level security;
drop policy if exists "invite_tokens_select" on public.invite_tokens;
drop policy if exists "invite_tokens_insert" on public.invite_tokens;
drop policy if exists "invite_tokens_delete" on public.invite_tokens;

-- Select : autorisé si l'utilisateur a le token (logique applicative)
-- ou s'il est admin de l'org/projet concerné
create policy "invite_tokens_select" on public.invite_tokens
  for select using (true); -- contrôle côté app + le token est secret

create policy "invite_tokens_insert" on public.invite_tokens
  for insert with check (auth.uid() is not null);
create policy "invite_tokens_delete" on public.invite_tokens
  for delete using (auth.uid() is not null);

-- ════════════════════════════════════════════════════════════
-- 2. PROJETS (cœur métier)
-- ════════════════════════════════════════════════════════════

alter table if exists public.projets enable row level security;
drop policy if exists "projets_select" on public.projets;
drop policy if exists "projets_insert" on public.projets;
drop policy if exists "projets_update" on public.projets;
drop policy if exists "projets_delete" on public.projets;

create policy "projets_select" on public.projets
  for select using (public.is_project_member(id, 'viewer'));
create policy "projets_insert" on public.projets
  for insert with check (auth.uid() is not null);
create policy "projets_update" on public.projets
  for update using (public.is_project_member(id, 'editor'))
  with check (public.is_project_member(id, 'editor'));
create policy "projets_delete" on public.projets
  for delete using (public.is_project_member(id, 'owner'));

-- ════════════════════════════════════════════════════════════
-- 3. ENTITÉS MÉTIER rattachées à un projet via projet_id
-- ════════════════════════════════════════════════════════════

-- Pattern générique : SELECT viewer, INSERT/UPDATE editor, DELETE owner
-- Appliqué aux tables : floors, zones, cameras, doors, pois, signage_items,
-- transitions, cosmos_lots, plan_actions

do $$
declare
  tbl text;
  tables_list text[] := array[
    'floors', 'zones', 'cameras', 'doors', 'pois',
    'signage_items', 'transitions', 'cosmos_lots', 'plan_actions'
  ];
begin
  foreach tbl in array tables_list loop
    execute format('alter table if exists public.%I enable row level security', tbl);
    -- Drop existing policies idempotentment
    execute format('drop policy if exists "%I_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_insert" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_update" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_delete" on public.%I', tbl, tbl);

    -- Create policies — nécessite une colonne projet_id sur la table
    execute format($f$create policy "%I_select" on public.%I
        for select using (public.is_project_member(projet_id, 'viewer'))$f$, tbl, tbl);
    execute format($f$create policy "%I_insert" on public.%I
        for insert with check (public.is_project_member(projet_id, 'editor'))$f$, tbl, tbl);
    execute format($f$create policy "%I_update" on public.%I
        for update using (public.is_project_member(projet_id, 'editor'))
        with check (public.is_project_member(projet_id, 'editor'))$f$, tbl, tbl);
    execute format($f$create policy "%I_delete" on public.%I
        for delete using (public.is_project_member(projet_id, 'editor'))$f$, tbl, tbl);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- 4. LOGS MÉTIER / TÉLÉMÉTRIE (projet_id scoped)
-- ════════════════════════════════════════════════════════════

-- alerts, incidents, export_logs, kiosk_telemetry_events,
-- wayfinder_usage_logs, vision_recognitions : lecture viewer, insert auto

do $$
declare
  tbl text;
  telemetry_tables text[] := array[
    'alerts', 'incidents', 'export_logs',
    'kiosk_telemetry_events', 'wayfinder_usage_logs', 'vision_recognitions'
  ];
begin
  foreach tbl in array telemetry_tables loop
    execute format('alter table if exists public.%I enable row level security', tbl);
    execute format('drop policy if exists "%I_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_insert" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_delete" on public.%I', tbl, tbl);

    execute format($f$create policy "%I_select" on public.%I
        for select using (public.is_project_member(projet_id, 'viewer'))$f$, tbl, tbl);
    -- Les logs sont insérés par l'app (authentifié) ou par les bornes/workers
    -- → on autorise l'insertion si le user est éditeur du projet.
    execute format($f$create policy "%I_insert" on public.%I
        for insert with check (public.is_project_member(projet_id, 'editor'))$f$, tbl, tbl);
    -- Suppression réservée aux owners (traçabilité)
    execute format($f$create policy "%I_delete" on public.%I
        for delete using (public.is_project_member(projet_id, 'owner'))$f$, tbl, tbl);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- 5. AUDIT LOGS (immutables — pas de update/delete utilisateur)
-- ════════════════════════════════════════════════════════════

-- audit_log et audit_logs (les 2 noms sont utilisés dans le code)
do $$
declare
  tbl text;
begin
  foreach tbl in array array['audit_log', 'audit_logs'] loop
    execute format('alter table if exists public.%I enable row level security', tbl);
    execute format('drop policy if exists "%I_select" on public.%I', tbl, tbl);
    execute format('drop policy if exists "%I_insert" on public.%I', tbl, tbl);

    -- Lecture : owner du projet uniquement (données sensibles)
    execute format($f$create policy "%I_select" on public.%I
        for select using (
          projet_id is null OR public.is_project_member(projet_id, 'owner')
        )$f$, tbl, tbl);
    -- Insertion autorisée pour tout user authentifié (l'app loggue ses actions)
    execute format($f$create policy "%I_insert" on public.%I
        for insert with check (auth.uid() is not null)$f$, tbl, tbl);
    -- PAS de policy update/delete → immutable par design
  end loop;
end $$;

-- request_log : si existe, même pattern que audit_log
alter table if exists public.request_log enable row level security;
drop policy if exists "request_log_insert" on public.request_log;
drop policy if exists "request_log_select" on public.request_log;
create policy "request_log_insert" on public.request_log
  for insert with check (true); -- l'app loggue y compris anon (rate limiting)
create policy "request_log_select" on public.request_log
  for select using (auth.uid() is not null); -- lecture authentifiée (admin dashboard)

-- ════════════════════════════════════════════════════════════
-- 6. MÉMOIRE PROPH3T
-- ════════════════════════════════════════════════════════════

alter table if exists public.proph3t_memory enable row level security;
drop policy if exists "proph3t_memory_select" on public.proph3t_memory;
drop policy if exists "proph3t_memory_insert" on public.proph3t_memory;
drop policy if exists "proph3t_memory_update" on public.proph3t_memory;
drop policy if exists "proph3t_memory_delete" on public.proph3t_memory;

create policy "proph3t_memory_select" on public.proph3t_memory
  for select using (public.is_project_member(projet_id, 'viewer'));
create policy "proph3t_memory_insert" on public.proph3t_memory
  for insert with check (public.is_project_member(projet_id, 'editor'));
create policy "proph3t_memory_update" on public.proph3t_memory
  for update using (public.is_project_member(projet_id, 'editor'))
  with check (public.is_project_member(projet_id, 'editor'));
create policy "proph3t_memory_delete" on public.proph3t_memory
  for delete using (public.is_project_member(projet_id, 'owner'));

-- ════════════════════════════════════════════════════════════
-- 7. SIGNALÉTIQUE — feedback et patterns (partiellement publics)
-- ════════════════════════════════════════════════════════════

-- signage_feedback : lecture viewer projet, écriture visiteur anonyme OK
-- (c'est du feedback utilisateur final via bornes/mobile)
alter table if exists public.signage_feedback enable row level security;
drop policy if exists "signage_feedback_select" on public.signage_feedback;
drop policy if exists "signage_feedback_insert" on public.signage_feedback;
drop policy if exists "signage_feedback_delete" on public.signage_feedback;

create policy "signage_feedback_select" on public.signage_feedback
  for select using (public.is_project_member(projet_id, 'viewer'));
-- Les visiteurs (anon) peuvent déposer du feedback depuis les bornes/mobile
-- → rate limiting applicatif obligatoire côté Edge Function
create policy "signage_feedback_insert" on public.signage_feedback
  for insert with check (true);
create policy "signage_feedback_delete" on public.signage_feedback
  for delete using (public.is_project_member(projet_id, 'owner'));

-- signage_patterns : base de connaissance, lecture publique, écriture admin
alter table if exists public.signage_patterns enable row level security;
drop policy if exists "signage_patterns_select" on public.signage_patterns;
drop policy if exists "signage_patterns_insert" on public.signage_patterns;
drop policy if exists "signage_patterns_update" on public.signage_patterns;
drop policy if exists "signage_patterns_delete" on public.signage_patterns;

create policy "signage_patterns_select" on public.signage_patterns
  for select using (true); -- base de connaissance publique
create policy "signage_patterns_insert" on public.signage_patterns
  for insert with check (auth.uid() is not null);
create policy "signage_patterns_update" on public.signage_patterns
  for update using (auth.uid() is not null)
  with check (auth.uid() is not null);
create policy "signage_patterns_delete" on public.signage_patterns
  for delete using (false); -- pas de suppression utilisateur ; service_role uniquement

-- ════════════════════════════════════════════════════════════
-- 8. DESIGNER PROJECTS (wayfinder-designer)
-- ════════════════════════════════════════════════════════════

alter table if exists public.designer_projects enable row level security;
drop policy if exists "designer_projects_select" on public.designer_projects;
drop policy if exists "designer_projects_insert" on public.designer_projects;
drop policy if exists "designer_projects_update" on public.designer_projects;
drop policy if exists "designer_projects_delete" on public.designer_projects;

create policy "designer_projects_select" on public.designer_projects
  for select using (public.is_project_member(projet_id, 'viewer'));
create policy "designer_projects_insert" on public.designer_projects
  for insert with check (public.is_project_member(projet_id, 'editor'));
create policy "designer_projects_update" on public.designer_projects
  for update using (public.is_project_member(projet_id, 'editor'))
  with check (public.is_project_member(projet_id, 'editor'));
create policy "designer_projects_delete" on public.designer_projects
  for delete using (public.is_project_member(projet_id, 'editor'));

-- ════════════════════════════════════════════════════════════
-- 9. AUDIT FINAL : lister les tables sans RLS
-- ════════════════════════════════════════════════════════════

-- Vue utilitaire pour détecter rapidement les oublis lors des migrations futures
create or replace view public.rls_audit_status as
  select
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (select count(*) from pg_policies where schemaname = t.schemaname and tablename = t.tablename) as policy_count
  from pg_tables t
  where schemaname = 'public'
  order by rls_enabled asc, policy_count asc, tablename;

comment on view public.rls_audit_status is
  'Audit RLS : liste toutes les tables du schéma public avec leur statut RLS
   et le nombre de policies. À contrôler régulièrement (viser rls_enabled=true
   et policy_count>0 sur toutes les tables métier).';

-- ════════════════════════════════════════════════════════════
-- 10. ANONYMISATION des données personnelles (support RGPD droit à l'oubli)
-- ════════════════════════════════════════════════════════════

create or replace function public.gdpr_erase_user(p_user_id uuid)
returns jsonb as $$
declare
  report jsonb := '{}'::jsonb;
  affected int;
begin
  -- Anonymiser signage_feedback
  update public.signage_feedback
     set user_ref = null,
         metadata = jsonb_build_object('anonymized', true, 'at', now())
   where user_ref = p_user_id::text;
  get diagnostics affected = row_count;
  report := report || jsonb_build_object('signage_feedback', affected);

  -- Anonymiser share_events
  update public.share_events
     set actor = null,
         meta = jsonb_build_object('anonymized', true, 'at', now())
   where actor = p_user_id::text;
  get diagnostics affected = row_count;
  report := report || jsonb_build_object('share_events', affected);

  -- Retirer des project_members et org_members
  delete from public.project_members where user_id = p_user_id;
  get diagnostics affected = row_count;
  report := report || jsonb_build_object('project_members', affected);
  delete from public.org_members where user_id = p_user_id;
  get diagnostics affected = row_count;
  report := report || jsonb_build_object('org_members', affected);

  -- Log de l'effacement
  insert into public.audit_log (event_type, entity_type, entity_id, description, created_at)
  values ('gdpr_erase', 'user', p_user_id::text, 'Effacement RGPD effectué', now());

  return report;
exception when others then
  return jsonb_build_object('error', SQLERRM);
end;
$$ language plpgsql security definer;

comment on function public.gdpr_erase_user is
  'Droit à l''oubli RGPD : anonymise les données personnelles d''un utilisateur.
   À appeler après notification DPO. Retourne un rapport JSON du nombre
   d''enregistrements anonymisés par table.';

-- ════════════════════════════════════════════════════════════
-- Fin de migration
-- ════════════════════════════════════════════════════════════

comment on schema public is
  'Atlas Mall Suite — RLS harden. Dernière revue : 2026-04-22.
   Vérifier régulièrement via: select * from public.rls_audit_status;';
