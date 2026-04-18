-- ═══ MIGRATION 014 — Model Registry (LRN-04/05/06) ═══

create table if not exists proph3t_model_versions (
  id text primary key,
  kind text not null,
  version text not null,
  weights_json text,
  hyperparams jsonb,
  metrics jsonb,
  notes text,
  is_active boolean default false,
  is_locked boolean default false,
  trained_at timestamptz default now(),
  trained_by uuid references auth.users(id)
);

create index if not exists idx_model_versions_kind on proph3t_model_versions(kind);
create index if not exists idx_model_versions_active on proph3t_model_versions(kind, is_active) where is_active = true;

alter table proph3t_model_versions enable row level security;
create policy "model_versions_select_authenticated"
  on proph3t_model_versions for select using (auth.uid() is not null);
create policy "model_versions_insert_authenticated"
  on proph3t_model_versions for insert with check (auth.uid() is not null);
create policy "model_versions_update_authenticated"
  on proph3t_model_versions for update using (auth.uid() is not null);
