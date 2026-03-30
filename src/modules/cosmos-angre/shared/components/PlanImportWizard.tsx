import React, { useCallback, useRef, useState } from 'react'
import type { PlanImportState, CalibrationResult, RecognizedZone, DimEntity } from '../planReader/planReaderTypes'
import type { Zone, Floor, FloorLevel } from '../proph3t/types'
import { importPlan, detectPlanSourceType } from '../planReader'
import PlanReaderProgress from './PlanReaderProgress'
import RasterPreview from './RasterPreview'

interface PlanImportWizardProps {
  floors: Floor[]
  activeFloorId: string
  onImportComplete: (zones: Partial<Zone>[], dims: DimEntity[], calibration: CalibrationResult, floorId: string, planImageUrl?: string, fileInfo?: { fileName: string; fileSize: number; sourceType: string }) => void
  onClose: () => void
}

const ACCEPTED_FORMATS = '.dxf,.dwg,.ifc,.pdf,.jpg,.jpeg,.png,.webp'

const MAX_SIZES: Record<PlanSourceType, number> = {
  dxf: 50 * 1024 * 1024,
  dwg: 50 * 1024 * 1024,
  ifc: 50 * 1024 * 1024,
  pdf: 30 * 1024 * 1024,
  image_raster: 8 * 1024 * 1024,
  svg: 10 * 1024 * 1024,
}

const VALID_EXTENSIONS: Record<PlanSourceType, string[]> = {
  dxf: ['dxf'], dwg: ['dwg'], ifc: ['ifc'],
  pdf: ['pdf'], image_raster: ['jpg', 'jpeg', 'png', 'webp'], svg: ['svg'],
}

function validateFile(file: File, sourceType: PlanSourceType): string | null {
  const maxSize = MAX_SIZES[sourceType]
  if (file.size > maxSize) {
    return `Fichier trop volumineux : ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum : ${maxSize / 1024 / 1024}MB pour ${sourceType.toUpperCase()}.`
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!VALID_EXTENSIONS[sourceType]?.includes(ext)) {
    return `Extension .${ext} non valide pour ce type. Attendu : ${VALID_EXTENSIONS[sourceType]?.join(', ')}`
  }
  return null
}

type PlanSourceType = import('../planReader/planReaderTypes').PlanSourceType

export default function PlanImportWizard({
  floors, activeFloorId, onImportComplete, onClose,
}: PlanImportWizardProps) {
  const [state, setState] = useState<PlanImportState>({
    step: 'upload',
    sourceType: null,
    fileName: '',
    fileSize: 0,
    progress: 0,
    currentOperation: '',
    detectedZones: [],
    detectedDims: [],
    calibration: null,
    errors: [],
    warnings: [],
  })

  const [selectedFloorId, setSelectedFloorId] = useState(activeFloorId)
  const [manualWidthM, setManualWidthM] = useState('')
  const [manualHeightM, setManualHeightM] = useState('')
  const [imageUrl, setImageUrl] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── STEP 1: UPLOAD ───

  const handleFileSelect = useCallback(async (file: File) => {
    const sourceType = detectPlanSourceType(file)

    const validationError = validateFile(file, sourceType)
    if (validationError) {
      setState(s => ({
        ...s,
        step: 'error',
        errors: [validationError],
      }))
      return
    }

    if (sourceType === 'image_raster') {
      setImageUrl(URL.createObjectURL(file))
    }

    const result = await importPlan(file, selectedFloorId, {
      onProgress: (s) => setState(s),
    })

    setState(result)
  }, [selectedFloorId])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // ─── STEP 4: MANUAL CALIBRATION ───

  const handleManualCalibration = useCallback(() => {
    const w = parseFloat(manualWidthM)
    const h = parseFloat(manualHeightM)
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return

    setState(s => ({
      ...s,
      calibration: {
        scaleFactorX: 1,
        scaleFactorY: 1,
        realWidthM: w,
        realHeightM: h,
        confidence: 1,
        method: 'user_input',
        samplesUsed: 0,
        outlierCount: 0,
        issues: [],
      },
      step: 'calibrating',
    }))
  }, [manualWidthM, manualHeightM])

  // ─── STEP 5: CONFIRM ───

  const handleConfirm = useCallback(() => {
    const zones: Partial<Zone>[] = state.detectedZones.map((rz, idx) => ({
      id: rz.id ?? `import-zone-${idx}`,
      floorId: selectedFloorId,
      label: rz.label,
      type: rz.estimatedType,
      x: rz.boundingBox.x,
      y: rz.boundingBox.y,
      w: rz.boundingBox.w,
      h: rz.boundingBox.h,
      niveau: 2 as const,
      color: rz.color ?? '#1a2a3a',
    }))

    onImportComplete(
      zones,
      state.detectedDims,
      state.calibration ?? {
        scaleFactorX: 1, scaleFactorY: 1,
        realWidthM: 200, realHeightM: 140,
        confidence: 0.5, method: 'dim_manual',
        samplesUsed: 0, outlierCount: 0, issues: [],
      },
      selectedFloorId,
      state.planImageUrl,
      { fileName: state.fileName || 'Import', fileSize: state.fileSize || 0, sourceType: state.sourceType ?? 'image_raster' },
    )
  }, [state, selectedFloorId, onImportComplete])

  const isReviewing = state.step === 'reviewing'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col ${
        isReviewing ? 'w-[95vw] h-[92vh]' : 'w-[900px] max-h-[90vh] overflow-y-auto'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Importer un plan</h2>
            {state.fileName && <p className="text-[11px] text-gray-500">{state.fileName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className={`space-y-6 ${isReviewing ? 'flex-1 flex flex-col overflow-hidden p-0' : 'p-6'}`}>
          {/* Progress */}
          {!isReviewing && <PlanReaderProgress state={state} />}

          {/* STEP 1: Upload */}
          {state.step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="text-4xl mb-4">
                📁
              </div>
              <p className="text-gray-300 font-medium mb-2">
                Glisser-deposer ou cliquer pour importer
              </p>
              <p className="text-xs text-gray-500">
                DXF, DWG, IFC, PDF (vectoriel), JPG, PNG, WebP
              </p>
              <p className="text-xs text-gray-600 mt-1">
                CAD: max 50MB | Images: max 10MB
              </p>
            </div>
          )}

          {/* STEP 2: Detecting (shown via PlanReaderProgress) */}

          {/* STEP 3: Reviewing — layout sidebar gauche + viewer droit plein ecran */}
          {state.step === 'reviewing' && (
            <div className="flex flex-1 overflow-hidden">

              {/* ── Sidebar gauche : donnees ── */}
              <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-900/80 flex flex-col">
                <div className="p-4 space-y-4 flex-1">
                  <PlanReaderProgress state={state} />

                  {/* Floor selector */}
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-gray-500 block mb-1">Importer sur</label>
                    <select
                      value={selectedFloorId}
                      onChange={e => setSelectedFloorId(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {floors.map(f => (
                        <option key={f.id} value={f.id}>{f.level}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zones detectees */}
                  {state.detectedZones.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                        Zones detectees ({state.detectedZones.length})
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {state.detectedZones.map(zone => (
                          <div key={zone.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 bg-gray-800/50 text-[11px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: zone.color ?? '#38bdf8' }} />
                              <span className="text-white truncate">{zone.label}</span>
                            </div>
                            <span className={`flex-shrink-0 ml-2 ${
                              zone.confidence >= 0.8 ? 'text-emerald-400' : zone.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                            }`}>{Math.round(zone.confidence * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cotes detectees */}
                  {state.detectedDims.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                        Cotes ({state.detectedDims.length})
                      </p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {state.detectedDims.map(dim => (
                          <div key={dim.id} className="flex items-center justify-between text-[11px] px-2 py-1 bg-gray-800/50 rounded">
                            <span className="text-white">{dim.valueText} {dim.unit}</span>
                            <span className="text-gray-500">{dim.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Calibration */}
                  {state.calibration && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Calibration</p>
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Methode</span>
                          <span className="text-white">{state.calibration.method}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Dimensions</span>
                          <span className="text-white">{state.calibration.realWidthM.toFixed(1)}m × {state.calibration.realHeightM.toFixed(1)}m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Confiance</span>
                          <span className={`font-bold ${
                            state.calibration.confidence >= 0.8 ? 'text-emerald-400' :
                            state.calibration.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                          }`}>{Math.round(state.calibration.confidence * 100)}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${state.calibration.confidence * 100}%`,
                            background: state.calibration.confidence >= 0.8 ? '#22c55e' : state.calibration.confidence >= 0.5 ? '#f59e0b' : '#ef4444',
                          }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual calibration */}
                  {(!state.calibration || state.calibration.confidence < 0.7) && (
                    <div className="rounded-lg p-3 bg-amber-900/20 border border-amber-700/50 space-y-2">
                      <p className="text-[10px] text-amber-300">Calibration insuffisante — saisir les dimensions :</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-0.5">Largeur (m)</label>
                          <input type="number" value={manualWidthM} onChange={e => setManualWidthM(e.target.value)} placeholder="200" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-0.5">Hauteur (m)</label>
                          <input type="number" value={manualHeightM} onChange={e => setManualHeightM(e.target.value)} placeholder="140" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white" />
                        </div>
                      </div>
                      <button onClick={handleManualCalibration} className="w-full bg-amber-600 hover:bg-amber-500 text-white text-[11px] px-3 py-1.5 rounded transition-colors">
                        Calibrer manuellement
                      </button>
                    </div>
                  )}

                  {/* Warnings */}
                  {state.warnings.length > 0 && (
                    <div className="space-y-1">
                      {state.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-amber-400">
                          <span className="flex-shrink-0">⚠</span>
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions en bas de la sidebar */}
                <div className="p-4 border-t border-gray-800 flex gap-2">
                  <button onClick={onClose} className="flex-1 text-gray-400 hover:text-white text-[12px] py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleConfirm} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] py-2 rounded-lg font-medium transition-colors">
                    Importer ({state.detectedZones.length} zones)
                  </button>
                </div>
              </div>

              {/* ── Viewer droit : visualisation grand ecran ── */}
              <div className="flex-1 flex items-center justify-center overflow-hidden relative" style={{ background: '#060a10' }}>
                {state.rasterResult && (state.planImageUrl || imageUrl) ? (
                  <RasterPreview
                    imageUrl={state.planImageUrl || imageUrl}
                    result={state.rasterResult}
                    width={typeof window !== 'undefined' ? window.innerWidth - 320 - 80 : 1000}
                    height={typeof window !== 'undefined' ? window.innerHeight - 120 : 700}
                    onZonesChanged={(updatedZones) => setState(s => ({ ...s, detectedZones: updatedZones }))}
                  />
                ) : state.planImageUrl ? (
                  <img src={state.planImageUrl} alt="Plan" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-gray-600">
                    <p className="text-sm">Aucune preview disponible</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP error: retry */}
          {state.step === 'error' && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setState(s => ({ ...s, step: 'upload', errors: [], warnings: [] }))}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-6 py-2 rounded transition-colors"
              >
                Reessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
