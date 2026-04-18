# Atlas Mall Suite — Feuille de route remédiation & go-live

> Consolidation : 16 findings audit + module Plan Importer (DXF/image) · 117 368 LoC · Cosmos Angré go-live octobre 2026.
> Référentiel d'audit : [`docs/AUDIT.md`](./AUDIT.md).

- **2 P0 bloquants · 8 P1 majeurs · 5 P2 modérés + module Plan Importer**
- **5 sprints · ~8 semaines · zéro régression toléré**

---

## 00 — Contraintes globales (lire avant tout)

### Règle absolue — préservation du code existant

- **0 modification comportementale** sur les 16 engines algorithmiques, sauf les corrections explicitement listées ci-dessous.
- **0 import croisé entre volumes** (règle actuelle à maintenir : communication via `shared/` uniquement).
- **0 `@ts-ignore` / `@ts-expect-error`** à introduire (le projet en a actuellement 0 — conserver).
- Tout nouveau fichier doit passer `tsc --noEmit` sans erreur avant commit.
- Les corrections P0 sont à traiter dans un ordre strict : **F-011 IDOR en premier, F-008 A* en second**.

### Score de départ et cible

- **Score audit actuel : 63/100** (Acceptable — P0 à corriger avant production).
- **Cible après sprints 1-3 : ≥ 78/100** (Bon — production validée).
- **Sprints 4-5 visent ≥ 85/100** (Excellence).

---

## 01 — Sprint 1 : P0 + sécurité critique (semaines 1–2)

### F-011 P0 — IDOR sur `proph3t-claude` Edge Function

**Fichier** : `src/supabase/functions/proph3t-claude/index.ts:183-211`

La fonction lit `proph3t_memory` filtré sur `parsedBody.projectId` via le service role key (bypass RLS). Aucune vérification que l'appelant a accès à ce projet. Vecteur : n'importe quelle clé Claude valide + UUID projet deviné → lecture de l'historique mémoire de n'importe quel projet.

**Correction obligatoire** :

```ts
// AVANT (vulnérable)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const memory = await supabase.from('proph3t_memory')
  .select('*').eq('project_id', parsedBody.projectId)

// APRÈS (sécurisé)
// 1. Extraire et vérifier le JWT utilisateur
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) return 401

const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: authHeader } }
})
const { data: { user }, error } = await supabaseUser.auth.getUser()
if (error || !user) return 401

// 2. Vérifier que l'utilisateur est membre du projet
const { data: membership } = await supabaseUser
  .from('project_members')
  .select('role')
  .eq('project_id', parsedBody.projectId)
  .eq('user_id', user.id)
  .single()
if (!membership) return 403

// 3. Lire la mémoire avec le contexte utilisateur (RLS s'applique)
const memory = await supabaseUser.from('proph3t_memory')
  .select('*').eq('project_id', parsedBody.projectId)
```

**Effort** : 1 h · **Test** : vérifier qu'un appel sans JWT retourne 401, qu'un JWT valide d'un autre projet retourne 403.

### F-008 P0 — A* sans bornage `maxExpansions` → freeze UI

**Fichier** : `vol4-wayfinder/engines/astarEngine.ts:184-200`

La boucle principale `while (heap.size > 0)` n'a aucune limite. Sur graphe pathologique (10k+ nœuds, cible inaccessible), l'UI thread freeze jusqu'à exhaustion mémoire.

```ts
// Ajouter dans l'interface AStarConfig
interface AStarConfig {
  maxExpansions?: number   // défaut : 50_000
  signal?: AbortSignal     // pour cancellation depuis UI
}

// Dans la boucle principale
let expansions = 0
const MAX = config.maxExpansions ?? 50_000

while (heap.size > 0) {
  if (++expansions > MAX) throw new RouteAbortedError('maxExpansions reached')
  if (config.signal?.aborted) throw new RouteAbortedError('aborted')
  // ... reste de la logique inchangée
}

export class RouteAbortedError extends Error {
  constructor(reason: string) {
    super(`A* aborted: ${reason}`)
    this.name = 'RouteAbortedError'
  }
}
```

**Effort** : 30 min · Aucun changement comportemental sur graphes normaux.

### F-012 P1 — Path traversal `signage-feedback-mobile`

**Fichier** : `src/supabase/functions/signage-feedback-mobile/index.ts:124`
`panel_ref` non sanitisé concaténé dans un filename Storage → traversal `../` possible.

```ts
// Ligne 124 — remplacer
const filename = `${body.projet_id}/${body.panel_ref}-${Date.now()}.jpg`

// Par
const safePanelRef = body.panel_ref.replace(/[^a-zA-Z0-9_-]/g, '')
if (safePanelRef.length === 0) return badRequest('panel_ref invalide')
const filename = `${body.projet_id}/${safePanelRef}-${Date.now()}.jpg`
```

**Effort** : 15 min.

### F-014 P1 — Pas d'auth utilisateur sur `proph3t-claude`

**Fichier** : `proph3t-claude/index.ts:174`. Seul `x-client-key` est vérifié. Couvert partiellement par F-011 (qui exige déjà un JWT). Vérifier que la correction F-011 protège aussi cette route — si `x-client-key` seul permet d'accéder à des routes sans mémoire, ajouter le même guard JWT sur toutes les branches de l'Edge Function. **Effort** : 30 min.

### F-009 P1 — `Math.random()` dans Monte-Carlo et Revenue Forest

Deux fichiers utilisent `Math.random()` au lieu du PRNG seedé (Mulberry32 dans `abmSocialForceEngine.ts:132`). Résultat : impossible de rejouer un scénario pour debug.

```ts
// monteCarloInterventionEngine.ts:85-86
// revenueForestEngine.ts:302
// Remplacer Math.random() par :
import { mulberry32 } from '../../shared/utils/prng'
const rnd = mulberry32(config.seed ?? 42)
```

**Effort** : 20 min (après création du module PRNG commun — F-010).

### F-015 P1 — Migrations en doublon de numérotation

3 fichiers `003_*.sql`, 2 × `008_*.sql`, 2 × `009_*.sql`. L'ordre d'exécution dépend du tri alphabétique → fragile.

```
003_intelligence_layer.sql  → 003a_intelligence_layer.sql
003_plan_reader.sql         → 003b_plan_reader.sql
003_world_class.sql         → 003c_world_class.sql
008_multitenant_saas.sql    → 008a_multitenant_saas.sql
008_scene_editor.sql        → 008b_scene_editor.sql
009_canvas_states.sql       → 009a_canvas_states.sql
009_incidents.sql           → 009b_incidents.sql
```

Vérifier les dépendances inter-migrations avant de commit. **Effort** : 2 h.

### Test Vitest en échec — `fileValidator > 50 MB DXF`

`src/__tests__/fileValidator.test.ts:34`. 1 test fail sur 139. Investiguer, corriger la logique ou le test. **Ne pas désactiver le test.** **Effort** : 30 min.

---

## 02 — Sprint 2 : Architecture & algorithmes (semaines 3–4)

### F-001 P1 — Renommer le namespace PROPH3T

Le label "PROPH3T" recouvre deux réalités sans lien : un proxy LLM et 16 engines algorithmiques déterministes. Renommer sans changer le comportement.

```
src/lib/proph3t.ts                        → src/lib/aiClient.ts
src/modules/cosmos-angre/shared/proph3t/engines/*     → src/modules/cosmos-angre/shared/engines/*
src/modules/cosmos-angre/shared/proph3t/proph3tService.ts → src/modules/cosmos-angre/shared/aiService.ts
```

Garder "PROPH3T" uniquement dans les libellés UI et les noms de routes publiques déjà indexées. 70+ fichiers à modifier (imports uniquement).

**Effort** : 2-3 jours.

### F-010 P2 → P1 — Centraliser le PRNG

Prérequis de F-009. Créer `src/modules/cosmos-angre/shared/utils/prng.ts` exportant Mulberry32 ; patcher les 4 usages. **Effort** : 30 min + 20 min.

### F-EKF P1 — Corriger `positioningEngine`

**Fichier** : `vol4-wayfinder/engines/positioningEngine.ts:317-349`. Ce qui est nommé "EKF" est en réalité un Kalman scalaire séparé sur x/y, avec gain multiplié par un `weight` arbitraire qui détruit l'optimalité.

```ts
// DÉFAUT ACTUEL (l.341)
out.x += z.weight * kx * (z.x - out.x)

// CORRECTION — supprimer le weight, reposer sur R seul
const r = z.accuracyM * z.accuracyM
const kx = px / (px + r)
const ky = py / (py + r)
out.x += kx * (z.x - out.x)
out.y += ky * (z.y - out.y)

// Renommer : ekfUpdate → kalmanFusion2D
// Commentaire : "Kalman scalaire 2D — pas un EKF"
```

**Effort** : 2 h.

### F-003 P2 — Unifier les deux types `EditableSpace` homonymes

**Prérequis bloquant pour Plan Importer**. Créer le type canonique unique dans `shared/types/space.types.ts`. Renommer l'ancien type dans `SpaceLabelEditor.tsx` → `LabeledSpace`. **Effort** : 2-3 h.

### ABM Social Force — cap la force de répulsion

**Fichier** : `shared/proph3t/engines/abmSocialForceEngine.ts:300,318`. Ajouter `MAX_FORCE = 5000 N`. **Effort** : 20 min.

### F-013 P1 — Rate limit Edge Function → Postgres

Migrer la `Map` JS vers table `request_log` Postgres. **Effort** : 2 h.

### F-004 P2 — Découper `Vol3Module.tsx` (2469 lignes)

Extraire les sections en composants autonomes (sans modifier la logique). Cible : `Vol3Module.tsx ≤ 300 lignes` + sections dans `vol3-parcours/sections/`. **Effort** : 1 jour.

---

## 03 — Sprint 3 : Qualité de code & tests (semaines 5–6)

### Réduire les 598 erreurs ESLint → < 100

Ordre de fréquence :
1. `@typescript-eslint/no-unused-vars` — 360
2. `@typescript-eslint/no-explicit-any` — 205
3. `react-hooks/rules-of-hooks` — 6 (**prioritaire, peut casser React**)
4. `react-hooks/exhaustive-deps` — 37

**Effort** : 3-4 jours.

### Tests unitaires — 14 engines critiques sans tests

Priorité : `astarEngine`, `positioningEngine`, `monteCarloEngine`, `revenueForestEngine`, `hungarianEngine`, `abmSocialForceEngine`, `cusumEngine`. **5 cas minimum par fichier** : nominal · edge case vide · dégénéré · déterminisme (seed fixe + 2 runs = même résultat) · performance (< 100 ms). **Effort** : 3 jours.

### F-016 P2 — Auditer les ~24 tables sans RLS

```sql
SELECT relname FROM pg_class
  JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
  WHERE relkind = 'r' AND nspname = 'public' AND relrowsecurity = false
  ORDER BY relname;
```

Pour chaque table : (1) accessible via PostgREST ? (2) si oui → `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + politique ; (3) si non → retirer de l'exposition. **Effort** : 4 h.

### F-005 P2 — Documenter ou supprimer les 5 worktrees actifs

`.claude/worktrees/` : `bold-hopper`, `hungry-hugle`, `inspiring-kapitsa`, `nervous-bose`, `priceless-chebyshev`. Pour chacun : `git diff main` → résumé, décision (merger/archiver/supprimer), documenter dans `.claude/worktrees/README.md`. **Effort** : 1 h.

---

## 04 — Sprint 4 : Module Plan Importer (semaines 5–7)

### Prérequis bloquant

Le type `EditableSpace` unifié (F-003) est nécessaire **avant** toute injection d'espaces importés dans les stores Vol.3.

### Architecture du module

Créer `src/modules/cosmos-angre/plan-importer/` — module autonome, **jamais dans le namespace `proph3t/engines/`**.

```
plan-importer/
├── index.ts
├── PlanImporterSection.tsx       // Wizard 4 étapes
├── store/importStore.ts          // Zustand — état wizard
├── engines/
│   ├── dxfParser.ts              // dxf-parser npm + wrapper TS strict
│   ├── rasterParser.ts           // opencv.js WASM — voie image
│   ├── layerMapper.ts            // AIA/ISO 13567 + profils
│   ├── spaceExtractor.ts         // polygones, GLA, labels
│   ├── geoRefEngine.ts           // calage WGS84, multi-étages, XREF
│   ├── simplifyEngine.ts         // Douglas-Peucker ε=0.05m
│   ├── diffEngine.ts             // sync re-import sans perte
│   └── semanticClassifier.ts     // 2 appels aiClient max par import
├── components/
│   ├── FileDropZone.tsx
│   ├── LayerMappingPanel.tsx     // écran clé — UX soignée
│   ├── SpaceReviewCanvas.tsx
│   ├── MultiFloorPanel.tsx
│   └── DiffReviewPanel.tsx
└── types/importer.types.ts
```

### Pipeline DXF (voie premium — 9 étapes)

1. **Parseur DXF** : `dxf-parser` + wrapper strict. Entités : LWPOLYLINE, POLYLINE, TEXT, MTEXT, INSERT, HATCH, XREF. R12 → 2024. Unités → mètres. Parsing dans un Web Worker.
2. **Layer Mapper** : détection auto AIA (A-WALL-*, A-AREA-TNNT…) + ISO 13567. Score de confiance 0–1. Mapping manuel pour calques ambigus (score < 0.4). Profils sauvegardables par bureau d'études. Appel `aiClient` optionnel sur noms non-standards uniquement.
3. **Space Extractor** : polygones fermés sur calque "lots", surface GLA (algorithme du lacet), centroïde, TEXT/MTEXT intérieurs comme label candidat, détection vides.
4. **Simplify Engine** : Douglas-Peucker (ε=0.05m), fusion segments colinéaires (angle < 2°), suppression mobilier/cotes/hachures. Plan public séparé du plan technique.
5. **Classification sémantique** : 1 appel `aiClient` groupé pour tout l'étage → JSON strict avec 31 types Atlas + score + reasoning. Jamais un appel par espace.
6. **OCR labels** (image uniquement) : Vision Claude sur crops → extraction + normalisation noms d'enseignes.
7. **GeoRef** : calage 2 points min, WGS84/Lambert-93/EPSG custom via `proj4js`, calcul angle nord.
8. **Multi-étages + XREF** : empilement DXF multiples, alignement via cages communes, identifiant stable `floorId:polygonHash`.
9. **Diff Engine** : hash stable par espace, catégorisation (inchangé / modifié ≤5% / nouveau / supprimé / fusionné / découpé), `DiffReviewPanel` avant validation.

### Injection dans les stores existants (lecture seule des engines)

```ts
// Sortie du pipeline → stores Vol.3 (zéro modification des engines)
importedSpaces: EditableSpace[]   // type unifié après F-003
  → editableSpaceStore.setSpaces(importedSpaces)
  → navGraph.rebuild(importedSpaces)           // Vol.3 — inchangé
  → signagePlacement.recompute(importedSpaces) // Vol.3 — inchangé
  → flowEngine.update(importedSpaces)          // Vol.3 — inchangé

importedMapSVG: SVGElement
  → wayfinderBridge.setBasePlan(importedMapSVG) // Vol.4 — inchangé
  → brandEngine.applyTheme(importedMapSVG)      // Vol.4 — inchangé
```

### Migration SQL

```sql
-- src/supabase/migrations/010a_plan_importer.sql
CREATE TABLE imported_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  source_file_hash text NOT NULL,
  dxf_version text,
  floor_count int DEFAULT 1,
  space_count int DEFAULT 0,
  mapping_profile_id uuid,
  import_date timestamptz DEFAULT now(),
  plan_public_svg text,
  plan_original jsonb
);

CREATE TABLE layer_mapping_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  name text NOT NULL,
  bureau_name text,
  mapping jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE imported_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE layer_mapping_profiles ENABLE ROW LEVEL SECURITY;
-- Ajouter les politiques RLS correspondantes
```

### Feature flag + contraintes

- Activable via `VITE_FEATURE_PLAN_IMPORTER=true`. Désactivé par défaut en production.
- **Max 2 appels `aiClient` par import.** Afficher le coût token estimé avant appel.
- Tester sur DXF réels : AutoCAD 2024, BricsCAD, Archicad DXF export, Revit DXF export.
- Validation : pipeline complet sur 3 DXF (50 lots / 200 lots / 3 étages) avant merge.

---

## 05 — Sprint 5 : Axes non instruits (semaines 7–8)

### Axes 5/6 — UX + Accessibilité
- Parcours utilisateur complet avec un exploitant réel Cosmos Angré.
- Audit `axe-core` sur les 4 volumes + runtime borne.
- Test NVDA/VoiceOver sur les flux critiques.
- Validation WCAG 2.1 AA sur le plan SVG interactif.

### Axe 7 — Performance
- Lighthouse sur les 4 volumes.
- Profiling `Plan3DView.tsx` (2266 lignes — suspect de rerenders).
- Bundle size par volume — vérifier lazy loading Vite (F-007).
- TTI ≤ 2 s sur tablette Android bas de gamme.

### Axe 9 — Interopérabilité
- Round-trip DXF (import → export → re-import sans perte).
- Export Excel CDC + JSON wayfinding v2.0.0-vol4.
- Feedback QR end-to-end (`signage-feedback-mobile` complet).

### Axe 12 — DevOps & observabilité
- Intégration Sentry (erreurs JS + Edge Functions).
- Logs structurés sur les Edge Functions.
- CI/CD : `tsc --noEmit` + `eslint` + `vitest` bloquants sur PR.
- Alerting sur freeze A* (capturer `RouteAbortedError`).

---

## 06 — Récapitulatif des findings — ordre de traitement

| ID | Titre | Fichier | Niveau · Sprint | Effort |
|---|---|---|---|---|
| F-011 | IDOR proph3t-claude — auth + project check | `proph3t-claude/index.ts:183` | **P0 · S1** | 1 h |
| F-008 | A* sans `maxExpansions` → freeze UI | `astarEngine.ts:184` | **P0 · S1** | 30 m |
| F-012 | Path traversal signage-feedback filename | `signage-feedback…:124` | P1 · S1 | 15 m |
| F-014 | Pas d'auth utilisateur proph3t-claude | `proph3t-claude:174` | P1 · S1 | 30 m |
| F-009 | `Math.random()` Monte-Carlo + Revenue | `monteCarloEngine:85`, `revenueForest:302` | P1 · S1 | 20 m |
| F-015 | Migrations en doublon (003×3, 008×2, 009×2) | `migrations/003a_b_c…` | P1 · S1 | 2 h |
| F-013 | Rate limit in-memory → Postgres | `signage-feedback:35` | P1 · S2 | 2 h |
| F-EKF | EKF mal conçu — double pondération K×weight | `positioningEngine:317` | P1 · S2 | 2 h |
| F-001 | Renommer namespace PROPH3T | `lib/proph3t.ts` + `engines/*` | P1 · S2 | 2-3 j |
| F-003 | Deux `EditableSpace` homonymes | `SpaceEditorCanvas` + `SpaceLabelEditor` | P2 · S2 | 3 h |
| F-010 | Centraliser PRNG | `shared/utils/prng.ts` | P2 · S2 | 30 m |
| F-004 | Vol3Module.tsx god file 2469 lignes | `Vol3Module.tsx` | P2 · S2 | 1 j |
| F-016 | ~24 tables sans RLS explicite | `pg_class` query | P2 · S3 | 4 h |
| F-005 | 5 worktrees actifs non mergés | `.claude/worktrees/*` | P2 · S3 | 1 h |
| F-006 | Audit clés git `sk-ant-*` | — | Vérifié | — |
| F-002 | SpaceEditorCanvas non branché Vol.3 | — | **Corrigé** | — |
| Plan-Import | Nouveau module DXF/image → plan interactif | `plan-importer/` | Nouveau · S4 | 2-3 sem |

---

## 07 — Critères de validation finale — go-live Cosmos Angré

**Gates obligatoires avant mise en production** :

- [ ] `tsc --noEmit` → 0 erreur
- [ ] ESLint → < 100 erreurs (**0 sur `rules-of-hooks`**)
- [ ] Vitest → 139/139 pass (0 fail)
- [ ] F-011 IDOR corrigé + testé (401/403 validés)
- [ ] F-008 A* corrigé + test `RouteAbortedError` sur graphe pathologique
- [ ] F-006 confirmé propre (0 clé dans `git log`)
- [ ] RLS explicite sur toutes les tables exposées via PostgREST
- [ ] Score audit estimé ≥ **78/100** après corrections sprints 1-3
