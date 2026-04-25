// ═══ ENTITY TYPE — Taxonomie CORE ═══
//
// Types d'entités spatiales partagés entre TOUS les produits Atlas Studio.
// Les types spécifiques à un produit/volume vivent dans `extensions/`.
//
// Convention : SCREAMING_SNAKE_CASE pour les noms d'enum (constants), et
// les valeurs d'enum sont des chaînes identiques au nom (pas de numérique
// — pour stabilité en base + sérialisation lisible).

export enum CoreEntityType {
  // ─── Murs et cloisons ─────────────────────────────────────
  WALL_STRUCTURAL = 'WALL_STRUCTURAL',     // mur porteur, béton/parpaing
  WALL_PARTITION = 'WALL_PARTITION',       // cloison légère
  WALL_FACADE = 'WALL_FACADE',             // façade extérieure
  WALL_GLASS = 'WALL_GLASS',               // vitrage / cloison verre

  // ─── Ouvertures (insérées dans WALL_*) ───────────────────
  DOOR_SINGLE = 'DOOR_SINGLE',
  DOOR_DOUBLE = 'DOOR_DOUBLE',
  DOOR_AUTOMATIC = 'DOOR_AUTOMATIC',
  WINDOW = 'WINDOW',

  // ─── Sols (NON extrudés en 3D) ───────────────────────────
  FLOOR_TILE = 'FLOOR_TILE',
  FLOOR_PARQUET = 'FLOOR_PARQUET',
  FLOOR_CONCRETE = 'FLOOR_CONCRETE',
  PEDESTRIAN_PATH = 'PEDESTRIAN_PATH',     // voie piétonne (mall, allée)
  VEHICLE_ROAD = 'VEHICLE_ROAD',           // voirie carrossable
  PARKING_SPACE = 'PARKING_SPACE',         // place de parking
  ROAD_MARKING = 'ROAD_MARKING',           // marquage au sol (flèches, zébras)

  // ─── Volumes bas (extrusion < 1 m) ───────────────────────
  PLANTER = 'PLANTER',                     // jardinière
  TERRE_PLEIN = 'TERRE_PLEIN',             // îlot central / séparateur
  CURB = 'CURB',                           // bordure trottoir
  BENCH = 'BENCH',                         // banc

  // ─── Végétation ───────────────────────────────────────────
  GREEN_AREA = 'GREEN_AREA',               // pelouse / espace vert plat
  GARDEN_BED = 'GARDEN_BED',               // massif planté (h ~0.3 m)
  TREE = 'TREE',                           // arbre isolé (volume vertical 6-10 m)

  // ─── Logique (zones non rendues 3D) ──────────────────────
  ZONE_GENERIC = 'ZONE_GENERIC',           // zone abstraite quelconque

  // ─── Mobilier urbain ──────────────────────────────────────
  TRASH_BIN = 'TRASH_BIN',
  LAMP_POST = 'LAMP_POST',
  GENERIC_SIGNAGE = 'GENERIC_SIGNAGE',     // panneau générique non-wayfinder
}

/** Union de toutes les chaînes EntityType valides (core + extensions). */
export type EntityTypeId = string

/** Liste des valeurs CORE pour validation au runtime. */
export const CORE_ENTITY_TYPES: ReadonlySet<string> = new Set(
  Object.values(CoreEntityType),
)

export function isCoreEntityType(value: string): value is CoreEntityType {
  return CORE_ENTITY_TYPES.has(value)
}
