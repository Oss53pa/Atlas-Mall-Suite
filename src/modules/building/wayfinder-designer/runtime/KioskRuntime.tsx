// ═══ KioskRuntime — runtime borne autonome ═══
//
// Référence CDC §08. Page plein écran sans UI admin, accessible via
// /kiosk/:kioskId. Fonctionnalités obligatoires :
//   - Attract loop / screensaver (15-120s configurable)
//   - Reset auto après attract
//   - QR transfert mobile (deep link)
//   - Mode accessibilité PMR (toggle grand contraste + grande typo)
//   - Multilangue runtime (changement instantané)
//   - Offline resilience via Service Worker (72h)
//   - Télémétrie asynchrone vers analytics Vol.4
//   - Watchdog auto-reload sur crash + heartbeat 60s
//   - Désactivation clic droit / F12 / raccourcis non-kiosque

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Search, ArrowLeft, RotateCcw, Accessibility, Languages, Wifi, WifiOff, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useDesignerStore } from '../store/designerStore'
import { injectCssVariables, loadBrandFonts, applyDocumentDirection } from '../engines/brandEngine'
import { logTelemetry, sessionHash, makeSessionHash } from './telemetry'
import { TouchKeyboard } from './TouchKeyboard'
import { MapRenderer } from '../templates/shared/MapRenderer'
import { useKioskAdapter } from './KioskAdapter'
import type { LocaleCode, InjectedPlanData } from '../types'

// ─── Watchdog : reload sur erreur globale ────────

function setupWatchdog() {
  if (typeof window === 'undefined') return
  window.addEventListener('error', (e) => {
     
    console.error('[KioskRuntime] crash JS — reload prévu', e)
    setTimeout(() => location.reload(), 3000)
  })
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[KioskRuntime] unhandled rejection', e)
  })
}

// ─── Lock browser : disable contextmenu, F12, etc. ─
// Exporté pour activation explicite via config (CDC §08 §10 sécurité borne).
// Désactivé par défaut pour préserver l'expérience dev.

export function lockBrowser(): void {
  if (typeof window === 'undefined') return
  const prevent = (e: Event) => e.preventDefault()
  document.addEventListener('contextmenu', prevent)
  document.addEventListener('keydown', (e) => {
    // Bloque F12, Ctrl+Shift+I, Ctrl+U, F5, F11 (gardé), Ctrl+P
    const k = e.key
    if (k === 'F12'
        || (e.ctrlKey && e.shiftKey && (k === 'I' || k === 'J' || k === 'C'))
        || (e.ctrlKey && (k === 'u' || k === 'p' || k === 's'))) {
      e.preventDefault()
    }
  })
  // Cursor: none en mode strict
  document.body.style.cursor = 'none'
}

// ─── Page principale ────────────────────────

type Screen = 'home' | 'search' | 'destination' | 'route' | 'attract'

export default function KioskRuntime() {
  const { kioskId } = useParams<{ kioskId: string }>()
  const { config } = useDesignerStore()
  const adapter = useKioskAdapter(kioskId ?? 'unknown')

  const [screen, setScreen] = useState<Screen>('home')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pmrMode, setPmrMode] = useState(false)
  const [activeLocale, setActiveLocale] = useState<LocaleCode>(config.project.activeLocale)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDest, setSelectedDest] = useState<{ id: string; label: string; x: number; y: number } | null>(null)
  const [transferQrUrl, setTransferQrUrl] = useState<string | null>(null)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionIdRef = useRef<string>(sessionHash() ?? makeSessionHash())

  // Setup unique
  useEffect(() => {
    setupWatchdog()
    if (typeof window !== 'undefined') {
      // Mode kiosque léger (sans cursor:none par défaut, désactivable)
      // lockBrowser() // commenté par défaut, à activer via config
      injectCssVariables(config.brand, { themeMode: config.previewMode })
      void loadBrandFonts(config.brand).catch(() => {})
      applyDocumentDirection(activeLocale)
    }

    // Online/offline listeners
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Heartbeat 60s
    heartbeatRef.current = setInterval(() => {
      logTelemetry({
        kioskId: kioskId ?? 'unknown',
        kind: 'heartbeat',
        sessionHash: sessionIdRef.current,
        locale: activeLocale,
      }, adapter.projetId)
    }, 60_000)

    // PWA register
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [config.brand, kioskId, adapter.projetId, activeLocale])

  // Inactivity → attract
  const resetInactivity = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (!config.attract.enabled) return
    inactivityTimerRef.current = setTimeout(() => {
      setScreen('attract')
      setSearchQuery('')
      setSelectedDest(null)
      // CDC §08 — Reset PMR par défaut. La persistance optionnelle est
      // configurable via KioskRuntimeConfig (out of DesignerConfig scope).
      setPmrMode(false)
      logTelemetry({
        kioskId: kioskId ?? 'unknown',
        kind: 'attract-start',
        sessionHash: sessionIdRef.current,
      }, adapter.projetId)
    }, (config.attract.inactivitySec ?? 30) * 1000)
  }, [config.attract, kioskId, adapter.projetId])

  useEffect(() => {
    resetInactivity()
    const events = ['touchstart', 'mousedown', 'keydown']
    events.forEach(ev => window.addEventListener(ev, resetInactivity))
    return () => events.forEach(ev => window.removeEventListener(ev, resetInactivity))
  }, [resetInactivity])

  // Recherche en temps réel
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    return adapter.search(searchQuery)
  }, [searchQuery, adapter])

  // Calcul itinéraire à la sélection
  const currentRoute = useMemo(() => {
    if (!selectedDest) return null
    return adapter.computeRoute(selectedDest)
  }, [selectedDest, adapter])

  // Strings i18n
  const T = (key: string): string => {
    return config.i18nStrings[activeLocale]?.[key]
      ?? config.i18nStrings[config.project.locales[0]]?.[key]
      ?? key
  }

  const handleLocaleChange = (loc: LocaleCode) => {
    setActiveLocale(loc)
    applyDocumentDirection(loc)
    logTelemetry({
      kioskId: kioskId ?? 'unknown',
      kind: 'locale-change',
      payload: { locale: loc },
      sessionHash: sessionIdRef.current,
    }, adapter.projetId)
  }

  const handleSelectDest = (poi: { id: string; label: string; x: number; y: number }) => {
    setSelectedDest(poi)
    setScreen('route')
    logTelemetry({
      kioskId: kioskId ?? 'unknown',
      kind: 'destination-selected',
      payload: { poiId: poi.id, label: poi.label },
      sessionHash: sessionIdRef.current,
    }, adapter.projetId)
  }

  const handleQrTransfer = () => {
    if (!selectedDest || !adapter.kioskPosition) return
    const base = config.project.locales.length > 0
      ? `${window.location.origin}/wayfinder?to=${encodeURIComponent(selectedDest.id)}&from=${encodeURIComponent(`${adapter.kioskPosition.x},${adapter.kioskPosition.y}`)}&lang=${activeLocale}`
      : ''
    setTransferQrUrl(base)
    logTelemetry({
      kioskId: kioskId ?? 'unknown',
      kind: 'qr-scanned',
      sessionHash: sessionIdRef.current,
    }, adapter.projetId)
  }

  const reset = () => {
    setSearchQuery('')
    setSelectedDest(null)
    setTransferQrUrl(null)
    setScreen('home')
    sessionIdRef.current = makeSessionHash()
    logTelemetry({
      kioskId: kioskId ?? 'unknown',
      kind: 'session-reset',
      sessionHash: sessionIdRef.current,
    }, adapter.projetId)
  }

  // ───────────────── UI ─────────────────────

  const palette = config.brand.palette
  const isDark = config.previewMode === 'dark'
  const bg = isDark ? palette.backgroundDark : palette.background
  const fg = isDark ? palette.foregroundDark : palette.foreground

  // PMR styles
  const pmrFontSizePx = pmrMode ? 22 : 16

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col select-none"
      style={{
        background: bg,
        color: fg,
        fontFamily: 'var(--wdr-font-body)',
        fontSize: `${pmrFontSizePx}px`,
        filter: pmrMode ? 'contrast(1.2)' : 'none',
      }}
    >
      {/* Header borne */}
      <header className="flex items-center justify-between px-6 py-4"
        style={{ background: palette.primary, color: '#fff' }}>
        <div className="flex items-center gap-3">
          {config.project.logoUrl && (
            <img src={config.project.logoUrl} alt="Logo" className="h-10" />
          )}
          <h1 className="text-xl font-bold">{config.project.siteName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Online indicator */}
          {isOnline ? <Wifi size={18} /> : <WifiOff size={18} className="text-amber-300" />}

          {/* Locale switch */}
          {config.project.locales.length > 1 && (
            <div className="flex items-center gap-1 ml-3">
              <Languages size={16} />
              {config.project.locales.map(loc => (
                <button
                  key={loc}
                  onClick={() => handleLocaleChange(loc)}
                  className={`px-2 py-1 rounded text-sm font-bold ${activeLocale === loc ? 'bg-white text-slate-900' : 'opacity-70'}`}
                >
                  {loc.split('-')[0].toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* PMR toggle */}
          <button
            onClick={() => {
              setPmrMode(!pmrMode)
              logTelemetry({
                kioskId: kioskId ?? 'unknown',
                kind: 'pmr-toggle',
                payload: { enabled: !pmrMode },
                sessionHash: sessionIdRef.current,
              }, adapter.projetId)
            }}
            className={`p-2 rounded ml-2 ${pmrMode ? 'bg-white text-slate-900' : 'opacity-80 hover:opacity-100'}`}
            aria-label="Mode accessibilité PMR"
          >
            <Accessibility size={20} />
          </button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 flex overflow-hidden">

        {/* Attract */}
        {screen === 'attract' && (
          <button
            onClick={() => { setScreen('home'); resetInactivity() }}
            className="flex-1 flex items-center justify-center text-center"
            style={{ background: bg, color: palette.primary }}
          >
            <div className="text-center">
              <div className="text-7xl mb-6 animate-pulse">👆</div>
              <h2 className="text-4xl font-bold mb-3">{config.attract.message}</h2>
              <p className="text-xl opacity-70">{T('welcome')}</p>
            </div>
          </button>
        )}

        {/* Home : recherche centrale */}
        {screen === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            <h2 className="text-3xl font-bold">{T('welcome')}</h2>
            <button
              onClick={() => setScreen('search')}
              className="w-full max-w-2xl flex items-center gap-4 px-6 py-5 rounded-full border-2"
              style={{
                borderColor: palette.primary,
                background: 'rgba(0,0,0,0.05)',
              }}
            >
              <Search size={28} />
              <span className="flex-1 text-left text-xl opacity-60">
                {T('searchPlaceholder')}
              </span>
            </button>

            {/* Catégories rapides */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mt-4">
              {config.search.suggestCategories.slice(0, 4).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSearchQuery(cat); setScreen('search') }}
                  className="px-6 py-5 rounded-2xl text-xl font-semibold"
                  style={{
                    background: palette.primary + '20',
                    color: palette.primary,
                    border: `2px solid ${palette.primary}40`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        {screen === 'search' && (
          <div className="flex-1 flex flex-col">
            <div className="p-4 flex items-center gap-3 border-b" style={{ borderColor: palette.neutral + '40' }}>
              <button onClick={() => setScreen('home')} aria-label="Retour">
                <ArrowLeft size={24} />
              </button>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={T('searchPlaceholder')}
                className="flex-1 px-4 py-3 rounded-full border-2 text-lg outline-none"
                style={{
                  borderColor: palette.primary,
                  color: fg,
                  background: 'rgba(0,0,0,0.03)',
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {searchResults.length === 0 ? (
                <p className="text-center opacity-60 py-12 text-lg">Aucun résultat.</p>
              ) : (
                <ul className="space-y-2 max-w-2xl mx-auto">
                  {searchResults.map(r => (
                    <li key={r.id}>
                      <button
                        onClick={() => handleSelectDest(r)}
                        className="w-full text-left px-5 py-4 rounded-xl border-2 transition-all"
                        style={{
                          borderColor: palette.primary + '30',
                          background: 'rgba(0,0,0,0.02)',
                        }}
                      >
                        <div className="text-lg font-semibold">{r.label}</div>
                        <div className="text-sm opacity-60">{r.type}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Clavier tactile virtuel */}
            {config.search.showKeyboard && (
              <TouchKeyboard
                layout={config.search.keyboardLayout}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            )}
          </div>
        )}

        {/* Route : plan + instructions */}
        {screen === 'route' && currentRoute && selectedDest && adapter.planData && (
          <>
            {/* Plan central */}
            <div className="flex-1 relative">
              <RouteMapView
                planData={adapter.planData}
                routeWaypoints={currentRoute.waypoints}
                youAreHere={adapter.kioskPosition}
                config={config}
              />
            </div>

            {/* Instructions */}
            <aside className="w-96 border-l overflow-y-auto p-5"
              style={{ borderColor: palette.neutral + '30', background: bg }}>
              <button onClick={reset} className="flex items-center gap-2 mb-4 opacity-70 hover:opacity-100">
                <ArrowLeft size={18} /> {T('back')}
              </button>
              <h3 className="text-xl font-bold mb-2">{selectedDest.label}</h3>
              <p className="text-sm opacity-60 mb-4">
                {currentRoute.lengthM.toFixed(0)} m · {Math.round(currentRoute.durationS / 60)} min
              </p>

              {/* Steps simples */}
              <ol className="space-y-3 mb-6">
                {currentRoute.instructions.slice(0, 5).map((inst, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                      style={{ background: palette.primary, color: '#fff' }}>
                      {i + 1}
                    </span>
                    <span className="text-base pt-1">{inst.text}</span>
                  </li>
                ))}
              </ol>

              {/* Action QR mobile */}
              <button
                onClick={handleQrTransfer}
                className="w-full px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                style={{ background: palette.accent, color: '#fff' }}
              >
                <QrCode size={20} /> {T('scanToPhone')}
              </button>

              {transferQrUrl && (
                <div className="mt-4 p-4 bg-white rounded-xl text-center">
                  <QRCodeSVG value={transferQrUrl} size={200} level="M" />
                  <p className="text-xs text-slate-700 mt-2">{T('scanToPhone')}</p>
                </div>
              )}

              <button
                onClick={reset}
                className="w-full mt-3 px-4 py-3 rounded-xl border-2 font-semibold"
                style={{ borderColor: palette.neutral }}
              >
                <RotateCcw size={18} className="inline mr-2" /> {T('reset')}
              </button>
            </aside>
          </>
        )}
      </main>
    </div>
  )
}

// ─── Map view simplifié pour route ──────────

function RouteMapView({
  planData, routeWaypoints, youAreHere, config,
}: {
  planData: InjectedPlanData
  routeWaypoints: Array<{ x: number; y: number }>
  youAreHere?: { x: number; y: number; floorId?: string } | null
  config: any
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full h-full">
      {size.w > 0 && (
        <MapRenderer
          config={config}
          planData={planData}
          width={size.w}
          height={size.h}
          routeWaypoints={routeWaypoints}
          youAreHere={youAreHere ?? undefined}
          readOnly
        />
      )}
    </div>
  )
}
