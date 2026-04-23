// ═══ Bottlenecks Overlay ═══
//
// SVG overlay positionné au-dessus du plan : marqueurs colorés
// pour chaque BottleneckIssue (PC-06).
//
// Sévérités :
//   - critical : rouge + animation pulse
//   - high     : orange
//   - medium   : ambre
//   - low      : bleu
//
// Tooltip au survol : description + métrique + recommandation.
// Click → callback onIssueClick.

import { useState } from 'react'
import type {
  BottleneckReport, BottleneckIssue, BottleneckSeverity,
} from '../../vol3-parcours/engines/bottleneckDetectionEngine'

interface Props {
  report: BottleneckReport
  /** Conversion coordonnées monde (m) → pixels écran. */
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  width: number
  height: number
  onIssueClick?: (issue: BottleneckIssue) => void
  /** Filtre par kind (vide = tout). */
  kindFilter?: BottleneckIssue['kind'][]
  /** Filtre par sévérité minimale. */
  minSeverity?: BottleneckSeverity
}

const SEVERITY_RANK: Record<BottleneckSeverity, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
}

const SEVERITY_COLOR: Record<BottleneckSeverity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
}

const KIND_GLYPH: Record<BottleneckIssue['kind'], string> = {
  'narrow-passage': '⇆',
  'congestion-zone': '●',
  'signage-blind-spot': '?',
  'traffic-cross': '✚',
  'dead-end': '⊘',
}

const KIND_LABEL: Record<BottleneckIssue['kind'], string> = {
  'narrow-passage': 'Goulot',
  'congestion-zone': 'Congestion',
  'signage-blind-spot': 'Angle mort',
  'traffic-cross': 'Carrefour',
  'dead-end': 'Cul-de-sac',
}

export function BottlenecksOverlay({
  report, worldToScreen, width, height, onIssueClick,
  kindFilter, minSeverity = 'low',
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const minRank = SEVERITY_RANK[minSeverity]

  const visible = report.issues.filter(i => {
    if (SEVERITY_RANK[i.severity] < minRank) return false
    if (kindFilter && kindFilter.length > 0 && !kindFilter.includes(i.kind)) return false
    return true
  })

  const hovered = visible.find(i => i.id === hoveredId)

  return (
    <svg
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <defs>
        <style>{`
          @keyframes pulse-bottleneck {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50%      { transform: scale(1.25); opacity: 1; }
          }
          .bn-critical { animation: pulse-bottleneck 1.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
        `}</style>
      </defs>

      {visible.map(issue => {
        const p = worldToScreen(issue.position.x, issue.position.y)
        const color = SEVERITY_COLOR[issue.severity]
        const r = issue.severity === 'critical' ? 14 : issue.severity === 'high' ? 12 : 10
        return (
          <g
            key={issue.id}
            transform={`translate(${p.x}, ${p.y})`}
            className={issue.severity === 'critical' ? 'bn-critical' : ''}
            style={{ pointerEvents: 'auto', cursor: onIssueClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHoveredId(issue.id)}
            onMouseLeave={() => setHoveredId(prev => prev === issue.id ? null : prev)}
            onClick={() => onIssueClick?.(issue)}
          >
            <circle r={r + 3} fill={color} fillOpacity={0.18} />
            <circle r={r} fill={color} fillOpacity={0.7} stroke="white" strokeWidth={1.5} />
            <text
              textAnchor="middle"
              dy="0.35em"
              fontSize={r}
              fontWeight="bold"
              fill="white"
              style={{ userSelect: 'none' }}
            >
              {KIND_GLYPH[issue.kind]}
            </text>
          </g>
        )
      })}

      {/* Tooltip */}
      {hovered && (() => {
        const p = worldToScreen(hovered.position.x, hovered.position.y)
        const tw = 240
        const th = 96
        const tx = Math.min(width - tw - 8, p.x + 18)
        const ty = Math.max(8, p.y - th - 18)
        return (
          <g transform={`translate(${tx}, ${ty})`} style={{ pointerEvents: 'none' }}>
            <rect
              width={tw} height={th} rx={6}
              fill="rgba(15,23,42,0.96)"
              stroke={SEVERITY_COLOR[hovered.severity]}
              strokeWidth={1.5}
            />
            <text x={10} y={18} fill={SEVERITY_COLOR[hovered.severity]} fontSize={11} fontWeight="bold">
              {KIND_LABEL[hovered.kind]} · {hovered.severity.toUpperCase()}
            </text>
            <text x={10} y={36} fill="#e2e8f0" fontSize={10}>
              {hovered.description.slice(0, 48)}{hovered.description.length > 48 ? '…' : ''}
            </text>
            <text x={10} y={52} fill="#94a3b8" fontSize={10}>
              {hovered.metric.name}: {hovered.metric.value.toFixed(2)} {hovered.metric.unit}
              {hovered.metric.threshold !== undefined ? ` (seuil ${hovered.metric.threshold})` : ''}
            </text>
            <text x={10} y={72} fill="#fbbf24" fontSize={10}>
              ➜ {hovered.recommendation.slice(0, 52)}{hovered.recommendation.length > 52 ? '…' : ''}
            </text>
            {onIssueClick && (
              <text x={10} y={88} fill="#60a5fa" fontSize={9} fontStyle="italic">
                Clic pour détails
              </text>
            )}
          </g>
        )
      })()}

      {/* Légende */}
      <g transform={`translate(${width - 130}, 12)`} style={{ pointerEvents: 'none' }}>
        <rect width={120} height={86} rx={4} fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.1)" />
        <text x={8} y={14} fill="#e2e8f0" fontSize={9} fontWeight="bold">
          Score fluidité : {report.fluidityScore}/100
        </text>
        {(['critical', 'high', 'medium', 'low'] as const).map((s, i) => (
          <g key={s} transform={`translate(8, ${24 + i * 14})`}>
            <circle cx={5} cy={5} r={4} fill={SEVERITY_COLOR[s]} />
            <text x={14} y={9} fill="#cbd5e1" fontSize={9}>
              {s} · {report.bySeverity[s]}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
