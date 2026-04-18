-- ═══ MIGRATION 003 — World-Class Features ═══
-- Bibliothèque équipements, Multi-projets, Collaboration, Benchmark

-- ─── Bibliothèque équipements ─────────────────────────────────

create table equipment_library (
  id uuid primary key default uuid_generate_v4(),
  brand text not null,
  model text not null,
  category text not null,
  subcategory text,
  specs jsonb default '{}',
  price_fcfa numeric default 0,
  price_eur numeric default 0,
  datasheet_url text,
  certifications text[] default '{}',
  compatible_with text[] default '{}',
  installation_notes text,
  maintenance_interval_months integer default 12,
  available_abidjan boolean default true,
  supplier_ci text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index equipment_category_idx on equipment_library(category);
create index equipment_brand_idx on equipment_library(brand);

-- ─── Multi-projets ────────────────────────────────────────────

create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client text,
  address text,
  surface_m2 numeric,
  type text default 'mall',
  opening_date date,
  status text default 'conception',
  thumbnail_url text,
  config jsonb default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer',
  invited_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- ─── Templates ────────────────────────────────────────────────

create table project_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null,
  description text,
  config jsonb not null default '{}',
  icon text,
  estimated_capex_per_m2_fcfa numeric,
  created_at timestamptz default now()
);

-- ─── Liens de partage sécurisés ───────────────────────────────

create table share_links (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  token text unique not null,
  role text not null default 'viewer',
  label text,
  expires_at timestamptz,
  active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index share_links_token_idx on share_links(token) where active = true;

-- ─── Annotations sur le plan ──────────────────────────────────

create table plan_annotations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  floor_id text,
  x numeric not null,
  y numeric not null,
  author_id uuid references auth.users(id),
  author_name text,
  text text not null,
  status text default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table annotation_replies (
  id uuid primary key default uuid_generate_v4(),
  annotation_id uuid references plan_annotations(id) on delete cascade,
  author_id uuid references auth.users(id),
  author_name text,
  text text not null,
  created_at timestamptz default now()
);

-- ─── Versions du plan ─────────────────────────────────────────

create table plan_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  version_number integer not null,
  label text,
  snapshot jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create unique index plan_versions_unique on plan_versions(project_id, version_number);

-- ─── Validations de sections ──────────────────────────────────

create table section_validations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  section_id text not null,
  volume text not null,
  status text default 'draft',
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create unique index section_validations_unique on section_validations(project_id, section_id, volume);

-- ─── CAPEX calculé ────────────────────────────────────────────

create table capex_calculations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  equipment_id uuid references equipment_library(id),
  entity_id text,
  entity_type text,
  designation text,
  reference text,
  quantity integer default 1,
  unit_price_fcfa numeric default 0,
  category text,
  notes text,
  created_at timestamptz default now()
);

-- ─── Benchmarks ───────────────────────────────────────────────

create table benchmark_data (
  id uuid primary key default uuid_generate_v4(),
  mall_name text not null,
  city text,
  country text,
  surface_m2 numeric,
  nb_cameras integer,
  coverage_pct numeric,
  nps numeric,
  dwell_time_min numeric,
  ca_m2_fcfa numeric,
  has_loyalty_program boolean default false,
  digital_touchpoints integer default 0,
  signage_density numeric,
  security_score numeric,
  year integer,
  source text,
  created_at timestamptz default now()
);

-- ─── Plan actions (gestion de projet) ─────────────────────────

create table plan_actions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  responsible text,
  start_date date,
  end_date date,
  dependencies text[] default '{}',
  status text default 'not_started',
  progress integer default 0,
  deliverables text[] default '{}',
  budget_fcfa numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Suivi signalétique ───────────────────────────────────────

create table signaletique_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  code text not null,
  type text not null,
  zone text,
  floor text,
  status text default 'to_order',
  supplier text,
  order_date date,
  delivery_date date,
  install_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Suivi touchpoints ────────────────────────────────────────

create table touchpoint_items (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade,
  code text not null,
  name text not null,
  type text default 'physical',
  status text default 'design',
  dependencies text[] default '{}',
  responsible text,
  due_date date,
  test_results text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══ ROW LEVEL SECURITY ═══

alter table projects enable row level security;
alter table project_members enable row level security;
alter table equipment_library enable row level security;
alter table share_links enable row level security;
alter table plan_annotations enable row level security;
alter table annotation_replies enable row level security;
alter table plan_versions enable row level security;
alter table section_validations enable row level security;
alter table capex_calculations enable row level security;
alter table benchmark_data enable row level security;
alter table plan_actions enable row level security;
alter table signaletique_items enable row level security;
alter table touchpoint_items enable row level security;

-- Projects: owner or team member
create policy "project_access" on projects for all
  using (
    auth.uid() = created_by
    or exists (
      select 1 from project_members
      where project_id = projects.id and user_id = auth.uid()
    )
  );

-- Project members: visible to project members
create policy "project_members_access" on project_members for all
  using (
    exists (
      select 1 from projects
      where id = project_members.project_id
      and (created_by = auth.uid() or exists (
        select 1 from project_members pm
        where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
      ))
    )
  );

-- Equipment library: readable by all authenticated
create policy "equipment_read" on equipment_library for select
  using (auth.role() = 'authenticated');

-- Share links: project members can manage
create policy "share_links_access" on share_links for all
  using (
    exists (
      select 1 from projects
      where id = share_links.project_id
      and (created_by = auth.uid() or exists (
        select 1 from project_members
        where project_id = share_links.project_id and user_id = auth.uid()
      ))
    )
  );

-- Annotations: authenticated users on their projects
create policy "annotations_access" on plan_annotations for all
  using (auth.role() = 'authenticated');

create policy "annotation_replies_access" on annotation_replies for all
  using (auth.role() = 'authenticated');

-- Versions: project members
create policy "versions_access" on plan_versions for all
  using (auth.role() = 'authenticated');

-- Section validations: project members
create policy "validations_access" on section_validations for all
  using (auth.role() = 'authenticated');

-- CAPEX: project members
create policy "capex_access" on capex_calculations for all
  using (auth.role() = 'authenticated');

-- Benchmark: readable by all authenticated
create policy "benchmark_read" on benchmark_data for select
  using (auth.role() = 'authenticated');

-- Plan actions, signalétique, touchpoints: project members
create policy "plan_actions_access" on plan_actions for all
  using (auth.role() = 'authenticated');

create policy "signaletique_access" on signaletique_items for all
  using (auth.role() = 'authenticated');

create policy "touchpoints_access" on touchpoint_items for all
  using (auth.role() = 'authenticated');

-- ═══ REALTIME ═══

alter publication supabase_realtime add table plan_annotations;
alter publication supabase_realtime add table annotation_replies;
alter publication supabase_realtime add table section_validations;
alter publication supabase_realtime add table plan_actions;
alter publication supabase_realtime add table signaletique_items;
alter publication supabase_realtime add table touchpoint_items;

-- ═══ UPDATED_AT TRIGGER ═══

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger equipment_updated_at before update on equipment_library
  for each row execute function update_updated_at();

create trigger projects_updated_at before update on projects
  for each row execute function update_updated_at();

create trigger annotations_updated_at before update on plan_annotations
  for each row execute function update_updated_at();

create trigger plan_actions_updated_at before update on plan_actions
  for each row execute function update_updated_at();

create trigger signaletique_updated_at before update on signaletique_items
  for each row execute function update_updated_at();

create trigger touchpoints_updated_at before update on touchpoint_items
  for each row execute function update_updated_at();
