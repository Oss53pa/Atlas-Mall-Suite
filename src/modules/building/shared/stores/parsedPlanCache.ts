// ═══ PARSED PLAN CACHE — Persiste le plan parsé en IndexedDB ═══
// Le ParsedPlan peut être volumineux (10MB+ pour un gros DXF) donc pas stockable
// directement en localStorage. On le sérialise en IndexedDB via Dexie.
//
// Deux APIs :
//   • Legacy (table `current`) : 1 seul plan "actif" rechargé au boot
//   • Multi (table `byImport`)  : N plans indexés par importId — permet de
//     conserver tous les imports entre refreshes pour le sélecteur de
//     SpaceEditorSection. v2 (2026-04-22).

import Dexie, { type Table } from 'dexie'
import type { ParsedPlan } from '../planReader/planEngineTypes'

interface PlanRecord {
  id: string // 'current' pour l'unique plan actif
  parsedPlan: ParsedPlan
  savedAt: string
}

interface ImportPlanRecord {
  importId: string
  parsedPlan: ParsedPlan
  savedAt: string
  /** Taille en octets de la sérialisation — sert au cleanup. */
  sizeBytes: number
}

class ParsedPlanDB extends Dexie {
  current!: Table<PlanRecord, string>
  byImport!: Table<ImportPlanRecord, string>
  constructor() {
    super('atlas-parsed-plan-cache')
    // v1 : table `current` uniquement
    this.version(1).stores({ current: 'id, savedAt' })
    // v2 : ajoute table `byImport` pour le multi-plans
    this.version(2).stores({
      current:  'id, savedAt',
      byImport: 'importId, savedAt',
    })
  }
}

const db = new ParsedPlanDB()

// ─── API legacy : plan actif unique ────────────────────────

/**
 * Nettoie un ParsedPlan de TOUS ses blob URLs morts avant persistence.
 * Les blob:// ne survivent pas au refresh de la page → doivent être strippés
 * pour éviter ERR_FILE_NOT_FOUND à la lecture de cache.
 *
 * Champs concernés (ParsedPlan) :
 *   • planImageUrl      → image rendue du plan
 *   • dxfBlobUrl        → blob du fichier DXF pour WebGL viewer
 *   • imageUrl (legacy) → ancien champ image
 */
function stripBlobUrls(plan: ParsedPlan): ParsedPlan {
  const p = plan as ParsedPlan & { imageUrl?: string }
  const needsStrip =
    p.imageUrl?.startsWith('blob:') ||
    p.planImageUrl?.startsWith('blob:') ||
    p.dxfBlobUrl?.startsWith('blob:')

  if (!needsStrip) return plan

  const cleaned = { ...plan } as ParsedPlan & { imageUrl?: string }
  if (cleaned.imageUrl?.startsWith('blob:'))      cleaned.imageUrl = undefined
  if (cleaned.planImageUrl?.startsWith('blob:'))  cleaned.planImageUrl = undefined
  if (cleaned.dxfBlobUrl?.startsWith('blob:'))    cleaned.dxfBlobUrl = undefined
  return cleaned
}

export async function savePlanToCache(plan: ParsedPlan): Promise<void> {
  try {
    await db.current.put({
      id: 'current',
      parsedPlan: stripBlobUrls(plan),
      savedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[parsedPlanCache] save failed', err)
  }
}

export async function loadPlanFromCache(): Promise<ParsedPlan | null> {
  try {
    const rec = await db.current.get('current')
    if (!rec?.parsedPlan) return null
    return stripBlobUrls(rec.parsedPlan)
  } catch (err) {
    console.warn('[parsedPlanCache] load failed', err)
    return null
  }
}

export async function clearPlanCache(): Promise<void> {
  try {
    await db.current.clear()
    await db.byImport.clear()
  } catch { /* */ }
}

// ─── API multi-imports (v2) ────────────────────────────────

/**
 * Sauvegarde un ParsedPlan associé à un importId.
 * Ces plans sont rechargés au boot par `loadAllImportPlans()` pour
 * alimenter le sélecteur d'import de SpaceEditorSection.
 */
export async function saveImportPlan(importId: string, plan: ParsedPlan): Promise<void> {
  try {
    const stripped = stripBlobUrls(plan)
    const serialized = JSON.stringify(stripped)
    await db.byImport.put({
      importId,
      parsedPlan: stripped,
      savedAt: new Date().toISOString(),
      sizeBytes: new Blob([serialized]).size,
    })
  } catch (err) {
    console.warn('[parsedPlanCache] saveImportPlan failed', err)
  }
}

/** Charge tous les plans indexés par importId (utilisé au boot). */
export async function loadAllImportPlans(): Promise<Record<string, ParsedPlan>> {
  try {
    const all = await db.byImport.toArray()
    const map: Record<string, ParsedPlan> = {}
    for (const rec of all) {
      if (rec.parsedPlan) map[rec.importId] = stripBlobUrls(rec.parsedPlan)
    }
    return map
  } catch (err) {
    console.warn('[parsedPlanCache] loadAllImportPlans failed', err)
    return {}
  }
}

/** Supprime un plan import spécifique. */
export async function deleteImportPlan(importId: string): Promise<void> {
  try {
    await db.byImport.delete(importId)
  } catch { /* */ }
}

/** Stats pour monitoring : nombre + taille totale. */
export async function getImportPlansStats(): Promise<{
  count: number
  totalSizeBytes: number
  oldestAt: string | null
}> {
  try {
    const all = await db.byImport.toArray()
    if (all.length === 0) return { count: 0, totalSizeBytes: 0, oldestAt: null }
    return {
      count: all.length,
      totalSizeBytes: all.reduce((s, r) => s + (r.sizeBytes ?? 0), 0),
      oldestAt: all.reduce((min, r) => !min || r.savedAt < min ? r.savedAt : min, null as string | null),
    }
  } catch {
    return { count: 0, totalSizeBytes: 0, oldestAt: null }
  }
}

/** Purge les plans import > N jours pour éviter la saturation IDB. */
export async function pruneOldImportPlans(maxAgeDays = 90): Promise<number> {
  try {
    const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString()
    const old = await db.byImport.where('savedAt').below(cutoff).toArray()
    await db.byImport.where('savedAt').below(cutoff).delete()
    return old.length
  } catch {
    return 0
  }
}
