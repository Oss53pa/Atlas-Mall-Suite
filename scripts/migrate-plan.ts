// ═══ CLI : npm run migrate:plan ═══
//
// Lance une migration LegacyEntity → SpatialEntity via le LegacyPlanMigrator.
//
// Usage :
//   npm run migrate:plan -- \
//     --project-id cosmos-angre \
//     --product-context mall_vol1 \
//     --mode dry_run \
//     --confidence-threshold high_only \
//     --output ./migration-reports/cosmos-angre-vol1-dryrun.json
//
// En rc.1, les LegacyEntity proviennent du dump JSON local de l'éditeur
// (export depuis /admin/geometry → "Exporter les EditableSpace pour migrator").
// La sortie est un rapport JSON + CSV review-queue + résumé Markdown.

import {
  LegacyPlanMigrator,
  MigrationHeuristics,
  type LegacyEntity,
  type ProductContext,
} from '../packages/spatial-core/src/migration'
import { GeometryCorrector, MIGRATION_CONFIG } from '../packages/spatial-core/src/domain/GeometryCorrector'
import type { SpatialEntityRepository } from '../packages/spatial-core/src/migration/LegacyPlanMigrator'
import type { SpatialEntity } from '../packages/spatial-core/src/domain/SpatialEntity'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, basename } from 'node:path'

// ─── Repository fichier (pour CLI offline) ────────────────

class FileBasedRepository implements SpatialEntityRepository {
  private legacyData: LegacyEntity[]
  private newEntities: SpatialEntity[] = []
  private migrationFlags = new Map<string, string>() // legacyId -> newEntityId

  constructor(jsonPath: string) {
    const raw = readFileSync(jsonPath, 'utf-8')
    const parsed = JSON.parse(raw)
    this.legacyData = Array.isArray(parsed) ? parsed : (parsed.entities ?? [])
  }

  async fetchLegacyEntities(_projectId: string): Promise<ReadonlyArray<LegacyEntity>> {
    return this.legacyData
  }

  async fetchNeighbors(): Promise<ReadonlyArray<SpatialEntity>> {
    // Pas de PostGIS dans le mode CLI — voisins ignorés (correction sans
    // contexte global, ce qui est acceptable pour un dry-run).
    return []
  }

  async insertSpatialEntity(entity: SpatialEntity): Promise<void> {
    this.newEntities.push(entity)
  }

  async markLegacyAsMigrated(legacyId: string, newEntityId: string): Promise<void> {
    this.migrationFlags.set(legacyId, newEntityId)
  }

  async createSnapshot(_p: string, _name: string, _data: unknown): Promise<void> {
    // No-op CLI
  }

  async loadSnapshot(): Promise<unknown> {
    return null
  }

  async deleteEntitiesByMigrationFlag(): Promise<number> {
    const n = this.newEntities.length
    this.newEntities = []
    this.migrationFlags.clear()
    return n
  }

  getNewEntities(): SpatialEntity[] {
    return [...this.newEntities]
  }
}

// ─── Args parsing ────────────────────────────────────────

interface CliArgs {
  projectId: string
  productContext: ProductContext
  mode: 'dry_run' | 'execute' | 'execute_with_rollback'
  confidenceThreshold: 'high_only' | 'medium_and_above' | 'all_with_review_flag'
  applyGeometryCorrection: boolean
  inputJson: string
  output: string
}

function parseArgs(argv: string[]): CliArgs {
  const get = (key: string): string | undefined => {
    const i = argv.indexOf(`--${key}`)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const projectId = get('project-id') ?? 'cosmos-angre'
  const productContext = (get('product-context') ?? 'mall_vol1') as ProductContext
  const mode = (get('mode') ?? 'dry_run') as CliArgs['mode']
  const confidenceThreshold = (get('confidence-threshold') ?? 'high_only') as CliArgs['confidenceThreshold']
  const applyGeometryCorrection = get('apply-geometry-correction') === 'true'
  const inputJson = get('input') ?? './migration-input/legacy-spaces.json'
  const output = get('output') ?? `./migration-reports/${projectId}-${productContext}-${mode}.json`
  return { projectId, productContext, mode, confidenceThreshold, applyGeometryCorrection, inputJson, output }
}

// ─── Main ────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  // eslint-disable-next-line no-console
  console.log(`[migrate:plan] projet=${args.projectId} contexte=${args.productContext} mode=${args.mode}`)

  const repo = new FileBasedRepository(args.inputJson)
  const migrator = new LegacyPlanMigrator(
    new MigrationHeuristics(),
    repo,
    new GeometryCorrector(MIGRATION_CONFIG),
    {
      // eslint-disable-next-line no-console
      info: (m, x) => console.log(`[migrator] ${m}`, x ?? ''),
      // eslint-disable-next-line no-console
      warn: (m, x) => console.warn(`[migrator] ${m}`, x ?? ''),
      // eslint-disable-next-line no-console
      error: (m, x) => console.error(`[migrator] ${m}`, x ?? ''),
    },
  )

  const report = await migrator.migrateProject(args.projectId, {
    mode: args.mode,
    applyGeometryCorrection: args.applyGeometryCorrection,
    confidenceThreshold: args.confidenceThreshold,
    batchSize: 50,
    pauseBetweenBatchesMs: 0, // CLI offline, pas de rate limit
    outputReportPath: args.output,
    productContext: args.productContext,
    preserveLegacyIds: true,
    notifyUserOnAmbiguity: false,
  })

  // Sortie : 3 fichiers (JSON + CSV review queue + Markdown summary)
  mkdirSync(dirname(args.output), { recursive: true })
  writeFileSync(args.output, JSON.stringify(report.toJson(), null, 2))
  const base = args.output.replace(/\.json$/, '')
  writeFileSync(`${base}-review.csv`, report.toReviewCsv())
  writeFileSync(`${base}-summary.md`, report.toMarkdown())

  report.printConsoleSummary()
  // eslint-disable-next-line no-console
  console.log(`[migrate:plan] Rapports écrits dans ${dirname(args.output)}/`)
  // eslint-disable-next-line no-console
  console.log(`  - ${basename(args.output)}`)
  // eslint-disable-next-line no-console
  console.log(`  - ${basename(`${base}-review.csv`)}`)
  // eslint-disable-next-line no-console
  console.log(`  - ${basename(`${base}-summary.md`)}`)

  // Exit code = 0 succès, 1 si erreurs critiques
  process.exit(report.errorCount > 0 ? 1 : 0)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate:plan] Erreur fatale:', err)
  process.exit(2)
})
