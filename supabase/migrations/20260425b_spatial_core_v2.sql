-- ═══ SPATIAL CORE v2 — Schéma multi-produit Atlas Studio ═══
--
-- Pose les tables nécessaires à la couche `@atlas-studio/spatial-core` :
--   • PostGIS pour requêtes géométriques (ST_DWithin, GIST index, etc.)
--   • Tables produits référencées par spatial_entities (FK)
--   • Table principale spatial_entities (typée, géométrique)
--   • Tables migration_log + snapshots (audit + rollback)
--
-- Idempotent : peut être rejoué sans erreur sur une instance déjà migrée.

-- ─── 1. Extension PostGIS ──────────────────────────────────
create extension if not exists postgis;

-- ─── 2. Table projects (référence centrale) ────────────────
-- Atlas BIM identifie les projets par slug texte (ex: 'cosmos-angre').
-- Pas d'UUID — cohérent avec le local-first existant.
create table if not exists public.projects (
  id text primary key,                             -- slug
  name text not null,
  vertical_id text,                                -- 'mall', 'hotel', 'office', etc.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── 3. Tables produits (référencées par FK depuis spatial_entities) ─

create table if not exists public.boutiques (
  id text primary key default ('boutique-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  name text,
  tenant text,
  category text,                                   -- mode, food, services...
  surface_sqm numeric(10,2),
  status text default 'active',                    -- active, vacant, reserved
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_boutiques_project on public.boutiques(project_id);

create table if not exists public.equipment (
  id text primary key default ('equipment-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  name text,
  category text,                                   -- hvac, electrical, plumbing...
  workcenter_id text,
  serial_number text,
  installation_date date,
  warranty_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_equipment_project on public.equipment(project_id);

create table if not exists public.lease_lots (
  id text primary key default ('lease-lot-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  lot_number text,
  lot_type text,                                   -- private, common
  useful_area_sqm numeric(10,2),
  weighted_area_sqm numeric(10,2),
  gla_sqm numeric(10,2),
  tenant_id text,
  rent_monthly_xof numeric(15,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_lease_lots_project on public.lease_lots(project_id);

create table if not exists public.safety_compliance (
  id text primary key default ('safety-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  category text,                                   -- emergency_exit, ria, extinguisher...
  reference_norm text,                             -- APSAD R82, NF EN 16005...
  inspection_date date,
  next_inspection_due date,
  status text default 'compliant',                 -- compliant, non_compliant, pending
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_safety_project on public.safety_compliance(project_id);

create table if not exists public.wayfinder_routes (
  id text primary key default ('wayfinder-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  name text,
  origin_label text,
  destination_label text,
  pmr_compliant boolean default false,
  estimated_walk_time_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wayfinder_project on public.wayfinder_routes(project_id);

-- ─── 4. Table spatial_entities (cœur du système) ───────────
create table if not exists public.spatial_entities (
  id text primary key default ('spatial-' || substr(md5(random()::text), 1, 16)),
  project_id text not null references public.projects(id) on delete cascade,
  level text not null default 'rdc',

  entity_type text not null,                       -- ex: 'WALL_STRUCTURAL', 'PEDESTRIAN_PATH'
  geometry jsonb not null,                         -- {outer: [[x,y]...], holes: [[[x,y]...]]} ou {points:[...]} ou {point:{x,y}}
  geometry_geom geometry(geometry, 0),             -- PostGIS représentation pour GIST/ST_DWithin

  -- Comportement 3D
  extrusion_enabled boolean not null default true,
  extrusion_height numeric(10,3) not null default 3.0,
  extrusion_base_elevation numeric(10,3) not null default 0,

  -- Style
  material_id text not null default 'concrete_wall',
  snap_behavior text not null default 'strong' check (snap_behavior in ('strong', 'weak', 'none')),
  merge_with_neighbors boolean not null default false,

  -- Hiérarchie & relations cross-produits
  parent_id text references public.spatial_entities(id) on delete cascade,
  boutique_id text references public.boutiques(id) on delete set null,
  equipment_id text references public.equipment(id) on delete set null,
  lease_lot_id text references public.lease_lots(id) on delete set null,
  safety_compliance_id text references public.safety_compliance(id) on delete set null,
  wayfinder_route_id text references public.wayfinder_routes(id) on delete set null,

  -- Métadonnées
  label text,
  notes text,
  custom_properties jsonb not null default '{}'::jsonb,

  -- Audit & migration
  is_auto_corrected boolean not null default false,
  correction_audit_trail jsonb not null default '[]'::jsonb,
  migration_metadata jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text                                  -- text user-id (anon/authenticated)
);

create index if not exists idx_spatial_entities_geom
  on public.spatial_entities using gist (geometry_geom);
create index if not exists idx_spatial_entities_project_level
  on public.spatial_entities (project_id, level);
create index if not exists idx_spatial_entities_type
  on public.spatial_entities (entity_type);
create index if not exists idx_spatial_entities_parent
  on public.spatial_entities (parent_id) where parent_id is not null;

-- ─── 5. Table migration_log ────────────────────────────────
create table if not exists public.spatial_entities_migration_log (
  id text primary key default ('miglog-' || substr(md5(random()::text), 1, 16)),
  project_id text not null,
  legacy_entity_id text not null,
  new_entity_id text references public.spatial_entities(id) on delete set null,
  status text not null check (status in ('migrated', 'flagged_review', 'error', 'skipped', 'rolled_back')),
  classification_result jsonb,
  error_message text,
  migrated_at timestamptz not null default now(),
  reviewed_by text,
  review_decision text,
  review_at timestamptz,
  unique (project_id, legacy_entity_id)
);
create index if not exists idx_miglog_project on public.spatial_entities_migration_log(project_id);
create index if not exists idx_miglog_status on public.spatial_entities_migration_log(status);

-- ─── 6. Table snapshots (rollback) ─────────────────────────
create table if not exists public.spatial_entities_snapshots (
  id text primary key default ('snap-' || substr(md5(random()::text), 1, 16)),
  project_id text not null,
  snapshot_name text not null,
  snapshot_data jsonb not null,
  created_at timestamptz not null default now(),
  created_by text,
  unique (project_id, snapshot_name)
);

-- ─── 7. Trigger updated_at ─────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'projects', 'boutiques', 'equipment', 'lease_lots',
    'safety_compliance', 'wayfinder_routes', 'spatial_entities'
  ])
  loop
    execute format('drop trigger if exists set_updated_at_trg on public.%I', t);
    execute format(
      'create trigger set_updated_at_trg before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- ─── 8. RLS — toutes tables ────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'projects', 'boutiques', 'equipment', 'lease_lots',
    'safety_compliance', 'wayfinder_routes',
    'spatial_entities', 'spatial_entities_migration_log', 'spatial_entities_snapshots'
  ])
  loop
    execute format('alter table public.%I enable row level security', t);
    -- policy permissive rc.1 (cohérent avec cells_authenticated_rw)
    execute format(
      'drop policy if exists %I on public.%I',
      t || '_authenticated_rw', t
    );
    execute format(
      'create policy %I on public.%I for all using (true) with check (true)',
      t || '_authenticated_rw', t
    );
    -- grants
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated',
      t
    );
  end loop;
end $$;

-- ─── 9. Fonction PostGIS — recherche voisins ───────────────
create or replace function public.find_spatial_neighbors(
  p_entity_id text,
  p_max_distance_m numeric
) returns table(neighbor_id text, distance_m numeric)
language sql stable security definer as $$
  select e2.id, st_distance(e1.geometry_geom, e2.geometry_geom)
  from public.spatial_entities e1
  cross join public.spatial_entities e2
  where e1.id = p_entity_id
    and e2.id != p_entity_id
    and e2.project_id = e1.project_id
    and e2.level = e1.level
    and st_dwithin(e1.geometry_geom, e2.geometry_geom, p_max_distance_m)
  order by st_distance(e1.geometry_geom, e2.geometry_geom);
$$;

-- ─── 10. Trigger sync geometry → geometry_geom ─────────────
-- Garde la colonne PostGIS synchronisée à partir du JSONB (qui reste source de vérité).
create or replace function public.sync_spatial_geometry_geom()
returns trigger language plpgsql as $$
declare
  v_outer jsonb;
  v_wkt text;
begin
  if new.geometry is null then
    new.geometry_geom := null;
    return new;
  end if;
  -- On gère 3 formats : polygon (outer), polyline (points), point
  if new.geometry ? 'outer' then
    v_outer := new.geometry->'outer';
    if jsonb_array_length(v_outer) >= 3 then
      v_wkt := 'POLYGON((' || (
        select string_agg((elt->>0) || ' ' || (elt->>1), ',')
        from jsonb_array_elements(v_outer || jsonb_build_array(v_outer->0)) as elt
      ) || '))';
      new.geometry_geom := st_geomfromtext(v_wkt, 0);
    end if;
  elsif new.geometry ? 'points' then
    if jsonb_array_length(new.geometry->'points') >= 2 then
      v_wkt := 'LINESTRING(' || (
        select string_agg((elt->>0) || ' ' || (elt->>1), ',')
        from jsonb_array_elements(new.geometry->'points') as elt
      ) || ')';
      new.geometry_geom := st_geomfromtext(v_wkt, 0);
    end if;
  elsif new.geometry ? 'point' then
    v_wkt := 'POINT(' || (new.geometry->'point'->>'x') || ' ' || (new.geometry->'point'->>'y') || ')';
    new.geometry_geom := st_geomfromtext(v_wkt, 0);
  end if;
  return new;
end $$;

drop trigger if exists sync_geometry_geom_trg on public.spatial_entities;
create trigger sync_geometry_geom_trg
  before insert or update of geometry on public.spatial_entities
  for each row execute function public.sync_spatial_geometry_geom();

-- ─── 11. Seed Cosmos Angré ─────────────────────────────────
insert into public.projects (id, name, vertical_id)
values ('cosmos-angre', 'The Mall — Cosmos Angré', 'mall')
on conflict (id) do nothing;
