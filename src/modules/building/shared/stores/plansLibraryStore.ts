// ═══ PLANS LIBRARY — Bibliothèque de plans sauvegardés (IndexedDB) ═══
// Permet à l'utilisateur de :
//  - Sauvegarder un plan (complet ou 1 étage isolé) avec nom + métadonnées
//  - Reconsulter / re-charger un plan sauvegardé à tout moment
//  - Exporter / importer entre machines (JSON)

import Dexie, { type Table } from 'dexie'
import type { ParsedPlan, DetectedFloor } from '../planReader/planEngineTypes'

export interface SavedPlanRecord {
  id: string
  name: string
  description?: string
  tags?: string[]
  /** Plan complet ou extrait 1 étage. */
  kind: 'full' | 'floor-extract'
  /** Si floor-extract : floorId d'origine. */
  sourceFloorId?: string
  /** Si floor-extract : bounds de l'étage dans le plan d'origine. */
  sourceFloorBounds?: DetectedFloor['bounds']
  /** Plan parsé complet (espaces, murs, calques, etc.). */
  parsedPlan: ParsedPlan
  /** Thumbnail PNG dataURL pour la vue bibliothèque. */
  thumbnailDataUrl?: string
  /** Blob du fichier DXF source (si encore disponible). */
  dxfBlob?: Blob
  savedAt: string
  lastAccessedAt: string
  /** Compteur d'accès (pour tri "récents"). */
  accessCount: number
}

class PlansLibraryDB extends Dexie {
  plans!: Table<SavedPlanRecord, string>
  constructor() {
    super('atlas-plans-library')
    this.version(1).stores({
      plans: 'id, name, kind, savedAt, lastAccessedAt',
    })
  }
}

const db = new PlansLibraryDB()

/**
 * Retire les blob: URLs d'un ParsedPlan. Ces URLs meurent au refresh de la
 * page → elles ne doivent jamais être persistées. Concerne planImageUrl,
 * dxfBlobUrl et le champ legacy imageUrl.
 */
function stripBlobsFromPlan(plan: ParsedPlan): ParsedPlan {
  const p = plan as ParsedPlan & { imageUrl?: string }
  const cleaned = { ...plan } as ParsedPlan & { imageUrl?: string }
  if (p.imageUrl?.startsWith('blob:'))      cleaned.imageUrl = undefined
  if (p.planImageUrl?.startsWith('blob:'))  cleaned.planImageUrl = undefined
  if (p.dxfBlobUrl?.startsWith('blob:'))    cleaned.dxfBlobUrl = undefined
  return cleaned
}

// ─── API ───────────────────────────────────────────────────

export async function savePlan(record: Omit<SavedPlanRecord, 'savedAt' | 'lastAccessedAt' | 'accessCount'>): Promise<void> {
  const now = new Date().toISOString()
  await db.plans.put({
    ...record,
    parsedPlan: stripBlobsFromPlan(record.parsedPlan),
    savedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  })
}

export async function updatePlanMeta(id: string, patch: Partial<Pick<SavedPlanRecord, 'name' | 'description' | 'tags' | 'thumbnailDataUrl'>>): Promise<void> {
  const existing = await db.plans.get(id)
  if (!existing) return
  await db.plans.put({ ...existing, ...patch })
}

export async function loadPlan(id: string): Promise<SavedPlanRecord | null> {
  const plan = await db.plans.get(id)
  if (!plan) return null
  // Bump access metrics
  await db.plans.put({
    ...plan,
    lastAccessedAt: new Date().toISOString(),
    accessCount: plan.accessCount + 1,
  })
  // Strip par sécurité : couvre les enregistrements legacy v1 écrits avant
  // l'ajout du stripping côté savePlan.
  return { ...plan, parsedPlan: stripBlobsFromPlan(plan.parsedPlan) }
}

export async function deletePlan(id: string): Promise<void> {
  await db.plans.delete(id)
}

export async function listPlans(): Promise<SavedPlanRecord[]> {
  const all = await db.plans.toArray()
  return all.sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
}

export async function countPlans(): Promise<number> {
  return db.plans.count()
}

// ─── Extract single floor from a multi-floor plan ─────────

/** Extrait un étage d'un plan multi-étages en un nouveau ParsedPlan autonome. */
export function extractFloor(
  fullPlan: ParsedPlan,
  floorId: string,
): ParsedPlan | null {
  const floor = fullPlan.detectedFloors?.find(f => f.id === floorId)
  if (!floor) return null

  const b = floor.bounds
  const inFloor = (x: number, y: number) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY

  // Filtre espaces de cet étage
  const spaces = fullPlan.spaces.filter(sp => sp.floorId === floorId || inFloor(sp.bounds.centerX, sp.bounds.centerY))
  // Filtre murs
  const walls = fullPlan.wallSegments.filter(w =>
    w.floorId === floorId ||
    (inFloor(w.x1, w.y1) && inFloor(w.x2, w.y2))
  )
  // Filtre dimensions
  const dims = (fullPlan.dimensions ?? []).filter(d => d.floorId === floorId)

  // Recalibre les bounds à (0,0,width,height)
  const extracted: ParsedPlan = {
    entities: [],
    layers: fullPlan.layers,
    spaces: spaces.map(sp => ({
      ...sp,
      polygon: sp.polygon.map(([x, y]) => [x - b.minX, y - b.minY] as [number, number]),
      bounds: {
        minX: sp.bounds.minX - b.minX,
        minY: sp.bounds.minY - b.minY,
        maxX: sp.bounds.maxX - b.minX,
        maxY: sp.bounds.maxY - b.minY,
        width: sp.bounds.width,
        height: sp.bounds.height,
        centerX: sp.bounds.centerX - b.minX,
        centerY: sp.bounds.centerY - b.minY,
      },
      floorId: 'RDC',
    })),
    wallSegments: walls.map(w => ({
      ...w,
      x1: w.x1 - b.minX, y1: w.y1 - b.minY,
      x2: w.x2 - b.minX, y2: w.y2 - b.minY,
      floorId: 'RDC',
    })),
    bounds: {
      minX: 0, minY: 0,
      maxX: b.width, maxY: b.height,
      width: b.width, height: b.height,
      centerX: b.width / 2, centerY: b.height / 2,
    },
    unitScale: fullPlan.unitScale,
    detectedUnit: fullPlan.detectedUnit,
    planImageUrl: fullPlan.planImageUrl, // note : l'image d'origine reste entière
    detectedFloors: [{
      id: 'RDC', label: 'Rez-de-chaussée',
      bounds: { minX: 0, minY: 0, maxX: b.width, maxY: b.height, width: b.width, height: b.height },
      entityCount: spaces.length,
      stackOrder: 0,
    }],
    dimensions: dims.map(d => ({
      ...d,
      p1: [d.p1[0] - b.minX, d.p1[1] - b.minY] as [number, number],
      p2: [d.p2[0] - b.minX, d.p2[1] - b.minY] as [number, number],
      textPos: [d.textPos[0] - b.minX, d.textPos[1] - b.minY] as [number, number],
      floorId: 'RDC',
    })),
  }

  return extracted
}

/** Supprime un étage du plan actif (retourne nouveau plan sans cet étage). */
export function removeFloorFromPlan(fullPlan: ParsedPlan, floorId: string): ParsedPlan {
  const otherFloors = (fullPlan.detectedFloors ?? []).filter(f => f.id !== floorId)
  const removedFloor = (fullPlan.detectedFloors ?? []).find(f => f.id === floorId)
  if (!removedFloor) return fullPlan

  const b = removedFloor.bounds
  const inRemoved = (x: number, y: number) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY

  return {
    ...fullPlan,
    spaces: fullPlan.spaces.filter(sp => {
      if (sp.floorId === floorId) return false
      return !inRemoved(sp.bounds.centerX, sp.bounds.centerY)
    }),
    wallSegments: fullPlan.wallSegments.filter(w => {
      if (w.floorId === floorId) return false
      return !(inRemoved(w.x1, w.y1) && inRemoved(w.x2, w.y2))
    }),
    detectedFloors: otherFloors.length > 0 ? otherFloors : undefined,
    dimensions: (fullPlan.dimensions ?? []).filter(d => d.floorId !== floorId),
  }
}

// ─── Export / import JSON (portabilité) ───────────────────

export async function exportPlanJson(id: string): Promise<string | null> {
  const plan = await db.plans.get(id)
  if (!plan) return null
  // On retire le Blob DXF (non sérialisable en JSON brut)
  const exportable = { ...plan, dxfBlob: undefined }
  return JSON.stringify(exportable, null, 2)
}

export async function importPlanJson(json: string): Promise<string> {
  const data = JSON.parse(json) as SavedPlanRecord
  // Génère un nouvel id pour éviter conflit
  const newId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  await db.plans.put({ ...data, id: newId, savedAt: new Date().toISOString(), lastAccessedAt: new Date().toISOString(), accessCount: 0 })
  return newId
}
