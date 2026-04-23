// ═══ MAP VIEWER SHELL ═══
//
// Unified viewer with pill-style mode switcher: 2D · 3D · AR
// Cross-fades between modes using useViewTransition (150 ms ease).
// - 2D  → MapViewer2D   (Westfield-style read-only SVG plan)
// - 3D  → View3DSection (existing isometric / perspective / realistic)
// - AR  → MapViewerAR   (WebXR overlay, Phase 4 — placeholder shown until then)

import React, { lazy, Suspense, useRef, useState } from 'react'
import { Map, Box, Glasses, Layers, StickyNote, Car, Route } from 'lucide-react'
import { useMapViewerStore, type MapMode } from './stores/mapViewerStore'
import { useViewTransition }               from './transitions/useViewTransition'
import MapViewer2D                         from './modes/MapViewer2D'
import TourEditor, { type TourEditorRef }  from '../guided-tour/TourEditor'
import type { View3DData }                 from '../view3d/types/view3dTypes'

// Lazy-load heavy modules
const View3DSection = lazy(() => import('../view3d/View3DSection'))
const MapViewerAR   = lazy(() => import('./modes/MapViewerAR'))

// ── Types ─────────────────────────────────────────────────────────────────

interface MapViewerShellProps {
  /** Data required by the 3D engine. Optional — 3D tab hidden when absent. */
  view3dData?: View3DData
  /** Override container class */
  className?: string
}

// ── Mode button ────────────────────────────────────────────────────────────

interface ModeButtonProps {
  id: MapMode
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  disabled?: boolean
}

function ModeButton({ id: _id, label, icon, active, onClick, disabled }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Mode non disponible' : label}
      className={[
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all select-none',
        active
          ? 'bg-white text-[#0f172a] shadow'
          : disabled
            ? 'text-white/20 cursor-not-allowed'
            : 'text-white/55 hover:text-white hover:bg-white/10',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ── Toolbar strip (above mode switcher) ───────────────────────────────────

function ViewerToolbar({ showTours, onToggleTours }: { showTours: boolean; onToggleTours: () => void }) {
  const mode            = useMapViewerStore((s) => s.mode)
  const showAnnotations = useMapViewerStore((s) => s.showAnnotations)
  const showUtilities   = useMapViewerStore((s) => s.showUtilities)
  const showParking     = useMapViewerStore((s) => s.showParking)
  const toggle          = useMapViewerStore((s) => s.toggleAnnotations)
  const toggleUtil      = useMapViewerStore((s) => s.toggleUtilities)
  const togglePark      = useMapViewerStore((s) => s.toggleParking)

  if (mode !== '2d') return null   // 3D has its own toolbar

  return (
    <div className="absolute top-4 left-4 flex gap-2 z-20">
      <ToggleChip
        active={showAnnotations}
        label="Annotations"
        icon={<StickyNote size={12} />}
        onClick={toggle}
      />
      <ToggleChip
        active={showParking}
        label="Parking"
        icon={<Car size={12} />}
        onClick={togglePark}
      />
      <ToggleChip
        active={showUtilities}
        label="Techniques"
        icon={<Layers size={12} />}
        onClick={toggleUtil}
      />
      <ToggleChip
        active={showTours}
        label="Visites"
        icon={<Route size={12} />}
        onClick={onToggleTours}
      />
    </div>
  )
}

function ToggleChip({
  active, label, icon, onClick,
}: {
  active: boolean; label: string; icon: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
        active
          ? 'bg-[#1e293b]/90 border-white/20 text-white'
          : 'bg-[#1e293b]/60 border-white/10 text-white/40 hover:text-white/70',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Shell ──────────────────────────────────────────────────────────────────

export default function MapViewerShell({ view3dData, className = '' }: MapViewerShellProps) {
  const mode        = useMapViewerStore((s) => s.mode)
  const setMode     = useMapViewerStore((s) => s.setMode)
  const setTrans    = useMapViewerStore((s) => s.setTransitioning)
  const activeFloor = useMapViewerStore((s) => s.activeFloor)
  const { style, transition } = useViewTransition()

  const [showTours, setShowTours] = useState(false)
  const [addStepMode, setAddStepMode] = useState(false)
  const tourEditorRef = useRef<TourEditorRef>(null)

  const switchMode = (next: MapMode) => {
    if (next === mode) return
    setTrans(true)
    transition(() => {
      setMode(next)
      setTrans(false)
    })
  }

  const modes: { id: MapMode; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: '2d',  label: '2D',    icon: <Map     size={13} /> },
    { id: '3d',  label: '3D',    icon: <Box     size={13} />, disabled: !view3dData },
    { id: 'ar',  label: 'AR',    icon: <Glasses size={13} /> },
  ]

  return (
    <div className={`relative flex flex-col w-full h-full overflow-hidden bg-[#0f172a] ${className}`}>

      {/* Mode pill switcher — centered at top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-[#1e293b]/90 backdrop-blur rounded-full px-1.5 py-1 border border-white/10 shadow-xl z-30">
        {modes.map((m) => (
          <ModeButton
            key={m.id}
            id={m.id}
            label={m.label}
            icon={m.icon}
            active={mode === m.id}
            onClick={() => switchMode(m.id)}
            disabled={m.disabled}
          />
        ))}
      </div>

      {/* Per-mode toolbar chips (2D only) */}
      <ViewerToolbar showTours={showTours} onToggleTours={() => setShowTours((v) => !v)} />

      {/* Main content row */}
      <div className="flex-1 flex overflow-hidden" style={style}>
        {/* Viewer */}
        <div className="flex-1 relative overflow-hidden">
          {mode === '2d' && (
            <MapViewer2D
              onAddTourStep={
                addStepMode && tourEditorRef.current
                  ? (x, y) => tourEditorRef.current!.addStepAtPoint(x, y)
                  : undefined
              }
            />
          )}

          {mode === '3d' && view3dData && (
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                Chargement du moteur 3D…
              </div>
            }>
              <View3DSection data={view3dData} />
            </Suspense>
          )}

          {mode === '3d' && !view3dData && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/30">
              <Box size={48} strokeWidth={1.2} />
              <p className="text-sm">Aucune donnée 3D disponible</p>
              <p className="text-xs">Passez en mode 2D ou fournissez des données de zones.</p>
            </div>
          )}

          {mode === 'ar' && (
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
              Chargement du module AR…
            </div>
          }>
            <MapViewerAR />
          </Suspense>
        )}
        </div>

        {/* Tour editor side panel */}
        {showTours && mode === '2d' && (
          <div className="w-64 flex-shrink-0 border-l border-white/10 overflow-hidden">
            <TourEditor
              ref={tourEditorRef}
              pendingStepFloor={activeFloor}
              onAddStepMode={setAddStepMode}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
