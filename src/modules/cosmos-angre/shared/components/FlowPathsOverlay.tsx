// ═══ FLOW PATHS OVERLAY ═══
// Dessine par-dessus le plan :
//   1. Les chemins entrées → sorties (lignes colorées par paire)
//   2. Les markers d'entrées (triangle vert) / sorties (triangle rouge) / transits (losange bleu)
//   3. Les panneaux de signalétique recommandés (pictogrammes par type + priorité)
//
// Légende interactive : clic sur une entrée → isole tous ses chemins sortants.

import { useMemo, useState } from 'react'
import type { FlowAnalysisResult, FlowEntryExit, SignageRecommendation, SignageType } from '../engines/plan-analysis/flowPathEngine'

interface Props {
  result: FlowAnalysisResult
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  width: number
  height: number
  /** Filtre : n'afficher que les chemins depuis cette entrée (null = tous) */
  focusedEntranceId?: string | null
  onFocusEntrance?: (id: string | null) => void
  /** Filtre : afficher/masquer les panneaux par type */
  visibleSignageTypes?: Set<SignageType>
}

// Palette étendue — une couleur par PAIRE (entrée, sortie)
const PATH_PALETTE = [
  '#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa',
  '#fb7185', '#22d3ee', '#facc15', '#fb923c', '#c084fc',
  '#4ade80', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6',
  '#e11d48', '#06b6d4', '#eab308', '#ea580c', '#d946ef',
]

/** Hash stable string → index palette. */
function colorForPair(fromId: string, toId: string): string {
  const key = `${fromId}→${toId}`
  let h = 0
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0
  return PATH_PALETTE[Math.abs(h) % PATH_PALETTE.length]
}

/**
 * Convertit une polyligne en path SVG lissé (Catmull-Rom → Bézier cubique).
 * Produit un tracé élégant qui ne coupe pas les angles brutalement.
 */
function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.5): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return d
}

const SIGNAGE_META: Record<SignageType, { color: string; icon: string; label: string }> = {
  welcome:        { color: '#10b981', icon: 'ⓘ', label: 'Accueil + plan' },
  directional:    { color: '#f59e0b', icon: '↗', label: 'Directionnel' },
  'you-are-here': { color: '#6366f1', icon: '◉', label: 'Vous êtes ici' },
  information:    { color: '#8b5cf6', icon: 'i',  label: 'Information' },
  exit:           { color: '#ef4444', icon: '⎋', label: 'Sortie' },
}

const PRIORITY_SIZE: Record<string, number> = {
  critical: 14, high: 11, medium: 9, low: 7,
}

export function FlowPathsOverlay({
  result, worldToScreen, width, height,
  focusedEntranceId = null, onFocusEntrance,
  visibleSignageTypes,
}: Props) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const [hoveredSignage, setHoveredSignage] = useState<string | null>(null)

  // Couleur par PAIRE (entrée → sortie) — hash stable
  const pathColorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of result.paths) map.set(p.id, colorForPair(p.from.id, p.to.id))
    return map
  }, [result.paths])

  // Couleur primaire par ENTRÉE (pour le marker)
  const entranceColorMap = useMemo(() => {
    const map = new Map<string, string>()
    result.entrances.forEach((e, i) => map.set(e.id, PATH_PALETTE[i % PATH_PALETTE.length]))
    return map
  }, [result.entrances])

  const visiblePaths = focusedEntranceId
    ? result.paths.filter(p => p.from.id === focusedEntranceId)
    : result.paths

  const visibleSignage = visibleSignageTypes
    ? result.signage.filter(s => visibleSignageTypes.has(s.type))
    : result.signage

  return (
    <>
    {/* Légende des paires entrée → sortie (html superposé) */}
    <div className="absolute top-2 right-2 max-w-[260px] max-h-[40vh] overflow-y-auto bg-slate-950/85 backdrop-blur rounded-lg border border-white/10 p-2 text-[10px] pointer-events-auto" style={{ zIndex: 16 }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-slate-300 font-bold uppercase tracking-wider">
          Flux ({visiblePaths.length}/{result.paths.length})
        </span>
        {focusedEntranceId && (
          <button
            onClick={() => onFocusEntrance?.(null)}
            className="text-[9px] text-slate-500 hover:text-white"
          >
            Tout afficher
          </button>
        )}
      </div>
      <ul className="space-y-1">
        {result.paths
          .filter(p => !focusedEntranceId || p.from.id === focusedEntranceId)
          .map(p => {
            const c = pathColorMap.get(p.id) ?? '#94a3b8'
            const isHovered = hoveredPath === p.id
            return (
              <li
                key={p.id}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer ${isHovered ? 'bg-white/10' : 'hover:bg-white/5'}`}
                onMouseEnter={() => setHoveredPath(p.id)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                <span className="w-3 h-[3px] rounded-full flex-shrink-0" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}` }} />
                <span className="text-emerald-400 flex-shrink-0">▲</span>
                <span className="text-slate-300 truncate flex-1" title={`${p.from.label} → ${p.to.label}`}>
                  {truncate(p.from.label, 12)}
                </span>
                <span className="text-slate-600">→</span>
                <span className="text-red-400 flex-shrink-0">▼</span>
                <span className="text-slate-300 truncate flex-1" title={p.to.label}>
                  {truncate(p.to.label, 12)}
                </span>
                <span className="text-slate-500 tabular-nums text-[9px] flex-shrink-0">{p.distanceM.toFixed(0)}m</span>
              </li>
            )
          })}
      </ul>
    </div>

    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 14 }}
    >
      <defs>
        {/* Marker flèche pour les chemins */}
        <marker
          id="flow-arrow"
          viewBox="0 0 10 10"
          refX="9" refY="5"
          markerWidth="6" markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
        <filter id="sig-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ─── CHEMINS ─── */}
      <g opacity={0.95}>
        {visiblePaths.map(p => {
          const color = pathColorMap.get(p.id) ?? '#94a3b8'
          const pts = p.waypoints.map(w => worldToScreen(w.x, w.y))
          const d = smoothPath(pts, 0.55)
          const isHovered = hoveredPath === p.id
          return (
            <g key={p.id} className="pointer-events-auto">
              {/* halo sombre en arrière-plan pour lisibilité sur fond clair/sombre */}
              <path
                d={d}
                stroke="rgba(2,6,23,0.75)"
                strokeOpacity={isHovered ? 0.9 : 0.6}
                strokeWidth={isHovered ? 13 : 9}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* halo coloré */}
              <path
                d={d}
                stroke={color}
                strokeOpacity={isHovered ? 0.45 : 0.3}
                strokeWidth={isHovered ? 11 : 7}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* line principale */}
              <path
                d={d}
                stroke={color}
                strokeWidth={isHovered ? 3.5 : 2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={p.weight < 0.5 ? '8 5' : 'none'}
                markerEnd="url(#flow-arrow)"
                style={{ color }}
                onMouseEnter={() => setHoveredPath(p.id)}
                onMouseLeave={() => setHoveredPath(null)}
              />
            </g>
          )
        })}

        {/* Tooltip chemin survolé */}
        {hoveredPath && (() => {
          const p = result.paths.find(pp => pp.id === hoveredPath)
          if (!p) return null
          const mid = p.waypoints[Math.floor(p.waypoints.length / 2)]
          const pos = worldToScreen(mid.x, mid.y)
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={pos.x + 8} y={pos.y - 22} width={170} height={44} fill="rgba(2,6,23,0.95)" rx={4} />
              <text x={pos.x + 16} y={pos.y - 6} fontSize={11} fontWeight="bold" fill="#f1f5f9">
                {p.from.label} → {p.to.label}
              </text>
              <text x={pos.x + 16} y={pos.y + 10} fontSize={10} fill="#94a3b8">
                {p.distanceM.toFixed(0)} m · {p.durationMin.toFixed(1)} min
              </text>
            </g>
          )
        })()}
      </g>

      {/* ─── MARKERS ENTRÉES / SORTIES / TRANSITS ─── */}
      <g>
        {result.entrances.map(e => (
          <EntryExitMarker
            key={e.id}
            pt={e}
            screenPos={worldToScreen(e.x, e.y)}
            kind="entrance"
            focused={focusedEntranceId === e.id}
            onClick={() => onFocusEntrance?.(focusedEntranceId === e.id ? null : e.id)}
            color={entranceColorMap.get(e.id) ?? '#34d399'}
          />
        ))}
        {result.exits.map(e => (
          <EntryExitMarker
            key={e.id}
            pt={e}
            screenPos={worldToScreen(e.x, e.y)}
            kind="exit"
            color="#ef4444"
          />
        ))}
        {result.transits.map(e => (
          <EntryExitMarker
            key={e.id}
            pt={e}
            screenPos={worldToScreen(e.x, e.y)}
            kind="transit"
            color="#60a5fa"
          />
        ))}
      </g>

      {/* ─── PANNEAUX DE SIGNALÉTIQUE ─── */}
      <g>
        {visibleSignage.map(s => (
          <SignageMarker
            key={s.id}
            sig={s}
            screenPos={worldToScreen(s.x, s.y)}
            hovered={hoveredSignage === s.id}
            onHover={(h) => setHoveredSignage(h ? s.id : null)}
          />
        ))}
      </g>
    </svg>
    </>
  )
}

// ─── Markers entrées / sorties / transits ───────────────────

function EntryExitMarker({
  pt, screenPos, kind, color, focused, onClick,
}: {
  pt: FlowEntryExit
  screenPos: { x: number; y: number }
  kind: 'entrance' | 'exit' | 'transit'
  color: string
  focused?: boolean
  onClick?: () => void
}) {
  const size = 12
  const shape = kind === 'entrance'
    ? `M ${screenPos.x} ${screenPos.y - size} L ${screenPos.x + size} ${screenPos.y + size * 0.7} L ${screenPos.x - size} ${screenPos.y + size * 0.7} Z`
    : kind === 'exit'
    ? `M ${screenPos.x} ${screenPos.y + size} L ${screenPos.x + size} ${screenPos.y - size * 0.7} L ${screenPos.x - size} ${screenPos.y - size * 0.7} Z`
    : `M ${screenPos.x} ${screenPos.y - size} L ${screenPos.x + size} ${screenPos.y} L ${screenPos.x} ${screenPos.y + size} L ${screenPos.x - size} ${screenPos.y} Z`

  const letter = kind === 'entrance' ? 'E' : kind === 'exit' ? 'S' : '⇅'

  return (
    <g
      className={onClick ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}
      onClick={onClick}
    >
      <path
        d={shape}
        fill={color}
        fillOpacity={focused ? 1 : 0.85}
        stroke="#fff"
        strokeWidth={focused ? 3 : 2}
      />
      <text
        x={screenPos.x}
        y={screenPos.y + 4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="#fff"
        style={{ pointerEvents: 'none' }}
      >
        {letter}
      </text>
      <text
        x={screenPos.x}
        y={screenPos.y + (kind === 'exit' ? -size - 6 : size + 14)}
        textAnchor="middle"
        fontSize={9}
        fontWeight="500"
        fill="#f1f5f9"
        stroke="#0f172a"
        strokeWidth={2}
        paintOrder="stroke fill"
        style={{ pointerEvents: 'none' }}
      >
        {pt.label}
      </text>
    </g>
  )
}

// ─── Marker de panneau (signalétique) ───────────────────────

function SignageMarker({
  sig, screenPos, hovered, onHover,
}: {
  sig: SignageRecommendation
  screenPos: { x: number; y: number }
  hovered: boolean
  onHover: (h: boolean) => void
}) {
  const meta = SIGNAGE_META[sig.type]
  const radius = PRIORITY_SIZE[sig.priority] ?? 9
  const pulse = sig.priority === 'critical'

  return (
    <g
      className="cursor-pointer pointer-events-auto"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {pulse && (
        <circle
          cx={screenPos.x}
          cy={screenPos.y}
          r={radius + 6}
          fill="none"
          stroke={meta.color}
          strokeOpacity={0.4}
          strokeWidth={2}
        >
          <animate attributeName="r" from={radius} to={radius + 10} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={screenPos.x}
        cy={screenPos.y}
        r={radius}
        fill={meta.color}
        fillOpacity={hovered ? 1 : 0.85}
        stroke="#fff"
        strokeWidth={2}
        filter="url(#sig-glow)"
      />
      <text
        x={screenPos.x}
        y={screenPos.y + radius * 0.35}
        textAnchor="middle"
        fontSize={radius * 1.1}
        fontWeight="bold"
        fill="#fff"
        style={{ pointerEvents: 'none' }}
      >
        {meta.icon}
      </text>

      {/* Tooltip */}
      {hovered && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={screenPos.x + 12}
            y={screenPos.y - 40}
            width={240}
            height={Math.max(60, sig.suggestedContent.length * 12 + 40)}
            fill="rgba(2,6,23,0.96)"
            stroke={meta.color}
            strokeOpacity={0.6}
            rx={4}
          />
          <text x={screenPos.x + 20} y={screenPos.y - 22} fontSize={11} fontWeight="bold" fill={meta.color}>
            {meta.icon} {meta.label}
          </text>
          <text x={screenPos.x + 20} y={screenPos.y - 8} fontSize={9} fill="#cbd5e1">
            Priorité : <tspan fontWeight="bold" fill={priorityColor(sig.priority)}>{sig.priority}</tspan>
            <tspan fill="#64748b"> · {sig.directionsCount} direction{sig.directionsCount > 1 ? 's' : ''}</tspan>
          </text>
          {sig.suggestedContent.slice(0, 4).map((c, i) => (
            <text
              key={i}
              x={screenPos.x + 20}
              y={screenPos.y + 6 + i * 12}
              fontSize={9}
              fill="#94a3b8"
            >
              • {truncate(c, 36)}
            </text>
          ))}
        </g>
      )}
    </g>
  )
}

function priorityColor(p: string): string {
  return p === 'critical' ? '#ef4444' : p === 'high' ? '#f59e0b' : p === 'medium' ? '#60a5fa' : '#94a3b8'
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
