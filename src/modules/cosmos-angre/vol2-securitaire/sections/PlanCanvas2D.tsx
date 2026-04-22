import type { Floor, Zone, Camera, Door, BlindSpot, TransitionNode } from '../../shared/proph3t/types'
import FloorPlanCanvas from '../../shared/components/FloorPlanCanvas'

const S = 4

interface PlanCanvas2DProps {
  floor: Floor
  zones: Zone[]
  cameras: Camera[]
  doors: Door[]
  blindSpots: BlindSpot[]
  transitions: TransitionNode[]
  showFov: boolean
  showBlindSpots: boolean
  showHeatmap: boolean
  showTransitions: boolean
  selectedEntityId: string | null
  onSelectEntity: (id: string, type: 'camera' | 'door' | 'zone' | 'transition') => void
}

function cameraConeArc(cam: Camera): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cx = cam.x * S
  const cy = cam.y * S
  const r = cam.range * S
  const halfFov = cam.fov / 2
  const startAngle = cam.angle - halfFov
  const endAngle = cam.angle + halfFov

  if (cam.fov >= 360) {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} Z`
  }

  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = cam.fov > 180 ? 1 : 0

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

function priorityColor(priority: Camera['priority']): string {
  switch (priority) {
    case 'critique': return '#EF4444'
    case 'haute': return '#F59E0B'
    default: return '#3B82F6'
  }
}

function transitionIcon(type: TransitionNode['type']): string {
  switch (type) {
    case 'escalator_montant': return '↑'
    case 'escalator_descendant': return '↓'
    case 'ascenseur': return '⇅'
    case 'rampe_pmr': return '♿'
    case 'escalier_secours': return '⚠'
    default: return '↕'
  }
}

export default function PlanCanvas2D({
  floor, zones, cameras, doors, blindSpots, transitions,
  showFov, showBlindSpots, showHeatmap, showTransitions,
  selectedEntityId, onSelectEntity,
}: PlanCanvas2DProps) {
  return (
    <FloorPlanCanvas
      floor={floor}
      zones={zones}
      showHeatmap={showHeatmap}
      onEntityClick={(id, type) => onSelectEntity(id, type)}
      selectedId={selectedEntityId}
      className="w-full h-full"
    >
      {/* FOV Cones */}
      {showFov && cameras.map((cam) => (
        <path
          key={`fov-${cam.id}`}
          d={cameraConeArc(cam)}
          fill={priorityColor(cam.priority)}
          fillOpacity={0.15}
          stroke={priorityColor(cam.priority)}
          strokeOpacity={0.4}
          strokeWidth={0.5}
          className="cursor-pointer"
          onClick={() => onSelectEntity(cam.id, 'camera')}
        />
      ))}

      {/* Camera Markers */}
      {cameras.map((cam) => (
        <g key={`cam-${cam.id}`} className="cursor-pointer" onClick={() => onSelectEntity(cam.id, 'camera')}>
          <circle cx={cam.x * S} cy={cam.y * S} r={5} fill={cam.color} stroke="#fff" strokeWidth={1.2} />
          <circle cx={cam.x * S} cy={cam.y * S} r={2} fill="#fff" fillOpacity={0.9} />
          {selectedEntityId === cam.id && (
            <circle cx={cam.x * S} cy={cam.y * S} r={9} fill="none" stroke="#b38a5a" strokeWidth={1.8} strokeDasharray="4 2" />
          )}
          <text x={cam.x * S} y={cam.y * S - 8} textAnchor="middle" fill={cam.color} fontSize={8} fontFamily="system-ui">
            {cam.label}
          </text>
        </g>
      ))}

      {/* Blind Spots */}
      {showBlindSpots && blindSpots.map((spot) => (
        <rect
          key={spot.id}
          x={spot.x * S} y={spot.y * S}
          width={spot.w * S} height={spot.h * S}
          fill={spot.severity === 'critique' ? '#EF4444' : spot.severity === 'elevee' ? '#F59E0B' : '#FB923C'}
          fillOpacity={0.25}
          stroke={spot.severity === 'critique' ? '#EF4444' : spot.severity === 'elevee' ? '#F59E0B' : '#FB923C'}
          strokeOpacity={0.6} strokeWidth={1} strokeDasharray="6 3" rx={2}
          className="cursor-pointer"
          onClick={() => onSelectEntity(spot.id, 'zone')}
        />
      ))}

      {/* Door Markers */}
      {doors.map((door) => (
        <g key={door.id} className="cursor-pointer" onClick={() => onSelectEntity(door.id, 'door')}>
          <rect
            x={door.x * S - 5} y={door.y * S - 3}
            width={10} height={6} rx={1}
            fill={door.isExit ? '#22c55e' : door.hasBadge ? '#3b82f6' : '#94a3b8'}
            fillOpacity={0.8}
            stroke={selectedEntityId === door.id ? '#b38a5a' : '#fff'}
            strokeWidth={selectedEntityId === door.id ? 1.5 : 0.5}
          />
          <text x={door.x * S} y={door.y * S - 6} textAnchor="middle" fill="#94a3b8" fontSize={6} fontFamily="system-ui">
            {door.label}
          </text>
        </g>
      ))}

      {/* Transitions */}
      {showTransitions && transitions.map((tr) => (
        <g key={tr.id} className="cursor-pointer" onClick={() => onSelectEntity(tr.id, 'transition')}>
          <circle cx={tr.x * S} cy={tr.y * S} r={10} fill={tr.pmr ? '#8B5CF6' : '#6366F1'} fillOpacity={0.7} stroke="#fff" strokeWidth={1} />
          <text x={tr.x * S} y={tr.y * S + 1} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} fontWeight="bold">
            {transitionIcon(tr.type)}
          </text>
          <text x={tr.x * S} y={tr.y * S - 14} textAnchor="middle" fill="#A5B4FC" fontSize={7} fontFamily="system-ui">
            {tr.label}
          </text>
          {selectedEntityId === tr.id && (
            <circle cx={tr.x * S} cy={tr.y * S} r={14} fill="none" stroke="#A5B4FC" strokeWidth={1.5} strokeDasharray="4 2" />
          )}
        </g>
      ))}
    </FloorPlanCanvas>
  )
}
