// ═══ PLAN ENTITIES RENDERER — SVG rendering of DWG/PDF entities with LOD + viewport culling ═══

import React, { useMemo } from 'react'
import type {
  PlanEntity, PlanLayer, ViewportState, LODLevel,
  LineGeometry, PolylineGeometry, CircleGeometry, ArcGeometry,
  TextGeometry, DimensionGeometry,
} from '../planReader/planEngineTypes'
import { isInViewport } from '../planReader/coordinateEngine'

interface Props {
  entities: PlanEntity[]
  layers: PlanLayer[]
  lod: LODLevel
  viewport: ViewportState
  canvasW: number
  canvasH: number
}

function PlanEntitiesRendererInner({ entities, layers, lod, viewport, canvasW, canvasH }: Props) {
  const visibleEntities = useMemo(() => {
    const layerMap = new Map(layers.map(l => [l.name, l]))
    return entities.filter(e => {
      // Layer visibility
      const layer = layerMap.get(e.layer)
      if (layer && !layer.visible) return false
      if (!e.visible) return false

      // Viewport culling
      if (!isInViewport(e.bounds, viewport, canvasW, canvasH)) return false

      // LOD filtering
      if (lod === 'minimal') {
        if (e.type === 'TEXT' || e.type === 'MTEXT' || e.type === 'DIMENSION') return false
        if (e.type === 'CIRCLE' && e.bounds.width < 0.5) return false
      }
      if (lod === 'medium') {
        if (e.type === 'MTEXT') return false
        if (e.type === 'TEXT' && e.geometry.kind === 'text' && e.geometry.height < 0.3) return false
      }

      return true
    })
  }, [entities, layers, lod, viewport, canvasW, canvasH])

  return (
    <g className="plan-entities">
      {visibleEntities.map(entity => (
        <EntityShape key={entity.id} entity={entity} lod={lod} />
      ))}
    </g>
  )
}

export const PlanEntitiesRenderer = React.memo(PlanEntitiesRendererInner)

// ─── ENTITY RENDERER ─────────────────────────────────────

const EntityShape = React.memo(function EntityShape({ entity, lod }: { entity: PlanEntity; lod: LODLevel }) {
  const g = entity.geometry
  const color = entity.color ?? '#94a3b8'

  switch (g.kind) {
    case 'line':
      return <LineShape g={g} color={color} />
    case 'polyline':
      return <PolylineShape g={g} color={color} />
    case 'circle':
      return <CircleShape g={g} color={color} />
    case 'arc':
      return <ArcShape g={g} color={color} />
    case 'text':
      if (lod === 'minimal') return null
      return <TextShape g={g} color={color} />
    case 'dimension':
      if (lod === 'minimal') return null
      return <DimensionShape g={g} />
    default:
      return null
  }
})

function LineShape({ g, color }: { g: LineGeometry; color: string }) {
  return (
    <line
      x1={g.x1} y1={g.y1}
      x2={g.x2} y2={g.y2}
      stroke={color}
      strokeWidth={0.05}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function PolylineShape({ g, color }: { g: PolylineGeometry; color: string }) {
  const points = g.vertices.map(v => `${v.x},${v.y}`).join(' ')
  if (g.closed) {
    return (
      <polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={0.05}
        vectorEffect="non-scaling-stroke"
      />
    )
  }
  return (
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth={0.05}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function CircleShape({ g, color }: { g: CircleGeometry; color: string }) {
  return (
    <circle
      cx={g.cx} cy={g.cy} r={g.radius}
      fill="none"
      stroke={color}
      strokeWidth={0.05}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function ArcShape({ g, color }: { g: ArcGeometry; color: string }) {
  // Y axis is flipped (DWG Y-up → SVG Y-down), so arc sweep direction reverses
  const startRad = (-g.endAngle * Math.PI) / 180
  const endRad = (-g.startAngle * Math.PI) / 180
  const x1 = g.cx + g.radius * Math.cos(startRad)
  const y1 = g.cy + g.radius * Math.sin(startRad)
  const x2 = g.cx + g.radius * Math.cos(endRad)
  const y2 = g.cy + g.radius * Math.sin(endRad)

  let sweep = endRad - startRad
  if (sweep < 0) sweep += 2 * Math.PI
  const largeArc = sweep > Math.PI ? 1 : 0

  return (
    <path
      d={`M${x1} ${y1} A${g.radius} ${g.radius} 0 ${largeArc} 0 ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={0.05}
      vectorEffect="non-scaling-stroke"
    />
  )
}

function TextShape({ g, color }: { g: TextGeometry; color: string }) {
  return (
    <text
      x={g.x} y={g.y}
      fill={color}
      fontSize={Math.max(0.2, g.height)}
      fontFamily="sans-serif"
      opacity={0.9}
      transform={g.rotation ? `rotate(${-g.rotation}, ${g.x}, ${g.y})` : undefined}
    >
      {g.text}
    </text>
  )
}

function DimensionShape({ g }: { g: DimensionGeometry }) {
  const [x1, y1] = g.defPoint1
  const [x2, y2] = g.defPoint2
  const [tx, ty] = g.textPosition
  const label = g.text ?? `${g.measurement.toFixed(2)} m`

  return (
    <g opacity={0.7}>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#ef4444" strokeWidth={0.03}
        vectorEffect="non-scaling-stroke"
      />
      {/* Tick marks at endpoints */}
      <circle cx={x1} cy={y1} r={0.08} fill="#ef4444" />
      <circle cx={x2} cy={y2} r={0.08} fill="#ef4444" />
      <text
        x={tx} y={ty}
        fill="#ef4444"
        fontSize={0.35}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="monospace"
      >
        {label}
      </text>
    </g>
  )
}
