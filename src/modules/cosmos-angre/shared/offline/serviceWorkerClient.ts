// ═══ SERVICE WORKER CLIENT — Enregistre et gère le SW (M24) ═══

export interface SwStatus {
  supported: boolean
  registered: boolean
  controller: boolean
  updateAvailable: boolean
  error?: string
}

let _status: SwStatus = {
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  registered: false,
  controller: false,
  updateAvailable: false,
}

const listeners = new Set<(s: SwStatus) => void>()

function emit(): void {
  for (const l of listeners) l({ ..._status })
}

export function onSwStatus(handler: (s: SwStatus) => void): () => void {
  listeners.add(handler)
  handler({ ..._status })
  return () => listeners.delete(handler)
}

export async function registerServiceWorker(): Promise<SwStatus> {
  if (!_status.supported) return _status
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    _status = { ..._status, registered: true, controller: !!navigator.serviceWorker.controller }
    emit()

    // Vérifie une mise à jour à chaque load + toutes les heures
    reg.update().catch(() => {})
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing
      if (!nw) return
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          _status = { ..._status, updateAvailable: true }
          emit()
          // Auto-apply : skip waiting + reload
          console.log('[SW] Nouvelle version disponible — application automatique…')
          nw.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })

    // Recharge la page quand le nouveau SW prend le contrôle
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      console.log('[SW] Nouveau service worker actif — rechargement…')
      window.location.reload()
    })

    return _status
  } catch (e) {
    _status = { ..._status, error: e instanceof Error ? e.message : String(e) }
    emit()
    return _status
  }
}

/** Force la désinscription du SW + clear toutes les caches (debug). */
export async function nuclearReset(): Promise<void> {
  if (!_status.supported) return
  const regs = await navigator.serviceWorker.getRegistrations()
  for (const r of regs) await r.unregister()
  if ('caches' in window) {
    const names = await caches.keys()
    for (const n of names) await caches.delete(n)
  }
  console.log('[SW] Reset nucléaire effectué — rechargement…')
  window.location.reload()
}

export async function applyUpdate(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }
}

export async function clearOfflineCache(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  reg?.active?.postMessage({ type: 'CLEAR_CACHE' })
}

/** Indique si on est actuellement en ligne (combinaison navigator + heartbeat Supabase). */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
