-- ═══ MIGRATION 013 — Orchestration & Audit traces ═══
-- CDC §3.7 PROPH3T-ORCH + §6.2 auditabilité

create table if not exists proph3t_execution_traces (
  id text primary key,
  projet_id uuid references projets(id) on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null check (status in ('pending', 'running', 'success', 'failed', 'skipped')),
  volumes text[] not null,
  steps jsonb not null,
  last_checkpoint jsonb,
  stats jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_proph3t_traces_projet
  on proph3t_execution_traces(projet_id, started_at desc);
create index if not exists idx_proph3t_traces_status
  on proph3t_execution_traces(status);

alter table proph3t_execution_traces enable row level security;
create policy "proph3t_traces_select_members"
  on proph3t_execution_traces for select
  using (projet_id in (select projet_id from project_members where user_id = auth.uid()));
create policy "proph3t_traces_insert_authenticated"
  on proph3t_execution_traces for insert
  with check (auth.uid() is not null);
