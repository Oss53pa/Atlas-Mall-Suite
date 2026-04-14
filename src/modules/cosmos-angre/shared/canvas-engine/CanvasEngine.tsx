// ═══ CANVAS ENGINE — Grille, Snap, Calques, Cotation ═══
// Couche de capacités CAO intégrée dans chaque plan

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Stage, Layer, Rect, Line, Text, Circle, Group } from 'react-konva'
import Konva from 'konva'
import { Eye, EyeOff, Lock, Unlock, Layers, Ruler, Grid3X3, MousePointer, Pen, Type, Minus } from 'lucide-react'

// ── Types ──
export interface CanvasLayer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  color: string
}

export interface CanvasObject {
  id: string
  layerId: string
  type: 'rect' | 'circle' | 'line' | 'text' | 'polygon' | 'dimension'
  x: number; y: number
  width?: number; height?: number
  radius?: number
  points?: number[]
  text?: string
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
}

export interface SnapConfig {
  enabled: boolean
  gridSize: number // meters
  tolerance: number // pixels
  snapTo: ('grid' | 'endpoint' | 'midpoint' | 'intersection' | 'perpendicular')[]
}

export interface DimensionLine {
  p1: [number, number]
  p2: [number, number]
  value: number // meters
  offset: number // px from segment
}

interface Props {
  width: number  // meters
  height: number // meters
  context: 'vol1' | 'vol2' | 'vol3' | 'scene'
  layers?: CanvasLayer[]
  objects?: CanvasObject[]
  onObjectsChange?: (objects: CanvasObject[]) => void
  onLayersChange?: (layers: CanvasLayer[]) => void
  children?: React.ReactNode
  showGrid?: boolean
  showDimensions?: boolean
  readOnly?: boolean
}

const PX_PER_M = 50
const DEFAULT_GRID_M = 0.5

const LAYER_PRESETS: Record<string, CanvasLayer[]> = {
  vol1: [
    { id: 'structure', name: 'Structure', visible: true, locked: true, opacity: 100, color: '#666' },
    { id: 'zones', name: 'Zones', visible: true, locked: false, opacity: 100, color: '#22c55e' },
    { id: 'labels', name: 'Labels', visible: true, locked: false, opacity: 100, color: '#fff' },
    { id: 'circulation', name: 'Circulation', visible: true, locked: false, opacity: 80, color: '#38bdf8' },
    { id: 'annotations', name: 'Annotations', visible: true, locked: false, opacity: 100, color: '#f59e0b' },
  ],
  vol2: [
    { id: 'structure', name: 'Structure', visible: true, locked: true, opacity: 100, color: '#666' },
    { id: 'cameras', name: 'Caméras', visible: true, locked: false, opacity: 100, color: '#3b82f6' },
    { id: 'acces', name: 'Accès', visible: true, locked: false, opacity: 100, color: '#22c55e' },
    { id: 'reseaux', name: 'Réseaux', visible: false, locked: false, opacity: 60, color: '#a855f7' },
    { id: 'annotations', name: 'Annotations', visible: true, locked: false, opacity: 100, color: '#f59e0b' },
  ],
  vol3: [
    { id: 'structure', name: 'Structure', visible: true, locked: true, opacity: 100, color: '#666' },
    { id: 'touchpoints', name: 'Touchpoints', visible: true, locked: false, opacity: 100, color: '#34d399' },
    { id: 'signage', name: 'Signalétique', visible: true, locked: false, opacity: 100, color: '#f59e0b' },
    { id: 'flux', name: 'Flux visiteurs', visible: true, locked: false, opacity: 70, color: '#ec4899' },
    { id: 'annotations', name: 'Annotations', visible: true, locked: false, opacity: 100, color: '#fff' },
  ],
  scene: [
    { id: 'structure', name: 'Structure', visible: true, locked: true, opacity: 100, color: '#666' },
    { id: 'mobilier', name: 'Mobilier', visible: true, locked: false, opacity: 100, color: '#8b7355' },
    { id: 'deco', name: 'Déco', visible: true, locked: false, opacity: 100, color: '#6a9a4a' },
    { id: 'personnages', name: 'Personnages', visible: true, locked: false, opacity: 80, color: '#333' },
    { id: 'revetements', name: 'Revêtements', visible: true, locked: false, opacity: 100, color: '#c8c4bc' },
  ],
}

export default function CanvasEngine({
  width, height, context, layers: propLayers, objects: propObjects,
  onObjectsChange, onLayersChange, children,
  showGrid: initGrid = true, showDimensions: initDims = true, readOnly = false,
}: Props) {
  const stageRef = useRef<Konva.Stage>(null)
  const [layers, setLayers] = useState<CanvasLayer[]>(propLayers ?? LAYER_PRESETS[context] ?? LAYER_PRESETS.vol1)
  const [objects, setObjects] = useState<CanvasObject[]>(propObjects ?? [])
  const [tool, setTool] = useState<'select' | 'line' | 'rect' | 'text'>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(initGrid)
  const [showDims, setShowDims] = useState(initDims)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [showLayerPanel, setShowLayerPanel] = useState(true)

  const W = width * PX_PER_M
  const H = height * PX_PER_M
  const gridPx = DEFAULT_GRID_M * PX_PER_M

  const snap = useCallback((v: number) => snapEnabled ? Math.round(v / gridPx) * gridPx : v, [snapEnabled, gridPx])

  // ── Layer management ──
  const toggleLayerVisibility = (id: string) => {
    const next = layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
    setLayers(next); onLayersChange?.(next)
  }
  const toggleLayerLock = (id: string) => {
    const next = layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
    setLayers(next); onLayersChange?.(next)
  }
  const setLayerOpacity = (id: string, opacity: number) => {
    const next = layers.map(l => l.id === id ? { ...l, opacity } : l)
    setLayers(next); onLayersChange?.(next)
  }

  // ── Grid lines ──
  const gridLines = useMemo(() => {
    if (!showGrid) return []
    const lines: { points: number[]; major: boolean }[] = []
    const majorEvery = 5 // every 5th line is major
    for (let x = 0; x <= W; x += gridPx) {
      const i = Math.round(x / gridPx)
      lines.push({ points: [x, 0, x, H], major: i % majorEvery === 0 })
    }
    for (let y = 0; y <= H; y += gridPx) {
      const i = Math.round(y / gridPx)
      lines.push({ points: [0, y, W, y], major: i % majorEvery === 0 })
    }
    return lines
  }, [showGrid, W, H, gridPx])

  // ── Dimension lines ──
  const dimensions: DimensionLine[] = useMemo(() => {
    if (!showDims) return []
    return [
      { p1: [0, H + 15], p2: [W, H + 15], value: width, offset: 15 },
      { p1: [W + 15, 0], p2: [W + 15, H], value: height, offset: 15 },
    ]
  }, [showDims, W, H, width, height])

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId && !readOnly) {
        const next = objects.filter(o => o.id !== selectedId)
        setObjects(next); setSelectedId(null); onObjectsChange?.(next)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, objects, readOnly, onObjectsChange])

  // ── Wheel zoom ──
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const delta = e.evt.deltaY > 0 ? 0.9 : 1.1
    setZoom(z => Math.min(5, Math.max(0.2, z * delta)))
  }, [])

  return (
    <div className="flex h-full" style={{ background: '#060a13' }}>
      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.05]" style={{ background: '#0b1120' }}>
          {!readOnly && (
            <>
              <button onClick={() => setTool('select')} className={`p-1.5 rounded ${tool === 'select' ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Sélection"><MousePointer size={13} /></button>
              <button onClick={() => setTool('line')} className={`p-1.5 rounded ${tool === 'line' ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Ligne"><Minus size={13} /></button>
              <button onClick={() => setTool('rect')} className={`p-1.5 rounded ${tool === 'rect' ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Rectangle"><Rect as any size={13} /></button>
              <button onClick={() => setTool('text')} className={`p-1.5 rounded ${tool === 'text' ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Texte"><Type size={13} /></button>
              <div className="w-px h-4 bg-white/[0.06] mx-1" />
            </>
          )}
          <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded ${showGrid ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Grille"><Grid3X3 size={13} /></button>
          <button onClick={() => setSnapEnabled(!snapEnabled)} className={`p-1.5 rounded text-[9px] font-bold ${snapEnabled ? 'bg-indigo-600 text-white' : 'text-gray-500 bg-white/5'}`} title="Snap">S</button>
          <button onClick={() => setShowDims(!showDims)} className={`p-1.5 rounded ${showDims ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Cotation"><Ruler size={13} /></button>
          <div className="w-px h-4 bg-white/[0.06] mx-1" />
          <button onClick={() => setShowLayerPanel(!showLayerPanel)} className={`p-1.5 rounded ${showLayerPanel ? 'bg-white/10 text-white' : 'text-gray-500'}`} title="Calques"><Layers size={13} /></button>
          <div className="flex-1" />
          <span className="text-[10px] text-gray-500">Grille {DEFAULT_GRID_M * 100}cm · Zoom {Math.round(zoom * 100)}%</span>
        </div>

        {/* Stage */}
        <div className="flex-1 overflow-hidden" style={{ background: '#0a0e16' }}>
          <Stage ref={stageRef} width={window.innerWidth - (showLayerPanel ? 400 : 200)} height={600}
            scaleX={zoom} scaleY={zoom} x={pan.x} y={pan.y}
            onWheel={handleWheel}
            onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null) }}>
            <Layer>
              {/* Floor background */}
              <Rect x={20} y={20} width={W} height={H} fill="#f0ede8" stroke="#c0beb8" strokeWidth={1} />

              {/* Grid */}
              {gridLines.map((gl, i) => (
                <Line key={i} points={gl.points.map((p, j) => p + (j % 2 === 0 ? 20 : 20))}
                  stroke={gl.major ? '#b0aea8' : '#d8d6d0'} strokeWidth={gl.major ? 0.8 : 0.3} opacity={0.6} />
              ))}

              {/* User objects */}
              {objects.filter(o => {
                const layer = layers.find(l => l.id === o.layerId)
                return layer?.visible !== false
              }).map(obj => {
                const layer = layers.find(l => l.id === obj.layerId)
                const opacity = (layer?.opacity ?? 100) / 100
                if (obj.type === 'rect') {
                  return <Rect key={obj.id} x={20 + obj.x} y={20 + obj.y} width={obj.width} height={obj.height}
                    fill={obj.fill} stroke={selectedId === obj.id ? '#818cf8' : obj.stroke} strokeWidth={selectedId === obj.id ? 2 : obj.strokeWidth}
                    rotation={obj.rotation} opacity={opacity} draggable={!readOnly && !layer?.locked}
                    onClick={() => setSelectedId(obj.id)}
                    onDragEnd={(e) => {
                      const next = objects.map(o => o.id === obj.id ? { ...o, x: snap(e.target.x() - 20), y: snap(e.target.y() - 20) } : o)
                      setObjects(next); onObjectsChange?.(next)
                    }} />
                }
                if (obj.type === 'text') {
                  return <Text key={obj.id} x={20 + obj.x} y={20 + obj.y} text={obj.text} fill={obj.fill}
                    fontSize={12} opacity={opacity} draggable={!readOnly && !layer?.locked}
                    onClick={() => setSelectedId(obj.id)} />
                }
                return null
              })}

              {/* Dimension lines */}
              {dimensions.map((d, i) => {
                const mx = (d.p1[0] + d.p2[0]) / 2 + 20
                const my = (d.p1[1] + d.p2[1]) / 2 + 20
                return (
                  <Group key={i}>
                    <Line points={[d.p1[0] + 20, d.p1[1] + 20, d.p2[0] + 20, d.p2[1] + 20]}
                      stroke="#888" strokeWidth={0.8} dash={[4, 2]} />
                    <Text x={mx - 15} y={my - 6} text={`${d.value.toFixed(2)} m`} fill="#888" fontSize={9} />
                  </Group>
                )
              })}

              {/* Extra children (overlays from host component) */}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Layer panel */}
      {showLayerPanel && (
        <div className="w-52 flex-shrink-0 border-l border-white/[0.05] overflow-y-auto" style={{ background: '#0a0f1a' }}>
          <div className="p-3 border-b border-white/[0.04]">
            <h3 className="text-[11px] font-semibold text-white flex items-center gap-1.5"><Layers size={12} className="text-indigo-400" /> Calques</h3>
          </div>
          <div className="p-2 space-y-0.5">
            {layers.map(l => (
              <div key={l.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.03]">
                <button onClick={() => toggleLayerVisibility(l.id)} className="text-gray-500 hover:text-white">
                  {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => toggleLayerLock(l.id)} className="text-gray-500 hover:text-white">
                  {l.locked ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                <span className={`text-[10px] flex-1 ${l.visible ? 'text-gray-300' : 'text-gray-600'}`}>{l.name}</span>
                <input type="range" min={0} max={100} value={l.opacity} onChange={e => setLayerOpacity(l.id, +e.target.value)}
                  className="w-12 h-1 accent-indigo-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
