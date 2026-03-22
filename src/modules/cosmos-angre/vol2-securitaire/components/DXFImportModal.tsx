// ═══ FLOOR PLAN IMPORT MODAL — Upload & Parse DXF / DWG Files ═══

import { useState, useCallback, useRef } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle, AlertTriangle, Layers, Info } from 'lucide-react'
import { useWorker } from '../../shared/hooks/useWorker'
import { useVol2Store } from '../store/vol2Store'
import type { Zone } from '../../shared/proph3t/types'

type FileFormat = 'dxf' | 'dwg'

const ACCEPTED_EXTENSIONS: Record<FileFormat, string> = {
  dxf: '.dxf',
  dwg: '.dwg',
}

const FORMAT_LABELS: Record<FileFormat, string> = {
  dxf: 'DXF',
  dwg: 'DWG',
}

const FORMAT_COLORS: Record<FileFormat, string> = {
  dxf: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
  dwg: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
}

interface DxfParserInput {
  fileContent: string
  floorId: string
  widthM: number
  heightM: number
}

interface DwgParserInput {
  fileBuffer: ArrayBuffer
  floorId: string
  widthM: number
  heightM: number
}

interface ParseOutput {
  entities: unknown[]
  layers: string[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  zones: Zone[]
  doorCandidates?: unknown[]
  svgContent: string
  dwgVersion?: string
  parseMethod?: 'binary' | 'partial'
}

interface DXFImportModalProps {
  open: boolean
  onClose: () => void
}

function detectFormat(fileName: string): FileFormat | null {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.dxf')) return 'dxf'
  if (lower.endsWith('.dwg')) return 'dwg'
  return null
}

export default function DXFImportModal({ open, onClose }: DXFImportModalProps) {
  const s = useVol2Store()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileFormat, setFileFormat] = useState<FileFormat | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [selectedFloorId, setSelectedFloorId] = useState(s.activeFloorId)
  const [parseResult, setParseResult] = useState<ParseOutput | null>(null)
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // DXF worker (text-based)
  const dxfWorker = useWorker<DxfParserInput, ParseOutput>(
    () => new Worker(new URL('../../../../workers/dxfParser.worker.ts', import.meta.url), { type: 'module' })
  )

  // DWG worker (binary)
  const dwgWorker = useWorker<DwgParserInput, ParseOutput>(
    () => new Worker(new URL('../../../../workers/dwgParser.worker.ts', import.meta.url), { type: 'module' })
  )

  const activeWorker = fileFormat === 'dwg' ? dwgWorker : dxfWorker
  const { progress, isRunning, error } = activeWorker

  const handleFile = useCallback((file: File) => {
    const format = detectFormat(file.name)
    if (!format) return

    setFileName(file.name)
    setFileFormat(format)
    setParseResult(null)
    setImported(false)
    setFileContent(null)
    setFileBuffer(null)

    if (format === 'dxf') {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFileContent(e.target?.result as string)
      }
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFileBuffer(e.target?.result as ArrayBuffer)
      }
      reader.readAsArrayBuffer(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleParse = useCallback(async () => {
    const floor = s.floors.find(f => f.id === selectedFloorId)
    if (!floor) return

    try {
      let result: ParseOutput

      if (fileFormat === 'dwg' && fileBuffer) {
        result = await dwgWorker.run({
          fileBuffer,
          floorId: selectedFloorId,
          widthM: floor.widthM,
          heightM: floor.heightM,
        })
      } else if (fileFormat === 'dxf' && fileContent) {
        result = await dxfWorker.run({
          fileContent,
          floorId: selectedFloorId,
          widthM: floor.widthM,
          heightM: floor.heightM,
        })
      } else {
        return
      }

      setParseResult(result)
    } catch {
      // error is tracked by useWorker
    }
  }, [fileFormat, fileContent, fileBuffer, selectedFloorId, s.floors, dxfWorker, dwgWorker])

  const handleImport = useCallback(() => {
    if (!parseResult) return

    const floor = s.floors.find(f => f.id === selectedFloorId)
    if (!floor) return

    const scaledZones: Zone[] = parseResult.zones.map(z => ({
      ...z,
      x: z.x * floor.widthM,
      y: z.y * floor.heightM,
      w: z.w * floor.widthM,
      h: z.h * floor.heightM,
    }))

    for (const zone of scaledZones) {
      s.addZone(zone)
    }

    setImported(true)
  }, [parseResult, selectedFloorId, s])

  const handleReset = () => {
    setFileName(null)
    setFileFormat(null)
    setFileContent(null)
    setFileBuffer(null)
    setParseResult(null)
    setImported(false)
  }

  const hasFileData = fileFormat === 'dwg' ? !!fileBuffer : !!fileContent

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Import Plan AutoCAD</h2>
              <p className="text-[10px] text-gray-500">Importer un plan depuis un fichier .dxf ou .dwg</p>
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
                  <span className="ml-2 text-gray-600">{f.widthM}x{f.heightM}m</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          {!fileName && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-800/30'
                }
              `}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-gray-600'}`} />
              <p className="text-sm text-gray-300 mb-1">
                Glissez votre fichier .dxf ou .dwg ici
              </p>
              <p className="text-xs text-gray-600">
                ou cliquez pour parcourir
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-[10px] px-2 py-0.5 rounded border bg-blue-600/10 text-blue-400 border-blue-500/30">DXF</span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-amber-600/10 text-amber-400 border-amber-500/30">DWG</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".dxf,.dwg"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </div>
          )}

          {/* File loaded */}
          {fileName && !parseResult && !isRunning && (
            <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium">{fileName}</p>
                  {fileFormat && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${FORMAT_COLORS[fileFormat]}`}>
                      {FORMAT_LABELS[fileFormat]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500">Fichier pret a etre analyse</p>
              </div>
              <button onClick={handleReset} className="text-gray-500 hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* DWG info banner */}
          {fileFormat === 'dwg' && !parseResult && !isRunning && hasFileData && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-300">Parsing binaire DWG</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">
                  Le format DWG est proprietaire. L'extraction sera partielle (calques et coordonnees).
                  Pour de meilleurs resultats, exportez en .dxf depuis AutoCAD.
                </p>
              </div>
            </div>
          )}

          {/* Parsing progress */}
          {isRunning && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse du fichier {fileFormat === 'dwg' ? 'DWG' : 'DXF'}...
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                {progress}% — {fileFormat === 'dwg' ? 'Extraction binaire des calques et coordonnees' : 'Extraction des calques et entites'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-300">Erreur de parsing</p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Parse results */}
          {parseResult && !imported && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-green-300">Fichier analyse avec succes</p>
                    {fileFormat && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${FORMAT_COLORS[fileFormat]}`}>
                        {FORMAT_LABELS[fileFormat]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-green-400/70 mt-1">
                    {parseResult.entities.length} entites &middot; {parseResult.layers.length} calques &middot; {parseResult.zones.length} zones detectees
                    {parseResult.dwgVersion && (
                      <> &middot; Version: {parseResult.dwgVersion}</>
                    )}
                    {parseResult.parseMethod && (
                      <> &middot; Methode: {parseResult.parseMethod}</>
                    )}
                  </p>
                </div>
              </div>

              {/* DWG partial parse warning */}
              {parseResult.parseMethod === 'partial' && (
                <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300">
                    Parsing partiel : les calques n'ont pas pu etre identifies avec certitude.
                    Pour de meilleurs resultats, exportez ce fichier en .dxf depuis AutoCAD.
                  </p>
                </div>
              )}

              {/* Layers found */}
              <div>
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Layers className="w-3 h-3" /> Calques detectes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parseResult.layers.map(layer => (
                    <span key={layer} className="text-[10px] px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-300">
                      {layer}
                    </span>
                  ))}
                </div>
              </div>

              {/* Zones preview */}
              {parseResult.zones.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Zones a importer ({parseResult.zones.length})</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parseResult.zones.map(zone => (
                      <div key={zone.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 rounded text-xs">
                        <div className="w-3 h-3 rounded" style={{ background: zone.color }} />
                        <span className="text-gray-200 flex-1">{zone.label}</span>
                        <span className="text-gray-500">{zone.type}</span>
                        <span className="text-gray-600">N{zone.niveau}</span>
                        {zone.surfaceM2 && <span className="text-gray-600">{zone.surfaceM2} m²</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SVG Preview */}
              {parseResult.svgContent && (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Apercu du plan</p>
                  <div
                    className="bg-gray-950 border border-gray-800 rounded-lg p-2 max-h-48 overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: parseResult.svgContent }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Imported confirmation */}
          {imported && (
            <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-green-300 font-medium">Import termine !</p>
              <p className="text-xs text-green-400/70 mt-1">
                {parseResult?.zones.length} zones ajoutees a l'etage {s.floors.find(f => f.id === selectedFloorId)?.level}
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
            {fileName && hasFileData && !parseResult && !isRunning && (
              <button
                onClick={handleParse}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
              >
                Analyser le fichier
              </button>
            )}
            {parseResult && !imported && (
              <button
                onClick={handleImport}
                disabled={parseResult.zones.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-xs font-medium transition-colors"
              >
                Importer {parseResult.zones.length} zones
              </button>
            )}
            {imported && (
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
