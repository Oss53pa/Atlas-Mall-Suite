// ═══ ENTITY TYPE METADATA — Comportement par type ═══
//
// Pour chaque type d'entité (core + extensions), métadonnées qui dictent :
//   • le rendu 3D (extrusion ? hauteur ? matériau ?)
//   • les comportements édition (snap fort/faible, fusion booléenne…)
//   • la visibilité par volume/produit
//   • la contribution aux KPI métier (GLA, conformité…)
//
// Source unique de vérité pour TOUTE la couche spatiale Atlas Studio.

import { CoreEntityType } from './EntityType'
import { MallVol1EntityType } from './extensions/mall-vol1-operations'
import { MallVol2EntityType } from './extensions/mall-vol2-safety'
import { MallVol3EntityType } from './extensions/mall-vol3-experience'
import { MallVol4EntityType } from './extensions/mall-vol4-wayfinder'
import { WiseFMEntityType } from './extensions/wisefm-equipment'
import { AtlasLeaseEntityType } from './extensions/atlas-lease-leasing'

export type ProductScope = 'core' | 'mall_vol1' | 'mall_vol2' | 'mall_vol3' | 'mall_vol4' | 'wisefm' | 'atlas_lease' | 'cockpit' | 'duedeck'

export type EntityCategory =
  | 'wall' | 'opening' | 'floor' | 'low_volume' | 'vegetation'
  | 'logical' | 'furniture' | 'safety_marker' | 'experience_marker'
  | 'wayfinder' | 'equipment'

export type SnapBehavior = 'strong' | 'weak' | 'none'

export type VolumeId = 'vol1' | 'vol2' | 'vol3' | 'vol4'

export type MaterialId = string

export interface EntityTypeMetadata {
  productScope: readonly ProductScope[]
  category: EntityCategory
  defaultExtrusion: { enabled: boolean; height: number; baseElevation: number }
  defaultMaterial: MaterialId
  snapBehavior: SnapBehavior
  /** Si true, deux entités du même type qui se touchent fusionnent en union booléenne. */
  mergeWithSameType: boolean
  /** Si false, l'entité n'est pas rendue dans la vue 3D (zones logiques par exemple). */
  renderInIsometric3D: boolean
  /** Si true, contribue au calcul GLA (Gross Leasable Area). */
  contributesToGLA: boolean
  /** Nom d'icône Lucide pour le rendu 2D (overlay marker). */
  iconRender2D: string
  /** Couleur d'overlay 2D (palette unifiée). */
  colorOverlay2D: string
  /** Volumes Vol.1-4 dans lesquels ce type est visible. Vide = global. */
  visibleInVolumes: readonly VolumeId[]
}

// ─── Helpers internes pour réduire la verbosité ──────────

const FLAT_FLOOR = (mat: MaterialId, color: string, icon: string): EntityTypeMetadata => ({
  productScope: ['core'], category: 'floor',
  defaultExtrusion: { enabled: false, height: 0.02, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'weak', mergeWithSameType: true,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol1', 'vol2', 'vol3', 'vol4'],
})

const VEGETATION_FLAT = (mat: MaterialId, color: string, icon: string): EntityTypeMetadata => ({
  productScope: ['core'], category: 'vegetation',
  defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'weak', mergeWithSameType: true,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol1'],
})

const LOW_VOLUME = (mat: MaterialId, color: string, icon: string, h: number): EntityTypeMetadata => ({
  productScope: ['core'], category: 'low_volume',
  defaultExtrusion: { enabled: true, height: h, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'weak', mergeWithSameType: false,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol1'],
})

const WALL = (mat: MaterialId, h: number): EntityTypeMetadata => ({
  productScope: ['core'], category: 'wall',
  defaultExtrusion: { enabled: true, height: h, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'strong', mergeWithSameType: false,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: 'minus', colorOverlay2D: '#374151',
  visibleInVolumes: ['vol1', 'vol2', 'vol3', 'vol4'],
})

const OPENING = (mat: MaterialId, color: string, icon: string): EntityTypeMetadata => ({
  productScope: ['core'], category: 'opening',
  defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'strong', mergeWithSameType: false,
  renderInIsometric3D: false, // rendue par le mur parent (CSG)
  contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol1', 'vol2', 'vol3', 'vol4'],
})

const SAFETY_POINT = (mat: MaterialId, color: string, icon: string): EntityTypeMetadata => ({
  productScope: ['mall_vol2'], category: 'safety_marker',
  defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'strong', mergeWithSameType: false,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol2'],
})

const WAYFINDER_POINT = (mat: MaterialId, color: string, icon: string, h: number): EntityTypeMetadata => ({
  productScope: ['mall_vol4'], category: 'wayfinder',
  defaultExtrusion: { enabled: h > 0, height: h, baseElevation: 0 },
  defaultMaterial: mat, snapBehavior: 'strong', mergeWithSameType: false,
  renderInIsometric3D: true, contributesToGLA: false,
  iconRender2D: icon, colorOverlay2D: color,
  visibleInVolumes: ['vol4'],
})

// ─── Registre central ────────────────────────────────────

export const ENTITY_TYPE_METADATA: Record<string, EntityTypeMetadata> = {
  // ─── CORE walls ──────────────────────────────────────────
  [CoreEntityType.WALL_STRUCTURAL]: WALL('concrete_wall', 3.0),
  [CoreEntityType.WALL_PARTITION]:  WALL('partition_drywall', 2.7),
  [CoreEntityType.WALL_FACADE]:     WALL('facade_stone', 4.5),
  [CoreEntityType.WALL_GLASS]:      { ...WALL('glass_wall', 3.0), iconRender2D: 'square', colorOverlay2D: '#9ec6e8' },

  // ─── CORE openings ───────────────────────────────────────
  [CoreEntityType.DOOR_SINGLE]:    OPENING('door_wood', '#8b6914', 'door-closed'),
  [CoreEntityType.DOOR_DOUBLE]:    OPENING('door_wood', '#8b6914', 'door-open'),
  [CoreEntityType.DOOR_AUTOMATIC]: OPENING('door_glass', '#0ea5e9', 'door-open'),
  [CoreEntityType.WINDOW]:         OPENING('window_glass', '#9ec6e8', 'square'),

  // ─── CORE floors (flat, mergeable) ───────────────────────
  [CoreEntityType.FLOOR_TILE]:      FLAT_FLOOR('floor_tile_ceramic', '#d4d0c8', 'square'),
  [CoreEntityType.FLOOR_PARQUET]:   FLAT_FLOOR('floor_parquet', '#a07050', 'square'),
  [CoreEntityType.FLOOR_CONCRETE]:  FLAT_FLOOR('floor_concrete', '#a8a8a8', 'square'),
  [CoreEntityType.PEDESTRIAN_PATH]: FLAT_FLOOR('paved_stone', '#8a8074', 'walking'),
  [CoreEntityType.VEHICLE_ROAD]:    { ...FLAT_FLOOR('asphalt', '#3a3a3a', 'car'), visibleInVolumes: ['vol1', 'vol2'] },
  [CoreEntityType.PARKING_SPACE]:   FLAT_FLOOR('asphalt_marked', '#5c5c5c', 'parking-square'),
  [CoreEntityType.ROAD_MARKING]:    { ...FLAT_FLOOR('paint_white', '#ffffff', 'arrow-right'), mergeWithSameType: false },

  // ─── CORE low volumes ────────────────────────────────────
  [CoreEntityType.PLANTER]:     LOW_VOLUME('planter_concrete', '#a07050', 'flower', 0.5),
  [CoreEntityType.TERRE_PLEIN]: LOW_VOLUME('terre_plein_grass', '#7a9b6e', 'mountain', 0.3),
  [CoreEntityType.CURB]:        LOW_VOLUME('curb_concrete', '#909090', 'minus', 0.15),
  [CoreEntityType.BENCH]:       LOW_VOLUME('bench_wood', '#8b6914', 'minus', 0.5),

  // ─── CORE vegetation ─────────────────────────────────────
  [CoreEntityType.GREEN_AREA]:  VEGETATION_FLAT('grass', '#4a7c3a', 'leaf'),
  [CoreEntityType.GARDEN_BED]:  { ...VEGETATION_FLAT('garden_mulch', '#6b8e5a', 'flower'), defaultExtrusion: { enabled: true, height: 0.3, baseElevation: 0 } },
  [CoreEntityType.TREE]: {
    productScope: ['core'], category: 'vegetation',
    defaultExtrusion: { enabled: true, height: 8.0, baseElevation: 0 },
    defaultMaterial: 'tree_oak', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'tree-pine', colorOverlay2D: '#2d5016',
    visibleInVolumes: ['vol1', 'vol2', 'vol3', 'vol4'],
  },

  // ─── CORE logical ────────────────────────────────────────
  [CoreEntityType.ZONE_GENERIC]: {
    productScope: ['core'], category: 'logical',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: false,
    iconRender2D: 'square-dashed', colorOverlay2D: '#94a3b8',
    visibleInVolumes: ['vol1', 'vol2', 'vol3', 'vol4'],
  },

  // ─── CORE furniture ──────────────────────────────────────
  [CoreEntityType.TRASH_BIN]:       LOW_VOLUME('trash_metal', '#374151', 'trash-2', 1.0),
  [CoreEntityType.LAMP_POST]: {
    productScope: ['core'], category: 'furniture',
    defaultExtrusion: { enabled: true, height: 4.0, baseElevation: 0 },
    defaultMaterial: 'lamp_metal', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'lightbulb', colorOverlay2D: '#fbbf24',
    visibleInVolumes: ['vol1'],
  },
  [CoreEntityType.GENERIC_SIGNAGE]: {
    productScope: ['core'], category: 'furniture',
    defaultExtrusion: { enabled: true, height: 2.0, baseElevation: 0 },
    defaultMaterial: 'signage_metal', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'flag', colorOverlay2D: '#6366f1',
    visibleInVolumes: ['vol1'],
  },
  [CoreEntityType.LAMP_POST_PARKING]: {
    productScope: ['core'], category: 'furniture',
    defaultExtrusion: { enabled: true, height: 8.0, baseElevation: 0 },
    defaultMaterial: 'lamp_metal', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'lightbulb', colorOverlay2D: '#fbbf24',
    visibleInVolumes: ['vol1'],
  },
  [CoreEntityType.BOLLARD]: {
    productScope: ['core'], category: 'furniture',
    defaultExtrusion: { enabled: true, height: 0.8, baseElevation: 0 },
    defaultMaterial: 'curb_concrete', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'circle-dot', colorOverlay2D: '#475569',
    visibleInVolumes: ['vol1'],
  },

  // ─── Instances décoratives ───────────────────────────────
  [CoreEntityType.CAR_INSTANCE]: {
    productScope: ['core'], category: 'furniture',
    defaultExtrusion: { enabled: true, height: 1.5, baseElevation: 0 },
    defaultMaterial: 'car_paint', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'car', colorOverlay2D: '#475569',
    visibleInVolumes: ['vol1', 'vol2'],
  },
  [CoreEntityType.TREE_PALM]: {
    productScope: ['core'], category: 'vegetation',
    defaultExtrusion: { enabled: true, height: 6.0, baseElevation: 0 },
    defaultMaterial: 'tree_palm', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'tree-palm', colorOverlay2D: '#3a6b1f',
    visibleInVolumes: ['vol1'],
  },
  [CoreEntityType.TREE_DECIDUOUS]: {
    productScope: ['core'], category: 'vegetation',
    defaultExtrusion: { enabled: true, height: 7.0, baseElevation: 0 },
    defaultMaterial: 'tree_oak', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'tree-pine', colorOverlay2D: '#2d5016',
    visibleInVolumes: ['vol1'],
  },
  [CoreEntityType.SHRUB]: {
    productScope: ['core'], category: 'vegetation',
    defaultExtrusion: { enabled: true, height: 1.0, baseElevation: 0 },
    defaultMaterial: 'shrub_green', snapBehavior: 'none', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'leaf', colorOverlay2D: '#5c8a45',
    visibleInVolumes: ['vol1'],
  },

  // ─── Marquages sol additionnels ─────────────────────────
  [CoreEntityType.ROAD_ARROW]: {
    productScope: ['core'], category: 'floor',
    defaultExtrusion: { enabled: false, height: 0.005, baseElevation: 0.001 },
    defaultMaterial: 'paint_white', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'arrow-up', colorOverlay2D: '#f8f8f8',
    visibleInVolumes: ['vol1', 'vol2'],
  },
  [CoreEntityType.PARKING_LINE]: {
    productScope: ['core'], category: 'floor',
    defaultExtrusion: { enabled: false, height: 0.003, baseElevation: 0.001 },
    defaultMaterial: 'paint_white', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'minus', colorOverlay2D: '#f8f8f8',
    visibleInVolumes: ['vol1'],
  },

  // ─── VOL.1 — Operations & Business ──────────────────────
  [MallVol1EntityType.BOUTIQUE_BOUNDARY]: {
    productScope: ['mall_vol1'], category: 'logical',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: true,  // ← CRITIQUE
    iconRender2D: 'square-dashed', colorOverlay2D: '#EF9F27',
    visibleInVolumes: ['vol1'],
  },
  [MallVol1EntityType.LEASE_LOT]: {
    productScope: ['mall_vol1', 'atlas_lease'], category: 'logical',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: true,
    iconRender2D: 'square', colorOverlay2D: '#3b82f6',
    visibleInVolumes: ['vol1'],
  },
  [MallVol1EntityType.COMMON_AREA]: {
    productScope: ['mall_vol1', 'atlas_lease'], category: 'logical',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: false,
    iconRender2D: 'square-dashed', colorOverlay2D: '#a8c2d6',
    visibleInVolumes: ['vol1'],
  },
  [MallVol1EntityType.TECHNICAL_ROOM]: {
    productScope: ['mall_vol1'], category: 'logical',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: false,
    iconRender2D: 'wrench', colorOverlay2D: '#bcc0c6',
    visibleInVolumes: ['vol1'],
  },
  [MallVol1EntityType.RESERVE_STORAGE]:    { productScope: ['mall_vol1'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'package', colorOverlay2D: '#d9c1a0', visibleInVolumes: ['vol1'] },
  [MallVol1EntityType.FOOD_COURT_ZONE]:    { productScope: ['mall_vol1'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: true,  iconRender2D: 'utensils', colorOverlay2D: '#f59e0b', visibleInVolumes: ['vol1'] },
  [MallVol1EntityType.RESTROOM_BLOCK]:     { productScope: ['mall_vol1'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'wc', colorOverlay2D: '#9fc4cc', visibleInVolumes: ['vol1'] },
  [MallVol1EntityType.ATM_LOCATION]:       { productScope: ['mall_vol1'], category: 'furniture', defaultExtrusion: { enabled: true, height: 1.5, baseElevation: 0 }, defaultMaterial: 'atm_metal', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'banknote', colorOverlay2D: '#16a34a', visibleInVolumes: ['vol1'] },
  [MallVol1EntityType.CASH_DESK]:          { productScope: ['mall_vol1'], category: 'furniture', defaultExtrusion: { enabled: true, height: 1.0, baseElevation: 0 }, defaultMaterial: 'desk_wood',  snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'credit-card', colorOverlay2D: '#8b6914', visibleInVolumes: ['vol1'] },

  // ─── VOL.2 — Safety ─────────────────────────────────────
  [MallVol2EntityType.EMERGENCY_EXIT]:    SAFETY_POINT('safety_green', '#16a34a', 'door-open'),
  [MallVol2EntityType.ASSEMBLY_POINT]:    SAFETY_POINT('safety_green', '#16a34a', 'users'),
  [MallVol2EntityType.EVACUATION_PATH]:   { ...SAFETY_POINT('safety_overlay', '#16a34a', 'arrow-right'), mergeWithSameType: true },
  [MallVol2EntityType.DEGAGEMENT]:        { ...SAFETY_POINT('safety_overlay', '#22c55e', 'square-dashed'), renderInIsometric3D: false },
  [MallVol2EntityType.RIA]:               { ...SAFETY_POINT('ria_red', '#dc2626', 'fire-extinguisher'), defaultExtrusion: { enabled: true, height: 1.2, baseElevation: 0 } },
  [MallVol2EntityType.EXTINGUISHER]:      { ...SAFETY_POINT('ria_red', '#dc2626', 'fire-extinguisher'), defaultExtrusion: { enabled: true, height: 0.7, baseElevation: 0 } },
  [MallVol2EntityType.FIRE_HYDRANT]:      { ...SAFETY_POINT('ria_red', '#dc2626', 'droplet'), defaultExtrusion: { enabled: true, height: 0.9, baseElevation: 0 } },
  [MallVol2EntityType.SMOKE_EXTRACTION]:  { ...SAFETY_POINT('safety_overlay', '#94a3b8', 'wind'), renderInIsometric3D: false },
  [MallVol2EntityType.FIRE_COMPARTMENT]:  { ...SAFETY_POINT('safety_overlay', '#dc2626', 'square-dashed'), renderInIsometric3D: false },
  [MallVol2EntityType.FIRE_DOOR]:         OPENING('fire_door', '#dc2626', 'door-closed'),
  [MallVol2EntityType.CCTV_CAMERA]:       { ...SAFETY_POINT('cctv_metal', '#0284c7', 'camera'), defaultExtrusion: { enabled: true, height: 0.2, baseElevation: 3.0 } },
  [MallVol2EntityType.CCTV_ZONE]:         { ...SAFETY_POINT('safety_overlay', '#0284c7', 'eye'), renderInIsometric3D: false },
  [MallVol2EntityType.ACCESS_CONTROL]:    { ...SAFETY_POINT('access_metal', '#7e5e3c', 'lock'), defaultExtrusion: { enabled: true, height: 1.5, baseElevation: 0 } },
  [MallVol2EntityType.ALARM_POINT]:       { ...SAFETY_POINT('alarm_red', '#ef4444', 'alarm-clock'), defaultExtrusion: { enabled: true, height: 0.3, baseElevation: 1.5 } },
  [MallVol2EntityType.DEFIBRILLATOR]:     { ...SAFETY_POINT('defib_red', '#ef4444', 'heart'), defaultExtrusion: { enabled: true, height: 0.4, baseElevation: 1.2 } },
  [MallVol2EntityType.FIRST_AID_KIT]:     { ...SAFETY_POINT('first_aid', '#22c55e', 'plus'), defaultExtrusion: { enabled: true, height: 0.3, baseElevation: 1.2 } },

  // ─── VOL.3 — Experience ─────────────────────────────────
  [MallVol3EntityType.ATTRACTION_ZONE]:   { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'heatmap_warm_overlay', snapBehavior: 'none', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'flame', colorOverlay2D: '#f97316', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.FRICTION_POINT]:    { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',                snapBehavior: 'none', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'alert-triangle', colorOverlay2D: '#dc2626', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.DWELL_ZONE]:        { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'heatmap_overlay',     snapBehavior: 'none', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'clock', colorOverlay2D: '#a855f7', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.CUSTOMER_PATH]:     { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'path_overlay',         snapBehavior: 'none', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'footprints', colorOverlay2D: '#06b6d4', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.SENSOR_BEACON]:     { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: true, height: 0.2, baseElevation: 2.5 }, defaultMaterial: 'sensor_plastic', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'wifi', colorOverlay2D: '#0284c7', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.COUNTING_GATE]:     { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: true, height: 2.2, baseElevation: 0 }, defaultMaterial: 'gate_metal',     snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'scan', colorOverlay2D: '#facc15', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.TOUCHPOINT]:        { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',           snapBehavior: 'none',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'hand', colorOverlay2D: '#ec4899', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.REST_AREA]:         { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'rest_overlay',   snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'armchair', colorOverlay2D: '#84cc16', visibleInVolumes: ['vol3'] },
  [MallVol3EntityType.PHOTO_SPOT]:        { productScope: ['mall_vol3'], category: 'experience_marker', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',           snapBehavior: 'none',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'camera', colorOverlay2D: '#f472b6', visibleInVolumes: ['vol3'] },

  // ─── VOL.4 — Wayfinder ──────────────────────────────────
  [MallVol4EntityType.WAYFINDER_TOTEM]:        { ...WAYFINDER_POINT('totem_brushed_metal', '#0ea5e9', 'flag', 2.4), visibleInVolumes: ['vol1', 'vol4'] },
  [MallVol4EntityType.WAYFINDER_HANGING_SIGN]: WAYFINDER_POINT('signage_metal', '#0ea5e9', 'flag', 0.4),
  [MallVol4EntityType.WAYFINDER_WALL_SIGN]:    WAYFINDER_POINT('signage_metal', '#0ea5e9', 'flag', 0.05),
  [MallVol4EntityType.WAYFINDER_FLOOR_MARKER]: { ...WAYFINDER_POINT('floor_marker_vinyl', '#0284c7', 'arrow-right', 0), defaultExtrusion: { enabled: false, height: 0, baseElevation: 0.001 }, snapBehavior: 'weak' },
  [MallVol4EntityType.YOU_ARE_HERE_POINT]:     WAYFINDER_POINT('totem_brushed_metal', '#0ea5e9', 'map-pin', 1.6),
  [MallVol4EntityType.DECISION_POINT]: {
    productScope: ['mall_vol4'], category: 'wayfinder',
    defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 },
    defaultMaterial: 'none', snapBehavior: 'weak', mergeWithSameType: false,
    renderInIsometric3D: false, contributesToGLA: false,
    iconRender2D: 'split', colorOverlay2D: '#0ea5e9',
    visibleInVolumes: ['vol4'],
  },
  [MallVol4EntityType.ELEVATOR]: {
    productScope: ['mall_vol4'], category: 'wayfinder',
    defaultExtrusion: { enabled: true, height: 2.5, baseElevation: 0 },
    defaultMaterial: 'elevator_metal', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'square', colorOverlay2D: '#94a3b8',
    visibleInVolumes: ['vol1', 'vol2', 'vol4'],
  },
  [MallVol4EntityType.ESCALATOR]: {
    productScope: ['mall_vol4'], category: 'wayfinder',
    defaultExtrusion: { enabled: true, height: 0.5, baseElevation: 0 },
    defaultMaterial: 'escalator_metal', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'arrow-up', colorOverlay2D: '#94a3b8',
    visibleInVolumes: ['vol1', 'vol2', 'vol4'],
  },
  [MallVol4EntityType.STAIRS]: {
    productScope: ['mall_vol4'], category: 'wayfinder',
    defaultExtrusion: { enabled: true, height: 0.1, baseElevation: 0 },
    defaultMaterial: 'concrete_wall', snapBehavior: 'strong', mergeWithSameType: false,
    renderInIsometric3D: true, contributesToGLA: false,
    iconRender2D: 'arrow-up', colorOverlay2D: '#94a3b8',
    visibleInVolumes: ['vol1', 'vol2', 'vol4'],
  },
  [MallVol4EntityType.PMR_PATH]:        { ...WAYFINDER_POINT('pmr_blue_overlay', '#2563eb', 'accessibility', 0), defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, snapBehavior: 'weak', mergeWithSameType: true },
  [MallVol4EntityType.PMR_RAMP]:        { ...WAYFINDER_POINT('ramp_concrete', '#2563eb', 'arrow-up-right', 0.1), snapBehavior: 'strong' },
  [MallVol4EntityType.PMR_RESTROOM]:    { ...WAYFINDER_POINT('pmr_blue_overlay', '#2563eb', 'wc', 0), renderInIsometric3D: false },
  [MallVol4EntityType.TACTILE_GUIDE]:   { ...WAYFINDER_POINT('tactile_yellow', '#eab308', 'minus', 0), defaultExtrusion: { enabled: false, height: 0, baseElevation: 0.005 }, snapBehavior: 'weak', mergeWithSameType: true },
  [MallVol4EntityType.BRAILLE_SIGN]:    WAYFINDER_POINT('braille_metal', '#475569', 'square', 0.05),
  [MallVol4EntityType.AUDIO_BEACON]:    WAYFINDER_POINT('beacon_plastic', '#7c3aed', 'volume-2', 0.15),

  // ─── WiseFM — Equipment ─────────────────────────────────
  [WiseFMEntityType.EQUIPMENT_HVAC]:       { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 1.0, baseElevation: 0 }, defaultMaterial: 'hvac_metal',     snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'snowflake',  colorOverlay2D: '#0ea5e9', visibleInVolumes: [] },
  [WiseFMEntityType.EQUIPMENT_ELECTRICAL]: { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 1.5, baseElevation: 0 }, defaultMaterial: 'panel_metal',    snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'zap',        colorOverlay2D: '#facc15', visibleInVolumes: [] },
  [WiseFMEntityType.EQUIPMENT_PLUMBING]:   { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 0.6, baseElevation: 0 }, defaultMaterial: 'plumbing_metal', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'droplet',    colorOverlay2D: '#0284c7', visibleInVolumes: [] },
  [WiseFMEntityType.EQUIPMENT_LIFT]:       { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 2.5, baseElevation: 0 }, defaultMaterial: 'elevator_metal', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'arrow-up',   colorOverlay2D: '#94a3b8', visibleInVolumes: [] },
  [WiseFMEntityType.EQUIPMENT_GENERIC]:    { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 1.0, baseElevation: 0 }, defaultMaterial: 'equipment_grey', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'wrench',     colorOverlay2D: '#64748b', visibleInVolumes: [] },
  [WiseFMEntityType.WORKCENTER]:           { productScope: ['wisefm'], category: 'logical',   defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',           snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'factory',    colorOverlay2D: '#7e5e3c', visibleInVolumes: [] },
  [WiseFMEntityType.INSPECTION_POINT]:     { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',           snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'check-circle', colorOverlay2D: '#16a34a', visibleInVolumes: [] },
  [WiseFMEntityType.PATROL_ROUTE]:         { productScope: ['wisefm'], category: 'logical',   defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'patrol_overlay', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'route',      colorOverlay2D: '#a855f7', visibleInVolumes: [] },
  [WiseFMEntityType.MAINTENANCE_ZONE]:     { productScope: ['wisefm'], category: 'logical',   defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none',           snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'wrench',     colorOverlay2D: '#7e5e3c', visibleInVolumes: [] },
  [WiseFMEntityType.VALVE]:                { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 0.3, baseElevation: 0 }, defaultMaterial: 'valve_metal',   snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'circle-dot', colorOverlay2D: '#dc2626', visibleInVolumes: [] },
  [WiseFMEntityType.METER]:                { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 0.4, baseElevation: 0 }, defaultMaterial: 'meter_plastic', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'gauge',      colorOverlay2D: '#0284c7', visibleInVolumes: [] },
  [WiseFMEntityType.ELECTRICAL_PANEL]:     { productScope: ['wisefm'], category: 'equipment', defaultExtrusion: { enabled: true, height: 1.8, baseElevation: 0 }, defaultMaterial: 'panel_metal',   snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: true, contributesToGLA: false, iconRender2D: 'zap',        colorOverlay2D: '#facc15', visibleInVolumes: [] },

  // ─── Atlas Lease ────────────────────────────────────────
  [AtlasLeaseEntityType.LEASE_LOT_PRIVATE]:  { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: true,  iconRender2D: 'square',         colorOverlay2D: '#3b82f6', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.LEASE_LOT_COMMON]:   { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'square-dashed', colorOverlay2D: '#a8c2d6', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.USEFUL_AREA]:        { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'ruler',         colorOverlay2D: '#22c55e', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.WEIGHTED_AREA]:      { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'scale',         colorOverlay2D: '#f59e0b', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.GLA_AREA]:           { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: true,  iconRender2D: 'building',      colorOverlay2D: '#7c3aed', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.BUILDING_FOOTPRINT]: { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'strong', mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'building',      colorOverlay2D: '#475569', visibleInVolumes: ['vol1'] },
  [AtlasLeaseEntityType.EASEMENT]:           { productScope: ['atlas_lease'], category: 'logical', defaultExtrusion: { enabled: false, height: 0, baseElevation: 0 }, defaultMaterial: 'none', snapBehavior: 'weak',   mergeWithSameType: false, renderInIsometric3D: false, contributesToGLA: false, iconRender2D: 'square-dashed', colorOverlay2D: '#94a3b8', visibleInVolumes: ['vol1'] },
}

/**
 * Lookup avec fallback sur ZONE_GENERIC pour les types inconnus.
 * Évite les crashes runtime sur des types legacy non migrés.
 */
export function getEntityMetadata(typeId: string): EntityTypeMetadata {
  return ENTITY_TYPE_METADATA[typeId] ?? ENTITY_TYPE_METADATA[CoreEntityType.ZONE_GENERIC]
}
