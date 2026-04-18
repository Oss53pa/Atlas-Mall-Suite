# Cahier de recette PROPH3T — TEST-01 à TEST-07

Référence : Cahier des charges PROPH3T v1.0 §8 (scénarios de recette).

Chaque test se conclut par **PASS** / **FAIL** + commentaires opérateur.

---

## TEST-01 — Import plan Cosmos Angré 15 000 m²

**Objectif** : valider Atlas Studio Phase 0 sur un plan réel.

**Critère de succès CDC §8** : classification 31 types, 0 incohérence non détectée.

**Procédure** :
1. Démarrer l'app : `npm run dev`
2. Naviguer vers `/projects/cosmos-angre`
3. Vol.3 → onglet « Plans importés »
4. Importer le DXF Cosmos Angré (RDC, 15 000 m²)
5. Attendre fin de parsing (max 60 s)
6. Vérifier dans Vol.3 → onglet « Plan interactif » :
   - Tous les espaces sont visibles
   - Cliquer « Corriger labels » → liste des spaces
   - Vérifier que la majorité ont déjà un type pré-rempli (≥ 70 %)
7. Lancer `proph3t.analyze(parsedPlan)` (depuis console DevTools) :
   ```js
   import('/src/modules/cosmos-angre/proph3t-core/api.ts')
     .then(m => m.proph3t.analyze(window.__parsedPlan))
     .then(r => { console.log(r.topology); window.__r = r })
   ```
8. Vérifier `r.topology.issues` :
   - Toutes les incohérences réelles sont remontées (visualiser sur le plan)
   - Score ≥ 60/100 (acceptable — un plan réel a toujours des défauts)

**Critères d'acceptation** :
- [ ] Import réussit sans crash
- [ ] Classification ≥ 70 % automatique
- [ ] Audit topologie liste ≥ 90 % des incohérences évidentes (zones non fermées, isolated)
- [ ] Aucun faux-positif majeur

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-02 — Orchestration complète 4 volumes

**Objectif** : valider PROPH3T-ORCH bout-en-bout.

**Critère CDC §8** : exécution sans intervention, < 20 min.

**Procédure** :
1. Plan Cosmos Angré importé (TEST-01 OK)
2. Console DevTools :
   ```js
   import('/src/modules/cosmos-angre/proph3t-core/api.ts').then(({ proph3t }) => {
     const t0 = Date.now()
     proph3t.orchestrate({
       projetId: 'cosmos-angre-test',
       parsedPlan: window.__parsedPlan,
       onProgress: (e) => console.log(`[${e.volume}] ${e.status} ${e.pct}%`),
     }).then(trace => {
       console.log('DURÉE TOTALE :', (Date.now() - t0) / 1000, 's')
       console.log('STATUS :', trace.status)
       console.log('DÉCISIONS :', trace.stats?.decisionsCount)
       window.__trace = trace
     })
   })
   ```
3. Vérifier que les 4 volumes s'enchaînent :
   - vol1-commercial
   - vol2-securitaire
   - vol3-parcours
   - vol4-wayfinder
4. Vérifier `trace.stats.totalDurationMs < 1_200_000` (20 min)
5. Vérifier `trace.steps.every(s => s.status === 'success')`
6. Vérifier que la trace est persistée :
   - Onglet Network : POST vers `/rest/v1/proph3t_execution_traces`
   - OU localStorage `atlas-proph3t-traces` contient l'entrée

**Critères d'acceptation** :
- [ ] 4 volumes exécutés bout-en-bout
- [ ] Durée < 20 min (cible CDC PERF-02)
- [ ] Aucune erreur dans les `step.error`
- [ ] Trace auditable (≥ 10 décisions enregistrées)
- [ ] Reprise depuis checkpoint testée : couper le réseau au milieu, relancer avec `resumeFromTraceId`

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-03 — Mode offline total

**Objectif** : valider l'indépendance IA niveau 1 (Ollama local) + mode offline complet.

**Critère CDC §8** : fonctionnement identique mode en ligne.

**Procédure** :
1. Définir `VITE_USE_MOCK=true` dans `.env.local`
2. Couper le wifi / activer mode avion
3. Démarrer l'app : `npm run dev`
4. Importer un plan DXF
5. Lancer Vol.3 → « Tracer flux & panneaux »
6. Lancer `proph3t.orchestrate()`
7. Vérifier :
   - Aucune requête réseau Supabase (DevTools → Network)
   - Les fonctionnalités principales marchent (analyze, predict, optimize)
   - `proph3tQuery()` utilise Ollama si dispo, sinon retourne fallback offline texte

**Critères d'acceptation** :
- [ ] Aucune requête HTTP non-localhost dans Network
- [ ] Pas de crash UI
- [ ] Patterns mémoire stockés en localStorage
- [ ] Feedbacks bufferisés en local pour sync ultérieure

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-04 — Audit conformité ERP par bureau de contrôle externe

**Objectif** : valider que le rapport PROPH3T est accepté par un bureau de contrôle indépendant (APAVE, Bureau Veritas, Socotec).

**Procédure** :
1. Vol.3 → Tracer flux + Vol.2 → exécuter `auditErpCompliance` sur Cosmos Angré
2. Exporter le rapport PDF signalétique 8 pages
3. Exporter rapport ERP global (LOT C `nonConformityReportEngine`)
4. Faire valider par bureau de contrôle externe
5. Recueillir leur retour : non-conformités acceptées vs contestées

**Critères d'acceptation** :
- [ ] Rapport reçu par bureau de contrôle sans demande de re-mise en forme
- [ ] ≥ 90 % des non-conformités identifiées par PROPH3T sont confirmées
- [ ] Aucune non-conformité critique ratée (rappel = 100 % sur classes critiques)

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-05 — Injection 50 feedbacks QR terrain

**Objectif** : valider le pipeline d'apprentissage LRN-03.

**Procédure** :
1. Générer 50 feedbacks variés via la page mobile `/feedback?p=...&r=panel-N`
   - 20 × "OK"
   - 15 × "absent"
   - 10 × "illisible"
   - 5 × "mal-oriente"
2. Lancer le pipeline depuis console :
   ```js
   import('/src/modules/cosmos-angre/proph3t-core/feedbackLearningPipeline.ts')
     .then(m => m.processFeedbackLearning('cosmos-angre-test'))
     .then(r => { console.log(r); window.__lr = r })
   ```
3. Vérifier `r.consumedCount === 50`
4. Vérifier `r.patternsCreated > 0`
5. Vérifier `r.rulesAdjustments` listent au moins :
   - 1 exclusion (panneaux signalés "absent" ≥ 3 fois)
   - 1 portée réduite (panneaux signalés "illisible")
6. Re-lancer `proph3t.analyze()` puis `proph3t.optimize({kind:'signage-placement', ...})`
7. Vérifier que les emplacements exclus n'apparaissent plus

**Critères d'acceptation** :
- [ ] 50 feedbacks consommés
- [ ] Patterns enregistrés dans signage_patterns avec confidence_score cohérent
- [ ] Re-génération signalétique respecte les exclusions
- [ ] Logs visibles dans console

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-06 — Back-test prédiction CA/m² post-ouverture

**Objectif** : valider PERF-07 (MAPE < 15 % sur données réelles).

**Procédure** :
1. Récupérer les CA/m² réels post-ouverture Cosmos Angré (octobre 2026 → ouverture +6 mois)
2. Pour chaque local commercial, comparer :
   - CA prédit par PROPH3T-COM (revenueForestEngine) au moment de la conception
   - CA réel observé
3. Lancer le back-test :
   ```js
   import('/src/modules/cosmos-angre/proph3t-core/modelRegistry.ts').then(m => {
     const r = m.backtestRegression({
       kind: 'revenue-forest',
       versionId: m.getActiveModel('revenue-forest').id,
       testSet: realData,
       predict: (x) => predictRevenue(forest, x).revenuePerSqmFcfa,
     })
     console.log('MAPE :', (r.mape * 100).toFixed(2), '%')
   })
   ```
4. MAPE doit être < 15 %

**Critères d'acceptation** :
- [ ] Back-test exécuté sur ≥ 80 locaux occupés
- [ ] MAPE < 15 %
- [ ] R² > 0.7
- [ ] Métriques enregistrées dans modelRegistry → consultables via UI

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## TEST-07 — Charge 10 projets simultanés multi-tenant

**Objectif** : valider l'isolation RLS Supabase + performance multi-projet.

**Procédure** :
1. Créer 10 projets dans Supabase (`projets` + `project_members` distincts)
2. Pour chaque projet, créer un utilisateur distinct
3. Lancer en parallèle 10 sessions (10 onglets ou Selenium) :
   - Chaque session importe un plan
   - Chaque session lance `orchestrate()`
4. Vérifier que :
   - Aucun projet ne voit les données d'un autre (`SELECT *` revient avec ses lignes uniquement)
   - Les patterns mémoire sont partagés entre projets (CDC §3.6 LRN-01) mais pas les feedbacks
   - Performance reste nominale (cible : durée individuelle < 25 % de dégradation vs solo)

**Critères d'acceptation** :
- [ ] 10 sessions terminent sans cross-contamination
- [ ] Tests RLS Supabase : `SELECT * FROM signage_feedback` n'expose que les feedbacks du projet courant
- [ ] Patterns inter-projets fonctionnent (suggestion mémoire d'un projet vers l'autre)
- [ ] Latence moyenne < 1.5x la latence solo

**Résultat** : ☐ PASS  ☐ FAIL  
**Commentaires** : _______________________________

---

## SYNTHÈSE

| Test | Domaine | Status | Date | Opérateur |
|---|---|---|---|---|
| TEST-01 | Import plan | ☐ | / / | |
| TEST-02 | Orchestration 4 vol. | ☐ | / / | |
| TEST-03 | Mode offline | ☐ | / / | |
| TEST-04 | Audit ERP externe | ☐ | / / | |
| TEST-05 | Pipeline feedbacks | ☐ | / / | |
| TEST-06 | Back-test CA/m² | ☐ | / / | |
| TEST-07 | Charge multi-tenant | ☐ | / / | |

**Décision finale** : ☐ Recette acceptée  ☐ Réserves mineures  ☐ Refus  
**Signature opérateur recette** : _______________________________  
**Date** : _______________________________
