import { useState, useMemo } from 'react'
import { Calculator, Check } from 'lucide-react'
import type { SignageType } from '../proph3t/types'

interface SignaleticsSpec {
  recommendedType: SignageType
  poseHeightM: number
  textHeightMm: number
  maxReadingDistanceM: number
  isLuminousRequired: boolean
  isBAESRequired: boolean
  spacingM: number
  normRef: string
  justification: string
}

interface SignaleticsCalculatorProps {
  onApply?: (specs: SignaleticsSpec) => void
}

export default function SignaleticsCalculator({ onApply }: SignaleticsCalculatorProps) {
  const [readingDistance, setReadingDistance] = useState(10)
  const [corridorWidth, setCorridorWidth] = useState(4)
  const [ceilingHeight, setCeilingHeight] = useState(3.5)
  const [lux, setLux] = useState(300)

  const specs = useMemo((): SignaleticsSpec => {
    const maxReading = Math.min(readingDistance, corridorWidth * 3)
    const textHeightMm = Math.ceil(maxReading / 0.2)
    const rawPose = 1.60 + maxReading * 0.268
    const poseHeightM = Math.round(Math.max(2.20, Math.min(rawPose, ceilingHeight - 0.3)) * 100) / 100

    let recommendedType: SignageType
    if (ceilingHeight >= 4.5 && readingDistance > 20) {
      recommendedType = 'totem_5m'
    } else if (ceilingHeight >= 3.5) {
      recommendedType = readingDistance > 15 ? 'totem_3m' : 'panneau_dir_suspendu'
    } else if (corridorWidth >= 4) {
      recommendedType = 'panneau_dir_suspendu'
    } else {
      recommendedType = 'panneau_dir_mural'
    }

    const isLuminousRequired = lux < 200
    const isBAESRequired = lux < 50
    const panelHeightMm = recommendedType.includes('totem') ? 1200 : 300
    const spacingM = panelHeightMm / 10

    const justification = [
      `Distance lecture ${maxReading}m → texte ${textHeightMm}mm min (NF X 08-003).`,
      `Pose à ${poseHeightM}m (plafond ${ceilingHeight}m, min 2.20m).`,
      isLuminousRequired ? `Panneau lumineux requis (${lux} lux < 200 — NF EN 1838).` : '',
      isBAESRequired ? `BAES obligatoire (${lux} lux < 50 — NF C 71-800).` : '',
      `Espacement inter-panneaux max : ${spacingM}m.`,
    ].filter(Boolean).join(' ')

    return {
      recommendedType,
      poseHeightM,
      textHeightMm,
      maxReadingDistanceM: Math.round(maxReading * 10) / 10,
      isLuminousRequired,
      isBAESRequired,
      spacingM,
      normRef: 'NF X 08-003 + ISO 7010',
      justification,
    }
  }, [readingDistance, corridorWidth, ceilingHeight, lux])

  return (
    <div className="bg-surface-1 border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Calculator className="w-4 h-4 text-emerald-400" />
        Calculateur Signalétique
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Distance lecture (m)</span>
          <input
            type="number"
            value={readingDistance}
            onChange={(e) => setReadingDistance(Number(e.target.value))}
            min={1}
            max={50}
            step={0.5}
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Largeur couloir (m)</span>
          <input
            type="number"
            value={corridorWidth}
            onChange={(e) => setCorridorWidth(Number(e.target.value))}
            min={1}
            max={20}
            step={0.5}
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Hauteur plafond (m)</span>
          <input
            type="number"
            value={ceilingHeight}
            onChange={(e) => setCeilingHeight(Number(e.target.value))}
            min={2.5}
            max={12}
            step={0.1}
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Luminosité (lux)</span>
          <input
            type="number"
            value={lux}
            onChange={(e) => setLux(Number(e.target.value))}
            min={0}
            max={1000}
            step={10}
            className="w-full px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      <div className="bg-gray-800/60 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Type recommandé</span>
          <span className="text-emerald-400 font-medium">{specs.recommendedType.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Taille texte min</span>
          <span className="text-white font-mono">{specs.textHeightMm} mm</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Hauteur de pose</span>
          <span className="text-white font-mono">{specs.poseHeightM} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Distance lecture max</span>
          <span className="text-white font-mono">{specs.maxReadingDistanceM} m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Espacement max</span>
          <span className="text-white font-mono">{specs.spacingM} m</span>
        </div>
        {specs.isLuminousRequired && (
          <div className="text-amber-400 text-[10px]">⚠ Panneau lumineux requis (NF EN 1838)</div>
        )}
        {specs.isBAESRequired && (
          <div className="text-red-400 text-[10px]">⚠ BAES obligatoire (NF C 71-800)</div>
        )}
      </div>

      <div className="text-[10px] text-gray-500 leading-relaxed">{specs.justification}</div>

      {onApply && (
        <button
          onClick={() => onApply(specs)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Appliquer
        </button>
      )}
    </div>
  )
}
