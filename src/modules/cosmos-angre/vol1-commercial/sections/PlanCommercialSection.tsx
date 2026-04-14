// ═══ VOL.1 — Plan Interactif Commercial (F1.2) ═══
// Uses PlanCanvasV2 for full vectorial SVG rendering with zoom/pan/LOD,
// with Vol1-specific overlays (phase status, tenant info, commercial filters).

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { useVol1Store } from '../store/vol1Store'
import type { CommercialSpace, SpaceStatus } from '../store/vol1Types'
import { Grid3X3, Sparkles, Loader2, CalendarDays, Cuboid, Navigation, Map } from 'lucide-react'
import { getSpacePhaseStatus, computePhaseMetrics, PHASE_STATUS_COLORS } from '../engines/phasingEngine'
import { SPACE_STATUS_COLORS as statusColors, SPACE_STATUS_LABELS as statusLabels } from '../../shared/constants/statusConfig'
import { formatFcfa } from '../../shared/utils/formatting'
import { PlanLayerSelector } from '../../shared/components/PlanLayerSelector'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { PlanCanvasV2 } from '../../shared/components/PlanCanvasV2'
import type { ParsedPlan, ViewMode, DetectedSpace } from '../../shared/planReader/planEngineTypes'

const View3DSection = lazy(() => import('../../shared/view3d/View3DSection'))

// Empty plan placeholder when no import has been done yet
const EMPTY_PLAN: ParsedPlan = {
  entities: [],
  layers: [],
  spaces: [],
  bounds: { minX: 0, minY: 0, maxX: 200, maxY: 140, width: 200, height: 140, centerX: 100, centerY: 70 },
  unitScale: 1,
  detectedUnit: 'm',
  wallSegments: [],
}

export default function PlanCommercialSection() {
  const spaces = useVol1Store(s => s.spaces)
  const tenants = useVol1Store(s => s.tenants)
  const selectedSpaceId = useVol1Store(s => s.selectedSpaceId)
  const selectSpace = useVol1Store(s => s.selectSpace)
  const filterStatus = useVol1Store(s => s.filterStatus)
  const filterSector = useVol1Store(s => s.filterSector)
  const searchQuery = useVol1Store(s => s.searchQuery)
  const setFilterStatus = useVol1Store(s => s.setFilterStatus)
  const setSearch = useVol1Store(s => s.setSearch)

  const phases = useVol1Store(s => s.phases)
  const activePhaseId = useVol1Store(s => s.activePhaseId)
  const setActivePhase = useVol1Store(s => s.setActivePhase)
  const planImageUrls = useVol1Store(s => s.planImageUrls)

  // Plan engine store (vectorial plan data)
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const viewMode = usePlanEngineStore(s => s.viewMode)
  const setViewMode = usePlanEngineStore(s => s.setViewMode)

  const floors = ['B1', 'RDC', 'R+1']
  const [activeFloor, setActiveFloor] = useState('RDC')

  // Active plan from engine store or empty placeholder
  const plan = parsedPlan ?? EMPTY_PLAN

  // Plan image URL for current floor (background overlay)
  const floorId = activeFloor === 'B1' ? 'floor-b1' : activeFloor === 'R+1' ? 'floor-r1' : 'floor-rdc'
  const planImageUrl = planImageUrls[floorId]

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

  // Active phase object
  const activePhase = activePhaseId ? phases.find(p => p.id === activePhaseId) : null

  // Compute phase metrics when a phase is selected
  const phaseMetrics = useMemo(() => {
    if (!activePhase) return null
    return computePhaseMetrics(activePhase, spaces, tenants)
  }, [activePhase, spaces, tenants])

  // Resolve color for a space based on phase or current status
  const getSpaceColor = useCallback((sp: CommercialSpace): string => {
    if (!activePhase) return statusColors[sp.status]
    const phaseStatus = getSpacePhaseStatus(sp, activePhase)
    return PHASE_STATUS_COLORS[phaseStatus]
  }, [activePhase])

  // Phase status label for detail panel
  const getPhaseLabel = (sp: CommercialSpace): { label: string; color: string } | null => {
    if (!activePhase) return null
    const ps = getSpacePhaseStatus(sp, activePhase)
    return {
      label: ps === 'confirmed' ? 'Confirme' : ps === 'projected' ? 'Projete' : 'Vacant',
      color: PHASE_STATUS_COLORS[ps],
    }
  }

  // Handle space click from PlanCanvasV2
  const handleEngineSpaceClick = useCallback((space: DetectedSpace) => {
    // Try to find matching Vol1 space by ID or label
    const match = spaces.find(s => s.id === space.id || s.wing === space.label)
    if (match) selectSpace(match.id)
  }, [spaces, selectSpace])

  const is2d = viewMode === '2d'
  const is3d = viewMode === '3d' || viewMode === 'isometric' || viewMode === 'tour'

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
          {activePhase ? (
            <>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                <div className="w-3 h-3 rounded" style={{ background: PHASE_STATUS_COLORS.confirmed, opacity: 0.6 }} />
                Confirme
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                <div className="w-3 h-3 rounded" style={{ background: PHASE_STATUS_COLORS.projected, opacity: 0.6 }} />
                Projete
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                <div className="w-3 h-3 rounded" style={{ background: PHASE_STATUS_COLORS.vacant, opacity: 0.6 }} />
                Vacant
              </div>
            </>
          ) : (
            (Object.entries(statusLabels) as [SpaceStatus, string][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                <div className="w-3 h-3 rounded" style={{ background: statusColors[k], opacity: 0.6 }} />
                {v}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View mode toggle + phase switcher */}
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: '#1e2a3a', background: '#0b1120' }}>
          {/* View switcher: 2D / 3D / ISO / Visite */}
          <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '2d' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Plan interactif 2D (F1)"
            >
              <Grid3X3 className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === '3d' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Vue 3D perspective (F2)"
            >
              <Sparkles className="w-3 h-3" />
              3D
            </button>
            <button
              onClick={() => setViewMode('isometric')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'isometric' ? 'bg-cyan-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Vue isometrique (F3)"
            >
              <Cuboid className="w-3 h-3" />
              ISO
            </button>
            <button
              onClick={() => setViewMode('tour')}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'tour' ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Visite guidee first-person (F4)"
            >
              <Navigation className="w-3 h-3" />
              Visite
            </button>
          </div>
          <span className="text-[10px] text-slate-500">
            {viewMode === '2d' ? 'Plan interactif 2D — zoom molette, pan espace+drag'
              : viewMode === '3d' ? 'Vue 3D perspective libre'
              : viewMode === 'isometric' ? 'Vue isometrique'
              : 'Visite guidee first-person'}
          </span>

          {/* Plan layer selector */}
          {is2d && (
            <PlanLayerSelector
              floorId={floorId}
              onPrimaryPlanChange={(url) => {
                useVol1Store.setState(s => ({ planImageUrls: { ...s.planImageUrls, [floorId]: url } }))
              }}
            />
          )}

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

        {/* Phase metrics bar */}
        {activePhase && phaseMetrics && (
          <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ borderColor: '#1e2a3a', background: `${activePhase.color}08` }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: activePhase.color }} />
              <span className="text-[10px] font-semibold" style={{ color: activePhase.color }}>{activePhase.name}</span>
              <span className="text-[9px] text-gray-500 ml-1">— Objectif {activePhase.targetOccupancyRate}%</span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-4 text-[10px]">
              <div>
                <span className="text-gray-500">Occupancy : </span>
                <span className={`font-semibold ${phaseMetrics.occupancyRate >= activePhase.targetOccupancyRate ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {phaseMetrics.occupancyRate}%
                </span>
                <span className="text-gray-600"> ({phaseMetrics.occupiedSpaces}/{phaseMetrics.totalSpaces})</span>
              </div>
              <div>
                <span className="text-gray-500">GLA occupee : </span>
                <span className="text-white font-medium">{phaseMetrics.occupiedGla.toLocaleString('fr-FR')} m2</span>
                <span className="text-gray-600"> / {phaseMetrics.totalGla.toLocaleString('fr-FR')} m2</span>
              </div>
              <div>
                <span className="text-gray-500">Revenus : </span>
                <span className="text-white font-medium">{(phaseMetrics.revenueFcfa / 1000000).toFixed(1)} M FCFA</span>
              </div>
              {phaseMetrics.vacantCells.length > 0 && (
                <div>
                  <span className="text-red-400 font-medium">{phaseMetrics.vacantCells.length} vacante(s)</span>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div className="ml-auto flex items-center gap-2">
              <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${phaseMetrics.occupancyRate}%`,
                  background: phaseMetrics.occupancyRate >= activePhase.targetOccupancyRate ? '#22c55e' : activePhase.color,
                }} />
              </div>
              <span className="text-[9px] text-gray-500">{activePhase.date}</span>
            </div>
          </div>
        )}

        {/* Main content area */}
        {is3d ? (
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
          /* ═══ PlanCanvasV2 — Full vectorial SVG engine ═══ */
          /* When a real plan is imported (parsedPlan exists), PlanCanvasV2 renders
             the actual DWG entities + detected spaces via SpaceOverlay.
             When NO plan is imported, fall back to showing vol1Store mock spaces. */
          <PlanCanvasV2
            plan={plan}
            planImageUrl={planImageUrl}
            onSpaceClick={handleEngineSpaceClick}
          >
            {/* Only show vol1Store mock overlay when NO real plan has been imported */}
            {!parsedPlan && filteredSpaces.map(sp => {
              const t = tenants.find(t2 => t2.id === sp.tenantId)
              const color = getSpaceColor(sp)
              const isSelected = sp.id === selectedSpaceId

              // Mock spaces use pixel-like coords based on 200x140 default plan size
              const realW = plan.bounds.width || 200
              const realH = plan.bounds.height || 140
              const mx = (sp.x / 200) * realW
              const my = (sp.y / 140) * realH
              const mw = (sp.w / 200) * realW
              const mh = (sp.h / 140) * realH

              return (
                <g key={sp.id} onClick={() => selectSpace(sp.id)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={mx} y={my} width={mw} height={mh}
                    fill={`${color}20`}
                    stroke={isSelected ? '#ffffff' : color}
                    strokeWidth={0.3}
                    vectorEffect="non-scaling-stroke"
                    rx={0.5}
                  />
                  <text
                    x={mx + mw / 2} y={my + mh / 2 - 0.8}
                    textAnchor="middle" fill={color}
                    fontSize={1.2} fontWeight="bold" fontFamily="system-ui"
                    pointerEvents="none"
                  >
                    {t ? t.brandName : sp.reference}
                  </text>
                  <text
                    x={mx + mw / 2} y={my + mh / 2 + 0.8}
                    textAnchor="middle" fill="#4a5568"
                    fontSize={0.8} fontFamily="monospace"
                    pointerEvents="none"
                  >
                    {sp.areaSqm} m2
                  </text>
                </g>
              )
            })}
          </PlanCanvasV2>
        )}
      </div>

      {/* Right panel — selected space detail (Vol1-specific) */}
      {selectedSpace && (
        <div className="w-72 flex-shrink-0 border-l p-4 overflow-y-auto" style={{ borderColor: '#1e2a3a', background: '#0b1120' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-bold" style={{ color: statusColors[selectedSpace.status] }}>{selectedSpace.reference}</span>
            <button onClick={() => selectSpace(null)} className="text-slate-500 hover:text-white text-[12px]">X</button>
          </div>
          <div className="space-y-3 text-[12px]">
            <div className="flex justify-between"><span className="text-slate-500">Statut</span><span style={{ color: statusColors[selectedSpace.status] }}>{statusLabels[selectedSpace.status]}</span></div>
            {(() => {
              const pl = getPhaseLabel(selectedSpace)
              return pl ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phase</span>
                  <span className="font-medium" style={{ color: pl.color }}>{pl.label} — {activePhase!.name}</span>
                </div>
              ) : null
            })()}
            <div className="flex justify-between"><span className="text-slate-500">Surface</span><span className="text-white">{selectedSpace.areaSqm} m2</span></div>
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
                <div className="flex justify-between"><span className="text-slate-500">Loyer</span><span className="text-white">{formatFcfa(selectedTenant.baseRentFcfa)} F/m2/an</span></div>
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
