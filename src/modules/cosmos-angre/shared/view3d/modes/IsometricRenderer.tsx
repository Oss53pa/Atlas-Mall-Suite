// ═══ ISOMETRIC RENDERER — Phase 2: explosion dépliage animation ═══
//
// • Reads config.explodeLevel (0 = stacked, 1 = exploded)
// • Animates smoothly via requestAnimationFrame lerp when explodeLevel changes
// • Reads config.isolatedFloorId — opacity already managed in floorStack
// • Regenerates SVG string via buildIsoScene with modified baseElevationM per
//   animation frame while the transition is in progress

import { useMemo, useEffect, useRef, useState } from 'react'
import type { View3DData, View3DConfig } from '../types/view3dTypes'
import { buildIsoScene, generateIsoSVG } from '../engines/isometricEngine'

/** Extra vertical separation per floor index when fully exploded (metres). */
const EXPLODE_GAP_M = 8

/** Exponential smoothing factor per frame (~16 ms). */
const LERP_K = 0.12

// Floor level order map for sorting
const LEVEL_ORDER: Record<string, number> = {
  B2: 0, B1: 1, RDC: 2, 'R+1': 3, 'R+2': 4, 'R+3': 5, Terrasse: 6,
}

interface Props { data: View3DData; config: View3DConfig }

export default function IsometricRenderer({ data, config }: Props) {
  // ── Animated explode level ────────────────────────────────────────────────
  const [animExplode, setAnimExplode] = useState(config.explodeLevel ?? 0)
  const animRef   = useRef(animExplode)
  const targetRef = useRef(config.explodeLevel ?? 0)
  const rafRef    = useRef<number | null>(null)

  targetRef.current = config.explodeLevel ?? 0

  useEffect(() => {
    const tick = () => {
      const target  = targetRef.current
      const current = animRef.current
      const delta   = target - current
      if (Math.abs(delta) < 0.0015) {
        animRef.current = target
        setAnimExplode(target)
        rafRef.current = null
        return
      }
      const next = current + delta * LERP_K
      animRef.current = next
      setAnimExplode(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick)
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [config.explodeLevel])

  // ── Build config with exploded floor elevations ───────────────────────────
  const animatedConfig = useMemo<View3DConfig>(() => {
    if (animExplode < 0.001) return config
    const sorted = [...config.floorStack].sort(
      (a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9),
    )
    return {
      ...config,
      floorStack: config.floorStack.map((fs) => {
        const idx = sorted.findIndex((s) => s.floorId === fs.floorId)
        return { ...fs, baseElevationM: fs.baseElevationM + idx * animExplode * EXPLODE_GAP_M }
      }),
    }
  }, [config, animExplode])

  // ── SVG string (expensive, memoised) ─────────────────────────────────────
  const svgString = useMemo(() => {
    if (!animatedConfig.floorStack.length || !data.zones.length) return ''
    const scene = buildIsoScene(data, animatedConfig, 60)
    return generateIsoSVG(scene, data, animatedConfig)
  }, [data, animatedConfig])

  if (!svgString) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">
        Aucune zone à afficher
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4">
      <div dangerouslySetInnerHTML={{ __html: svgString }} className="max-w-full max-h-full" />

      {/* Explosion badge */}
      {animExplode > 0.04 && (
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-[10px] font-medium pointer-events-none select-none">
          Dépliage {Math.round(animExplode * 100)}%
        </div>
      )}
    </div>
  )
}
