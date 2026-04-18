-- ═══ SCENE EDITOR — Migration 008 ═══

-- Scenes sauvegardees avec rendus
create table if not exists scene_renders (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references projets(id) on delete cascade,
  zone_id text,
  scene_data jsonb not null,
  ambiance jsonb,
  proph3t_prompt text,
  render_mode text check (render_mode in ('threejs', 'photo_ai')),
  render_url text,
  render_thumbnail_url text,
  is_approved boolean default false,
  approved_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Tracking des rendus IA externes (facturation par org)
create table if not exists render_usage (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references projets(id) on delete cascade,
  user_id uuid references auth.users(id),
  render_mode text not null,
  api_provider text,
  cost_usd numeric default 0,
  prompt_used text,
  result_url text,
  created_at timestamptz default now()
);

-- RLS
alter table scene_renders enable row level security;
alter table render_usage enable row level security;

create policy "scene_renders_auth" on scene_renders for all using (auth.role() = 'authenticated');
create policy "render_usage_auth" on render_usage for all using (auth.role() = 'authenticated');

-- Index
create index if not exists idx_scene_renders_projet on scene_renders(projet_id, created_at desc);
create index if not exists idx_render_usage_projet on render_usage(projet_id, created_at desc);
