// ═══ MULTI-PLAN OVERLAY — Superposition multi-niveaux + drag&drop + consolidation ═══
// Affiche tous les plans visibles d'un étage (ou cross-floor) empilés avec opacité
// par couche. Inclut un panneau latéral avec drag&drop d'ordre, sliders d'opacité,
// toggle visibilité, et bouton de consolidation export PNG/SVG.

import React, { useMemo, useRef, useState, useCallback } from 'react'
import { Eye, EyeOff, Layers, Trash2, GripVertical, Download, Maximize2, Minimize2, X } from 'lucide-react'
import { usePlanImportStore, type PlanLayer, type PlanImportRecord } from '../stores/planImportStore'
import { safeImageUrl } from '../../../../lib/urlSafety'

interface OverlayLayerView extends PlanLayer {
  record: PlanImportRecord
  /** index dans le tableau (pour drag&drop). */
  index: number
}

interface MultiPlanOverlayProps {
  /** floorId scope ; si undefined, prend tous les imports tous étages confondus */
  floorId?: string
  className?: string
  /** Callback consolidation : retourne un dataURL PNG. */
  onConsolidated?: (pngDataUrl: string) => void
}

export function MultiPlanOverlay({ floorId, className = '', onConsolidated }: MultiPlanOverlayProps) {
  const imports = usePlanImportStore(s => s.imports)
  const layersPerFloor = usePlanImportStore(s => s.layersPerFloor)
  const setLayerOpacity = usePlanImportStore(s => s.setLayerOpacity)
  const toggleLayerVisibility = usePlanImportStore(s => s.toggleLayerVisibility)
  const removeLayer = usePlanImportStore(s => s.removeLayer)
  const reorderLayers = usePlanImportStore(s => s.reorderLayers)

  // Si pas de floorId, on agrège : 1 layer "virtuel" par import success
  const layers = useMemo<OverlayLayerView[]>(() => {
    if (floorId) {
      const list = layersPerFloor[floorId] ?? []
      return list
        .map((l, i) => ({ ...l, record: imports.find(r => r.id === l.importId)!, index: i }))
        .filter(l => l.record && l.record.status === 'success')
    } else {
      // Vue cross-floor : tous les imports success comme layers
      return imports
        .filter(r => r.status === 'success' && r.planImageUrl)
        .map((r, i) => {
          const existing = (layersPerFloor[r.floorId] ?? []).find(l => l.importId === r.id)
          return {
            importId: r.id,
            opacity: existing?.opacity ?? 0.6,
            visible: existing?.visible ?? true,
            record: r,
            index: i,
          }
        })
    }
  }, [imports, layersPerFloor, floorId])

  // Drag & drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [_showConsolidate, _setShowConsolidate] = useState(false)
  const [consolidating, setConsolidating] = useState(false)
  const [consolidatedUrl, setConsolidatedUrl] = useState<string | null>(null)
  const [consolidatedSvg, setConsolidatedSvg] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png')

  const onDragStart = (i: number) => setDragIndex(i)
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setHoverIndex(i) }
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i || !floorId) {
      setDragIndex(null); setHoverIndex(null); return
    }
    reorderLayers(floorId, dragIndex, i)
    setDragIndex(null); setHoverIndex(null)
  }

  // ─── Consolidation PNG : composite raster ───
  const consolidatePng = useCallback(async () => {
    const visibleLayers = layers.filter(l => l.visible && l.record.planImageUrl)
    if (visibleLayers.length === 0) {
      alert('Aucun calque visible à consolider')
      return
    }
    const images = await Promise.all(visibleLayers.map(l => loadImage(l.record.planImageUrl!)))
    const maxW = Math.max(...images.map(i => i.naturalWidth))
    const maxH = Math.max(...images.map(i => i.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = maxW
    canvas.height = maxH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, maxW, maxH)
    for (let i = visibleLayers.length - 1; i >= 0; i--) {
      const layer = visibleLayers[i]
      const img = images[i]
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity))
      const x = (maxW - img.naturalWidth) / 2
      const y = (maxH - img.naturalHeight) / 2
      ctx.drawImage(img, x, y)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.font = '14px sans-serif'
    ctx.fillText(`Atlas Mall Suite — ${new Date().toLocaleDateString('fr-FR')} — ${visibleLayers.length} niveau(x) consolidés`, 12, maxH - 14)
    return canvas.toDataURL('image/png')
  }, [layers])

  // ─── Consolidation SVG : vector empilé (préserve qualité infinie) ───
  const consolidateSvg = useCallback(async (): Promise<string> => {
    const visibleLayers = layers.filter(l => l.visible && l.record.planImageUrl)
    if (visibleLayers.length === 0) throw new Error('Aucun calque visible')
    // On charge chaque image pour récupérer dimensions, puis on empile en SVG
    const images = await Promise.all(visibleLayers.map(l => loadImage(l.record.planImageUrl!)))
    const maxW = Math.max(...images.map(i => i.naturalWidth))
    const maxH = Math.max(...images.map(i => i.naturalHeight))
    // Pour chaque image, on l'embarque en base64 dans une <image> SVG
    const layersXml: string[] = []
    for (let i = visibleLayers.length - 1; i >= 0; i--) {
      const layer = visibleLayers[i]
      const img = images[i]
      const x = (maxW - img.naturalWidth) / 2
      const y = (maxH - img.naturalHeight) / 2
      // Si l'image est déjà SVG, on l'inline ; sinon on embed via xlink:href
      const url = layer.record.planImageUrl!
      let href = url
      // Tente fetch + inline si même origine ou data URL
      try {
        const res = await fetch(url)
        const ct = res.headers.get('content-type') ?? ''
        if (ct.includes('image/svg')) {
          const svgText = await res.text()
          // Extrait le <svg> intérieur
          const inner = svgText.replace(/^[\s\S]*<svg[^>]*>/i, '').replace(/<\/svg>[\s\S]*$/i, '')
          layersXml.push(`<g transform="translate(${x} ${y})" opacity="${layer.opacity.toFixed(2)}"><svg viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}" width="${img.naturalWidth}" height="${img.naturalHeight}">${inner}</svg></g>`)
          continue
        } else {
          // Convertit en base64
          const blob = await res.blob()
          href = await blobToDataUrl(blob)
        }
      } catch { /* fallback href tel quel */ }
      layersXml.push(`<image x="${x}" y="${y}" width="${img.naturalWidth}" height="${img.naturalHeight}" opacity="${layer.opacity.toFixed(2)}" href="${href}" preserveAspectRatio="xMidYMid meet"/>`)
    }
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${maxW} ${maxH}" width="${maxW}" height="${maxH}">
  <rect width="${maxW}" height="${maxH}" fill="#ffffff"/>
  ${layersXml.join('\n  ')}
  <text x="12" y="${maxH - 14}" font-family="sans-serif" font-size="14" fill="rgba(0,0,0,0.5)">Atlas Mall Suite — ${new Date().toLocaleDateString('fr-FR')} — ${visibleLayers.length} niveau(x) consolidés</text>
</svg>`
  }, [layers])

  const consolidate = useCallback(async () => {
    setConsolidating(true)
    setConsolidatedUrl(null)
    setConsolidatedSvg(null)
    try {
      if (exportFormat === 'svg') {
        const svg = await consolidateSvg()
        setConsolidatedSvg(svg)
      } else {
        const png = await consolidatePng()
        if (png) {
          setConsolidatedUrl(png)
          onConsolidated?.(png)
        }
      }
    } catch (err) {
      console.error('[Consolidate] failed', err)
      alert(`Erreur consolidation: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setConsolidating(false)
    }
  }, [exportFormat, consolidatePng, consolidateSvg, onConsolidated])

  const downloadConsolidated = (dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `plan-consolide-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }
  const downloadSvg = (svg: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plan-consolide-${new Date().toISOString().slice(0, 10)}.svg`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const visibleCount = layers.filter(l => l.visible).length

  return (
    <div ref={containerRef} className={`relative bg-surface-0 border border-white/[0.06] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-surface-1/50">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" />
          <span className="text-[12px] font-semibold text-white">Plans superposés</span>
          <span className="text-[10px] text-slate-500">
            {visibleCount}/{layers.length} visibles {floorId ? `· étage ${floorId}` : '· tous niveaux'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as 'png' | 'svg')}
            className="px-1.5 py-1 rounded text-[10px] bg-slate-800 border border-white/[0.06] text-slate-300"
            title="Format de sortie consolidé"
          >
            <option value="png">PNG (raster)</option>
            <option value="svg">SVG (vector)</option>
          </select>
          <button
            onClick={consolidate}
            disabled={consolidating || visibleCount === 0}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/30 disabled:opacity-50"
            title="Fusionner tous les calques visibles en un seul plan exportable"
          >
            <Download size={11} />
            {consolidating ? 'Consolidation…' : 'Consolider'}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white p-1">
            {collapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Layers list */}
      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1.5">
          {layers.length === 0 && (
            <div className="text-center py-6 text-[11px] text-slate-600">
              Aucun plan importé. Importez plusieurs plans (RDC, R+1...) pour les superposer.
            </div>
          )}
          {layers.map((l, i) => (
            <div
              key={l.importId}
              draggable={!!floorId}
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => { setDragIndex(null); setHoverIndex(null) }}
              onDrop={() => onDrop(i)}
              className={`rounded-lg border p-2 transition ${
                hoverIndex === i ? 'border-cyan-500 bg-cyan-900/10' :
                l.visible ? 'border-white/[0.05] hover:border-white/[0.1] bg-surface-1/40' : 'border-white/[0.03] bg-surface-0 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                {floorId && (
                  <GripVertical size={12} className="text-slate-600 cursor-grab flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-white truncate">{l.record.fileName}</span>
                    <span className="text-[9px] text-slate-500 ml-auto whitespace-nowrap">
                      {l.record.floorLevel}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {l.record.sourceType.toUpperCase()} · {l.record.zonesDetected} zones
                  </div>
                </div>
                <button onClick={() => floorId && toggleLayerVisibility(floorId, l.importId)}
                  className="p-1 text-slate-400 hover:text-white" title="Visibilité">
                  {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                {floorId && (
                  <button onClick={() => removeLayer(floorId, l.importId)}
                    className="p-1 text-slate-500 hover:text-red-400" title="Retirer la superposition">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              {l.visible && (
                <div className="flex items-center gap-2 mt-2 pl-4">
                  <span className="text-[9px] text-slate-500 w-12">Opacité</span>
                  <input
                    type="range" min={0} max={100} value={Math.round(l.opacity * 100)}
                    onChange={(e) => floorId && setLayerOpacity(floorId, l.importId, parseInt(e.target.value) / 100)}
                    className="flex-1 h-1 accent-cyan-500"
                  />
                  <span className="text-[9px] text-slate-400 w-8 text-right tabular-nums">
                    {Math.round(l.opacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stacked rendering preview */}
      {!collapsed && layers.length > 0 && (
        <div className="border-t border-white/[0.06] p-3 bg-surface-1/30">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Aperçu superposition</div>
          <div className="relative w-full h-48 bg-white rounded overflow-hidden">
            {layers.map((l) => {
              if (!l.visible) return null
              const safeUrl = safeImageUrl(l.record.planImageUrl)
              if (!safeUrl) return null
              return (
                <img
                  key={l.importId}
                  src={safeUrl}
                  alt={l.record.fileName}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: l.opacity }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Consolidation result modal (PNG ou SVG) */}
      {(consolidatedUrl || consolidatedSvg) && (
        <div className="fixed inset-0 z-50 bg-surface-0/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-xl bg-surface-0 border border-cyan-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[14px] font-semibold text-white">
                  Plan consolidé · {consolidatedSvg ? 'SVG (vector)' : 'PNG (raster)'}
                </h3>
                <p className="text-[10px] text-slate-500">{visibleCount} niveau(x) fusionnés</p>
              </div>
              <div className="flex items-center gap-2">
                {consolidatedUrl && (
                  <button onClick={() => downloadConsolidated(consolidatedUrl)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-cyan-600/30 border border-cyan-500/50 text-cyan-200 text-[11px]">
                    <Download size={12} /> Télécharger PNG
                  </button>
                )}
                {consolidatedSvg && (
                  <button onClick={() => downloadSvg(consolidatedSvg)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600/30 border border-emerald-500/50 text-emerald-200 text-[11px]">
                    <Download size={12} /> Télécharger SVG
                  </button>
                )}
                <button onClick={() => { setConsolidatedUrl(null); setConsolidatedSvg(null) }}
                  className="p-1.5 hover:bg-white/[0.05] rounded text-slate-400">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto bg-surface-1">
              {consolidatedUrl && <img src={consolidatedUrl} alt="Plan consolidé" className="max-w-full" />}
              {consolidatedSvg && <div dangerouslySetInnerHTML={{ __html: consolidatedSvg }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper ────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}
