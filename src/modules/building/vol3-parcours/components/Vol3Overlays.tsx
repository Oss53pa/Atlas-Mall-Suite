// F-004 : 5 composants overlay + helper downloadBlob extraits de Vol3Module.tsx.
// Wrappers ResizeObserver qui scalent les coordonnees monde → pixels canvas.
// Aucun changement de comportement.

import React from 'react'
import { DetailedJourneysOverlay } from '../../shared/components/DetailedJourneysOverlay'
import { SpaceInfoOverlay } from '../../shared/components/SpaceInfoOverlay'
import { FlowPathsOverlay } from '../../shared/components/FlowPathsOverlay'
import { AbmHeatmapOverlay } from '../../shared/components/AbmHeatmapOverlay'
import { Proph3tVolumePanel } from '../../shared/proph3t/components/Proph3tVolumePanel'
import { SignageImplementer } from '../../shared/proph3t/components/SignageImplementer'
import { useEditableSpaceStore } from '../../shared/stores/editableSpaceStore'
import { polyArea } from '../../shared/engines/plan-analysis/spaceGeometryEngine'
import type { DetailedJourney } from '../../shared/engines/plan-analysis/detailedJourneyEngine'
import type { FlowAnalysisResult } from '../../shared/engines/plan-analysis/flowPathEngine'

/** Hook partage : suit la taille du parent via ResizeObserver + fournit un
 *  `worldToScreen` qui scale les coords monde (metres) → pixels canvas. */
function useContainerScale(planWidth: number, planHeight: number) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return
    const update = () => setSize({ w: parent.clientWidth, h: parent.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])
  const scale = size.w > 0 && size.h > 0
    ? Math.min(size.w / planWidth, size.h / planHeight) * 0.9
    : 1
  const offsetX = (size.w - planWidth * scale) / 2
  const offsetY = (size.h - planHeight * scale) / 2
  const worldToScreen = React.useCallback(
    (x: number, y: number) => ({ x: x * scale + offsetX, y: y * scale + offsetY }),
    [scale, offsetX, offsetY],
  )
  return { containerRef, size, worldToScreen }
}

// ─── Overlay parcours detailles PROPH3T (z=15) ─────────────────────────

export function Vol3ProphJourneysMount({
  journeys, planWidth, planHeight,
}: { journeys: DetailedJourney[]; planWidth: number; planHeight: number }) {
  const { containerRef, size, worldToScreen } = useContainerScale(planWidth, planHeight)
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
      <DetailedJourneysOverlay
        journeys={journeys}
        worldToScreen={worldToScreen}
        width={size.w}
        height={size.h}
      />
    </div>
  )
}

// ─── Overlay ABM heatmap (z=13) ────────────────────────────────────────

type HeatmapGrid = import('../../shared/engines/plan-analysis/abmSocialForceEngine').HeatmapGrid

export function Vol3AbmHeatmapMount({
  heatmap, planWidth, planHeight,
}: { heatmap: HeatmapGrid; planWidth: number; planHeight: number }) {
  const { containerRef, size, worldToScreen } = useContainerScale(planWidth, planHeight)
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 13 }}>
      <AbmHeatmapOverlay
        heatmap={heatmap}
        worldToScreen={worldToScreen}
        width={size.w}
        height={size.h}
      />
    </div>
  )
}

// ─── Overlay flux entrees → sorties + panneaux signaletique (z=14) ─────

export function Vol3FlowPathsMount({
  result, focusedEntranceId, onFocusEntrance, planWidth, planHeight,
}: {
  result: FlowAnalysisResult
  focusedEntranceId: string | null
  onFocusEntrance: (id: string | null) => void
  planWidth: number
  planHeight: number
}) {
  const { containerRef, size, worldToScreen } = useContainerScale(planWidth, planHeight)
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 14 }}>
      <FlowPathsOverlay
        result={result}
        worldToScreen={worldToScreen}
        width={size.w}
        height={size.h}
        focusedEntranceId={focusedEntranceId}
        onFocusEntrance={onFocusEntrance}
      />
    </div>
  )
}

// ─── Overlay infos espaces (type + dimensions + clic correction) (z=12) ─

export function Vol3SpaceInfoMount({
  spaces, planWidth, planHeight, floorId,
}: {
  spaces: Array<import('../../shared/components/SpaceLabelEditor').LabeledSpace>
  planWidth: number
  planHeight: number
  floorId?: string | null
}) {
  const { containerRef, size, worldToScreen } = useContainerScale(planWidth, planHeight)
  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 12 }}>
      <SpaceInfoOverlay
        spaces={spaces}
        worldToScreen={worldToScreen}
        width={size.w}
        height={size.h}
        floorId={floorId}
      />
    </div>
  )
}

// ─── Panneau PROPH3T isole (memo pour eviter re-render infini) ──────────

interface ParsedPlanLike {
  bounds: { width: number; height: number }
  spaces?: Array<Record<string, unknown>>
}
interface FloorPoi { id: string; label: string; x: number; y: number; floorId?: string; priority?: string }

export const Vol3Proph3tPanel = React.memo(function Vol3Proph3tPanel({
  parsedPlan, floorPois,
}: { parsedPlan: ParsedPlanLike; floorPois: FloorPoi[] }) {
  // Lit aussi les espaces éditables (plan modélisé par l'utilisateur).
  // Ils remplacent / complètent les espaces auto-détectés du DXF.
  const editableSpaces = useEditableSpaceStore(s => s.spaces)

  const buildInput = React.useCallback(() => {
    const pw = parsedPlan.bounds.width || 200
    const ph = parsedPlan.bounds.height || 140
    // 1. Espaces DXF (auto-détectés)
    const dxfSpaces = (parsedPlan.spaces ?? []).map((s) => ({
      id: s.id as string,
      label: s.label as string | undefined ?? '',
      type: s.type as string | undefined,
      areaSqm: s.areaSqm as number,
      polygon: s.polygon as [number, number][],
      floorId: s.floorId as string | undefined,
    }))
    // 2. Espaces éditables (plan modélisé) — convertir Point[] → [number,number][]
    const editableMapped = editableSpaces.map((es) => {
      const poly: [number, number][] = es.polygon.map(p => [p.x, p.y])
      return {
        id: es.id,
        label: es.name || es.tenant || es.localNumber || es.type,
        type: String(es.type),
        areaSqm: polyArea(es.polygon),
        polygon: poly,
        floorId: es.floorLevel,
      }
    })
    // 3. Fusion : éditable prioritaire (par id). On garde DXF que si pas d'override.
    const editableIds = new Set(editableMapped.map(e => e.id))
    const merged = [
      ...editableMapped,
      ...dxfSpaces.filter(d => !editableIds.has(d.id)),
    ]
    return {
      planWidth: pw,
      planHeight: ph,
      spaces: merged,
      pois: floorPois.map((p) => ({
        id: p.id, label: p.label,
        x: p.x > 1 ? p.x : p.x * pw,
        y: p.y > 1 ? p.y : p.y * ph,
        floorId: p.floorId, priority: p.priority,
      })),
    }
  }, [parsedPlan, floorPois, editableSpaces])
  // Audit utilise le même input mais filtré pour garder la même structure
  const buildAuditInput = React.useCallback(() => {
    const inp = buildInput()
    if (!inp) return null
    // Map priority string → 1|2|3 (best-effort)
    const pois = inp.pois.map(p => {
      const prRaw = (p as { priority?: unknown }).priority
      let pr: 1 | 2 | 3 | undefined
      if (typeof prRaw === 'number' && (prRaw === 1 || prRaw === 2 || prRaw === 3)) pr = prRaw
      else if (typeof prRaw === 'string') {
        const m = /(\d)/.exec(prRaw)
        if (m) {
          const n = Number(m[1])
          if (n === 1 || n === 2 || n === 3) pr = n
        }
      }
      return { id: p.id, label: p.label, x: p.x, y: p.y, priority: pr }
    })
    return {
      planWidth: inp.planWidth,
      planHeight: inp.planHeight,
      spaces: inp.spaces.map(s => ({
        id: s.id,
        label: s.label ?? '',
        type: s.type,
        areaSqm: s.areaSqm,
        polygon: s.polygon,
      })),
      pois,
    }
  }, [buildInput])

  return (
    <>
      <Proph3tVolumePanel volume="parcours" buildInput={buildInput} />
      <SignageImplementer position="bottom-left" buildAuditInput={buildAuditInput} />
    </>
  )
})

// ─── Helper : telechargement blob ──────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
