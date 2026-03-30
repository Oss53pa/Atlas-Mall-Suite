-- ═══ PROPH3T LEARNING SYSTEM — Migration 007 ═══

-- Feedback des recommandations Proph3t (moteur bayesien)
create table if not exists proph3t_feedback (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  rule_id text not null,
  rule_category text not null,
  recommendation text,
  user_action text not null check (user_action in ('accepted','rejected','modified','deferred')),
  modified_value text,
  context jsonb default '{}',
  timestamp timestamptz default now(),
  user_id uuid references auth.users(id)
);

-- Poids des regles (apprentissage bayesien)
create table if not exists proph3t_rule_weights (
  id uuid primary key default uuid_generate_v4(),
  rule_id text not null,
  projet_id uuid references projets(id) on delete cascade,
  adjusted_weight numeric default 1.0 check (adjusted_weight between 0.1 and 2.0),
  total_feedbacks integer default 0,
  acceptance_rate numeric default 0.5,
  user_preferences jsonb default '{}',
  trend text default 'stable' check (trend in ('improving','stable','declining')),
  last_updated timestamptz default now(),
  unique(rule_id, projet_id)
);

-- Insights inter-volumes enregistres
create table if not exists cross_volume_insights (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  source_volume text not null,
  target_volume text not null,
  source_entity_id text,
  target_entity_id text,
  insight_type text not null check (insight_type in ('conflict','opportunity','risk','optimization')),
  severity text not null check (severity in ('critique','attention','info')),
  title text not null,
  explanation text,
  recommended_action text,
  resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Notes Proph3t (messages proactifs generes)
create table if not exists proph3t_notes (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  text text not null,
  category text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Benchmark contributions anonymisees
create table if not exists mall_benchmark (
  id uuid primary key default uuid_generate_v4(),
  source_projet_id uuid,
  name text,
  city text not null,
  country text not null,
  gla_m2 numeric,
  class_type text check (class_type in ('A','B','C')),
  camera_density numeric,
  security_score numeric,
  exit_count integer,
  occupancy_rate numeric,
  avg_rent_fcfa_m2 numeric,
  avg_dwell_time_min numeric,
  daily_visitor_base numeric,
  signaget_density numeric,
  anchor_types jsonb default '[]',
  open_year integer,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- Phases du projet
create table if not exists project_phases (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  name text not null,
  target_date date not null,
  confirmed_tenant_ids jsonb default '[]',
  planned_camera_ids jsonb default '[]',
  planned_door_ids jsonb default '[]',
  target_occupancy_rate numeric default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table proph3t_feedback enable row level security;
alter table proph3t_rule_weights enable row level security;
alter table cross_volume_insights enable row level security;
alter table proph3t_notes enable row level security;
alter table project_phases enable row level security;

create policy "proph3t_feedback_auth" on proph3t_feedback for all using (auth.role() = 'authenticated');
create policy "proph3t_weights_auth" on proph3t_rule_weights for all using (auth.role() = 'authenticated');
create policy "cross_insights_auth" on cross_volume_insights for all using (auth.role() = 'authenticated');
create policy "proph3t_notes_auth" on proph3t_notes for all using (auth.role() = 'authenticated');
create policy "project_phases_auth" on project_phases for all using (auth.role() = 'authenticated');

-- mall_benchmark : lecture publique, ecriture authentifiee
alter table mall_benchmark enable row level security;
create policy "benchmark_public_read" on mall_benchmark for select using (is_public = true);
create policy "benchmark_auth_write" on mall_benchmark for insert with check (auth.role() = 'authenticated');

-- Index
create index if not exists idx_feedback_projet_rule on proph3t_feedback(projet_id, rule_id);
create index if not exists idx_weights_projet_rule on proph3t_rule_weights(projet_id, rule_id);
create index if not exists idx_insights_projet on cross_volume_insights(projet_id, resolved);
create index if not exists idx_benchmark_class_country on mall_benchmark(class_type, country);
create index if not exists idx_notes_projet on proph3t_notes(projet_id, is_read);
create index if not exists idx_phases_projet on project_phases(projet_id);
