// ═══ PLAN SELECTOR — Dropdown to switch between imported plans ═══

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, FileCode2, FileText, Image, Layers, Map } from 'lucide-react'
import { usePlanImportStore } from '../stores/planImportStore'
import { usePlanEngineStore } from '../stores/planEngineStore'
import type { PlanSourceType } from '../planReader/planReaderTypes'

const FORMAT_ICON: Record<PlanSourceType, typeof FileCode2> = {
  dxf: FileCode2,
  dwg: FileCode2,
  ifc: Layers,
  pdf: FileText,
  image_raster: Image,
  svg: FileCode2,
}

const FORMAT_COLOR: Record<PlanSourceType, string> = {
  dxf: '#38bdf8',
  dwg: '#6366f1',
  ifc: '#22c55e',
  pdf: '#ef4444',
  image_raster: '#f59e0b',
  svg: '#8b5cf6',
}

export function PlanSelector() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const imports = usePlanImportStore(s => s.imports)
  const parsedPlans = usePlanEngineStore(s => s.parsedPlans)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const loadParsedPlan = usePlanEngineStore(s => s.loadParsedPlan)

  // Only show successful imports that have a parsedPlan stored
  const available = imports.filter(r => r.status === 'success' && parsedPlans[r.id])

  // Find which import is currently active
  const activeImport = available.find(r => {
    const plan = parsedPlans[r.id]
    return plan && plan === parsedPlan
  })

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (available.length === 0) {
    return (
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 text-gray-500 text-[10px]">
          <Map size={12} />
          Aucun plan
        </div>
      </div>
    )
  }

  const handleSelect = (importId: string) => {
    loadParsedPlan(importId)
    setOpen(false)
  }

  const Icon = activeImport ? FORMAT_ICON[activeImport.sourceType] : Map
  const color = activeImport ? FORMAT_COLOR[activeImport.sourceType] : '#64748b'

  return (
    <div ref={ref} className="absolute top-3 left-3 z-20">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/90 border border-white/[0.08] hover:bg-gray-700/90 transition-colors text-[11px] max-w-[220px]"
      >
        <Icon size={13} style={{ color, flexShrink: 0 }} />
        <span className="text-white truncate font-medium">
          {activeImport ? activeImport.fileName : 'Selectionner un plan'}
        </span>
        {available.length > 1 && (
          <span className="text-[9px] text-gray-500 flex-shrink-0">{available.length}</span>
        )}
        <ChevronDown size={12} className={`text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="mt-1 w-64 rounded-lg bg-gray-900 border border-white/[0.08] shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Plans importes</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {available.map(record => {
              const RIcon = FORMAT_ICON[record.sourceType]
              const rColor = FORMAT_COLOR[record.sourceType]
              const isActive = record === activeImport
              return (
                <button
                  key={record.id}
                  onClick={() => handleSelect(record.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'bg-blue-600/15 border-l-2 border-blue-500'
                      : 'hover:bg-gray-800 border-l-2 border-transparent'
                  }`}
                >
                  <RIcon size={14} style={{ color: rColor }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isActive ? 'text-white font-semibold' : 'text-gray-300'}`}>
                      {record.fileName}
                    </p>
                    <p className="text-[9px] text-gray-600">
                      {record.floorLevel} — {record.zonesDetected} zones
                    </p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: `${rColor}12`, color: rColor }}>
                    {record.sourceType.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
