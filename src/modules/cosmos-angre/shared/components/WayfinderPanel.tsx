// ═══ WAYFINDER PANEL — Modal d'aperçu et d'export du wayfinder ═══

import { useMemo, useState } from 'react'
import { X, Download, FileCode, FileImage, Eye, EyeOff } from 'lucide-react'
import {
  WayfinderRenderer, THEME_PRESETS,
  exportWayfinderSvg, exportWayfinderPng, exportWayfinderHtml,
  downloadString, downloadDataUrl,
  type WayfinderSpace, type WayfinderPoi, type WayfinderTheme,
} from './WayfinderRenderer'

interface Props {
  open: boolean
  onClose: () => void
  spaces: WayfinderSpace[]
  pois?: WayfinderPoi[]
  planBounds: { width: number; height: number }
  title?: string
  subtitle?: string
}

export function WayfinderPanel({ open, onClose, spaces, pois, planBounds, title, subtitle }: Props) {
  const [themeKey, setThemeKey] = useState<WayfinderTheme['preset']>('modern')
  const [showVacant, setShowVacant] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [exporting, setExporting] = useState(false)

  const theme = THEME_PRESETS[themeKey]
  const exportInput = useMemo(() => ({
    spaces, pois, planBounds, theme,
    title: title ?? 'Plan du centre commercial',
    subtitle, showVacant, showLegend,
  }), [spaces, pois, planBounds, theme, title, subtitle, showVacant, showLegend])

  if (!open) return null

  const handleSvg = () => {
    const svg = exportWayfinderSvg({ ...exportInput, width: 1920, height: 1080 })
    downloadString(svg, `wayfinder-${Date.now()}.svg`, 'image/svg+xml;charset=utf-8')
  }
  const handlePng = async () => {
    setExporting(true)
    try {
      const dataUrl = await exportWayfinderPng({ ...exportInput, width: 2400, height: 1350 })
      downloadDataUrl(dataUrl, `wayfinder-${Date.now()}.png`)
    } finally {
      setExporting(false)
    }
  }
  const handleHtml = () => {
    const html = exportWayfinderHtml({ ...exportInput, width: 1920, height: 1080 })
    downloadString(html, `wayfinder-${Date.now()}.html`, 'text/html;charset=utf-8')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-7xl h-[90vh] rounded-xl bg-slate-950 border border-white/[0.08] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[14px] font-semibold text-white">Vue Wayfinder — exportable</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Plan d'orientation public · {spaces.length} espaces · prêt pour borne ou web
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-slate-900/50">
          {/* Theme presets */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 mr-1">Thème :</span>
            {(Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>).map(k => (
              <button key={k} onClick={() => setThemeKey(k)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition ${themeKey === k
                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-200'
                  : 'border border-white/[0.05] text-slate-400 hover:text-white'}`}>
                {k}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          <button onClick={() => setShowVacant(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${showVacant ? 'text-slate-200' : 'text-slate-500'}`}>
            {showVacant ? <Eye size={12} /> : <EyeOff size={12} />}
            Vacants
          </button>
          <button onClick={() => setShowLegend(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${showLegend ? 'text-slate-200' : 'text-slate-500'}`}>
            {showLegend ? <Eye size={12} /> : <EyeOff size={12} />}
            Légende
          </button>

          <div className="flex-1" />

          {/* Exports */}
          <button onClick={handleSvg}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] hover:bg-blue-600/30">
            <FileCode size={12} />
            SVG (vector)
          </button>
          <button onClick={handlePng} disabled={exporting}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] hover:bg-emerald-600/30 disabled:opacity-50">
            <FileImage size={12} />
            {exporting ? '...' : 'PNG (web)'}
          </button>
          <button onClick={handleHtml}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/20 border border-purple-500/40 text-purple-300 text-[10px] hover:bg-purple-600/30">
            <Download size={12} />
            HTML (borne)
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 bg-slate-950">
          <div className="w-full h-full rounded-lg overflow-hidden border border-white/[0.06]">
            <WayfinderRenderer
              spaces={spaces}
              pois={pois}
              planBounds={planBounds}
              theme={theme}
              title={title ?? 'Plan du centre commercial'}
              subtitle={subtitle}
              showVacant={showVacant}
              showLegend={showLegend}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/[0.04] text-[10px] text-slate-500">
          <strong className="text-slate-400">SVG</strong> : qualité vectorielle infinie, idéal impression et écrans 4K ·
          <strong className="text-slate-400"> PNG</strong> : 2400×1350, parfait pour upload web ou réseaux ·
          <strong className="text-slate-400"> HTML</strong> : fichier autonome avec pan/zoom tactile, à uploader sur borne ou site web
        </div>
      </div>
    </div>
  )
}
