-- ═══ MIGRATION 004 — Vol.1 Plan Commercial ═══
-- Tables preneurs, baux, historique occupation

-- Preneurs
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projets(id) on delete cascade,
  company_name text not null,
  brand_name text not null,
  sector text not null,
  contact jsonb default '{}',
  lease_start date,
  lease_end date,
  base_rent_fcfa numeric default 0,
  service_charges numeric default 0,
  deposit_fcfa numeric default 0,
  status text default 'actif' check (status in ('actif','en_negociation','en_contentieux','sortant')),
  logo_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tenants_project_idx on tenants(project_id);
create index tenants_sector_idx on tenants(sector);
create index tenants_status_idx on tenants(status);

-- Mapping espace ↔ preneur
create table if not exists space_tenants (
  id uuid primary key default uuid_generate_v4(),
  space_id uuid references zones(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  since date not null,
  until_date date,
  notes text,
  created_at timestamptz default now()
);

create index space_tenants_space_idx on space_tenants(space_id);
create index space_tenants_tenant_idx on space_tenants(tenant_id);

-- Alertes commerciales
create table if not exists commercial_alerts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projets(id) on delete cascade,
  type text not null check (type in ('expiring_90d','expiring_30d','unpaid','vacant_60d','contentieux')),
  space_ref text,
  tenant_id uuid references tenants(id),
  message text not null,
  severity text not null check (severity in ('info','warning','critical')),
  acknowledged boolean default false,
  created_at timestamptz default now()
);

-- Occupancy snapshots (historique mensuel)
create table if not exists occupancy_snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projets(id) on delete cascade,
  month date not null,
  total_gla numeric,
  occupied_gla numeric,
  vacant_gla numeric,
  occupancy_rate numeric,
  total_rent_collected numeric,
  sector_breakdown jsonb default '{}',
  created_at timestamptz default now()
);

create index occupancy_project_month_idx on occupancy_snapshots(project_id, month);

-- Proph3t commercial recommendations log
create table if not exists proph3t_commercial_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projets(id) on delete cascade,
  action_type text not null,
  input_context jsonb,
  output jsonb,
  confidence numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
