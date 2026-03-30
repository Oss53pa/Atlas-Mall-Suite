-- ═══ 006_scenarios_validation.sql — Scenarios, Validation Hub, Phases, Touchpoints, Actions, Benchmark ═══

-- ─── Scenarios (comparaison A/B de configurations) ───

create table if not exists scenarios (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  name text not null,
  description text,
  snapshot jsonb not null default '{}',
  metrics jsonb,
  is_active boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ─── Validation Hub ───

create table if not exists validation_documents (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  title text not null,
  doc_type text not null
    check (doc_type in ('plan_securitaire', 'plan_commercial', 'plan_signaletique', 'dce', 'rapport_apsad')),
  version text default 'v1.0',
  status text default 'brouillon'
    check (status in ('brouillon', 'en_revue', 'commentaires', 'approuve', 'rejete')),
  workflow jsonb default '[]',
  file_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists validation_comments (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references validation_documents(id) on delete cascade not null,
  author_name text not null,
  author_role text not null,
  text text not null,
  linked_zone_id uuid,
  iso_x numeric,
  iso_y numeric,
  status text default 'ouvert'
    check (status in ('ouvert', 'resolu')),
  created_at timestamptz default now()
);

-- ─── Phases commerciales (Vol.1) ───

create table if not exists commercial_phases (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  name text not null,
  target_date date,
  target_occupancy_rate numeric,
  confirmed_tenant_ids jsonb default '[]',
  projected_revenue_fcfa numeric,
  created_at timestamptz default now()
);

-- ─── Touchpoints parcours (Vol.3) ───

create table if not exists touchpoints (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  moment_number smallint check (moment_number between 1 and 7),
  channel text not null
    check (channel in ('physique', 'digital', 'humain', 'sensoriel')),
  description text,
  current_quality smallint check (current_quality between 1 and 5),
  target_quality smallint check (target_quality between 1 and 5),
  nps_impact text,
  action text,
  responsable text,
  deadline date,
  estimated_cost_fcfa numeric,
  created_at timestamptz default now()
);

-- ─── Plan d'action / Gantt ───

create table if not exists action_items (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  volume text,
  title text not null,
  description text,
  responsable text,
  start_date date,
  end_date date,
  status text default 'a_faire'
    check (status in ('a_faire', 'en_cours', 'bloque', 'termine')),
  priority text default 'normale'
    check (priority in ('critique', 'haute', 'normale', 'basse')),
  dependencies jsonb default '[]',
  estimated_cost_fcfa numeric,
  cockpit_milestone_id text,
  created_at timestamptz default now()
);

-- ─── Benchmark malls africains ───

create table if not exists mall_benchmark (
  id uuid primary key default uuid_generate_v4(),
  name text,
  city text not null,
  country text not null,
  gla_m2 numeric,
  class_type text check (class_type in ('A', 'B', 'C')),
  camera_density numeric,
  occupancy_rate numeric,
  avg_dwell_time_min numeric,
  daily_visitor_base numeric,
  security_score numeric,
  avg_rent_fcfa_m2 numeric,
  signage_density numeric,
  is_public boolean default false,
  source_projet_id uuid,
  created_at timestamptz default now()
);

-- ═══ RLS ═══

alter table scenarios enable row level security;
alter table validation_documents enable row level security;
alter table validation_comments enable row level security;
alter table commercial_phases enable row level security;
alter table touchpoints enable row level security;
alter table action_items enable row level security;
alter table mall_benchmark enable row level security;

-- Scenarios
create policy "member_select_scenarios" on scenarios
  for select using (is_project_member(projet_id));
create policy "writer_insert_scenarios" on scenarios
  for insert with check (can_write_project(projet_id));
create policy "writer_update_scenarios" on scenarios
  for update using (can_write_project(projet_id));
create policy "writer_delete_scenarios" on scenarios
  for delete using (can_write_project(projet_id));

-- Validation documents
create policy "member_select_validation_documents" on validation_documents
  for select using (is_project_member(projet_id));
create policy "writer_insert_validation_documents" on validation_documents
  for insert with check (can_write_project(projet_id));
create policy "writer_update_validation_documents" on validation_documents
  for update using (can_write_project(projet_id));
create policy "writer_delete_validation_documents" on validation_documents
  for delete using (can_write_project(projet_id));

-- Validation comments (linked via document)
create policy "member_select_validation_comments" on validation_comments
  for select using (
    exists (
      select 1 from validation_documents vd
      where vd.id = validation_comments.document_id
        and is_project_member(vd.projet_id)
    )
  );
create policy "auth_insert_validation_comments" on validation_comments
  for insert with check (auth.role() = 'authenticated');
create policy "author_update_validation_comments" on validation_comments
  for update using (author_name = auth.jwt()->>'email');

-- Commercial phases
create policy "member_select_commercial_phases" on commercial_phases
  for select using (is_project_member(projet_id));
create policy "writer_insert_commercial_phases" on commercial_phases
  for insert with check (can_write_project(projet_id));
create policy "writer_update_commercial_phases" on commercial_phases
  for update using (can_write_project(projet_id));
create policy "writer_delete_commercial_phases" on commercial_phases
  for delete using (can_write_project(projet_id));

-- Touchpoints
create policy "member_select_touchpoints" on touchpoints
  for select using (is_project_member(projet_id));
create policy "writer_insert_touchpoints" on touchpoints
  for insert with check (can_write_project(projet_id));
create policy "writer_update_touchpoints" on touchpoints
  for update using (can_write_project(projet_id));
create policy "writer_delete_touchpoints" on touchpoints
  for delete using (can_write_project(projet_id));

-- Action items
create policy "member_select_action_items" on action_items
  for select using (is_project_member(projet_id));
create policy "writer_insert_action_items" on action_items
  for insert with check (can_write_project(projet_id));
create policy "writer_update_action_items" on action_items
  for update using (can_write_project(projet_id));
create policy "writer_delete_action_items" on action_items
  for delete using (can_write_project(projet_id));

-- Mall benchmark — public read, owner-only write
create policy "public_select_mall_benchmark" on mall_benchmark
  for select using (true);
create policy "auth_insert_mall_benchmark" on mall_benchmark
  for insert with check (auth.role() = 'authenticated');
create policy "auth_update_mall_benchmark" on mall_benchmark
  for update using (auth.role() = 'authenticated');

-- ═══ Realtime ═══

alter publication supabase_realtime add table validation_documents;
alter publication supabase_realtime add table validation_comments;
alter publication supabase_realtime add table scenarios;

-- ═══ Indexes ═══

create index if not exists scenarios_projet_idx on scenarios(projet_id);
create index if not exists validation_documents_projet_idx on validation_documents(projet_id);
create index if not exists validation_comments_document_idx on validation_comments(document_id);
create index if not exists commercial_phases_projet_idx on commercial_phases(projet_id);
create index if not exists touchpoints_projet_idx on touchpoints(projet_id);
create index if not exists action_items_projet_idx on action_items(projet_id);
create index if not exists mall_benchmark_country_idx on mall_benchmark(country, class_type);

-- ═══ Updated_at trigger for validation_documents ═══

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger validation_documents_updated_at
  before update on validation_documents
  for each row execute function update_updated_at();
