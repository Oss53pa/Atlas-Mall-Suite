// ═══ MIGRATION REPORT — Audit JSON / CSV / Markdown ═══

import type { ClassificationResult } from './MigrationHeuristics'

export interface MigrationOptions {
  readonly mode: 'dry_run' | 'execute' | 'execute_with_rollback'
  readonly applyGeometryCorrection: boolean
  readonly confidenceThreshold: 'high_only' | 'medium_and_above' | 'all_with_review_flag'
  readonly batchSize: number
  readonly pauseBetweenBatchesMs: number
  readonly outputReportPath: string
  readonly rollbackTablePath?: string
  readonly productContext: 'mall_vol1' | 'mall_vol2' | 'mall_vol3' | 'mall_vol4' | 'wisefm' | 'atlas_lease'
  readonly preserveLegacyIds: boolean
  readonly notifyUserOnAmbiguity: boolean
}

export interface SuccessRecord {
  readonly legacyId: string
  readonly newEntityId: string
  readonly classification: ClassificationResult
}

export interface ReviewRecord {
  readonly legacyId: string
  readonly classification: ClassificationResult
}

export interface ErrorRecord {
  readonly legacyId: string
  readonly error: string
  readonly stack?: string
}

export class MigrationReport {
  readonly projectId: string
  readonly options: MigrationOptions
  readonly startTime: string
  endTime?: string

  totalLegacyEntities = 0
  successCount = 0
  flaggedForReviewCount = 0
  errorCount = 0

  classifications = new Map<string, ClassificationResult>()
  successes: SuccessRecord[] = []
  flaggedForReview: ReviewRecord[] = []
  errors: ErrorRecord[] = []

  countByNewType: Record<string, number> = {}
  countByConfidence: Record<string, number> = {}

  totalAreaBefore = 0
  totalAreaAfter = 0
  areaPreservationRatio = 1.0

  constructor(projectId: string, options: MigrationOptions) {
    this.projectId = projectId
    this.options = options
    this.startTime = new Date().toISOString()
  }

  recordClassification(legacyId: string, c: ClassificationResult): void {
    this.classifications.set(legacyId, c)
    this.countByConfidence[c.confidence] = (this.countByConfidence[c.confidence] ?? 0) + 1
  }

  recordSuccess(legacyId: string, newEntityId: string, c: ClassificationResult): void {
    this.successes.push({ legacyId, newEntityId, classification: c })
    this.successCount++
    this.countByNewType[c.newType] = (this.countByNewType[c.newType] ?? 0) + 1
  }

  flagForManualReview(legacyId: string, c: ClassificationResult): void {
    this.flaggedForReview.push({ legacyId, classification: c })
    this.flaggedForReviewCount++
  }

  recordError(legacyId: string, err: unknown): void {
    const e = err as Error
    this.errors.push({ legacyId, error: e?.message ?? String(err), stack: e?.stack })
    this.errorCount++
  }

  finalize(): void {
    this.endTime = new Date().toISOString()
    if (this.totalAreaBefore > 0) {
      this.areaPreservationRatio = this.totalAreaAfter / this.totalAreaBefore
    }
  }

  // ─── Sérialisation ─────────────────────────────────────

  toJson(): object {
    return {
      projectId: this.projectId,
      options: this.options,
      startTime: this.startTime,
      endTime: this.endTime,
      totals: {
        totalLegacyEntities: this.totalLegacyEntities,
        successCount: this.successCount,
        flaggedForReviewCount: this.flaggedForReviewCount,
        errorCount: this.errorCount,
      },
      countByConfidence: this.countByConfidence,
      countByNewType: this.countByNewType,
      areaPreservation: {
        totalAreaBefore: this.totalAreaBefore,
        totalAreaAfter: this.totalAreaAfter,
        ratio: this.areaPreservationRatio,
      },
      successes: this.successes,
      flaggedForReview: this.flaggedForReview,
      errors: this.errors,
    }
  }

  /** CSV de la review queue : 1 ligne par entité à revoir manuellement. */
  toReviewCsv(): string {
    const lines: string[] = ['legacyId,suggestedType,confidence,heuristic,reasoning,alternatives']
    for (const r of this.flaggedForReview) {
      const alts = r.classification.alternativeTypes.map(a => `${a.type}:${a.confidence}`).join('|')
      const reasoning = r.classification.reasoning.replace(/"/g, '""')
      lines.push(
        `${r.legacyId},${r.classification.newType},${r.classification.confidence},` +
        `${r.classification.heuristicApplied},"${reasoning}",${alts}`,
      )
    }
    return lines.join('\n')
  }

  /** Résumé Markdown lisible. */
  toMarkdown(): string {
    const ok = this.successCount, rev = this.flaggedForReviewCount, err = this.errorCount
    const total = this.totalLegacyEntities
    const okPct = total > 0 ? ((ok / total) * 100).toFixed(1) : '0.0'
    const ratio = (this.areaPreservationRatio * 100).toFixed(2)

    const topTypes = Object.entries(this.countByNewType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([t, n]) => `- \`${t}\` : ${n}`)
      .join('\n')

    return `# Migration Report — ${this.projectId}

**Mode** : \`${this.options.mode}\` · **Contexte** : \`${this.options.productContext}\`
**Début** : ${this.startTime} · **Fin** : ${this.endTime ?? 'en cours'}

## Totaux

| Statut | Nombre | % |
|---|---:|---:|
| ✅ Migrés avec succès | ${ok} | ${okPct}% |
| ⚠️ À revoir manuellement | ${rev} | ${total > 0 ? ((rev / total) * 100).toFixed(1) : '0.0'}% |
| ❌ Erreurs | ${err} | ${total > 0 ? ((err / total) * 100).toFixed(1) : '0.0'}% |
| **Total** | **${total}** | 100% |

## Confiance des classifications

${Object.entries(this.countByConfidence).map(([c, n]) => `- **${c}** : ${n}`).join('\n')}

## Top 10 types affectés

${topTypes || '_aucun_'}

## Préservation des surfaces

- Avant : ${this.totalAreaBefore.toFixed(2)} m²
- Après : ${this.totalAreaAfter.toFixed(2)} m²
- **Ratio** : ${ratio}% _(idéal : 99–101%)_

${err > 0 ? `\n## Erreurs (${err})\n\n${this.errors.slice(0, 10).map(e => `- \`${e.legacyId}\` : ${e.error}`).join('\n')}` : ''}
`
  }

  printConsoleSummary(): void {
    const ok = this.successCount, rev = this.flaggedForReviewCount, err = this.errorCount
    const ratio = (this.areaPreservationRatio * 100).toFixed(2)
    // eslint-disable-next-line no-console
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  MIGRATION REPORT — ${this.projectId.padEnd(40, ' ')}║
╠══════════════════════════════════════════════════════════════╣
║  Total entités legacy   : ${String(this.totalLegacyEntities).padEnd(34, ' ')}║
║  ✅ Migrées avec succès : ${String(ok).padEnd(34, ' ')}║
║  ⚠️  À revoir manuellement: ${String(rev).padEnd(33, ' ')}║
║  ❌ Erreurs              : ${String(err).padEnd(34, ' ')}║
║  Préservation surface   : ${ratio.padEnd(34, ' ')}║
╚══════════════════════════════════════════════════════════════╝
`)
  }
}
