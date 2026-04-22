// ═══ Scene Editor — Catalogues de mobilier, personnages, revetements ═══

import type { CatalogCategory, CharacterCategory, TextureItemDef } from './sceneEditorTypes'

// ── Sources d'assets (licences libres) ──

export const ASSET_SOURCES = {
  kenney: { name: 'Kenney.nl', license: 'CC0 1.0', format: ['GLB', 'OBJ'] },
  quaternius: { name: 'Quaternius.com', license: 'CC0 1.0', format: ['GLB'] },
  poly_pizza: { name: 'Poly Pizza', license: 'CC-BY 3.0', format: ['GLB'] },
} as const

// ── Catalogue de mobilier ──

export const FURNITURE_CATALOG: Record<string, CatalogCategory> = {
  restauration: {
    label: 'Restauration',
    color: '#D85A30',
    items: [
      { id: 'table_2p',    name: 'Table 2 personnes',   category: 'restauration', w: 0.8, d: 0.8, h: 0.75, src: 'kenney/furniture/table_square.glb' },
      { id: 'table_4p',    name: 'Table 4 personnes',   category: 'restauration', w: 1.2, d: 0.8, h: 0.75, src: 'kenney/furniture/table_rectangle.glb' },
      { id: 'table_ronde', name: 'Table ronde',         category: 'restauration', w: 1.0, d: 1.0, h: 0.75, src: 'kenney/furniture/table_round.glb' },
      { id: 'chaise_bois', name: 'Chaise bois',         category: 'restauration', w: 0.5, d: 0.5, h: 0.9,  src: 'quaternius/furniture/chair_wood.glb' },
      { id: 'banquette',   name: 'Banquette circulaire',category: 'restauration', w: 2.0, d: 2.0, h: 0.45, src: 'kenney/furniture/sofa_round.glb' },
      { id: 'comptoir',    name: 'Comptoir service',    category: 'restauration', w: 3.0, d: 0.7, h: 1.1,  src: 'kenney/furniture/counter.glb' },
      { id: 'buffet',      name: 'Buffet self-service', category: 'restauration', w: 4.0, d: 0.8, h: 1.2,  src: 'kenney/furniture/shelf_long.glb' },
    ],
  },
  mode: {
    label: 'Boutique mode',
    color: '#7e5e3c',
    items: [
      { id: 'rayon_veste', name: 'Rayon vetements',     category: 'mode', w: 1.2, d: 0.5, h: 1.8,  src: 'kenney/furniture/shelf_clothes.glb' },
      { id: 'presentoir',  name: 'Presentoir rond',     category: 'mode', w: 0.8, d: 0.8, h: 1.4,  src: 'kenney/furniture/rack_round.glb' },
      { id: 'vitrine',     name: 'Vitrine murale',      category: 'mode', w: 2.0, d: 0.4, h: 2.0,  src: 'kenney/furniture/display_wall.glb' },
      { id: 'cabine',      name: 'Cabine essayage',     category: 'mode', w: 1.2, d: 1.2, h: 2.2,  src: 'kenney/room/cabin.glb' },
      { id: 'caisse',      name: 'Caisse enregistreuse',category: 'mode', w: 1.2, d: 0.6, h: 1.0,  src: 'kenney/furniture/register.glb' },
      { id: 'mannequin',   name: 'Mannequin',           category: 'mode', w: 0.4, d: 0.4, h: 1.8,  src: 'quaternius/furniture/mannequin.glb' },
    ],
  },
  decoration: {
    label: 'Decoration',
    color: '#1D9E75',
    items: [
      { id: 'plante_pot',  name: 'Plante en pot',       category: 'decoration', w: 0.5, d: 0.5, h: 1.2,  src: 'quaternius/plants/plant_pot.glb' },
      { id: 'arbre_int',   name: 'Arbre interieur',     category: 'decoration', w: 1.5, d: 1.5, h: 3.5,  src: 'quaternius/plants/tree_indoor.glb' },
      { id: 'jardiniere',  name: 'Jardiniere',          category: 'decoration', w: 2.0, d: 0.6, h: 0.8,  src: 'kenney/nature/planter.glb' },
      { id: 'structure_b', name: 'Structure bambou',    category: 'decoration', w: 2.0, d: 2.0, h: 2.5,  src: 'kenney/nature/dome_wood.glb' },
      { id: 'luminaire',   name: 'Luminaire suspendu',  category: 'decoration', w: 0.4, d: 0.4, h: 0.3,  src: 'kenney/furniture/lamp_pendant.glb' },
      { id: 'enseigne',    name: 'Panneau enseigne',    category: 'decoration', w: 2.0, d: 0.1, h: 0.6,  src: 'kenney/city/sign_board.glb' },
    ],
  },
  mobilier_general: {
    label: 'Mobilier general',
    color: '#6B7280',
    items: [
      { id: 'banc_public',  name: 'Banc public',        category: 'mobilier_general', w: 1.8, d: 0.5, h: 0.45, src: 'kenney/furniture/bench.glb' },
      { id: 'poubelle',     name: 'Poubelle tri',       category: 'mobilier_general', w: 0.6, d: 0.6, h: 0.9,  src: 'kenney/furniture/bin_triple.glb' },
      { id: 'borne_info',   name: 'Borne interactive',  category: 'mobilier_general', w: 0.6, d: 0.6, h: 1.5,  src: 'kenney/city/kiosk.glb' },
      { id: 'escalator',    name: 'Escalator',          category: 'mobilier_general', w: 1.2, d: 8.0, h: 4.0,  src: 'kenney/city/escalator.glb' },
    ],
  },
}

// ── Catalogue de personnages ──

export const CHARACTER_CATALOG: Record<string, CharacterCategory> = {
  familles: {
    label: 'Familles',
    items: [
      { id: 'famille_4',    name: 'Famille 4 personnes', category: 'familles',  count: 4, animation: 'idle_group' },
      { id: 'famille_3',    name: 'Famille 3 personnes', category: 'familles',  count: 3, animation: 'walking' },
      { id: 'couple',       name: 'Couple',              category: 'familles',  count: 2, animation: 'talking' },
    ],
  },
  individus: {
    label: 'Individus',
    items: [
      { id: 'femme_adulte', name: 'Femme adulte',        category: 'individus', count: 1, animation: 'idle_stand' },
      { id: 'homme_adulte', name: 'Homme adulte',        category: 'individus', count: 1, animation: 'idle_stand' },
      { id: 'enfant',       name: 'Enfant',              category: 'individus', count: 1, animation: 'walking' },
      { id: 'senior',       name: 'Senior',              category: 'individus', count: 1, animation: 'idle_stand' },
    ],
  },
  groupes: {
    label: 'Groupes',
    items: [
      { id: 'groupe_amis',  name: 'Groupe amis (4)',     category: 'groupes',   count: 4, animation: 'idle_group' },
      { id: 'queue',        name: 'File d\'attente (5)', category: 'groupes',   count: 5, animation: 'idle_stand', formation: 'line' },
      { id: 'foule_dense',  name: 'Foule dense',         category: 'groupes',   count: 12, animation: 'walking', formation: 'scatter' },
      { id: 'foule_legere', name: 'Foule legere',        category: 'groupes',   count: 6, animation: 'walking', formation: 'scatter' },
    ],
  },
  staff: {
    label: 'Personnel',
    items: [
      { id: 'vendeur',      name: 'Vendeur boutique',    category: 'staff',     count: 1, animation: 'idle_stand', badge: true },
      { id: 'securite',     name: 'Agent securite',      category: 'staff',     count: 1, animation: 'idle_stand', uniform: 'security' },
      { id: 'serveur',      name: 'Serveur restauration',category: 'staff',     count: 1, animation: 'walking', uniform: 'apron' },
    ],
  },
}

// ── Catalogue de revetements ──

export const TEXTURE_CATALOG: TextureItemDef[] = [
  { id: 'sol_terrazzo',  name: 'Terrazzo clair',   type: 'floor',   texture: 'terrazzo_light' },
  { id: 'sol_beton',     name: 'Beton poli',       type: 'floor',   texture: 'concrete_polished' },
  { id: 'sol_parquet',   name: 'Parquet chene',    type: 'floor',   texture: 'wood_oak' },
  { id: 'mur_blanc',     name: 'Mur blanc mat',    type: 'wall',    texture: 'wall_white' },
  { id: 'mur_brique',    name: 'Brique apparente', type: 'wall',    texture: 'brick_exposed' },
  { id: 'plafond_bois',  name: 'Lamelles bois',    type: 'ceiling', texture: 'wood_slats' },
]

// ── Helpers ──

export function getAllFurnitureItems() {
  return Object.values(FURNITURE_CATALOG).flatMap(cat => cat.items)
}

export function getFurnitureById(id: string) {
  return getAllFurnitureItems().find(item => item.id === id)
}

export function getAllCharacterItems() {
  return Object.values(CHARACTER_CATALOG).flatMap(cat => cat.items)
}

export function getCharacterById(id: string) {
  return getAllCharacterItems().find(item => item.id === id)
}
