# Note de nommage — ce dossier

**Nom historique** : `cosmos-angre/` — d'après le projet pilote *Cosmos Angré Shopping Center* (Abidjan).

**Contenu réel** : code **générique** du workspace projet (4 volumes métier : Commercial, Sécuritaire,
Parcours Client, Wayfinder) — utilisable pour **tout centre commercial**, pas seulement Cosmos Angré.

## Pourquoi ce nom ?

Le projet a démarré autour du pilote Cosmos Angré. Le code a été développé en gardant en tête la
généricité (multi-tenant Supabase RLS, `projetId` paramétrable partout, référentiels configurables
par pays/zone), mais le nom du dossier n'a pas suivi.

## Renommage prévu

À terme : `src/modules/cosmos-angre/` → `src/modules/core/` (ou `src/modules/workspace/`).

### Étapes (à faire dev-server arrêté)

1. Arrêter Vite : `Ctrl+C` dans le terminal `npm run dev`
2. `git mv src/modules/cosmos-angre src/modules/core`
3. Search & replace global : `modules/cosmos-angre` → `modules/core` dans tous les `*.ts`, `*.tsx`
4. Mettre à jour `vite.config.ts` : alias `@core` → `./src/modules/core`
5. Mettre à jour `tsconfig.app.json` : paths `@core/*` → `./src/modules/core/*`
6. Mettre à jour `vite.config.ts` coverage : `modules/core/shared/**/*.ts`
7. Mettre à jour `manualChunks` : `modules/core/shared/` et `cosmos-shared` → `core-shared`
8. Relancer `npm run dev` + `npx tsc --noEmit -p tsconfig.app.json`

### Attention

Ne **PAS** remplacer les chaînes littérales `'cosmos-angre'` dans :
- Les IDs de projet (`project.id === 'cosmos-angre'` dans `projectStore.ts`)
- Les routes (Cosmos Angré reste un projet comme un autre avec son ID)
- Les seed data / benchmarks

Ces occurrences sont des **identifiants** du projet pilote, pas des chemins de modules.

## Alias actuels (en attendant le rename)

```ts
// Préféré pour tout nouveau code :
import { ... } from '@core/shared/...'

// Ancien (reste valide) :
import { ... } from '../cosmos-angre/shared/...'
```
