// ═══ VOL.4 · Vue plan avec itinéraire ═══
//
// Rendu du plan importé + overlay SVG :
//   • position courante (point bleu animé)
//   • itinéraire lissé Catmull-Rom
//   • nœuds clés (entrées, transits, favoris)
//   • marqueur destination

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlanEngineStore } from '../../shared/stores/planEngineStore'
import { usePlanImportStore } from '../../shared/stores/planImportStore'
import { useVol4Store } from '../store/vol4Store'
import { smoothCatmullRom, simplifyRDP } from '../engines/astarEngine'

export default function WayfinderMapView() {
  const parsedPlan = usePlanEngineStore(s => s.parsedPlan)
  const imports = usePlanImportStore(s => s.imports)
  const { currentRoute, currentPosition, kiosks, activeKioskId } = useVol4Store()

  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const planImageUrl = useMemo(() => {
    if (!parsedPlan) return undefined
    return parsedPlan.planImageUrl
      ?? imports.find(i => i.planImageUrl)?.planImageUrl
  }, [parsedPlan, imports])

  const bounds = parsedPlan?.bounds
  const planWidth = bounds?.width ?? 0
  const planHeight = bounds?.height ?? 0

  // Fit scale
  const scale = size.w > 0 && size.h > 0 && planWidth > 0 && planHeight > 0
    ? Math.min(size.w / planWidth, size.h / planHeight) * 0.9
    : 1
  const offsetX = (size.w - planWidth * scale) / 2
  const offsetY = (size.h - planHeight * scale) / 2

  const worldToScreen = (x: number, y: number) => ({
    x: (x - (bounds?.minX ?? 0)) * scale + offsetX,
    y: (y - (bounds?.minY ?? 0)) * scale + offsetY,
  })

  // Path lissé
  const smoothedPath = useMemo(() => {
    if (!currentRoute) return null
    const simplified = simplifyRDP(currentRoute.waypoints.map(w => ({ x: w.x, y: w.y })), 0.5)
    return smoothCatmullRom(simplified, 6)
  }, [currentRoute])

  const pathD = useMemo(() => {
    if (!smoothedPath || smoothedPath.length < 2) return ''
    return smoothedPath.map((p, i) => {
      const s = worldToScreen(p.x, p.y)
      return `${i === 0 ? 'M' : 'L'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`
    }).join(' ')
  }, [smoothedPath, scale, offsetX, offsetY])

  const activeKiosk = kiosks.find(k => k.id === activeKioskId)
  const displayPosition = currentPosition ?? (activeKiosk ? {
    x: activeKiosk.x, y: activeKiosk.y, floorId: activeKiosk.floorId,
  } : null)

  if (!parsedPlan) {
    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-slate-950/50 text-slate-600 text-sm">
        Importez un plan pour afficher la carte
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-950/60">
      {/* Plan image */}
      {planImageUrl && planWidth > 0 && planHeight > 0 && (
        <img
          src={planImageUrl}
          alt="Plan"
          className="absolute pointer-events-none"
          style={{
            left: offsetX,
            top: offsetY,
            width: planWidth * scale,
            height: planHeight * scale,
            opacity: 0.8,
            userSelect: 'none',
          }}
          draggable={false}
        />
      )}

      {/* SVG overlay */}
      <svg className="absolute inset-0 pointer-events-none" width={size.w} height={size.h}>
        {/* Path avec animation */}
        {pathD && (
          <>
            <path d={pathD}
              fill="none" stroke="#0ea5e9" strokeWidth={6}
              strokeLinecap="round" strokeLinejoin="round"
              opacity={0.3}
              filter="url(#glow)" />
            <path d={pathD}
              fill="none" stroke="#38bdf8" strokeWidth={3.5}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="8 4"
              style={{ animation: 'dashFlow 1.2s linear infinite' }} />
          </>
        )}

        {/* Marqueurs start/end */}
        {currentRoute && currentRoute.waypoints.length > 0 && (() => {
          const start = currentRoute.waypoints[0]
          const end = currentRoute.waypoints[currentRoute.waypoints.length - 1]
          const s1 = worldToScreen(start.x, start.y)
          const s2 = worldToScreen(end.x, end.y)
          return (
            <>
              <circle cx={s1.x} cy={s1.y} r={8} fill="#34d399" stroke="white" strokeWidth={2} />
              <circle cx={s2.x} cy={s2.y} r={10} fill="#f59e0b" stroke="white" strokeWidth={2} />
              <text x={s2.x} y={s2.y - 14} fontSize={11} fill="#f59e0b"
                fontWeight="bold" textAnchor="middle">🏁</text>
            </>
          )
        })()}

        {/* Position courante */}
        {displayPosition && (() => {
          const p = worldToScreen(displayPosition.x, displayPosition.y)
          return (
            <g>
              <circle cx={p.x} cy={p.y} r={16} fill="#0ea5e9" opacity={0.2}
                style={{ animation: 'pulseGrow 2s ease-out infinite' }} />
              <circle cx={p.x} cy={p.y} r={8} fill="#0ea5e9" opacity={0.5} />
              <circle cx={p.x} cy={p.y} r={5} fill="#38bdf8" stroke="white" strokeWidth={2} />
            </g>
          )
        })()}

        {/* Kiosks */}
        {kiosks.map(k => {
          const p = worldToScreen(k.x, k.y)
          const isActive = activeKioskId === k.id
          return (
            <g key={k.id}>
              <rect x={p.x - 7} y={p.y - 7} width={14} height={14} rx={2}
                fill={isActive ? '#38bdf8' : '#64748b'}
                stroke="white" strokeWidth={1.5} opacity={isActive ? 1 : 0.7} />
              <text x={p.x} y={p.y - 10} fontSize={8} fill="white" textAnchor="middle">{k.label}</text>
            </g>
          )
        })}

        {/* Defs : filters */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
      </svg>

      {/* Info overlay */}
      {currentRoute && (
        <div className="absolute top-3 left-3 rounded-lg bg-slate-900/80 border border-sky-500/30 backdrop-blur px-3 py-2 text-[11px] text-slate-200 pointer-events-none">
          <div className="flex items-center gap-3">
            <span>{Math.round(currentRoute.lengthM)} m</span>
            <span className="text-slate-500">·</span>
            <span>{Math.round(currentRoute.durationS / 60)} min</span>
            <span className="text-slate-500">·</span>
            <span className="text-sky-400 uppercase text-[9px]">{currentRoute.mode}</span>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes dashFlow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes pulseGrow {
          0%, 100% { r: 12; opacity: 0.3; }
          50% { r: 22; opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}
