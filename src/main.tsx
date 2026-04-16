import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize Sentry monitoring before rendering (production only)
initMonitoring();

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
    import('./modules/cosmos-angre/shared/stores/planEngineStore')
      .then(m => m.usePlanEngineStore.getState().closeAllModals())
      .catch(() => { /* */ })
  }
})

// ─── Ferme les modales automatiquement à chaque navigation (pushState, popstate) ───
const closeModalsOnNav = () => {
  import('./modules/cosmos-angre/shared/stores/planEngineStore')
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
  import('./modules/cosmos-angre/shared/stores/planEngineStore')
    .then(m => {
      m.usePlanEngineStore.getState().closeAllModals()
      console.log('[Atlas] Toutes les modales fermées.')
    })
}

// Purge le cache parsedPlan corrompu (bounds 2.4×2.4m au lieu de 239×239m)
;(window as any).clearPlanCache = async () => {
  const m1 = await import('./modules/cosmos-angre/shared/stores/parsedPlanCache')
  await m1.clearPlanCache()
  const m2 = await import('./modules/cosmos-angre/shared/stores/planImageCache')
  await m2.clearAllPlanImages()
  const m3 = await import('./modules/cosmos-angre/shared/stores/planFileCache')
  await m3.clearAllPlanFiles()
  const m4 = await import('./modules/cosmos-angre/shared/stores/planEngineStore')
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// M24 — Enregistre le service worker après first paint (offline-first)
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    import('./modules/cosmos-angre/shared/offline/serviceWorkerClient')
      .then(mod => {
        mod.registerServiceWorker()
        ;(window as any).nuclearReset = mod.nuclearReset
        console.log('[Atlas] Build', __BUILD_ID__ ?? 'dev')
        console.log('[Atlas] Commandes d\'urgence :')
        console.log('  • window.closeAllModals()   — ferme les modales coincées')
        console.log('  • window.clearPlanCache()   — vide le cache DXF/plan en IndexedDB')
        console.log('  • window.disableProph3t()   — désactive totalement PROPH3T')
        console.log('  • window.enableProph3t()    — réactive PROPH3T')
        console.log('  • window.nuclearReset()     — reset complet SW + caches')
        console.log('  • URL ?kill=true            — kill switch PROPH3T')
      })
      .catch(() => { /* silent */ })
  })
}
