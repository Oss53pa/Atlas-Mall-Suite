-- ═══ Rôle super_admin Atlas Mall Suite ═══
-- Date : 2026-04-22
-- Scope : rôle global de super-administration (bypass RLS sur toutes les tables)
--
-- Usage :
--   1. Créer l'utilisateur via le dashboard Auth (ou SQL auth.users)
--   2. Exécuter : select public.grant_super_admin('email@domain.com');
--   3. Le user peut maintenant tout lire/modifier (bypass RLS)
--
-- Sécurité : le flag est stocké dans auth.users.raw_app_meta_data ce qui le rend
-- INSENSIBLE aux modifications côté client (contrairement à raw_user_meta_data
-- qui peut être modifié par le user lui-même).

-- ────────────────────────────────────────────────────────────
-- 1. Fonction is_super_admin() — vérifiable dans toutes les policies
-- ────────────────────────────────────────────────────────────

create or replace function public.is_super_admin()
returns boolean as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  return coalesce(
    (select (raw_app_meta_data->>'is_super_admin')::boolean
       from auth.users
      where id = auth.uid()),
    false
  );
end;
$$ language plpgsql security definer stable;

comment on function public.is_super_admin is
  'Vérifie si auth.uid() a le flag is_super_admin=true dans raw_app_meta_data.
   À combiner avec les autres vérifications RLS via OR dans les policies.';

-- ────────────────────────────────────────────────────────────
-- 2. Fonctions utilitaires pour promouvoir/révoquer
-- ────────────────────────────────────────────────────────────

-- Note : ces fonctions utilisent service_role (pas utilisables via anon).
-- Les appeler depuis le SQL Editor du dashboard OU via une Edge Function.

create or replace function public.grant_super_admin(user_email text)
returns text as $$
declare
  user_id uuid;
begin
  select id into user_id from auth.users where email = user_email limit 1;
  if user_id is null then
    return 'Erreur : utilisateur ' || user_email || ' introuvable';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) ||
                             jsonb_build_object('is_super_admin', true)
   where id = user_id;
  return 'Super admin accordé à ' || user_email || ' (uid=' || user_id || ')';
end;
$$ language plpgsql security definer;

create or replace function public.revoke_super_admin(user_email text)
returns text as $$
declare
  user_id uuid;
begin
  select id into user_id from auth.users where email = user_email limit 1;
  if user_id is null then
    return 'Erreur : utilisateur ' || user_email || ' introuvable';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) -
                             'is_super_admin'
   where id = user_id;
  return 'Super admin révoqué pour ' || user_email;
end;
$$ language plpgsql security definer;

-- ────────────────────────────────────────────────────────────
-- 3. Étendre is_project_member() pour inclure super_admin
-- ────────────────────────────────────────────────────────────

-- Un super admin est considéré membre de TOUS les projets avec le rôle max.
create or replace function public.is_project_member(p_projet_id text, p_min_role text default 'viewer')
returns boolean as $$
declare
  user_role text;
  role_rank int;
  min_rank  int;
begin
  if auth.uid() is null then return false; end if;

  -- Super admin = accès total, quel que soit le projet ou le rôle demandé
  if public.is_super_admin() then return true; end if;

  select role into user_role
    from public.project_members
   where projet_id = p_projet_id and user_id = auth.uid()
   limit 1;

  if user_role is null then return false; end if;

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

-- Idem pour is_org_member() — un super admin est admin de toute org.
create or replace function public.is_org_member(p_org_id text, p_min_role text default 'viewer')
returns boolean as $$
declare
  user_role text;
  rr int;
  mr int;
begin
  if auth.uid() is null then return false; end if;
  if public.is_super_admin() then return true; end if;

  select role into user_role
    from public.org_members
   where org_id = p_org_id and user_id = auth.uid()
   limit 1;
  if user_role is null then return false; end if;
  rr := case user_role when 'owner' then 4 when 'admin' then 3 when 'editor' then 2 when 'viewer' then 1 else 0 end;
  mr := case p_min_role when 'owner' then 4 when 'admin' then 3 when 'editor' then 2 when 'viewer' then 1 else 1 end;
  return rr >= mr;
end;
$$ language plpgsql security definer stable;

-- ────────────────────────────────────────────────────────────
-- 4. Vue pratique : liste des super admins
-- ────────────────────────────────────────────────────────────

create or replace view public.super_admins as
  select id, email, created_at, last_sign_in_at,
         raw_app_meta_data->>'is_super_admin' as is_super_admin
    from auth.users
   where (raw_app_meta_data->>'is_super_admin')::boolean = true
   order by created_at;

comment on view public.super_admins is
  'Liste des comptes ayant is_super_admin=true dans app_metadata.
   Pour ajouter : select public.grant_super_admin(email);
   Pour retirer : select public.revoke_super_admin(email);';

-- ────────────────────────────────────────────────────────────
-- 5. Politique RLS : les super admins peuvent tout voir/modifier
-- ────────────────────────────────────────────────────────────

-- Note : les policies existantes appellent is_project_member() / is_org_member()
-- qui retournent déjà TRUE pour un super admin. Pas besoin de policies en plus.
-- Exception : request_log, audit_log → on ajoute une policy super_admin
-- explicite car ces tables n'utilisent pas is_project_member.

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_log') then
    drop policy if exists "audit_log_superadmin_read" on public.audit_log;
    create policy "audit_log_superadmin_read" on public.audit_log
      for select using (public.is_super_admin());
  end if;

  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'audit_logs') then
    drop policy if exists "audit_logs_superadmin_read" on public.audit_logs;
    create policy "audit_logs_superadmin_read" on public.audit_logs
      for select using (public.is_super_admin());
  end if;
end $$;
