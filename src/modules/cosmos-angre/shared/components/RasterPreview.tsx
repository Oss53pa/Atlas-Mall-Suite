import React, { useMemo } from 'react'
import type { RasterRecognitionResult, RecognizedZone } from '../planReader/planReaderTypes'

interface RasterPreviewProps {
  imageUrl: string
  result: RasterRecognitionResult
  width?: number
  height?: number
  onZoneClick?: (zone: RecognizedZone) => void
  selectedZoneId?: string
}

const TYPE_COLORS: Record<string, string> = {
  commerce: '#22c55e', restauration: '#f97316', parking: '#3b82f6',
  circulation: '#a855f7', technique: '#6b7280', backoffice: '#ec4899',
  financier: '#eab308', sortie_secours: '#ef4444', loisirs: '#06b6d4',
  services: '#84cc16', hotel: '#8b5cf6', bureaux: '#64748b', exterieur: '#10b981',
}

export default function RasterPreview({
  imageUrl, result, width = 800, height = 600,
  onZoneClick, selectedZoneId,
}: RasterPreviewProps) {
  const zones = result.zones
  const walls = result.walls
  const doors = result.doors

  return (
    <div className="relative bg-gray-950 rounded-lg overflow-hidden" style={{ width, height }}>
      {/* Background image — plan original a pleine opacite */}
      <img
        src={imageUrl}
        alt="Plan scanne"
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* SVG overlay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1 1" preserveAspectRatio="none">
        {/* Walls */}
        {walls.map(wall => (
          <line
            key={wall.id}
            x1={wall.x1} y1={wall.y1}
            x2={wall.x2} y2={wall.y2}
            stroke="#f8fafc"
            strokeWidth={0.003}
            strokeOpacity={0.6}
          />
        ))}

        {/* Zones */}
        {zones.map(zone => {
          const color = TYPE_COLORS[zone.estimatedType] ?? '#888'
          const isSelected = zone.id === selectedZoneId

          return (
            <g
              key={zone.id}
              className="cursor-pointer"
              onClick={() => onZoneClick?.(zone)}
            >
              <rect
                x={zone.boundingBox.x}
                y={zone.boundingBox.y}
                width={zone.boundingBox.w}
                height={zone.boundingBox.h}
                fill={color}
                fillOpacity={0.12}
                stroke={isSelected ? '#fff' : color}
                strokeWidth={isSelected ? 0.004 : 0.002}
                strokeOpacity={0.7}
                strokeDasharray={isSelected ? '0.01 0.005' : undefined}
              />
              <text
                x={zone.boundingBox.x + zone.boundingBox.w / 2}
                y={zone.boundingBox.y + zone.boundingBox.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={0.015}
                fontFamily="system-ui"
              >
                {zone.label}
              </text>
              {/* Confidence badge */}
              <circle
                cx={zone.boundingBox.x + zone.boundingBox.w - 0.01}
                cy={zone.boundingBox.y + 0.01}
                r={0.008}
                fill={zone.confidence >= 0.8 ? '#22c55e' : zone.confidence >= 0.5 ? '#f59e0b' : '#ef4444'}
              />
            </g>
          )
        })}

        {/* Doors */}
        {doors.map(door => (
          <g key={door.id}>
            <circle
              cx={door.x} cy={door.y}
              r={0.008}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={0.002}
            />
            <line
              x1={door.x - 0.005} y1={door.y}
              x2={door.x + 0.005} y2={door.y}
              stroke="#f59e0b"
              strokeWidth={0.002}
            />
          </g>
        ))}
      </svg>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-950/80 px-3 py-2 flex items-center justify-between">
        <div className="flex gap-3 text-[10px]">
          <span className="text-gray-400">
            {zones.length} zones | {walls.length} murs | {doors.length} portes
          </span>
          <span className={`font-medium ${
            result.confidence >= 0.8 ? 'text-emerald-400' :
            result.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'
          }`}>
            Confiance : {Math.round(result.confidence * 100)}%
          </span>
        </div>
        {result.floorLevel && (
          <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
            {result.floorLevel}
          </span>
        )}
      </div>
    </div>
  )
}
