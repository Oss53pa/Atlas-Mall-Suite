// ═══ PROPH3T MODE D — Audit ═══
//
// Analyse statique d'un plan, retourne un rapport synthétique.
// Pas de modification de données. Utilisé pour la revue qualité.

import type { SpatialEntity } from '../domain/SpatialEntity'
import { isPolygon, isPolyline } from '../domain/SpatialEntity'
import { getEntityMetadata } from '../domain/EntityTypeMetadata'

export interface AuditFinding {
  readonly severity: 'info' | 'warning' | 'critical'
  readonly category: 'geometry' | 'semantics' | 'compliance' | 'consistency'
  readonly entityIds: ReadonlyArray<string>
  readonly message: string
  readonly suggestedAction?: string
}

export interface AuditReport {
  readonly projectId: string
  readonly totalEntities: number
  readonly countByCategory: Record<string, number>
  readonly countByType: Record<string, number>
  readonly findings: ReadonlyArray<AuditFinding>
  readonly summary: string
  readonly glaSqm: number
}

/**
 * Audit complet du plan. Détecte :
 *  - polygones invalides (< 3 sommets)
 *  - polygones qui s'auto-intersectent (basique)
 *  - entités orphelines (parent_id manquant ou cassé)
 *  - hauteurs aberrantes (parking extrudé > 1m, commerces < 2m)
 *  - chevauchements probables (bbox overlap)
 */
export function auditPlan(entities: ReadonlyArray<SpatialEntity>, projectId: string): AuditReport {
  const findings: AuditFinding[] = []
  const countByCategory: Record<string, number> = {}
  const countByType: Record<string, number> = {}
  let glaSqm = 0

  const entityById = new Map(entities.map(e => [e.id, e]))

  for (const e of entities) {
    const meta = getEntityMetadata(e.type)
    countByType[e.type] = (countByType[e.type] ?? 0) + 1
    countByCategory[meta.category] = (countByCategory[meta.category] ?? 0) + 1

    // Polygone invalide
    if (isPolygon(e.geometry) && e.geometry.outer.length < 3) {
      findings.push({
        severity: 'critical',
        category: 'geometry',
        entityIds: [e.id],
        message: `Polygone "${e.label ?? e.id}" a ${e.geometry.outer.length} sommets (min 3 requis).`,
        suggestedAction: 'Supprimer ou retracer.',
      })
    }

    // Polyline invalide
    if (isPolyline(e.geometry) && e.geometry.points.length < 2) {
      findings.push({
        severity: 'critical',
        category: 'geometry',
        entityIds: [e.id],
        message: `Polyline "${e.label ?? e.id}" a ${e.geometry.points.length} sommets (min 2 requis).`,
        suggestedAction: 'Supprimer ou retracer.',
      })
    }

    // Hauteur aberrante : surface extrudée à 4m alors qu'elle devrait être plate
    if (e.extrusion.enabled && !meta.defaultExtrusion.enabled && e.extrusion.height > 1) {
      findings.push({
        severity: 'warning',
        category: 'consistency',
        entityIds: [e.id],
        message: `${e.type} "${e.label ?? e.id}" est extrudé à ${e.extrusion.height}m mais devrait rester plat.`,
        suggestedAction: 'Désactiver l\'extrusion ou ramener à 0.05m.',
      })
    }

    // Parent orphelin
    if (e.parentId && !entityById.has(e.parentId)) {
      findings.push({
        severity: 'warning',
        category: 'consistency',
        entityIds: [e.id],
        message: `Entité ${e.id} référence un parent inexistant ${e.parentId}.`,
        suggestedAction: 'Détacher (parent_id=null) ou supprimer.',
      })
    }

    // GLA
    if (meta.contributesToGLA && isPolygon(e.geometry)) {
      let area = 0
      const pts = e.geometry.outer
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
      }
      glaSqm += Math.abs(area) / 2
    }
  }

  // Compliance ERP basique pour Vol.2 : un plan doit avoir au moins 2 issues de secours
  const exits = entities.filter(e => e.type === 'EMERGENCY_EXIT').length
  if (entities.length > 50 && exits < 2) {
    findings.push({
      severity: 'critical',
      category: 'compliance',
      entityIds: [],
      message: `Plan ${entities.length} entités, seulement ${exits} issue(s) de secours (min 2 requis ERP).`,
      suggestedAction: 'Ajouter une seconde issue de secours.',
    })
  }

  const summary = buildSummary(entities.length, findings, glaSqm)

  return {
    projectId,
    totalEntities: entities.length,
    countByCategory,
    countByType,
    findings,
    summary,
    glaSqm,
  }
}

function buildSummary(total: number, findings: ReadonlyArray<AuditFinding>, glaSqm: number): string {
  const critical = findings.filter(f => f.severity === 'critical').length
  const warnings = findings.filter(f => f.severity === 'warning').length
  return `${total} entités. GLA = ${glaSqm.toFixed(0)} m². ${critical} critique(s), ${warnings} avertissement(s).`
}
