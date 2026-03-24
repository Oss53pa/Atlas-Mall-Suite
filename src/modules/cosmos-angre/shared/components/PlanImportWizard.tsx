import React, { useCallback, useRef, useState } from 'react'
import type { PlanImportState, CalibrationResult, RecognizedZone, DimEntity } from '../planReader/planReaderTypes'
import type { Zone, Floor, FloorLevel } from '../proph3t/types'
import { importPlan, detectPlanSourceType } from '../planReader'
import PlanReaderProgress from './PlanReaderProgress'
import RasterPreview from './RasterPreview'

interface PlanImportWizardProps {
  floors: Floor[]
  activeFloorId: string
  onImportComplete: (zones: Partial<Zone>[], dims: DimEntity[], calibration: CalibrationResult, floorId: string) => void
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
      selectedFloorId
    )
  }, [state, selectedFloorId, onImportComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[900px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Importer un plan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress */}
          <PlanReaderProgress state={state} />

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

          {/* STEP 3: Reviewing */}
          {state.step === 'reviewing' && (
            <div className="space-y-4">
              {/* Raster preview */}
              {state.rasterResult && (imageUrl || state.sourceType === 'pdf') && (
                <RasterPreview
                  imageUrl={imageUrl}
                  result={state.rasterResult}
                  width={860}
                  height={400}
                />
              )}

              {/* Zones table */}
              {state.detectedZones.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    Zones detectees ({state.detectedZones.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto border border-gray-800 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-400">Label</th>
                          <th className="text-left px-3 py-2 text-gray-400">Type</th>
                          <th className="text-right px-3 py-2 text-gray-400">Confiance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.detectedZones.map(zone => (
                          <tr key={zone.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-3 py-1.5 text-white">{zone.label}</td>
                            <td className="px-3 py-1.5 text-gray-300">{zone.estimatedType}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span className={`${
                                zone.confidence >= 0.8 ? 'text-emerald-400' :
                                zone.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {Math.round(zone.confidence * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dims table */}
              {state.detectedDims.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">
                    Cotes detectees ({state.detectedDims.length})
                  </h3>
                  <div className="max-h-32 overflow-y-auto border border-gray-800 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-400">Valeur</th>
                          <th className="text-left px-3 py-2 text-gray-400">Type</th>
                          <th className="text-left px-3 py-2 text-gray-400">Unite</th>
                          <th className="text-right px-3 py-2 text-gray-400">Confiance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.detectedDims.map(dim => (
                          <tr key={dim.id} className="border-t border-gray-800/50">
                            <td className="px-3 py-1.5 text-white">{dim.valueText}</td>
                            <td className="px-3 py-1.5 text-gray-300">{dim.type}</td>
                            <td className="px-3 py-1.5 text-gray-300">{dim.unit}</td>
                            <td className="px-3 py-1.5 text-right">
                              <span className={`${
                                dim.confidence >= 0.8 ? 'text-emerald-400' :
                                dim.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                              }`}>
                                {Math.round(dim.confidence * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Calibration summary */}
              {state.calibration && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Calibration</h3>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Methode : </span>
                      <span className="text-white">{state.calibration.method}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Dimensions : </span>
                      <span className="text-white">
                        {state.calibration.realWidthM.toFixed(1)}m x {state.calibration.realHeightM.toFixed(1)}m
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Confiance : </span>
                      <span className={`font-medium ${
                        state.calibration.confidence >= 0.8 ? 'text-emerald-400' :
                        state.calibration.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {Math.round(state.calibration.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {state.warnings.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 space-y-1">
                  {state.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-300 flex items-start gap-2">
                      <span className="text-amber-500 flex-shrink-0">⚠</span>
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Manual calibration if low confidence */}
              {(!state.calibration || state.calibration.confidence < 0.7) && (
                <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-amber-300">
                    Calibration automatique insuffisante. Saisir les dimensions reelles :
                  </p>
                  <div className="flex gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Largeur (m)</label>
                      <input
                        type="number"
                        value={manualWidthM}
                        onChange={e => setManualWidthM(e.target.value)}
                        placeholder="ex: 200"
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white w-32"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Hauteur (m)</label>
                      <input
                        type="number"
                        value={manualHeightM}
                        onChange={e => setManualHeightM(e.target.value)}
                        placeholder="ex: 140"
                        className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white w-32"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleManualCalibration}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-1.5 rounded transition-colors"
                      >
                        Calibrer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Floor selector */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400">Importer sur :</label>
                <select
                  value={selectedFloorId}
                  onChange={e => setSelectedFloorId(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
                >
                  {floors.map(f => (
                    <option key={f.id} value={f.id}>{f.level}</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white text-sm px-4 py-2 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-6 py-2 rounded font-medium transition-colors"
                >
                  Importer ({state.detectedZones.length} zones)
                </button>
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
