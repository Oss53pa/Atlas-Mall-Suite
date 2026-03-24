// ═══ VOL.1 — Plan Interactif Commercial (F1.2) ═══

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useVol1Store } from '../store/vol1Store'
import type { CommercialSpace, SpaceStatus, Sector } from '../store/vol1Types'

const STATUS_COLORS: Record<SpaceStatus, string> = {
  occupied: '#22c55e',
  vacant: '#ef4444',
  reserved: '#f59e0b',
  under_works: '#6b7280',
}

const STATUS_LABELS: Record<SpaceStatus, string> = {
  occupied: 'Occupe', vacant: 'Vacant', reserved: 'Reserve', under_works: 'En travaux',
}

const CANVAS_W = 220
const CANVAS_H = 100

export default function PlanCommercial() {
  const spaces = useVol1Store(s => s.spaces)
  const tenants = useVol1Store(s => s.tenants)
  const filterSector = useVol1Store(s => s.filterSector)
  const filterStatus = useVol1Store(s => s.filterStatus)
  const searchQuery = useVol1Store(s => s.searchQuery)
  const selectedSpaceId = useVol1Store(s => s.selectedSpaceId)
  const selectSpace = useVol1Store(s => s.selectSpace)
  const setSearch = useVol1Store(s => s.setSearch)
  const setFilterSector = useVol1Store(s => s.setFilterSector)
  const setFilterStatus = useVol1Store(s => s.setFilterStatus)

  const [activeFloor, setActiveFloor] = useState<string>('RDC')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const floorSpaces = useMemo(() => {
    return spaces.filter(s => {
      if (s.floorLevel !== activeFloor) return false
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (filterSector !== 'all') {
        const t = tenants.find(t2 => t2.id === s.tenantId)
        if (!t || t.sector !== filterSector) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const t = tenants.find(t2 => t2.id === s.tenantId)
        if (!s.reference.toLowerCase().includes(q) && !(t && t.brandName.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [spaces, tenants, activeFloor, filterStatus, filterSector, searchQuery])

  const getTenantLabel = useCallback((space: CommercialSpace) => {
    if (!space.tenantId) return space.reference
    const t = tenants.find(t2 => t2.id === space.tenantId)
    return t ? t.brandName : space.reference
  }, [tenants])

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId)
  const selectedTenant = selectedSpace?.tenantId ? tenants.find(t => t.id === selectedSpace.tenantId) : null

  const floors = ['B1', 'RDC', 'R+1']

  const resetView = () => { setZoom(1); setPanX(0); setPanY(0) }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-4">
      <div>
        <p className="text-[11px] tracking-[0.2em] font-medium mb-2" style={{ color: '#f59e0b' }}>VOL. 1 — PLAN COMMERCIAL</p>
        <h1 className="text-[28px] font-light text-white mb-2">Plan Interactif</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Floor switcher */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #1e2a3a' }}>
          {floors.map(f => (
            <button key={f} onClick={() => setActiveFloor(f)} className="px-3 py-1.5 text-[11px] font-medium transition-all" style={{ background: activeFloor === f ? '#f59e0b20' : '#141e2e', color: activeFloor === f ? '#f59e0b' : '#4a5568', borderRight: f !== 'R+1' ? '1px solid #1e2a3a' : 'none' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px] rounded-lg px-3 py-1.5" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
          <Search size={12} className="text-slate-500" />
          <input value={searchQuery} onChange={(e) => setSearch(e.target.value)} placeholder="Enseigne ou ref cellule..." className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-slate-600" />
        </div>

        {/* Status filter */}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as SpaceStatus | 'all')} className="text-[11px] bg-[#141e2e] text-slate-300 border border-[#1e2a3a] rounded px-2 py-1.5 outline-none">
          <option value="all">Tous statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}><ZoomIn size={14} className="text-slate-400" /></button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1.5 rounded" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}><ZoomOut size={14} className="text-slate-400" /></button>
          <button onClick={resetView} className="p-1.5 rounded" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}><RotateCcw size={14} className="text-slate-400" /></button>
          <span className="text-[10px] text-slate-500 ml-1">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        {Object.entries(STATUS_COLORS).map(([k, color]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: color }} />
            <span className="text-slate-400">{STATUS_LABELS[k as SpaceStatus]}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Canvas */}
        <div className="flex-1 rounded-xl overflow-hidden" style={{ background: '#0a0e18', border: '1px solid #1e2a3a' }}>
          <svg
            ref={svgRef}
            viewBox={`${-panX} ${-panY} ${CANVAS_W / zoom} ${CANVAS_H / zoom}`}
            className="w-full"
            style={{ minHeight: 400 }}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e2a3a" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#grid)" />

            {/* Spaces */}
            {floorSpaces.map((space) => {
              const color = STATUS_COLORS[space.status]
              const isSelected = space.id === selectedSpaceId
              return (
                <g key={space.id} onClick={() => selectSpace(space.id)} className="cursor-pointer">
                  <rect
                    x={space.x} y={space.y} width={space.w} height={space.h}
                    fill={`${color}25`} stroke={isSelected ? '#ffffff' : color} strokeWidth={isSelected ? 1.5 : 0.5}
                    rx={1}
                  />
                  <text x={space.x + space.w / 2} y={space.y + space.h / 2 - 2} textAnchor="middle" fill="#e2e8f0" fontSize={Math.min(3.5, space.w / 5)} fontWeight={600}>
                    {getTenantLabel(space)}
                  </text>
                  <text x={space.x + space.w / 2} y={space.y + space.h / 2 + 4} textAnchor="middle" fill="#64748b" fontSize={2.2}>
                    {space.areaSqm} m²
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Detail panel */}
        {selectedSpace && (
          <div className="w-72 rounded-xl p-4 flex-shrink-0" style={{ background: '#141e2e', border: '1px solid #1e2a3a' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono font-bold" style={{ color: STATUS_COLORS[selectedSpace.status] }}>{selectedSpace.reference}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLORS[selectedSpace.status]}15`, color: STATUS_COLORS[selectedSpace.status] }}>{STATUS_LABELS[selectedSpace.status]}</span>
            </div>
            <div className="space-y-2 text-[12px] text-slate-300">
              <p>Surface : <strong>{selectedSpace.areaSqm} m²</strong></p>
              <p>Aile : {selectedSpace.wing}</p>
              <p>Niveau : {selectedSpace.floorLevel}</p>
            </div>
            {selectedTenant && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid #1e2a3a' }}>
                <p className="text-[11px] font-medium text-slate-500 mb-2">PRENEUR</p>
                <p className="text-white font-semibold text-[14px]">{selectedTenant.brandName}</p>
                <p className="text-[11px]" style={{ color: '#4a5568' }}>{selectedTenant.companyName}</p>
                <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                  <p>Secteur : {selectedTenant.sector}</p>
                  <p>Bail : {selectedTenant.leaseStart} → {selectedTenant.leaseEnd}</p>
                  <p>Loyer : {new Intl.NumberFormat('fr-FR').format(selectedTenant.baseRentFcfa)} FCFA/m²/an</p>
                  <p className="font-medium" style={{ color: '#f59e0b' }}>Total annuel : {new Intl.NumberFormat('fr-FR').format(selectedTenant.baseRentFcfa * selectedSpace.areaSqm)} FCFA</p>
                </div>
              </div>
            )}
            {!selectedTenant && selectedSpace.status === 'vacant' && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>Cellule vacante</p>
                <p className="text-[10px] text-slate-500 mt-1">Utilisez l'IA Proph3t pour obtenir une recommandation d'enseigne ideale pour cette cellule.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
