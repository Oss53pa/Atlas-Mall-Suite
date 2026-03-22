import { useState, useEffect, useCallback, useRef } from 'react'
import type { RefObject } from 'react'

// ═══ TYPES ═══

interface GestureOptions {
  minZoom?: number
  maxZoom?: number
  longPressMs?: number
  onLongPress?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
}

type GestureState = 'idle' | 'panning' | 'pinching' | 'longpress'

interface GestureResult {
  zoom: number
  panX: number
  panY: number
  resetView: () => void
  gestureState: GestureState
}

// ═══ HELPERS ═══

function touchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function touchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  }
}

// ═══ HOOK ═══

export function useGestures(
  svgRef: RefObject<SVGSVGElement | HTMLElement | null>,
  options: GestureOptions = {}
): GestureResult {
  const {
    minZoom = 0.1,
    maxZoom = 5,
    longPressMs = 500,
    onLongPress,
    onDoubleTap,
  } = options

  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [gestureState, setGestureState] = useState<GestureState>('idle')

  // Refs for gesture tracking
  const lastTouchDistRef = useRef(0)
  const lastTouchMidRef = useRef({ x: 0, y: 0 })
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)
  const touchCountRef = useRef(0)
  const isMouseDownRef = useRef(false)

  const clampZoom = useCallback(
    (z: number) => Math.min(maxZoom, Math.max(minZoom, z)),
    [minZoom, maxZoom]
  )

  const resetView = useCallback(() => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setGestureState('idle')
  }, [])

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    // ── TOUCH HANDLERS ──

    const handleTouchStart = (e: TouchEvent) => {
      touchCountRef.current = e.touches.length

      if (e.touches.length === 1) {
        const touch = e.touches[0]
        panStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          panX,
          panY,
        }
        setGestureState('panning')

        // Long press detection
        clearLongPress()
        longPressTimerRef.current = setTimeout(() => {
          setGestureState('longpress')
          onLongPress?.(touch.clientX, touch.clientY)
        }, longPressMs)

        // Double tap detection
        const now = Date.now()
        if (now - lastTapTimeRef.current < 300) {
          clearLongPress()
          const rect = el.getBoundingClientRect()
          const tapX = touch.clientX - rect.left
          const tapY = touch.clientY - rect.top
          onDoubleTap?.(tapX, tapY)
          setZoom((prev) => clampZoom(prev * 2))
          lastTapTimeRef.current = 0
        } else {
          lastTapTimeRef.current = now
        }
      }

      if (e.touches.length === 2) {
        clearLongPress()
        setGestureState('pinching')
        lastTouchDistRef.current = touchDistance(e.touches[0], e.touches[1])
        lastTouchMidRef.current = touchMidpoint(e.touches[0], e.touches[1])
      }

      e.preventDefault()
    }

    const handleTouchMove = (e: TouchEvent) => {
      clearLongPress()

      if (e.touches.length === 1 && touchCountRef.current === 1) {
        // Single finger pan
        const touch = e.touches[0]
        const dx = touch.clientX - panStartRef.current.x
        const dy = touch.clientY - panStartRef.current.y
        setPanX(panStartRef.current.panX + dx)
        setPanY(panStartRef.current.panY + dy)
      }

      if (e.touches.length === 2) {
        // Pinch zoom
        const newDist = touchDistance(e.touches[0], e.touches[1])
        const newMid = touchMidpoint(e.touches[0], e.touches[1])

        if (lastTouchDistRef.current > 0) {
          const scale = newDist / lastTouchDistRef.current
          setZoom((prev) => clampZoom(prev * scale))

          // Pan to keep the midpoint centered
          const midDx = newMid.x - lastTouchMidRef.current.x
          const midDy = newMid.y - lastTouchMidRef.current.y
          setPanX((prev) => prev + midDx)
          setPanY((prev) => prev + midDy)
        }

        lastTouchDistRef.current = newDist
        lastTouchMidRef.current = newMid
        setGestureState('pinching')
      }

      e.preventDefault()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      clearLongPress()
      touchCountRef.current = e.touches.length

      if (e.touches.length === 0) {
        setGestureState('idle')
        lastTouchDistRef.current = 0
      } else if (e.touches.length === 1) {
        // Went from 2 fingers to 1 — re-init pan start
        const touch = e.touches[0]
        panStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          panX,
          panY,
        }
        setGestureState('panning')
      }
    }

    // ── MOUSE HANDLERS (for desktop) ──

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX,
        panY,
      }
      setGestureState('panning')
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current) return
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setPanX(panStartRef.current.panX + dx)
      setPanY(panStartRef.current.panY + dy)
    }

    const handleMouseUp = () => {
      isMouseDownRef.current = false
      setGestureState('idle')
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const rect = el.getBoundingClientRect()

      // Zoom toward cursor position
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top

      setZoom((prev) => {
        const newZoom = clampZoom(prev * delta)
        const scaleFactor = newZoom / prev
        setPanX((px) => cursorX - scaleFactor * (cursorX - px))
        setPanY((py) => cursorY - scaleFactor * (cursorY - py))
        return newZoom
      })
    }

    const handleDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const tapX = e.clientX - rect.left
      const tapY = e.clientY - rect.top
      onDoubleTap?.(tapX, tapY)
      setZoom((prev) => clampZoom(prev * 2))
    }

    // ── REGISTER ──

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('mousedown', handleMouseDown)
    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseup', handleMouseUp)
    el.addEventListener('mouseleave', handleMouseUp)
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('dblclick', handleDblClick)

    return () => {
      clearLongPress()
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('mousedown', handleMouseDown)
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseup', handleMouseUp)
      el.removeEventListener('mouseleave', handleMouseUp)
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('dblclick', handleDblClick)
    }
    // We intentionally use panX/panY from the closure at the time of registration.
    // The refs capture the start state for delta calculations.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef, minZoom, maxZoom, longPressMs, onLongPress, onDoubleTap, clampZoom, clearLongPress])

  return { zoom, panX, panY, resetView, gestureState }
}
