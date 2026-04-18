// ═══ PARSED PLAN CACHE — Persiste le plan parsé en IndexedDB ═══
// Le ParsedPlan peut être volumineux (10MB+ pour un gros DXF) donc pas stockable
// directement en localStorage. On le sérialise en IndexedDB via Dexie.
// À chaque navigation entre volumes / refresh, on recharge automatiquement.

import Dexie, { type Table } from 'dexie'
import type { ParsedPlan } from '../planReader/planEngineTypes'

interface PlanRecord {
  id: string // 'current' pour l'unique plan actif
  parsedPlan: ParsedPlan
  savedAt: string
}

class ParsedPlanDB extends Dexie {
  current!: Table<PlanRecord, string>
  constructor() {
    super('atlas-parsed-plan-cache')
    this.version(1).stores({ current: 'id, savedAt' })
  }
}

const db = new ParsedPlanDB()

export async function savePlanToCache(plan: ParsedPlan): Promise<void> {
  try {
    // Strip blob: URLs — ils meurent au refresh page (ERR_FILE_NOT_FOUND).
    // Les images persistantes passent par planImageCache (IndexedDB + Blob).
    const rec = plan as ParsedPlan & { imageUrl?: string }
    const stripped: ParsedPlan = rec.imageUrl?.startsWith('blob:')
      ? { ...plan, imageUrl: undefined } as ParsedPlan
      : plan
    await db.current.put({
      id: 'current',
      parsedPlan: stripped,
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
    // Defense en profondeur : strip tout blob URL residuel des anciens caches.
    const plan = rec.parsedPlan as ParsedPlan & { imageUrl?: string }
    if (plan.imageUrl?.startsWith('blob:')) {
      return { ...plan, imageUrl: undefined } as ParsedPlan
    }
    return plan
  } catch (err) {
    console.warn('[parsedPlanCache] load failed', err)
    return null
  }
}

export async function clearPlanCache(): Promise<void> {
  try { await db.current.clear() } catch { /* */ }
}
