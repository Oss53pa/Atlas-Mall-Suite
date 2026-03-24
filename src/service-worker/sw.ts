/// <reference lib="webworker" />

const SW_VERSION = '2.0.0'
const CACHE_STATIC = `atlas-mall-suite-static-v${SW_VERSION}`
const CACHE_PLANS = `atlas-mall-suite-plans-v${SW_VERSION}`
const CACHE_ASSETS = `atlas-mall-suite-assets-v${SW_VERSION}`
const ALL_CACHES = [CACHE_STATIC, CACHE_PLANS, CACHE_ASSETS]

const STATIC_ASSETS = [
  '/',
  '/index.html',
]

const sw = self as unknown as ServiceWorkerGlobalScope

// ═══ INSTALL ═══

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  sw.skipWaiting()
})

// ═══ ACTIVATE ═══

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  sw.clients.claim()
})

// ═══ FETCH ═══

sw.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase Edge Functions and API calls (always network)
  if (url.pathname.includes('/functions/') || url.hostname.includes('supabase.co')) return

  // Skip Claude API calls
  if (url.hostname.includes('anthropic.com')) return

  // Plan files (DXF, SVG, DWG) - cache first, then network
  if (/\.(dxf|svg|dwg|ifc)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_PLANS).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => {
          return new Response('Plan unavailable offline', { status: 503 })
        })
      })
    )
    return
  }

  // Static assets (JS, CSS, images, fonts) - stale-while-revalidate
  if (/\.(js|css|woff2?|ttf|png|jpg|jpeg|webp|ico)$/i.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_ASSETS).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => {
          return cached ?? new Response('Asset unavailable', { status: 503 })
        })

        return cached ?? fetchPromise
      })
    )
    return
  }

  // HTML pages - network first, cache fallback
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') {
        const clone = response.clone()
        caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone))
      }
      return response
    }).catch(() => {
      return caches.match(request).then((cached) => {
        if (cached) return cached
        // Fallback to index for SPA routing
        if (request.destination === 'document') {
          return caches.match('/index.html') as Promise<Response>
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

// ═══ MESSAGE HANDLER ═══

sw.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting()
  }

  if (event.data?.type === 'CACHE_PLAN') {
    const { url } = event.data
    if (url) {
      caches.open(CACHE_PLANS).then((cache) => cache.add(url).catch(() => {
        // Silently fail if plan URL is not accessible
      }))
    }
  }

  if (event.data?.type === 'CLEAR_PLANS_CACHE') {
    caches.delete(CACHE_PLANS)
  }
})
