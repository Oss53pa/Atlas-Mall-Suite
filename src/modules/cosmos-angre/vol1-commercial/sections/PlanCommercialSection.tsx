// ═══ VOL.1 — Plan Interactif Commercial (F1.2) ═══

import React, { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { useVol1Store } from '../store/vol1Store'
import type { CommercialSpace, SpaceStatus, Sector } from '../store/vol1Types'
import { Grid3X3, Box, Sparkles, Loader2, CalendarDays } from 'lucide-react'
import { getSpacePhaseStatus, PHASE_STATUS_COLORS, type PhaseSpaceStatus } from '../engines/phasingEngine'

const View3DSection = lazy(() => import('../../shared/view3d/View3DSection'))

const statusColors: Record<SpaceStatus, string> = {
  occupied: '#22c55e',
  vacant: '#ef4444',
  reserved: '#f59e0b',
  under_works: '#6b7280',
}

const statusLabels: Record<SpaceStatus, string> = {
  occupied: 'Occupé',
  vacant: 'Vacant',
  reserved: 'Réservé',
  under_works: 'En travaux',
}

const SCALE = 4
const PADDING = 20

export default function PlanCommercialSection() {
  const spaces = useVol1Store(s => s.spaces)
  const tenants = useVol1Store(s => s.tenants)
  const selectedSpaceId = useVol1Store(s => s.selectedSpaceId)
  const selectSpace = useVol1Store(s => s.selectSpace)
  const filterSector = useVol1Store(s => s.filterSector)
  const filterStatus = useVol1Store(s => s.filterStatus)
  const searchQuery = useVol1Store(s => s.searchQuery)
  const setFilterSector = useVol1Store(s => s.setFilterSector)
  const setFilterStatus = useVol1Store(s => s.setFilterStatus)
  const setSearch = useVol1Store(s => s.setSearch)

  const phases = useVol1Store(s => s.phases)
  const activePhaseId = useVol1Store(s => s.activePhaseId)
  const setActivePhase = useVol1Store(s => s.setActivePhase)

  const floors = ['B1', 'RDC', 'R+1']
  const [activeFloor, setActiveFloor] = React.useState('RDC')
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')

  const filteredSpaces = useMemo(() => {
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
        return s.reference.toLowerCase().includes(q) || (t && (t.brandName.toLowerCase().includes(q) || t.companyName.toLowerCase().includes(q)))
      }
      return true
    })
  }, [spaces, tenants, activeFloor, filterStatus, filterSector, searchQuery])

  const selectedSpace = spaces.find(s => s.id === selectedSpaceId)
  const selectedTenant = selectedSpace?.tenantId ? tenants.find(t => t.id === selectedSpace.tenantId) : null

  const formatFcfa = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

  return (
    <div className="flex h-full" style={{ background: '#080c14' }}>
      {/* Left sidebar — filters */}
      <div className="w-56 flex-shrink-0 border-r p-4 space-y-4 overflow-y-auto" style={{ borderColor: '#1e2a3a', background: '#0b1120' }}>
        <p className="text-[11px] tracking-[0.2em] font-medium" style={{ color: '#f59e0b' }}>PLAN COMMERCIAL</p>

        {/* Floor tabs */}
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 mb-1">NIVEAU</p>
          {floors.map(f => (
            <button key={f} onClick={() => setActiveFloor(f)} className="w-full text-left text-[12px] px-3 py-1.5 rounded-md transition-colors" style={{ background: activeFloor === f ? 'rgba(245,158,11,0.1)' : 'transparent', color: activeFloor === f ? '#f59e0b' : '#4a5568', border: `1px solid ${activeFloor === f ? 'rgba(245,158,11,0.25)' : 'transparent'}` }}>
              {f}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 mb-1">STATUT</p>
          <button onClick={() => setFilterStatus('all')} className="w-full text-left text-[11px] px-2 py-1 rounded" style={{ color: filterStatus === 'all' ? '#f59e0b' : '#4a5568' }}>Tous</button>
          {(Object.entries(statusLabels) as [SpaceStatus, string][]).map(([k, v]) => (
            <button key={k} onClick={() => setFilterStatus(k)} className="w-full text-left text-[11px] px-2 py-1 rounded flex items-center gap-2" style={{ color: filterStatus === k ? statusColors[k] : '#4a5568' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: statusColors[k] }} />
              {v}
            </button>
          ))}
        </div>

        {/* Search */}
        <div>
          <p className="text-[10px] text-slate-500 mb-1">RECHERCHE</p>
          <input value={searchQuery} onChange={e => setSearch(e.target.value)} placeholder="Enseigne ou ref..." className="w-full text-[11px] bg-[#141e2e] text-white rounded px-2 py-1.5 border border-[#1e2a3a] outline-none placeholder:text-slate-600" />
        </div>

        {/* Legend */}
        <div>
          <p className="text-[10px] text-slate-500 mb-1">LEGENDE</p>
          {(Object.entries(statusLabels) as [SpaceStatus, string][]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
              <div className="w-3 h-3 rounded" style={{ background: statusColors[k], opacity: 0.6 }} />
              {v}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View mode toggle */}
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: '#1e2a3a', background: '#0b1120' }}>
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '2d' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '3d' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Vue 3D : Isométrique, Perspective, Semi-réaliste"
            >
              <Sparkles className="w-3 h-3" />
              3D
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            {viewMode === '2d' ? 'Plan interactif 2D' : 'Vue 3D isometrique · perspective · realiste'}
          </span>

          {/* Phase switcher */}
          <div className="ml-auto flex items-center gap-1">
            <CalendarDays size={12} className="text-slate-600" />
            <button
              onClick={() => setActivePhase(null)}
              className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                activePhaseId === null ? 'bg-gray-700 text-white' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              Actuel
            </button>
            {phases.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                  activePhaseId === p.id ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                }`}
                style={activePhaseId === p.id ? { background: `${p.color}30`, color: p.color } : undefined}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {viewMode === '3d' ? (
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center" style={{ background: '#080c14' }}>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement Vue 3D...
              </div>
            </div>
          }>
            <View3DSection data={{
              sourceVolume: 'vol1',
              floors: [
                { id: 'floor-b1', level: 'B1' as any, order: 0, widthM: 180, heightM: 120, zones: [], transitions: [] },
                { id: 'floor-rdc', level: 'RDC' as any, order: 1, widthM: 200, heightM: 140, zones: [], transitions: [] },
                { id: 'floor-r1', level: 'R+1' as any, order: 2, widthM: 200, heightM: 140, zones: [], transitions: [] },
              ],
              zones: [],
              transitions: [],
              tenants: spaces.map(s => ({
                spaceId: s.id,
                brandName: tenants.find(t => t.id === s.tenantId)?.brandName ?? '',
                sector: tenants.find(t => t.id === s.tenantId)?.sector ?? '',
                status: s.status,
                surfaceM2: s.areaSqm ?? 0,
              })),
            }} />
          </Suspense>
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <svg width={800} height={500} className="mx-auto" style={{ background: '#0a0f1a', borderRadius: 12, border: '1px solid #1e2a3a' }}>
              {/* Grid lines */}
              {Array.from({ length: 20 }).map((_, i) => (
                <React.Fragment key={i}>
                  <line x1={i * 40} y1={0} x2={i * 40} y2={500} stroke="#1e2a3a" strokeWidth={0.5} />
                  <line x1={0} y1={i * 25} x2={800} y2={i * 25} stroke="#1e2a3a" strokeWidth={0.5} />
                </React.Fragment>
              ))}

              {/* Spaces */}
              {filteredSpaces.map(sp => {
                const t = tenants.find(t2 => t2.id === sp.tenantId)
                const color = statusColors[sp.status]
                const isSelected = sp.id === selectedSpaceId
                return (
                  <g key={sp.id} onClick={() => selectSpace(sp.id)} style={{ cursor: 'pointer' }}>
                    <rect
                      x={sp.x * SCALE + PADDING} y={sp.y * SCALE + PADDING}
                      width={sp.w * SCALE} height={sp.h * SCALE}
                      fill={`${color}20`} stroke={isSelected ? '#ffffff' : color}
                      strokeWidth={isSelected ? 2 : 1} rx={4}
                    />
                    <text
                      x={sp.x * SCALE + PADDING + (sp.w * SCALE) / 2}
                      y={sp.y * SCALE + PADDING + (sp.h * SCALE) / 2 - 6}
                      textAnchor="middle" fill={color} fontSize={10} fontWeight="bold"
                    >
                      {t ? t.brandName : sp.reference}
                    </text>
                    <text
                      x={sp.x * SCALE + PADDING + (sp.w * SCALE) / 2}
                      y={sp.y * SCALE + PADDING + (sp.h * SCALE) / 2 + 8}
                      textAnchor="middle" fill="#4a5568" fontSize={8}
                    >
                      {sp.areaSqm} m²
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Right panel — selected space detail */}
      {selectedSpace && (
        <div className="w-72 flex-shrink-0 border-l p-4 overflow-y-auto" style={{ borderColor: '#1e2a3a', background: '#0b1120' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold" style={{ color: statusColors[selectedSpace.status] }}>{selectedSpace.reference}</span>
            <button onClick={() => selectSpace(null)} className="text-slate-500 hover:text-white text-[12px]">✕</button>
          </div>
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-500">Statut</span><span style={{ color: statusColors[selectedSpace.status] }}>{statusLabels[selectedSpace.status]}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Surface</span><span className="text-white">{selectedSpace.areaSqm} m²</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Aile</span><span className="text-white">{selectedSpace.wing}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Niveau</span><span className="text-white">{selectedSpace.floorLevel}</span></div>

            {selectedTenant && (
              <>
                <div className="border-t pt-3 mt-3" style={{ borderColor: '#1e2a3a' }}>
                  <p className="text-[10px] text-slate-500 mb-2">PRENEUR</p>
                  <p className="text-white font-semibold">{selectedTenant.brandName}</p>
                  <p className="text-slate-400 text-[11px]">{selectedTenant.companyName}</p>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Secteur</span><span className="text-white capitalize">{selectedTenant.sector}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Loyer</span><span className="text-white">{formatFcfa(selectedTenant.baseRentFcfa)} F/m²/an</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Loyer total</span><span style={{ color: '#f59e0b' }}>{formatFcfa(selectedTenant.baseRentFcfa * selectedSpace.areaSqm)} F/an</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Bail</span><span className="text-white">{selectedTenant.leaseStart} → {selectedTenant.leaseEnd}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Contact</span><span className="text-white">{selectedTenant.contact.name}</span></div>
              </>
            )}

            {!selectedTenant && selectedSpace.status === 'vacant' && (
              <div className="rounded-lg p-3 mt-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="text-[11px] font-medium" style={{ color: '#ef4444' }}>Cellule vacante</p>
                <p className="text-[10px] text-slate-400 mt-1">Utilisez Proph3t pour obtenir des recommandations d'enseigne pour cette cellule.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
