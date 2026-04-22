# Politique de rétention des données — Atlas Mall Suite

**Version 1.0 — 2026-04-22**

Objectif : documenter la durée de conservation de chaque catégorie de données,
les mécanismes automatiques de purge, et les exceptions (obligations légales).

---

## Tableau de rétention

| # | Catégorie | Localisation technique | Durée active | Durée archivage | Purge finale | Mécanisme |
|---|---|---|---|---|---|---|
| 1 | **Compte utilisateur** | Supabase `auth.users` + `user_profiles` | Durée du contrat | +3 ans | 3 ans après fin contrat | Manuel + alerte DPO |
| 2 | **Données d'organisation** | Supabase `organizations` | Durée du contrat | +10 ans (comptable) | 10 ans | Manuel |
| 3 | **Plans importés (ParsedPlan)** | IndexedDB client + Supabase `parsed_plans` | Durée du contrat | 30 j post-fin | 60 j post-fin | Cron `cleanup_expired_plans()` |
| 4 | **Versions de plans** | IndexedDB + `plan_versions` | Durée du contrat | - | 60 j post-fin | Cron |
| 5 | **Annotations** | IndexedDB + `annotations` | Durée du contrat | - | 60 j post-fin | Cron |
| 6 | **Rapports partagés (html)** | IndexedDB + `report_shares` | **3 ans** | - | 3 ans | Cron mensuel |
| 7 | **Événements de rapport identifiés** | `share_events` | **90 jours** | - | Anonymisation via `anonymize_old_share_events()` | Cron quotidien |
| 8 | **Événements anonymisés** | `share_events` | - | 5 ans | 5 ans | Cron mensuel |
| 9 | **Logs de connexion** | Supabase logs | 12 mois | - | 12 mois | Supabase auto |
| 10 | **Logs applicatifs (Sentry)** | Sentry | 90 jours | - | 90 jours | Sentry retention plan |
| 11 | **Logs de sécurité** | SIEM centralisé | 12 mois | +5 ans (incidents) | Variable | SIEM |
| 12 | **Sauvegardes BD** | Supabase PITR | 7 jours glissants | - | 7 jours | Supabase auto |
| 13 | **Exports clients** | Stockage chiffré | 90 jours | - | 90 jours | Cron |
| 14 | **Données IA PROPH3T (prompts)** | Aucun stockage serveur | 0 (non stocké) | - | - | - |
| 15 | **Mémoire projet Proph3t** | `proph3t_memory` | Durée du contrat | +1 an | 1 an post-fin | Cron |

---

## Bases légales

- **Exécution du contrat** : catégories 1-8, 15
- **Obligations légales comptables** : catégorie 2 (10 ans OHADA)
- **Intérêt légitime sécurité** : catégories 9-11
- **Consentement explicite** : synchro cloud événements IA → révocable via bannière

---

## Crons automatiques

### Quotidien (02:00 UTC)

```sql
-- Anonymiser les share_events > 90 jours
select public.anonymize_old_share_events();

-- Purger les share_events anonymisés > 5 ans
delete from public.share_events
 where at < now() - interval '5 years'
   and (meta->>'anonymized') = 'true';
```

### Mensuel (1er du mois, 03:00 UTC)

```sql
-- Purger les rapports > 3 ans
delete from public.report_shares
 where created_at < now() - interval '3 years';
-- CASCADE supprime les share_events associés

-- Purger les plan_versions dont le projet est supprimé depuis > 60j
delete from public.plan_versions
 where projet_id not in (select id from public.projects)
   and created_at < now() - interval '60 days';
```

### Sur demande utilisateur (Droit à l'oubli)

Procédure : endpoint `/api/gdpr/erase` (à implémenter) qui :
1. Anonymise le profil utilisateur (remplace email par `deleted-<uuid>@atlas.local`)
2. Purge ses plans / versions / annotations non partagés
3. Conserve les logs de sécurité anonymisés (obligation légale)
4. Envoie confirmation email avant purge définitive (30 j)
5. Log de la suppression dans `gdpr_audit_log`

---

## Configuration Supabase (à exécuter)

```sql
-- Activer pg_cron pour planifier les jobs
create extension if not exists pg_cron;

-- Job quotidien d'anonymisation
select cron.schedule(
  'anonymize-share-events',
  '0 2 * * *',
  $$ select public.anonymize_old_share_events(); $$
);

-- Job mensuel de purge
select cron.schedule(
  'monthly-retention-cleanup',
  '0 3 1 * *',
  $$
    delete from public.report_shares where created_at < now() - interval '3 years';
    delete from public.share_events where at < now() - interval '5 years' and (meta->>'anonymized') = 'true';
  $$
);
```

---

## Procédure d'audit

Tous les 6 mois, le DPO :
1. Vérifie que les crons s'exécutent (logs `cron.job_run_details`)
2. Échantillonne 10 enregistrements de chaque table pour contrôler l'anonymisation
3. Valide la cohérence des exports de données
4. Met à jour le registre des traitements RGPD
5. Publie un rapport interne à la direction

---

## Responsabilités

| Rôle | Responsabilité |
|---|---|
| **DPO** | Mise à jour politique, audits, réponse aux demandes utilisateur |
| **CTO** | Exécution des crons, monitoring purges |
| **Support** | Traitement des demandes d'effacement utilisateur (SLA 30 j) |
| **Direction** | Validation politique, budget conformité |

---

*Document validé par <DPO NAME, DATE>*
