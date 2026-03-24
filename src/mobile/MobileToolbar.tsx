// ═══ MOBILE TOOLBAR ═══

import React from 'react'
import { MousePointer2, Camera, DoorOpen, MapPin, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface Props { activeTool: string; onToolChange: (t: string) => void; onZoomIn: () => void; onZoomOut: () => void; onResetView: () => void }

export default function MobileToolbar({ activeTool, onToolChange, onZoomIn, onZoomOut, onResetView }: Props) {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Sélection' }, { id: 'camera', icon: Camera, label: 'Caméra' },
    { id: 'door', icon: DoorOpen, label: 'Porte' }, { id: 'poi', icon: MapPin, label: 'POI' },
    { id: 'pan', icon: Move, label: 'Pan' },
  ]
  const btn = (onClick: () => void, Icon: React.ElementType, active = false) => (
    <button onClick={onClick} className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}><Icon size={20} /></button>
  )
  return (
    <div className="flex flex-col gap-1">
      {tools.map(t => <div key={t.id}>{btn(() => onToolChange(t.id), t.icon, activeTool === t.id)}</div>)}
      <div className="w-8 mx-auto border-t border-slate-600 my-1" />
      {btn(onZoomIn, ZoomIn)}{btn(onZoomOut, ZoomOut)}{btn(onResetView, RotateCcw)}
    </div>
  )
}
