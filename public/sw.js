// ═══ SERVICE WORKER — Network-first HTML + cache-first hashed assets (v2) ═══
// v2 : HTML toujours frais (réseau d'abord) → garantit que les nouveaux bundles
// hashés sont chargés. Assets hashés cachés agressivement (immutables par hash).

const CACHE_VERSION = 'atlas-mall-v2'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

// ─── Install : skip waiting pour activer immédiatement ────

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

// ─── Activate : purge ALL anciennes caches + claim clients ─

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

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin && !url.hostname.endsWith('.supabase.co')) return

  // API → network-first, fallback cache
  if (url.pathname.startsWith('/functions/') || url.pathname.startsWith('/rest/v1/')) {
    event.respondWith(
      fetch(request).then(res => {
        const copy = res.clone()
        caches.open(RUNTIME_CACHE).then(c => c.put(request, copy)).catch(() => {})
        return res
      }).catch(() => caches.match(request))
    )
    return
  }

  // Hashed static assets (Vite ajoute un hash → immutables) → cache-first OK
  // Pattern : nom-HASH.ext (8+ chars alphanumériques avant l'extension)
  const isHashedAsset = /-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp)$/i.test(url.pathname)
  if (isHashedAsset) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const copy = res.clone()
        caches.open(STATIC_CACHE).then(c => c.put(request, copy)).catch(() => {})
        return res
      }))
    )
    return
  }

  // Tout le reste (HTML, manifest, favicon, sw.js, assets non-hashés)
  // → NETWORK-FIRST avec fallback cache (garantit qu'on a TOUJOURS la dernière version)
  event.respondWith(
    fetch(request).then(res => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(RUNTIME_CACHE).then(c => c.put(request, copy)).catch(() => {})
      }
      return res
    }).catch(() => caches.match(request).then(cached => cached || new Response('Offline', { status: 503 })))
  )
})

// ─── Message handler ──────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => event.source && event.source.postMessage({ type: 'CACHE_CLEARED' }))
  }
})
