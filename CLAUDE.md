# Atlas BIM — Documentation technique & onboarding

> **Produit** : Atlas BIM — Plateforme SaaS de jumeau numérique de bâtiments.
> **Éditeur** : Atlas Studio.
> **Statut** : Release Candidate 1 (rc.1). Pas encore de v1.0 figée.

---

## 1. Vue d'ensemble

Atlas BIM permet de modéliser, analyser et piloter tout type de bâtiment
(centre commercial, hôtel, bureaux, hôpital, campus, site logistique, ERP
public, portfolio multi-sites) à partir de plans importés (DXF / DWG / PDF /
IFC), avec :

- **Éditeur polygonal** d'espaces et annotations
- **4 volumes métier** (Opérations, Sécurité, Expérience, Wayfinder)
- **Proph3t IA** — moteur à mémoire longue qui apprend le projet, prédit,
  suggère et recommande des actions chiffrées avec citations
- **Rapports HTML autonomes** partageables hors-ligne

### Positionnement

| Concurrent | Positionnement | Atlas BIM diffère |
|---|---|---|
| ArchiCAD / Revit | Outils CAO pour architectes | Nous = exploitation + optimisation continue |
| SpaceIQ / Archibus | FM / IWMS enterprise | Nous = audit Proph3t + wayfinder + rapports livrables |
| Mapwize / Yanzi | Indoor GPS pur | Nous = BIM + GPS (Wayfinder = 1 volume sur 4) |
| Power BI / Tableau | Dashboards génériques | Nous = vertical bâtiment + IA contextuelle |

---

## 2. Stack technique

### Frontend

- **React 18.3** + TypeScript 5.5 strict (pas d'`any` implicite)
- **Vite 5** + Rollup manual chunks
- **Tailwind CSS** + thème dark premium (bronze + anthracite)
- **Zustand 5** pour l'état global (stores persisted via `localStorage` / IndexedDB)
- **React Router 7** (BrowserRouter)
- **Exo 2** (UI) + **Grand Hotel** (wordmark "Atlas Bim")

### Rendu 2D / 3D / AR

- **Three.js 0.183** — cœur 3D
- **@react-three/fiber 8** + **@react-three/drei 9** + **@react-three/xr 5**
- **dxf-viewer** — WebGL DXF
- **web-ifc-three 0.0.126** — parser IFC (lazy-loaded : 2.6 MB)
- SVG natif pour les plans éditeur (pas de canvas lib — konva retiré rc.1)

### Parsing plans

- **pdfjs-dist 5** — parsing PDF
- **@mlightcad/libredwg-web** (WASM) — conversion DWG → DXF
- `src/modules/building/shared/planReader/` — pipeline source brut → ParsedPlan
- Worker dédié pour le parsing lourd (évite freeze main thread)

### Persistance

- **Dexie 4** (IndexedDB) — ParsedPlan (gros), plan files raw (DXF/DWG/PDF),
  multi-imports indexés par `importId`, plan images
- **localStorage** (via Zustand `persist`) — stores UI, projets, paramètres
- **Supabase** — sync cloud optionnelle (RLS activé sur 30 tables)

### Export

- **exceljs 4.4** — Excel avec formatting riche (3 fichiers)
- **jspdf 4** + **svg2pdf.js** + **jspdf-autotable** — PDF
- **pptxgenjs 4** — PowerPoint
- **docx 9** — Word

### IA

- **Ollama** (local) — LLM par défaut (LLaMA 3.1 fine-tuné)
- **Claude API** — fallback qualité premium (Sonnet 4)
- Tous les engines "ML" nommés honnêtement : stat ≠ IA (voir §7)

---

## 3. Architecture

```
src/
├── App.tsx                        — router racine
├── main.tsx                       — entry point
├── i18n/
│   └── vocabulary.ts              — t(key, verticalId) — 8 verticales × 15 clés
├── verticals/                     — configs par type de bâtiment
│   ├── types.ts                   — VerticalId + VerticalConfig
│   ├── mall.ts / hotel.ts / office.ts / hospital.ts / campus.ts
│   ├── industrial.ts / erp-public.ts / multi-site.ts
│   └── index.ts
├── components/                    — AppLayout, HelpFloatingBall, etc.
├── lib/                           — urlSafety, aiClient, localBackup
├── loaders/                       — ifc-loader (IFC → Three)
├── hooks/                         — useActiveProject, useSuperAdmin
├── modules/
│   ├── building/                  ← ex cosmos-angre/ (neutre, tout bâtiment)
│   │   ├── shared/
│   │   │   ├── planReader/        — DXF/DWG/PDF/IFC → ParsedPlan
│   │   │   ├── stores/            — Zustand + persistance
│   │   │   ├── engines/           — algos métier (stat, pas IA)
│   │   │   ├── proph3t/           — moteur IA Proph3t (LLM-backed)
│   │   │   │   ├── skills/        — skills orchestrables (analyze*.ts)
│   │   │   │   ├── capabilities.ts — matrice des 30+ capacités
│   │   │   │   └── bootstrap.ts   — registerSkill au boot
│   │   │   ├── components/        — UI partagée entre volumes
│   │   │   ├── view3d/ map-viewer/ virtual-tour/
│   │   │   └── hooks/
│   │   ├── vol1-commercial/       ← Opérations & Business
│   │   ├── vol2-securitaire/      ← Sécurité & Conformité
│   │   ├── vol3-parcours/         ← Expérience Utilisateur
│   │   ├── vol4-wayfinder/        ← Wayfinder (candidat extraction v1)
│   │   ├── wayfinder-designer/    — designer panels (CDC)
│   │   ├── scene-editor/          — éditeur 3D meubles
│   │   ├── proph3t-core/          — orchestration cross-volumes
│   │   └── index.tsx              — routes projet (vol1/vol2/vol3/vol4)
│   ├── landing/                   — LandingPage + 5 DemoReport* publics
│   ├── auth/ onboarding/ projects/ settings/
│   ├── transversal/               — Scenarios, DCE, Benchmark
│   ├── tools/ docs/ export/
├── supabase/                      — migrations SQL + functions Edge
└── __tests__/                     — Vitest (algos + engines)
```

### Règle des 4 volumes

- **Vol.1 Opérations & Business** — loyers, RevPAR, occupation, activité
- **Vol.2 Sécurité & Conformité** — caméras, évacuation, APSAD/ERP
- **Vol.3 Expérience Utilisateur** — ABM flux, signalétique, parcours
- **Vol.4 Wayfinder** — GPS intérieur (produit vendable seul)

Un projet active N volumes selon sa verticale (champ `VerticalConfig.enabledVolumes`).

### Proph3t — contrat de sortie (`Proph3tResult`)

```ts
{
  skill: string
  qualityScore?: number           // 0..100
  executiveSummary: string
  findings: Proph3tFinding[]      // priorisés avec sévérité
  actions: Proph3tAction[]        // cliquables, chiffrées, avec ROI
  overlays?: Proph3tOverlay[]     // pour render sur plan
  payload: TPayload               // data spécifique skill
  source: 'ollama' | 'claude' | 'algo'
  confidence: Confidence          // 0..1 avec rationale
}
```

Toute skill retourne ce format. La UI a un `Proph3tResultPanel` universel.

---

## 4. Onboarding développeur (30 min)

### Étape 1 — Setup (5 min)

```bash
git clone https://github.com/Oss53pa/Atlas-Mall-Suite.git
cd Atlas-Mall-Suite
npm install
npm run dev            # http://localhost:5174
```

### Étape 2 — Parcours utilisateur de base (10 min)

1. Aller sur `/` → landing (générique, 8 verticales)
2. Cliquer **"Voir un rapport Proph3t"** → 5 démos publiques (mall, hôtel, bureaux, hôpital, campus)
3. Cliquer **"Mode démo app"** → dashboard → projet "The Mall"
4. `/projects/cosmos-angre/studio` → Atlas Studio (import plan, éditeur, modèles)
5. `/projects/cosmos-angre/vol1` → Vol.1 Opérations
6. Naviguer via la sidebar les 4 volumes + Atlas Studio

### Étape 3 — Lancer un skill Proph3t (5 min)

Dans la console :
```ts
import { runSkill } from '@/modules/building/shared/proph3t/orchestrator'
const result = await runSkill('analyzeCommercialMix', { lots, horizonMonths: 12 })
console.log(result.executiveSummary, result.actions)
```

### Étape 4 — Ajouter une verticale (10 min)

1. `src/verticals/ma-verticale.ts` — copier `mall.ts`, adapter KPIs, benchmarks, normes
2. Enregistrer dans `src/verticals/index.ts`
3. Ajouter une entrée dans `src/i18n/vocabulary.ts` (15 clés)
4. Optionnel : page démo `src/modules/landing/DemoMaVerticale.tsx` utilisant `buildDemoHtml` de `demoReportTheme.ts`

---

## 5. Principes produit (non-négociables)

1. **Zéro donnée mockée dans l'app réelle** — tout passe par stores persistants ou imports. Les données de démo sont explicitement isolées dans `src/modules/landing/Demo*.tsx`.
2. **Atlas Studio en Phase 0 dans chaque volume** — pas de divergence de plan entre Vol.1 et Vol.3.
3. **Proph3t traçable** — chaque action contient `confidence` + `sources[]` avec `citeAlgo()` / `citeErp()` / `citeRag()`.
4. **Local-first** — tout doit fonctionner offline. Supabase sync best-effort.
5. **Multi-verticales sans duplication** — 1 engine partagé, N configs verticales.

---

## 6. Bundle — politique de dépendances

### Libs lourdes actuelles (rc.1, post-audit)

| Lib | Taille | Usage | Politique |
|---|---|---|---|
| `vendor-web-ifc-three` | 2 615 kB | IFC parser | Lazy-load obligatoire |
| `vendor-three` | 1 257 kB | 3D core | Toujours chargé, cœur produit |
| `vendor-exceljs` | 938 kB | Excel | Lazy-load (export only) |
| `vendor-dxf-viewer` | 674 kB | DXF | Lazy-load (viewer only) |
| `vendor-jspdf` | 447 kB | PDF | Lazy-load (export only) |
| `vendor-pdfjs` | 439 kB | PDF parse | Lazy-load (import only) |
| `vendor-pptx` | 369 kB | PPTX export | Lazy-load |
| `vendor-docx` | 407 kB | DOCX export | Lazy-load |
| `vendor-html2canvas` | 201 kB | Screenshot | Lazy-load |
| `react-vendor` | 350 kB | React + ReactDOM | Cœur |

### Libs retirées (rc.1)

- **`xlsx` (0.18.5)** — redondant avec `exceljs`. Un seul remplaçait l'autre.
- **`konva` (10.2.3)** + **`react-konva` (19.2.3)** — composants orphelins (`CanvasEngine.tsx` / `LayoutEditor.tsx`) jamais importés. L'éditeur utilise SVG natif.

### Règle : avant d'ajouter une dépendance

1. Existe-t-il déjà une lib qui fait ça ? (`exceljs` pour Excel, `jspdf` pour PDF…)
2. La lib peut-elle être lazy-loadée ? Si non, bien justifier.
3. Poids du bundle : `npm run build` et vérifier la chunks dans `dist/assets/chunks/`.

---

## 7. Honnêteté algorithmique

**Règle absolue** : ne pas appeler "IA" ce qui n'en est pas.

| Appellation honnête | Appellation marketing à ÉVITER |
|---|---|
| CUSUM + σ-threshold + EWMA | "Détection IA d'anomalies" |
| IQR outliers + aspect ratio | "Proxy Isolation Forest" ❌ corrigé rc.1 |
| Gradient-boosted decision trees | "Random Forest Breiman 2001" ❌ corrigé rc.1 |
| Régression logistique | "ML scoring" |
| Distribution de Weibull | "Prédictif IA" |
| Agent-Based Modeling Helbing | "Simulation IA foule" |
| Lexique FR/EN + négation | "NLP sentiment" |
| Monte Carlo | "Simulation probabiliste IA" ❌ |

**Vraie IA dans Atlas BIM** :
- **Proph3t** via Ollama (LLaMA 3.1) ou Claude API (Sonnet 4)
- Tout le reste = **statistique, pathfinding, optimisation combinatoire, heuristiques**

Ne pas diluer la crédibilité de Proph3t en surqualifiant les autres engines.

---

## 8. Roadmap scope (actions reviewer)

### rc.1 — appliqué (commit 2026-04-23)

- ✅ Audit bundle + retrait libs redondantes (xlsx, konva)
- ✅ Rename honnête (IsolationForest proxy → IQR, Random Forest → GBDT)
- ✅ Verticales configurables (8 × 15 clés i18n)
- ✅ Pivot "Atlas BIM" + démos multi-verticales

### Vol.2 sections — migrées vers store (2026-04-23)

Les 7 sections Vol.2 précédemment hardcodées (`AccesSection`, `IncendieSection`,
`OrganigrammeSection` (UI-only), `PerimetreSection`, `ProceduresSection`,
`VmsIntegration`, + `IncidentWorkflow` qui n'était pas concerné) ont été
migrées vers le pattern store :

- `vol2-securitaire/store/securityConfigStore.ts` — CRUD scopé par projet
- `vol2-securitaire/store/securityConfigTemplates.ts` — templates par verticale
- `vol2-securitaire/hooks/useSecurityConfigForProject.ts`

`OrganigrammeSection` conserve ses coordonnées x/y hardcodées : ce sont des
**constantes UI** pour la représentation SVG de l'organigramme, pas de la
config projet. Les données métier (rôles/noms) pourraient être sorties dans
une v1.1 si besoin éditeur visuel.

### v1.0-beta — avant release stable

- 🔒 **Gel architecture** — pas de 5e volume, pas de rename modulaire
- 🔬 **Audit 30-day user touch** — analytics sur chaque section, amputer &lt; 5 %
- 📦 **Extraction Wayfinder** en workspace `pnpm` dédié — produit vendable seul (hôpital/aéroport)

### Jamais fait mais tentant

- ❌ Micro-services (OSS ok jusqu'à 20 devs, on y est pas)
- ❌ Dédoublement des verticales en sub-apps (le pattern i18n suffit)

---

## 9. Git & branches

- `main` = production Vercel
- Commits atomiques, messages descriptifs, co-auteurs Claude/AI si pertinent
- **Jamais** de `git push --force` sur main
- **Jamais** de commit de secrets (.env, credentials.json) → gitignored
- Le dev server `npm run dev` **tient des handles** sur `src/modules/building/`
  → le fermer avant rename de dossier

---

## 10. Identités stables (ne pas renommer)

Ces strings sont des **clés de persistance utilisateur** : les renommer
casserait les données de clients existants.

- `cosmos-angre` (slug URL projet pilote)
- `cosmos-angre-lots-v1` (nom Dexie)
- `atlas-parsed-plan-cache` (DB Dexie)
- `atlas-projects`, `atlas-settings`, `atlas-*` (localStorage keys)

---

## 11. Contacts

- **GitHub** : https://github.com/Oss53pa/Atlas-Mall-Suite
- **Issues** : utiliser les templates
- **Proph3t skills** : voir `src/modules/building/shared/proph3t/capabilities.ts`

---

*Document maintenu manuellement. Dernière mise à jour : 2026-04-23 (rc.1 post-reviewer audit).*
