// ═══ TOUR PATH OVERLAY — SVG path + numbered nodes on the 2D plan ═══
//
// Renders on top of MapViewer2D (or SpaceEditorCanvas) as an absolute SVG overlay.
// • Dashed polyline connecting all steps in order
// • Numbered circles at each step position
// • Active step highlighted
// • Click a node to jump to that step

import type { TourStep } from './stores/tourStore'

interface TourPathOverlayProps {
  steps: TourStep[]
  activeIndex: number
  /** Conversion function metres → screen pixels */
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  onStepClick?: (index: number) => void
  /** Filter to a specific floor */
  activeFloor?: string
  className?: string
}

export default function TourPathOverlay({
  steps, activeIndex, worldToScreen, onStepClick, activeFloor, className = '',
}: TourPathOverlayProps) {
  if (!steps.length) return null

  // Filter steps to active floor if specified
  const visibleSteps = activeFloor
    ? steps.filter((s) => s.floorLevel === activeFloor)
    : steps

  if (!visibleSteps.length) return null

  // Screen positions
  const positions = visibleSteps.map((s) => worldToScreen(s.x, s.y))

  // Build polyline points
  const polylinePoints = positions.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 15 }}
    >
      <defs>
        {/* Arrowhead marker */}
        <marker
          id="tour-arrow"
          markerWidth="8" markerHeight="8"
          refX="5" refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="#22d3ee" opacity={0.8} />
        </marker>
        {/* Glow filter for active node */}
        <filter id="tour-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Path line */}
      {positions.length > 1 && (
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeOpacity={0.5}
          strokeDasharray="6 4"
          markerMid="url(#tour-arrow)"
        />
      )}

      {/* Step nodes */}
      {visibleSteps.map((step, i) => {
        const pos = positions[i]
        const globalIndex = steps.findIndex((s) => s.id === step.id)
        const isActive = globalIndex === activeIndex
        const isPast   = globalIndex < activeIndex

        return (
          <g
            key={step.id}
            transform={`translate(${pos.x}, ${pos.y})`}
            className="cursor-pointer"
            style={{ pointerEvents: 'all' }}
            onClick={() => onStepClick?.(globalIndex)}
          >
            {/* Outer ring for active */}
            {isActive && (
              <circle
                r={18}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={1.5}
                strokeOpacity={0.4}
                strokeDasharray="4 3"
                filter="url(#tour-glow)"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0" to="360"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {/* Main circle */}
            <circle
              r={isActive ? 13 : 10}
              fill={isActive ? '#22d3ee' : isPast ? '#0e7490' : '#1e3a5f'}
              stroke={isActive ? '#fff' : '#22d3ee'}
              strokeWidth={isActive ? 2 : 1}
              strokeOpacity={isActive ? 1 : 0.6}
              filter={isActive ? 'url(#tour-glow)' : undefined}
              style={{ transition: 'r 0.2s ease' }}
            />
            {/* Number */}
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isActive ? '#0f172a' : isPast ? '#a5f3fc' : '#7dd3fc'}
              fontSize={isActive ? 10 : 9}
              fontWeight={700}
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {step.order + 1}
            </text>
            {/* Label (shown on active step) */}
            {isActive && (
              <text
                x={0} y={-20}
                textAnchor="middle"
                fill="#22d3ee"
                fontSize={9}
                fontWeight={600}
                fontFamily="system-ui, sans-serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {step.title.length > 22 ? step.title.slice(0, 21) + '…' : step.title}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
