-- ═══ MIGRATION 012 — Wayfinder Designer ═══
--
-- Table designer_projects : persistance des projets Wayfinder Designer.
-- Chaque projet appartient à un projet Atlas Mall (projets.id) et contient
-- la configuration complète (DesignerConfig JSON) + historique versions.
--
-- Réf : Cahier des charges PROPH3T §10 (Persistence — versioning + autosave).

create table if not exists designer_projects (
  id uuid primary key default uuid_generate_v4(),

  -- Référence projet Atlas
  projet_id uuid references projets(id) on delete cascade,

  -- Métadonnées
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),

  -- Configuration sérialisable (DesignerConfig TypeScript)
  config jsonb not null,

  -- Versioning
  version text not null default '0.1.0',
  version_history jsonb not null default '[]'::jsonb,

  -- Déploiement
  deployed_kiosk_ids text[] default '{}',

  -- Audit
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_autosave_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index if not exists idx_designer_projects_projet on designer_projects(projet_id);
create index if not exists idx_designer_projects_status on designer_projects(status);
create index if not exists idx_designer_projects_updated on designer_projects(updated_at desc);

-- ─── Trigger mise à jour auto updated_at ──────────

create or replace function update_designer_project_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_designer_project_updated on designer_projects;
create trigger trg_designer_project_updated
  before update on designer_projects
  for each row execute function update_designer_project_timestamp();

-- ─── RLS — isolation par projet ────────────────────

alter table designer_projects enable row level security;

create policy "designer_projects_select_members"
  on designer_projects for select
  using (
    projet_id in (
      select projet_id from project_members where user_id = auth.uid()
    )
  );

create policy "designer_projects_insert_members"
  on designer_projects for insert
  with check (
    projet_id in (
      select projet_id from project_members where user_id = auth.uid()
    )
  );

create policy "designer_projects_update_members"
  on designer_projects for update
  using (
    projet_id in (
      select projet_id from project_members
      where user_id = auth.uid()
      and role in ('editor', 'security_manager', 'commercial_manager')
    )
  );

create policy "designer_projects_delete_managers"
  on designer_projects for delete
  using (
    projet_id in (
      select projet_id from project_members
      where user_id = auth.uid()
      and role in ('security_manager', 'commercial_manager')
    )
  );

-- ─── Table séparée pour exports historiques ─────────

create table if not exists designer_exports (
  id uuid primary key default uuid_generate_v4(),
  designer_project_id uuid references designer_projects(id) on delete cascade,

  format text not null,
  color_space text not null default 'sRGB',
  dpi integer,
  size_bytes bigint,
  duration_ms integer,
  storage_url text,    -- chemin bucket si stockage Storage, sinon local

  exported_by uuid references auth.users(id),
  exported_at timestamptz default now(),

  -- Config snapshot au moment de l'export (traçabilité)
  config_snapshot jsonb not null,
  version text not null
);

create index if not exists idx_designer_exports_project on designer_exports(designer_project_id, exported_at desc);

alter table designer_exports enable row level security;

create policy "designer_exports_select_project_members"
  on designer_exports for select
  using (
    designer_project_id in (
      select id from designer_projects
      where projet_id in (
        select projet_id from project_members where user_id = auth.uid()
      )
    )
  );

create policy "designer_exports_insert_members"
  on designer_exports for insert
  with check (exported_by = auth.uid());

-- ─── Table de télémétrie runtime borne ────────────

create table if not exists kiosk_telemetry_events (
  id bigserial primary key,
  kiosk_id text not null,
  projet_id uuid references projets(id) on delete cascade,
  kind text not null,
  payload jsonb,
  locale text,
  session_hash text not null,
  recorded_at timestamptz default now()
);

create index if not exists idx_kiosk_telemetry_kiosk
  on kiosk_telemetry_events(kiosk_id, recorded_at desc);
create index if not exists idx_kiosk_telemetry_kind
  on kiosk_telemetry_events(kind);
create index if not exists idx_kiosk_telemetry_projet
  on kiosk_telemetry_events(projet_id, recorded_at desc);

alter table kiosk_telemetry_events enable row level security;

-- Insertion publique (bornes sans auth)
create policy "kiosk_telemetry_insert_public"
  on kiosk_telemetry_events for insert
  with check (true);

-- Lecture membres projet
create policy "kiosk_telemetry_select_members"
  on kiosk_telemetry_events for select
  using (
    projet_id in (
      select projet_id from project_members where user_id = auth.uid()
    )
  );

-- ─── Storage bucket pour assets Designer (logos, webfonts) ─

-- Note : création du bucket via UI Supabase :
--   Nom : wayfinder-designer-assets
--   Public : oui (lecture anonyme, écriture par membres projet)
comment on table designer_projects is 'Wayfinder Designer — projets. Bucket associé : wayfinder-designer-assets (à créer manuellement).';
