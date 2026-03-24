// ═══ POINT D'ENTRÉE UNIFIÉ — LECTURE DE PLANS ═══

import type {
  PlanSourceType, PlanImportState, CalibrationResult, DimEntity,
  PDFPlanPage, RasterRecognitionResult, RecognizedZone,
} from './planReaderTypes'
import type { Zone } from '../proph3t/types'
import { extractDimEntities, calibratePlanFromDims, linkDimsToZones } from './dimParser'
import { readPDFPlan, convertPDFToZones } from './pdfPlanReader'
import { recognizeRasterPlan, convertVisionToAtlasZones } from './rasterRecognizer'
import { normalizeGeometry, validateZones } from './geometryNormalizer'
import { generateCotationSpecs, renderCotationsOnPDF } from './cotationEngine'

// ─── DÉTECTION TYPE DE FICHIER ───

export function detectPlanSourceType(file: File): PlanSourceType {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = file.type.toLowerCase()

  if (ext === 'dxf') return 'dxf'
  if (ext === 'dwg') return 'dwg'
  if (ext === 'ifc') return 'ifc'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (ext === 'svg') return 'svg'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) return 'image_raster'
  if (mime.startsWith('image/')) return 'image_raster'

  return 'dxf' // fallback
}

// ─── ORCHESTRATEUR PRINCIPAL ───

export async function importPlan(
  file: File,
  floorId: string,
  options: {
    supabaseUrl?: string
    supabaseAnonKey?: string
    onProgress?: (state: PlanImportState) => void
  } = {}
): Promise<PlanImportState> {
  const sourceType = detectPlanSourceType(file)
  const { onProgress } = options

  const state: PlanImportState = {
    step: 'detecting',
    sourceType,
    fileName: file.name,
    fileSize: file.size,
    progress: 0,
    currentOperation: 'Detection du type de fichier...',
    detectedZones: [],
    detectedDims: [],
    calibration: null,
    errors: [],
    warnings: [],
  }

  const emit = () => onProgress?.({ ...state })
  emit()

  try {
    switch (sourceType) {
      case 'dxf':
      case 'dwg': {
        state.currentOperation = 'Analyse du fichier DXF/DWG...'
        state.progress = 10
        emit()

        const text = await file.text()
        const { default: DxfParser } = await import('dxf-parser')
        const parser = new DxfParser()
        const dxf = parser.parseSync(text)

        if (!dxf) {
          state.step = 'error'
          state.errors.push('Impossible de parser le fichier DXF')
          emit()
          return state
        }

        state.currentOperation = 'Extraction des cotes...'
        state.progress = 30
        emit()

        const dims = extractDimEntities(dxf.entities ?? [])
        state.detectedDims = dims

        state.currentOperation = 'Calibration automatique...'
        state.progress = 50
        emit()

        // Compute plan bounds from entities
        const allVerts = (dxf.entities ?? []).flatMap((e: { vertices?: { x: number; y: number }[] }) =>
          e.vertices ?? []
        )
        const bounds = allVerts.length > 0 ? {
          minX: Math.min(...allVerts.map(v => v.x)),
          minY: Math.min(...allVerts.map(v => v.y)),
          maxX: Math.max(...allVerts.map(v => v.x)),
          maxY: Math.max(...allVerts.map(v => v.y)),
        } : { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }

        state.calibration = calibratePlanFromDims(dims, bounds)

        state.currentOperation = 'Detection des zones...'
        state.progress = 70
        emit()

        // Extract zones from polylines (existing logic)
        const newZones: Partial<Zone>[] = []
        let idx = 0
        for (const entity of (dxf.entities ?? [])) {
          if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
            const verts = (entity as { vertices?: { x: number; y: number }[] }).vertices ?? []
            if (verts.length < 3) continue
            const xs = verts.map(v => v.x)
            const ys = verts.map(v => v.y)
            const minX = Math.min(...xs), maxX = Math.max(...xs)
            const minY = Math.min(...ys), maxY = Math.max(...ys)
            const normX = (minX - bounds.minX) / (bounds.maxX - bounds.minX || 1)
            const normY = (minY - bounds.minY) / (bounds.maxY - bounds.minY || 1)
            const normW = (maxX - minX) / (bounds.maxX - bounds.minX || 1)
            const normH = (maxY - minY) / (bounds.maxY - bounds.minY || 1)
            newZones.push({
              id: `dxf-zone-${floorId}-${idx++}`,
              floorId,
              label: `Zone DXF ${idx}`,
              type: 'circulation',
              x: normX, y: normY, w: normW, h: normH,
              niveau: 2,
              color: '#E0E0E0',
            })
          }
        }

        state.detectedZones = newZones.map(z => ({
          id: z.id ?? '',
          label: z.label ?? '',
          estimatedType: z.type ?? 'circulation',
          boundingBox: { x: z.x ?? 0, y: z.y ?? 0, w: z.w ?? 0, h: z.h ?? 0 },
          confidence: 0.85,
        }))

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse terminee'
        emit()
        break
      }

      case 'pdf': {
        state.currentOperation = 'Lecture du PDF...'
        state.progress = 10
        emit()

        // Tenter d'abord l'extraction vectorielle
        let pages: PDFPlanPage[] = []
        let isRasterPDF = false

        try {
          pages = await readPDFPlan(file)
          state.pdfPages = pages

          // Detecter si le PDF est un scan (peu de paths vectoriels, peu de textes)
          const totalPaths = pages.reduce((s, p) => s + p.paths.length, 0)
          const totalTexts = pages.reduce((s, p) => s + p.texts.length, 0)
          const zoneBoundaries = pages.reduce((s, p) => s + p.paths.filter(pa => pa.estimatedType === 'zone_boundary').length, 0)

          if (zoneBoundaries < 2 && totalPaths < 20 && totalTexts < 5) {
            isRasterPDF = true
            state.warnings.push(`PDF detecte comme scan/image (${totalPaths} paths, ${totalTexts} textes). Basculement vers Proph3t Vision.`)
          }
        } catch {
          // pdfjs-dist peut echouer sur certains PDFs -> fallback image
          isRasterPDF = true
          state.warnings.push('Lecture vectorielle impossible. Basculement vers reconnaissance image.')
        }

        if (isRasterPDF) {
          // Fallback : convertir la 1re page PDF en image et envoyer vers Vision
          state.currentOperation = 'Conversion PDF en image...'
          state.progress = 30
          emit()

          try {
            const imageBlob = await pdfPageToImage(file)
            const imageFile = new File([imageBlob], file.name.replace(/\.pdf$/i, '.png'), { type: 'image/png' })

            if (options.supabaseUrl && options.supabaseAnonKey) {
              state.currentOperation = 'Envoi vers Proph3t Vision...'
              state.progress = 50
              emit()

              const rasterResult = await recognizeRasterPlan(imageFile, options.supabaseUrl, options.supabaseAnonKey)
              state.rasterResult = rasterResult
              state.detectedZones = rasterResult.zones
              state.warnings.push(...rasterResult.proph3tNotes)

              if (rasterResult.scale) {
                state.calibration = {
                  scaleFactorX: 1 / rasterResult.scale.value,
                  scaleFactorY: 1 / rasterResult.scale.value,
                  realWidthM: 0, realHeightM: 0,
                  confidence: rasterResult.scale.confidence,
                  method: 'dim_manual', samplesUsed: 1, outlierCount: 0,
                  issues: [`Echelle detectee par Vision: ${rasterResult.scale.ratio}`],
                }
              }
            } else {
              state.warnings.push('Configuration Supabase manquante pour Proph3t Vision — saisie manuelle des zones requise.')
            }
          } catch (pdfImgErr) {
            state.warnings.push(`Conversion PDF→image echouee: ${pdfImgErr instanceof Error ? pdfImgErr.message : 'erreur inconnue'}. Utilisez un export image (JPG/PNG) du plan.`)
          }

          state.step = 'reviewing'
          state.progress = 100
          state.currentOperation = 'Analyse terminee'
          emit()
          break
        }

        // PDF vectoriel : extraction classique
        state.currentOperation = 'Extraction des zones vectorielles...'
        state.progress = 50
        emit()

        const result = convertPDFToZones(pages)

        state.detectedZones = result.zones.map((z, i) => ({
          id: z.id ?? `pdf-zone-${i}`,
          label: z.label ?? 'Zone sans nom',
          estimatedType: z.type ?? 'circulation',
          boundingBox: { x: z.x ?? 0, y: z.y ?? 0, w: z.w ?? 0, h: z.h ?? 0 },
          confidence: 0.8,
        }))

        // Extract scale from PDF texts
        const scaleTexts = pages.flatMap(p => p.texts.filter(t => t.estimatedRole === 'scale'))
        if (scaleTexts.length > 0) {
          const scaleMatch = scaleTexts[0].content.match(/1\s*[:\/]\s*(\d+)/)
          if (scaleMatch) {
            const scaleValue = parseInt(scaleMatch[1], 10)
            state.calibration = {
              scaleFactorX: 1 / scaleValue,
              scaleFactorY: 1 / scaleValue,
              realWidthM: (pages[0]?.width ?? 1000) / scaleValue,
              realHeightM: (pages[0]?.height ?? 1000) / scaleValue,
              confidence: 0.75,
              method: 'dim_manual', samplesUsed: 1, outlierCount: 0,
              issues: [`Echelle detectee depuis le texte PDF: 1:${scaleValue}`],
            }
          }
        }

        // Si meme en mode vectoriel on trouve 0 zones, basculer vers reviewing avec warning
        if (state.detectedZones.length === 0) {
          state.warnings.push('Aucune zone detectee dans le PDF vectoriel. Verifiez que le fichier contient des tracés (pas uniquement des images). Vous pouvez reessayer en important une capture JPG/PNG du plan.')
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse terminee'
        emit()
        break
      }

      case 'image_raster': {
        state.currentOperation = 'Envoi vers Proph3t Vision...'
        state.progress = 10
        emit()

        if (!options.supabaseUrl || !options.supabaseAnonKey) {
          state.step = 'error'
          state.errors.push('Configuration Supabase manquante pour la reconnaissance Vision')
          emit()
          return state
        }

        state.progress = 30
        emit()

        const rasterResult = await recognizeRasterPlan(
          file,
          options.supabaseUrl,
          options.supabaseAnonKey
        )

        state.rasterResult = rasterResult
        state.detectedZones = rasterResult.zones
        state.warnings.push(...rasterResult.proph3tNotes)

        if (rasterResult.scale) {
          state.calibration = {
            scaleFactorX: 1 / rasterResult.scale.value,
            scaleFactorY: 1 / rasterResult.scale.value,
            realWidthM: 0,
            realHeightM: 0,
            confidence: rasterResult.scale.confidence,
            method: 'dim_manual',
            samplesUsed: 1,
            outlierCount: 0,
            issues: [`Echelle detectee par Vision: ${rasterResult.scale.ratio}`],
          }
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Reconnaissance terminee'
        emit()
        break
      }

      case 'ifc': {
        state.currentOperation = 'Lecture du fichier IFC...'
        state.progress = 10
        emit()

        // IFC uses the existing web-ifc pipeline
        state.calibration = {
          scaleFactorX: 1,
          scaleFactorY: 1,
          realWidthM: 0,
          realHeightM: 0,
          confidence: 0.95,
          method: 'ifc_native',
          samplesUsed: 0,
          outlierCount: 0,
          issues: ['IFC contient les dimensions reelles nativement'],
        }

        state.step = 'reviewing'
        state.progress = 100
        state.currentOperation = 'Analyse IFC terminee'
        emit()
        break
      }

      default: {
        state.step = 'error'
        state.errors.push(`Type de fichier non supporte: ${sourceType}`)
        emit()
      }
    }
  } catch (err) {
    state.step = 'error'
    state.errors.push(err instanceof Error ? err.message : 'Erreur inconnue')
    emit()
  }

  return state
}

// ─── PDF → IMAGE (pour fallback raster sur PDF scannés) ───

async function pdfPageToImage(file: File, pageNum = 1, scale = 2): Promise<Blob> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context non disponible')

  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Conversion PDF→image echouee'))
    }, 'image/png')
  })
}

// ─── RE-EXPORTS ───

export { extractDimEntities, calibratePlanFromDims, linkDimsToZones } from './dimParser'
export { readPDFPlan, convertPDFToZones, detectFloorLevelFromTexts } from './pdfPlanReader'
export { recognizeRasterPlan, convertVisionToAtlasZones } from './rasterRecognizer'
export { normalizeGeometry, mergeZonesFromMultipleSources, validateZones } from './geometryNormalizer'
export { generateCotationSpecs, renderCotationsOnPDF } from './cotationEngine'
export type * from './planReaderTypes'
