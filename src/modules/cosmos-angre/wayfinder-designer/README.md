# Wayfinder Designer

Module de conception de wayfinders **digitaux interactifs** et **statiques imprimables grand format**.

Référence : Cahier des charges PROPH3T v1.0 sections 03 à 11.

---

## Objet

Concevoir, prévisualiser, puis exporter des plans d'orientation à destination :

- **Bornes interactives** (1080×1920 portrait, 1920×1080 paysage)
- **Site web responsive** (375 / 768 / 1280 / 1920 px, WCAG 2.1 AA)
- **Tablettes murales** (768×1024)
- **Affiches grand format imprimables** (A0, A1, A2 — vectoriels @ 150 DPI minimum)

Le module ne modifie **aucun** moteur existant de Vol.4 (A* bidirectionnel, EKF positionning, search engine). Il les consomme via le `KioskAdapter`.

## Architecture

```
wayfinder-designer/
├── types.ts                                  # Contrat typé complet
├── README.md                                 # Ce fichier
│
├── store/
│   └── designerStore.ts                      # Zustand + persist + autosave 30s + undo/redo
│
├── engines/
│   ├── brandEngine.ts                        # Charte : WCAG, daltonisme, RTL, fonts
│   ├── digitalEngine.ts                      # Export HTML/ZIP/SSG/QR/manifest
│   ├── printEngine.ts                        # Export PDF/SVG/PNG grand format
│   └── mapSvgExporter.ts                     # Vol.3 → SVG vectoriel pur
│
├── templates/
│   ├── registry.ts                           # Liste + validation des templates
│   ├── shared/
│   │   ├── MapRenderer.tsx                   # Renderer plan SVG (commun)
│   │   ├── Chrome.tsx                        # Header / Footer / Légende
│   │   └── printDimensions.ts                # mm ↔ px @ DPI
│   ├── kiosk-portrait.tsx                    # 1080×1920
│   ├── kiosk-landscape.tsx                   # 1920×1080
│   ├── web-responsive.tsx                    # Breakpoints 375/768/1280/1920
│   ├── tablet-portrait.tsx                   # 768×1024
│   ├── poster-a0.tsx                         # 841×1189 mm @ 150 DPI
│   ├── poster-a1.tsx                         # 594×841 mm
│   └── poster-a2.tsx                         # 420×594 mm
│
├── components/
│   ├── WayfinderDesignerView.tsx             # UI principale 6 onglets
│   └── tabs/
│       ├── ProjectTab.tsx                    # Onglet 1 — Projet
│       ├── BrandTab.tsx                      # Onglet 2 — Charte
│       ├── TemplatesTab.tsx                  # Onglet 3 — Templates
│       ├── CanvasTab.tsx                     # Onglet 4 — Canvas preview live
│       ├── ExportTab.tsx                     # Onglet 5 — Export
│       └── DeployTab.tsx                     # Onglet 6 — Déploiement
│
├── runtime/
│   ├── KioskRuntime.tsx                      # Plein écran /kiosk/:kioskId
│   ├── KioskAdapter.ts                       # Pont vers moteurs Vol.4 (read-only)
│   ├── TouchKeyboard.tsx                     # Clavier tactile AZERTY/QWERTY
│   └── telemetry.ts                          # Buffer + flush events vers Supabase
│
└── __tests__/
    ├── brandEngine.test.ts                   # WCAG, daltonisme, palette, RTL
    ├── templates.test.ts                     # Registry, déterminisme, dimensions
    └── noRegression.test.ts                  # Imports Vol.4 + feature flag
```

## Migrations Supabase

`supabase/migrations/012_wayfinder_designer.sql` crée :

- `designer_projects` — config sérialisée + versioning JSONB
- `designer_exports` — historique des exports (audit)
- `kiosk_telemetry_events` — analytics runtime borne (insertion publique)

À appliquer via :
```bash
supabase db push
```

Bucket Storage à créer manuellement : `wayfinder-designer-assets` (logos, webfonts upload).

## Routes

| Route | Visibilité | Composant |
|---|---|---|
| `/kiosk/:kioskId` | Publique (sans `AppLayout`) | `KioskRuntime` |
| Vol.4 → onglet « Wayfinder Designer » | Auth, dans Vol.4 | `WayfinderDesignerView` |

## Feature flag

Désactivation totale via :
```js
localStorage.setItem('atlas-feature-wayfinder-designer', 'false')
```

L'application reste 100 % fonctionnelle sans le Designer (CDC §11).

## Workflow utilisateur type

```
1. Vol.4 → Wayfinder Designer
2. Onglet Projet     : nom, langues, logo
3. Onglet Charte     : palette + typo (auto WCAG AA)
4. Onglet Templates  : choisir kiosk-portrait OU poster-A0 OU autre
5. Onglet Canvas     : preview live, ajuster les calques (murs/POI/etc.)
6. Onglet Export     : choisir format → bouton Exporter → fichier généré
7. Onglet Déploiement: associer borne(s) → "Publier nouvelle version"
8. Borne accède à /kiosk/:kioskId en plein écran (PWA offline 72h)
```

## Performances cibles (CDC §10)

| Opération | Cible | Vérifié |
|---|---|---|
| Preview canvas après changement de charte | < 200 ms | ✓ via `injectCssVariables` (sans reload) |
| Export HTML autonome | < 10 s | ✓ |
| Export PDF A0 | < 30 s | ✓ |
| Runtime borne TTI sur tablette Android bas de gamme | < 2 s | À mesurer post-déploiement |

## Tests

```bash
npx vitest run src/modules/cosmos-angre/wayfinder-designer/__tests__
```

Couverture :
- **brandEngine.test.ts** — 25+ assertions sur conversions couleur, contraste WCAG, simulation daltonisme, RTL, génération palette, JSON round-trip.
- **templates.test.ts** — 15+ assertions sur registry, validation interface (CDC §04), déterminisme du rendu, dimensions A0/A1/A2 conformes ISO 216.
- **noRegression.test.ts** — vérifie que les moteurs Vol.4 (`astarEngine`, `positioningEngine`, `searchEngine`, `wayfinderBridge`) restent importables et non modifiés. Vérifie le feature flag.

## Conformité CDC

| Section CDC | Implémentation |
|---|---|
| §03 Designer 6 onglets | `WayfinderDesignerView` + `tabs/*` |
| §04 7 templates + interface stricte | `templates/registry.ts` + 7 fichiers |
| §05 brandEngine | `engines/brandEngine.ts` (10 sections) |
| §06 digitalEngine | `engines/digitalEngine.ts` (HTML/ZIP/SSG/QR/manifest) |
| §07 printEngine + MapSVGExporter | `engines/printEngine.ts` + `mapSvgExporter.ts` |
| §08 Runtime borne | `runtime/KioskRuntime.tsx` + `TouchKeyboard` + `telemetry.ts` |
| §09 Intégration Vol.3+Vol.4 read-only | `KioskAdapter` (non-destructif) |
| §10 Persistence + tests | Migration 012 + `__tests__/` |
| §11 Feature flag + livrables | `isDesignerEnabled()` + ce README |

## Limites connues

- **CMJN** : jsPDF produit nativement du sRGB. La conversion CMJN nécessite une Edge Function serveur (Ghostscript) — prévue en post-livraison.
- **Polices web** : Google Fonts chargées en CDN. Pour bundle 100 % offline, uploader les WOFF2 en local et utiliser `source: 'local-woff2'`.
- **Preview Canvas zoom** : limité à 200 % pour éviter de saturer la mémoire navigateur sur grandes images vectorielles.
- **Daltonisme tritanopia** : algorithme Brettel 1997 simplifié (pas tous les cas pathologiques).

---
**Version 1.0** · Atlas Mall Suite · Wayfinder Designer
