/// <reference lib="webworker" />

const SW_VERSION = '1.0.0'
const CACHE_NAME = `atlas-mall-suite-v${SW_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/index.html',
]

const sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  sw.skipWaiting()
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  sw.clients.claim()
})

sw.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and API requests
  if (request.method !== 'GET') return
  if (request.url.includes('/functions/') || request.url.includes('supabase.co')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const responseToCache = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache)
        })

        return response
      }).catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/index.html') as Promise<Response>
        }
        return new Response('Offline', { status: 503 })
      })
    })
  )
})
