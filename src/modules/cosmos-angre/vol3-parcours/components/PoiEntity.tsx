import React, { memo } from 'react'
import type { POI } from '../../shared/proph3t/types'

interface PoiEntityProps {
  poi: POI
  isSelected: boolean
  onClick: () => void
}

function iconAbbrev(icon: string): string {
  const map: Record<string, string> = {
    'door-open': 'EN', store: 'ST', utensils: 'RS', crown: 'VIP',
    restroom: 'WC', elevator: 'ASC', escalator: 'ESC', 'info-circle': 'i',
    prescription: 'PH', 'cash-register': 'CA', car: 'PK',
  }
  return map[icon] ?? icon.slice(0, 2).toUpperCase()
}

const PoiEntity = memo(function PoiEntity({ poi, isSelected, onClick }: PoiEntityProps) {
  return (
    <g transform={`translate(${poi.x}, ${poi.y})`} onClick={onClick} className="cursor-pointer">
      <circle
        r={3.5} fill={poi.color}
        stroke={isSelected ? '#10B981' : '#1F2937'}
        strokeWidth={isSelected ? 1.2 : 0.6}
        opacity={0.9}
      />
      <text y={0.8} textAnchor="middle" fill="white" fontSize={2.2} fontWeight="bold" style={{ pointerEvents: 'none' }}>
        {iconAbbrev(poi.icon)}
      </text>
      {poi.pmr && (
        <circle cx={3} cy={-3} r={1.2} fill="#06b6d4" stroke="#0a0a0f" strokeWidth={0.3} />
      )}
      <title>{poi.label}{poi.pmr ? ' (PMR)' : ''}</title>
    </g>
  )
})

export default PoiEntity
