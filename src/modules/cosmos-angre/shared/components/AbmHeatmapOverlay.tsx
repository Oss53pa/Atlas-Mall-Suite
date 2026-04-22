// ═══ ABM HEATMAP OVERLAY ═══
// Heatmap SVG colorée (rouge/jaune/vert) affichant la densité piétonne
// calculée par la simulation ABM pour une tranche horaire donnée.

import { useMemo } from 'react'
import type { HeatmapGrid } from '../engines/plan-analysis/abmSocialForceEngine'
import { ABM_PARAMS } from '../engines/plan-analysis/abmSocialForceEngine'

interface Props {
  heatmap: HeatmapGrid
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  width: number
  height: number
  /** Opacité max (0..1). Défaut 0.6. */
  opacity?: number
}

/** Interpolation hex entre 3 couleurs selon la densité normalisée 0..1. */
function densityColor(d: number): string {
  // d: 0 (vert), 0.5 (jaune), 1+ (rouge) en normalisant sur la densité critique 4 p/m²
  const crit = ABM_PARAMS.criticalDensity
  const t = Math.min(1, d / crit)
  if (t < 0.5) {
    // vert → jaune
    const u = t / 0.5
    const r = Math.round(52 + (251 - 52) * u)
    const g = Math.round(211 + (191 - 211) * u)
    const b = Math.round(153 + (36 - 153) * u)
    return `rgb(${r},${g},${b})`
  } else {
    // jaune → rouge
    const u = (t - 0.5) / 0.5
    const r = Math.round(251 + (239 - 251) * u)
    const g = Math.round(191 + (68 - 191) * u)
    const b = Math.round(36 + (68 - 36) * u)
    return `rgb(${r},${g},${b})`
  }
}

export function AbmHeatmapOverlay({
  heatmap, worldToScreen, width, height, opacity = 0.55,
}: Props) {
  // Pré-calcul rectangles non vides
  const cells = useMemo(() => {
    const out: Array<{ x: number; y: number; w: number; h: number; d: number; color: string }> = []
    const { width: gw, height: gh, cellM, originX, originY, density } = heatmap
    for (let j = 0; j < gh; j++) {
      for (let i = 0; i < gw; i++) {
        const d = density[j * gw + i]
        if (d < 0.05) continue
        const wx1 = originX + i * cellM
        const wy1 = originY + j * cellM
        const wx2 = wx1 + cellM
        const wy2 = wy1 + cellM
        const p1 = worldToScreen(wx1, wy1)
        const p2 = worldToScreen(wx2, wy2)
        out.push({
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          w: Math.abs(p2.x - p1.x),
          h: Math.abs(p2.y - p1.y),
          d,
          color: densityColor(d),
        })
      }
    }
    return out
  }, [heatmap, worldToScreen])

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ zIndex: 13 }}
    >
      <defs>
        <filter id="heatmap-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <g filter="url(#heatmap-blur)" opacity={opacity}>
        {cells.map((c, i) => (
          <rect
            key={i}
            x={c.x}
            y={c.y}
            width={c.w}
            height={c.h}
            fill={c.color}
          />
        ))}
      </g>

      {/* Légende */}
      <g transform={`translate(${width - 140}, ${height - 60})`}>
        <rect x={0} y={0} width={130} height={50} fill="rgba(2,6,23,0.85)" rx={4} />
        <text x={8} y={14} fontSize={9} fill="#cbd5e1" fontWeight="bold">
          Densité pers/m²
        </text>
        {[
          { label: '0', color: 'rgb(52,211,153)' },
          { label: '1', color: 'rgb(151,201,94)' },
          { label: '2', color: 'rgb(251,191,36)' },
          { label: '3', color: 'rgb(245,130,52)' },
          { label: '4+', color: 'rgb(239,68,68)' },
        ].map((s, i) => (
          <g key={i} transform={`translate(${6 + i * 24}, 20)`}>
            <rect x={0} y={0} width={22} height={14} fill={s.color} />
            <text x={11} y={28} fontSize={8} textAnchor="middle" fill="#cbd5e1">
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
