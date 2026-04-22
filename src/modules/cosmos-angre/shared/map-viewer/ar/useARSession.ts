// ═══ useARSession — WebXR immersive-ar session lifecycle ═══
//
// State machine:
//   unsupported → (check) → idle → requesting → active → ended
//                                               ↕ error
//
// Features requested:
//   required : hit-test  (surface detection)
//   optional : dom-overlay (HTML UI on top of camera feed)
//              local-floor (floor-relative reference space)
//              anchors     (persistent spatial anchors — ARKit/ARCore)

import { useState, useCallback, useRef, useEffect } from 'react'

export type ARSessionState =
  | 'checking'
  | 'unsupported'
  | 'idle'
  | 'requesting'
  | 'active'
  | 'ended'
  | 'error'

export interface ARSessionResult {
  state: ARSessionState
  error: string | null
  session: XRSession | null
  hitTestSource: XRHitTestSource | null
  /** Enter AR — requests the XRSession. domOverlayRoot = element for DOM overlay. */
  enterAR: (domOverlayRoot?: Element) => Promise<void>
  /** End the current session. */
  exitAR: () => Promise<void>
}

export function useARSession(): ARSessionResult {
  const [state, setState]                       = useState<ARSessionState>('checking')
  const [error, setError]                       = useState<string | null>(null)
  const [session, setSession]                   = useState<XRSession | null>(null)
  const [hitTestSource, setHitTestSource]       = useState<XRHitTestSource | null>(null)
  const sessionRef                              = useRef<XRSession | null>(null)
  const hitTestSourceRef                        = useRef<XRHitTestSource | null>(null)

  // ── Feature detection ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.xr) {
      setState('unsupported')
      return
    }
    navigator.xr.isSessionSupported('immersive-ar')
      .then((supported) => setState(supported ? 'idle' : 'unsupported'))
      .catch(() => setState('unsupported'))
  }, [])

  // ── Enter AR ──────────────────────────────────────────────────────────────
  const enterAR = useCallback(async (domOverlayRoot?: Element) => {
    if (!navigator.xr) { setError('WebXR non disponible sur cet appareil.'); return }
    if (state !== 'idle' && state !== 'ended') return

    setState('requesting')
    setError(null)

    try {
      const sessionInit: XRSessionInit = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: [
          'dom-overlay',
          'local-floor',
          'anchors',
          'light-estimation',
        ],
        ...(domOverlayRoot ? { domOverlay: { root: domOverlayRoot } } : {}),
      }

      const xrSession = await navigator.xr.requestSession('immersive-ar', sessionInit)
      sessionRef.current = xrSession
      setSession(xrSession)
      setState('active')

      // Set up hit-test source
      try {
        const refSpace = await xrSession.requestReferenceSpace('viewer')
        const src      = await xrSession.requestHitTestSource!({ space: refSpace })
        hitTestSourceRef.current = src
        setHitTestSource(src)
      } catch {
        // Hit-test optional — continue without it
      }

      // Cleanup on session end
      xrSession.addEventListener('end', () => {
        hitTestSourceRef.current?.cancel()
        hitTestSourceRef.current = null
        setHitTestSource(null)
        sessionRef.current = null
        setSession(null)
        setState('ended')
      }, { once: true })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Impossible de démarrer la session AR : ${msg}`)
      setState('error')
    }
  }, [state])

  // ── Exit AR ───────────────────────────────────────────────────────────────
  const exitAR = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.end()
    }
  }, [])

  return { state, error, session, hitTestSource, enterAR, exitAR }
}
