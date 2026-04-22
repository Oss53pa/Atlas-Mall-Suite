// ═══ 3D MODEL IMPORT MODAL — Upload IFC / glTF / OBJ models ═══

import { useState, useCallback, useRef } from 'react'
import { X, FileText, Loader2, CheckCircle, AlertTriangle, Box, Info } from 'lucide-react'
import { detectModelFormat, MODEL_FORMAT_LABELS, MODEL_FORMAT_COLORS, ALL_3D_ACCEPT, type ModelFormat } from '../../../../loaders'
import { useVol2Store } from '../store/vol2Store'

interface Model3DImportModalProps {
  open: boolean
  onClose: () => void
}

interface ImportState {
  file: File | null
  mtlFile: File | null
  format: ModelFormat | null
  fileName: string | null
  progress: number
  isLoading: boolean
  error: string | null
  result: ImportResult | null
  imported: boolean
}

interface ImportResult {
  meshCount: number
  materialCount?: number
  boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
  ifcSpaces?: number
  ifcDoors?: number
  format: ModelFormat
}

const INITIAL_STATE: ImportState = {
  file: null,
  mtlFile: null,
  format: null,
  fileName: null,
  progress: 0,
  isLoading: false,
  error: null,
  result: null,
  imported: false,
}

export default function Model3DImportModal({ open, onClose }: Model3DImportModalProps) {
  const s = useVol2Store()
  const [state, setState] = useState<ImportState>(INITIAL_STATE)
  const [selectedFloorId, setSelectedFloorId] = useState(s.activeFloorId)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mtlInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const format = detectModelFormat(file.name)
    if (!format) return

    setState({
      ...INITIAL_STATE,
      file,
      format,
      fileName: file.name,
    })
  }, [])

  const handleMtlFile = useCallback((file: File) => {
    setState(prev => ({ ...prev, mtlFile: file }))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleLoad = useCallback(async () => {
    if (!state.file || !state.format) return

    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }))

    try {
      const onProgress = (percent: number) => {
        setState(prev => ({ ...prev, progress: percent }))
      }

      let result: ImportResult

      if (state.format === 'ifc') {
        const { loadIFC } = await import('../../../../loaders/ifc-loader')
        const loadResult = await loadIFC(state.file, onProgress)
        result = {
          meshCount: loadResult.meshCount,
          boundingBox: {
            min: loadResult.boundingBox.min,
            max: loadResult.boundingBox.max,
          },
          ifcSpaces: loadResult.ifcSpaces.length,
          ifcDoors: loadResult.ifcDoors.length,
          format: 'ifc',
        }
        // Store the Three.js group for later use
        s.setImported3DModel(loadResult.scene, 'ifc', selectedFloorId)
      } else if (state.format === 'gltf' || state.format === 'glb') {
        const { loadGLTF } = await import('../../../../loaders/gltf-loader')
        const loadResult = await loadGLTF(state.file, onProgress)
        result = {
          meshCount: loadResult.meshCount,
          materialCount: loadResult.materialCount,
          boundingBox: {
            min: loadResult.boundingBox.min,
            max: loadResult.boundingBox.max,
          },
          format: state.format,
        }
        s.setImported3DModel(loadResult.scene, 'gltf', selectedFloorId)
      } else if (state.format === 'obj') {
        const { loadOBJ } = await import('../../../../loaders/obj-loader')
        const loadResult = await loadOBJ(state.file, state.mtlFile ?? undefined, onProgress)
        result = {
          meshCount: loadResult.meshCount,
          materialCount: loadResult.materialCount,
          boundingBox: {
            min: loadResult.boundingBox.min,
            max: loadResult.boundingBox.max,
          },
          format: 'obj',
        }
        s.setImported3DModel(loadResult.scene, 'obj', selectedFloorId)
      } else {
        throw new Error(`Format non supporte: ${state.format}`)
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        result,
      }))
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur inconnue lors du chargement',
      }))
    }
  }, [state.file, state.format, state.mtlFile, selectedFloorId, s])

  const handleConfirm = useCallback(() => {
    setState(prev => ({ ...prev, imported: true }))
  }, [])

  const handleReset = () => {
    setState(INITIAL_STATE)
  }

  if (!open) return null

  const formatColor = state.format ? MODEL_FORMAT_COLORS[state.format] : ''
  const formatLabel = state.format ? MODEL_FORMAT_LABELS[state.format] : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-0/60 backdrop-blur-sm">
      <div className="bg-surface-1 border border-gray-700 rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
              <Box className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Import Maquette 3D</h2>
              <p className="text-[10px] text-gray-500">Charger un modele IFC, glTF/GLB ou OBJ</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Floor selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Etage cible</label>
            <div className="flex gap-2">
              {s.floors.map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFloorId(f.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedFloorId === f.id
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  {f.level}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!state.fileName && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'
                }
              `}
            >
              <Box className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-emerald-400' : 'text-gray-600'}`} />
              <p className="text-sm text-gray-300 mb-1">
                Glissez votre maquette 3D ici
              </p>
              <p className="text-xs text-gray-600 mb-3">
                ou cliquez pour parcourir
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[10px] px-2 py-0.5 rounded border bg-orange-600/10 text-orange-400 border-orange-500/30">IFC</span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-600/10 text-emerald-400 border-emerald-500/30">glTF</span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-600/10 text-emerald-400 border-emerald-500/30">GLB</span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-cyan-600/10 text-cyan-400 border-cyan-500/30">OBJ</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ALL_3D_ACCEPT}
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          )}

          {/* File loaded */}
          {state.fileName && !state.result && !state.isLoading && (
            <>
              <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium">{state.fileName}</p>
                    {state.format && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${formatColor}`}>
                        {formatLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">Modele pret a etre charge</p>
                </div>
                <button onClick={handleReset} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* OBJ: optional MTL file */}
              {state.format === 'obj' && (
                <div className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-300">
                      {state.mtlFile
                        ? `Materiau: ${state.mtlFile.name}`
                        : 'Fichier .mtl optionnel pour les materiaux'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => mtlInputRef.current?.click()}
                    className="text-[10px] px-2 py-1 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 rounded hover:bg-cyan-600/30 transition-colors"
                  >
                    {state.mtlFile ? 'Changer' : 'Ajouter .mtl'}
                  </button>
                  <input
                    ref={mtlInputRef}
                    type="file"
                    accept=".mtl"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleMtlFile(file)
                    }}
                  />
                </div>
              )}

              {/* IFC info */}
              {state.format === 'ifc' && (
                <div className="bg-orange-900/20 border border-orange-700/40 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-orange-300">
                    Les fichiers IFC contiennent des metadonnees BIM (espaces, portes, murs).
                    Elles seront extraites automatiquement pour enrichir le plan securitaire.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Loading progress */}
          {state.isLoading && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-emerald-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement du modele {formatLabel}...
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                {state.progress}% — Parsing geometrie et materiaux
              </p>
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-300">Erreur de chargement</p>
                <p className="text-xs text-red-400/70 mt-1">{state.error}</p>
              </div>
            </div>
          )}

          {/* Load result */}
          {state.result && !state.imported && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-green-300">Modele charge avec succes</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${formatColor}`}>
                      {formatLabel}
                    </span>
                  </div>
                  <p className="text-xs text-green-400/70 mt-1">
                    {state.result.meshCount} meshes
                    {state.result.materialCount !== undefined && (
                      <> &middot; {state.result.materialCount} materiaux</>
                    )}
                    {state.result.ifcSpaces !== undefined && (
                      <> &middot; {state.result.ifcSpaces} espaces IFC</>
                    )}
                    {state.result.ifcDoors !== undefined && (
                      <> &middot; {state.result.ifcDoors} portes IFC</>
                    )}
                  </p>
                </div>
              </div>

              {/* Bounding box info */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Dimensions du modele</p>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="text-center">
                    <p className="text-gray-500">Largeur</p>
                    <p className="text-white font-mono">
                      {Math.abs(state.result.boundingBox.max.x - state.result.boundingBox.min.x).toFixed(1)}m
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Profondeur</p>
                    <p className="text-white font-mono">
                      {Math.abs(state.result.boundingBox.max.z - state.result.boundingBox.min.z).toFixed(1)}m
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500">Hauteur</p>
                    <p className="text-white font-mono">
                      {Math.abs(state.result.boundingBox.max.y - state.result.boundingBox.min.y).toFixed(1)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Imported confirmation */}
          {state.imported && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-green-300 font-medium">Maquette 3D importee !</p>
              <p className="text-xs text-green-400/70 mt-1">
                Basculez en vue 3D pour visualiser le modele
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Fermer
          </button>
          <div className="flex gap-2">
            {state.fileName && !state.result && !state.isLoading && (
              <button
                onClick={handleLoad}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-medium transition-colors"
              >
                Charger le modele
              </button>
            )}
            {state.result && !state.imported && (
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-xs font-medium transition-colors"
              >
                Confirmer l'import
              </button>
            )}
            {state.imported && (
              <button
                onClick={() => { handleReset(); onClose() }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-medium transition-colors"
              >
                Terminer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
