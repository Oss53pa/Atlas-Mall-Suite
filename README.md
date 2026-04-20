# Atlas Mall Suite

Plateforme de pilotage pour centres commerciaux — multi-projets, multi-tenant,
multi-étages, multi-devises. Conception, audit réglementaire, signalétique,
exploitation.

**Projet pilote** : Cosmos Angré Shopping Center (Abidjan, ouverture oct. 2026).

---

## Architecture

```
Atlas Studio (Phase 0)          →  Import · Édition · Modèles de plan
         ↓
Vol.1 Commercial                →  Mix enseignes, CA, scénarios
Vol.2 Sécurité                  →  Audit ERP, caméras, incidents
Vol.3 Parcours Client           →  Flux, bottlenecks, personas, PMR
Vol.4 Wayfinder                 →  GPS intérieur, signalétique, bornes
         ↓
PROPH3T (transversal IA)        →  Analyze · Orchestrate · Predict · Optimize
```

- **Stack** : React 18 + TypeScript 5 + Vite 4 + Tailwind + Zustand
- **3D** : Three.js 0.183 + GLTFExporter
- **Backend optionnel** : Supabase (RLS multi-tenant + Edge Functions)
- **IA** : Ollama local (prioritaire) + Claude API (fallback)

## Prérequis

- **Node.js** ≥ 18 (recommandé 20 LTS)
- **npm** ≥ 9 (ou pnpm/bun compatible)
- Navigateur récent : Chrome/Edge/Firefox dernière version, 8 Go RAM recommandés

Optionnel pour fonctions avancées :
- **Ollama** local (port 11434) pour IA hors-ligne — sinon fallback Claude API
- **Compte Supabase** pour multi-utilisateur et partage d'équipe
- **Ghostscript service** pour exports CMJN PDF/X-1a professionnels

## Installation

```bash
git clone https://github.com/<owner>/Atlas-Mall-Suite.git
cd Atlas-Mall-Suite
npm install
cp .env.example .env.local   # éditer les variables si besoin
npm run dev
```

Ouvrir http://localhost:5173.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Dev server Vite avec HMR |
| `npm run build` | Build production (dist/) |
| `npm run preview` | Preview du build prod |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires Vitest |
| `npm run test:e2e` | Tests Playwright |

## Variables d'environnement

Copier `.env.example` → `.env.local` et éditer :

```env
# Supabase (optionnel — l'app fonctionne 100% offline sans)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Claude API (optionnel — saisi par l'utilisateur via Paramètres IA en runtime)
VITE_CLAUDE_API_KEY=sk-ant-...

# Ghostscript service (optionnel — exports CMJN)
VITE_GHOSTSCRIPT_URL=https://ghostscript.example.com
```

**Note** : en mode 100% local, aucune variable n'est requise. Toutes les données
sont persistées dans le navigateur (localStorage + IndexedDB).

## Workflow utilisateur

1. **Ouvrir un projet** → Atlas Studio se charge
2. **Onglet Import** → glisser un DXF/DWG/PDF, calibrer l'échelle
3. **Onglet Éditeur** → dessiner les espaces par-dessus le DXF socle
4. **Onglet Modèles** → *Enregistrer brouillon* → *Valider*
5. **Volumes Vol.1/2/3/4** → débloqués, consomment le modèle actif

Dropdown de sélection du modèle disponible en bas de chaque sidebar volume.

## Structure du code

```
src/
├── App.tsx                         # Root router
├── components/                     # UI globaux (AppLayout, HelpFloatingBall…)
├── hooks/                          # Hooks partagés (useDraggable…)
├── lib/                            # Services techniques (supabase, apiKeyStore…)
├── modules/
│   ├── cosmos-angre/               # Module workspace projet (générique malgré le nom)
│   │   ├── shared/                 # Composants, stores, engines partagés
│   │   ├── vol1-commercial/        # Vol.1
│   │   ├── vol2-securitaire/       # Vol.2
│   │   ├── vol3-parcours/          # Vol.3
│   │   ├── vol4-wayfinder/         # Vol.4
│   │   ├── scene-editor/           # Studio 2D/3D
│   │   └── proph3t-core/           # Orchestrateur IA
│   ├── projects/                   # Dashboard multi-projets
│   ├── docs/                       # Notice d'utilisation
│   └── ...
├── supabase/
│   ├── functions/                  # Edge Functions Deno
│   └── migrations/                 # Schéma SQL + RLS policies
└── workers/                        # Web Workers (DXF, A*, Monte-Carlo…)
```

**Note de nommage** : le dossier `cosmos-angre/` contient du code **générique**
(valable pour tout mall). Le nom historique reflète le premier pilote.
Un refactor vers `modules/core/` est prévu (voir `modules/cosmos-angre/NAMING.md`).

## Déploiement

### Static hosting (Vercel, Netlify, OVH)

```bash
npm run build
# dist/ contient les assets statiques à servir
```

Configurer les headers :
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Supabase (optionnel)

```bash
supabase link --project-ref <ref>
supabase db push                                    # migrations
supabase functions deploy proph3t-claude            # relay Claude API
supabase functions deploy signage-feedback-mobile
supabase functions deploy monthly-report
```

Variables d'environnement à configurer dans Supabase Dashboard → Project
Settings → Edge Functions :
- `ANTHROPIC_API_KEY` (pour proph3t-claude, optionnel si clé user)

## Référentiels appliqués

- **Comptabilité** : SYSCOHADA Révisé 2017 · TVA 18% (UEMOA par défaut, adaptable)
- **Sécurité ERP** : Arrêté 25 juin 1980 · Décret CI 2009-264 · Loi CI 2014-388
- **Signalétique** : ISO 7010 · NF C71-800 · NF S 61-938
- **Accessibilité** : Loi 2005-102 · Arrêté 8 décembre 2014 · ISO 21542
- **Web UX** : WCAG 2.1 AA · Brettel 1997 (daltonisme)
- **Impression** : PDF/X-1a · ISOcoated_v2_300 (ECI)

## Licences

- Code source : propriété Atlas Mall Suite
- Assets 3D (mobilier, personnages) : Kenney.nl (CC0), Quaternius (CC0), Poly Pizza (CC-BY)
- Icônes : Lucide React (ISC)

## Support

- Documentation complète : ouvrir la **floating ball d'aide** en bas-droite
  ou aller sur `/notice`
- Pour le pilote Cosmos Angré : Cheick Sanankoua
