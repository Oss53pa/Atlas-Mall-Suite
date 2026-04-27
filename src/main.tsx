import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize Sentry monitoring before rendering (production only)
initMonitoring();

// ─── Auto-reload sur stale chunk apres deploy Vercel ───
// Vite emet 'vite:preloadError' quand un import dynamique pointe sur un chunk
// dont le hash a change (deploy entre l'ouverture de l'onglet et la navigation).
// On force un reload unique (flag anti-boucle) pour recharger l'index.html avec
// les bons hashs. Catche aussi les SW qui servent un vieux HTML.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const FLAG = 'atlas-preload-reload-attempted'
  if (sessionStorage.getItem(FLAG)) {
    sessionStorage.removeItem(FLAG)
    return
  }
  sessionStorage.setItem(FLAG, '1')
  // Vide les caches du SW au passage (vieux index.html possible)
  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .finally(() => window.location.reload())
  } else {
    window.location.reload()
  }
})

// ─── IMMÉDIAT : ferme toutes les modales + panneaux lourds au démarrage ───
// Ceinture + bretelles : force les flags à false dans localStorage AVANT le render React
try {
  const k = 'atlas-plan-engine'
  const raw = localStorage.getItem(k)
  if (raw) {
    const parsed = JSON.parse(raw)
    if (parsed?.state) {
      parsed.state.proph3tModalOpen = false
      parsed.state.floorAttributionOpen = false
      localStorage.setItem(k, JSON.stringify(parsed))
    }
  }
} catch { /* ignore */ }

// ─── KILL SWITCH : désactive PROPH3T si le query param ?kill est présent ───
// Usage d'urgence : http://localhost:5173/projects/cosmos-angre?kill=true
try {
  const url = new URL(window.location.href)
  if (url.searchParams.get('kill') === 'true') {
    localStorage.setItem('atlas-proph3t-disabled', '1')
    console.warn('[Atlas] PROPH3T DÉSACTIVÉ (kill switch)')
  }
  if (url.searchParams.get('enable') === 'true') {
    localStorage.removeItem('atlas-proph3t-disabled')
    console.log('[Atlas] PROPH3T réactivé')
  }
} catch { /* */ }

// ─── Escape key global — ferme toutes les modales PROPH3T ───
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    import('./modules/building/shared/stores/planEngineStore')
      .then(m => m.usePlanEngineStore.getState().closeAllModals())
      .catch(() => { /* */ })
  }
})

// ─── Ferme les modales automatiquement à chaque navigation (pushState, popstate) ───
const closeModalsOnNav = () => {
  import('./modules/building/shared/stores/planEngineStore')
    .then(m => m.usePlanEngineStore.getState().closeAllModals())
    .catch(() => { /* */ })
}
window.addEventListener('popstate', closeModalsOnNav)
// Monkey-patch pushState pour capter aussi les navigations programmatiques (React Router)
const originalPushState = window.history.pushState.bind(window.history)
window.history.pushState = function (...args: Parameters<typeof originalPushState>) {
  closeModalsOnNav()
  return originalPushState(...args)
}

// Commandes d'urgence globales
;(window as any).closeAllModals = () => {
  import('./modules/building/shared/stores/planEngineStore')
    .then(m => {
      m.usePlanEngineStore.getState().closeAllModals()
      console.log('[Atlas] Toutes les modales fermées.')
    })
}

// Purge le cache parsedPlan corrompu (bounds 2.4×2.4m au lieu de 239×239m)
;(window as any).clearPlanCache = async () => {
  const m1 = await import('./modules/building/shared/stores/parsedPlanCache')
  await m1.clearPlanCache()
  const m2 = await import('./modules/building/shared/stores/planImageCache')
  await m2.clearAllPlanImages()
  const m3 = await import('./modules/building/shared/stores/planFileCache')
  await m3.clearAllPlanFiles()
  const m4 = await import('./modules/building/shared/stores/planEngineStore')
  m4.usePlanEngineStore.getState().setParsedPlan(null)
  // Et vide localStorage si des bounds y sont persistées
  try { localStorage.removeItem('atlas-plan-engine') } catch {}
  console.log('[Atlas] Cache plan vidé. Rechargez puis réimportez un DXF.')
}
;(window as any).disableProph3t = () => {
  localStorage.setItem('atlas-proph3t-disabled', '1')
  console.log('[Atlas] PROPH3T désactivé. Rechargez la page.')
}
;(window as any).enableProph3t = () => {
  localStorage.removeItem('atlas-proph3t-disabled')
  console.log('[Atlas] PROPH3T réactivé. Rechargez la page.')
}
;(window as any).disableDxfViewer = () => {
  localStorage.removeItem('atlas-dxf-viewer-enabled')
  console.log('[Atlas] DXF viewer désactivé → fallback SVG léger. Rechargez.')
}
;(window as any).enableDxfViewer = () => {
  localStorage.setItem('atlas-dxf-viewer-enabled', '1')
  console.log('[Atlas] DXF viewer WebGL réactivé. Rechargez.')
}

// URL ?heavy=true → active le DXF WebGL (mode lourd)
// Par défaut le mode LITE (SVG) est actif pour éviter les freezes
try {
  const url = new URL(window.location.href)
  if (url.searchParams.get('heavy') === 'true') {
    localStorage.setItem('atlas-dxf-viewer-enabled', '1')
    console.warn('[Atlas] Mode HEAVY (DXF WebGL) activé')
  }
  if (url.searchParams.get('lite') === 'true') {
    localStorage.removeItem('atlas-dxf-viewer-enabled')
    console.log('[Atlas] Mode LITE activé (SVG léger)')
  }
} catch { /* */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Sauvegarde locale automatique (IndexedDB) — tous volumes
import('./lib/localBackup/bootstrap')
  .then(m => m.initLocalBackup())
  .catch(err => console.warn('[Atlas] initLocalBackup failed:', err))

// M24 — Enregistre le service worker après first paint (offline-first)
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('./modules/building/shared/offline/serviceWorkerClient')
      .then(mod => {
        mod.registerServiceWorker()
        ;(window as any).nuclearReset = mod.nuclearReset
        console.log('[Atlas] Build', __BUILD_ID__ ?? 'dev')
        console.log('[Atlas] Commandes d\'urgence :')
        console.log('  • window.closeAllModals()   — ferme les modales coincées')
        console.log('  • window.clearPlanCache()   — vide le cache DXF/plan en IndexedDB')
        console.log('  • window.disableProph3t()   — désactive totalement PROPH3T')
        console.log('  • window.enableProph3t()    — réactive PROPH3T')
        console.log('  • window.disableDxfViewer() — fallback SVG léger (si DXF freeze)')
        console.log('  • window.enableDxfViewer()  — réactive DXF WebGL')
        console.log('  • window.nuclearReset()     — reset complet SW + caches')
        console.log('  • URL ?kill=true            — kill switch PROPH3T')
        console.log('  • URL ?lite=true            — mode léger sans DXF WebGL')
      })
      .catch(() => { /* silent */ })
  })
}
