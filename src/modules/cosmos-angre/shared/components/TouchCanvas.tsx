import React, { useCallback, useRef } from 'react'

interface TouchCanvasProps {
  children: React.ReactNode
  onZoom: (scale: number, centerX: number, centerY: number) => void
  onPan: (dx: number, dy: number) => void
  onLongPress?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
  className?: string
}

export default function TouchCanvas({
  children, onZoom, onPan, onLongPress, onDoubleTap, className = '',
}: TouchCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStateRef = useRef({
    lastDist: 0,
    lastCenter: { x: 0, y: 0 },
    lastTap: 0,
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    isPinching: false,
  })

  const getTouchDist = (t1: React.Touch, t2: React.Touch): number => {
    return Math.sqrt((t2.clientX - t1.clientX) ** 2 + (t2.clientY - t1.clientY) ** 2)
  }

  const getTouchCenter = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const state = touchStateRef.current

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer)
      state.longPressTimer = null
    }

    if (e.touches.length === 2) {
      e.preventDefault()
      state.isPinching = true
      state.lastDist = getTouchDist(e.touches[0], e.touches[1])
      state.lastCenter = getTouchCenter(e.touches[0], e.touches[1])
    } else if (e.touches.length === 1) {
      state.isPinching = false
      state.lastCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY }

      // Double tap detection
      const now = Date.now()
      if (now - state.lastTap < 300) {
        onDoubleTap?.(e.touches[0].clientX, e.touches[0].clientY)
        state.lastTap = 0
      } else {
        state.lastTap = now
      }

      // Long press detection
      const lx = e.touches[0].clientX
      const ly = e.touches[0].clientY
      state.longPressTimer = setTimeout(() => {
        onLongPress?.(lx, ly)
      }, 500)
    }
  }, [onDoubleTap, onLongPress])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const state = touchStateRef.current

    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer)
      state.longPressTimer = null
    }

    if (e.touches.length === 2) {
      e.preventDefault()
      const dist = getTouchDist(e.touches[0], e.touches[1])
      const center = getTouchCenter(e.touches[0], e.touches[1])

      if (state.lastDist > 0) {
        const scaleFactor = dist / state.lastDist
        onZoom(scaleFactor, center.x, center.y)
      }

      const dx = center.x - state.lastCenter.x
      const dy = center.y - state.lastCenter.y
      onPan(dx, dy)

      state.lastDist = dist
      state.lastCenter = center
    } else if (e.touches.length === 1 && !state.isPinching) {
      const dx = e.touches[0].clientX - state.lastCenter.x
      const dy = e.touches[0].clientY - state.lastCenter.y
      onPan(dx, dy)
      state.lastCenter = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [onZoom, onPan])

  const handleTouchEnd = useCallback(() => {
    const state = touchStateRef.current
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer)
      state.longPressTimer = null
    }
    state.lastDist = 0
    state.isPinching = false
  }, [])

  return (
    <div
      ref={containerRef}
      className={`touch-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}
