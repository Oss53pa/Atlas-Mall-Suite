-- ═══ Atlas Mall Suite — Versioning plans + Rapports partageables ═══
-- Date : 2026-04-22
-- Scope : 3 nouvelles tables pour la synchronisation cloud des :
--   • plan_versions    → historique des versions d'un plan (section 6)
--   • report_shares    → rapports HTML partagés pour validation (section 7)
--   • share_events     → événements de tracking des rapports (ouvert/validé/commenté)

-- ────────────────────────────────────────────────────────────
-- 1. plan_versions
-- ────────────────────────────────────────────────────────────

create table if not exists public.plan_versions (
  id                text primary key,
  projet_id         text not null,
  plan_id           text not null,         -- ex: "vol1-plan", "vol3-plan"
  version_number    int  not null,
  snapshot          jsonb not null,        -- ParsedPlan complet sérialisé
  author            text not null,
  author_email      text,
  message           text not null,
  tag               text,
  size_bytes        int,
  created_at        timestamptz not null default now()
);

create index if not exists plan_versions_plan_id_idx      on public.plan_versions (plan_id, version_number desc);
create index if not exists plan_versions_projet_id_idx    on public.plan_versions (projet_id);
create index if not exists plan_versions_created_at_idx   on public.plan_versions (created_at desc);

-- RLS : lecture/écriture par membre du projet (à raffiner selon le schéma projet)
alter table public.plan_versions enable row level security;
create policy "plan_versions readable by project members"
  on public.plan_versions for select
  using (true);
create policy "plan_versions writable by project members"
  on public.plan_versions for insert
  with check (true);
create policy "plan_versions deletable by project members"
  on public.plan_versions for delete
  using (true);

-- ────────────────────────────────────────────────────────────
-- 2. report_shares
-- ────────────────────────────────────────────────────────────

create table if not exists public.report_shares (
  token             text primary key,       -- "rpt_<hex>" — identifie le share
  projet_id         text not null,
  volume_id         text not null,          -- 'vol1' | 'vol2' | 'vol3' | 'vol4'
  title             text not null,
  channel           text not null,          -- 'email' | 'link'
  recipients        jsonb not null default '[]'::jsonb,
  url               text,
  html              text,                   -- HTML complet embarqué (peut être volumineux)
  status            text not null default 'draft',  -- draft|sent|opened|approved|rejected|commented|expired
  created_at        timestamptz not null default now(),
  expires_at        timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists report_shares_projet_id_idx    on public.report_shares (projet_id);
create index if not exists report_shares_volume_id_idx    on public.report_shares (volume_id);
create index if not exists report_shares_status_idx       on public.report_shares (status);
create index if not exists report_shares_created_at_idx   on public.report_shares (created_at desc);

alter table public.report_shares enable row level security;

-- Lecture publique via token (le destinataire lit son rapport)
create policy "report_shares readable via token"
  on public.report_shares for select
  using (true);
create policy "report_shares writable by project members"
  on public.report_shares for insert
  with check (true);
create policy "report_shares updatable by project members"
  on public.report_shares for update
  using (true);

-- ────────────────────────────────────────────────────────────
-- 3. share_events
-- ────────────────────────────────────────────────────────────

create table if not exists public.share_events (
  id                text primary key,
  report_token      text not null references public.report_shares(token) on delete cascade,
  type              text not null,         -- sent|opened|approved|corrections_requested|commented|expired
  actor             text,
  comment           text,
  meta              jsonb,
  at                timestamptz not null default now()
);

create index if not exists share_events_token_idx      on public.share_events (report_token, at desc);
create index if not exists share_events_type_idx       on public.share_events (type);
create index if not exists share_events_at_idx         on public.share_events (at desc);

alter table public.share_events enable row level security;

create policy "share_events insertable via webhook"
  on public.share_events for insert
  with check (true);
create policy "share_events readable by project members"
  on public.share_events for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- 4. Trigger : mise à jour automatique du status du share
-- ────────────────────────────────────────────────────────────

create or replace function public.update_share_status_on_event()
returns trigger as $$
begin
  update public.report_shares
     set status = case new.type
                    when 'approved'              then 'approved'
                    when 'corrections_requested' then 'rejected'
                    when 'commented'             then 'commented'
                    when 'opened'                then (case status when 'sent' then 'opened' else status end)
                    when 'expired'               then 'expired'
                    else status
                  end,
         updated_at = now()
   where token = new.report_token;
  return new;
end;
$$ language plpgsql;

drop trigger if exists share_events_update_status on public.share_events;
create trigger share_events_update_status
  after insert on public.share_events
  for each row
  execute function public.update_share_status_on_event();

-- ────────────────────────────────────────────────────────────
-- 5. Vue : tableau de bord des partages
-- ────────────────────────────────────────────────────────────

create or replace view public.report_shares_dashboard as
  select s.token,
         s.projet_id,
         s.volume_id,
         s.title,
         s.channel,
         s.status,
         s.created_at,
         s.expires_at,
         jsonb_array_length(s.recipients) as recipient_count,
         (select count(*) from public.share_events e where e.report_token = s.token) as event_count,
         (select count(*) from public.share_events e where e.report_token = s.token and e.type = 'opened') as open_count,
         (select max(e.at) from public.share_events e where e.report_token = s.token) as last_event_at
    from public.report_shares s;
