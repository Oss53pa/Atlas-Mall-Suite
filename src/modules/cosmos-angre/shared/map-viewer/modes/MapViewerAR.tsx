// ═══ MAP VIEWER AR — Full AR mode shell ═══
//
// State machine:
//   setup   → user sees QR code + "Enter AR" button
//   active  → Three.js WebXR canvas + HUD overlay (floor info, placement state)
//   ended   → session finished, back to setup with "Recommencer" button
//
// The ARRenderer (Three.js canvas) is lazy-loaded to avoid bundling Three.js
// for users who never enter AR.

import { lazy, Suspense, useRef, useState, useEffect } from 'react'
import { useMapViewerStore }           from '../stores/mapViewerStore'
import { useEditableSpaceStore }        from '../../stores/editableSpaceStore'
import { FLOOR_LEVEL_META }            from '../../proph3t/libraries/spaceTypeLibrary'
import { useARSession }                from '../ar/useARSession'
import ARQRCodeAnchor                  from '../ar/ARQRCodeAnchor'

const ARRenderer = lazy(() => import('../../view3d/modes/ARRenderer'))

// ── AR HUD overlay ────────────────────────────────────────────────────────

interface ARHudProps {
  floorLabel: string
  placed: boolean
  onReset: () => void
  onExit: () => void
}

function ARHud({ floorLabel, placed, onReset, onExit }: ARHudProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-safe-top pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-white text-xs font-semibold">AR · {floorLabel}</span>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs backdrop-blur"
        >
          ✕ Quitter
        </button>
      </div>

      {/* Placement hint */}
      {!placed && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white text-xs font-medium pointer-events-none">
          Pointez vers le sol et touchez pour placer le plan
        </div>
      )}

      {/* Bottom controls */}
      {placed && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-white/15 border border-white/20 text-white text-xs backdrop-blur"
          >
            ⟳ Repositionner
          </button>
        </div>
      )}

      {/* Placed indicator */}
      {placed && (
        <div className="absolute top-16 right-4 px-2.5 py-1 rounded-full bg-green-500/25 border border-green-500/40 text-green-300 text-[10px] font-medium">
          Plan ancré ✓
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

interface MapViewerARProps {
  className?: string
}

export default function MapViewerAR({ className = '' }: MapViewerARProps) {
  const activeFloor   = useMapViewerStore((s) => s.activeFloor)
  const setArSession  = useMapViewerStore((s) => s.setArSession)
  const setArAnchor   = useMapViewerStore((s) => s.setArAnchor)
  const allSpaces     = useEditableSpaceStore((s) => s.spaces)

  const { state, error, session, hitTestSource, enterAR, exitAR } = useARSession()

  const [placed, setPlaced]         = useState(false)
  const [resetSignal, setReset]     = useState(false)
  const domOverlayRef               = useRef<HTMLDivElement>(null)

  // Sync AR session active flag to store
  useEffect(() => {
    setArSession(state === 'active')
  }, [state, setArSession])

  useEffect(() => {
    setArAnchor(placed)
  }, [placed, setArAnchor])

  // Filter spaces to current floor
  const floorSpaces = allSpaces.filter((s) => s.floorLevel === activeFloor)
  const floorLabel  = FLOOR_LEVEL_META[activeFloor]?.label ?? activeFloor.toUpperCase()

  const anchorData = {
    buildingId: 'cosmos-angre',
    floorId: activeFloor,
    bearing: 0,
  }

  const handleReset = () => {
    setPlaced(false)
    setArAnchor(false)
    setReset((v) => !v)
  }

  const handleExit = async () => {
    await exitAR()
    setPlaced(false)
  }

  return (
    <div ref={domOverlayRef} className={`relative flex-1 overflow-hidden bg-[#060c18] ${className}`}>

      {/* ── Setup / ended screen ── */}
      {(state === 'checking' || state === 'idle' || state === 'ended' || state === 'error') && (
        <ARQRCodeAnchor
          anchor={anchorData}
          arSupported={state !== 'unsupported'}
          loading={state === 'checking'}
          error={error}
          onEnterAR={() => enterAR(domOverlayRef.current ?? undefined)}
        />
      )}

      {/* Unsupported */}
      {state === 'unsupported' && (
        <ARQRCodeAnchor
          anchor={anchorData}
          arSupported={false}
          onEnterAR={() => {}}
        />
      )}

      {/* Requesting state overlay */}
      {state === 'requesting' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[#060c18]">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Démarrage de la session AR…</p>
        </div>
      )}

      {/* ── Active AR session ── */}
      {state === 'active' && session && (
        <>
          {/* Three.js WebXR canvas */}
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          }>
            <ARRenderer
              session={session}
              hitTestSource={hitTestSource}
              spaces={floorSpaces}
              onPlacementChange={setPlaced}
              resetAnchor={resetSignal}
            />
          </Suspense>

          {/* HUD overlay (DOM, in XR dom-overlay) */}
          <ARHud
            floorLabel={floorLabel}
            placed={placed}
            onReset={handleReset}
            onExit={handleExit}
          />
        </>
      )}
    </div>
  )
}
