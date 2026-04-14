-- ═══ Canvas States — Persistence des états canvas ═══

create table if not exists canvas_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  floor_plan_id uuid,
  canvas_type text not null,          -- 'vol1' | 'vol2' | 'vol3' | 'scene' | 'report'
  state jsonb not null,
  version int default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table canvas_states enable row level security;

create policy "canvas_read" on canvas_states for select
  using (project_id in (select p.id from projects p where is_org_member(p.org_id)));

create policy "canvas_write" on canvas_states for insert
  with check (project_id in (select p.id from projects p where is_org_member(p.org_id)));

create index idx_canvas_states_project on canvas_states(project_id, canvas_type);
