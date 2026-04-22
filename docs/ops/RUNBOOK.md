# Runbook incidents — Atlas Mall Suite

**Version 1.0 — 2026-04-22**

Objectif : procédures opérationnelles pour détecter, qualifier, résoudre et
communiquer sur les incidents de production.

---

## 1. Classification des incidents

| Niveau | Exemple | SLA réponse | SLA résolution | Canal |
|---|---|---|---|---|
| **P0 Critique** | Service indisponible, fuite de données, violation sécurité | 15 min | 4 h | Slack #alerts + SMS astreinte |
| **P1 Majeur** | Fonctionnalité majeure KO (ex: 3D down), > 20% utilisateurs touchés | 1 h | 24 h | Slack #alerts + email |
| **P2 Mineur** | Dégradation UI, bug non-bloquant, < 20% users | 1 jour ouvré | 5 jours ouvrés | Slack #bugs |
| **P3 Cosmétique** | Typo, UI minor | 5 jours | Prochaine release | Issue GitHub |

---

## 2. Contacts et astreinte

| Rôle | Titulaire | Téléphone | Email |
|---|---|---|---|
| On-call lead | <NOM> | <TEL> | <EMAIL> |
| CTO | <NOM> | <TEL> | <EMAIL> |
| RSSI | <NOM> | <TEL> | <EMAIL> |
| DPO | <NOM> | <TEL> | <EMAIL> |
| Support N1 | <EQUIPE> | - | support@atlas.ci |
| Direction | <NOM> | <TEL> | - |

**Rotation astreinte** : Pager Duty / OpsGenie configuré sur les 2 ingénieurs seniors, rotation hebdomadaire.

---

## 3. Détection

### Alertes automatiques
| Source | Seuil | Action |
|---|---|---|
| Sentry | > 50 erreurs/5min, erreur new | Email on-call + Slack |
| Supabase | 5xx > 1% sur 5min | Email on-call |
| Uptime monitor (UptimeRobot / Better Stack) | HTTP 5xx > 3 × 60s | SMS + Slack |
| npm audit critique | Score > 9.0 | Issue auto GitHub |
| CI échec main | Tout | Slack #builds |

### Canaux utilisateur
- Email : support@atlas.ci → SLA 1 h ouvré
- Boutons "Demander des corrections" dans rapports HTML → webhook
- Formulaire in-app (HelpFloatingBall)

---

## 4. Procédure P0 — Service indisponible

### Check-list première heure

- [ ] **T+0** : Accuser réception de l'alerte (Slack : `@here incident en cours`)
- [ ] **T+5 min** : Ouvrir un canal dédié `#incident-YYYY-MM-DD-XX`
- [ ] **T+10 min** : Vérifier Supabase status page
- [ ] **T+10 min** : Vérifier Sentry : y a-t-il une vague d'erreurs ?
- [ ] **T+15 min** : Publier un statut initial sur la page de statut publique
- [ ] **T+30 min** : Isoler la cause probable (déploiement récent, infra, dépendance externe)
- [ ] **T+60 min** : Appliquer correctif OU rollback

### Commandes de diagnostic

```bash
# État des déploiements Supabase
supabase projects list
supabase db remote commit --schema public

# Dernière migration appliquée
supabase db diff --linked

# Logs Edge Functions (dernière heure)
supabase functions logs report-webhook --tail 100
supabase functions logs proph3t-claude --tail 100

# Erreurs Sentry (via CLI)
sentry-cli issues list --project atlas-mall-suite --query "is:unresolved age:-1h"
```

### Rollback application

```bash
# Rollback vercel/netlify
vercel rollback <previous-deployment-url>

# Ou relancer avec le précédent tag git
git checkout <tag-precedent>
npm ci && npm run build
# redéploiement via CI/CD
```

### Rollback migration DB

```bash
# Rappel : toute nouvelle migration doit être reversible
# Si pas de script down, restore depuis PITR
supabase db reset --linked
# puis restore jusqu'au timestamp pré-incident
```

---

## 5. Procédure — Violation de données

**⚠️ Obligations légales** :
- Notifier la CNIL/ANADI sous **72 heures**
- Notifier les personnes concernées si risque élevé
- Documenter dans le registre des violations

### Actions immédiates (T+0 à T+1h)

1. **Isoler** le système compromis
   - Révoquer les tokens compromis (Supabase : regenerate anon key)
   - Couper l'accès réseau si nécessaire
2. **Préserver les preuves** (logs, dumps)
3. **Informer le DPO et le RSSI** — ce sont eux qui coordonnent
4. **Ne pas communiquer publiquement** avant validation

### Actions 24-72h

1. Évaluer l'étendue : nombre de personnes, catégories de données, sensibilité
2. Rédiger la notification CNIL/ANADI (template `docs/ops/notification-violation.md`)
3. Préparer le message aux personnes concernées
4. Post-mortem technique sous 7 jours

---

## 6. Procédure — IA défaillante

### Symptômes
- PROPH3T génère des réponses incohérentes
- Hallucinations (chiffres inventés)
- Claude API 5xx/529 en cascade

### Actions

1. **Vérifier le statut Anthropic** : https://status.anthropic.com
2. **Désactiver Claude** temporairement : toggle env `VITE_CLAUDE_DISABLED=true`
3. **L'app doit continuer** grâce au fallback Ollama local (vérifier)
4. **Si Ollama KO aussi** : l'app fonctionne en mode algorithmique pur
5. **Communiquer** aux utilisateurs : bannière d'info non-bloquante

### Détection d'hallucination

- Logs des prompts+réponses sur 24h
- Test de recoupement : les chiffres cités correspondent-ils aux données ?
- Si oui → proposer correction
- Si non → incident P1, réviser le prompt template

---

## 7. Procédure — Perte de données utilisateur

### Investigation

1. Identifier : quelles données, quel user, quand
2. Vérifier les backups Supabase (PITR 7 jours glissants)
3. Vérifier IndexedDB local de l'utilisateur (si accessible par TeamViewer avec consentement)
4. Vérifier `plan_versions` : la version perdue y est-elle ?

### Restauration

```sql
-- Exemple : restaurer une version de plan supprimée par erreur
insert into public.plan_versions
select * from backup.plan_versions
 where id = '<id-perdu>'
   and deleted_at > now() - interval '24 hours';
```

---

## 8. Post-mortem

**Obligatoire** pour tout incident P0/P1 sous **7 jours**.

### Template

```markdown
# Post-mortem incident <ID>

## Résumé
- Date/heure : <début> → <fin>
- Durée : X min
- Impact : Y utilisateurs, Z fonctionnalités

## Timeline
- HH:MM — Détection (par qui/quoi)
- HH:MM — Ack on-call
- HH:MM — Diagnostic
- HH:MM — Correctif appliqué
- HH:MM — Validation + annonce résolution

## Cause racine
(pas "erreur humaine" — aller au vrai pourquoi)

## Ce qui a bien fonctionné
- ...

## Ce qui n'a pas fonctionné
- ...

## Actions correctives
| # | Action | Responsable | Deadline |
|---|---|---|---|
| 1 | ... | @user | 2026-XX-XX |

## Communication
- Post-mortem interne : <date>
- Post-mortem public (si client impact) : <date>
```

Stocker dans `docs/ops/post-mortems/YYYY-MM-DD-short-title.md`.

---

## 9. Escalade

| Condition | Vers | Via |
|---|---|---|
| P0 non résolu 1h | CTO | Téléphone |
| P0 > 4h | Direction | Téléphone + email |
| Violation données | DPO + RSSI + Direction | Simultané |
| Demande presse | Direction uniquement | - |

---

## 10. Communication externe

### Page de statut (à mettre en place)
- Provider : Instatus / StatusPage.io / Atlassian Statuspage
- URL : https://status.atlas-mall.app
- Composants monitorés : Web app, API, Edge Functions, IA Proph3t

### Communication client

| Phase | Contenu | Canal |
|---|---|---|
| Détection | "Incident en cours sur X" | Page de statut |
| Investigation | "Cause identifiée, correctif en cours" | Page + Slack |
| Résolution | "Service rétabli" | Page + Slack + email grands comptes |
| Post-incident | Post-mortem public si impact significatif | Email ciblé |

---

## 11. Revue mensuelle

Le CTO organise une revue mensuelle :
- Liste des incidents du mois
- Actions correctives en retard
- Évolution des métriques (MTTD, MTTR, nombre d'incidents)
- Ajustements du runbook

---

*Runbook rédigé 2026-04-22 — à personnaliser avec les vraies équipes et outils.*
