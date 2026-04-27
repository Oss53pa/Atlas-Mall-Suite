// ═══ MATERIAL REGISTRY — Matériaux + textures pour rendu 3D ═══
//
// Source unique des matériaux référencés par EntityTypeMetadata.
// Chaque entrée :
//   • id (référencé par defaultMaterial)
//   • baseColor (fallback si pas de texture)
//   • textureUrl (optionnel, Supabase Storage bucket `spatial-textures`)
//   • normalMapUrl, roughnessMapUrl (optionnels — PBR)
//   • repeat (pattern de répétition UV)
//
// Côté rendu Three.js, on construit un MeshStandardMaterial à la demande.

import type { MaterialId } from './EntityTypeMetadata'

export interface MaterialDef {
  readonly id: MaterialId
  readonly displayName: string
  readonly baseColor: string                       // hex, fallback si pas de texture
  readonly textureUrl?: string                     // diffuse / albedo
  readonly normalMapUrl?: string
  readonly roughnessMapUrl?: string
  readonly metalness: number                       // 0..1
  readonly roughness: number                       // 0..1
  readonly opacity: number                         // 0..1
  readonly transparent: boolean
  readonly repeat: { x: number; y: number }        // UV repeat factor
  readonly emissive?: string                       // pour signalétique lumineuse
  readonly emissiveIntensity?: number
}

const TEXTURE_BUCKET_BASE = 'https://wrdtatquhpiwzxmdupfi.supabase.co/storage/v1/object/public/spatial-textures'

/** Construit l'URL d'une texture stockée dans le bucket Supabase. */
function texUrl(filename: string): string {
  return `${TEXTURE_BUCKET_BASE}/${filename}`
}

const DEFAULT_REPEAT = { x: 1, y: 1 }

// ─── Registre central — 25 matériaux ─────────────────────

export const MATERIAL_REGISTRY: Record<MaterialId, MaterialDef> = {
  // ─── Murs ─────────────────────────────────────────────
  concrete_wall: {
    id: 'concrete_wall', displayName: 'Béton', baseColor: '#a8a8a8',
    textureUrl: texUrl('concrete_wall_diffuse_1k.jpg'),
    normalMapUrl: texUrl('concrete_wall_normal_1k.jpg'),
    metalness: 0.0, roughness: 0.85, opacity: 1, transparent: false,
    repeat: { x: 4, y: 4 },
  },
  partition_drywall: {
    id: 'partition_drywall', displayName: 'Cloison plâtre', baseColor: '#e8e6e0',
    metalness: 0.0, roughness: 0.95, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  facade_stone: {
    id: 'facade_stone', displayName: 'Pierre de façade', baseColor: '#9c9590',
    textureUrl: texUrl('facade_stone_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.8, opacity: 1, transparent: false,
    repeat: { x: 3, y: 3 },
  },
  glass_wall: {
    id: 'glass_wall', displayName: 'Verre', baseColor: '#9ec6e8',
    metalness: 0.1, roughness: 0.05, opacity: 0.35, transparent: true, repeat: DEFAULT_REPEAT,
  },

  // ─── Portes ────────────────────────────────────────────
  door_wood: {
    id: 'door_wood', displayName: 'Porte bois', baseColor: '#8b6914',
    textureUrl: texUrl('door_wood_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.6, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  door_glass: {
    id: 'door_glass', displayName: 'Porte automatique verre', baseColor: '#9ec6e8',
    metalness: 0.2, roughness: 0.05, opacity: 0.4, transparent: true, repeat: DEFAULT_REPEAT,
  },
  fire_door: {
    id: 'fire_door', displayName: 'Porte coupe-feu', baseColor: '#dc2626',
    metalness: 0.3, roughness: 0.5, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  window_glass: {
    id: 'window_glass', displayName: 'Fenêtre', baseColor: '#9ec6e8',
    metalness: 0.05, roughness: 0.05, opacity: 0.3, transparent: true, repeat: DEFAULT_REPEAT,
  },

  // ─── Sols ──────────────────────────────────────────────
  floor_tile_ceramic: {
    id: 'floor_tile_ceramic', displayName: 'Carrelage céramique', baseColor: '#d4d0c8',
    textureUrl: texUrl('floor_tile_ceramic_diffuse_1k.jpg'),
    metalness: 0.05, roughness: 0.4, opacity: 1, transparent: false, repeat: { x: 8, y: 8 },
  },
  floor_parquet: {
    id: 'floor_parquet', displayName: 'Parquet', baseColor: '#a07050',
    textureUrl: texUrl('parquet_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.55, opacity: 1, transparent: false, repeat: { x: 4, y: 4 },
  },
  floor_concrete: {
    id: 'floor_concrete', displayName: 'Béton lissé', baseColor: '#a8a8a8',
    metalness: 0.0, roughness: 0.7, opacity: 1, transparent: false, repeat: { x: 6, y: 6 },
  },
  paved_stone: {
    id: 'paved_stone', displayName: 'Pavés', baseColor: '#8a8074',
    textureUrl: texUrl('paved_stone_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.85, opacity: 1, transparent: false, repeat: { x: 6, y: 6 },
  },
  asphalt: {
    id: 'asphalt', displayName: 'Bitume', baseColor: '#3a3a3a',
    textureUrl: texUrl('asphalt_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.95, opacity: 1, transparent: false, repeat: { x: 6, y: 6 },
  },
  asphalt_marked: {
    id: 'asphalt_marked', displayName: 'Bitume + marquages', baseColor: '#5c5c5c',
    textureUrl: texUrl('asphalt_marked_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.9, opacity: 1, transparent: false, repeat: { x: 4, y: 4 },
  },
  paint_white: {
    id: 'paint_white', displayName: 'Peinture blanche (marquage)', baseColor: '#f5f5f5',
    metalness: 0.0, roughness: 0.6, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Volumes bas ──────────────────────────────────────
  planter_concrete: {
    id: 'planter_concrete', displayName: 'Jardinière béton', baseColor: '#a07050',
    metalness: 0.0, roughness: 0.85, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  terre_plein_grass: {
    id: 'terre_plein_grass', displayName: 'Terre-plein engazonné', baseColor: '#7a9b6e',
    textureUrl: texUrl('grass_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.9, opacity: 1, transparent: false, repeat: { x: 4, y: 4 },
  },
  curb_concrete: {
    id: 'curb_concrete', displayName: 'Bordure béton', baseColor: '#909090',
    metalness: 0.0, roughness: 0.8, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  bench_wood: {
    id: 'bench_wood', displayName: 'Banc bois', baseColor: '#8b6914',
    metalness: 0.0, roughness: 0.6, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Végétation ────────────────────────────────────────
  grass: {
    id: 'grass', displayName: 'Pelouse', baseColor: '#4a7c3a',
    textureUrl: texUrl('grass_diffuse_1k.jpg'),
    metalness: 0.0, roughness: 0.95, opacity: 1, transparent: false, repeat: { x: 8, y: 8 },
  },
  garden_mulch: {
    id: 'garden_mulch', displayName: 'Massif paillage', baseColor: '#6b4423',
    metalness: 0.0, roughness: 0.95, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  tree_oak: {
    id: 'tree_oak', displayName: 'Arbre (chêne)', baseColor: '#2d5016',
    metalness: 0.0, roughness: 0.9, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Mobilier / signalétique ──────────────────────────
  trash_metal: {
    id: 'trash_metal', displayName: 'Poubelle métal', baseColor: '#374151',
    metalness: 0.7, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  lamp_metal: {
    id: 'lamp_metal', displayName: 'Lampadaire', baseColor: '#1f2937',
    metalness: 0.8, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
    emissive: '#fbbf24', emissiveIntensity: 0.3,
  },
  signage_metal: {
    id: 'signage_metal', displayName: 'Panneau métal', baseColor: '#0ea5e9',
    metalness: 0.5, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  totem_brushed_metal: {
    id: 'totem_brushed_metal', displayName: 'Totem alu brossé', baseColor: '#94a3b8',
    metalness: 0.85, roughness: 0.25, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  floor_marker_vinyl: {
    id: 'floor_marker_vinyl', displayName: 'Marqueur sol vinyle', baseColor: '#0284c7',
    metalness: 0.0, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Sécurité ──────────────────────────────────────────
  safety_green: {
    id: 'safety_green', displayName: 'Signalétique secours (vert)', baseColor: '#16a34a',
    metalness: 0.3, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
    emissive: '#16a34a', emissiveIntensity: 0.4,
  },
  safety_overlay: {
    id: 'safety_overlay', displayName: 'Overlay sécurité', baseColor: '#16a34a',
    metalness: 0, roughness: 1, opacity: 0.35, transparent: true, repeat: DEFAULT_REPEAT,
  },
  ria_red: {
    id: 'ria_red', displayName: 'RIA / extincteur', baseColor: '#dc2626',
    metalness: 0.5, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  alarm_red: {
    id: 'alarm_red', displayName: 'Alarme', baseColor: '#ef4444',
    metalness: 0.4, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
    emissive: '#ef4444', emissiveIntensity: 0.5,
  },
  defib_red: {
    id: 'defib_red', displayName: 'Défibrillateur', baseColor: '#ef4444',
    metalness: 0.3, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  first_aid: {
    id: 'first_aid', displayName: 'Premiers secours', baseColor: '#22c55e',
    metalness: 0.2, roughness: 0.5, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  cctv_metal: {
    id: 'cctv_metal', displayName: 'Caméra CCTV', baseColor: '#1f2937',
    metalness: 0.8, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  access_metal: {
    id: 'access_metal', displayName: 'Contrôle d\'accès', baseColor: '#7e5e3c',
    metalness: 0.6, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── PMR ───────────────────────────────────────────────
  pmr_blue_overlay: {
    id: 'pmr_blue_overlay', displayName: 'Overlay PMR (bleu)', baseColor: '#2563eb',
    metalness: 0, roughness: 1, opacity: 0.35, transparent: true, repeat: DEFAULT_REPEAT,
  },
  ramp_concrete: {
    id: 'ramp_concrete', displayName: 'Rampe béton', baseColor: '#9ca3af',
    metalness: 0, roughness: 0.85, opacity: 1, transparent: false, repeat: { x: 3, y: 3 },
  },
  tactile_yellow: {
    id: 'tactile_yellow', displayName: 'Bande tactile jaune', baseColor: '#eab308',
    metalness: 0, roughness: 0.7, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  braille_metal: {
    id: 'braille_metal', displayName: 'Plaque braille', baseColor: '#475569',
    metalness: 0.7, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  beacon_plastic: {
    id: 'beacon_plastic', displayName: 'Balise audio', baseColor: '#7c3aed',
    metalness: 0.2, roughness: 0.5, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Heatmap & overlays Vol.3 ────────────────────────
  heatmap_warm_overlay: {
    id: 'heatmap_warm_overlay', displayName: 'Heatmap chaud', baseColor: '#f97316',
    metalness: 0, roughness: 1, opacity: 0.5, transparent: true, repeat: DEFAULT_REPEAT,
  },
  heatmap_overlay: {
    id: 'heatmap_overlay', displayName: 'Heatmap', baseColor: '#a855f7',
    metalness: 0, roughness: 1, opacity: 0.4, transparent: true, repeat: DEFAULT_REPEAT,
  },
  path_overlay: {
    id: 'path_overlay', displayName: 'Parcours overlay', baseColor: '#06b6d4',
    metalness: 0, roughness: 1, opacity: 0.5, transparent: true, repeat: DEFAULT_REPEAT,
  },
  rest_overlay: {
    id: 'rest_overlay', displayName: 'Zone repos overlay', baseColor: '#84cc16',
    metalness: 0, roughness: 1, opacity: 0.4, transparent: true, repeat: DEFAULT_REPEAT,
  },
  patrol_overlay: {
    id: 'patrol_overlay', displayName: 'Ronde overlay', baseColor: '#a855f7',
    metalness: 0, roughness: 1, opacity: 0.4, transparent: true, repeat: DEFAULT_REPEAT,
  },

  // ─── Capteurs / mesure ─────────────────────────────────
  sensor_plastic: {
    id: 'sensor_plastic', displayName: 'Capteur plastique', baseColor: '#0284c7',
    metalness: 0.2, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  gate_metal: {
    id: 'gate_metal', displayName: 'Portique comptage', baseColor: '#facc15',
    metalness: 0.6, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── WiseFM équipement ─────────────────────────────────
  hvac_metal: { id: 'hvac_metal', displayName: 'Bloc CVC', baseColor: '#475569', metalness: 0.7, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  panel_metal: { id: 'panel_metal', displayName: 'Tableau électrique', baseColor: '#facc15', metalness: 0.5, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  plumbing_metal: { id: 'plumbing_metal', displayName: 'Plomberie', baseColor: '#0284c7', metalness: 0.7, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  elevator_metal: { id: 'elevator_metal', displayName: 'Cabine ascenseur', baseColor: '#94a3b8', metalness: 0.7, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  escalator_metal: { id: 'escalator_metal', displayName: 'Escalator', baseColor: '#94a3b8', metalness: 0.6, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  equipment_grey: { id: 'equipment_grey', displayName: 'Équipement générique', baseColor: '#64748b', metalness: 0.5, roughness: 0.5, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  valve_metal: { id: 'valve_metal', displayName: 'Vanne', baseColor: '#dc2626', metalness: 0.8, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  meter_plastic: { id: 'meter_plastic', displayName: 'Compteur', baseColor: '#0284c7', metalness: 0.2, roughness: 0.4, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },

  // ─── Instances décoratives photoréalistes ──────────────
  car_paint: {
    id: 'car_paint', displayName: 'Carrosserie voiture', baseColor: '#475569',
    metalness: 0.7, roughness: 0.25, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  tree_palm: {
    id: 'tree_palm', displayName: 'Palmier', baseColor: '#3a6b1f',
    metalness: 0.0, roughness: 0.85, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },
  shrub_green: {
    id: 'shrub_green', displayName: 'Arbuste', baseColor: '#5c8a45',
    metalness: 0.0, roughness: 0.95, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT,
  },

  // ─── Mobilier Vol.1 ────────────────────────────────────
  atm_metal: { id: 'atm_metal', displayName: 'DAB', baseColor: '#16a34a', metalness: 0.6, roughness: 0.3, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },
  desk_wood: { id: 'desk_wood', displayName: 'Caisse / comptoir bois', baseColor: '#8b6914', metalness: 0.0, roughness: 0.6, opacity: 1, transparent: false, repeat: DEFAULT_REPEAT },

  // ─── Fallback ──────────────────────────────────────────
  none: {
    id: 'none', displayName: '(invisible)', baseColor: '#000000',
    metalness: 0, roughness: 1, opacity: 0, transparent: true, repeat: DEFAULT_REPEAT,
  },
}

/** Lookup avec fallback sur concrete_wall si MaterialId inconnu. */
export function getMaterial(materialId: MaterialId): MaterialDef {
  return MATERIAL_REGISTRY[materialId] ?? MATERIAL_REGISTRY['concrete_wall']
}
