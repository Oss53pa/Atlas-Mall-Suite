// ═══ PLAN VERSIONING ENGINE — Snapshots, diff, revert ═══
//
// Chaque modification significative d'un plan (renommage d'espace, ajout
// d'annotation, repositionnement, changement de statut commercial…) peut
// créer une nouvelle version.
//
// Modèle :
//   - PlanVersion = snapshot immuable du ParsedPlan + méta (auteur, date, motif)
//   - PlanVersionEntry (journal) = une ligne dans la timeline d'un plan
//   - Stockage : IndexedDB via Dexie (séparé de plansLibrary pour ne pas
//     gonfler la vue bibliothèque)
//   - Diff : comparaison champ-à-champ de deux versions → résumé lisible
//   - Revert : replace le ParsedPlan courant par le snapshot choisi

import Dexie, { type Table } from 'dexie'
import type { ParsedPlan } from '../planReader/planEngineTypes'
import { syncToCloud, getActiveProjectId, pullPlanVersions, deletePlanVersionCloud } from './supabaseVersioningSync'

// ─── Types ────────────────────────────────────────────────

export interface PlanVersion {
  /** ID unique de la version (UUID). */
  id: string
  /** ID du plan source dans plansLibrary (stable entre versions). */
  planId: string
  /** Numéro incrémental (1, 2, 3…) lisible humainement. */
  versionNumber: number
  /** Snapshot complet du ParsedPlan à ce moment. */
  snapshot: ParsedPlan
  /** Métadonnées de la version. */
  author: string
  authorEmail?: string
  /** Timestamp ISO. */
  createdAt: string
  /** Message explicatif (type commit). */
  message: string
  /** Tag optionnel (ex: "v1.0 - validation DG"). */
  tag?: string
  /** Taille du snapshot sérialisé (octets) pour le monitoring. */
  sizeBytes: number
}

export type ChangeKind =
  | 'space_added' | 'space_removed' | 'space_renamed' | 'space_resized' | 'space_status_changed'
  | 'annotation_added' | 'annotation_removed' | 'annotation_edited'
  | 'layer_toggled' | 'wall_edited' | 'floor_restructured'
  | 'metadata_changed'

export interface DiffEntry {
  kind: ChangeKind
  /** ID de l'entité affectée (space id, annotation id…). */
  entityId?: string
  /** Description humaine. */
  summary: string
  /** Détails techniques (avant/après). */
  before?: unknown
  after?: unknown
}

export interface VersionDiff {
  fromVersionId: string
  toVersionId: string
  entries: DiffEntry[]
  summary: string
}

// ─── IndexedDB (Dexie) ─────────────────────────────────────

class PlanVersionsDB extends Dexie {
  versions!: Table<PlanVersion, string>
  constructor() {
    super('atlas-plan-versions')
    this.version(1).stores({
      versions: 'id, planId, versionNumber, createdAt',
    })
  }
}

const db = new PlanVersionsDB()

// ─── Création d'une version ────────────────────────────────

export interface CreateVersionInput {
  planId: string
  snapshot: ParsedPlan
  author: string
  authorEmail?: string
  message: string
  tag?: string
}

/**
 * Crée une nouvelle version du plan. Le numéro est incrémenté
 * automatiquement par rapport à la dernière version de ce planId.
 */
export async function createPlanVersion(input: CreateVersionInput): Promise<PlanVersion> {
  const last = await db.versions
    .where('planId').equals(input.planId)
    .reverse()
    .sortBy('versionNumber')
  const nextNumber = last.length > 0 ? last[0].versionNumber + 1 : 1

  const serialized = JSON.stringify(input.snapshot)
  const version: PlanVersion = {
    id: `pv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    planId: input.planId,
    versionNumber: nextNumber,
    snapshot: input.snapshot,
    author: input.author,
    authorEmail: input.authorEmail,
    createdAt: new Date().toISOString(),
    message: input.message,
    tag: input.tag,
    sizeBytes: new Blob([serialized]).size,
  }
  await db.versions.put(version)
  // Fire-and-forget cloud push (ne bloque pas si Supabase indispo)
  void syncToCloud({ kind: 'version', version, projetId: getActiveProjectId() })
  return version
}

// ─── Récupération ──────────────────────────────────────────

/** Liste les versions d'un plan, de la plus récente à la plus ancienne. */
export async function listPlanVersions(planId: string): Promise<PlanVersion[]> {
  const all = await db.versions.where('planId').equals(planId).toArray()
  return all.sort((a, b) => b.versionNumber - a.versionNumber)
}

export async function getPlanVersion(versionId: string): Promise<PlanVersion | null> {
  return (await db.versions.get(versionId)) ?? null
}

export async function deletePlanVersion(versionId: string): Promise<void> {
  await db.versions.delete(versionId)
  void deletePlanVersionCloud(versionId)
}

/** Synchronise localement les versions cloud (merge non-destructif). */
export async function pullVersionsFromCloud(planId: string): Promise<number> {
  const cloud = await pullPlanVersions(planId)
  let merged = 0
  for (const v of cloud) {
    const existing = await db.versions.get(v.id)
    if (!existing) {
      await db.versions.put(v)
      merged++
    }
  }
  return merged
}

/** Supprime toutes les versions d'un plan (attention destructif). */
export async function deleteAllVersionsForPlan(planId: string): Promise<void> {
  await db.versions.where('planId').equals(planId).delete()
}

// ─── Diff entre deux versions ──────────────────────────────

export function diffPlanVersions(from: PlanVersion, to: PlanVersion): VersionDiff {
  const entries: DiffEntry[] = []

  const fromSpaces = new Map(from.snapshot.spaces.map(s => [s.id, s]))
  const toSpaces = new Map(to.snapshot.spaces.map(s => [s.id, s]))

  // Espaces ajoutés
  for (const [id, sp] of toSpaces) {
    if (!fromSpaces.has(id)) {
      entries.push({
        kind: 'space_added', entityId: id,
        summary: `Espace ajouté : « ${sp.label} »`,
        after: { label: sp.label, type: sp.type, areaSqm: sp.areaSqm },
      })
    }
  }
  // Espaces supprimés
  for (const [id, sp] of fromSpaces) {
    if (!toSpaces.has(id)) {
      entries.push({
        kind: 'space_removed', entityId: id,
        summary: `Espace supprimé : « ${sp.label} »`,
        before: { label: sp.label, type: sp.type, areaSqm: sp.areaSqm },
      })
    }
  }
  // Espaces modifiés
  for (const [id, fromSp] of fromSpaces) {
    const toSp = toSpaces.get(id)
    if (!toSp) continue
    if (fromSp.label !== toSp.label) {
      entries.push({
        kind: 'space_renamed', entityId: id,
        summary: `Renommé : « ${fromSp.label} » → « ${toSp.label} »`,
        before: fromSp.label, after: toSp.label,
      })
    }
    // Variation d'aire > 2 % considérée comme redimensionnement
    if (Math.abs(fromSp.areaSqm - toSp.areaSqm) / Math.max(1, fromSp.areaSqm) > 0.02) {
      entries.push({
        kind: 'space_resized', entityId: id,
        summary: `Redimensionné : ${fromSp.areaSqm.toFixed(1)} → ${toSp.areaSqm.toFixed(1)} m² (« ${fromSp.label} »)`,
        before: fromSp.areaSqm, after: toSp.areaSqm,
      })
    }
    if (fromSp.type !== toSp.type) {
      entries.push({
        kind: 'space_status_changed', entityId: id,
        summary: `Type modifié : ${fromSp.type} → ${toSp.type} (« ${fromSp.label} »)`,
        before: fromSp.type, after: toSp.type,
      })
    }
  }

  // Bounds globaux (restructuration)
  if (
    Math.abs(from.snapshot.bounds.width - to.snapshot.bounds.width) > 0.5 ||
    Math.abs(from.snapshot.bounds.height - to.snapshot.bounds.height) > 0.5
  ) {
    entries.push({
      kind: 'floor_restructured',
      summary: `Bounds du plan modifiés : ${from.snapshot.bounds.width.toFixed(1)}×${from.snapshot.bounds.height.toFixed(1)} → ${to.snapshot.bounds.width.toFixed(1)}×${to.snapshot.bounds.height.toFixed(1)} m`,
    })
  }

  // Nombre de calques
  if (from.snapshot.layers.length !== to.snapshot.layers.length) {
    entries.push({
      kind: 'layer_toggled',
      summary: `Calques : ${from.snapshot.layers.length} → ${to.snapshot.layers.length}`,
    })
  }

  // Résumé global
  const added = entries.filter(e => e.kind === 'space_added').length
  const removed = entries.filter(e => e.kind === 'space_removed').length
  const modified = entries.length - added - removed
  const summary = entries.length === 0
    ? 'Aucune différence significative'
    : `${entries.length} changement${entries.length > 1 ? 's' : ''} · ${added} ajout${added > 1 ? 's' : ''}, ${removed} suppression${removed > 1 ? 's' : ''}, ${modified} modification${modified > 1 ? 's' : ''}`

  return {
    fromVersionId: from.id,
    toVersionId: to.id,
    entries,
    summary,
  }
}

// ─── Revert ────────────────────────────────────────────────

/**
 * Produit un ParsedPlan à partir d'une version historique pour revert.
 * Le caller est responsable de l'appliquer au store courant
 * (ex: `usePlanEngineStore.getState().setParsedPlan(snapshot)`).
 */
export function revertToVersion(version: PlanVersion): ParsedPlan {
  // Deep clone pour éviter de muter le snapshot stocké
  return structuredClone(version.snapshot)
}

/**
 * Restaure une version et crée automatiquement une nouvelle entrée dans
 * l'historique pour tracer le revert (pattern "revert commit").
 */
export async function revertAndRecord(
  version: PlanVersion,
  author: string,
  authorEmail?: string,
): Promise<{ restored: ParsedPlan; revertVersion: PlanVersion }> {
  const restored = revertToVersion(version)
  const revertVersion = await createPlanVersion({
    planId: version.planId,
    snapshot: restored,
    author,
    authorEmail,
    message: `Revert à la version ${version.versionNumber}${version.tag ? ` (${version.tag})` : ''} · « ${version.message} »`,
  })
  return { restored, revertVersion }
}

// ─── Stats globales ────────────────────────────────────────

export async function getPlanVersionStats(planId: string): Promise<{
  count: number
  oldestAt: string | null
  newestAt: string | null
  totalSizeBytes: number
  authors: string[]
}> {
  const all = await db.versions.where('planId').equals(planId).toArray()
  if (all.length === 0) {
    return { count: 0, oldestAt: null, newestAt: null, totalSizeBytes: 0, authors: [] }
  }
  const sorted = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return {
    count: all.length,
    oldestAt: sorted[0].createdAt,
    newestAt: sorted[sorted.length - 1].createdAt,
    totalSizeBytes: all.reduce((s, v) => s + v.sizeBytes, 0),
    authors: [...new Set(all.map(v => v.author))],
  }
}
