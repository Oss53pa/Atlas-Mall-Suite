// ═══ LEGACY PLAN MIGRATOR — orchestrateur ═══
//
// Convertit des entités legacy (EditableSpace en pratique) vers le format
// SpatialEntity moderne avec heuristiques + audit + rollback.
//
// 3 modes :
//   • dry_run                 — calcule tout sans écrire en base
//   • execute                 — écrit en base, pas de snapshot
//   • execute_with_rollback   — snapshot + écrit, rollback possible

import type { SpatialEntity } from '../domain/SpatialEntity'
import { genSpatialEntityId, nowIso } from '../domain/SpatialEntity'
import { getEntityMetadata } from '../domain/EntityTypeMetadata'
import { GeometryCorrector, MIGRATION_CONFIG } from '../domain/GeometryCorrector'
import {
  MigrationHeuristics,
  type LegacyEntity,
  type ClassificationResult,
  type Confidence,
} from './MigrationHeuristics'
import { MigrationReport, type MigrationOptions } from './MigrationReport'

// ─── Repository abstraction ───────────────────────────────

export interface SpatialEntityRepository {
  fetchLegacyEntities(projectId: string): Promise<ReadonlyArray<LegacyEntity>>
  fetchNeighbors(projectId: string, level: string, geometry: unknown, maxDistanceM: number): Promise<ReadonlyArray<SpatialEntity>>
  insertSpatialEntity(entity: SpatialEntity): Promise<void>
  markLegacyAsMigrated(legacyId: string, newEntityId: string): Promise<void>
  createSnapshot(projectId: string, snapshotName: string, data: unknown): Promise<void>
  loadSnapshot(projectId: string, snapshotName: string): Promise<unknown>
  deleteEntitiesByMigrationFlag(projectId: string): Promise<number>
}

// ─── Logger abstraction ───────────────────────────────────

export interface MigrationLogger {
  info(msg: string, meta?: unknown): void
  warn(msg: string, meta?: unknown): void
  error(msg: string, meta?: unknown): void
}

export const consoleLogger: MigrationLogger = {
  // eslint-disable-next-line no-console
  info: (m, x) => console.info(`[migrator] ${m}`, x ?? ''),
  // eslint-disable-next-line no-console
  warn: (m, x) => console.warn(`[migrator] ${m}`, x ?? ''),
  // eslint-disable-next-line no-console
  error: (m, x) => console.error(`[migrator] ${m}`, x ?? ''),
}

// ─── Migrator ─────────────────────────────────────────────

export class LegacyPlanMigrator {
  constructor(
    private readonly heuristics: MigrationHeuristics,
    private readonly repository: SpatialEntityRepository,
    private readonly corrector: GeometryCorrector,
    private readonly logger: MigrationLogger,
  ) {}

  async migrateProject(
    projectId: string,
    options: MigrationOptions,
  ): Promise<MigrationReport> {
    const report = new MigrationReport(projectId, options)
    this.logger.info(`Démarrage migration projet=${projectId} mode=${options.mode}`)

    // 1. Snapshot si rollback demandé
    if (options.mode === 'execute_with_rollback') {
      const legacy = await this.repository.fetchLegacyEntities(projectId)
      await this.repository.createSnapshot(
        projectId,
        options.rollbackTablePath ?? `auto-${Date.now()}`,
        legacy,
      )
      this.logger.info(`Snapshot créé : ${legacy.length} entités legacy capturées`)
    }

    // 2. Charge legacy
    const legacyEntities = await this.repository.fetchLegacyEntities(projectId)
    report.totalLegacyEntities = legacyEntities.length
    report.totalAreaBefore = this.computeTotalArea(legacyEntities)

    // 3. Migration en batches
    const totalAreaAfterAcc: number[] = []
    for (let i = 0; i < legacyEntities.length; i += options.batchSize) {
      const batch = legacyEntities.slice(i, i + options.batchSize)
      for (const legacy of batch) {
        const area = await this.migrateOneEntity(legacy, options, report)
        if (area !== null) totalAreaAfterAcc.push(area)
      }
      if (options.pauseBetweenBatchesMs > 0) {
        await this.sleep(options.pauseBetweenBatchesMs)
      }
    }
    report.totalAreaAfter = totalAreaAfterAcc.reduce((s, a) => s + a, 0)

    // 4. Finalise
    report.finalize()
    this.logger.info(`Migration terminée — ✅ ${report.successCount}, ⚠️ ${report.flaggedForReviewCount}, ❌ ${report.errorCount}`)
    return report
  }

  private async migrateOneEntity(
    legacy: LegacyEntity,
    options: MigrationOptions,
    report: MigrationReport,
  ): Promise<number | null> {
    try {
      const classification = this.heuristics.classify(legacy, options.productContext)
      report.recordClassification(legacy.id, classification)

      if (!this.passesThreshold(classification.confidence, options.confidenceThreshold)) {
        report.flagForManualReview(legacy.id, classification)
        return null
      }

      let newEntity = this.buildSpatialEntity(legacy, classification)

      if (options.applyGeometryCorrection) {
        const neighbors = await this.repository.fetchNeighbors(
          legacy.projectId, legacy.level ?? 'rdc', legacy.geometry, 5.0,
        )
        newEntity = this.corrector.correctEntity(newEntity, neighbors)
      }

      if (options.mode !== 'dry_run') {
        await this.repository.insertSpatialEntity(newEntity)
        await this.repository.markLegacyAsMigrated(legacy.id, newEntity.id)
      }

      report.recordSuccess(legacy.id, newEntity.id, classification)
      return this.computeArea(legacy)
    } catch (err) {
      report.recordError(legacy.id, err)
      this.logger.error(`Erreur migration ${legacy.id}`, err)
      return null
    }
  }

  /** Construit un SpatialEntity à partir d'une legacy + classification. */
  private buildSpatialEntity(legacy: LegacyEntity, classification: ClassificationResult): SpatialEntity {
    const meta = getEntityMetadata(classification.newType)
    return {
      id: genSpatialEntityId(),
      projectId: legacy.projectId,
      type: classification.newType,
      level: legacy.level ?? 'rdc',
      geometry: legacy.geometry,
      extrusion: { ...meta.defaultExtrusion },
      material: meta.defaultMaterial,
      snapBehavior: meta.snapBehavior,
      mergeWithNeighbors: meta.mergeWithSameType,
      childrenIds: [],
      label: legacy.label,
      notes: legacy.notes,
      customProperties: {},
      createdAt: legacy.createdAt,
      updatedAt: nowIso(),
      createdBy: 'migrator',
      isAutoCorrected: false,
      correctionAuditTrail: [],
      migrationMetadata: {
        migratedFromLegacyId: legacy.id,
        migrationDate: nowIso(),
        migrationConfidence: classification.confidence,
        legacyType: legacy.type,
        heuristicApplied: classification.heuristicApplied,
      },
    }
  }

  /** Détermine si une confiance passe le threshold configuré. */
  private passesThreshold(c: Confidence, threshold: MigrationOptions['confidenceThreshold']): boolean {
    if (threshold === 'all_with_review_flag') return true
    if (threshold === 'high_only') return c === 'high'
    if (threshold === 'medium_and_above') return c === 'high' || c === 'medium'
    return false
  }

  // ─── ROLLBACK ─────────────────────────────────────────

  async rollback(projectId: string, snapshotName: string): Promise<{ restored: number; deleted: number }> {
    this.logger.info(`Rollback projet=${projectId} snapshot=${snapshotName}`)
    const snapshot = await this.repository.loadSnapshot(projectId, snapshotName)
    if (!snapshot) {
      throw new Error(`Snapshot introuvable : ${snapshotName}`)
    }
    const deleted = await this.repository.deleteEntitiesByMigrationFlag(projectId)
    // La restauration des entités legacy elle-même dépend de l'implémentation
    // du repository (les marquer comme non migrées). Ici on retourne juste
    // le compte des nouvelles entités supprimées.
    const legacy = (snapshot as ReadonlyArray<unknown>) ?? []
    return { restored: legacy.length, deleted }
  }

  // ─── Helpers ──────────────────────────────────────────

  private computeTotalArea(legacy: ReadonlyArray<LegacyEntity>): number {
    let s = 0
    for (const l of legacy) s += this.computeArea(l) ?? 0
    return s
  }

  private computeArea(l: LegacyEntity): number | null {
    if (!('outer' in l.geometry)) return null
    const pts = l.geometry.outer
    if (pts.length < 3) return 0
    let sum = 0
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length
      sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y
    }
    return Math.abs(sum) / 2
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }
}

// ─── Factory de commodité ─────────────────────────────────

export function createDefaultMigrator(repository: SpatialEntityRepository): LegacyPlanMigrator {
  return new LegacyPlanMigrator(
    new MigrationHeuristics(),
    repository,
    new GeometryCorrector(MIGRATION_CONFIG),
    consoleLogger,
  )
}
