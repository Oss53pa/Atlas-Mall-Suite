// ═══ ANNOTATIONS LAYER — Étiquettes texte libres sur le plan (SVG overlay) ═══
// Édition inline, drag pour repositionner, suppression au clic droit.
//
// Phase 1 additions:
//   • Type-specific visual styles: note | title | promo | works | info
//   • SVG arrow connector from annotation to arrowTarget (straight/curved/elbow)
//   • Pulse animation for promo type
//   • expiresAt filtering

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  useAnnotationsStore,
  type Annotation,
  type AnnotationType,
} from '../stores/annotationsStore'

// ── Visual style per type ─────────────────────────────────────────────────

interface AnnotationVisual {
  bg: string
  text: string
  border: string
  shadow: string
  emoji: string
}

const TYPE_VISUAL: Record<AnnotationType, AnnotationVisual> = {
  note: {
    bg: '#fef9c3',
    text: '#713f12',
    border: '#fde047',
    shadow: '0 2px 8px rgba(0,0,0,0.25)',
    emoji: '',
  },
  title: {
    bg: '#ffffffee',
    text: '#0f172a',
    border: 'rgba(255,255,255,0.4)',
    shadow: '0 4px 16px rgba(0,0,0,0.35)',
    emoji: '',
  },
  promo: {
    bg: 'linear-gradient(135deg, #7e5e3c 0%, #db2777 100%)',
    text: '#ffffff',
    border: 'rgba(255,255,255,0.25)',
    shadow: '0 4px 20px rgba(126,94,60,0.5)',
    emoji: '🏷',
  },
  works: {
    bg: '#78350f',
    text: '#fef3c7',
    border: '#f59e0b',
    shadow: '0 2px 8px rgba(0,0,0,0.4)',
    emoji: '🚧',
  },
  info: {
    bg: '#1e3a5f',
    text: '#bae6fd',
    border: '#38bdf8',
    shadow: '0 2px 10px rgba(14,165,233,0.3)',
    emoji: 'ℹ',
  },
}

// Works-type repeating diagonal stripe overlay (CSS)
const WORKS_STRIPES: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent 0px, transparent 6px, rgba(245,158,11,0.18) 6px, rgba(245,158,11,0.18) 10px)',
  backgroundSize: '14px 14px',
}

// ── SVG Arrow overlay ─────────────────────────────────────────────────────

interface ArrowProps {
  sx: number; sy: number    // annotation screen position (centre)
  tx: number; ty: number    // arrow target screen position
  style: Annotation['arrowStyle']
  color: string
}

function ArrowConnector({ sx, sy, tx, ty, style = 'straight', color }: ArrowProps) {
  if (style === 'none' || style === undefined) return null

  const arrowId = `arrowhead-${Math.abs(sx + sy + tx + ty) | 0}`

  const dx = tx - sx; const dy = ty - sy
  const len = Math.hypot(dx, dy)
  if (len < 5) return null

  // Shorten a bit so it doesn't overlap the annotation box
  const shrink = 14
  const ex = tx - (dx / len) * shrink
  const ey = ty - (dy / len) * shrink

  let pathD: string
  if (style === 'straight') {
    pathD = `M ${sx} ${sy} L ${ex} ${ey}`
  } else if (style === 'curved') {
    const mx = (sx + ex) / 2 - dy * 0.3
    const my = (sy + ey) / 2 + dx * 0.3
    pathD = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`
  } else {
    // elbow: right angle via midpoint
    const mid = (style === 'elbow') ? { x: ex, y: sy } : { x: sx, y: ey }
    pathD = `M ${sx} ${sy} L ${mid.x} ${mid.y} L ${ex} ${ey}`
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <defs>
        <marker id={arrowId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} opacity={0.8} />
        </marker>
      </defs>
      <path
        d={pathD}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.7}
        strokeDasharray={style === 'elbow' ? '' : '4 3'}
        fill="none"
        markerEnd={`url(#${arrowId})`}
      />
    </svg>
  )
}

// ── Main layer component ──────────────────────────────────────────────────

interface AnnotationsLayerProps {
  floorId?: string
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  screenToWorld: (x: number, y: number) => { x: number; y: number }
  addMode?: boolean
  onAddDone?: () => void
  /** When set, new annotations get this type. Default: 'note'. */
  defaultType?: AnnotationType
  className?: string
}

export function AnnotationsLayer({
  floorId,
  worldToScreen,
  screenToWorld,
  addMode,
  onAddDone,
  defaultType = 'note',
  className = '',
}: AnnotationsLayerProps) {
  // ── Stable selectors ──────────────────────────────────────────────────────
  // IMPORTANT: never use `s.byFloor(floorId)` here — it calls .filter() inside
  // the selector, returning a new array reference on every invocation.  React 18's
  // useSyncExternalStore runs getSnapshot() twice per render for consistency; a new
  // reference each time triggers an infinite "Maximum update depth exceeded" loop.
  // Solution: select the raw flat array (stable reference when unchanged) and filter
  // it in a useMemo so React sees a stable value between renders.
  const rawAnnotations = useAnnotationsStore((s) => s.annotations)
  const add    = useAnnotationsStore((s) => s.add)
  const update = useAnnotationsStore((s) => s.update)
  const remove = useAnnotationsStore((s) => s.remove)

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const containerRef  = useRef<HTMLDivElement>(null)

  // Filter by floor then strip expired entries — stable between renders
  const now = Date.now()
  const allAnnotations = useMemo(
    () => rawAnnotations.filter((a) => !floorId || a.floorId === floorId),
    [rawAnnotations, floorId],
  )
  const annotations = useMemo(
    () => allAnnotations.filter((a) => !a.expiresAt || new Date(a.expiresAt).getTime() > now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAnnotations],
  )

  // Click to add
  const onContainerClick = useCallback((e: React.MouseEvent) => {
    if (!addMode || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const id = add({
      floorId, x: w.x, y: w.y,
      text: defaultType === 'title' ? 'Titre' : defaultType === 'promo' ? 'Promotion' : 'Annotation',
      annotationType: defaultType,
      arrowStyle: 'none',
    })
    setEditingId(id)
    onAddDone?.()
  }, [addMode, floorId, screenToWorld, add, onAddDone, defaultType])

  // Drag handlers
  const onDragStart = (e: React.PointerEvent, ann: Annotation) => {
    e.stopPropagation()
    if (editingId === ann.id || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const sxy = worldToScreen(ann.x, ann.y)
    dragOffsetRef.current = {
      dx: e.clientX - rect.left - sxy.x,
      dy: e.clientY - rect.top  - sxy.y,
    }
    setDraggingId(ann.id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: React.PointerEvent) => {
    if (!draggingId || !dragOffsetRef.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const w = screenToWorld(
      e.clientX - rect.left - dragOffsetRef.current.dx,
      e.clientY - rect.top  - dragOffsetRef.current.dy,
    )
    update(draggingId, { x: w.x, y: w.y })
  }
  const onDragEnd = () => { setDraggingId(null); dragOffsetRef.current = null }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${addMode ? 'cursor-crosshair' : 'pointer-events-none'} ${className}`}
      onClick={onContainerClick}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
    >
      {/* SVG arrows layer (behind annotation chips) */}
      {annotations.map((ann) => {
        if (!ann.arrowTargetX || !ann.arrowTargetY || ann.arrowStyle === 'none') return null
        const sxy = worldToScreen(ann.x, ann.y)
        const txy = worldToScreen(ann.arrowTargetX, ann.arrowTargetY)
        const vtype = ann.annotationType ?? 'note'
        const visual = TYPE_VISUAL[vtype]
        return (
          <ArrowConnector
            key={`arrow-${ann.id}`}
            sx={sxy.x} sy={sxy.y}
            tx={txy.x} ty={txy.y}
            style={ann.arrowStyle}
            color={visual.text}
          />
        )
      })}

      {/* Annotation chips */}
      {annotations.map((ann) => {
        const sxy     = worldToScreen(ann.x, ann.y)
        const isEditing = editingId === ann.id
        const vtype   = ann.annotationType ?? 'note'
        const visual  = TYPE_VISUAL[vtype]
        const isPulse = ann.pulse && vtype === 'promo'

        // Font size: title > others
        const fontSize = ann.fontSize
          ?? (vtype === 'title' ? 16 : vtype === 'promo' ? 13 : 12)

        // Build container style
        const containerStyle: React.CSSProperties = {
          position: 'absolute',
          left: sxy.x,
          top: sxy.y,
          transform: `translate(-50%, -50%) rotate(${ann.rotation ?? 0}deg)`,
          zIndex: 10,
        }

        // Card style
        const cardStyle: React.CSSProperties = {
          background: visual.bg,
          color: visual.text,
          border: `1px solid ${visual.border}`,
          boxShadow: visual.shadow,
          fontWeight: (ann.bold || vtype === 'title') ? 700 : vtype === 'promo' ? 600 : 500,
          fontSize,
          padding: vtype === 'title' ? '6px 12px' : '4px 8px',
          borderRadius: vtype === 'title' ? 8 : vtype === 'promo' ? 20 : 5,
          maxWidth: vtype === 'title' ? 260 : 200,
          whiteSpace: vtype === 'title' ? 'normal' : 'nowrap',
          cursor: 'move',
          userSelect: 'none',
          backdropFilter: 'blur(4px)',
          ...(vtype === 'works' ? WORKS_STRIPES : {}),
          ...(isPulse
            ? { animation: 'atlas-pulse 2s ease-in-out infinite' }
            : {}),
        }

        return (
          <div key={ann.id} style={containerStyle} className="pointer-events-auto">
            {isEditing ? (
              <input
                autoFocus
                value={ann.text}
                onChange={(e) => update(ann.id, { text: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null)
                }}
                style={{
                  ...cardStyle,
                  cursor: 'text',
                  outline: '2px solid #38bdf8',
                  minWidth: 80,
                }}
                className="rounded"
              />
            ) : (
              <div
                style={cardStyle}
                onPointerDown={(e) => onDragStart(e, ann)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditingId(ann.id) }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (confirm(`Supprimer "${ann.text}" ?`)) remove(ann.id)
                }}
              >
                {visual.emoji && <span className="mr-1.5">{visual.emoji}</span>}
                {ann.text}
              </div>
            )}
          </div>
        )
      })}

      {/* Add-mode hint */}
      {addMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-cyan-600/90 text-white text-[11px] font-medium pointer-events-none shadow-lg border border-cyan-400/30 backdrop-blur">
          Cliquez sur le plan pour ajouter une annotation · Échap pour annuler
        </div>
      )}

      {/* Pulse keyframes injected once */}
      <style>{`
        @keyframes atlas-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(126,94,60,0.5); transform: translate(-50%,-50%) scale(1); }
          50%       { box-shadow: 0 6px 28px rgba(219,39,119,0.7); transform: translate(-50%,-50%) scale(1.04); }
        }
      `}</style>
    </div>
  )
}
