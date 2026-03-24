// ═══ WEB WORKER — DIM PARSER (NON-BLOQUANT) ═══

import { extractDimEntities, calibratePlanFromDims, linkDimsToZones } from '../modules/cosmos-angre/shared/planReader/dimParser'
import type { DimEntity, CalibrationResult, Zone } from '../modules/cosmos-angre/shared/planReader/planReaderTypes'
import type { DXFEntity } from '../modules/cosmos-angre/shared/proph3t/types'

export interface DimParserRequest {
  type: 'extract' | 'calibrate' | 'linkZones'
  entities?: DXFEntity[]
  dims?: DimEntity[]
  zones?: Zone[]
  planBounds?: { minX: number; minY: number; maxX: number; maxY: number }
  planWidth?: number
}

export interface DimParserResponse {
  type: 'extract' | 'calibrate' | 'linkZones'
  dims?: DimEntity[]
  calibration?: CalibrationResult
}

self.onmessage = (event: MessageEvent<DimParserRequest>) => {
  const { type } = event.data

  switch (type) {
    case 'extract': {
      const dims = extractDimEntities(event.data.entities ?? [])
      const response: DimParserResponse = { type: 'extract', dims }
      self.postMessage(response)
      break
    }
    case 'calibrate': {
      const calibration = calibratePlanFromDims(
        event.data.dims ?? [],
        event.data.planBounds ?? { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
      )
      const response: DimParserResponse = { type: 'calibrate', calibration }
      self.postMessage(response)
      break
    }
    case 'linkZones': {
      const linked = linkDimsToZones(
        event.data.dims ?? [],
        event.data.zones ?? [],
        event.data.planWidth ?? 1000
      )
      const response: DimParserResponse = { type: 'linkZones', dims: linked }
      self.postMessage(response)
      break
    }
  }
}
