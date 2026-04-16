// ═══ MULTI-PLAN OVERLAY — Superposition multi-niveaux + drag&drop + consolidation ═══
// Affiche tous les plans visibles d'un étage (ou cross-floor) empilés avec opacité
// par couche. Inclut un panneau latéral avec drag&drop d'ordre, sliders d'opacité,
// toggle visibilité, et bouton de consolidation export PNG/SVG.

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Eye, EyeOff, Layers, Trash2, GripVertical, Download, Maximize2, Minimize2, X } from 'lucide-react'
import { usePlanImportStore, type PlanLayer, type PlanImportRecord } from '../stores/planImportStore'

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
  const scopeKey = floorId ?? '__all__'
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
  const [showConsolidate, setShowConsolidate] = useState(false)
  const [consolidating, setConsolidating] = useState(false)
  const [consolidatedUrl, setConsolidatedUrl] = useState<string | null>(null)

  const onDragStart = (i: number) => setDragIndex(i)
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setHoverIndex(i) }
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i || !floorId) {
      setDragIndex(null); setHoverIndex(null); return
    }
    reorderLayers(floorId, dragIndex, i)
    setDragIndex(null); setHoverIndex(null)
  }

  // ─── Consolidation : composite tous les visibles en 1 PNG ───
  const consolidate = useCallback(async () => {
    setConsolidating(true)
    setConsolidatedUrl(null)
    try {
      const visibleLayers = layers.filter(l => l.visible && l.record.planImageUrl)
      if (visibleLayers.length === 0) {
        alert('Aucun calque visible à consolider')
        return
      }
      // Charger toutes les images
      const images = await Promise.all(visibleLayers.map(l => loadImage(l.record.planImageUrl!)))
      // Calc bbox max
      const maxW = Math.max(...images.map(i => i.naturalWidth))
      const maxH = Math.max(...images.map(i => i.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = maxW
      canvas.height = maxH
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, maxW, maxH)
      // Draw bottom-up (premier de la liste = arrière-plan)
      for (let i = visibleLayers.length - 1; i >= 0; i--) {
        const layer = visibleLayers[i]
        const img = images[i]
        ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity))
        // Centrage
        const x = (maxW - img.naturalWidth) / 2
        const y = (maxH - img.naturalHeight) / 2
        ctx.drawImage(img, x, y)
      }
      ctx.globalAlpha = 1
      // Watermark
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.font = '14px sans-serif'
      ctx.fillText(`Atlas Mall Suite — ${new Date().toLocaleDateString('fr-FR')} — ${visibleLayers.length} niveau(x) consolidés`, 12, maxH - 14)
      const dataUrl = canvas.toDataURL('image/png')
      setConsolidatedUrl(dataUrl)
      onConsolidated?.(dataUrl)
    } catch (err) {
      console.error('[Consolidate] failed', err)
      alert(`Erreur consolidation: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setConsolidating(false)
    }
  }, [layers, onConsolidated])

  const downloadConsolidated = (dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `plan-consolide-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  const visibleCount = layers.filter(l => l.visible).length

  return (
    <div ref={containerRef} className={`relative bg-slate-950 border border-white/[0.06] rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-cyan-400" />
          <span className="text-[12px] font-semibold text-white">Plans superposés</span>
          <span className="text-[10px] text-slate-500">
            {visibleCount}/{layers.length} visibles {floorId ? `· étage ${floorId}` : '· tous niveaux'}
          </span>
        </div>
        <div className="flex items-center gap-1">
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
                l.visible ? 'border-white/[0.05] hover:border-white/[0.1] bg-slate-900/40' : 'border-white/[0.03] bg-slate-950 opacity-60'
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
        <div className="border-t border-white/[0.06] p-3 bg-slate-900/30">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Aperçu superposition</div>
          <div className="relative w-full h-48 bg-white rounded overflow-hidden">
            {layers.map((l) => l.visible && l.record.planImageUrl && (
              <img
                key={l.importId}
                src={l.record.planImageUrl}
                alt={l.record.fileName}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: l.opacity }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Consolidation result modal */}
      {consolidatedUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-xl bg-slate-950 border border-cyan-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[14px] font-semibold text-white">Plan consolidé</h3>
                <p className="text-[10px] text-slate-500">{visibleCount} niveau(x) fusionnés</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadConsolidated(consolidatedUrl)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-cyan-600/30 border border-cyan-500/50 text-cyan-200 text-[11px]">
                  <Download size={12} /> Télécharger PNG
                </button>
                <button onClick={() => setConsolidatedUrl(null)}
                  className="p-1.5 hover:bg-white/[0.05] rounded text-slate-400">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto bg-slate-900">
              <img src={consolidatedUrl} alt="Plan consolidé" className="max-w-full" />
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
