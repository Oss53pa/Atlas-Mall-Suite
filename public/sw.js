// ═══ SERVICE WORKER — Offline-first cache (M24) ═══
// Stratégie : cache-first pour assets statiques, network-first pour API,
// stale-while-revalidate pour HTML. Versionning via CACHE_NAME.

const CACHE_VERSION = 'atlas-mall-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
]

// ─── Install ──────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {/* ignore missing */}))
      .then(() => self.skipWaiting())
  )
})

// ─── Activate — purge old caches ──────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => !n.startsWith(CACHE_VERSION))
          .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  )
})

// ─── Fetch strategies ─────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin unless whitelisted
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !url.hostname.endsWith('.supabase.co')) return

  // API calls → network-first, fallback cache
  if (url.pathname.startsWith('/functions/') || url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then(c => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets → cache-first
  if (/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then(c => c.put(request, copy))
          return res
        })
      })
    )
    return
  }

  // HTML → stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetched = fetch(request).then(res => {
        const copy = res.clone()
        caches.open(RUNTIME_CACHE).then(c => c.put(request, copy))
        return res
      }).catch(() => cached)
      return cached || fetched
    })
  )
})

// ─── Message handler (app-initiated actions) ──────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
  }
})
