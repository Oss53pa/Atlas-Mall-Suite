// ═══ PLAN IMPORT ORCHESTRATOR — Routes to the right extractor ═══

import type { NormalizedFloorPlan, ExtractorFormat, FloorPlanExtractor } from './types'
import { detectExtractorFormat } from './types'
import { DXFFloorPlanExtractor } from './dxfExtractor'
import { PDFFloorPlanExtractor } from './pdfExtractor'
import { SVGFloorPlanExtractor } from './svgExtractor'
import { ImageFloorPlanExtractor } from './imageExtractor'

export class PlanImportOrchestrator {

  private extractors: Partial<Record<ExtractorFormat, FloorPlanExtractor>> = {
    dxf: new DXFFloorPlanExtractor(),
    dwg: new DXFFloorPlanExtractor(),
    svg: new SVGFloorPlanExtractor(),
    pdf_vector: new PDFFloorPlanExtractor(),
    pdf_raster: new ImageFloorPlanExtractor(),
    image: new ImageFloorPlanExtractor(),
  }

  async import(
    file: File,
    onProgress?: (msg: string, pct: number) => void
  ): Promise<NormalizedFloorPlan> {
    const format = detectExtractorFormat(file)
    onProgress?.(`Format detecte : ${format}`, 10)

    // PDF: try vectorial first, fall back to raster
    if (format === 'pdf_vector') {
      onProgress?.('Tentative extraction vectorielle PDF...', 20)
      try {
        const pdfExtractor = this.extractors.pdf_vector!
        const result = await pdfExtractor.extract(file)

        if (result.rooms.length >= 3) {
          onProgress?.(`${result.rooms.length} zones extraites (PDF vectoriel)`, 90)
          return this.finalize(result, format)
        }
        // Not enough rooms from vector — fall back to image analysis
        onProgress?.('Peu de zones vectorielles — basculement vers analyse image...', 40)
      } catch {
        onProgress?.('Extraction vectorielle echouee — basculement vers analyse image...', 40)
      }

      // Fallback: treat as image
      const imageExtractor = this.extractors.image!
      onProgress?.('Analyse du plan par IA locale...', 50)
      const result = await imageExtractor.extract(file)
      onProgress?.(`${result.rooms.length} zones detectees`, 90)
      return this.finalize(result, 'pdf_raster')
    }

    // All other formats: direct extraction
    const extractor = this.extractors[format]
    if (!extractor) {
      throw new Error(`Format non supporte : ${format}`)
    }

    onProgress?.(`Extraction ${format.toUpperCase()}...`, 30)
    const result = await extractor.extract(file)
    onProgress?.(`${result.rooms.length} zones extraites`, 90)
    return this.finalize(result, format)
  }

  private finalize(result: NormalizedFloorPlan, format: ExtractorFormat): NormalizedFloorPlan {
    // Set validation flags
    if (format === 'image' || format === 'pdf_raster') {
      result.needs_manual_review = true
      result.validation_required = true
      result.validation_message = result.validation_message ??
        `Plan image (${Math.round(result.confidence * 100)}% confiance). Validation manuelle requise.`
    }

    if (result.rooms.some(r => r.semantic_confidence < 0.5)) {
      const unlabeled = result.rooms.filter(r => r.semantic_confidence < 0.5).length
      result.validation_message = result.validation_message ??
        `${unlabeled} espace(s) a verifier/labelliser.`
    }

    return result
  }
}

// ── Singleton instance ───────────────────────────────────────

export const planOrchestrator = new PlanImportOrchestrator()
