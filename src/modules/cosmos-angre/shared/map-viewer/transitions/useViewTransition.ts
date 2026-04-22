// ═══ useViewTransition — Cross-fade + scale when switching viewer modes ═══
// 200 ms ease: fade out → swap content → fade in
// Usage:
//   const { style, transition } = useViewTransition()
//   <div style={style}>…content…</div>
//   <button onClick={() => transition(() => setMode('3d'))}>3D</button>

import { useState, useCallback } from 'react'
import type { CSSProperties } from 'react'

const DURATION_MS = 150   // half-cycle (out then in)

export function useViewTransition() {
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  const style: CSSProperties = {
    transition: `opacity ${DURATION_MS}ms ease, transform ${DURATION_MS}ms ease`,
    opacity: phase === 'in' ? 1 : 0,
    transform: phase === 'in' ? 'scale(1)' : 'scale(0.975)',
  }

  /**
   * Call with a callback that performs the actual state swap.
   * The animation fades out, runs the callback at the midpoint,
   * then fades back in.
   */
  const transition = useCallback((onMidpoint: () => void) => {
    setPhase('out')
    setTimeout(() => {
      onMidpoint()
      setPhase('in')
    }, DURATION_MS + 10)
  }, [])

  return { style, transition }
}
