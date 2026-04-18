-- F-013 : table de rate limiting persistant pour les Edge Functions publiques.
-- Remplace la Map JS in-memory de signage-feedback-mobile (perdue au cold start Deno).

CREATE TABLE IF NOT EXISTS request_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_key text NOT NULL,        -- IP, hash IP, ou token client
  endpoint   text NOT NULL,        -- nom de l'Edge Function
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_log_lookup
  ON request_log (client_key, endpoint, created_at DESC);

-- Purge automatique : supprime les entrees > 1 heure.
-- A scheduler via pg_cron si disponible, sinon depuis l'app.
COMMENT ON TABLE request_log IS
  'Rate limiting Edge Functions. Purge entrees > 1h via cron ou job applicatif.';

-- RLS : seul le service role peut ecrire/lire (Edge Functions uniquement).
ALTER TABLE request_log ENABLE ROW LEVEL SECURITY;
-- Aucune policy => pas d'acces via PostgREST anonyme/authentifie.
