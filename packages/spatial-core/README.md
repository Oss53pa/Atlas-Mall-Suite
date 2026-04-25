# @atlas-studio/spatial-core

**v2.0.0** — Couche spatiale partagée Atlas Studio

Module unique pour les entités spatiales typées, la correction géométrique,
la migration legacy et le rendu 3D conditionnel. Consommé par Atlas Mall
Suite (4 volumes), WiseFM, Atlas Lease, COCKPIT, DueDeck.

## Architecture

```
domain/
├── EntityType.ts                       27 types CORE
├── EntityTypeMetadata.ts               80+ types avec metadata
├── SpatialEntity.ts                    modèle de données
├── MaterialRegistry.ts                 50+ matériaux PBR
├── GeometryCorrector.ts                pipeline 6 étapes
└── extensions/
    ├── mall-vol1-operations.ts         Vol.1 (boutiques, lots)
    ├── mall-vol2-safety.ts             Vol.2 APSAD R82 (RIA, désenfumage)
    ├── mall-vol3-experience.ts         Vol.3 (heatmap, capteurs)
    ├── mall-vol4-wayfinder.ts          Vol.4 (totems, marqueurs PMR)
    ├── wisefm-equipment.ts             WiseFM CMMS
    └── atlas-lease-leasing.ts          Atlas Lease GLA/SU/SP

persistence/
├── DataAdapter.ts                      interface
├── spatialEntityStore.ts               Zustand factory par projectId
└── SupabaseRepository.ts               implémentation Supabase + PostGIS

migration/
├── MigrationHeuristics.ts              11 règles + pré-passe produit
├── MigrationReport.ts                  JSON / CSV / Markdown
└── LegacyPlanMigrator.ts               dry_run / execute / rollback

tools/
└── DrawingToolRegistry.ts              60+ outils typés

rendering/
├── sceneDispatcher.ts                  10 stratégies de rendu
└── components/
    ├── SceneRenderer.tsx               dispatcher React Three Fiber
    ├── WallExtrusion.tsx               murs verticaux
    ├── FlatSurface.tsx                 sols plats
    ├── LowVolumeExtrusion.tsx          terre-pleins, jardinières
    ├── TreeInstance.tsx                arbres stylisés
    ├── PointInstance.tsx               mobilier ponctuel
    ├── WayfinderInstance.tsx           totems Vol.4
    ├── SafetyMarkerInstance.tsx        RIA / extincteur Vol.2
    └── EquipmentInstance.tsx           équipements WiseFM

proph3t/
├── proph3tAdvise.ts                    Mode A — propose alignements
└── proph3tAudit.ts                     Mode D — audit du plan
```

## Utilisation rapide

### Définir un nouvel espace

```ts
import { CoreEntityType, getEntityMetadata } from '@atlas-studio/spatial-core'

const meta = getEntityMetadata(CoreEntityType.PEDESTRIAN_PATH)
// → { defaultExtrusion: { enabled: false, height: 0.02, baseElevation: 0 },
//     defaultMaterial: 'paved_stone', mergeWithSameType: true, ... }
```

### Corriger un polygone tracé à main levée

```ts
import { GeometryCorrector, RC0_AGGRESSIVE_CONFIG } from '@atlas-studio/spatial-core'

const corrector = new GeometryCorrector(RC0_AGGRESSIVE_CONFIG)
const corrected = corrector.correctEntity(myEntity, neighborEntities)
// → entity avec correctionAuditTrail enrichi
```

### Migrer un plan legacy

```bash
npm run migrate:plan -- \
  --project-id cosmos-angre \
  --product-context mall_vol1 \
  --mode dry_run \
  --confidence-threshold high_only \
  --input ./migration-input/legacy.json \
  --output ./migration-reports/dryrun.json
```

### Rendre la scène 3D

```tsx
import { Canvas } from '@react-three/fiber'
import { SceneRenderer } from '@atlas-studio/spatial-core'

<Canvas>
  <ambientLight intensity={0.6} />
  <directionalLight position={[10, 20, 10]} castShadow />
  <SceneRenderer entities={mySpatialEntities} />
</Canvas>
```

### Audit d'un plan

```ts
import { auditPlan } from '@atlas-studio/spatial-core'

const report = auditPlan(spatialEntities, 'cosmos-angre')
// → { findings: [...], glaSqm: 12500, summary: '... critical, ... warning(s)' }
```

## Conventions

- **Coordonnées** : mètres float in-app, mm entiers en base Supabase
- **Z-up** : axe vertical = Y dans la scène 3D, Z dans la base
- **Géométries** : Polygon (outer + holes) | Polyline (points + closed) | Point
- **PROPH3T** : ne génère JAMAIS de coordonnées. Modes A (advise), B
  (classify), D (audit) uniquement.

## Tests

```bash
npm run test  # vitest
```

24/24 tests spatial-core verts (rc.1).
