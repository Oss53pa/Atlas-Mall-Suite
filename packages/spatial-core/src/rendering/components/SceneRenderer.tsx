// ═══ <SceneRenderer> — Dispatcher 3D principal ═══
//
// Lit chaque SpatialEntity, calcule la RenderDirective via sceneDispatcher,
// et instancie le bon composant React Three Fiber.
//
// À monter dans un Canvas R3F :
//   <Canvas>
//     <SceneRenderer entities={spatial} />
//   </Canvas>

import { Fragment } from 'react'
import type { SpatialEntity } from '../../domain/SpatialEntity'
import { getRenderDirective } from '../sceneDispatcher'
import { WallExtrusion } from './WallExtrusion'
import { FlatSurface } from './FlatSurface'
import { LowVolumeExtrusion } from './LowVolumeExtrusion'
import { TreeInstance } from './TreeInstance'
import { PalmInstance } from './PalmInstance'
import { CarInstance } from './CarInstance'
import { PointInstance } from './PointInstance'
import { WayfinderInstance } from './WayfinderInstance'
import { SafetyMarkerInstance } from './SafetyMarkerInstance'
import { EquipmentInstance } from './EquipmentInstance'

interface Props {
  readonly entities: ReadonlyArray<SpatialEntity>
}

export function SceneRenderer({ entities }: Props) {
  return (
    <Fragment>
      {entities.map(e => {
        const d = getRenderDirective(e)
        switch (d.strategy) {
          case 'wall_extrusion':
            return <WallExtrusion key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          case 'flat_surface':
            return <FlatSurface key={e.id} entity={e} baseElevation={d.baseElevation} />
          case 'low_volume_extrusion':
            return <LowVolumeExtrusion key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          case 'tree_instance':
            return <TreeInstance key={e.id} entity={e} height={d.extrusionHeight} />
          case 'palm_instance':
            return <PalmInstance key={e.id} entity={e} height={d.extrusionHeight} />
          case 'car_instance':
            return <CarInstance key={e.id} entity={e} />
          case 'point_instance':
            return <PointInstance key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          case 'wayfinder_instance':
            return <WayfinderInstance key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          case 'safety_marker_instance':
            return <SafetyMarkerInstance key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          case 'equipment_instance':
            return <EquipmentInstance key={e.id} entity={e} height={d.extrusionHeight} baseElevation={d.baseElevation} />
          // 'experience_overlay_2d' et 'skip' → null
          default:
            return null
        }
      })}
    </Fragment>
  )
}
