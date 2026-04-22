# Checklist Go-Live — Atlas Mall Suite

**Version 1.0** · Dernière mise à jour : 2026-04-22
**Release cible** : v1.0.0

---

## J-30 — Infrastructure

- [ ] Compte Supabase production créé
- [ ] DNS pointant vers l'hébergeur frontend (<HÉBERGEUR>)
- [ ] Certificat SSL/TLS installé (Let's Encrypt auto-renew)
- [ ] CDN activé (CloudFlare / CloudFront / Bunny)
- [ ] Environnements distincts : `dev`, `staging`, `production`
- [ ] Secrets stockés dans GitHub Secrets (pas dans le repo)
- [ ] Sauvegardes PITR Supabase activées (7 jours)

---

## J-21 — Sécurité (validé par le RSSI)

- [x] B1 · IDOR Edge Function `proph3t-claude` corrigé (mode + config + membership)
- [x] B2 · Migration `20260422b_harden_rls_policies.sql` appliquée
- [x] B6 · Rate limiting `_shared/rateLimit.ts` branché sur les 2 Edge Functions
- [ ] B3 · Audit RLS des 24 tables historiques complet
- [ ] B4 · DPA signés : Anthropic, Supabase, Sentry, hébergeur frontend
- [ ] B5 · MFA/2FA activé pour comptes admin Supabase
- [ ] Pentest externe commandé et résultats traités
- [ ] Scan SAST/DAST passé en CI
- [ ] Rotation des clés API planifiée (90 jours)

---

## J-14 — Conformité (validé par le DPO)

- [x] B9 · Templates CGU / CGV / Politique de confidentialité / Mentions légales rédigés
- [ ] B9 · Documents validés par un avocat habilité (Cameroun + CEMAC + CI)
- [x] B10 · Bannière de consentement déployée (`ConsentBanner.tsx`)
- [x] B11 · Politique de rétention documentée + crons SQL
- [ ] Registre des traitements RGPD déposé à la CNIL / ANADI
- [ ] DPA internes pour les sous-traitants
- [ ] Procédure "droit à l'oubli" documentée et opérationnelle
- [ ] Test de restauration Supabase PITR réalisé et documenté

---

## J-14 — Qualité technique

- [x] `npm run typecheck` = 0 erreur
- [x] B7 · CI/CD `.github/workflows/ci.yml` fonctionnel
- [x] B7 · Deploy Supabase `deploy-supabase.yml` fonctionnel
- [x] B8 · Sentry configuré (DSN en secret)
- [x] B14 · ValidationHub connecté aux données réelles
- [x] B16 · Tests E2E `core-journeys.spec.ts` verts
- [ ] Couverture de tests > 50 % sur `shared/`
- [ ] Règle ESLint `--max-warnings=0` activée en CI
- [ ] Campagne de réduction des 368 `any` (objectif < 100)

---

## J-7 — Performance

- [x] B17 · Code splitting étendu (AR, map-viewer, guided-tour isolés)
- [ ] Bundle initial < 500 KB gzipped (à mesurer)
- [ ] Lighthouse audit : Performance > 80, A11y > 90
- [ ] Test de charge (K6) : 100 users simultanés OK
- [ ] Test réseau 3G simulé : First Contentful Paint < 5 s
- [ ] Test AR sur 3 devices réels : iOS 15+, Android 10+, tablette

---

## J-7 — Opérationnel

- [x] B18 · Runbook incidents rédigé
- [ ] Astreinte 24/7 organisée, 2 ingénieurs au minimum
- [ ] Slack #alerts avec rotations pager
- [ ] Page de statut publique configurée (statuspage.io ou équivalent)
- [ ] Uptime monitoring externe (UptimeRobot / Better Stack)
- [ ] Alerting Sentry : seuils définis, canaux connectés
- [ ] Runbooks spécifiques : perte données, violation, IA down

---

## J-3 — Communication

- [ ] Landing page vitrine publique prête
- [ ] Page /legal/ accessible depuis footer (CGU, CGV, privacy, mentions)
- [ ] Centre d'aide / FAQ en ligne
- [ ] Tutoriel vidéo principal (5 min) : onboarding → premier plan → rapport
- [ ] Communication interne : all-hands + FAQ interne
- [ ] Communication externe : presse, réseaux sociaux, clients pilotes
- [ ] Email d'annonce préparé pour la base utilisateurs

---

## J-1 — Smoke tests finaux

- [ ] Inscription d'un nouvel utilisateur sur prod
- [ ] Import d'un DXF de test
- [ ] Édition d'un espace → snapshot automatique créé
- [ ] Génération d'un rapport HTML → ouverture dans un navigateur externe
- [ ] Clic sur "Valider" → event reçu côté Supabase
- [ ] PROPH3T : génère un commentaire (avec et sans Ollama)
- [ ] 2D → 3D → AR (sur device compatible) fonctionne
- [ ] Bannière consentement s'affiche pour un incognito
- [ ] Logs Sentry : aucune erreur critique au boot

---

## Jour J — Bascule

### Pré-bascule
- [ ] Annoncer la fenêtre de maintenance (1 h max)
- [ ] Freeze des commits main (sauf hotfix)
- [ ] Dernier snapshot BD Supabase

### Bascule (canary 10 % → 100 %)
- [ ] Déploiement frontend sur production
- [ ] Activation DNS / CDN
- [ ] 10 % du trafic pendant 1 heure
- [ ] Monitoring actif (Sentry, uptime, Supabase)
- [ ] Si aucun incident : 100 % trafic

### Post-bascule (T+1h à T+24h)
- [ ] Équipe d'astreinte active (pas de vacances)
- [ ] Contrôles périodiques toutes les heures
- [ ] Feedback client pilote sollicité activement

---

## Rollback — Si incident majeur

### Conditions de déclenchement
- Erreurs critiques > 10/min pendant 10 min
- Taux de succès login < 90 %
- Supabase 5xx > 5 % pendant 5 min
- Violation de données détectée

### Procédure (< 15 min)

1. Rollback frontend : `vercel rollback <previous-url>` (ou équivalent)
2. Si migration incompatible : `supabase db reset --linked` puis restore PITR
3. Communiquer sur la page de statut
4. Notifier les clients pilotes par email
5. Post-mortem sous 7 jours

---

## Validation formelle

| Rôle | Responsable | Signature | Date |
|---|---|---|---|
| CTO | <NOM> | ... | ... |
| RSSI | <NOM> | ... | ... |
| DPO | <NOM> | ... | ... |
| PO | <NOM> | ... | ... |
| Direction | <NOM> | ... | ... |

---

**Décision GO / NO-GO** : toutes les cases obligatoires doivent être cochées.
**Quorum** : au minimum CTO + RSSI + DPO + Direction.

*Dernière mise à jour : 2026-04-22 — après session de remédiation intégrale.*
