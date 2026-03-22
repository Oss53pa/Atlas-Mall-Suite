-- Memoire longue Proph3t
create table proph3t_memory (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade,
  session_id text not null,
  user_id uuid references auth.users(id),
  event_type text not null,
  entity_type text,
  entity_id text,
  description text not null,
  impact_metric text,
  floor_level text,
  created_at timestamptz default now()
);

-- Sessions utilisateurs
create table user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  projet_id uuid references projets(id),
  started_at timestamptz default now(),
  ended_at timestamptz,
  actions_count integer default 0
);

-- Index memoire
create index memory_projet_idx on proph3t_memory(projet_id, created_at desc);
create index memory_alert_idx on proph3t_memory(projet_id, event_type) where event_type = 'alert_ignored';

-- Realtime
alter publication supabase_realtime add table cameras;
alter publication supabase_realtime add table doors;
alter publication supabase_realtime add table pois;
alter publication supabase_realtime add table zones;
alter publication supabase_realtime add table signage_items;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table proph3t_memory;

-- RLS
alter table zones enable row level security;
alter table cameras enable row level security;
alter table doors enable row level security;
alter table pois enable row level security;
alter table signage_items enable row level security;
alter table incidents enable row level security;
alter table plan_snapshots enable row level security;
alter table proph3t_memory enable row level security;

create policy "auth" on zones for all using (auth.role() = 'authenticated');
create policy "auth" on cameras for all using (auth.role() = 'authenticated');
create policy "auth" on doors for all using (auth.role() = 'authenticated');
create policy "auth" on pois for all using (auth.role() = 'authenticated');
create policy "auth" on signage_items for all using (auth.role() = 'authenticated');
create policy "auth" on incidents for all using (auth.role() = 'authenticated');
create policy "auth" on proph3t_memory for all using (auth.role() = 'authenticated');
create policy "own_snapshots" on plan_snapshots for all using (auth.uid() = user_id);

-- Index spatiaux
create index zones_geom_idx on zones using gist(geom);
create index cameras_floor_idx on cameras(floor_id);
create index doors_floor_idx on doors(floor_id);
create index pois_floor_idx on pois(floor_id);
create index signage_floor_idx on signage_items(floor_id);
