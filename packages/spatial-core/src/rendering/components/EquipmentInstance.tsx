// ═══ <EquipmentInstance> — Équipement WiseFM ═══
// Box étiquetée par type (CVC, vanne, compteur, etc.). À enrichir avec
// assets GLB métier Sprint WiseFM.

import { PointInstance } from './PointInstance'
import type { SpatialEntity } from '../../domain/SpatialEntity'

interface Props {
  readonly entity: SpatialEntity
  readonly height: number
  readonly baseElevation: number
}

export function EquipmentInstance(props: Props) {
  // En rc.1 c'est strictement équivalent à PointInstance ; on garde le
  // composant séparé pour pouvoir greffer des assets GLB par type plus tard.
  return <PointInstance {...props} />
}
