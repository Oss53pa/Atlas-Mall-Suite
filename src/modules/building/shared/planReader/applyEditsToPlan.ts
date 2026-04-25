// ═══ APPLY EDITS — Fusionne les EditableSpace dans un ParsedPlan ═══
//
// L'éditeur Atlas Studio laisse l'utilisateur dessiner ses propres
// polygones dans `useEditableSpaceStore.spaces` (EditableSpace[]).
// Ces edits vivent séparément du `ParsedPlan.spaces` (DetectedSpace[],
// auto-détection DXF brute). Quand l'utilisateur clique "Valider" ou
// "Enregistrer comme modèle", les EditableSpace doivent devenir la
// source de vérité — sinon les volumes Vol.1/2/3/4 continuent d'afficher
// les polygones DXF bruts au lieu du plan remodelé.

import type { ParsedPlan, DetectedSpace, SpaceType, Bounds } from './planEngineTypes'
import type { EditableSpace } from '../components/SpaceEditorCanvas'
import type { FloorLevelKey, SpaceTypeKey } from '../proph3t/libraries/spaceTypeLibrary'
import { SPACE_TYPE_META } from '../proph3t/libraries/spaceTypeLibrary'

/**
 * BUG ROOT CAUSE rc.0 : cette fonction dégradait les ~150 SpaceTypeKey
 * granulaires (commerce_supermarche, parking_vehicule, terre_plein,
 * voie_principale, mail_central, route_avenue...) en 9 buckets grossiers
 * (commerce/parking/other/circulation/...). Conséquence : tous les types
 * non listés tombaient sur 'other' → couleur par défaut + extrusion 4 m.
 *
 * Fix : on PRÉSERVE la SpaceTypeKey originale telle quelle. Les renderers
 * (MallMap2D categoryColor, isometricEngine defaultHeightForType, etc.)
 * utilisent du string/regex matching et acceptent n'importe quelle valeur.
 * SpaceType est typé string-based donc le cast est sûr.
 */
function mapEditableTypeToDetected(k: SpaceTypeKey): SpaceType {
  return String(k) as SpaceType
}

/** Mappe un FloorLevelKey (éditeur) vers une valeur string (canonical). */
function floorKeyToId(f: FloorLevelKey): string {
  return f
}

/** Calcule le bounding box d'un polygone. */
function polygonBounds(pts: Array<{ x: number; y: number }>): Bounds {
  if (pts.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 } as Bounds
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  } as Bounds
}

/** Calcule l'aire signée d'un polygone (formule du lacet). */
function polygonArea(pts: Array<{ x: number; y: number }>): number {
  if (pts.length < 3) return 0
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(sum) / 2
}

/** Convertit un EditableSpace en DetectedSpace compatible ParsedPlan. */
export function editableToDetected(es: EditableSpace): DetectedSpace {
  const pts = es.polygon
  const bounds = polygonBounds(pts)
  const area = polygonArea(pts)
  const meta = SPACE_TYPE_META[es.type]
  return {
    id: es.id,
    polygon: pts.map(p => [p.x, p.y] as [number, number]),
    areaSqm: area,
    label: es.name || meta?.label || 'Espace',
    layer: 'user-edit',
    type: mapEditableTypeToDetected(es.type),
    bounds,
    color: meta?.color ?? null,
    metadata: {
      editable: true,
      validated: es.validated,
      originalTypeKey: es.type,
      localNumber: es.localNumber,
      tenant: es.tenant,
      vacant: es.vacant,
      unitId: es.unitId,
      hasMezzanine: es.hasMezzanine,
      mezzanineSqm: es.mezzanineSqm,
      notes: es.notes,
    },
    floorId: floorKeyToId(es.floorLevel),
  }
}

/**
 * Retourne un ParsedPlan avec les EditableSpace fusionnés dans
 * `plan.spaces`. Stratégie :
 *   • Si au moins 1 EditableSpace existe → on REMPLACE plan.spaces
 *     par les EditableSpace convertis (le user a redessiné son plan).
 *   • Sinon → plan inchangé (retourne le même objet).
 *
 * Les `wallSegments`, `layers`, `bounds` du ParsedPlan sont préservés.
 */
export function applyEditsToPlan(plan: ParsedPlan, editables: EditableSpace[]): ParsedPlan {
  if (editables.length === 0) return plan
  const newSpaces = editables.map(editableToDetected)
  return {
    ...plan,
    spaces: newSpaces,
  }
}
