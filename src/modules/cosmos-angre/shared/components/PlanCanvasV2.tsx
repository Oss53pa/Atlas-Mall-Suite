// ═══ PLAN CANVAS V2 — Full vectorial SVG plan engine ═══
// Pure SVG rendering with cursor-centered zoom, space+drag pan,
// LOD, viewport culling, minimap, rulers, and space interaction.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DetectedSpace, ParsedPlan, ViewportState, PlanTool } from '../planReader/planEngineTypes'
import {
  fitToScreen, zoomAtPoint, screenToWorld, computeLOD,
} from '../planReader/coordinateEngine'
import { usePlanEngineStore } from '../stores/planEngineStore'
import { PlanEntitiesRenderer } from './PlanEntitiesRenderer'
import { SpaceOverlay } from './SpaceOverlay'
import { SpaceEditPanel } from './SpaceEditPanel'
import { PlanMinimap } from './PlanMinimap'
import { PlanToolbar } from './PlanToolbar'
import { DxfViewerCanvas } from './DxfViewerCanvas'
import { ObjectLibraryPanel } from './ObjectLibraryPanel'
import { PlanSelector } from './PlanSelector'
import { Proph3tImportModal } from '../proph3t/components/Proph3tImportModal'

// Mount inline pour piloter la modal depuis le store.
// Le composant utilise createPortal donc il rend HORS du DOM tree de PlanCanvasV2,
// ce qui évite tout conflit de stacking context / pointer-events.
function Proph3tImportModalMount({ plan }: { plan: ParsedPlan }) {
  const open = usePlanEngineStore(s => s.proph3tModalOpen)
  const close = usePlanEngineStore(s => s.closeProph3tModal)
  const buildSecurityInput = useCallback(() => {
    if (!plan) return null
    return {
      planWidth: plan.bounds.width || 200,
      planHeight: plan.bounds.height || 140,
      spaces: (plan.spaces ?? []).map(s => ({
        id: s.id, type: s.type as string | undefined, areaSqm: s.areaSqm,
        polygon: s.polygon as [number, number][], floorId: s.floorId,
        label: s.label,
      })),
      cameras: [],
      doors: [],
      floors: (plan.detectedFloors ?? [{ id: 'RDC', label: 'RDC', bounds: { width: plan.bounds.width, height: plan.bounds.height } }]).map(f => ({
        id: f.id, label: f.label, bounds: { width: f.bounds.width, height: f.bounds.height },
      })),
    }
  }, [plan])
  const buildParcoursInput = useCallback(() => {
    if (!plan) return null
    return {
      planWidth: plan.bounds.width || 200,
      planHeight: plan.bounds.height || 140,
      spaces: (plan.spaces ?? []).map(s => ({
        id: s.id, label: s.label, type: s.type as string | undefined,
        areaSqm: s.areaSqm, polygon: s.polygon as [number, number][], floorId: s.floorId,
      })),
      pois: [],
    }
  }, [plan])
  const buildCommercialInput = useCallback(async () => {
    const mod = await import('../stores/lotsStore')
    const lots = mod.useLotsStore.getState().all()
    return { lots, horizonMonths: 12 }
  }, [])

  // Capture screenshot : utilise html2canvas si dispo, sinon dxf-viewer canvas
  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    try {
      // Essaie de capturer le canvas DXF/3D le plus visible
      const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[]
      const visibleCanvas = canvases.find(c => {
        const r = c.getBoundingClientRect()
        return r.width > 100 && r.height > 100 && c.offsetParent !== null
      })
      if (visibleCanvas) {
        try { return visibleCanvas.toDataURL('image/png') }
        catch { /* tainted canvas — fallback sur html2canvas */ }
      }
      // Fallback : html2canvas
      const h2c = (await import('html2canvas')).default
      // Cherche le wrapper principal du plan
      const target = document.querySelector('.relative.w-full.h-full.flex.overflow-hidden') as HTMLElement
        ?? document.body
      const canvas = await h2c(target, { useCORS: true, logging: false, scale: 1 })
      return canvas.toDataURL('image/png')
    } catch (err) {
      console.warn('[Proph3tCapture] failed', err)
      return null
    }
  }, [])

  return (
    <Proph3tImportModal
      open={open}
      onClose={close}
      projectName="Cosmos Angré"
      orgName="Centre commercial · Abidjan"
      buildSecurityInput={buildSecurityInput}
      buildParcoursInput={buildParcoursInput}
      buildCommercialInput={buildCommercialInput as any}
      captureScreenshot={captureScreenshot}
    />
  )
}

interface Cam3D { id: string; floorId: string; label: string; x: number; y: number; angle: number; fov: number; rangeM: number; color: string; priority?: 'normale' | 'haute' | 'critique' }
interface Door3DP { id: string; floorId: string; label: string; x: number; y: number; isExit?: boolean; hasBadge?: boolean }
interface Blind3D { id: string; floorId: string; x: number; y: number; w: number; h: number; severity?: 'normal' | 'elevee' | 'critique' }
interface POI3DP { id: string; floorId: string; label: string; x: number; y: number; icon?: string; color: string }
interface Sig3D { id: string; floorId: string; ref: string; x: number; y: number; type: 'directionnel' | 'identifiant' | 'info' | 'reglementaire'; content?: string }
interface Mom3D { id: string; floorId: string; number: number; name: string; x: number; y: number }
interface Jour3D { id: string; floorId: string; points: Array<{ x: number; y: number }>; color?: string }

interface PlanCanvasV2Props {
  plan: ParsedPlan
  planImageUrl?: string
  children?: React.ReactNode
  className?: string
  onSpaceClick?: (space: DetectedSpace) => void
  onCanvasClick?: (x: number, y: number) => void
  viewMode?: '2d' | '3d' | '3d-advanced'
  /** Vol.2 Securitaire entities for 3D rendering */
  cameras?: Cam3D[]
  doors?: Door3DP[]
  blindSpots?: Blind3D[]
  /** Vol.3 Parcours Client entities */
  pois?: POI3DP[]
  signage?: Sig3D[]
  moments?: Mom3D[]
  journeys?: Jour3D[]
  /** 3D placement mode */
  placeMode?: 'camera' | 'door' | 'poi' | 'signage' | 'moment' | null
  onPlace?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', x: number, y: number, floorId?: string) => void
  onEntityUpdate?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', id: string, updates: Record<string, unknown>) => void
  onEntityDelete?: (kind: 'camera' | 'door' | 'poi' | 'signage' | 'moment', id: string) => void
  compliance?: {
    scorePct: number
    issues: Array<{ severity: 'info' | 'warning' | 'critical'; title: string }>
    summary: { info: number; warning: number; critical: number }
    floorStats?: Array<{ floorId: string; coveragePct: number; camerasCount: number; exitsCount: number }>
  }
}

export function PlanCanvasV2({
  plan, planImageUrl, children, className = '',
  onSpaceClick, onCanvasClick, viewMode = '2d',
  cameras, doors, blindSpots,
  pois, signage, moments, journeys,
  placeMode, onPlace, onEntityUpdate, onEntityDelete, compliance,
}: PlanCanvasV2Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 })

  // ── Store ──
  const viewport = usePlanEngineStore(s => s.viewport)
  const setViewport = usePlanEngineStore(s => s.setViewport)
  const activeTool = usePlanEngineStore(s => s.activeTool)
  const setTool = usePlanEngineStore(s => s.setTool)
  const selectedSpaceId = usePlanEngineStore(s => s.selectedSpaceId)
  const selectSpace = usePlanEngineStore(s => s.selectSpace)
  const spaceStates = usePlanEngineStore(s => s.spaceStates)
  const showGrid = usePlanEngineStore(s => s.showGrid)
  const showDimensions = usePlanEngineStore(s => s.showDimensions)
  const showLabels = usePlanEngineStore(s => s.showLabels)
  const showMinimap = usePlanEngineStore(s => s.showMinimap)
  const showZones = usePlanEngineStore(s => s.showZones)

  // ── Object library state ──
  const [objectLibraryOpen, setObjectLibraryOpen] = useState(false)
  const [objectLibrarySpaceId, setObjectLibrarySpaceId] = useState<string | null>(null)

  // ── Observe container size ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setContainerSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Auto-fit on plan change or container resize ──
  const lastFitRef = useRef('')
  useEffect(() => {
    if (plan.bounds.width <= 0 || plan.bounds.height <= 0) return
    if (containerSize.w <= 0 || containerSize.h <= 0) return
    // Avoid re-fitting when nothing changed
    const key = `${plan.bounds.width.toFixed(1)}_${plan.bounds.height.toFixed(1)}_${containerSize.w}_${containerSize.h}`
    if (lastFitRef.current === key) return
    lastFitRef.current = key
    const vp = fitToScreen(plan.bounds.width, plan.bounds.height, containerSize.w, containerSize.h, 60)
    setViewport(vp)
    console.log(`[PlanCanvasV2] fitToScreen: plan=${plan.bounds.width.toFixed(1)}x${plan.bounds.height.toFixed(1)}m, canvas=${containerSize.w}x${containerSize.h}px, scale=${vp.scale.toFixed(2)}`)
  }, [plan.bounds.width, plan.bounds.height, containerSize.w, containerSize.h]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Space bar tracking ──
  const isSpacePressed = useRef(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        isSpacePressed.current = true
        e.preventDefault()
      }
      // Ctrl+0 = fit to screen
      if (e.code === 'Digit0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const vp = fitToScreen(plan.bounds.width, plan.bounds.height, containerSize.w, containerSize.h)
        setViewport(vp)
      }
      // Escape = deselect
      if (e.code === 'Escape') {
        selectSpace(null)
        setObjectLibraryOpen(false)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressed.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [plan.bounds, containerSize]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ZOOM (cursor-centered, Figma formula) ──
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = svg.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom (trackpad) or Ctrl+scroll → zoom
        const delta = e.deltaY * 0.01
        setViewport(v => zoomAtPoint(v, cursorX, cursorY, delta))
      } else if (e.shiftKey) {
        // Shift+scroll → horizontal pan
        setViewport(v => ({ ...v, offsetX: v.offsetX - e.deltaY * 1.5 }))
      } else {
        // Regular scroll → zoom (vertical scroll = zoom in/out)
        const delta = e.deltaY * 0.003
        setViewport(v => zoomAtPoint(v, cursorX, cursorY, delta))
      }
    }
    svg.addEventListener('wheel', handler, { passive: false })
    return () => svg.removeEventListener('wheel', handler)
  }, [setViewport])

  // ── PAN (left-click drag, middle-click, space+drag, hand tool) ──
  const panState = useRef({ active: false, didMove: false, startX: 0, startY: 0, startOffX: 0, startOffY: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Always allow pan with left click (like Google Maps), middle click, Space, or hand tool
    const isPanMode =
      activeTool === 'hand' ||
      e.button === 1 ||
      e.button === 0 // Left click always starts a potential pan

    if (isPanMode) {
      e.preventDefault()
      panState.current = {
        active: true,
        didMove: false,
        startX: e.clientX,
        startY: e.clientY,
        startOffX: viewport.offsetX,
        startOffY: viewport.offsetY,
      }
    }
  }, [activeTool, viewport.offsetX, viewport.offsetY])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panState.current.active) return
    e.preventDefault()
    const dx = e.clientX - panState.current.startX
    const dy = e.clientY - panState.current.startY
    // Only start panning after 3px threshold (avoid accidental drags on click)
    if (!panState.current.didMove && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    panState.current.didMove = true
    setViewport(v => ({
      ...v,
      offsetX: panState.current.startOffX + dx,
      offsetY: panState.current.startOffY + dy,
    }))
  }, [setViewport])

  const handleMouseUp = useCallback(() => {
    panState.current.active = false
  }, [])

  // ── Canvas click → world coordinates ──
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Ignore clicks that were actually drag-pans
    if (panState.current.didMove) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY, viewport)
    onCanvasClick?.(world.x, world.y)
  }, [viewport, onCanvasClick])

  // ── Space click handler ──
  const handleSpaceClick = useCallback((space: DetectedSpace) => {
    selectSpace(space.id)
    onSpaceClick?.(space)
  }, [selectSpace, onSpaceClick])

  // ── LOD ──
  const lod = useMemo(() => computeLOD(viewport.scale), [viewport.scale])

  // ── Transform string ──
  const transform = `translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`

  // ── Cursor ──
  const cursor = panState.current.active && panState.current.didMove ? 'grabbing'
    : activeTool === 'hand' || isSpacePressed.current ? 'grab'
    : activeTool === 'select' ? 'grab'
    : activeTool === 'measure' ? 'crosshair'
    : activeTool === 'zoom-in' ? 'zoom-in'
    : activeTool === 'zoom-out' ? 'zoom-out'
    : 'grab'

  // ── Cursor world coordinates ──
  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 })
  const handleMouseMoveCoords = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e)
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport)
    setCursorWorld(world)
  }, [handleMouseMove, viewport])

  // ── Selected space object ──
  const selectedSpace = useMemo(
    () => plan.spaces.find(s => s.id === selectedSpaceId) ?? null,
    [plan.spaces, selectedSpaceId]
  )

  // ── Fit-to-screen callback for toolbar ──
  const handleFitScreen = useCallback(() => {
    const vp = fitToScreen(plan.bounds.width, plan.bounds.height, containerSize.w, containerSize.h)
    setViewport(vp)
  }, [plan.bounds, containerSize, setViewport])

  // ── DXF blob URL rehydration ──
  //    Dépend UNIQUEMENT de plan.dxfBlobUrl (string). Pas du `plan` reference
  //    qui change à chaque re-render parent (sinon : flicker permanent du viewer).
  //    On garde l'URL précédente pendant la rehydratation pour éviter un remount.
  const [rehydratedDxfUrl, setRehydratedDxfUrl] = useState<string | null>(null)
  const [rehydrateError, setRehydrateError] = useState<string | null>(null)
  const rehydratedForUrlRef = useRef<string | null>(null)
  useEffect(() => {
    const targetUrl = plan.dxfBlobUrl
    if (!targetUrl) { setRehydratedDxfUrl(null); rehydratedForUrlRef.current = null; return }
    // Si on a déjà rehydraté pour cette URL, ne rien faire (évite le remount)
    if (rehydratedForUrlRef.current === targetUrl && rehydratedDxfUrl) return

    let cancelled = false
    setRehydrateError(null)
    ;(async () => {
      try {
        // Trouve l'importId qui correspond à ce plan dans le store
        const parsedPlans = usePlanEngineStore.getState().parsedPlans
        let importId: string | null = null
        for (const [k, v] of Object.entries(parsedPlans)) {
          if (v?.dxfBlobUrl === targetUrl) { importId = k; break }
        }
        if (!importId) {
          // Pas d'importId trouvé → l'URL actuelle est-elle encore vivante ?
          try {
            const res = await fetch(targetUrl)
            if (!res.ok) throw new Error(`Blob dead: ${res.status}`)
            if (!cancelled) {
              rehydratedForUrlRef.current = targetUrl
              setRehydratedDxfUrl(targetUrl)
            }
          } catch {
            if (!cancelled) setRehydrateError('Fichier DXF introuvable — réimporter le plan')
          }
          return
        }
        const { getPlanFileUrl } = await import('../stores/planFileCache')
        const fresh = await getPlanFileUrl(importId)
        if (!cancelled) {
          if (fresh) {
            rehydratedForUrlRef.current = targetUrl
            setRehydratedDxfUrl(fresh)
          } else {
            setRehydrateError('Cache IndexedDB vide — réimporter le plan')
          }
        }
      } catch (err) {
        console.warn('[PlanCanvasV2] DXF rehydration failed', err)
        if (!cancelled) setRehydrateError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.dxfBlobUrl])

  // Memoize spaces mapping to prevent DxfViewerCanvas re-mount on each render
  const memoSpaces = useMemo(() => plan.spaces.map(s => ({
    id: s.id, label: s.label, type: s.type,
    bounds: s.bounds, areaSqm: s.areaSqm, color: s.color,
    floorId: s.floorId,
  })), [plan.spaces])

  // ── WebGL DXF viewer: use dxf-viewer library for full CAD rendering ──
  if (plan.dxfBlobUrl) {
    // Attend la rehydratation avant de rendre DxfViewerCanvas
    if (!rehydratedDxfUrl && !rehydrateError) {
      return (
        <div className={`relative w-full h-full flex items-center justify-center bg-gray-950 ${className}`}>
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
            Chargement du plan DXF depuis le cache…
          </div>
        </div>
      )
    }
    if (rehydrateError) {
      return (
        <div className={`relative w-full h-full flex items-center justify-center bg-gray-950 ${className}`}>
          <div className="text-red-400 text-sm max-w-md text-center">
            ⚠ {rehydrateError}
          </div>
        </div>
      )
    }
    return (
      <div className={`relative w-full h-full flex overflow-hidden bg-gray-950 ${className}`}>
        <DxfViewerCanvas
          dxfUrl={rehydratedDxfUrl!}
          planImageUrl={plan.planImageUrl}
          viewMode={viewMode}
          wallSegments={plan.wallSegments}
          spaces={memoSpaces}
          planBounds={plan.bounds}
          detectedFloors={plan.detectedFloors}
          dimensions={plan.dimensions}
          cameras={cameras}
          doors={doors}
          blindSpots={blindSpots}
          pois={pois}
          signage={signage}
          moments={moments}
          journeys={journeys}
          placeMode={placeMode}
          onPlace={onPlace}
          onEntityUpdate={onEntityUpdate}
          onEntityDelete={onEntityDelete}
          compliance={compliance}
          className="flex-1"
        />
        {/* Plan selector dropdown */}
        <PlanSelector />
        {/* PROPH3T modal auto-ouvert après import */}
        <Proph3tImportModalMount plan={plan} />
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full flex overflow-hidden bg-gray-950 ${className}`}>
      {/* Main canvas area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ cursor }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveCoords}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleSvgClick}
        >
          {/* Background */}
          <rect width="100%" height="100%" fill="#0a0a0f" />

          {/* Grid (drawn in screen space, before transform group) */}
          {showGrid && (
            <PlanGrid viewport={viewport} canvasW={containerSize.w} canvasH={containerSize.h} />
          )}

          {/* Transform group — all plan content */}
          <g transform={transform}>
            {/* Rendering: image (from import) if available, else vectorial entities */}
            {(() => {
              const imgUrl = planImageUrl || plan.planImageUrl
              if (imgUrl) {
                return (
                  <image
                    href={imgUrl}
                    x={0} y={0}
                    width={plan.bounds.width}
                    height={plan.bounds.height}
                    preserveAspectRatio="none"
                  />
                )
              }
              // Fallback: vectorial rendering
              return (
                <PlanEntitiesRenderer
                  entities={plan.entities}
                  layers={plan.layers}
                  lod={lod}
                  viewport={viewport}
                  canvasW={containerSize.w}
                  canvasH={containerSize.h}
                />
              )
            })()}

            {/* Space overlay (polygon zones) — toggleable */}
            {showZones && (
              <SpaceOverlay
                spaces={plan.spaces}
                spaceStates={spaceStates}
                selectedId={selectedSpaceId}
                onSpaceClick={handleSpaceClick}
                viewport={viewport}
                showLabels={showLabels}
              />
            )}

            {/* Custom overlays from parent */}
            {children}
          </g>
        </svg>

        {/* Plan selector dropdown */}
        <PlanSelector />

        {/* Floating toolbar */}
        <PlanToolbar
          activeTool={activeTool}
          onToolChange={setTool}
          onFitScreen={handleFitScreen}
          showGrid={showGrid}
          onToggleGrid={usePlanEngineStore.getState().toggleShowGrid}
          showDimensions={showDimensions}
          onToggleDimensions={usePlanEngineStore.getState().toggleShowDimensions}
          showLabels={showLabels}
          onToggleLabels={usePlanEngineStore.getState().toggleShowLabels}
          showZones={showZones}
          onToggleZones={usePlanEngineStore.getState().toggleShowZones}
        />

        {/* Minimap */}
        {showMinimap && (
          <PlanMinimap
            plan={plan}
            viewport={viewport}
            onViewportChange={setViewport}
            canvasW={containerSize.w}
            canvasH={containerSize.h}
          />
        )}

        {/* Layer panel toggle */}
        <LayerPanel
          layers={plan.layers}
          onToggle={usePlanEngineStore.getState().toggleLayerVisibility}
        />

        {/* Cursor coordinates bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-950/80 px-3 py-1 flex items-center gap-4 text-[10px] font-mono text-gray-400 z-10">
          <span>X: {cursorWorld.x.toFixed(2)} m</span>
          <span>Y: {cursorWorld.y.toFixed(2)} m</span>
          <span className="text-gray-600">|</span>
          <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
          <span className="text-gray-600">|</span>
          <span>Plan: {plan.bounds.width.toFixed(1)} x {plan.bounds.height.toFixed(1)} m</span>
          <span className="text-gray-600">|</span>
          <span>{plan.spaces.length} espaces</span>
          <span>{plan.entities.length} entites</span>
        </div>
      </div>

      {/* Right panel: space editor */}
      {selectedSpace && (
        <SpaceEditPanel
          space={selectedSpace}
          onClose={() => selectSpace(null)}
          onOpenObjectLibrary={(spaceId) => {
            setObjectLibrarySpaceId(spaceId)
            setObjectLibraryOpen(true)
          }}
        />
      )}

      {/* Object library modal */}
      {objectLibraryOpen && objectLibrarySpaceId && (
        <ObjectLibraryPanel
          spaceId={objectLibrarySpaceId}
          onClose={() => setObjectLibraryOpen(false)}
        />
      )}
    </div>
  )
}

// ─── GRID COMPONENT ──────────────────────────────────────

function PlanGrid({ viewport, canvasW, canvasH }: {
  viewport: ViewportState; canvasW: number; canvasH: number
}) {
  const lines = useMemo(() => {
    const result: React.ReactElement[] = []
    // Determine grid spacing in metres based on zoom level
    const baseSpacing = viewport.scale > 5 ? 1
      : viewport.scale > 1 ? 5
      : viewport.scale > 0.2 ? 10
      : viewport.scale > 0.05 ? 50
      : 100

    const spacing = baseSpacing
    const majorEvery = 5

    // World bounds visible on screen
    const worldMinX = -viewport.offsetX / viewport.scale
    const worldMinY = -viewport.offsetY / viewport.scale
    const worldMaxX = (canvasW - viewport.offsetX) / viewport.scale
    const worldMaxY = (canvasH - viewport.offsetY) / viewport.scale

    const startX = Math.floor(worldMinX / spacing) * spacing
    const startY = Math.floor(worldMinY / spacing) * spacing

    for (let x = startX; x <= worldMaxX; x += spacing) {
      const sx = x * viewport.scale + viewport.offsetX
      const isMajor = Math.round(x / spacing) % majorEvery === 0
      result.push(
        <line
          key={`vg-${x}`}
          x1={sx} y1={0} x2={sx} y2={canvasH}
          stroke={isMajor ? '#374151' : '#1f2937'}
          strokeWidth={isMajor ? 0.8 : 0.4}
        />
      )
    }

    for (let y = startY; y <= worldMaxY; y += spacing) {
      const sy = y * viewport.scale + viewport.offsetY
      const isMajor = Math.round(y / spacing) % majorEvery === 0
      result.push(
        <line
          key={`hg-${y}`}
          x1={0} y1={sy} x2={canvasW} y2={sy}
          stroke={isMajor ? '#374151' : '#1f2937'}
          strokeWidth={isMajor ? 0.8 : 0.4}
        />
      )
    }

    return result
  }, [viewport, canvasW, canvasH])

  return <g className="plan-grid">{lines}</g>
}

// ─── LAYER PANEL ─────────────────────────────────────

import type { PlanLayer } from '../planReader/planEngineTypes'

function LayerPanel({ layers, onToggle }: { layers: PlanLayer[]; onToggle: (name: string) => void }) {
  const [open, setOpen] = useState(false)

  if (layers.length === 0) return null

  const visible = layers.filter(l => l.visible).length
  const total = layers.length

  // Group layers by category
  const byCategory = new Map<string, PlanLayer[]>()
  for (const l of layers) {
    const cat = l.category || 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(l)
  }

  const CATEGORY_LABELS: Record<string, string> = {
    structure: 'Structure / Murs',
    partition: 'Cloisons / Portes',
    space: 'Espaces / Locaux',
    dimension: 'Cotations',
    text: 'Textes / Annotations',
    equipment: 'Equipements',
    hatch: 'Hachures',
    other: 'Autres',
  }

  return (
    <div className="absolute bottom-10 left-3 z-20">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/90 border border-white/[0.08] hover:bg-gray-700/90 text-[10px] text-gray-300 transition-colors"
      >
        <span style={{ fontSize: 14 }}>📋</span>
        Calques ({visible}/{total})
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-56 max-h-80 overflow-y-auto rounded-lg bg-gray-900 border border-white/[0.08] shadow-xl">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-medium">Calques DXF</span>
            <div className="flex gap-1">
              <button
                onClick={() => layers.forEach(l => { if (!l.visible) onToggle(l.name) })}
                className="text-[9px] text-blue-400 hover:text-blue-300 px-1"
              >Tout</button>
              <button
                onClick={() => layers.forEach(l => { if (l.visible) onToggle(l.name) })}
                className="text-[9px] text-gray-500 hover:text-gray-300 px-1"
              >Rien</button>
            </div>
          </div>
          {Array.from(byCategory.entries()).map(([cat, catLayers]) => (
            <div key={cat}>
              <div className="px-3 py-1 text-[8px] uppercase tracking-wider text-gray-600 bg-gray-950/50">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {catLayers.map(l => (
                <button
                  key={l.name}
                  onClick={() => onToggle(l.name)}
                  className={`w-full flex items-center gap-2 px-3 py-1 text-left text-[10px] transition-colors hover:bg-gray-800 ${
                    l.visible ? 'text-gray-200' : 'text-gray-600'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${
                    l.visible ? 'bg-blue-500 border-blue-400' : 'bg-transparent border-gray-600'
                  }`} />
                  <span className="truncate">{l.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
