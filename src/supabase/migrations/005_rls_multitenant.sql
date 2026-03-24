-- ═══ 005_rls_multitenant.sql — RLS Multi-Tenant Security ═══

-- Table des membres de projet (contrôle d'accès)
create table if not exists project_members (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'viewer'
    check (role in ('owner', 'editor', 'viewer', 'security_manager', 'commercial_manager')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(projet_id, user_id)
);

alter table project_members enable row level security;

create policy "own_memberships" on project_members
  for select using (auth.uid() = user_id);

create policy "owner_manage_members" on project_members
  for all using (
    exists (
      select 1 from project_members pm
      where pm.projet_id = project_members.projet_id
        and pm.user_id = auth.uid()
        and pm.role = 'owner'
    )
  );

-- Helper functions
create or replace function is_project_member(p_projet_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from project_members
    where projet_id = p_projet_id
      and user_id = auth.uid()
  );
$$;

create or replace function can_write_project(p_projet_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from project_members
    where projet_id = p_projet_id
      and user_id = auth.uid()
      and role in ('owner', 'editor', 'security_manager', 'commercial_manager')
  );
$$;

-- Projets RLS
alter table projets enable row level security;
create policy "project_member_select" on projets
  for select using (is_project_member(id));
create policy "project_owner_insert" on projets
  for insert with check (auth.role() = 'authenticated');
create policy "project_owner_update" on projets
  for update using (can_write_project(id));
create policy "project_owner_delete" on projets
  for delete using (
    exists (
      select 1 from project_members
      where projet_id = projets.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- Auto-add creator as owner
create or replace function auto_add_project_owner()
returns trigger language plpgsql security definer as $$
begin
  insert into project_members (projet_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_project_created on projets;
create trigger on_project_created
  after insert on projets
  for each row execute function auto_add_project_owner();

-- RLS on floors and transitions
alter table floors enable row level security;
create policy "member_select_floors" on floors for select using (is_project_member(projet_id));
create policy "writer_insert_floors" on floors for insert with check (can_write_project(projet_id));
create policy "writer_update_floors" on floors for update using (can_write_project(projet_id));
create policy "writer_delete_floors" on floors for delete using (can_write_project(projet_id));

alter table transitions enable row level security;
create policy "member_select_transitions" on transitions for select using (is_project_member(projet_id));
create policy "writer_insert_transitions" on transitions for insert with check (can_write_project(projet_id));
create policy "writer_update_transitions" on transitions for update using (can_write_project(projet_id));
create policy "writer_delete_transitions" on transitions for delete using (can_write_project(projet_id));

-- Batch RLS for all data tables with projet_id
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'zones','cameras','doors','pois','signage_items','incidents',
    'proph3t_memory'
  ]
  loop
    execute format('alter table %I enable row level security', tbl);
    execute format(
      'create policy "member_select_%s" on %I for select using (is_project_member(projet_id))',
      tbl, tbl
    );
    execute format(
      'create policy "writer_insert_%s" on %I for insert with check (can_write_project(projet_id))',
      tbl, tbl
    );
    execute format(
      'create policy "writer_update_%s" on %I for update using (can_write_project(projet_id))',
      tbl, tbl
    );
    execute format(
      'create policy "writer_delete_%s" on %I for delete using (can_write_project(projet_id))',
      tbl, tbl
    );
  end loop;
end;
$$;

-- Indexes for RLS performance
create index if not exists project_members_user_idx on project_members(user_id, projet_id);
create index if not exists project_members_projet_idx on project_members(projet_id);

-- Storage bucket for plan images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plan-images', 'plan-images', false, 8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create policy "auth_upload_plans" on storage.objects
  for insert with check (
    bucket_id = 'plan-images' and auth.role() = 'authenticated'
  );

create policy "auth_read_plans" on storage.objects
  for select using (
    bucket_id = 'plan-images' and auth.role() = 'authenticated'
  );

create policy "auth_delete_plans" on storage.objects
  for delete using (
    bucket_id = 'plan-images' and auth.role() = 'authenticated'
  );
