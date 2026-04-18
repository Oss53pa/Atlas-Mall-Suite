-- ═══ MIGRATION 011 — Vol.4 Wayfinder analytics ═══
-- Table pour persister les logs d'itinéraires calculés par Vol.4.
-- Utilisée par les analytics en temps réel (aggregateUsage).

create table if not exists wayfinder_usage_logs (
  id uuid primary key default uuid_generate_v4(),

  projet_id uuid references projets(id) on delete cascade,
  kiosk_id text,
  platform text not null check (platform in ('mobile', 'web', 'kiosk')),

  from_node text,
  to_node text,
  from_label text,
  to_label text,

  mode text not null check (mode in ('standard', 'pmr', 'fast', 'discovery', 'evacuation')),
  length_m numeric,
  duration_s numeric,
  compute_ms numeric,
  recalculated boolean default false,

  persona text,
  lang text check (lang in ('fr', 'en', 'dioula')),
  pmr boolean default false,
  session_hash text,

  created_at timestamptz default now()
);

create index if not exists idx_wayfinder_logs_projet
  on wayfinder_usage_logs(projet_id, created_at desc);
create index if not exists idx_wayfinder_logs_kiosk
  on wayfinder_usage_logs(kiosk_id, created_at desc);
create index if not exists idx_wayfinder_logs_destination
  on wayfinder_usage_logs(to_label);
create index if not exists idx_wayfinder_logs_mode
  on wayfinder_usage_logs(mode);

alter table wayfinder_usage_logs enable row level security;

-- Insertion : n'importe qui (kiosque public, mobile)
create policy "wayfinder_usage_insert_public"
  on wayfinder_usage_logs for insert
  with check (true);

-- Lecture : membres du projet uniquement
create policy "wayfinder_usage_select_members"
  on wayfinder_usage_logs for select
  using (
    projet_id in (
      select projet_id from project_members where user_id = auth.uid()
    )
  );
