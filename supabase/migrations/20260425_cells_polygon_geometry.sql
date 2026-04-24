-- ═══ CELLS — POLYGON GEOMETRY ═══
-- Ajoute le stockage géométrique normalisé pour les espaces (cells) :
--   polygon_vertices   : JSONB array de [x, y] en MILLIMÈTRES entiers (pas pixels, pas mètres flottants)
--   polygon_metadata   : JSONB { closed: bool, orthogonal: bool, simpleRing: bool, areaMm2: int, perimeterMm: int }
--   geometry_quality_score : NUMERIC(3,2) entre 0.00 et 1.00 (voir qualityScore.ts)
--
-- Si la table `cells` n'existe pas encore, elle est créée avec le schéma minimal.
-- Les colonnes de géométrie sont ajoutées de façon idempotente (IF NOT EXISTS).

-- ─── Table cells (création si absente) ─────────────────────
create table if not exists public.cells (
  -- id en TEXT : les EditableSpace sont créés côté app avec des IDs lisibles
  -- genre "sp-1776976491970-xoj9" (timestamp + suffixe random). Pas d'UUID.
  id text primary key default ('cell-' || substr(md5(random()::text), 1, 16)),
  -- project_id en TEXT : Atlas BIM identifie les projets par slug
  -- (ex: 'cosmos-angre') stocké dans Dexie/localStorage. Pas de table
  -- `projects` côté Supabase en rc.1 — le cloud est best-effort.
  project_id text not null,
  floor_id text,
  label text,
  space_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Colonnes géométriques ─────────────────────────────────
alter table public.cells
  add column if not exists polygon_vertices jsonb,
  add column if not exists polygon_metadata jsonb,
  add column if not exists geometry_quality_score numeric(3,2);

-- ─── Contraintes de validité ───────────────────────────────
-- score borné dans [0, 1]
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cells_quality_score_range'
  ) then
    alter table public.cells
      add constraint cells_quality_score_range
      check (
        geometry_quality_score is null
        or (geometry_quality_score >= 0 and geometry_quality_score <= 1)
      );
  end if;
end$$;

-- polygon_vertices doit être un tableau JSON (ou null pendant la migration)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cells_polygon_vertices_is_array'
  ) then
    alter table public.cells
      add constraint cells_polygon_vertices_is_array
      check (
        polygon_vertices is null
        or jsonb_typeof(polygon_vertices) = 'array'
      );
  end if;
end$$;

-- ─── Index ─────────────────────────────────────────────────
-- GIN sur metadata pour requêtes sur flags (orthogonal, simpleRing, etc.)
create index if not exists cells_polygon_metadata_gin
  on public.cells using gin (polygon_metadata);

-- BTree sur quality_score pour le dashboard admin (tri par qualité)
create index if not exists cells_quality_score_idx
  on public.cells (geometry_quality_score)
  where geometry_quality_score is not null;

-- ─── Trigger de validation légère côté DB ──────────────────
-- Rejette un polygone manifestement invalide (< 3 sommets).
-- La validation fine (auto-intersection, chevauchement) reste côté app :
-- Postgres n'a pas natifs ces tests sans PostGIS, et on veut garder ce
-- schéma portable. Le trigger sert de dernier rempart contre data corrompue.
create or replace function public.cells_validate_polygon()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  if new.polygon_vertices is null then
    return new;
  end if;

  v_count := jsonb_array_length(new.polygon_vertices);
  if v_count < 3 then
    raise exception 'cells.polygon_vertices must contain at least 3 vertices (got %)', v_count
      using errcode = 'check_violation';
  end if;

  -- Chaque sommet doit être [x, y] entiers (mm).
  if exists (
    select 1
    from jsonb_array_elements(new.polygon_vertices) as elt
    where jsonb_typeof(elt) <> 'array'
       or jsonb_array_length(elt) <> 2
       or jsonb_typeof(elt->0) <> 'number'
       or jsonb_typeof(elt->1) <> 'number'
  ) then
    raise exception 'cells.polygon_vertices: each vertex must be a 2-number array [x_mm, y_mm]'
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists cells_validate_polygon_trg on public.cells;
create trigger cells_validate_polygon_trg
  before insert or update of polygon_vertices on public.cells
  for each row
  execute function public.cells_validate_polygon();

-- ─── RLS ───────────────────────────────────────────────────
-- rc.1 : policy permissive (tout utilisateur authentifié peut lire/écrire
-- n'importe quel projet). Justification : Atlas BIM est local-first,
-- l'authorization réelle vit dans le client. La sync cells est best-effort
-- et ne contient pas de data sensible (géométrie de plan).
-- À durcir en v1.0 quand la table `project_members` (multi-tenant) arrivera.
alter table public.cells enable row level security;

drop policy if exists cells_project_member_rw on public.cells;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'cells'
      and policyname = 'cells_authenticated_rw'
  ) then
    create policy cells_authenticated_rw on public.cells
      for all
      using (true)
      with check (true);
  end if;
end$$;
