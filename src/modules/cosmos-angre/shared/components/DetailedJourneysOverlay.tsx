// ═══ DETAILED JOURNEYS OVERLAY — Affiche les parcours PROPH3T sur le plan ═══
// SVG overlay avec :
//  - 1 polyline par persona (couleur distincte)
//  - waypoints numérotés (arrêts)
//  - légende sélective (on peut masquer un persona)

import React, { useState } from 'react'
import type { DetailedJourney } from '../engines/plan-analysis/detailedJourneyEngine'

interface Props {
  journeys: DetailedJourney[]
  /** Conversion mètres → pixels. */
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  /** Conteneur (pour dimensionner l'overlay). */
  width: number
  height: number
  className?: string
}

const PERSONA_COLORS: Record<string, string> = {
  'persona-famille': '#10b981',   // emerald
  'persona-pro': '#3b82f6',       // blue
  'persona-shopping': '#ec4899',  // pink
  'persona-soir': '#a855f7',      // purple
  'persona-senior': '#f59e0b',    // amber
}

function colorFor(personaId: string, index: number): string {
  if (PERSONA_COLORS[personaId]) return PERSONA_COLORS[personaId]
  const fallback = ['#10b981', '#3b82f6', '#ec4899', '#a855f7', '#f59e0b', '#14b8a6', '#f97316']
  return fallback[index % fallback.length]
}

export function DetailedJourneysOverlay({ journeys, worldToScreen, width, height, className = '' }: Props) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(journeys.map(j => j.personaId)))
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null)

  const togglePersona = (personaId: string) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(personaId)) next.delete(personaId)
      else next.add(personaId)
      return next
    })
  }

  return (
    <>
      {/* SVG overlay des parcours */}
      <svg
        className={`absolute inset-0 pointer-events-none ${className}`}
        width={width}
        height={height}
        style={{ zIndex: 10 }}
      >
        {journeys.map((j, idx) => {
          if (!visible.has(j.personaId) || j.waypoints.length < 2) return null
          const color = colorFor(j.personaId, idx)
          const isHovered = hoveredPersona === j.personaId
          const opacity = hoveredPersona && !isHovered ? 0.25 : 0.9
          const strokeW = isHovered ? 4 : 2.5

          // Path polyline
          const pts = j.waypoints.map(p => worldToScreen(p.x, p.y))
          const pathD = pts.length > 0
            ? `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
            : ''

          return (
            <g key={j.personaId} opacity={opacity}>
              {/* Tracé du parcours */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={isHovered ? 'none' : '6 3'}
              />
              {/* Arrêts numérotés */}
              {j.steps.map((step, i) => {
                const p = worldToScreen(step.x, step.y)
                return (
                  <g key={`${j.personaId}-stop-${i}`}>
                    <circle cx={p.x} cy={p.y} r={10} fill={color} stroke="#fff" strokeWidth={1.5} />
                    <text
                      x={p.x} y={p.y + 3.5}
                      textAnchor="middle"
                      fontSize={10} fontWeight="bold" fill="#fff"
                    >
                      {step.order}
                    </text>
                  </g>
                )
              })}
              {/* Flèches de direction (optionnel, entre chaque step) */}
              {j.steps.length > 1 && j.steps.slice(0, -1).map((step, i) => {
                const a = worldToScreen(step.x, step.y)
                const b = worldToScreen(j.steps[i + 1].x, j.steps[i + 1].y)
                const midX = (a.x + b.x) / 2
                const midY = (a.y + b.y) / 2
                const angle = Math.atan2(b.y - a.y, b.x - a.x)
                return (
                  <polygon
                    key={`${j.personaId}-arrow-${i}`}
                    points="0,-5 10,0 0,5"
                    fill={color}
                    transform={`translate(${midX},${midY}) rotate(${(angle * 180) / Math.PI})`}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* Légende interactive */}
      <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-slate-950/90 border border-white/[0.08] p-2 max-w-xs pointer-events-auto">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">
          Parcours personas (PROPH3T)
        </div>
        <div className="space-y-1">
          {journeys.map((j, idx) => {
            const color = colorFor(j.personaId, idx)
            const isVisible = visible.has(j.personaId)
            return (
              <button
                key={j.personaId}
                onClick={() => togglePersona(j.personaId)}
                onMouseEnter={() => setHoveredPersona(j.personaId)}
                onMouseLeave={() => setHoveredPersona(null)}
                className={`w-full flex items-center gap-2 px-1.5 py-1 rounded text-[10px] transition-colors ${
                  isVisible ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-900'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: isVisible ? color : 'transparent', border: `1.5px solid ${color}` }}
                />
                <span className="flex-1 text-left truncate">{j.personaName}</span>
                <span className="text-[9px] text-slate-500 tabular-nums">
                  {j.totalDistanceM.toFixed(0)}m · {j.totalDurationMin.toFixed(0)}min
                </span>
                <span
                  className={`text-[9px] px-1 rounded ${
                    j.qualityScore >= 75 ? 'bg-emerald-900/60 text-emerald-300' :
                    j.qualityScore >= 50 ? 'bg-amber-900/60 text-amber-300' :
                    'bg-red-900/60 text-red-300'
                  }`}
                >
                  {j.qualityScore}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-white/[0.04] text-[9px] text-slate-600">
          Clic = masquer · Survol = isoler
        </div>
      </div>
    </>
  )
}
