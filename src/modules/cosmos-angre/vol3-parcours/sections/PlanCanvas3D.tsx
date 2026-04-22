import type { Floor, Zone, POI, SignageItem, MomentCle, PathResult } from '../../shared/proph3t/types'
import FloorPlanCanvas from '../../shared/components/FloorPlanCanvas'

interface PlanCanvas3DProps {
  floor: Floor
  zones: Zone[]
  pois: POI[]
  signageItems: SignageItem[]
  moments: MomentCle[]
  currentPath: PathResult | null
  showSignage: boolean
  showWayfinding: boolean
  showMoments: boolean
  selectedEntityId: string | null
  onSelectEntity: (id: string | null, type: 'poi' | 'signage' | 'moment' | null) => void
}

function iconAbbrev(icon: string): string {
  const map: Record<string, string> = {
    'door-open': 'EN', store: 'ST', utensils: 'RS', crown: 'VIP',
    restroom: 'WC', elevator: 'ASC', escalator: 'ESC', 'info-circle': 'i',
    prescription: 'PH', 'cash-register': 'CA', car: 'PK',
  }
  return map[icon] ?? icon.slice(0, 2).toUpperCase()
}

function signageColor(type: string): string {
  if (type.startsWith('totem')) return '#F59E0B'
  if (type.includes('pmr') || type.includes('pictogramme')) return '#3B82F6'
  if (type.includes('sortie') || type.includes('secours') || type.includes('bloc')) return '#EF4444'
  if (type.includes('dir')) return '#10B981'
  return '#8B5CF6'
}

export default function PlanCanvas3D({
  floor, zones, pois, signageItems, moments, currentPath,
  showSignage, showWayfinding, showMoments, selectedEntityId, onSelectEntity,
}: PlanCanvas3DProps) {
  const sortedMoments = [...moments].sort((a, b) => a.number - b.number)

  return (
    <FloorPlanCanvas floor={floor} zones={zones}>
      {/* POI Markers */}
      {pois.map((poi) => (
        <g
          key={poi.id}
          transform={`translate(${poi.x}, ${poi.y})`}
          onClick={() => onSelectEntity(poi.id, 'poi')}
          className="cursor-pointer"
        >
          <circle
            r={3.5} fill={poi.color}
            stroke={selectedEntityId === poi.id ? '#10B981' : '#1F2937'}
            strokeWidth={selectedEntityId === poi.id ? 1.2 : 0.6}
            opacity={0.9}
          />
          <text y={0.8} textAnchor="middle" fill="white" fontSize={2.2} fontWeight="bold" style={{ pointerEvents: 'none' }}>
            {iconAbbrev(poi.icon)}
          </text>
          <title>{poi.label}</title>
        </g>
      ))}

      {/* Signage Items */}
      {showSignage && signageItems.map((sig) => {
        const col = signageColor(sig.type)
        return (
          <g
            key={sig.id}
            transform={`translate(${sig.x}, ${sig.y})`}
            onClick={() => onSelectEntity(sig.id, 'signage')}
            className="cursor-pointer"
          >
            <rect
              x={-2.5} y={-2.5} width={5} height={5}
              fill={col}
              stroke={selectedEntityId === sig.id ? '#10B981' : '#1F2937'}
              strokeWidth={selectedEntityId === sig.id ? 1.2 : 0.5}
              transform="rotate(45)" opacity={0.85}
            />
            <text y={0.8} textAnchor="middle" fill="white" fontSize={2} fontWeight="bold" style={{ pointerEvents: 'none' }}>S</text>
            <title>{sig.ref} — {sig.content ?? sig.type}</title>
          </g>
        )
      })}

      {/* Moment Badges + Journey Lines */}
      {showMoments && sortedMoments.length > 0 && (
        <g>
          {sortedMoments.map((m, i) => {
            if (i === 0) return null
            const prev = sortedMoments[i - 1]
            return (
              <line
                key={`journey-${prev.id}-${m.id}`}
                x1={prev.x} y1={prev.y} x2={m.x} y2={m.y}
                stroke="#10B981" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5}
              />
            )
          })}
          {sortedMoments.map((m) => (
            <g key={m.id} transform={`translate(${m.x}, ${m.y})`} onClick={() => onSelectEntity(m.id, 'moment')} className="cursor-pointer">
              <circle
                r={5}
                fill={selectedEntityId === m.id ? '#059669' : '#065F46'}
                stroke={selectedEntityId === m.id ? '#34D399' : '#10B981'}
                strokeWidth={selectedEntityId === m.id ? 1.5 : 0.8}
                opacity={0.9}
              />
              <text y={1.2} textAnchor="middle" fill="white" fontSize={4} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {m.number}
              </text>
              <title>Moment {m.number}: {m.name}</title>
            </g>
          ))}
        </g>
      )}

      {/* Wayfinding Path */}
      {showWayfinding && currentPath && currentPath.path.length > 1 && (
        <g>
          <polyline
            points={currentPath.path.map((n) => `${n.x},${n.y}`).join(' ')}
            fill="none" stroke="#34D399" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}
          />
          <circle cx={currentPath.path[0].x} cy={currentPath.path[0].y} r={2.5} fill="#34D399" stroke="white" strokeWidth={0.5} />
          <circle
            cx={currentPath.path[currentPath.path.length - 1].x}
            cy={currentPath.path[currentPath.path.length - 1].y}
            r={2.5} fill="#F59E0B" stroke="white" strokeWidth={0.5}
          />
        </g>
      )}
    </FloorPlanCanvas>
  )
}
