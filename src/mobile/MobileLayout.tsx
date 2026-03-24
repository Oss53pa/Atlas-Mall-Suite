// ═══ MOBILE LAYOUT ═══

import React, { useState, useEffect } from 'react'
import { Map, Shield, Route, Settings, ChevronUp, Maximize2, X } from 'lucide-react'

interface MobileLayoutProps {
  children: React.ReactNode; activeTab: string; onTabChange: (tab: string) => void
  projectName: string; floorLabel: string; onFloorChange: () => void
  toolbar?: React.ReactNode; propertiesPanel?: React.ReactNode
  isTerrainMode?: boolean; onToggleTerrainMode?: () => void
}

export default function MobileLayout({ children, activeTab, onTabChange, projectName, floorLabel, onFloorChange, toolbar, propertiesPanel, isTerrainMode = false, onToggleTerrainMode }: MobileLayoutProps) {
  const [showProps, setShowProps] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check(); window.addEventListener('resize', check); return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) return <>{children}</>

  const tabs = [
    { id: 'plan', label: 'Plan', icon: Map }, { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'parcours', label: 'Parcours', icon: Route }, { id: 'settings', label: 'Options', icon: Settings },
  ]

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-900">
      {!isTerrainMode && (
        <header className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-sm font-medium text-white truncate">{projectName}</span>
          <div className="flex items-center gap-2">
            <button onClick={onFloorChange} className="px-2 py-1 text-xs bg-slate-700 rounded text-slate-300">{floorLabel}</button>
            {onToggleTerrainMode && <button onClick={onToggleTerrainMode} className="p-1.5 bg-amber-600 rounded text-white"><Maximize2 size={16} /></button>}
          </div>
        </header>
      )}
      {isTerrainMode && <button onClick={onToggleTerrainMode} className="absolute top-3 right-3 z-50 p-2 bg-slate-800/80 rounded-full text-white"><X size={20} /></button>}
      <div className="flex-1 relative overflow-hidden">
        {children}
        {toolbar && !isTerrainMode && <div className="absolute top-3 left-3 flex flex-col gap-1 bg-slate-800/90 rounded-lg p-1 shadow-xl">{toolbar}</div>}
      </div>
      {propertiesPanel && (
        <div className={`absolute bottom-16 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-2xl shadow-2xl transition-transform duration-300 ${showProps ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '50vh' }}>
          <button onClick={() => setShowProps(!showProps)} className="w-full flex justify-center py-2"><div className="w-10 h-1 rounded bg-slate-600" /></button>
          <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(50vh - 40px)' }}>{propertiesPanel}</div>
        </div>
      )}
      {propertiesPanel && !showProps && <button onClick={() => setShowProps(true)} className="absolute bottom-20 right-4 p-3 bg-blue-600 rounded-full shadow-lg text-white"><ChevronUp size={20} /></button>}
      {!isTerrainMode && (
        <nav className="flex items-center justify-around bg-slate-800 border-t border-slate-700 py-1 px-2">
          {tabs.map(tab => { const Icon = tab.icon; const active = activeTab === tab.id; return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[60px] ${active ? 'text-blue-400 bg-slate-700/50' : 'text-slate-400'}`}>
              <Icon size={20} /><span className="text-[10px]">{tab.label}</span>
            </button>
          )})}
        </nav>
      )}
    </div>
  )
}
