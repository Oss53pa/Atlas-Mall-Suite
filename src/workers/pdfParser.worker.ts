// ═══ WEB WORKER — PDF PLAN PARSER (NON-BLOQUANT) ═══

import { readPDFPlan, convertPDFToZones } from '../modules/building/shared/planReader/pdfPlanReader'
import type { PDFPlanPage } from '../modules/building/shared/planReader/planReaderTypes'
import type { Zone } from '../modules/building/shared/proph3t/types'

export interface PDFParserRequest {
  type: 'parse' | 'convert'
  file?: File
  pages?: PDFPlanPage[]
}

export interface PDFParserResponse {
  type: 'parse' | 'convert'
  pages?: PDFPlanPage[]
  zones?: Partial<Zone>[]
  walls?: { x1: number; y1: number; x2: number; y2: number }[]
  dims?: { text: string; x: number; y: number }[]
  error?: string
}

self.onmessage = async (event: MessageEvent<PDFParserRequest>) => {
  const { type } = event.data

  try {
    switch (type) {
      case 'parse': {
        if (!event.data.file) {
          self.postMessage({ type: 'parse', error: 'Fichier manquant' } satisfies PDFParserResponse)
          return
        }
        const pages = await readPDFPlan(event.data.file)
        self.postMessage({ type: 'parse', pages } satisfies PDFParserResponse)
        break
      }
      case 'convert': {
        if (!event.data.pages) {
          self.postMessage({ type: 'convert', error: 'Pages manquantes' } satisfies PDFParserResponse)
          return
        }
        const result = convertPDFToZones(event.data.pages)
        self.postMessage({
          type: 'convert',
          zones: result.zones,
          walls: result.walls,
          dims: result.dims,
        } satisfies PDFParserResponse)
        break
      }
    }
  } catch (err) {
    self.postMessage({
      type,
      error: err instanceof Error ? err.message : 'Erreur inconnue',
    } satisfies PDFParserResponse)
  }
}
