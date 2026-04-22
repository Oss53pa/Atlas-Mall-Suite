import React, { useState, useRef, useCallback } from 'react'
import type { RasterRecognitionResult, RecognizedZone, BoundingBox } from '../planReader/planReaderTypes'
import type { SpaceType } from '../proph3t/types'

interface RasterPreviewProps {
  imageUrl: string
  result: RasterRecognitionResult
  width?: number
  height?: number
  onZonesChanged?: (zones: RecognizedZone[]) => void
}

const TYPE_COLORS: Record<string, string> = {
  commerce: '#22c55e', restauration: '#f97316', parking: '#3b82f6',
  circulation: '#b38a5a', technique: '#6b7280', backoffice: '#ec4899',
  financier: '#eab308', sortie_secours: '#ef4444', loisirs: '#06b6d4',
  services: '#84cc16', hotel: '#a77d4c', bureaux: '#64748b', exterieur: '#10b981',
}

const TYPE_LABELS: Record<string, string> = {
  commerce: 'Commerce', restauration: 'Restauration', parking: 'Parking',
  circulation: 'Circulation', technique: 'Technique', backoffice: 'Backoffice',
  financier: 'Financier', sortie_secours: 'Sortie secours', loisirs: 'Loisirs',
  services: 'Services', hotel: 'Hotel', bureaux: 'Bureaux', exterieur: 'Exterieur',
}

type DragMode = 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | null

export default function RasterPreview({
  imageUrl, result, width = 860, height = 500, onZonesChanged,
}: RasterPreviewProps) {
  const [zones, setZones] = useState<RecognizedZone[]>(result.zones)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragStart, setDragStart] = useState<{ mx: number; my: number; bb: BoundingBox } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const walls = result.walls
  const doors = result.doors

  // ── Coordinate helpers ──
  const svgPoint = useCallback((clientX: number, clientY: number): { nx: number; ny: number } => {
    const svg = svgRef.current
    if (!svg) return { nx: 0, ny: 0 }
    const rect = svg.getBoundingClientRect()
    return { nx: (clientX - rect.left) / rect.width, ny: (clientY - rect.top) / rect.height }
  }, [])

  // ── Drag start ──
  const handlePointerDown = useCallback((e: React.PointerEvent, zoneId: string, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    setSelectedId(zoneId)
    setDragMode(mode)
    const { nx, ny } = svgPoint(e.clientX, e.clientY)
    setDragStart({ mx: nx, my: ny, bb: { ...zone.boundingBox } })
    ;(e.target as SVGElement).setPointerCapture(e.pointerId)
  }, [zones, svgPoint])

  // ── Drag move ──
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode || !dragStart || !selectedId) return
    const { nx, ny } = svgPoint(e.clientX, e.clientY)
    const dx = nx - dragStart.mx
    const dy = ny - dragStart.my
    const orig = dragStart.bb

    setZones(prev => prev.map(z => {
      if (z.id !== selectedId) return z
      let bb: BoundingBox

      switch (dragMode) {
        case 'move':
          bb = { x: clamp(orig.x + dx), y: clamp(orig.y + dy), w: orig.w, h: orig.h }
          break
        case 'resize-br':
          bb = { x: orig.x, y: orig.y, w: Math.max(0.01, orig.w + dx), h: Math.max(0.01, orig.h + dy) }
          break
        case 'resize-bl':
          bb = { x: clamp(orig.x + dx), y: orig.y, w: Math.max(0.01, orig.w - dx), h: Math.max(0.01, orig.h + dy) }
          break
        case 'resize-tr':
          bb = { x: orig.x, y: clamp(orig.y + dy), w: Math.max(0.01, orig.w + dx), h: Math.max(0.01, orig.h - dy) }
          break
        case 'resize-tl':
          bb = { x: clamp(orig.x + dx), y: clamp(orig.y + dy), w: Math.max(0.01, orig.w - dx), h: Math.max(0.01, orig.h - dy) }
          break
        default:
          return z
      }
      return { ...z, boundingBox: bb }
    }))
  }, [dragMode, dragStart, selectedId, svgPoint])

  // ── Drag end ──
  const handlePointerUp = useCallback(() => {
    if (dragMode) {
      setDragMode(null)
      setDragStart(null)
      onZonesChanged?.(zones)
    }
  }, [dragMode, zones, onZonesChanged])

  // ── Change zone type ──
  const changeType = useCallback((zoneId: string, newType: SpaceType) => {
    setZones(prev => {
      const updated = prev.map(z => z.id === zoneId ? { ...z, estimatedType: newType, label: TYPE_LABELS[newType] ?? newType } : z)
      onZonesChanged?.(updated)
      return updated
    })
  }, [onZonesChanged])

  // ── Rename zone ──
  const renameZone = useCallback((zoneId: string, newLabel: string) => {
    setZones(prev => {
      const updated = prev.map(z => z.id === zoneId ? { ...z, label: newLabel } : z)
      onZonesChanged?.(updated)
      return updated
    })
    setEditingId(null)
  }, [onZonesChanged])

  // ── Delete zone ──
  const deleteZone = useCallback((zoneId: string) => {
    setZones(prev => {
      const updated = prev.filter(z => z.id !== zoneId)
      onZonesChanged?.(updated)
      return updated
    })
    setSelectedId(null)
  }, [onZonesChanged])

  // ── Add new zone ──
  const addZone = useCallback(() => {
    const newZone: RecognizedZone = {
      id: `manual-zone-${Date.now()}`,
      label: `Nouvelle zone`,
      estimatedType: 'commerce',
      boundingBox: { x: 0.35, y: 0.35, w: 0.1, h: 0.08 },
      confidence: 1,
    }
    setZones(prev => {
      const updated = [...prev, newZone]
      onZonesChanged?.(updated)
      return updated
    })
    setSelectedId(newZone.id)
  }, [onZonesChanged])

  const selected = zones.find(z => z.id === selectedId)
  const HANDLE_R = 0.007

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={addZone} className="text-[11px] px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors">
            + Ajouter une zone
          </button>
          {selectedId && (
            <button onClick={() => deleteZone(selectedId)} className="text-[11px] px-3 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 transition-colors">
              Supprimer
            </button>
          )}
        </div>
        <span className="text-[10px] text-gray-500">Cliquer = selectionner · Glisser = deplacer · Coins = redimensionner</span>
      </div>

      {/* Selected zone editor — selected garantit que selectedId n'est pas null */}
      {selected && selectedId && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700">
          {/* Label edit */}
          {editingId === selectedId ? (
            <input autoFocus defaultValue={selected.label} className="text-xs bg-surface-1 border border-gray-600 rounded px-2 py-1 text-white w-40 outline-none"
              onBlur={e => renameZone(selectedId, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') renameZone(selectedId, (e.target as HTMLInputElement).value) }}
            />
          ) : (
            <button onClick={() => setEditingId(selectedId)} className="text-xs text-white font-medium hover:text-blue-300 transition-colors" title="Cliquer pour renommer">
              {selected.label}
            </button>
          )}

          {/* Type selector */}
          <select value={selected.estimatedType} onChange={e => changeType(selectedId, e.target.value as SpaceType)}
            className="text-[10px] bg-surface-1 border border-gray-600 rounded px-2 py-1 text-white outline-none">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <div className="w-3 h-3 rounded-sm" style={{ background: TYPE_COLORS[selected.estimatedType] ?? '#888' }} />
            <span className="text-[9px] text-gray-400">{Math.round(selected.boundingBox.w * 100)}% x {Math.round(selected.boundingBox.h * 100)}%</span>
          </div>
        </div>
      )}

      {/* Preview canvas */}
      <div className="relative bg-surface-0 rounded-lg overflow-hidden" style={{ width, height }}>
        {/* Background image */}
        <img src={imageUrl} alt="Plan" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

        {/* SVG overlay */}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none"
          onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onClick={() => setSelectedId(null)}>
          {/* Walls */}
          {walls.map(wall => (
            <line key={wall.id} x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2}
              stroke="#f8fafc" strokeWidth={0.002} strokeOpacity={0.3} />
          ))}

          {/* Zones */}
          {zones.map(zone => {
            const color = TYPE_COLORS[zone.estimatedType] ?? '#888'
            const isSel = zone.id === selectedId
            const bb = zone.boundingBox

            return (
              <g key={zone.id} onClick={e => { e.stopPropagation(); setSelectedId(zone.id) }}>
                {/* Zone rect — draggable */}
                <rect x={bb.x} y={bb.y} width={bb.w} height={bb.h}
                  fill={color} fillOpacity={isSel ? 0.2 : 0.12}
                  stroke={isSel ? '#fff' : color} strokeWidth={isSel ? 0.003 : 0.0015} strokeOpacity={0.8}
                  className="cursor-move"
                  onPointerDown={e => handlePointerDown(e, zone.id, 'move')}
                />
                {/* Label */}
                <text x={bb.x + bb.w / 2} y={bb.y + bb.h / 2} textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize={Math.min(0.015, bb.w * 0.3)} fontFamily="system-ui" pointerEvents="none">
                  {zone.label}
                </text>

                {/* Resize handles (only when selected) */}
                {isSel && <>
                  <circle cx={bb.x} cy={bb.y} r={HANDLE_R} fill="#fff" className="cursor-nw-resize"
                    onPointerDown={e => handlePointerDown(e, zone.id, 'resize-tl')} />
                  <circle cx={bb.x + bb.w} cy={bb.y} r={HANDLE_R} fill="#fff" className="cursor-ne-resize"
                    onPointerDown={e => handlePointerDown(e, zone.id, 'resize-tr')} />
                  <circle cx={bb.x} cy={bb.y + bb.h} r={HANDLE_R} fill="#fff" className="cursor-sw-resize"
                    onPointerDown={e => handlePointerDown(e, zone.id, 'resize-bl')} />
                  <circle cx={bb.x + bb.w} cy={bb.y + bb.h} r={HANDLE_R} fill="#fff" className="cursor-se-resize"
                    onPointerDown={e => handlePointerDown(e, zone.id, 'resize-br')} />
                </>}
              </g>
            )
          })}

          {/* Doors */}
          {doors.map(door => (
            <circle key={door.id} cx={door.x} cy={door.y} r={0.006}
              fill="none" stroke="#f59e0b" strokeWidth={0.002} strokeOpacity={0.5} />
          ))}
        </svg>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-surface-0/80 px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{zones.length} zones | {walls.length} murs | {doors.length} portes</span>
          <span className={`text-[10px] font-medium ${result.confidence >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
            Confiance : {Math.round(result.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function clamp(v: number): number { return Math.max(0, Math.min(1, v)) }
