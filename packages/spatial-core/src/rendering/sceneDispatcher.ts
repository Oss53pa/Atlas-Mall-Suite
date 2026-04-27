// ═══ SCENE DISPATCHER — Décide COMMENT rendre une entité en 3D ═══
//
// Chaque type d'entité a une stratégie de rendu différente :
//   • wall              → extrusion verticale + CSG des ouvertures
//   • opening           → géré par le mur parent (pas rendu seul)
//   • floor             → surface plane Y=0
//   • low_volume        → extrusion basse (0.1–0.5 m)
//   • vegetation+TREE   → instance d'arbre (sphère + tronc)
//   • vegetation+other  → surface plane verte
//   • logical           → NON rendu en 3D (overlay 2D uniquement)
//   • furniture         → instance de mobilier
//   • safety_marker     → pictogramme + objet 3D selon hauteur
//   • experience_marker → overlay 2D (pas rendu 3D)
//   • wayfinder         → totem ou panneau ou marqueur sol
//   • equipment         → boîte simple (à raffiner avec assets WiseFM)
//
// Ce dispatcher renvoie une RenderDirective décrivant le pipeline à
// utiliser. Le composant React Three Fiber consommateur lit la directive
// et instancie le bon mesh.

import type { SpatialEntity } from '../domain/SpatialEntity'
import { getEntityMetadata } from '../domain/EntityTypeMetadata'
import { CoreEntityType } from '../domain/EntityType'

export type RenderStrategy =
  | 'wall_extrusion'
  | 'flat_surface'
  | 'low_volume_extrusion'
  | 'tree_instance'
  | 'palm_instance'
  | 'car_instance'
  | 'point_instance'
  | 'wayfinder_instance'
  | 'safety_marker_instance'
  | 'equipment_instance'
  | 'experience_overlay_2d'
  | 'skip'                        // logical entities, openings (managed by parent)

export interface RenderDirective {
  readonly strategy: RenderStrategy
  readonly extrusionHeight: number
  readonly baseElevation: number
  readonly materialId: string
  readonly castShadow: boolean
  readonly receiveShadow: boolean
}

export function getRenderDirective(entity: SpatialEntity): RenderDirective {
  const meta = getEntityMetadata(entity.type)

  // 1. Logiques / experience markers / openings : pas rendus en 3D directement
  if (!meta.renderInIsometric3D || meta.category === 'opening') {
    return {
      strategy: meta.category === 'experience_marker' ? 'experience_overlay_2d' : 'skip',
      extrusionHeight: 0,
      baseElevation: 0,
      materialId: 'none',
      castShadow: false,
      receiveShadow: false,
    }
  }

  const baseDirective = {
    extrusionHeight: entity.extrusion.height,
    baseElevation: entity.extrusion.baseElevation,
    materialId: entity.material,
  }

  // 2. Stratégies par catégorie
  switch (meta.category) {
    case 'wall':
      return { ...baseDirective, strategy: 'wall_extrusion', castShadow: true, receiveShadow: true }

    case 'floor':
      return { ...baseDirective, strategy: 'flat_surface', castShadow: false, receiveShadow: true }

    case 'low_volume':
      return { ...baseDirective, strategy: 'low_volume_extrusion', castShadow: true, receiveShadow: true }

    case 'vegetation':
      if (entity.type === CoreEntityType.TREE_PALM) {
        return { ...baseDirective, strategy: 'palm_instance', castShadow: true, receiveShadow: false }
      }
      if (entity.type === CoreEntityType.TREE || entity.type === CoreEntityType.TREE_DECIDUOUS) {
        return { ...baseDirective, strategy: 'tree_instance', castShadow: true, receiveShadow: false }
      }
      if (entity.type === CoreEntityType.SHRUB) {
        return { ...baseDirective, strategy: 'low_volume_extrusion', castShadow: true, receiveShadow: true }
      }
      return { ...baseDirective, strategy: 'flat_surface', castShadow: false, receiveShadow: true }

    case 'furniture':
      if (entity.type === CoreEntityType.CAR_INSTANCE) {
        return { ...baseDirective, strategy: 'car_instance', castShadow: true, receiveShadow: false }
      }
      return { ...baseDirective, strategy: 'point_instance', castShadow: true, receiveShadow: true }

    case 'safety_marker':
      return { ...baseDirective, strategy: 'safety_marker_instance', castShadow: true, receiveShadow: true }

    case 'wayfinder':
      return { ...baseDirective, strategy: 'wayfinder_instance', castShadow: true, receiveShadow: true }

    case 'equipment':
      return { ...baseDirective, strategy: 'equipment_instance', castShadow: true, receiveShadow: true }

    default:
      return { ...baseDirective, strategy: 'skip', castShadow: false, receiveShadow: false }
  }
}
