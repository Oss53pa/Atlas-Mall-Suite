create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- Projets
create table projets (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  adresse text,
  surface_m2 numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Etages
create table floors (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  level text not null,
  floor_order smallint not null,
  svg_path text,
  dwg_url text,
  width_m numeric default 120,
  height_m numeric default 80,
  created_at timestamptz default now()
);

-- Noeuds de transition inter-etages
create table transitions (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  type text not null,
  from_floor text not null,
  to_floor text not null,
  x numeric, y numeric,
  pmr boolean default false,
  capacity_per_min numeric default 60,
  label text
);

-- Zones
create table zones (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  label text not null,
  type text not null,
  x numeric, y numeric, w numeric, h numeric,
  niveau smallint check (niveau between 1 and 5),
  color text,
  description text,
  surface_m2 numeric,
  lux numeric default 300,
  geom geometry(Polygon, 4326),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Cameras
create table cameras (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  label text not null,
  model text,
  x numeric, y numeric,
  angle numeric default 270,
  fov numeric default 109,
  range_normalized numeric default 0.12,
  range_m numeric,
  color text,
  note text,
  priority text default 'normale',
  auto_placed boolean default false,
  wisefm_equipment_id text,
  capex_fcfa numeric default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Portes
create table doors (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  label text not null,
  x numeric, y numeric,
  zone_type text,
  is_exit boolean default false,
  has_badge boolean default false,
  has_biometric boolean default false,
  has_sas boolean default false,
  ref text, note text, norm_ref text,
  width_m numeric default 0.9,
  wisefm_equipment_id text,
  capex_fcfa numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- POI
create table pois (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  label text not null,
  type text, etage text,
  x numeric, y numeric,
  pmr boolean default false,
  color text, icon text, note text,
  cosmos_club_offre text,
  qr_url text,
  linked_floor_id uuid references floors(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Signaletique
create table signage_items (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id) on delete cascade,
  type text not null,
  x numeric, y numeric,
  orientation_deg numeric default 0,
  pose_height_m numeric,
  text_height_mm numeric,
  max_reading_distance_m numeric,
  visibility_score numeric,
  is_luminous boolean default false,
  requires_baes boolean default false,
  content text,
  ref text,
  capex_fcfa numeric default 0,
  norm_ref text,
  proph3t_note text,
  auto_placed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Graphe navigation
create table nav_nodes (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id),
  x numeric, y numeric,
  poi_id uuid references pois(id),
  label text,
  is_transition boolean default false
);

create table nav_edges (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  floor_id uuid references floors(id),
  from_node uuid references nav_nodes(id),
  to_node uuid references nav_nodes(id),
  distance_m numeric,
  pmr boolean default true,
  is_inter_floor boolean default false,
  transition_id uuid references transitions(id),
  time_sec numeric
);

-- Incidents
create table incidents (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  floor_id uuid references floors(id),
  zone_id uuid references zones(id),
  type text, description text,
  statut text default 'ouvert',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  closed_at timestamptz
);

-- Simulations sauvegardees
create table simulation_results (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  type text not null,
  scenario text,
  result_data jsonb not null,
  resilience_score numeric,
  created_at timestamptz default now()
);

-- Snapshots offline
create table plan_snapshots (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  user_id uuid references auth.users(id),
  data jsonb not null,
  created_at timestamptz default now()
);

-- Logs export
create table export_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  projet_id uuid references projets(id),
  volume text, type_export text,
  created_at timestamptz default now()
);

-- Integrations WiseFM
create table wisefm_links (
  id uuid primary key default uuid_generate_v4(),
  entity_id uuid not null, entity_type text not null,
  wisefm_id text not null,
  status text default 'operationnel',
  last_maintenance timestamptz, next_maintenance timestamptz
);

-- Integrations Cockpit
create table cockpit_zone_links (
  id uuid primary key default uuid_generate_v4(),
  zone_id uuid references zones(id),
  cockpit_milestone_id text not null,
  milestone_label text, due_date date, status text default 'a_venir'
);

-- CAPEX
create table capex_items (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  entity_id uuid, entity_type text,
  designation text, reference text,
  unit_price_fcfa numeric, quantity integer default 1,
  total_price_fcfa numeric generated always as (unit_price_fcfa * quantity) stored,
  budget_line text
);
