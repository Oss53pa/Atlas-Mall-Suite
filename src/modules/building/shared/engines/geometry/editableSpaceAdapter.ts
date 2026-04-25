// ═══ EDITABLE SPACE ↔ SPATIAL ENTITY ADAPTER ═══
//
// Pont entre les EditableSpace de l'éditeur actuel (rc.0) et les
// SpatialEntity du nouveau spatial-core. Permet de réutiliser tout le
// moteur (GeometryCorrector, auditPlan, detectMisalignments, etc.) sans
// migration de données.
//
// Usage typique :
//   const spatial = editableSpacesToSpatialEntities(editableSpaces, 'cosmos-angre')
//   const audit = auditPlan(spatial, 'cosmos-angre')
//   const suggestions = detectMisalignments(spatial)

import type { EditableSpace } from '../../components/SpaceEditorCanvas'
import type { DetectedSpace } from '../../planReader/planEngineTypes'
import type {
  SpatialEntity,
  Polygon,
  Point2D,
} from '../../../../../../packages/spatial-core/src/domain/SpatialEntity'
import { getEntityMetadata } from '../../../../../../packages/spatial-core/src/domain/EntityTypeMetadata'

/**
 * Mappe une SpaceTypeKey rc.0 (ex 'commerce_supermarche', 'parking_vehicule')
 * vers une EntityTypeId du spatial-core. Beaucoup sont 1:1, certaines sont
 * regroupées (ex tous commerce_* → BOUTIQUE_BOUNDARY).
 */
function mapEditableTypeToEntityType(rc0Type: string): string {
  const t = rc0Type.toLowerCase()

  // Murs / cloisons (peu utilisés en rc.0 mais on couvre)
  if (t === 'mur' || t === 'wall') return 'WALL_STRUCTURAL'
  if (t === 'cloison') return 'WALL_PARTITION'

  // Portes
  if (t === 'porte_double') return 'DOOR_DOUBLE'
  if (t === 'porte_automatique') return 'DOOR_AUTOMATIC'
  if (t === 'porte_secours' || t === 'sortie_secours') return 'EMERGENCY_EXIT'
  if (t.startsWith('porte_')) return 'DOOR_SINGLE'

  // Boutiques + commerces
  if (t.startsWith('commerce_')) return 'BOUTIQUE_BOUNDARY'
  if (t === 'local_commerce' || t === 'big_box' || t === 'market') return 'BOUTIQUE_BOUNDARY'
  if (t === 'food_court') return 'FOOD_COURT_ZONE'

  // Parking & voirie
  if (t.startsWith('parking_place_')) return 'PARKING_SPACE'
  if (t === 'parking_vehicule' || t === 'parking_moto' || t === 'parking_velo') return 'PARKING_SPACE'
  if (t === 'parking_voie_circulation') return 'VEHICLE_ROAD'
  if (t.startsWith('voie_')) return 'VEHICLE_ROAD'
  if (t.startsWith('route_')) return 'VEHICLE_ROAD'
  if (t === 'voirie' || t === 'asphalte' || t === 'rond_point' || t === 'carrefour') return 'VEHICLE_ROAD'
  if (t === 'passage_pieton') return 'ROAD_MARKING'

  // Voies piétonnes & circulations
  if (t === 'mail_central' || t === 'mail_secondaire' || t === 'atrium' || t === 'galerie' ||
      t === 'promenade' || t === 'circulation' || t === 'couloir' || t === 'couloir_secondaire' ||
      t === 'hall_distribution' || t === 'passage_pieton_couvert') return 'PEDESTRIAN_PATH'
  if (t === 'parvis' || t === 'trottoir' || t === 'pedestrian' ||
      t.startsWith('exterieur_voie_pieton') || t === 'exterieur_parvis') return 'PEDESTRIAN_PATH'
  if (t.startsWith('acces_site_')) return 'PEDESTRIAN_PATH'

  // Espaces verts
  if (t === 'jardin' || t === 'pelouse' || t === 'espace_vert' || t === 'plantation' ||
      t === 'massif_vegetal') return 'GREEN_AREA'
  if (t === 'terre_plein') return 'TERRE_PLEIN'
  if (t === 'haie' || t === 'alignement_arbre' || t === 'alignement_arbres') return 'GARDEN_BED'
  if (t === 'arbre_isole') return 'TREE'

  // Sanitaires
  if (t === 'sanitaires' || t === 'sanitaire' || t === 'wc' ||
      t === 'vestiaire' || t === 'vestiaires_personnel') return 'RESTROOM_BLOCK'

  // Locaux techniques
  if (t === 'technique' || t === 'zone_technique' || t.startsWith('local_')) return 'TECHNICAL_ROOM'
  if (t === 'stockage' || t === 'reserve' || t === 'depot' || t === 'archive') return 'RESERVE_STORAGE'
  if (t === 'livraison' || t === 'zone_livraison' || t === 'quai') return 'RESERVE_STORAGE'

  // Loisirs / services
  if (t === 'cinema_multiplex' || t === 'cinema' || t === 'salle_spectacle') return 'BOUTIQUE_BOUNDARY'
  if (t === 'loisirs' || t === 'showroom' || t === 'galerie_art' || t === 'zone_exposition') return 'BOUTIQUE_BOUNDARY'
  if (t === 'atm') return 'ATM_LOCATION'

  // Wayfinder
  if (t === 'borne_wayfinder' || t === 'point_information') return 'WAYFINDER_TOTEM'
  if (t === 'ascenseur') return 'ELEVATOR'
  if (t === 'escalator') return 'ESCALATOR'
  if (t === 'escalier' || t === 'escalier_fixe') return 'STAIRS'
  if (t === 'rampe_pmr') return 'PMR_RAMP'

  // Terrasses
  if (t === 'terrasse' || t === 'terrasse_restaurant' || t === 'terrasse_commerciale') return 'PEDESTRIAN_PATH'

  // Hôtel / bureaux / entrées
  if (t === 'hotel' || t === 'hotel_residence') return 'BOUTIQUE_BOUNDARY'
  if (t === 'bureau_immeuble' || t === 'bureau_direction' || t === 'bureau_open_space') return 'BOUTIQUE_BOUNDARY'
  if (t === 'entree_principale' || t === 'entree_secondaire' || t === 'entree') return 'DOOR_AUTOMATIC'

  // Fallback
  return 'ZONE_GENERIC'
}

/** Convertit un EditableSpace.polygon ([{x,y}]) vers Polygon spatial-core. */
function convertGeometry(poly: ReadonlyArray<{ x: number; y: number }>): Polygon {
  const outer: Point2D[] = poly.map(p => ({ x: p.x, y: p.y }))
  return { outer }
}

/**
 * Convertit un EditableSpace en SpatialEntity en préservant l'ID original
 * (pour traçabilité). La migration retourne une vue READ-ONLY — elle ne
 * modifie pas le store source.
 */
export function editableSpaceToSpatialEntity(es: EditableSpace, projectId: string): SpatialEntity {
  const entityType = mapEditableTypeToEntityType(String(es.type))
  const meta = getEntityMetadata(entityType)
  return {
    id: es.id,
    projectId,
    type: entityType,
    level: String(es.floorLevel ?? 'rdc'),
    geometry: convertGeometry(es.polygon),
    extrusion: { ...meta.defaultExtrusion },
    material: meta.defaultMaterial,
    snapBehavior: meta.snapBehavior,
    mergeWithNeighbors: meta.mergeWithSameType,
    childrenIds: [],
    label: es.name,
    notes: es.notes,
    customProperties: {
      legacyType: String(es.type),
      tenant: es.tenant,
      localNumber: es.localNumber,
      vacant: es.vacant,
      validated: es.validated,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'editable-space-adapter',
    isAutoCorrected: false,
    correctionAuditTrail: [],
  }
}

export function editableSpacesToSpatialEntities(
  spaces: ReadonlyArray<EditableSpace>,
  projectId: string,
): SpatialEntity[] {
  return spaces.map(s => editableSpaceToSpatialEntity(s, projectId))
}

/**
 * Convertit un DetectedSpace (issu du modeledPlan, avec type granulaire
 * grâce au fix 691d612) en SpatialEntity. Permet de feeder `<SceneRenderer>`
 * directement depuis le pipeline existant Vol.3 sans changer la structure
 * de données upstream.
 */
export function detectedSpaceToSpatialEntity(ds: DetectedSpace, projectId: string): SpatialEntity {
  const entityType = mapEditableTypeToEntityType(String(ds.type))
  const meta = getEntityMetadata(entityType)
  const outer: Point2D[] = ds.polygon.map(([x, y]) => ({ x, y }))
  const geometry: Polygon = { outer }
  return {
    id: ds.id,
    projectId,
    type: entityType,
    level: String(ds.floorId ?? 'rdc'),
    geometry,
    extrusion: { ...meta.defaultExtrusion },
    material: meta.defaultMaterial,
    snapBehavior: meta.snapBehavior,
    mergeWithNeighbors: meta.mergeWithSameType,
    childrenIds: [],
    label: ds.label,
    customProperties: {
      legacyType: String(ds.type),
      areaSqm: ds.areaSqm,
      layer: ds.layer,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'detected-space-adapter',
    isAutoCorrected: false,
    correctionAuditTrail: [],
  }
}

export function detectedSpacesToSpatialEntities(
  spaces: ReadonlyArray<DetectedSpace>,
  projectId: string,
): SpatialEntity[] {
  return spaces.map(s => detectedSpaceToSpatialEntity(s, projectId))
}
