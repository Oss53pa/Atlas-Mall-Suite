// ═══ ÉDITEUR D'AGENCEMENT BOUTIQUE — Konva.js ═══
// Grille 20cm, bibliothèque mobilier, drag-drop, export PDF

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Circle, Transformer } from 'react-konva'
import Konva from 'konva'
import {
  Move, RotateCcw, Trash2, Download, ZoomIn, ZoomOut,
  Grid3X3, Save, Undo2, Redo2, Square, Armchair,
} from 'lucide-react'

// ── Types ──
interface FurnitureItem {
  id: string
  type: string
  label: string
  x: number; y: number
  width: number; height: number
  rotation: number
  color: string
  category: 'meuble' | 'comptoir' | 'cabine' | 'vitrine' | 'caisse' | 'cloison'
}

interface LayoutState {
  furniture: FurnitureItem[]
  walls: { x1: number; y1: number; x2: number; y2: number }[]
  floorColor: string
  wallColor: string
  zoneName: string
  zoneArea: number
}

interface Props {
  zoneName: string
  zoneWidth: number   // meters
  zoneHeight: number  // meters
  onSave?: (state: LayoutState) => void
  onExportPDF?: (state: LayoutState) => void
}

// ── Furniture catalog ──
const CATALOG: { category: string; items: { type: string; label: string; w: number; h: number; color: string }[] }[] = [
  {
    category: 'Rayonnages',
    items: [
      { type: 'shelf_4m', label: 'Rayon 4m', w: 4, h: 0.6, color: '#8b7355' },
      { type: 'shelf_2m', label: 'Rayon 2m', w: 2, h: 0.6, color: '#8b7355' },
      { type: 'gondola', label: 'Gondole', w: 3, h: 1.2, color: '#a0896e' },
    ],
  },
  {
    category: 'Comptoirs',
    items: [
      { type: 'counter_L', label: 'Comptoir L', w: 2.5, h: 0.8, color: '#5a4a3a' },
      { type: 'counter_I', label: 'Comptoir I', w: 3, h: 0.6, color: '#5a4a3a' },
      { type: 'cashier', label: 'Caisse', w: 1.2, h: 0.8, color: '#4a6a4a' },
    ],
  },
  {
    category: 'Cabines & vitrines',
    items: [
      { type: 'fitting_room', label: 'Cabine essayage', w: 1.4, h: 1.4, color: '#6a5a7a' },
      { type: 'vitrine', label: 'Vitrine', w: 2, h: 0.5, color: '#7a8a9a' },
      { type: 'mannequin', label: 'Mannequin', w: 0.5, h: 0.5, color: '#c0b0a0' },
    ],
  },
  {
    category: 'Mobilier',
    items: [
      { type: 'table_round', label: 'Table ronde', w: 1, h: 1, color: '#6a6a5a' },
      { type: 'chair', label: 'Chaise', w: 0.5, h: 0.5, color: '#5a5a6a' },
      { type: 'sofa', label: 'Banquette', w: 2, h: 0.8, color: '#7a5a4a' },
      { type: 'plant', label: 'Plante', w: 0.6, h: 0.6, color: '#4a7a4a' },
    ],
  },
]

const GRID_M = 0.2 // 20cm grid
const PX_PER_M = 60 // pixels per meter

export default function LayoutEditor({ zoneName, zoneWidth, zoneHeight, onSave, onExportPDF }: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const [items, setItems] = useState<FurnitureItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'wall'>('select')
  const [zoom, setZoom] = useState(1)
  const [history, setHistory] = useState<FurnitureItem[][]>([[]])
  const [historyIdx, setHistoryIdx] = useState(0)

  const W = zoneWidth * PX_PER_M
  const H = zoneHeight * PX_PER_M
  const gridPx = GRID_M * PX_PER_M

  const snap = (v: number) => Math.round(v / gridPx) * gridPx

  const pushHistory = useCallback((newItems: FurnitureItem[]) => {
    const newHist = history.slice(0, historyIdx + 1)
    newHist.push(newItems)
    if (newHist.length > 50) newHist.shift()
    setHistory(newHist)
    setHistoryIdx(newHist.length - 1)
  }, [history, historyIdx])

  const undo = () => { if (historyIdx > 0) { setHistoryIdx(historyIdx - 1); setItems(history[historyIdx - 1]) } }
  const redo = () => { if (historyIdx < history.length - 1) { setHistoryIdx(historyIdx + 1); setItems(history[historyIdx + 1]) } }

  const addItem = useCallback((type: string, label: string, w: number, h: number, color: string) => {
    const newItem: FurnitureItem = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, label, x: W / 2 - (w * PX_PER_M) / 2, y: H / 2 - (h * PX_PER_M) / 2,
      width: w * PX_PER_M, height: h * PX_PER_M, rotation: 0, color,
      category: 'meuble',
    }
    const next = [...items, newItem]
    setItems(next)
    pushHistory(next)
    setSelectedId(newItem.id)
  }, [items, W, H, pushHistory])

  const deleteSelected = () => {
    if (!selectedId) return
    const next = items.filter(i => i.id !== selectedId)
    setItems(next)
    pushHistory(next)
    setSelectedId(null)
  }

  const handleDragEnd = (id: string, x: number, y: number) => {
    const next = items.map(i => i.id === id ? { ...i, x: snap(x), y: snap(y) } : i)
    setItems(next)
    pushHistory(next)
  }

  const rotateSelected = () => {
    if (!selectedId) return
    const next = items.map(i => i.id === selectedId ? { ...i, rotation: (i.rotation + 90) % 360 } : i)
    setItems(next)
    pushHistory(next)
  }

  const occupiedArea = useMemo(() => {
    return items.reduce((a, i) => a + (i.width / PX_PER_M) * (i.height / PX_PER_M), 0)
  }, [items])

  const handleSave = () => {
    onSave?.({
      furniture: items,
      walls: [],
      floorColor: '#e8e6e0',
      wallColor: '#d0cec8',
      zoneName,
      zoneArea: zoneWidth * zoneHeight,
    })
  }

  return (
    <div className="flex h-full" style={{ background: '#060a13', color: '#e2e8f0' }}>
      {/* Left: Furniture catalog */}
      <div className="w-56 flex-shrink-0 border-r border-white/[0.05] overflow-y-auto" style={{ background: '#0a0f1a' }}>
        <div className="p-3 border-b border-white/[0.04]">
          <div className="flex items-center gap-2 mb-1">
            <Armchair size={14} className="text-amber-400" />
            <h3 className="text-[12px] font-semibold text-white">Mobilier</h3>
          </div>
          <p className="text-[10px] text-gray-500">Glissez vers le plan</p>
        </div>
        {CATALOG.map(cat => (
          <div key={cat.category} className="p-2">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold px-2 mb-1">{cat.category}</p>
            <div className="space-y-1">
              {cat.items.map(item => (
                <button key={item.type}
                  onClick={() => addItem(item.type, item.label, item.w, item.h, item.color)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
                  <div className="w-4 h-3 rounded-sm" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <span className="ml-auto text-[9px] text-gray-600">{item.w}×{item.h}m</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05]" style={{ background: '#0b1120' }}>
          <button onClick={() => setTool('select')} className={`p-1.5 rounded ${tool === 'select' ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Sélection"><Move size={14} /></button>
          <div className="w-px h-4 bg-white/[0.06]" />
          <button onClick={rotateSelected} disabled={!selectedId} className="p-1.5 rounded text-gray-500 hover:text-white disabled:opacity-30" title="Rotation 90°"><RotateCcw size={14} /></button>
          <button onClick={deleteSelected} disabled={!selectedId} className="p-1.5 rounded text-gray-500 hover:text-red-400 disabled:opacity-30" title="Supprimer"><Trash2 size={14} /></button>
          <div className="w-px h-4 bg-white/[0.06]" />
          <button onClick={undo} className="p-1.5 rounded text-gray-500 hover:text-white" title="Ctrl+Z"><Undo2 size={14} /></button>
          <button onClick={redo} className="p-1.5 rounded text-gray-500 hover:text-white" title="Ctrl+Y"><Redo2 size={14} /></button>
          <div className="w-px h-4 bg-white/[0.06]" />
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="p-1.5 rounded text-gray-500 hover:text-white"><ZoomIn size={14} /></button>
          <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="p-1.5 rounded text-gray-500 hover:text-white"><ZoomOut size={14} /></button>
          <span className="text-[10px] text-gray-500 ml-1">{Math.round(zoom * 100)}%</span>

          <div className="flex-1" />
          <span className="text-[10px] text-gray-500">Grille : {GRID_M * 100}cm</span>
          <Grid3X3 size={12} className="text-gray-600" />
          <div className="w-px h-4 bg-white/[0.06]" />
          <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium"><Save size={12} /> Sauvegarder</button>
          <button onClick={() => onExportPDF?.({ furniture: items, walls: [], floorColor: '#e8e6e0', wallColor: '#d0cec8', zoneName, zoneArea: zoneWidth * zoneHeight })}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-300 text-[11px] hover:text-white"><Download size={12} /> PDF</button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center" style={{ background: '#0a0e16' }}>
          <Stage ref={stageRef} width={W * zoom + 40} height={H * zoom + 40}
            scaleX={zoom} scaleY={zoom} onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}>
            <Layer>
              {/* Floor */}
              <Rect x={20 / zoom} y={20 / zoom} width={W} height={H} fill="#e8e6e0" stroke="#c0beb8" strokeWidth={1} />

              {/* Grid */}
              {Array.from({ length: Math.ceil(W / gridPx) + 1 }).map((_, i) => (
                <Line key={`gv${i}`} points={[20 / zoom + i * gridPx, 20 / zoom, 20 / zoom + i * gridPx, 20 / zoom + H]}
                  stroke="#d0cec8" strokeWidth={0.5} opacity={0.5} />
              ))}
              {Array.from({ length: Math.ceil(H / gridPx) + 1 }).map((_, i) => (
                <Line key={`gh${i}`} points={[20 / zoom, 20 / zoom + i * gridPx, 20 / zoom + W, 20 / zoom + i * gridPx]}
                  stroke="#d0cec8" strokeWidth={0.5} opacity={0.5} />
              ))}

              {/* Furniture items */}
              {items.map(item => (
                <Group key={item.id} x={20 / zoom + item.x} y={20 / zoom + item.y}
                  rotation={item.rotation} draggable
                  onClick={() => setSelectedId(item.id)}
                  onDragEnd={(e) => handleDragEnd(item.id, e.target.x() - 20 / zoom, e.target.y() - 20 / zoom)}>
                  <Rect width={item.width} height={item.height} fill={item.color}
                    stroke={selectedId === item.id ? '#818cf8' : '#00000030'} strokeWidth={selectedId === item.id ? 2 : 0.5}
                    cornerRadius={2} />
                  <Text text={item.label} x={2} y={2} fontSize={9} fill="#ffffff80" />
                </Group>
              ))}

              {/* Dimensions */}
              <Text text={`${zoneWidth}m`} x={20 / zoom + W / 2 - 15} y={20 / zoom + H + 5} fontSize={10} fill="#666" />
              <Text text={`${zoneHeight}m`} x={20 / zoom + W + 5} y={20 / zoom + H / 2 - 5} fontSize={10} fill="#666" rotation={90} />
            </Layer>
          </Stage>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-white/[0.05] text-[10px] text-gray-500" style={{ background: '#0b1120' }}>
          <span><strong className="text-white">{zoneName}</strong></span>
          <span>Surface : {zoneWidth * zoneHeight} m²</span>
          <span>Mobilier : {items.length} éléments</span>
          <span>Occupé : {occupiedArea.toFixed(1)} m² ({((occupiedArea / (zoneWidth * zoneHeight)) * 100).toFixed(0)}%)</span>
          {selectedId && <span className="text-indigo-400">Sélection : {items.find(i => i.id === selectedId)?.label}</span>}
        </div>
      </div>
    </div>
  )
}
