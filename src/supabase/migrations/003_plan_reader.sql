-- ═══ TABLES LECTURE DE PLANS ET COTES ═══

-- Imports de plans (historique)
create table if not exists plan_imports (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  file_name text not null,
  source_type text not null,
  file_size_bytes bigint,
  zones_detected integer default 0,
  dims_detected integer default 0,
  calibration_method text,
  calibration_confidence numeric,
  real_width_m numeric,
  real_height_m numeric,
  scale_factor_x numeric,
  scale_factor_y numeric,
  import_warnings jsonb default '[]',
  import_errors jsonb default '[]',
  imported_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Cotes extraites des plans
create table if not exists plan_dimensions (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  import_id uuid references plan_imports(id) on delete cascade,
  dim_type text not null,
  value_m numeric not null,
  value_text text,
  unit text default 'mm',
  confidence numeric default 0,
  def_point1_x numeric, def_point1_y numeric,
  def_point2_x numeric, def_point2_y numeric,
  text_x numeric, text_y numeric,
  layer_source text,
  linked_zone_id uuid references zones(id),
  is_used_for_calibration boolean default false,
  created_at timestamptz default now()
);

-- Specifications de cotes pour exports
create table if not exists cotation_specs (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  cot_type text not null,
  point1_x numeric, point1_y numeric,
  point2_x numeric, point2_y numeric,
  value_m numeric not null,
  display_text text not null,
  offset_px numeric default 20,
  text_size_pt numeric default 7,
  color text default '#38bdf8',
  arrow_style text default 'tick',
  entity_type text,
  entity_id text,
  auto_generated boolean default true,
  created_at timestamptz default now()
);

-- Resultats reconnaissance Vision
create table if not exists vision_recognitions (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id),
  file_name text,
  media_type text,
  zones_recognized integer default 0,
  walls_recognized integer default 0,
  doors_recognized integer default 0,
  dims_recognized integer default 0,
  overall_confidence numeric,
  raw_claude_response text,
  proph3t_notes jsonb default '[]',
  recognized_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Index
create index if not exists plan_imports_floor_idx on plan_imports(floor_id);
create index if not exists plan_dims_floor_idx on plan_dimensions(floor_id);
create index if not exists cotation_floor_idx on cotation_specs(floor_id);
create index if not exists vision_floor_idx on vision_recognitions(floor_id);

-- RLS
alter table plan_imports enable row level security;
alter table plan_dimensions enable row level security;
alter table cotation_specs enable row level security;
alter table vision_recognitions enable row level security;

create policy "auth_plan_imports" on plan_imports for all using (auth.role() = 'authenticated');
create policy "auth_plan_dimensions" on plan_dimensions for all using (auth.role() = 'authenticated');
create policy "auth_cotation_specs" on cotation_specs for all using (auth.role() = 'authenticated');
create policy "auth_vision_recognitions" on vision_recognitions for all using (auth.role() = 'authenticated');
