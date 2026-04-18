-- F-016 : durcissement RLS — activation explicite sur les 22 tables identifiees
-- sans `ENABLE ROW LEVEL SECURITY` dans les migrations existantes.
--
-- Strategie : RLS "deny all" par defaut. Les tables reellement exposees devront
-- se voir ajouter des policies explicites dans une migration ulterieure apres
-- arbitrage metier (lecture seule, ecriture membres, admin only...).
--
-- Depend de la fonction `is_project_member` definie dans 005_rls_multitenant.sql.

-- ─── Tables avec colonne projet_id / project_id (candidates RLS multi-tenant) ──

ALTER TABLE IF EXISTS capex_items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cockpit_zone_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commercial_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS export_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedbacks_visiteurs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS frequentation_predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incident_rex               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incidents_workflow         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nav_edges                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS nav_nodes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS occupancy_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plan_action_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS plan_action_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proph3t_commercial_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proph3t_rule_adjustments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS simulation_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS space_tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenants                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatif_simulations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wisefm_links               ENABLE ROW LEVEL SECURITY;

-- ─── Tables sans lien projet direct (policy simple : auth.uid() = user_id ou admin) ──

ALTER TABLE IF EXISTS project_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions      ENABLE ROW LEVEL SECURITY;

-- ─── Policies minimales (membres projet uniquement, lecture + ecriture) ──
-- A raffiner par table selon les besoins metier.

DO $$
DECLARE
  t text;
  tables_with_projet_id text[] := ARRAY[
    'capex_items','cockpit_zone_links','commercial_alerts','export_logs',
    'feedbacks_visiteurs','frequentation_predictions','incident_rex',
    'incidents_workflow','nav_edges','nav_nodes','occupancy_snapshots',
    'plan_action_comments','plan_action_tasks','proph3t_commercial_log',
    'proph3t_rule_adjustments','simulation_results','space_tenants',
    'tenants','whatif_simulations','wisefm_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_projet_id LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'projet_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS member_select_%I ON %I', t, t);
      EXECUTE format('CREATE POLICY member_select_%I ON %I FOR SELECT USING (is_project_member(projet_id))', t, t);
      EXECUTE format('DROP POLICY IF EXISTS member_write_%I ON %I', t, t);
      EXECUTE format('CREATE POLICY member_write_%I ON %I FOR ALL USING (can_write_project(projet_id)) WITH CHECK (can_write_project(projet_id))', t, t);
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'project_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS member_select_%I ON %I', t, t);
      EXECUTE format('CREATE POLICY member_select_%I ON %I FOR SELECT USING (is_project_member(project_id))', t, t);
      EXECUTE format('DROP POLICY IF EXISTS member_write_%I ON %I', t, t);
      EXECUTE format('CREATE POLICY member_write_%I ON %I FOR ALL USING (can_write_project(project_id)) WITH CHECK (can_write_project(project_id))', t, t);
    END IF;
  END LOOP;
END
$$;

-- project_templates : lecture publique (catalogue templates), ecriture admin uniquement.
DROP POLICY IF EXISTS public_select_templates ON project_templates;
CREATE POLICY public_select_templates ON project_templates FOR SELECT USING (true);

-- user_sessions : un utilisateur ne voit que ses propres sessions.
DROP POLICY IF EXISTS own_sessions_select ON user_sessions;
CREATE POLICY own_sessions_select ON user_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sessions' AND column_name = 'user_id')
    AND auth.uid()::text = (SELECT user_id::text FROM user_sessions us WHERE us.id = user_sessions.id)
  );
