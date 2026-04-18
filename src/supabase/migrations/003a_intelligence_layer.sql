-- ═══ 003_intelligence_layer.sql — Intelligence & Contrôle Layer ═══
-- Nouvelles tables pour le moteur prédictif, alertes, incidents, plan d'action, etc.

-- Alertes
create table if not exists alerts (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  type text not null,
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  message text,
  entity_id uuid,
  entity_type text,
  volume text check (volume in ('vol2','vol3','both')),
  action_required text,
  acknowledged boolean default false,
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  auto_resolved boolean default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Incidents workflow
create table if not exists incidents_workflow (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id),
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  note text,
  response_time_sec integer,
  created_at timestamptz default now()
);

-- Incident REX (retour d'expérience)
create table if not exists incident_rex (
  id uuid primary key default uuid_generate_v4(),
  incident_id uuid references incidents(id),
  cause_racine text,
  actions_correctives text,
  actions_preventives text,
  efficacite_score smallint check (efficacite_score between 1 and 5),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Plan d'action A01-A13
create table if not exists plan_actions (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  code text not null,
  titre text not null,
  description text,
  phase text,
  priorite text,
  date_cible date,
  date_debut date,
  date_fin_reelle date,
  avancement integer default 0 check (avancement between 0 and 100),
  statut text default 'a_faire',
  responsables text[],
  depends_on text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sous-tâches d'une action
create table if not exists plan_action_tasks (
  id uuid primary key default uuid_generate_v4(),
  action_id uuid references plan_actions(id),
  titre text not null,
  done boolean default false,
  done_at timestamptz,
  done_by uuid references auth.users(id)
);

-- Commentaires sur une action
create table if not exists plan_action_comments (
  id uuid primary key default uuid_generate_v4(),
  action_id uuid references plan_actions(id),
  text text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Suivi signalétique (131 éléments)
create table if not exists signaletique_items (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  type text not null,
  label text not null,
  quantite integer not null,
  statut text default 'specifie',
  date_commande date,
  date_livraison_prevue date,
  date_installation_reelle date,
  responsable text,
  localisation text,
  photo_url text,
  notes text
);

-- Touchpoints (15)
create table if not exists touchpoints (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  label text not null,
  phase text,
  type text,
  responsable text,
  description text,
  priorite text,
  statut text default 'specifie',
  go_live_date date,
  test_result text,
  dependencies text[]
);

-- Feedback Proph3t
create table if not exists proph3t_feedback (
  id uuid primary key default uuid_generate_v4(),
  recommendation_id text,
  recommendation_text text,
  recommendation_type text,
  action text check (action in ('accepted','rejected','deferred')),
  rejection_reason text,
  user_id uuid references auth.users(id),
  outcome text,
  outcome_score numeric check (outcome_score between -1 and 1),
  created_at timestamptz default now()
);

-- Ajustements règles Proph3t
create table if not exists proph3t_rule_adjustments (
  id uuid primary key default uuid_generate_v4(),
  rule_id text not null,
  old_threshold numeric,
  new_threshold numeric,
  reason text,
  triggered_by_feedbacks integer,
  created_at timestamptz default now()
);

-- Prédictions fréquentation
create table if not exists frequentation_predictions (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  zone_id uuid references zones(id),
  predicted_at timestamptz not null,
  predicted_for timestamptz not null,
  predicted_visitors integer,
  confidence numeric,
  saturation_risk boolean,
  model_version text,
  actual_visitors integer
);

-- Audit trail immuable
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  user_id uuid references auth.users(id),
  action_type text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  context jsonb,
  ip_address text,
  created_at timestamptz default now()
);

-- Résultats what-if
create table if not exists whatif_simulations (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  scenario_type text,
  parameters jsonb,
  result_before jsonb,
  result_after jsonb,
  delta jsonb,
  applied boolean default false,
  applied_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Réclamations visiteurs
create table if not exists feedbacks_visiteurs (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references projets(id),
  source text,
  categorie text,
  message text,
  note smallint check (note between 1 and 5),
  zone_id uuid references zones(id),
  statut text default 'ouvert',
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- Realtime publications
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table plan_actions;
alter publication supabase_realtime add table feedbacks_visiteurs;

-- RLS
alter table alerts enable row level security;
alter table plan_actions enable row level security;
alter table audit_log enable row level security;

create policy "auth_alerts" on alerts for all using (auth.role() = 'authenticated');
create policy "auth_plan_actions" on plan_actions for all using (auth.role() = 'authenticated');
create policy "insert_only_audit" on audit_log for insert using (auth.role() = 'authenticated');
create policy "read_own_audit" on audit_log for select using (auth.uid() = user_id);

-- Initialiser les 13 actions du plan
insert into plan_actions (code, titre, phase, priorite, date_cible, date_debut, responsables) values
  ('A01','Charte signalétique Cosmos','Pré-ouverture','haute','2026-07-31','2026-06-01',ARRAY['Marketing','Fernand']),
  ('A02','Installation 12 panneaux + totem + bâche','Pré-ouverture','haute','2026-09-30','2026-07-15',ARRAY['Operations','Mairie Cocody']),
  ('A03','App Cosmos Club iOS + Android','Pré-ouverture','haute','2026-08-31','2026-05-01',ARRAY['DSI','Agence mobile']),
  ('A04','Formation personnel accueil','Pré-ouverture','haute','2026-09-30','2026-08-01',ARRAY['RH','Cabinet formation']),
  ('A05','CRM HubSpot + automatisations','Pré-ouverture','haute','2026-08-31','2026-05-15',ARRAY['CRM Manager','DSI']),
  ('A06','Système parking ANPR + IoT','Pré-ouverture','haute','2026-09-30','2026-07-01',ARRAY['DSI','Intégrateur parking']),
  ('A07','Activation Cosmos Club J0','Ouverture','haute','2026-10-16','2026-10-01',ARRAY['CRM','Accueil']),
  ('A08','Protocole accueil J0 Soft Opening','Ouverture','haute','2026-10-16','2026-10-01',ARRAY['Operations','Events']),
  ('A09','Lancement food court + Le Cosmos','Ouverture','haute','2026-10-16','2026-09-15',ARRAY['F&B Manager','DSI']),
  ('A10','Enquête NPS complète M+1','Post-ouverture','moyenne','2026-11-30','2026-11-01',ARRAY['Marketing','CRM']),
  ('A11','Optimisation signalétique & flux M+2','Post-ouverture','moyenne','2026-12-31','2026-12-01',ARRAY['Operations','DSI']),
  ('A12','Programme Cosmos Vivant mensuel','Post-ouverture','moyenne','2026-12-31','2026-11-01',ARRAY['Events Manager']),
  ('A13','Bilan parcours client An 1','Croisière','haute','2027-10-16','2027-09-01',ARRAY['Direction','Marketing','CRM']);
