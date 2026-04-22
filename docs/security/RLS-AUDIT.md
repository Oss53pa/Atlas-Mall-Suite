# Audit RLS — Atlas Mall Suite

**Date** : 2026-04-22 · **Finding de référence** : `docs/AUDIT.md` §4.3 — *RLS non garantie sur ~24 tables*

## Méthodologie
1. Scan du code : extraction de toutes les tables référencées via `.from('...')` et `/rest/v1/...`
2. Classification par pattern d'usage (métier / télémétrie / audit / référence)
3. Définition d'une policy par opération CRUD basée sur le rôle `project_member`

## Inventaire : 30 tables identifiées

| # | Table | Catégorie | Pattern | Statut avant | Statut après |
|---|---|---|---|---|---|
| 1 | `organizations` | Tenant | Multi-user scoped par org | ❓ | ✅ RLS durcie |
| 2 | `org_members` | Tenant | Self-read + admin-manage | ❓ | ✅ |
| 3 | `project_members` | Tenant | Self-read + owner-manage | ❓ | ✅ |
| 4 | `invite_tokens` | Auth flow | Token-based access | ❓ | ✅ (contrôle applicatif) |
| 5 | `projets` | Core | project_id = id | ❓ | ✅ |
| 6 | `floors` | Métier | projet_id scoped | ❓ | ✅ |
| 7 | `zones` | Métier | projet_id scoped | ❓ | ✅ |
| 8 | `cameras` | Métier Vol.2 | projet_id scoped | ❓ | ✅ |
| 9 | `doors` | Métier Vol.2 | projet_id scoped | ❓ | ✅ |
| 10 | `pois` | Métier Vol.3 | projet_id scoped | ❓ | ✅ |
| 11 | `signage_items` | Métier Vol.3 | projet_id scoped | ❓ | ✅ |
| 12 | `transitions` | Métier | projet_id scoped | ❓ | ✅ |
| 13 | `cosmos_lots` | Métier Vol.1 | projet_id scoped | ❓ | ✅ |
| 14 | `plan_actions` | Métier Vol.3 | projet_id scoped | ❓ | ✅ |
| 15 | `alerts` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 16 | `incidents` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 17 | `export_logs` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 18 | `kiosk_telemetry_events` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 19 | `wayfinder_usage_logs` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 20 | `vision_recognitions` | Télémétrie | projet_id scoped | ❓ | ✅ |
| 21 | `audit_log` | Audit | Immutable owner-only read | ❓ | ✅ |
| 22 | `audit_logs` | Audit (doublon) | Immutable owner-only read | ❓ | ✅ |
| 23 | `request_log` | Audit requêtes | Anon insert + auth read | ❓ | ✅ |
| 24 | `proph3t_memory` | IA | projet_id scoped | ❓ | ✅ |
| 25 | `signage_feedback` | UGC public | Anon insert + viewer read | ❓ | ✅ |
| 26 | `signage_patterns` | Base connaissances | Lecture publique | ❓ | ✅ |
| 27 | `designer_projects` | Wayfinder designer | projet_id scoped | ❓ | ✅ |
| 28 | `plan_versions` | Versioning | projet_id scoped | ✅ (migration `b`) | ✅ |
| 29 | `report_shares` | Rapports | projet_id scoped | ✅ (migration `b`) | ✅ |
| 30 | `share_events` | Tracking rapports | Via report_shares | ✅ (migration `b`) | ✅ |

## Règles par rôle

Hiérarchie : `owner` > `editor` > `security_manager` = `commercial_manager` > `viewer`

| Opération | Tables métier | Tables télémétrie | Tables audit |
|---|---|---|---|
| SELECT | viewer | viewer | owner uniquement |
| INSERT | editor | editor | auth ou anon (rate limité) |
| UPDATE | editor | interdit | interdit |
| DELETE | editor | owner | interdit |

## Cas particuliers

### `signage_feedback` — UGC anonyme
Les visiteurs non-authentifiés peuvent déposer du feedback depuis les bornes/mobile.
- **INSERT** : autorisé pour `anon`
- **Protection** : rate limiting applicatif obligatoire dans l'Edge Function qui relaye
- **SELECT** : viewer du projet

### `audit_log` / `audit_logs` — Immutabilité
- Aucune policy UPDATE ni DELETE
- Seul `service_role` (Edge Functions) peut supprimer via bypass RLS

### `invite_tokens` — Access via token
- Contrôle d'accès applicatif : le token lui-même fait office de secret
- Policy SELECT = `true` (le code vérifie le token avant exposition)
- ⚠️ **Recommandation** : ajouter une expiration courte (< 7 jours) + rotation

### Base de connaissances `signage_patterns`
- Lecture publique (ressource partagée entre tous les projets)
- Écriture `authenticated` uniquement
- Suppression impossible sauf `service_role` (conservation des patterns historiques)

## Helpers SQL fournis

```sql
-- Vérifie appartenance projet avec hiérarchie de rôles
public.is_project_member(projet_id, min_role)  -- → boolean

-- Vérifie appartenance organisation
public.is_org_member(org_id, min_role)         -- → boolean

-- Droit à l'oubli RGPD
public.gdpr_erase_user(user_id)                -- → jsonb report

-- Anonymisation auto events > 90j
public.anonymize_old_share_events()            -- → int affected

-- Vue d'audit en temps réel
select * from public.rls_audit_status;
```

## Scripts à planifier (pg_cron)

```sql
-- Quotidien 02:00 UTC : anonymisation événements
select cron.schedule('anonymize-share-events', '0 2 * * *',
  $$ select public.anonymize_old_share_events(); $$);

-- Mensuel 1er 03:00 UTC : purge rétention
select cron.schedule('monthly-retention-cleanup', '0 3 1 * *', $$
  delete from public.report_shares where created_at < now() - interval '3 years';
  delete from public.share_events where at < now() - interval '5 years' and (meta->>'anonymized') = 'true';
  delete from public.request_log where created_at < now() - interval '12 months';
$$);

-- Audit RLS hebdomadaire : vérifier aucune table sans RLS
select cron.schedule('weekly-rls-audit', '0 9 * * 1', $$
  insert into public.audit_log (event_type, description, created_at)
  select 'rls_audit',
         'Tables sans RLS: ' || string_agg(tablename, ', '),
         now()
    from public.rls_audit_status
   where rls_enabled = false and tablename not like 'pg_%';
$$);
```

## Tests post-déploiement

À exécuter après `supabase db push` :

```sql
-- 1. Toutes les tables métier ont RLS activée
select tablename, rls_enabled
  from public.rls_audit_status
 where rls_enabled = false
   and tablename not in ('rls_audit_status', 'report_shares_public');
-- → doit retourner 0 ligne

-- 2. Chaque table a au moins une policy
select tablename, policy_count
  from public.rls_audit_status
 where policy_count = 0
   and rls_enabled = true;
-- → doit retourner 0 ligne

-- 3. Test d'isolation : user A ne voit pas le projet de user B
-- (à tester avec 2 comptes de test)
```

## Limites de l'audit (à traiter avant go-live)

1. ⚠️ **Je n'ai pas l'accès Supabase** pour exécuter `\d+ tablename` et vérifier
   le schéma exact de chaque table. La migration suppose :
   - Colonne `projet_id` (type text ou uuid) sur toutes les tables métier
   - Colonne `user_id` sur `project_members` et `org_members`
   - Colonne `org_id` sur `org_members`

2. Si une table a un nom de colonne différent (ex: `project_id` au lieu de `projet_id`),
   la policy échouera au `create policy` → adapter la migration avant exécution.

3. **Tester avec 2 comptes utilisateurs** après déploiement pour valider
   l'isolation multi-tenant.

4. Considérer ajouter un **trigger de validation** qui empêche l'insertion
   de lignes sans `projet_id` (défense en profondeur).

## Post-déploiement

- [ ] Appliquer la migration `20260422c_audit_and_harden_rls_all_tables.sql`
- [ ] Vérifier la vue `rls_audit_status` : aucune table métier sans RLS
- [ ] Tester avec un compte admin + un compte viewer d'un autre projet
- [ ] Planifier les crons (anonymisation + purge + audit)
- [ ] Mettre à jour `docs/AUDIT.md` (findings S-002, S-003 → résolus)

---

*Audit produit 2026-04-22 — validation DBA obligatoire avant `supabase db push` en production.*
