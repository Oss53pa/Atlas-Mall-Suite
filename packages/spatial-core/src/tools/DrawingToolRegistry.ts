// ═══ DRAWING TOOL REGISTRY — Palette d'outils typés ═══
//
// Un outil de dessin par classe d'entité (pas un outil générique).
// Filtrage par produit + volume actif.

import type { EntityTypeId } from '../domain/EntityType'

export type DrawMode =
  | 'point' | 'polyline' | 'polygon' | 'rectangle'
  | 'polygon_with_merge' | 'insert_on_wall'

export type ToolCategory =
  | 'walls' | 'openings' | 'floors' | 'low_volumes' | 'vegetation'
  | 'logical' | 'furniture' | 'safety' | 'experience' | 'wayfinder'
  | 'equipment' | 'leasing'

export type Volume = 'vol1' | 'vol2' | 'vol3' | 'vol4'
export type Product = 'mall' | 'wisefm' | 'atlas_lease'

export interface DrawingToolDef {
  readonly id: string
  readonly icon: string                          // emoji ou lucide name
  readonly label: string
  readonly entityType: EntityTypeId
  readonly drawMode: DrawMode
  readonly category: ToolCategory
  readonly visibleInVolumes: ReadonlyArray<Volume>
  readonly visibleInProducts: ReadonlyArray<Product>
}

export const DRAWING_TOOL_REGISTRY: ReadonlyArray<DrawingToolDef> = [
  // ─── Murs ──────────────────────────────────────────────
  { id: 'tool_wall_structural', icon: '🧱', label: 'Mur porteur',  entityType: 'WALL_STRUCTURAL', drawMode: 'polyline', category: 'walls', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall','wisefm','atlas_lease'] },
  { id: 'tool_wall_partition',  icon: '➗', label: 'Cloison',       entityType: 'WALL_PARTITION',  drawMode: 'polyline', category: 'walls', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall','wisefm','atlas_lease'] },
  { id: 'tool_wall_facade',     icon: '🏢', label: 'Façade',        entityType: 'WALL_FACADE',     drawMode: 'polyline', category: 'walls', visibleInVolumes: ['vol1','vol2'], visibleInProducts: ['mall','atlas_lease'] },
  { id: 'tool_wall_glass',      icon: '🪟', label: 'Cloison verre', entityType: 'WALL_GLASS',      drawMode: 'polyline', category: 'walls', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall'] },

  // ─── Ouvertures ────────────────────────────────────────
  { id: 'tool_door_single',    icon: '🚪', label: 'Porte simple',     entityType: 'DOOR_SINGLE',    drawMode: 'insert_on_wall', category: 'openings', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall','wisefm','atlas_lease'] },
  { id: 'tool_door_double',    icon: '🚪', label: 'Porte double',     entityType: 'DOOR_DOUBLE',    drawMode: 'insert_on_wall', category: 'openings', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_door_automatic', icon: '⬌',  label: 'Porte automatique', entityType: 'DOOR_AUTOMATIC', drawMode: 'insert_on_wall', category: 'openings', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_window',         icon: '🪟', label: 'Fenêtre',          entityType: 'WINDOW',         drawMode: 'insert_on_wall', category: 'openings', visibleInVolumes: ['vol1','vol2'], visibleInProducts: ['mall','wisefm'] },

  // ─── Sols ──────────────────────────────────────────────
  { id: 'tool_pedestrian_path', icon: '🚶', label: 'Voie piétonne',  entityType: 'PEDESTRIAN_PATH', drawMode: 'polygon_with_merge', category: 'floors', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_vehicle_road',    icon: '🛣️', label: 'Route',           entityType: 'VEHICLE_ROAD',    drawMode: 'polygon_with_merge', category: 'floors', visibleInVolumes: ['vol1','vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_parking_space',   icon: '🅿️', label: 'Place parking',   entityType: 'PARKING_SPACE',   drawMode: 'rectangle',         category: 'floors', visibleInVolumes: ['vol1','vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_road_marking',    icon: '↗️', label: 'Marquage sol',    entityType: 'ROAD_MARKING',    drawMode: 'polygon',           category: 'floors', visibleInVolumes: ['vol1','vol2'], visibleInProducts: ['mall'] },

  // ─── Volumes bas ──────────────────────────────────────
  { id: 'tool_planter',     icon: '🪴', label: 'Jardinière',  entityType: 'PLANTER',     drawMode: 'polygon', category: 'low_volumes', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_terre_plein', icon: '🟫', label: 'Terre-plein', entityType: 'TERRE_PLEIN', drawMode: 'polygon', category: 'low_volumes', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_curb',        icon: '➖', label: 'Bordure',     entityType: 'CURB',        drawMode: 'polyline', category: 'low_volumes', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_bench',       icon: '🪑', label: 'Banc',        entityType: 'BENCH',       drawMode: 'rectangle', category: 'low_volumes', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },

  // ─── Végétation ────────────────────────────────────────
  { id: 'tool_green_area', icon: '🌱', label: 'Pelouse',  entityType: 'GREEN_AREA', drawMode: 'polygon', category: 'vegetation', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_garden_bed', icon: '🌷', label: 'Massif',   entityType: 'GARDEN_BED', drawMode: 'polygon', category: 'vegetation', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_tree',       icon: '🌳', label: 'Arbre',    entityType: 'TREE',       drawMode: 'point',   category: 'vegetation', visibleInVolumes: ['vol1','vol2','vol3','vol4'], visibleInProducts: ['mall'] },

  // ─── VOL.1 ────────────────────────────────────────────
  { id: 'tool_boutique_boundary', icon: '📐', label: 'Boutique',     entityType: 'BOUTIQUE_BOUNDARY', drawMode: 'polygon', category: 'logical', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_lease_lot',         icon: '🏪', label: 'Lot locatif',  entityType: 'LEASE_LOT',         drawMode: 'polygon', category: 'leasing', visibleInVolumes: ['vol1'], visibleInProducts: ['mall','atlas_lease'] },
  { id: 'tool_food_court',        icon: '🍴', label: 'Food court',   entityType: 'FOOD_COURT_ZONE',   drawMode: 'polygon', category: 'logical', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },
  { id: 'tool_atm_location',      icon: '💳', label: 'DAB',          entityType: 'ATM_LOCATION',      drawMode: 'point',   category: 'furniture', visibleInVolumes: ['vol1'], visibleInProducts: ['mall'] },

  // ─── VOL.2 ────────────────────────────────────────────
  { id: 'tool_emergency_exit',   icon: '🚪', label: 'Issue secours',   entityType: 'EMERGENCY_EXIT',   drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_assembly_point',   icon: '🟢', label: 'Pt rassemblement', entityType: 'ASSEMBLY_POINT',   drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_evacuation_path',  icon: '➡️', label: 'Chemin évacuation', entityType: 'EVACUATION_PATH', drawMode: 'polyline', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_ria',              icon: '🧯', label: 'RIA',              entityType: 'RIA',              drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_extinguisher',     icon: '🔴', label: 'Extincteur',       entityType: 'EXTINGUISHER',     drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_fire_hydrant',     icon: '💧', label: 'Hydrant',          entityType: 'FIRE_HYDRANT',     drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_smoke_extraction', icon: '💨', label: 'Désenfumage',      entityType: 'SMOKE_EXTRACTION', drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_fire_compartment', icon: '🔥', label: 'Compartimentage',  entityType: 'FIRE_COMPARTMENT', drawMode: 'polygon', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_fire_door',        icon: '🚪', label: 'Porte coupe-feu',  entityType: 'FIRE_DOOR',        drawMode: 'insert_on_wall', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_cctv_camera',      icon: '📷', label: 'Caméra CCTV',      entityType: 'CCTV_CAMERA',      drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_cctv_zone',        icon: '👁️', label: 'Zone CCTV',        entityType: 'CCTV_ZONE',        drawMode: 'polygon', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_access_control',   icon: '🔐', label: 'Contrôle accès',   entityType: 'ACCESS_CONTROL',   drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_defibrillator',    icon: '❤️', label: 'Défibrillateur',   entityType: 'DEFIBRILLATOR',    drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },
  { id: 'tool_first_aid_kit',    icon: '➕', label: 'Trousse 1ers secours', entityType: 'FIRST_AID_KIT', drawMode: 'point', category: 'safety', visibleInVolumes: ['vol2'], visibleInProducts: ['mall'] },

  // ─── VOL.3 ────────────────────────────────────────────
  { id: 'tool_attraction_zone', icon: '🔥', label: 'Zone attraction', entityType: 'ATTRACTION_ZONE', drawMode: 'polygon', category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_friction_point',  icon: '⚠️', label: 'Pt friction',     entityType: 'FRICTION_POINT',  drawMode: 'point',   category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_dwell_zone',      icon: '⏱️', label: 'Zone dwell',      entityType: 'DWELL_ZONE',      drawMode: 'polygon', category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_customer_path',   icon: '👣', label: 'Parcours client', entityType: 'CUSTOMER_PATH',   drawMode: 'polyline', category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_sensor_beacon',   icon: '📡', label: 'Capteur',          entityType: 'SENSOR_BEACON',  drawMode: 'point',   category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_counting_gate',   icon: '🚧', label: 'Portique comptage', entityType: 'COUNTING_GATE', drawMode: 'polyline', category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_touchpoint',      icon: '🤝', label: 'Touchpoint',      entityType: 'TOUCHPOINT',      drawMode: 'point',   category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },
  { id: 'tool_rest_area',       icon: '🪑', label: 'Zone repos',       entityType: 'REST_AREA',       drawMode: 'polygon', category: 'experience', visibleInVolumes: ['vol3'], visibleInProducts: ['mall'] },

  // ─── VOL.4 ────────────────────────────────────────────
  { id: 'tool_wayfinder_totem',   icon: '🚩', label: 'Totem',          entityType: 'WAYFINDER_TOTEM',        drawMode: 'point',   category: 'wayfinder', visibleInVolumes: ['vol1','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_wayfinder_hanging', icon: '🪧', label: 'Panneau suspendu', entityType: 'WAYFINDER_HANGING_SIGN', drawMode: 'point', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_wayfinder_wall',    icon: '🪧', label: 'Panneau mural',  entityType: 'WAYFINDER_WALL_SIGN',    drawMode: 'insert_on_wall', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_wayfinder_floor',   icon: '↗️', label: 'Marqueur sol',   entityType: 'WAYFINDER_FLOOR_MARKER', drawMode: 'polygon', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_you_are_here',      icon: '📍', label: 'You-Are-Here',   entityType: 'YOU_ARE_HERE_POINT',     drawMode: 'point',   category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_decision_point',    icon: '🔀', label: 'Pt décision',    entityType: 'DECISION_POINT',         drawMode: 'point',   category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_elevator',          icon: '🛗', label: 'Ascenseur',      entityType: 'ELEVATOR',               drawMode: 'rectangle', category: 'wayfinder', visibleInVolumes: ['vol1','vol2','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_escalator',         icon: '🪜', label: 'Escalator',      entityType: 'ESCALATOR',              drawMode: 'rectangle', category: 'wayfinder', visibleInVolumes: ['vol1','vol2','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_stairs',            icon: '🪜', label: 'Escalier',       entityType: 'STAIRS',                 drawMode: 'rectangle', category: 'wayfinder', visibleInVolumes: ['vol1','vol2','vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_pmr_path',          icon: '♿', label: 'Chemin PMR',      entityType: 'PMR_PATH',               drawMode: 'polygon_with_merge', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_pmr_ramp',          icon: '🛤️', label: 'Rampe PMR',      entityType: 'PMR_RAMP',               drawMode: 'polygon', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },
  { id: 'tool_tactile_guide',     icon: '🟡', label: 'Bande tactile',   entityType: 'TACTILE_GUIDE',         drawMode: 'polyline', category: 'wayfinder', visibleInVolumes: ['vol4'], visibleInProducts: ['mall'] },

  // ─── WiseFM ───────────────────────────────────────────
  { id: 'tool_equipment_hvac',       icon: '❄️', label: 'CVC',           entityType: 'EQUIPMENT_HVAC',       drawMode: 'rectangle', category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_equipment_electrical', icon: '⚡', label: 'Électrique',    entityType: 'EQUIPMENT_ELECTRICAL', drawMode: 'rectangle', category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_equipment_plumbing',   icon: '💧', label: 'Plomberie',     entityType: 'EQUIPMENT_PLUMBING',   drawMode: 'rectangle', category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_workcenter',           icon: '🏭', label: 'Workcenter',    entityType: 'WORKCENTER',           drawMode: 'polygon',   category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_valve',                icon: '🔧', label: 'Vanne',         entityType: 'VALVE',                drawMode: 'point',     category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_meter',                icon: '📊', label: 'Compteur',      entityType: 'METER',                drawMode: 'point',     category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_electrical_panel',     icon: '🔌', label: 'TGBT',          entityType: 'ELECTRICAL_PANEL',     drawMode: 'rectangle', category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
  { id: 'tool_patrol_route',         icon: '🚶‍♂️', label: 'Ronde',         entityType: 'PATROL_ROUTE',         drawMode: 'polyline',  category: 'equipment', visibleInVolumes: [], visibleInProducts: ['wisefm'] },
]

/** Filtre les outils visibles pour un contexte donné. */
export function filterToolsForContext(
  activeProduct: Product,
  activeVolume?: Volume,
): ReadonlyArray<DrawingToolDef> {
  return DRAWING_TOOL_REGISTRY.filter(tool => {
    if (!tool.visibleInProducts.includes(activeProduct)) return false
    if (activeProduct === 'mall' && activeVolume) {
      return tool.visibleInVolumes.includes(activeVolume)
    }
    return true
  })
}

/** Groupe les outils par catégorie pour affichage en palette. */
export function groupToolsByCategory(
  tools: ReadonlyArray<DrawingToolDef>,
): ReadonlyArray<{ category: ToolCategory; tools: ReadonlyArray<DrawingToolDef> }> {
  const map = new Map<ToolCategory, DrawingToolDef[]>()
  for (const t of tools) {
    if (!map.has(t.category)) map.set(t.category, [])
    map.get(t.category)!.push(t)
  }
  return Array.from(map.entries()).map(([category, tools]) => ({ category, tools }))
}
