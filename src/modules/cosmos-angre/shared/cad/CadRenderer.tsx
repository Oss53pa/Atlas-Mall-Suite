// ═══ CAD RENDERER — SVG rendering for all CAD entity types ═══

import type { CadEntity, CadLayer } from './cadTypes'

interface CadRendererProps {
  entities: CadEntity[]
  layers: CadLayer[]
  selectedIds: Set<string>
  onEntityClick?: (id: string) => void
}

export default function CadRenderer({ entities, layers, selectedIds, onEntityClick }: CadRendererProps) {
  const layerMap = new Map(layers.map(l => [l.id, l]))

  return (
    <g className="cad-entities">
      {entities.map(entity => {
        const layer = layerMap.get(entity.layer)
        if (layer && (!layer.visible || layer.opacity <= 0)) return null
        if (entity.visible === false) return null

        const isSelected = selectedIds.has(entity.id)
        const opacity = layer?.opacity ?? 1

        return (
          <g
            key={entity.id}
            opacity={opacity}
            onClick={(e) => { e.stopPropagation(); onEntityClick?.(entity.id) }}
            className={layer?.locked ? '' : 'cursor-pointer'}
          >
            {renderEntity(entity, isSelected)}
          </g>
        )
      })}
    </g>
  )
}

function renderEntity(e: CadEntity, selected: boolean) {
  const selStroke = selected ? '#b38a5a' : undefined
  const selWidth = selected ? e.lineWidth + 2 : undefined

  switch (e.type) {
    case 'wall':
    case 'cloison':
      return <WallRenderer entity={e} selStroke={selStroke} selWidth={selWidth} />
    case 'zone':
    case 'rect_zone':
      return <ZoneRenderer entity={e} selected={selected} />
    case 'cotation':
      return <CotationRenderer entity={e} selStroke={selStroke} />
    case 'text':
      return <TextRenderer entity={e} selected={selected} />
    case 'arrow':
      return <ArrowRenderer entity={e} selStroke={selStroke} />
    default:
      return null
  }
}

// ── Wall / Cloison ───────────────────────────────────────────

function WallRenderer({ entity: e, selStroke, selWidth }: { entity: CadEntity; selStroke?: string; selWidth?: number }) {
  if (e.points.length < 2) return null
  const d = e.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <>
      {/* Selection highlight */}
      {selStroke && (
        <path d={d} fill="none" stroke={selStroke} strokeWidth={(selWidth ?? 6) + 4} strokeLinecap="round" opacity={0.3} />
      )}
      {/* Wall line */}
      <path
        d={d}
        fill="none"
        stroke={selStroke ?? e.color}
        strokeWidth={selWidth ?? e.lineWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Vertex dots */}
      {e.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={selStroke ?? e.color} />
      ))}
    </>
  )
}

// ── Zone (polygon / rectangle) ───────────────────────────────

function ZoneRenderer({ entity: e, selected }: { entity: CadEntity; selected: boolean }) {
  if (e.points.length < 3) return null
  const d = e.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  // Compute centroid for label
  const cx = e.points.reduce((s, p) => s + p.x, 0) / e.points.length
  const cy = e.points.reduce((s, p) => s + p.y, 0) / e.points.length

  return (
    <>
      <path
        d={d}
        fill={e.fillColor ?? e.color}
        fillOpacity={e.fillOpacity ?? 0.15}
        stroke={selected ? '#b38a5a' : e.color}
        strokeWidth={selected ? 3 : e.lineWidth}
        strokeDasharray={selected ? '8 4' : undefined}
      />
      {e.label && (
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fill="#ffffff" fontSize={14} fontWeight={600} fontFamily="system-ui"
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
        >
          {e.label}
        </text>
      )}
      {e.surfaceM2 != null && e.surfaceM2 > 0 && (
        <text
          x={cx} y={cy + 18}
          textAnchor="middle" dominantBaseline="central"
          fill="#9ca3af" fontSize={11} fontFamily="system-ui"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {e.surfaceM2} m²
        </text>
      )}
      {/* Resize handles when selected */}
      {selected && e.points.map((p, i) => (
        <rect
          key={i}
          x={p.x - 4} y={p.y - 4} width={8} height={8}
          fill="#b38a5a" stroke="#ffffff" strokeWidth={1}
          className="cursor-nwse-resize"
        />
      ))}
    </>
  )
}

// ── Cotation (dimension line) ────────────────────────────────

function CotationRenderer({ entity: e, selStroke }: { entity: CadEntity; selStroke?: string }) {
  if (e.points.length < 2) return null
  const [p1, p2] = e.points
  const color = selStroke ?? e.color
  const dist = e.dimValue ?? Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI

  return (
    <>
      {/* Main line */}
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={1} />
      {/* End ticks */}
      <line x1={p1.x} y1={p1.y - 8} x2={p1.x} y2={p1.y + 8} stroke={color} strokeWidth={1.5}
        transform={`rotate(${angle}, ${p1.x}, ${p1.y})`} />
      <line x1={p2.x} y1={p2.y - 8} x2={p2.x} y2={p2.y + 8} stroke={color} strokeWidth={1.5}
        transform={`rotate(${angle}, ${p2.x}, ${p2.y})`} />
      {/* Dimension text */}
      <text
        x={mid.x} y={mid.y - 8}
        textAnchor="middle" fill={color} fontSize={12} fontWeight={600} fontFamily="system-ui"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {dist.toFixed(1)}
      </text>
    </>
  )
}

// ── Text annotation ──────────────────────────────────────────

function TextRenderer({ entity: e, selected }: { entity: CadEntity; selected: boolean }) {
  if (e.points.length < 1) return null
  const p = e.points[0]
  return (
    <>
      {selected && (
        <rect x={p.x - 4} y={p.y - 16} width={120} height={24}
          fill="none" stroke="#b38a5a" strokeWidth={1} strokeDasharray="4 2" />
      )}
      <text
        x={p.x} y={p.y}
        fill={e.color} fontSize={14} fontFamily="system-ui" fontWeight={500}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {e.textContent ?? 'Texte'}
      </text>
    </>
  )
}

// ── Arrow ────────────────────────────────────────────────────

function ArrowRenderer({ entity: e, selStroke }: { entity: CadEntity; selStroke?: string }) {
  if (e.points.length < 2) return null
  const [p1, p2] = e.points
  const color = selStroke ?? e.color
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const headLen = 12

  return (
    <>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={color} strokeWidth={e.lineWidth} />
      {/* Arrowhead */}
      <polygon
        points={`
          ${p2.x},${p2.y}
          ${p2.x - headLen * Math.cos(angle - 0.4)},${p2.y - headLen * Math.sin(angle - 0.4)}
          ${p2.x - headLen * Math.cos(angle + 0.4)},${p2.y - headLen * Math.sin(angle + 0.4)}
        `}
        fill={color}
      />
    </>
  )
}
