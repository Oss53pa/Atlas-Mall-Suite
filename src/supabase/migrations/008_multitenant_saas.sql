-- ═══ 008_multitenant_saas.sql — Multi-tenant SaaS architecture ═══
-- Extends existing projets table, adds organizations layer, unifies project_members

-- ─── Organizations ───────────────────────────────────────────

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_form text,
  rccm text,
  tax_id text,
  cnps_id text,
  country text default 'CI',
  city text,
  address text,
  sector text default 'Immobilier commercial',
  accounting_standard text default 'SYSCOHADA',
  currency_primary text default 'XOF',
  currency_secondary text default 'EUR',
  fiscal_year_start text default '01-01',
  vat_rate numeric default 18.0,
  logo_url text,
  accent_color text default '#534AB7',
  plan text default 'pro'
    check (plan in ('starter', 'pro', 'enterprise')),
  plan_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Organization members ────────────────────────────────────

create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null
    check (role in ('super_admin', 'admin', 'consultant', 'enseigne', 'investisseur', 'viewer')),
  full_name text,
  job_title text,
  phone text,
  is_external boolean default false,
  invited_by uuid references auth.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  status text default 'active'
    check (status in ('active', 'invited', 'suspended')),
  unique(org_id, user_id)
);

-- ─── Invite tokens ───────────────────────────────────────────

create table if not exists invite_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  project_id uuid references projets(id),
  email text not null,
  role text not null,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz default now() + interval '7 days',
  used_at timestamptz,
  created_by uuid references auth.users(id)
);

-- ─── Extend existing projets table with org link + SaaS fields ─

alter table projets add column if not exists org_id uuid references organizations(id) on delete cascade;
alter table projets add column if not exists slug text unique;
alter table projets add column if not exists phase text;
alter table projets add column if not exists opening_date date;
alter table projets add column if not exists city text;
alter table projets add column if not exists country text default 'CI';
alter table projets add column if not exists status text default 'active';
alter table projets add column if not exists volumes_enabled text[] default '{"vol1","vol2","vol3"}';
alter table projets add column if not exists color text default '#534AB7';

-- Rename nom → name for consistency (keep nom as alias via view if needed)
-- We add name as a computed alias, keeping nom as the source column
alter table projets add column if not exists name text;
-- Backfill: copy nom into name where name is null
update projets set name = nom where name is null;

-- ─── Extend existing project_members with scoped_volumes ─────

alter table project_members add column if not exists scoped_volumes text[];

-- ─── Role permissions matrix ─────────────────────────────────

create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade not null,
  role text not null,
  permission text not null,
  granted boolean default true,
  unique(org_id, role, permission)
);

-- ─── Audit logs ──────────────────────────────────────────────

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),
  project_id uuid references projets(id),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ─── Floor plans (virtual tour) — references projets ─────────

create table if not exists floor_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projets(id) on delete cascade not null,
  floor_number int default 0,
  floor_name text,
  plan_image_url text,
  model_3d_url text,
  width_m numeric,
  height_m numeric,
  scale_px_per_m numeric,
  created_at timestamptz default now()
);

-- ─── Floor zones ─────────────────────────────────────────────

create table if not exists floor_zones (
  id uuid primary key default gen_random_uuid(),
  floor_plan_id uuid references floor_plans(id) on delete cascade not null,
  name text,
  zone_type text check (zone_type in ('anchor', 'shop', 'restaurant', 'service', 'corridor', 'common', 'technical')),
  polygon jsonb,
  area_sqm numeric,
  color text,
  commercial_status text check (commercial_status in ('available', 'negotiation', 'signed')),
  tenant_name text,
  rent_per_sqm numeric,
  security_zone_type text check (security_zone_type in ('public', 'restricted', 'technical')),
  camera_ids uuid[],
  journey_touchpoint text,
  daily_footfall int
);

-- ─── Tour waypoints ──────────────────────────────────────────

create table if not exists tour_waypoints (
  id uuid primary key default gen_random_uuid(),
  floor_plan_id uuid references floor_plans(id) on delete cascade not null,
  position_x numeric, position_y numeric, position_z numeric,
  label text,
  description text,
  scenario text[],
  order_index int,
  hotspot_data jsonb
);

-- ─── Zone layouts (agencement boutique) ──────────────────────

create table if not exists zone_layouts (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references floor_zones(id) on delete cascade not null,
  created_by uuid references auth.users(id),
  name text,
  furniture jsonb,
  walls jsonb,
  floor_material text,
  wall_color text,
  total_sqm_used numeric,
  is_approved boolean default false,
  approved_by uuid references auth.users(id),
  pdf_url text,
  created_at timestamptz default now()
);

-- ═══ RLS ═════════════════════════════════════════════════════

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table invite_tokens enable row level security;
alter table role_permissions enable row level security;
alter table audit_logs enable row level security;
alter table floor_plans enable row level security;
alter table floor_zones enable row level security;
alter table tour_waypoints enable row level security;
alter table zone_layouts enable row level security;

-- Helper: check org membership
create or replace function is_org_member(p_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid() and status = 'active'
  );
$$;

-- Helper: check org admin
create or replace function is_org_admin(p_org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from org_members
    where org_id = p_org_id and user_id = auth.uid()
      and role in ('super_admin', 'admin') and status = 'active'
  );
$$;

-- Organizations
create policy "orgs_via_membership" on organizations for select using (is_org_member(id));
create policy "orgs_admin_update" on organizations for update using (is_org_admin(id));

-- Org members
create policy "org_members_select" on org_members for select using (is_org_member(org_id));
create policy "org_members_admin_manage" on org_members for all using (is_org_admin(org_id));

-- Invite tokens
create policy "invites_admin" on invite_tokens for all using (is_org_admin(org_id));

-- Projets: extend existing RLS — org members can also see projects via org
-- (existing RLS from 005 uses is_project_member; we add org-level access)
create policy "projets_org_select" on projets
  for select using (org_id is not null and is_org_member(org_id));
create policy "projets_org_admin_write" on projets
  for update using (org_id is not null and is_org_admin(org_id));
create policy "projets_org_admin_insert" on projets
  for insert with check (org_id is null or is_org_admin(org_id));

-- Role permissions
create policy "role_perms_select" on role_permissions for select using (is_org_member(org_id));
create policy "role_perms_admin" on role_permissions for all using (is_org_admin(org_id));

-- Audit logs
create policy "audit_select" on audit_logs for select using (is_org_member(org_id));
create policy "audit_insert" on audit_logs for insert with check (auth.role() = 'authenticated');

-- Floor plans: via project's org
create policy "floor_plans_select" on floor_plans for select using (
  exists (select 1 from projets p where p.id = project_id and p.org_id is not null and is_org_member(p.org_id))
);
create policy "floor_plans_write" on floor_plans for all using (
  exists (select 1 from projets p where p.id = project_id and p.org_id is not null and is_org_admin(p.org_id))
);

-- Floor zones
create policy "floor_zones_select" on floor_zones for select using (
  exists (
    select 1 from floor_plans fp join projets p on p.id = fp.project_id
    where fp.id = floor_plan_id and p.org_id is not null and is_org_member(p.org_id)
  )
);

-- Tour waypoints
create policy "tour_wp_select" on tour_waypoints for select using (
  exists (
    select 1 from floor_plans fp join projets p on p.id = fp.project_id
    where fp.id = floor_plan_id and p.org_id is not null and is_org_member(p.org_id)
  )
);

-- Zone layouts
create policy "zone_layouts_select" on zone_layouts for select using (
  exists (
    select 1 from floor_zones fz join floor_plans fp on fp.id = fz.floor_plan_id
    join projets p on p.id = fp.project_id
    where fz.id = zone_id and p.org_id is not null and is_org_member(p.org_id)
  )
);
create policy "zone_layouts_write" on zone_layouts for insert with check (auth.role() = 'authenticated');
create policy "zone_layouts_update" on zone_layouts for update using (created_by = auth.uid());

-- ═══ Indexes ═════════════════════════════════════════════════

create index if not exists org_members_user_idx on org_members(user_id);
create index if not exists org_members_org_idx on org_members(org_id);
create index if not exists projets_org_idx on projets(org_id);
create index if not exists role_permissions_org_role_idx on role_permissions(org_id, role);
create index if not exists audit_logs_org_idx on audit_logs(org_id, created_at desc);
create index if not exists floor_plans_project_idx on floor_plans(project_id);
create index if not exists floor_zones_plan_idx on floor_zones(floor_plan_id);
create index if not exists invite_tokens_token_idx on invite_tokens(token);

-- ═══ Triggers ════════════════════════════════════════════════

create or replace function auto_add_org_owner()
returns trigger language plpgsql security definer as $$
begin
  insert into org_members (org_id, user_id, role, full_name, joined_at, status)
  values (new.id, auth.uid(), 'super_admin', '', now(), 'active');
  return new;
end;
$$;

drop trigger if exists on_org_created on organizations;
create trigger on_org_created
  after insert on organizations
  for each row execute function auto_add_org_owner();

create or replace function seed_role_permissions(p_org_id uuid)
returns void language plpgsql as $$
declare
  perms text[] := array[
    'vol1.read','vol1.write','vol2.read','vol2.write','vol3.read','vol3.write',
    'finance.read','dce.read','dce.write','ai.use','reports.export','members.manage'
  ];
  p text;
begin
  foreach p in array perms loop
    insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'super_admin', p, true) on conflict do nothing;
    insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'admin', p, true) on conflict do nothing;
  end loop;
  foreach p in array array['vol1.read','vol2.read','vol3.read','ai.use','reports.export'] loop
    insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'consultant', p, true) on conflict do nothing;
  end loop;
  insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'enseigne', 'vol1.read', true) on conflict do nothing;
  foreach p in array array['finance.read','reports.export'] loop
    insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'investisseur', p, true) on conflict do nothing;
  end loop;
  foreach p in array array['vol1.read','vol2.read','vol3.read'] loop
    insert into role_permissions (org_id, role, permission, granted) values (p_org_id, 'viewer', p, true) on conflict do nothing;
  end loop;
end;
$$;

create or replace function auto_seed_permissions()
returns trigger language plpgsql security definer as $$
begin
  perform seed_role_permissions(new.id);
  return new;
end;
$$;

drop trigger if exists on_org_created_seed_perms on organizations;
create trigger on_org_created_seed_perms
  after insert on organizations
  for each row execute function auto_seed_permissions();
