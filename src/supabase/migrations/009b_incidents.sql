-- ═══ INCIDENTS WORKFLOW — Migration 009 ═══

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references projets(id) on delete cascade,
  title text not null,
  description text,
  category text check (category in ('intrusion', 'camera_offline', 'mouvement_suspect', 'incendie', 'porte_forcee', 'autre')),
  severity text check (severity in ('critique', 'majeur', 'mineur')) not null,
  status text check (status in ('detecte', 'assigne', 'en_cours', 'resolu', 'cloture')) default 'detecte',
  zone_id text,
  camera_id text,
  assigned_to text,
  detected_at timestamptz default now(),
  resolved_at timestamptz,
  created_by uuid references auth.users(id),
  audit_trail jsonb default '[]'::jsonb
);

create index if not exists idx_incidents_status on incidents(status);
create index if not exists idx_incidents_projet on incidents(projet_id, detected_at desc);

alter table incidents enable row level security;
create policy "incidents_auth" on incidents for all using (auth.role() = 'authenticated');
